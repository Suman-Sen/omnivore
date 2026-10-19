import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDB,deleteDB} from 'idb';
import {HostedAIProvider} from '../packages/ai/hosted-provider.ts';
import {CredentialVault} from '../packages/platform/credential-vault.ts';
import {IndexedDBProfileStore} from '../packages/storage-indexeddb/profiles.ts';
import {ProfileService} from '../packages/application/profile-service.ts';
import {WebCryptoProfile} from '../packages/crypto/web-crypto-profile.ts';
const secret='synthetic-provider-credential';
test('AI-PROV-005/006 AI-SEC-003: fixed origins, header-only credentials and structured responses',async()=>{
 for(const name of ['openai','gemini'] as const){let seen=false;const request:typeof fetch=async(url,options)=>{
  seen=true;assert.ok(!String(url).includes(secret));assert.equal(options?.redirect,'error');assert.equal(options?.credentials,'omit');
  const headers=options?.headers as Record<string,string>;assert.equal(headers[name==='openai'?'Authorization':'x-goog-api-key'],name==='openai'?'Bearer '+secret:secret);
  const body=JSON.parse(String(options?.body));assert.ok(!String(options?.body).includes(secret));
  if(name==='openai')assert.equal(body.store,false);
  return Response.json(name==='openai'?{status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'{"reply":"Hello","proposal":null}'}]}]}:{candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:'{"reply":"Hello","proposal":null}'}]}}]});
 };
 let text='';for await(const chunk of new HostedAIProvider(name,'test-model',secret,request).generate({prompt:'Hello',signal:new AbortController().signal}))text+=chunk;
 assert.equal(JSON.parse(text).reply,'Hello');assert.ok(seen);
 }
});
test('AI-PROV-002: sanitized error, incomplete output and cancellation',async()=>{
 async function collect(provider:HostedAIProvider,signal=new AbortController().signal){for await(const chunk of provider.generate({prompt:'test',signal}))void chunk;}
 await assert.rejects(collect(new HostedAIProvider('openai','test',secret,async()=>new Response(secret,{status:401}))),error=>error instanceof Error&&!error.message.includes(secret)&&/key/.test(error.message));
 await assert.rejects(collect(new HostedAIProvider('openai','test',secret,async()=>Response.json({status:'incomplete'}))),/finish/);
 const abort=new AbortController();abort.abort();await assert.rejects(collect(new HostedAIProvider('gemini','test',secret,async()=>{throw new Error(secret);}),abort.signal),/cancelled/);
});
test('AI-SEC-001/004: separate encrypted vault, provider binding, profile isolation and locked denial',async()=>{
 const name='vault-test-'+crypto.randomUUID(),store=await IndexedDBProfileStore.open(name),profiles=new ProfileService(store,new WebCryptoProfile()),password='synthetic-vault-password';
 try{
  const a=await profiles.create('Vault A',password,'UTC'),b=await profiles.create('Vault B',password,'UTC'),token=await profiles.unlock(a.id,password),vault=new CredentialVault(profiles);
  await vault.save(token,'openai',secret);assert.equal(await vault.read(token,'openai'),secret);assert.equal(await vault.read(token,'gemini'),null);
  assert.equal((await store.listRecords(a.id)).length,0);
  const db=await openDB('omnivae_credential_vault',1);const sealed=await db.get('credentials',a.id+':openai');assert.ok(!JSON.stringify(sealed).includes(secret));
  await db.put('credentials',sealed,b.id+':openai');db.close();
  const tokenB=await profiles.unlock(b.id,password);await assert.rejects(vault.read(tokenB,'openai'));await assert.rejects(vault.read(token,'openai'));
  await vault.remove(tokenB,'openai');const next=await profiles.unlock(a.id,password);await vault.remove(next,'openai');assert.equal(await vault.read(next,'openai'),null);
 }finally{await store.close();await deleteDB(name);await deleteDB('omnivae_credential_vault');}
});
