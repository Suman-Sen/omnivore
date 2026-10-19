import type {EncryptedValue,ProfileAuth} from '../domain/local-profile.ts';
import type {KeyHandle,ProfileCrypto} from '../storage/profile-store.ts';
const encoder=new TextEncoder();
const decoder=new TextDecoder();
const ITERATIONS=600_000;
function encode(bytes:Uint8Array):string {let binary='';for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function decode(text:string):Uint8Array<ArrayBuffer> {return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
/** Standard Web Crypto primitives; no passwords or unwrapped keys are persisted. */
export class WebCryptoProfile implements ProfileCrypto {
  private async wrappingKey(password:string,salt:string,iterations:number):Promise<CryptoKey>{
    if(iterations<ITERATIONS || iterations>2_000_000) throw new Error('Unsupported key derivation parameters');
    const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(salt),iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async createKey(password:string,profileId:string){
    const salt=encode(crypto.getRandomValues(new Uint8Array(16)));
    const wrappingKey=await this.wrappingKey(password,salt,ITERATIONS);
    const raw=crypto.getRandomValues(new Uint8Array(32));
    try {
      const wrappedKey=await this.encrypt(wrappingKey,encode(raw),`${profileId}:key`);
      const key=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
      const auth:ProfileAuth={profileId,mode:'password',salt,iterations:ITERATIONS,wrappedKey,failedAttempts:0,lockedUntil:0};
      return {key,auth};
    } finally {raw.fill(0);}
  }
  async unlockKey(password:string,auth:ProfileAuth):Promise<KeyHandle>{
    const wrappingKey=await this.wrappingKey(password,auth.salt,auth.iterations);
    const raw=decode(await this.decrypt<string>(wrappingKey,auth.wrappedKey,`${auth.profileId}:key`));
    try {return await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);}
    finally {raw.fill(0);}
  }
  async encrypt(key:KeyHandle,value:unknown,context:string):Promise<EncryptedValue>{
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context)},key as CryptoKey,encoder.encode(JSON.stringify(value)));
    return {version:1,iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))};
  }
  async decrypt<T>(key:KeyHandle,value:EncryptedValue,context:string):Promise<T>{
    if(value.version!==1 || decode(value.iv).length!==12) throw new Error('Unsupported encrypted record');
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(value.iv),additionalData:encoder.encode(context)},key as CryptoKey,decode(value.ciphertext));
    return JSON.parse(decoder.decode(plaintext)) as T;
  }
}

