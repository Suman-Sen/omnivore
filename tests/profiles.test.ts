import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDB,deleteDB} from 'idb';
import {IndexedDBProfileStore} from '../packages/storage-indexeddb/profiles.ts';
import {WebCryptoProfile} from '../packages/crypto/web-crypto-profile.ts';
import {ProfileService,ProfileError} from '../packages/application/profile-service.ts';
import {defaultPreferences} from '../packages/domain/local-profile.ts';

async function fixture(){
  const name='test-'+crypto.randomUUID();
  const store=await IndexedDBProfileStore.open(name);
  const service=new ProfileService(store,new WebCryptoProfile());
  return {name,store,service,cleanup:async()=>{await store.close();await deleteDB(name);}};
}
const password='synthetic-test-passphrase';
test('PROF-001/002/003/007: create isolated profiles without email, unlock, persist settings',async()=>{
  const f=await fixture();
  try{
    const a=await f.service.create('A',password,'Asia/Kolkata');
    const b=await f.service.create('B',password,'America/New_York');
    assert.notEqual(a.id,b.id);
    assert.equal((await f.service.listProfiles()).length,2);
    const sessionA=await f.service.unlock(a.id,password);
    await f.service.setPreferences(sessionA,{...defaultPreferences,theme:'contrast'});
    const sessionB=await f.service.unlock(b.id,password);
    assert.equal((await f.service.getPreferences(sessionB)).theme,'glass');
    await assert.rejects(f.service.getPreferences(sessionA),{code:'locked'});
    const newA=await f.service.unlock(a.id,password);
    assert.equal((await f.service.getPreferences(newA)).theme,'contrast');
  }finally{await f.cleanup();}
});
test('PROF-004/005: incorrect credentials and stale sessions cannot access settings',async()=>{
  const f=await fixture();
  try{
    const p=await f.service.create('Private',password,'Asia/Kolkata');
    await assert.rejects(f.service.unlock(p.id,'incorrect password'),{code:'invalid_credentials'});
    const token=await f.service.unlock(p.id,password);
    f.service.lock();
    assert.throws(()=>f.service.getProfile(token),{code:'locked'});
    await assert.rejects(f.service.setPreferences(token,{...defaultPreferences}),{code:'locked'});
    await assert.rejects(f.service.getPreferences('invented-session'),{code:'locked'});
  }finally{await f.cleanup();}
});
test('STORE-003: duplicate auth insertion rolls back profile creation transaction',async()=>{
  const f=await fixture();
  try{
    const a=await f.service.create('A',password,'Asia/Kolkata');
    const auth=(await f.store.getAuth(a.id))!;
    const prefs=(await f.store.getPreferences(a.id))!;
    const db=await openDB(f.name,5);
    const id=crypto.randomUUID();
    await db.put('profile_auth',{...auth,profileId:id});
    await assert.rejects(f.store.create({...a,id},{...auth,profileId:id},{...prefs,profileId:id}));
    assert.equal(await db.get('profiles',id),undefined);
    assert.equal(await db.get('profile_settings',id),undefined);
    db.close();
  }finally{await f.cleanup();}
});
test('U-006/STORE-005/006: reopen versioned DB preserves populated profiles (not an upgrade test)',async()=>{
  const f=await fixture();
  let reopened:IndexedDBProfileStore|undefined;
  try{
    const p=await f.service.create('Survivor',password,'Asia/Kolkata');
    await f.store.close();
    reopened=await IndexedDBProfileStore.open(f.name);
    const freshService=new ProfileService(reopened,new WebCryptoProfile());
    const token=await freshService.unlock(p.id,password);
    assert.equal(freshService.getProfile(token).displayName,'Survivor');
    assert.equal((await freshService.getPreferences(token)).theme,'glass');
    const db=await openDB(f.name);
    assert.equal(db.version,5);
    db.close();
  }finally{await reopened?.close();await f.cleanup();}
});
test('SEC: persisted records contain no password, raw key or plaintext preferences',async()=>{
  const f=await fixture();
  try{
    const p=await f.service.create('A',password,'Asia/Kolkata');
    const auth=await f.store.getAuth(p.id);
    const prefs=await f.store.getPreferences(p.id);
    const serialized=JSON.stringify({auth,prefs});
    assert.ok(!serialized.includes(password));
    assert.ok(!serialized.includes('healthAIAccess'));
    assert.ok(!serialized.includes('glass'));
    assert.equal(auth?.iterations,600_000);
    assert.equal(auth?.wrappedKey.version,1);
  }finally{await f.cleanup();}
});
test('SEC: swapped profile ciphertext and tampered ciphertext fail authentication',async()=>{
  const cryptography=new WebCryptoProfile();
  const {key,auth}=await cryptography.createKey(password,'a');
  const encrypted=await cryptography.encrypt(key,{private:'synthetic'},'a:preferences');
  await assert.rejects(cryptography.decrypt(key,encrypted,'b:preferences'));
  await assert.rejects(cryptography.unlockKey(password,{...auth,profileId:'b'}));
  const tampered={...encrypted,ciphertext:(encrypted.ciphertext[0]==='A'?'B':'A')+encrypted.ciphertext.slice(1)};
  await assert.rejects(cryptography.decrypt(key,tampered,'a:preferences'));
  const again=await cryptography.encrypt(key,{private:'synthetic'},'a:preferences');
  assert.notEqual(again.iv,encrypted.iv);
});
test('PROF: persisted throttling prevents further KDF attempts until timeout',async()=>{
  const f=await fixture();
  try{
    let now=1_000;
    const service=new ProfileService(f.store,new WebCryptoProfile(),()=>now);
    const p=await service.create('A',password,'Asia/Kolkata');
    for(let i=0;i<5;i++) await assert.rejects(service.unlock(p.id,'wrong'),{code:'invalid_credentials'});
    await assert.rejects(service.unlock(p.id,password),{code:'throttled'});
    now+=30_001;
    const token=await service.unlock(p.id,password);
    assert.equal(service.getProfile(token).id,p.id);
    assert.equal((await f.store.getAuth(p.id))?.failedAttempts,0);
  }finally{await f.cleanup();}
});
test('U-007: invalid profile/settings input does not write partial records',async()=>{
  const f=await fixture();
  try{
    await assert.rejects(f.service.create('',password,'Asia/Kolkata'),ProfileError);
    await assert.rejects(f.service.create('A','short','Asia/Kolkata'),ProfileError);
    await assert.rejects(f.service.create('A',password,'invalid-zone'),ProfileError);
    assert.deepEqual(await f.service.listProfiles(),[]);
    const a=await f.service.create('A',password,'Asia/Kolkata');
    const token=await f.service.unlock(a.id,password);
    await assert.rejects(f.service.setPreferences(token,{...defaultPreferences,weekStartsOn:9}),{code:'invalid_preferences'});
    assert.equal((await f.service.getPreferences(token)).weekStartsOn,1);
  }finally{await f.cleanup();}
});


