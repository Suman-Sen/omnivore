import {profileUpgrades} from './migrations.ts';
import type {StoredRecord,RecordMutation} from '../storage/record-store.ts';
import {CapacitorSQLite,SQLiteConnection} from '@capacitor-community/sqlite';
import type {SQLiteDBConnection} from '@capacitor-community/sqlite';
import type {LocalProfile,ProfileAuth,StoredPreferences,EncryptedValue} from '../domain/local-profile.ts';
import type {ProfileStore} from '../storage/profile-store.ts';
const connections=new SQLiteConnection(CapacitorSQLite);
/** Native profile adapter; migrations run transactionally through the plugin. */
export class SQLiteProfileStore implements ProfileStore {
  private db:SQLiteDBConnection;
  private name:string;
  private constructor(db:SQLiteDBConnection,name:string){this.db=db;this.name=name;}
  static async open(name='omnivae_profiles'){
    await connections.addUpgradeStatement(name,profileUpgrades);
    const consistent=await connections.checkConnectionsConsistency();
    const existing=await connections.isConnection(name,false);
    const db=consistent.result && existing.result
      ? await connections.retrieveConnection(name,false)
      : await connections.createConnection(name,false,'no-encryption',5,false);
    await db.open();

    return new SQLiteProfileStore(db,name);
  }
  private mapProfile(row:Record<string,unknown>):LocalProfile {
    return {id:String(row.id),displayName:String(row.display_name),timezone:String(row.timezone),status:row.status as LocalProfile['status'],profileType:row.profile_type as LocalProfile['profileType'],createdAt:String(row.created_at),updatedAt:String(row.updated_at)};
  }
  private async listProfilesInternal(){const result=await this.db.query('SELECT * FROM profiles ORDER BY created_at, id');return (result.values??[]).map(row=>this.mapProfile(row));}
  private async getProfileInternal(id:string){const result=await this.db.query('SELECT * FROM profiles WHERE id = ?',[id]);return result.values?.[0]?this.mapProfile(result.values[0]):null;}
  private async getAuthInternal(id:string):Promise<ProfileAuth|null>{
    const result=await this.db.query('SELECT * FROM profile_auth WHERE profile_id = ?',[id]);
    const row=result.values?.[0];
    return row?{profileId:String(row.profile_id),mode:'password',salt:String(row.salt),iterations:Number(row.iterations),wrappedKey:JSON.parse(String(row.wrapped_key)),failedAttempts:Number(row.failed_attempts),lockedUntil:Number(row.locked_until)}:null;
  }
  private async getPreferencesInternal(id:string):Promise<StoredPreferences|null>{
    const result=await this.db.query('SELECT * FROM profile_settings WHERE profile_id = ?',[id]);
    const row=result.values?.[0];
    return row?{profileId:String(row.profile_id),value:JSON.parse(String(row.encrypted_value))}:null;
  }
  private async createInternal(profile:LocalProfile,auth:ProfileAuth,preferences:StoredPreferences){
    if(profile.id!==auth.profileId || profile.id!==preferences.profileId) throw new Error('Profile ownership mismatch');
    await this.db.executeSet([
      {statement:'INSERT INTO profiles (id,display_name,timezone,created_at,updated_at,status,profile_type) VALUES (?,?,?,?,?,?,?)',values:[profile.id,profile.displayName,profile.timezone,profile.createdAt,profile.updatedAt,profile.status,profile.profileType]},
      {statement:'INSERT INTO profile_auth (profile_id,mode,salt,iterations,wrapped_key,failed_attempts,locked_until) VALUES (?,?,?,?,?,?,?)',values:[auth.profileId,auth.mode,auth.salt,auth.iterations,JSON.stringify(auth.wrappedKey),auth.failedAttempts,auth.lockedUntil]},
      {statement:'INSERT INTO profile_settings (profile_id,encrypted_value) VALUES (?,?)',values:[preferences.profileId,JSON.stringify(preferences.value)]},
    ],true);
  }
  private async updateAuthInternal(auth:ProfileAuth){
    const result=await this.db.run('UPDATE profile_auth SET failed_attempts=?,locked_until=? WHERE profile_id=?',[auth.failedAttempts,auth.lockedUntil,auth.profileId]);
    if(result.changes?.changes!==1) throw new Error('Profile authentication record not found');
  }
  private async setPreferencesInternal(value:StoredPreferences){
    const result=await this.db.run('UPDATE profile_settings SET encrypted_value=? WHERE profile_id=?',[JSON.stringify(value.value),value.profileId]);
    if(result.changes?.changes!==1) throw new Error('Profile settings not found');
  }
  private writes:Promise<unknown>=Promise.resolve();
  private serial<T>(action:()=>Promise<T>):Promise<T>{const result=this.writes.then(action);this.writes=result.catch(()=>undefined);return result;}
  getCalendarGallery(profileId:string):Promise<StoredPreferences|null>{return this.serial(async()=>{const result=await this.db.query('SELECT encrypted_value FROM calendar_gallery WHERE profile_id=?',[profileId]);return result.values?.[0]?{profileId,value:JSON.parse(String(result.values[0].encrypted_value))}:null;});}
  setCalendarGallery(profileId:string,value:EncryptedValue,expectedIV:string|null){return this.serial(async()=>{
    await this.db.beginTransaction();try{
      if(!await this.getProfileInternal(profileId))throw new Error('Profile unavailable');
      const prior=(await this.db.query('SELECT encrypted_value FROM calendar_gallery WHERE profile_id=?',[profileId])).values?.[0];
      if((prior?JSON.parse(String(prior.encrypted_value)).iv:null)!==expectedIV)throw new Error('Gallery changed. Reopen Calendar and retry.');
      await this.db.run('INSERT INTO calendar_gallery (profile_id,encrypted_value) VALUES (?,?) ON CONFLICT(profile_id) DO UPDATE SET encrypted_value=excluded.encrypted_value',[profileId,JSON.stringify(value)],false);await this.db.commitTransaction();
    }catch(error){await this.db.rollbackTransaction();throw error;}
  });}
  deleteProfile(profileId:string){return this.serial(async()=>{
    await this.db.executeSet(['records','calendar_gallery','profile_backgrounds','profile_settings','profile_auth','profiles'].map(table=>({statement:`DELETE FROM ${table} WHERE ${table==='profiles'?'id':'profile_id'}=?`,values:[profileId]})),true);
  });}
  listProfiles(){return this.serial(()=>this.listProfilesInternal());}
  getProfile(id:string){return this.serial(()=>this.getProfileInternal(id));}
  getAuth(id:string){return this.serial(()=>this.getAuthInternal(id));}
  getPreferences(id:string){return this.serial(()=>this.getPreferencesInternal(id));}
  create(profile:LocalProfile,auth:ProfileAuth,preferences:StoredPreferences){return this.serial(()=>this.createInternal(profile,auth,preferences));}
  updateAuth(auth:ProfileAuth){return this.serial(()=>this.updateAuthInternal(auth));}
  setPreferences(value:StoredPreferences){return this.serial(()=>this.setPreferencesInternal(value));}
  listRecords(profileId:string){return this.serial(()=>this.listRecordsInternal(profileId));}
  getBackground(profileId:string):Promise<StoredPreferences|null>{return this.serial(async()=>{
    const result=await this.db.query('SELECT encrypted_value FROM profile_backgrounds WHERE profile_id=?',[profileId]);
    return result.values?.[0]?{profileId,value:JSON.parse(String(result.values[0].encrypted_value))}:null;
  });}
  setBackground(profileId:string,value:EncryptedValue|null){return this.serial(async()=>{
    if(!await this.getProfileInternal(profileId))throw new Error('Profile unavailable');
    if(value)await this.db.run('INSERT INTO profile_backgrounds (profile_id,encrypted_value) VALUES (?,?) ON CONFLICT(profile_id) DO UPDATE SET encrypted_value=excluded.encrypted_value',[profileId,JSON.stringify(value)]);
    else await this.db.run('DELETE FROM profile_backgrounds WHERE profile_id=?',[profileId]);
  });}
  close(){return this.serial(()=>this.closeInternal());}

