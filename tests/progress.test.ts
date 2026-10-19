import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateRange,summarizeProgress} from '../packages/domain/progress.ts';
import {normalizePreferences,defaultPreferences} from '../packages/domain/local-profile.ts';
import type {Task,Journal} from '../packages/domain/planning.ts';
const task:Task={id:'t',profileId:'a',kind:'task',revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',title:'Fixture',description:'',status:'completed',priority:'none',timezone:'America/New_York',completedAt:'2026-01-01T01:00:00Z',createdByType:'user'};
test('PROG-001..009: timezone-derived day/week/month/year progress, edits, deletion and isolation',()=>{
  const records=[task,{...task,id:'other',profileId:'b'}];
  for(const range of ['day','week','month','year'] as const)assert.equal(summarizeProgress(records,'a','America/New_York','2025-12-31',range,1).completedTasks,1);
  assert.equal(summarizeProgress(records,'a','America/New_York','2026-01-01','day',1).completedTasks,0);
  assert.equal(summarizeProgress([{...task,status:'pending',completedAt:undefined}],'a','America/New_York','2025-12-31','year',1).completedTasks,0);
  assert.equal(summarizeProgress([{...task,deletedAt:'2026-01-01T02:00:00Z'}],'a','America/New_York','2025-12-31','year',1).completedTasks,0);
  assert.equal(records.length,2);assert.equal(records[0].status,'completed');
  assert.deepEqual(dateRange('2026-03-08','week',0),{start:'2026-03-08',end:'2026-03-15'});
  assert.deepEqual(dateRange('2028-02-29','month',1),{start:'2028-02-01',end:'2028-03-01'});
});
test('DASH-001..005: widget settings validation and old preferences defaults',()=>{
  const settings=normalizePreferences({...defaultPreferences,dashboardWidgets:['goals','tasks'],journalEnabled:false});
  assert.deepEqual(settings.dashboardWidgets,['goals','tasks']);assert.equal(settings.journalEnabled,false);
  assert.throws(()=>normalizePreferences({...settings,dashboardWidgets:['tasks','tasks']}));
  assert.deepEqual(normalizePreferences({theme:'solid'}).dashboardWidgets,['tasks','calendar','goals','journal']);
  const journal:Journal={id:'j',profileId:'a',kind:'journal',revision:1,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',title:'Fixture',narrative:'Synthetic',localDate:'2026-10-01'};
  assert.equal(summarizeProgress([journal],'a','Asia/Kolkata','2026-10-01','month',1).journalEntries,1);
});