test('STORE-007/U-009: populated version-1 migration preserves credentials and encrypted settings',async()=>{
  const name='upgrade-'+crypto.randomUUID();
  const cryptography=new WebCryptoProfile();
  const id=crypto.randomUUID();
  const {key,auth}=await cryptography.createKey(password,id);
  const value=await cryptography.encrypt(key,{theme:'solid',weekStartsOn:0,timeFormat:'12h',healthAIAccess:'off'},`${id}:preferences`);
  const old=await openDB(name,1,{upgrade(db){
    db.createObjectStore('profiles',{keyPath:'id'});
    db.createObjectStore('profile_auth',{keyPath:'profileId'});
    db.createObjectStore('profile_settings',{keyPath:'profileId'});
  }});
  await old.put('profiles',{id,displayName:'Existing',timezone:'Asia/Kolkata',createdAt:'2026-09-28T00:00:00Z',updatedAt:'2026-09-28T00:00:00Z'});
  await old.put('profile_auth',auth);await old.put('profile_settings',{profileId:id,value});old.close();
  const store=await IndexedDBProfileStore.open(name);
  try{
    const service=new ProfileService(store,cryptography);
    const token=await service.unlock(id,password);
    assert.equal(service.getProfile(token).status,'active');
    assert.equal(service.getProfile(token).profileType,'standard');
    const prefs=await service.getPreferences(token);
    assert.equal(prefs.theme,'solid');assert.equal(prefs.aiMemoryEnabled,false);
    assert.equal(prefs.aiHistoryEnabled,true);assert.equal(prefs.defaultCalendarView,'week');
    assert.deepEqual((await store.getPreferences(id))?.value,value);
    assert.deepEqual(await store.getAuth(id),auth);
  }finally{await store.close();await deleteDB(name);}
});
test('PROF-005: lock during decryption invalidates the pending result',async()=>{
  const f=await fixture();
  try{
    const p=await f.service.create('A',password,'Asia/Kolkata');
    const token=await f.service.unlock(p.id,password);
    const pending=f.service.getPreferences(token);f.service.lock();
    await assert.rejects(pending,{code:'locked'});
  }finally{await f.cleanup();}
});