  private async listRecordsInternal(profileId:string):Promise<StoredRecord[]>{
    const result=await this.db.query('SELECT * FROM records WHERE profile_id = ?',[profileId]);
    return (result.values??[]).map(row=>({id:String(row.id),profileId:String(row.profile_id),kind:String(row.kind),revision:Number(row.revision),value:JSON.parse(String(row.encrypted_value))}));
  }
  commitRecords(profileId:string,mutations:RecordMutation[],expected?:{id:string;revision:number}[]):Promise<void>{
    const write=this.writes.then(async()=>{
      await this.db.beginTransaction();
      try{
        if(!await this.getProfileInternal(profileId))throw new Error('Profile unavailable');
        if(expected){
          const actual=(await this.db.query('SELECT id,revision FROM records WHERE profile_id=?',[profileId])).values??[];
          if(actual.length!==expected.length||actual.some(row=>!expected.some(old=>old.id===row.id&&old.revision===row.revision)))throw new Error('Data changed. Reload before saving.');
        }
        for(const {record,expectedRevision} of mutations){
          if(record.profileId!==profileId||record.revision!==expectedRevision+1)throw new Error('Invalid ownership or revision');
          const current=await this.db.query('SELECT revision FROM records WHERE profile_id=? AND id=?',[profileId,record.id]);
          if(Number(current.values?.[0]?.revision??0)!==expectedRevision)throw new Error('Data changed. Reload before saving.');
          await this.db.run('INSERT INTO records (profile_id,id,kind,revision,encrypted_value) VALUES (?,?,?,?,?) ON CONFLICT(profile_id,id) DO UPDATE SET kind=excluded.kind,revision=excluded.revision,encrypted_value=excluded.encrypted_value',[profileId,record.id,record.kind,record.revision,JSON.stringify(record.value)],false);
        }
        await this.db.commitTransaction();
      }catch(error){await this.db.rollbackTransaction();throw error;}
    });
    this.writes=write.catch(()=>undefined);return write;
  }
  private async closeInternal(){await connections.closeConnection(this.name,false);}
}
