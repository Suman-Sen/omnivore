import {removeProfileCredentials} from './credential-vault';
import {Capacitor} from '@capacitor/core';
import {ProfileService} from '../application/profile-service';
import {WebCryptoProfile} from '../crypto/web-crypto-profile';
let runtime:Promise<ProfileService>|undefined;
/** One composition root: native never silently falls back to a browser database. */
export function openProfiles():Promise<ProfileService> {
  if(!runtime) runtime=(async()=>{
    const store=Capacitor.isNativePlatform()
      ? await (await import('../storage-sqlite/profiles')).SQLiteProfileStore.open()
      : await (await import('../storage-indexeddb/profiles')).IndexedDBProfileStore.open();
    return new ProfileService(store,new WebCryptoProfile(),Date.now,removeProfileCredentials);
  })().catch(error=>{runtime=undefined;throw error;});
  return runtime;
}