test('THEME-003/004 PROF-007: colors and encrypted image survive reopen, isolate, remove, reject stale and invalid writes',async()=>{
  const f=await fixture();
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5qkAAAAASUVORK5CYII=';
  try{
    const a=await f.service.create('Appearance A',password,'Asia/Kolkata');
    const b=await f.service.create('Appearance B',password,'Asia/Kolkata');
    const ta=await f.service.unlock(a.id,password);
    await f.service.setPreferences(ta,{...defaultPreferences,accentColor:'#ABCDEF',backgroundColor:'#123456'});
    await f.service.setBackground(ta,image);
    assert.equal((await f.service.getPreferences(ta)).accentColor,'#abcdef');
    assert.equal(await f.service.getBackground(ta),image);
    const stored=await f.store.getBackground(a.id);
    assert.ok(!JSON.stringify(stored).includes('data:image'));
    for(const bad of ['url(https://example.com)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,'+'A'.repeat(1_400_001)])await assert.rejects(f.service.setBackground(ta,bad));
    await assert.rejects(f.service.setPreferences(ta,{...defaultPreferences,accentColor:'red'}));
    assert.equal(await f.service.getBackground(ta),image);
    const tb=await f.service.unlock(b.id,password);
    assert.equal(await f.service.getBackground(tb),null);
    assert.equal((await f.service.getPreferences(tb)).accentColor,defaultPreferences.accentColor);
    await assert.rejects(f.service.getBackground(ta),{code:'locked'});
    await assert.rejects(f.service.setBackground(ta,null),{code:'locked'});
    // Even a misplaced encrypted asset cannot decrypt in another profile.
    await f.store.setBackground(b.id,stored!.value);
    await assert.rejects(f.service.getBackground(tb));
    await f.store.setBackground(b.id,null);
    await f.store.close();
    const reopened=await IndexedDBProfileStore.open(f.name);
    try{
      const service=new ProfileService(reopened,new WebCryptoProfile());
      const token=await service.unlock(a.id,password);
      assert.equal(await service.getBackground(token),image);
      assert.equal((await service.getPreferences(token)).backgroundColor,'#123456');
      await service.setBackground(token,null);assert.equal(await service.getBackground(token),null);
      assert.equal((await service.getPreferences(token)).accentColor,'#abcdef');
    }finally{await reopened.close();}
  }finally{await f.cleanup();}
});

