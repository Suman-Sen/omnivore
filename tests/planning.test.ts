import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteDB} from 'idb';
import {IndexedDBProfileStore} from '../packages/storage-indexeddb/profiles.ts';
import {ProfileService} from '../packages/application/profile-service.ts';
import {PlanningService} from '../packages/application/planning-service.ts';
import {WebCryptoProfile} from '../packages/crypto/web-crypto-profile.ts';
import {goalProgress,wallTimeToInstant,validDate,localDateAt} from '../packages/domain/planning.ts';
import type {Task,Goal,RecordInput} from '../packages/domain/planning.ts';
const password='synthetic-planning-password';
const task:RecordInput<Task>={kind:'task',title:'Synthetic task',description:'',status:'pending',priority:'medium',timezone:'Asia/Kolkata',createdByType:'user'};
async function fixture(){const name='planning-'+crypto.randomUUID();const store=await IndexedDBProfileStore.open(name);const profiles=new ProfileService(store,new WebCryptoProfile());const a=await profiles.create('A',password,'Asia/Kolkata');const b=await profiles.create('B',password,'America/New_York');const token=await profiles.unlock(a.id,password);return {store,profiles,service:new PlanningService(profiles),a,b,token,cleanup:async()=>{await store.close();await deleteDB(name);}};}
test('TASK-001..006/012: CRUD and durable completion/reopen/cancel history',async()=>{
  const f=await fixture();try{
    const created=await f.service.save(f.token,{...task,dueLocalDate:'2020-01-01'}) as Task;
    assert.equal(created.status,'pending');assert.equal(created.completedAt,undefined);
    const done=await f.service.save(f.token,{...created,status:'completed'},created.id,created.revision) as Task;
    assert.ok(done.completedAt);
    const reopened=await f.service.save(f.token,{...done,status:'pending'},done.id,done.revision) as Task;
    assert.equal(reopened.completedAt,undefined);
    const cancelled=await f.service.save(f.token,{...reopened,status:'cancelled'},reopened.id,reopened.revision) as Task;
    assert.equal(cancelled.completedAt,undefined);
    const events=(await f.service.list(f.token)).filter(r=>r.kind==='task_event');
    assert.deepEqual(events.map(r=>r.kind==='task_event'&&r.eventType).sort(),['cancelled','completed','created','reopened']);
    f.profiles.lock();const token=await f.profiles.unlock(f.a.id,password);
    assert.equal((await f.service.list(token)).find(r=>r.id===created.id)?.revision,4);
  }finally{await f.cleanup();}
});
test('U-002/003/004 SEC-ISOLATION-001..003: foreign IDs cannot read, update, delete, link or search',async()=>{
  const f=await fixture();try{
    const goal=await f.service.save(f.token,{kind:'goal',title:'Private goal A',description:'',status:'active',progressMode:'evidence'});
    const aTask=await f.service.save(f.token,task);
    const tokenB=await f.profiles.unlock(f.b.id,password);
    assert.deepEqual(await f.service.list(tokenB),[]);assert.deepEqual(await f.service.search(tokenB,'Private'),[]);
    await assert.rejects(f.service.save(tokenB,task,aTask.id,aTask.revision),/unavailable/);
    await assert.rejects(f.service.remove(tokenB,aTask.id,aTask.revision),/unavailable/);
    await assert.rejects(f.service.save(tokenB,{...task,goalId:goal.id}),/linked record/);
    await assert.rejects(f.service.list(f.token),{code:'locked'});
  }finally{await f.cleanup();}
});
test('NOTE-001..006 TASK-008/010/011 GOAL-008: source note preserved, scoped links, derived progress and deletion',async()=>{
  const f=await fixture();try{
    const note=await f.service.save(f.token,{kind:'note',title:'Source',content:'Original narrative',contentFormat:'plain',pinned:true,favorite:false});
    const goal=await f.service.save(f.token,{kind:'goal',title:'Goal',description:'',status:'active',progressMode:'evidence',sourceNoteId:note.id}) as Goal;
    const linked=await f.service.save(f.token,{...task,goalId:goal.id,sourceNoteId:note.id}) as Task;
    assert.equal(goalProgress(goal,await f.service.list(f.token)).percent,0);
    await f.service.save(f.token,{...linked,status:'completed'},linked.id,linked.revision);
    assert.equal(goalProgress(goal,await f.service.list(f.token)).percent,100);
    assert.equal((await f.service.list(f.token)).filter(r=>r.kind==='note').length,1);
    await f.service.remove(f.token,note.id,note.revision);
    const records=await f.service.list(f.token);
    assert.equal(records.filter(r=>r.kind==='task').length,1);
    assert.equal((records.find(r=>r.id===linked.id) as Task).sourceNoteId,undefined);
    assert.equal((await f.service.search(f.token,'Original narrative')).length,0);
  }finally{await f.cleanup();}
});
test('GOAL-002/003/004: cycle prevention and milestone evidence',async()=>{
  const f=await fixture();try{
    const parent=await f.service.save(f.token,{kind:'goal',title:'Parent',description:'',status:'active',progressMode:'milestone'}) as Goal;
    const child=await f.service.save(f.token,{...parent,title:'Child',parentGoalId:parent.id}) as Goal;
    await assert.rejects(f.service.save(f.token,{...parent,parentGoalId:child.id},parent.id,parent.revision),/ancestor/);
    const milestone=await f.service.save(f.token,{kind:'milestone',goalId:parent.id,title:'Step',status:'completed',orderIndex:0});
    assert.ok('completedAt' in milestone&&milestone.completedAt);
    assert.equal(goalProgress(parent,await f.service.list(f.token)).percent,100);
  }finally{await f.cleanup();}
});
test('TASK-007 CAL-001/002/004/006: date and range validation without partial writes',async()=>{
  const f=await fixture();try{
    await assert.rejects(f.service.save(f.token,{...task,scheduledStartAt:'2026-10-03T12:00:00Z',scheduledEndAt:'2026-10-03T11:00:00Z'}),/after start/);
    await assert.rejects(f.service.save(f.token,{...task,dueLocalDate:'2025-02-29'}),/Invalid due/);
    const event={kind:'event' as const,title:'Overnight',description:'',location:'',calendarId:'local' as const,isAllDay:false,timezone:'Asia/Kolkata',sourceType:'user' as const,startAt:'2026-12-31T23:00:00Z',endAt:'2027-01-01T01:00:00Z'};
    await f.service.save(f.token,event);
    await f.service.save(f.token,{...event,isAllDay:true,startAt:undefined,endAt:undefined,startLocalDate:'2028-02-29',endLocalDate:'2028-03-01'});
    await assert.rejects(f.service.save(f.token,{...event,isAllDay:true,startLocalDate:'2028-02-29',endLocalDate:'2028-02-29'}),/exclusive/);
    assert.equal((await f.service.list(f.token)).length,2);
  }finally{await f.cleanup();}
});
test('CAL-003 PROG-007/008: IANA timezone, DST gaps/folds and leap days',()=>{
  assert.equal(wallTimeToInstant('2026-10-03T12:00','Asia/Kolkata'),'2026-10-03T06:30:00.000Z');
  assert.throws(()=>wallTimeToInstant('2026-03-08T02:30','America/New_York'),/does not exist/);
  assert.throws(()=>wallTimeToInstant('2026-11-01T01:30','America/New_York'),/occurs twice/);
  assert.equal(wallTimeToInstant('2026-11-01T01:30','America/New_York','earlier'),'2026-11-01T05:30:00.000Z');
  assert.equal(wallTimeToInstant('2026-11-01T01:30','America/New_York','later'),'2026-11-01T06:30:00.000Z');
  assert.equal(localDateAt('2026-01-01T01:00:00Z','America/New_York'),'2025-12-31');
  assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2028-02-29'),true);
});
test('STORE-003 U-007: stale writes and partial atomic batches preserve earlier data',async()=>{
  const f=await fixture();try{
    const record=await f.service.save(f.token,task);
    await f.service.save(f.token,{...task,title:'Newer'},record.id,record.revision);
    await assert.rejects(f.service.save(f.token,{...task,title:'Stale'},record.id,record.revision),/changed/);
    const stored=await f.store.listRecords(f.a.id);const existing=stored.find(r=>r.id===record.id)!;
    const first={...existing,id:crypto.randomUUID(),revision:1};
    await assert.rejects(f.store.commitRecords(f.a.id,[{record:first,expectedRevision:0},{record:existing,expectedRevision:1}]),/revision|changed/);
    assert.equal((await f.store.listRecords(f.a.id)).some(r=>r.id===first.id),false);
    assert.ok(!JSON.stringify(await f.store.listRecords(f.a.id)).includes('Newer'));
  }finally{await f.cleanup();}
});

