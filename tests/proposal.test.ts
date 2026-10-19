import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteDB} from 'idb';
import {IndexedDBProfileStore} from '../packages/storage-indexeddb/profiles.ts';
import {ProfileService} from '../packages/application/profile-service.ts';
import {PlanningService} from '../packages/application/planning-service.ts';
import {ProposalService} from '../packages/application/proposal-service.ts';
import {WebCryptoProfile} from '../packages/crypto/web-crypto-profile.ts';
const password='synthetic-proposal-password';const provenance={provider:'fake',model:'test'};
const plan={intent:'Plan my day',operations:[{action:'create',kind:'task',values:{title:'Read',scheduledStartAt:'2026-10-04T10:00:00Z',scheduledEndAt:'2026-10-04T11:00:00Z'}},{action:'create',kind:'goal',values:{title:'Learn',targetDate:'2026-10-07'}}]};
async function fixture(){const name='proposal-'+crypto.randomUUID(),store=await IndexedDBProfileStore.open(name),profiles=new ProfileService(store,new WebCryptoProfile());const a=await profiles.create('A',password,'Asia/Kolkata'),b=await profiles.create('B',password,'Asia/Kolkata');const token=await profiles.unlock(a.id,password);return {store,profiles,a,b,token,service:new ProposalService(profiles),cleanup:async()=>{await store.close();await deleteDB(name);}};}
test('AI-APPROVAL-001/002/004/005/010: strict structured preview, no mutation before approval, exact atomic apply',async()=>{
 const f=await fixture();try{
  await assert.rejects(f.service.propose(f.token,'please create task',provenance));
  await assert.rejects(f.service.propose(f.token,{...plan,operations:[{action:'create',kind:'task',values:{title:'Bad',profileId:f.b.id}}]},provenance));
  await assert.rejects(f.service.propose(f.token,{...plan,operations:[{action:'update',kind:'task',targetId:'missing',expectedRevision:1,values:{title:'Bad'}}]},provenance));
  const p=await f.service.propose(f.token,plan,provenance);
  assert.equal((await new PlanningService(f.profiles).list(f.token)).length,0);
  assert.equal(p.operations.length,2);assert.equal(p.events.length,1);
  await f.service.approve(f.token,{id:p.id,version:p.proposalVersion,hash:p.planHash,confirmed:true});
  const records=await f.profiles.readRecords(f.token);assert.equal(records.filter(r=>r.kind==='task').length,1);assert.equal(records.filter(r=>r.kind==='goal').length,1);assert.equal(records.filter(r=>r.kind==='ai_approval').length,1);
  await assert.rejects(f.service.approve(f.token,{id:p.id,version:p.proposalVersion,hash:p.planHash,confirmed:true}));
 }finally{await f.cleanup();}
});
test('AI-APPROVAL-006/008/011/012: changed, destructive, expired and foreign approvals cannot write',async()=>{
 const f=await fixture();try{
  const p=await f.service.propose(f.token,plan,provenance);
  const revised=await f.service.propose(f.token,{...plan,intent:'Changed plan'},provenance,p.id);
  await assert.rejects(f.service.approve(f.token,{id:p.id,version:p.proposalVersion,hash:p.planHash,confirmed:true}));
  await assert.rejects(f.service.propose(f.token,{...plan,operations:[{action:'delete',kind:'task',targetId:'any'}]},provenance),/separate explicit flow/);
  await assert.rejects(new ProposalService(f.profiles,()=>Date.now()+90000000).approve(f.token,{id:revised.id,version:revised.proposalVersion,hash:revised.planHash,confirmed:true}),/expired/);
  const tokenB=await f.profiles.unlock(f.b.id,password);
  await assert.rejects(f.service.approve(tokenB,{id:revised.id,version:revised.proposalVersion,hash:revised.planHash,confirmed:true}));assert.deepEqual(await f.service.list(tokenB),[]);
 }finally{await f.cleanup();}
});
test('AI-APPROVAL-009: commit failure rolls back approval and all records; stale snapshot requires reapproval',async()=>{
 const f=await fixture();try{
  const p=await f.service.propose(f.token,plan,provenance),apply=()=>f.service.approve(f.token,{id:p.id,version:p.proposalVersion,hash:p.planHash,confirmed:true});
  const original=f.store.commitRecords.bind(f.store);
  f.store.commitRecords=async(profileId,mutations,expected)=>original(profileId,[...mutations,{...mutations[0],expectedRevision:999}],expected);
  await assert.rejects(apply());assert.equal((await new PlanningService(f.profiles).list(f.token)).length,0);assert.equal((await f.service.list(f.token))[0].status,'pending_approval');
  f.store.commitRecords=original;
  await new PlanningService(f.profiles).save(f.token,{kind:'goal',title:'Changed independently',description:'',status:'active',progressMode:'evidence'});
  await assert.rejects(apply(),/data changed/);
 }finally{await f.cleanup();}
});