test('THEME-003: accent foreground retains WCAG normal-text contrast across RGB colors',async()=>{
  const {accentForeground}=await import('../packages/domain/appearance.ts');
  for(let r=0;r<256;r+=17)for(let g=0;g<256;g+=17)for(let b=0;b<256;b+=17){
    const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    const channels=[r,g,b].map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    const luminance=channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
    const ratio=accentForeground(hex)==='#000000'?(luminance+0.05)/0.05:1.05/(luminance+0.05);
    assert.ok(ratio>=4.5,hex);
  }
});
test('PROF-DELETE-001 THEME-005 CHART-001: durable styles and profile-scoped erasure',async()=>{
 const f=await fixture();try{
  const a=await f.service.create('Delete fixture',password,'Asia/Kolkata'),b=await f.service.create('Keep fixture',password,'Asia/Kolkata');
  const token=await f.service.unlock(a.id,password);
  await f.service.setPreferences(token,{...defaultPreferences,sectionStyles:{study:{accentColor:'#ABCDEF',surfaceColor:'#112233',transparency:37}},dashboardCharts:{tasks:'donut'}});
  await f.service.setBackground(token,'data:image/png;base64,AAAA');
  assert.equal((await f.service.getPreferences(token)).sectionStyles.study.accentColor,'#abcdef');
  assert.equal((await f.service.getPreferences(token)).dashboardCharts.tasks,'donut');
  await assert.rejects(f.service.setPreferences(token,{...defaultPreferences,sectionStyles:{study:{accentColor:'#fff',surfaceColor:'#112233',transparency:101}}}));
  await assert.rejects(f.service.deleteProfile(token,'Wrong name'));
  const original=f.store.deleteProfile.bind(f.store);f.store.deleteProfile=async()=>{throw new Error('Injected deletion failure');};
  await assert.rejects(f.service.deleteProfile(token,a.displayName),/Injected/);assert.equal(f.service.getProfile(token).id,a.id);f.store.deleteProfile=original;
  await f.service.deleteProfile(token,a.displayName);
  assert.equal(await f.store.getProfile(a.id),null);assert.equal(await f.store.getAuth(a.id),null);assert.equal(await f.store.getPreferences(a.id),null);assert.equal(await f.store.getBackground(a.id),null);assert.deepEqual(await f.store.listRecords(a.id),[]);
  await assert.rejects(f.service.getPreferences(token),{code:'locked'});await assert.rejects(f.service.unlock(a.id,password));
  const other=await f.service.unlock(b.id,password);assert.deepEqual((await f.service.getPreferences(other)).sectionStyles,{});assert.deepEqual((await f.service.getPreferences(other)).dashboardCharts,{});
  await assert.rejects(f.service.deleteProfile(token,b.displayName),{code:'locked'});
 }finally{await f.cleanup();}
});
test('CAL-SKIN-001: encrypted gallery selection/activation/deletion, conflict and profile isolation',async()=>{
 const f=await fixture();try{
  const a=await f.service.create('Gallery A',password,'Asia/Kolkata'),b=await f.service.create('Gallery B',password,'Asia/Kolkata');
  let token=await f.service.unlock(a.id,password);
  const initial=await f.service.getCalendarGallery(token);assert.equal(initial.iv,null);
  const id=crypto.randomUUID(),gallery={version:1 as const,selectedId:id,activeId:id,images:[{id,name:'Private fixture',data:'data:image/png;base64,AAAA'}]};
  const iv=await f.service.setCalendarGallery(token,gallery,null);
  assert.ok(!(JSON.stringify(await f.store.getCalendarGallery(a.id))).includes('Private fixture'));
  await assert.rejects(f.service.setCalendarGallery(token,gallery,null),/changed/);
  await assert.rejects(f.service.setCalendarGallery(token,{...gallery,activeId:crypto.randomUUID()},iv));
  token=await f.service.unlock(b.id,password);assert.deepEqual((await f.service.getCalendarGallery(token)).gallery.images,[]);
  token=await f.service.unlock(a.id,password);assert.equal((await f.service.getCalendarGallery(token)).gallery.activeId,id);
  const next=await f.service.setCalendarGallery(token,{...gallery,activeId:null},iv);assert.equal((await f.service.getCalendarGallery(token)).gallery.selectedId,id);
  await f.service.setCalendarGallery(token,{version:1,activeId:null,selectedId:null,images:[]},next);
  assert.deepEqual((await f.service.getCalendarGallery(token)).gallery.images,[]);
  await f.service.deleteProfile(token,a.displayName);assert.equal(await f.store.getCalendarGallery(a.id),null);
 }finally{await f.cleanup();}
});

test('PROF-DELETE-001: credential cleanup failure prevents profile removal',async()=>{
 const f=await fixture();try{const p=await f.service.create('Protected',password,'Asia/Kolkata');const service=new ProfileService(f.store,new WebCryptoProfile(),Date.now,async()=>{throw new Error('Vault unavailable');});const token=await service.unlock(p.id,password);await assert.rejects(service.deleteProfile(token,p.displayName),/Vault unavailable/);assert.ok(await f.store.getProfile(p.id));assert.ok(await f.store.getAuth(p.id));}finally{await f.cleanup();}
});
test('PROF-FORGET-001: locked chooser erasure requires exact confirmation and preserves other profiles',async()=>{
 const f=await fixture();try{const a=await f.service.create('Temporary',password,'Asia/Kolkata'),b=await f.service.create('Retained',password,'Asia/Kolkata');await assert.rejects(f.service.forgetProfile(a.id,'Temporary',false));await assert.rejects(f.service.forgetProfile(a.id,'Wrong',true));await f.service.unlock(b.id,password);await assert.rejects(f.service.forgetProfile(a.id,'Temporary',true),{code:'busy'});f.service.lock();await f.service.forgetProfile(a.id,'Temporary',true);assert.equal(await f.store.getProfile(a.id),null);assert.ok(await f.store.getProfile(b.id));assert.ok(await f.store.getAuth(b.id));}finally{await f.cleanup();}
});
