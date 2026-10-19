import type {RecordStore} from './record-store.ts';
import type {LocalProfile,ProfileAuth,StoredPreferences,EncryptedValue} from '../domain/local-profile.ts';
export interface ProfileStore extends RecordStore {
  getCalendarGallery(profileId:string):Promise<StoredPreferences|null>;
  setCalendarGallery(profileId:string,value:EncryptedValue,expectedIV:string|null):Promise<void>;
  deleteProfile(profileId:string): Promise<void>;
  listProfiles(): Promise<LocalProfile[]>;
  getProfile(id:string): Promise<LocalProfile|null>;
  getAuth(id:string): Promise<ProfileAuth|null>;
  create(profile:LocalProfile,auth:ProfileAuth,preferences:StoredPreferences): Promise<void>;
  updateAuth(auth:ProfileAuth): Promise<void>;
  getPreferences(profileId:string): Promise<StoredPreferences|null>;
  setPreferences(value:StoredPreferences): Promise<void>;
  /** One encrypted, bounded appearance asset per profile; no binary data in preferences. */
  getBackground(profileId:string): Promise<StoredPreferences|null>;
  setBackground(profileId:string,value:EncryptedValue|null): Promise<void>;
  close(): Promise<void>;
}
/** Infrastructure owns key objects; applications never serialize them. */
export type KeyHandle = object;
export interface ProfileCrypto {
  createKey(password:string,profileId:string): Promise<{key:KeyHandle;auth:ProfileAuth}>;
  unlockKey(password:string,auth:ProfileAuth): Promise<KeyHandle>;
  encrypt(key:KeyHandle,value:unknown,context:string): Promise<EncryptedValue>;
  decrypt<T>(key:KeyHandle,value:EncryptedValue,context:string): Promise<T>;
}
