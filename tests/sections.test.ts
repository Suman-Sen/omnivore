import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteDB} from 'idb';
import {IndexedDBProfileStore} from '../packages/storage-indexeddb/profiles.ts';
import {ProfileService} from '../packages/application/profile-service.ts';
import {SectionService} from '../packages/application/section-service.ts';
import {WebCryptoProfile} from '../packages/crypto/web-crypto-profile.ts';
import {normalizePreferences} from '../packages/domain/local-profile.ts';
test('SECTION-001..005: add/edit/hide/restore entries, stale protection and profile isolation',async()=>{
 const name='sections-'+crypto.randomUUID(),store=await IndexedDBProfileStore.open(name),profiles=new ProfileService(store,new WebCryptoProfile()),service=new SectionService(profiles),password='synthetic-section-passphrase';
 try{
  const a=await profiles.create('A',password,'Asia/Kolkata'),b=await profiles.create('B',password,'Asia/Kolkata');
  let token=await profiles.unlock(a.id,password);
  const section=await service.saveSection(token,{title:'Reading',description:'Books and ideas',archived:false});
  let entry=await service.saveEntry(token,section.id,{title:'Read chapter',content:'Keep these notes',completed:false});
  entry=await service.saveEntry(token,section.id,{...entry,completed:true},entry.id,entry.revision);
  await assert.rejects(service.saveEntry(token,section.id,entry,entry.id,1),/changed/);
  await assert.rejects(service.saveSection(token,{title:'reading',description:'',archived:false}),/already exists/);
  const hidden=await service.saveSection(token,{...section,archived:true},section.id,section.revision);
  await assert.rejects(service.saveEntry(token,section.id,{title:'No hidden writes',content:'',completed:false}),/unavailable/);
  assert.equal((await service.list(token)).filter(r=>r.kind==='section_entry').length,1);
  await service.saveSection(token,{...hidden,title:'My library',archived:false},hidden.id,hidden.revision);
  token=await profiles.unlock(b.id,password);
  assert.deepEqual(await service.list(token),[]);
  await assert.rejects(service.saveEntry(token,section.id,{title:'Foreign',content:'',completed:false}),/unavailable/);
  await assert.rejects(service.saveSection(token,{...section,title:'Foreign'},section.id,1),/unavailable/);
  await assert.rejects(service.removeEntry(token,entry.id,entry.revision),/unavailable/);
  token=await profiles.unlock(a.id,password);
  const rows=await service.list(token);assert.equal(rows.find(r=>r.kind==='custom_section')?.title,'My library');
  const saved=rows.find(r=>r.kind==='section_entry');assert.ok(saved?.kind==='section_entry');assert.equal(saved.completed,true);assert.equal(saved.content,'Keep these notes');
  const original=store.commitRecords.bind(store);store.commitRecords=async()=>{throw new Error('Injected failed transaction');};
  await assert.rejects(service.saveEntry(token,section.id,{...entry,content:'Not saved'},entry.id,entry.revision),/Injected/);
  store.commitRecords=original;assert.equal((await service.list(token)).find(r=>r.kind==='section_entry')?.revision,entry.revision);
  await service.removeEntry(token,entry.id,entry.revision);assert.equal((await service.list(token)).filter(r=>r.kind==='section_entry').length,0);
  profiles.lock();await assert.rejects(service.list(token),{code:'locked'});
 }finally{await store.close();await deleteDB(name);}
});
test('SECTION-002/003 STORE-007: legacy preference defaults and validated section customization',()=>{
 const prefs=normalizePreferences({theme:'solid'});assert.equal(prefs.navigationVersion,1);assert.deepEqual(prefs.sectionLabels,{});assert.ok(prefs.sectionOrder.includes('study'));
 assert.throws(()=>normalizePreferences({...prefs,sectionLabels:{study:''}}));
 assert.throws(()=>normalizePreferences({...prefs,sectionOrder:['study','study']}));
 assert.throws(()=>normalizePreferences({...prefs,sectionOrder:['unknown']}));
 assert.equal(normalizePreferences({...prefs,sectionLabels:{study:'Learning'}}).sectionLabels.study,'Learning');
});
