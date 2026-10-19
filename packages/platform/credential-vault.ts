import {Capacitor,registerPlugin} from '@capacitor/core';
import {openDB} from 'idb';
import type {ProfileService} from '../application/profile-service';
import type {EncryptedValue} from '../domain/local-profile';
import type {HostedProviderName} from '../ai/hosted-provider';
interface VaultPlugin {put(input:{reference:string;value:string}):Promise<void>;get(input:{reference:string}):Promise<{value?:string}>;remove(input:{reference:string}):Promise<void>;}
const native=registerPlugin<VaultPlugin>('CredentialVault');
/** Separate encrypted credential vault, never the planning DB; native adds Keystore wrapping. */
export class CredentialVault {
 private profiles:ProfileService;
 constructor(profiles:ProfileService){this.profiles=profiles;}
 private async db(){return openDB('omnivae_credential_vault',1,{upgrade(db){db.createObjectStore('credentials');}});}
 private reference(token:string,provider:HostedProviderName){if(!['openai','gemini'].includes(provider))throw new Error('Invalid provider.');return this.profiles.getProfile(token).id+':'+provider;}
 async save(token:string,provider:HostedProviderName,secret:string){const reference=this.reference(token,provider),value=await this.profiles.sealCredential(token,provider,secret);if(Capacitor.isNativePlatform())await native.put({reference,value:JSON.stringify(value)});else{const db=await this.db();try{await db.put('credentials',value,reference);}finally{db.close();}}this.profiles.getProfile(token);}
 async read(token:string,provider:HostedProviderName){const reference=this.reference(token,provider);let value:EncryptedValue|undefined;if(Capacitor.isNativePlatform()){const result=await native.get({reference});value=result.value?JSON.parse(result.value):undefined;}else{const db=await this.db();try{value=await db.get('credentials',reference);}finally{db.close();}}this.profiles.getProfile(token);return value?this.profiles.openCredential(token,provider,value):null;}
 async remove(token:string,provider:HostedProviderName){const reference=this.reference(token,provider);if(Capacitor.isNativePlatform())await native.remove({reference});else{const db=await this.db();try{await db.delete('credentials',reference);}finally{db.close();}}this.profiles.getProfile(token);}
}

/** Called by the composition-root deletion hook before removing profile encryption keys. */
export async function removeProfileCredentials(profileId:string){
 if(!/^[0-9a-f-]{36}$/.test(profileId))throw new Error('Invalid profile.');
 const references=['openai','gemini'].map(provider=>profileId+':'+provider);
 if(Capacitor.isNativePlatform()){for(const reference of references)await native.remove({reference});}
 else{const db=await openDB('omnivae_credential_vault',1,{upgrade(db){db.createObjectStore('credentials');}});try{const tx=db.transaction('credentials','readwrite');for(const reference of references)await tx.store.delete(reference);await tx.done;}finally{db.close();}}
}
