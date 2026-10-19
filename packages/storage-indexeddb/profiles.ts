import type {StoredRecord,RecordMutation} from '../storage/record-store.ts';
import {openDB} from 'idb';
import type {DBSchema,IDBPDatabase} from 'idb';
import type {LocalProfile,ProfileAuth,StoredPreferences,EncryptedValue} from '../domain/local-profile.ts';
import type {ProfileStore} from '../storage/profile-store.ts';
interface ProfileDatabase extends DBSchema {
  calendar_gallery: {key:string;value:StoredPreferences};
  profile_backgrounds: {key:string;value:StoredPreferences};
  records: {key:[string,string];value:StoredRecord;indexes:{by_profile:string}};
  profiles: {key:string;value:LocalProfile};
  profile_auth: {key:string;value:ProfileAuth};
  profile_settings: {key:string;value:StoredPreferences};
}
/** Migration 0001: atomic creation of profile identity/auth/preferences stores. */
export class IndexedDBProfileStore implements ProfileStore {
  private db:IDBPDatabase<ProfileDatabase>;
  private constructor(db:IDBPDatabase<ProfileDatabase>){this.db=db;}
  static async open(name='omnivae-profiles'){
    const db=await openDB<ProfileDatabase>(name,5,{
      async upgrade(database,oldVersion,_newVersion,transaction){
        if(oldVersion<1){
          database.createObjectStore('profiles',{keyPath:'id'});
          database.createObjectStore('profile_auth',{keyPath:'profileId'});
          database.createObjectStore('profile_settings',{keyPath:'profileId'});
        }
        if(oldVersion<5)database.createObjectStore('calendar_gallery',{keyPath:'profileId'});
        if(oldVersion<4)database.createObjectStore('profile_backgrounds',{keyPath:'profileId'});
        if(oldVersion<3){database.createObjectStore('records',{keyPath:['profileId','id']}).createIndex('by_profile','profileId');}
        if(oldVersion<2){
          const profiles=transaction.objectStore('profiles');
          for(const profile of await profiles.getAll()) await profiles.put({...profile,status:profile.status??'active',profileType:profile.profileType??'standard'});
        }
      },
      blocking(){db.close();},
    });
    return new IndexedDBProfileStore(db);
  }
  async getCalendarGallery(profileId:string){return await this.db.get('calendar_gallery',profileId)??null;}
  async setCalendarGallery(profileId:string,value:EncryptedValue,expectedIV:string|null){
    const tx=this.db.transaction(['profiles','calendar_gallery'],'readwrite');
    try{
      if(!await tx.objectStore('profiles').get(profileId))throw new Error('Profile unavailable');
      const store=tx.objectStore('calendar_gallery'),prior=await store.get(profileId);
      if((prior?.value.iv??null)!==expectedIV)throw new Error('Gallery changed. Reopen Calendar and retry.');
      await store.put({profileId,value});await tx.done;
    }catch(error){try{tx.abort();}catch{}await tx.done.catch(()=>undefined);throw error;}
  }
  async deleteProfile(profileId:string){
    const tx=this.db.transaction(['profiles','profile_auth','profile_settings','profile_backgrounds','calendar_gallery','records'],'readwrite');
    try{
      const keys=await tx.objectStore('records').index('by_profile').getAllKeys(profileId);
      for(const key of keys)await tx.objectStore('records').delete(key);
      await tx.objectStore('calendar_gallery').delete(profileId);
      await tx.objectStore('profile_backgrounds').delete(profileId);
      await tx.objectStore('profile_settings').delete(profileId);
      await tx.objectStore('profile_auth').delete(profileId);
      await tx.objectStore('profiles').delete(profileId);
      await tx.done;
    }catch(error){try{tx.abort();}catch{}await tx.done.catch(()=>undefined);throw error;}
  }
  listProfiles(){return this.db.getAll('profiles');}
  async getProfile(id:string){return await this.db.get('profiles',id)??null;}
  async getAuth(id:string){return await this.db.get('profile_auth',id)??null;}
  async getPreferences(id:string){return await this.db.get('profile_settings',id)??null;}
  async create(profile:LocalProfile,auth:ProfileAuth,preferences:StoredPreferences){
    if(profile.id!==auth.profileId || profile.id!==preferences.profileId) throw new Error('Profile ownership mismatch');
    const transaction=this.db.transaction(['profiles','profile_auth','profile_settings'],'readwrite');
    await Promise.all([
      transaction.objectStore('profiles').add(profile),
      transaction.objectStore('profile_auth').add(auth),
      transaction.objectStore('profile_settings').add(preferences),
      transaction.done,
    ]);
  }
  async updateAuth(auth:ProfileAuth){
    const transaction=this.db.transaction(['profiles','profile_auth'],'readwrite');
    const profile=await transaction.objectStore('profiles').get(auth.profileId);
    if(!profile){await transaction.done;throw new Error('Profile not found');}
    await transaction.objectStore('profile_auth').put(auth);
    await transaction.done;
  }
  async setPreferences(value:StoredPreferences){
    const transaction=this.db.transaction(['profiles','profile_settings'],'readwrite');
    const profile=await transaction.objectStore('profiles').get(value.profileId);
    if(!profile){await transaction.done;throw new Error('Profile not found');}
    await transaction.objectStore('profile_settings').put(value);
    await transaction.done;
  }
  listRecords(profileId:string){return this.db.getAllFromIndex('records','by_profile',profileId);}
  async commitRecords(profileId:string,mutations:RecordMutation[],expected?:{id:string;revision:number}[]){
    const tx=this.db.transaction(['profiles','records'],'readwrite');
    try{
      if(!await tx.objectStore('profiles').get(profileId))throw new Error('Profile unavailable');
      const records=tx.objectStore('records');
      if(expected){
        const actual=await records.index('by_profile').getAll(profileId);
        if(actual.length!==expected.length||actual.some(row=>!expected.some(old=>old.id===row.id&&old.revision===row.revision)))throw new Error('Data changed. Reload before saving.');
      }
      for(const {record,expectedRevision} of mutations){
        if(record.profileId!==profileId||record.revision!==expectedRevision+1)throw new Error('Invalid ownership or revision');
        const prior=await records.get([profileId,record.id]);
        if((prior?.revision??0)!==expectedRevision)throw new Error('Data changed. Reload before saving.');
        await records.put(record);
      }
      await tx.done;
    }catch(error){try{tx.abort();}catch{/* A failed request may already have aborted the transaction. */}await tx.done.catch(()=>undefined);throw error;}
  }
  async getBackground(profileId:string){return await this.db.get('profile_backgrounds',profileId)??null;}
  async setBackground(profileId:string,value:EncryptedValue|null){
    const tx=this.db.transaction(['profiles','profile_backgrounds'],'readwrite');
    if(!await tx.objectStore('profiles').get(profileId)){await tx.done;throw new Error('Profile unavailable');}
    if(value)await tx.objectStore('profile_backgrounds').put({profileId,value});
    else await tx.objectStore('profile_backgrounds').delete(profileId);
    await tx.done;
  }
  async close(){this.db.close();}
}