test('TIME-001/002: timed task and goal deadlines persist, date-only goals remain supported',async()=>{
  const f=await fixture();try{
    const targetAt=wallTimeToInstant('2026-10-07T18:30','Asia/Kolkata');
    const savedTask=await f.service.save(f.token,{...task,dueAt:targetAt,scheduledStartAt:'2026-10-07T11:00:00Z',scheduledEndAt:'2026-10-07T12:00:00Z'});
    const goalInput:RecordInput<Goal>={kind:'goal',title:'Timed goal',description:'',status:'active',progressMode:'evidence',targetAt,timezone:'Asia/Kolkata'};
    const goal=await f.service.save(f.token,goalInput);
    await assert.rejects(f.service.save(f.token,{...goalInput,targetDate:'2026-10-07'}),/either/);
    await assert.rejects(f.service.save(f.token,{...goalInput,timezone:undefined}),/timezone/);
    await assert.rejects(f.service.save(f.token,{...goalInput,targetAt:'bad'}),/target time/);
    f.profiles.lock();const token=await f.profiles.unlock(f.a.id,password);
    const records=await f.service.list(token);
    assert.equal((records.find(r=>r.id===goal.id) as Goal).targetAt,targetAt);
    assert.equal((records.find(r=>r.id===savedTask.id) as Task).dueAt,targetAt);
    const dateGoal=await f.service.save(token,{...goalInput,targetAt:undefined,targetDate:'2026-10-08'},goal.id,goal.revision) as Goal;
    assert.equal(dateGoal.targetDate,'2026-10-08');assert.equal(dateGoal.targetAt,undefined);
    assert.equal(dateGoal.createdAt,goal.createdAt);
  }finally{await f.cleanup();}
});
