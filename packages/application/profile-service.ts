import {validateGallery} from '../domain/calendar-gallery.ts';
import type {CalendarGallery} from '../domain/calendar-gallery.ts';
import {validateBackground} from '../domain/appearance.ts';
import type {PersonalRecord} from '../domain/life.ts';
import type {LocalProfile,ProfilePreferences} from '../domain/local-profile.ts';
import {defaultPreferences,normalizePreferences} from '../domain/local-profile.ts';
import type {ProfileStore,ProfileCrypto,KeyHandle} from '../storage/profile-store.ts';
export class ProfileError extends Error {
  readonly code:string;
  constructor(code:string,message:string){super(message);this.name='ProfileError';this.code=code;}
}
interface ActiveSession {token:string;profile:LocalProfile;key:KeyHandle;}
export class ProfileService {
  private store:ProfileStore;
  private cryptography:ProfileCrypto;
  private now:()=>number;
  private removeCredentials:(profileId:string)=>Promise<void>;
  private session:ActiveSession|null=null;
  private epoch=0;
  private authenticating=false;
  private listeners=new Set<()=>void>();
  subscribe(listener:()=>void){this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
  constructor(store:ProfileStore,cryptography:ProfileCrypto,now:()=>number=Date.now,removeCredentials:(profileId:string)=>Promise<void>=async()=>{}){this.store=store;this.cryptography=cryptography;this.now=now;this.removeCredentials=removeCredentials;}
  listProfiles(){return this.store.listProfiles().then(profiles=>profiles.filter(profile=>profile.status==='active'));}
  async create(displayName:string,password:string,timezone:string):Promise<LocalProfile>{
    const name=displayName.trim();
    if(!name || name.length>80) throw new ProfileError('invalid_name','Use a profile name between 1 and 80 characters.');
    if(password.length<12 || password.length>256) throw new ProfileError('invalid_password','Use a password of 12 to 256 characters.');
    try {new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}
    catch {throw new ProfileError('invalid_timezone','Select a valid timezone.');}
    const timestamp=new Date(this.now()).toISOString();
    const profile:LocalProfile={id:crypto.randomUUID(),displayName:name,timezone,status:'active',profileType:'standard',createdAt:timestamp,updatedAt:timestamp};
    const {key,auth}=await this.cryptography.createKey(password,profile.id);
    const value=await this.cryptography.encrypt(key,{...defaultPreferences,updatedAt:timestamp},`${profile.id}:preferences`);
    await this.store.create(profile,auth,{profileId:profile.id,value});
    return profile;
  }
  lock(){this.epoch++;this.session=null;}
  private require(token:string):ActiveSession {
    if(!this.session || this.session.token!==token) throw new ProfileError('locked','Unlock your profile to continue.');
    return this.session;
  }
  async unlock(profileId:string,password:string):Promise<string>{
    if(this.authenticating) throw new ProfileError('busy','An unlock attempt is already running.');
    this.authenticating=true;
    this.lock();
    const epoch=this.epoch;
    try {
      const profile=await this.store.getProfile(profileId);
      const auth=await this.store.getAuth(profileId);
      if(!profile || profile.status!=='active' || !auth || profile.id!==profileId || auth.profileId!==profileId) throw new ProfileError('invalid_credentials','Unable to unlock this profile.');
      if(auth.lockedUntil>this.now()) throw new ProfileError('throttled','Too many attempts. Please wait before trying again.');
      let key:KeyHandle;
      try {key=await this.cryptography.unlockKey(password,auth);}
      catch {
        const failedAttempts=auth.failedAttempts+1;
        await this.store.updateAuth({...auth,failedAttempts,lockedUntil:failedAttempts>=5?this.now()+Math.min(300_000,30_000*2**Math.min(failedAttempts-5,4)):0});
        throw new ProfileError('invalid_credentials','Unable to unlock this profile.');
      }
      if(epoch!==this.epoch) throw new ProfileError('locked','Unlock was cancelled.');
      await this.store.updateAuth({...auth,failedAttempts:0,lockedUntil:0});
      if(epoch!==this.epoch) throw new ProfileError('locked','Unlock was cancelled.');
      const token=crypto.randomUUID();
      this.session={token,profile,key};
      return token;
    } finally {this.authenticating=false;}
  }
  async getCalendarGallery(token:string):Promise<{gallery:CalendarGallery;iv:string|null}>{
    const {profile,key}=this.require(token);const row=await this.store.getCalendarGallery(profile.id);this.require(token);
    if(!row)return {gallery:{version:1,selectedId:null,activeId:null,images:[]},iv:null};
    if(row.profileId!==profile.id)throw new ProfileError('scope','Gallery unavailable.');
    const gallery=await this.cryptography.decrypt<CalendarGallery>(key,row.value,`${profile.id}:calendar-gallery`);this.require(token);validateGallery(gallery);return {gallery,iv:row.value.iv};
  }
  async setCalendarGallery(token:string,gallery:CalendarGallery,expectedIV:string|null){
    const {profile,key}=this.require(token);validateGallery(gallery);const value=await this.cryptography.encrypt(key,gallery,`${profile.id}:calendar-gallery`);this.require(token);await this.store.setCalendarGallery(profile.id,value,expectedIV);this.require(token);return value.iv;
  }
  /** Device-local erasure from the locked chooser; never decrypts or reveals profile records. */
  async forgetProfile(profileId:string,confirmation:string,confirmed:boolean){
    if(this.session||this.authenticating)throw new ProfileError('busy','Lock the current profile before forgetting a profile.');
    const epoch=this.epoch,profile=await this.store.getProfile(profileId);
    if(!profile||!confirmed||confirmation!==profile.displayName)throw new ProfileError('confirmation','Confirm the exact profile name and permanent deletion.');
    if(epoch!==this.epoch)throw new ProfileError('locked','Profile selection changed. Please retry.');
    await this.removeCredentials(profile.id);
    if(epoch!==this.epoch)throw new ProfileError('locked','Profile selection changed. Please retry.');
    await this.store.deleteProfile(profile.id);
    this.lock();
    for(const listener of this.listeners)listener();
  }
  async deleteProfile(token:string,confirmation:string){
    const {profile}=this.require(token);
    if(confirmation!==profile.displayName)throw new ProfileError('confirmation','Type the exact profile name to confirm deletion.');
    await this.removeCredentials(profile.id);
    this.require(token);
    await this.store.deleteProfile(profile.id);
    if(this.session?.token===token)this.lock();
    for(const listener of this.listeners)listener();
  }
  getProfile(token:string):LocalProfile {return {...this.require(token).profile};}
  async getPreferences(token:string):Promise<ProfilePreferences>{
    const {profile,key}=this.require(token);
    const record=await this.store.getPreferences(profile.id);
    this.require(token);
    if(!record || record.profileId!==profile.id) throw new ProfileError('missing_preferences','Profile settings could not be loaded.');
    const preferences=await this.cryptography.decrypt<ProfilePreferences>(key,record.value,`${profile.id}:preferences`);
    this.require(token);
    return normalizePreferences(preferences);
  }
  async readRecords(token:string):Promise<PersonalRecord[]>{
    const {profile,key}=this.require(token);
    const stored=await this.store.listRecords(profile.id);
    const result:PersonalRecord[]=[];
    for(const record of stored){
      this.require(token);
      if(record.profileId!==profile.id)throw new ProfileError('scope','Record unavailable.');
      const value=await this.cryptography.decrypt<PersonalRecord>(key,record.value,`${profile.id}:record:${record.id}:${record.revision}`);
      if(value.profileId!==profile.id||value.id!==record.id||value.revision!==record.revision||value.kind!==record.kind)throw new ProfileError('scope','Record unavailable.');
      result.push(value);
    }
    this.require(token);return result;
  }
  async commitRecords(token:string,records:PersonalRecord[],expected:PersonalRecord[]):Promise<void>{
    const {profile,key}=this.require(token);
    const mutations=[];
    for(const record of records){
      if(record.profileId!==profile.id)throw new ProfileError('scope','Record unavailable.');
      const value=await this.cryptography.encrypt(key,record,`${profile.id}:record:${record.id}:${record.revision}`);
      mutations.push({record:{id:record.id,profileId:profile.id,kind:record.kind,revision:record.revision,value},expectedRevision:record.revision-1});
    }
    this.require(token);await this.store.commitRecords(profile.id,mutations,expected);this.require(token);for(const listener of this.listeners)listener();
  }
  async sealCredential(token:string,provider:'openai'|'gemini',secret:string){
    const {profile,key}=this.require(token);
    if(!['openai','gemini'].includes(provider)||!secret.trim()||secret.length>4096)throw new Error('Invalid credential.');
    const value=await this.cryptography.encrypt(key,secret,`${profile.id}:credential:${provider}`);this.require(token);return value;
  }
  async openCredential(token:string,provider:'openai'|'gemini',value:import('../domain/local-profile.ts').EncryptedValue){
    const {profile,key}=this.require(token);const secret=await this.cryptography.decrypt<string>(key,value,`${profile.id}:credential:${provider}`);this.require(token);return secret;
  }
  async getBackground(token:string):Promise<string|null>{
    const {profile,key}=this.require(token);
    const row=await this.store.getBackground(profile.id);this.require(token);
    if(!row)return null;
    if(row.profileId!==profile.id)throw new ProfileError('scope','Image unavailable.');
    const image=await this.cryptography.decrypt<string>(key,row.value,`${profile.id}:background`);this.require(token);
    validateBackground(image);return image;
  }
  async setBackground(token:string,image:string|null){
    const {profile,key}=this.require(token);
    if(image!==null)validateBackground(image);
    const value=image===null?null:await this.cryptography.encrypt(key,image,`${profile.id}:background`);
    this.require(token);await this.store.setBackground(profile.id,value);this.require(token);
  }
  async setPreferences(token:string,preferences:ProfilePreferences){
    const {profile,key}=this.require(token);
    try {preferences=normalizePreferences(preferences);} catch {throw new ProfileError('invalid_preferences','Invalid profile settings.');}
    preferences={...preferences,updatedAt:new Date(this.now()).toISOString()};
    const value=await this.cryptography.encrypt(key,preferences,`${profile.id}:preferences`);
    this.require(token);
    await this.store.setPreferences({profileId:profile.id,value});
    this.require(token);
  }
}


