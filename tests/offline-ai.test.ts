import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OfflineAIProvider} from '../packages/ai/offline-provider.ts';
const collect=async(provider:OfflineAIProvider,signal=new AbortController().signal)=>{let text='';for await(const chunk of provider.generate({prompt:'Synthetic prompt',signal}))text+=chunk;return text;};
test('LOCAL-AI-001 contract: native transport returns structured data without credentials/network',async()=>{
 let seen=false;const provider=new OfflineAIProvider({generate:async input=>{seen=true;assert.deepEqual(Object.keys(input).sort(),['prompt','requestId']);return {text:'```json\n{"reply":"Hello","proposal":null}\n```'};},cancel:async()=>{}});
 assert.equal(provider.execution,'on_device');assert.deepEqual(JSON.parse(await collect(provider)),{reply:'Hello',proposal:null});assert.ok(seen);
});
test('LOCAL-AI-002: cancellation reaches native engine and suppresses late output',async()=>{
 const abort=new AbortController();let cancelled=false;let finish!:(value:{text:string})=>void;
 const provider=new OfflineAIProvider({generate:()=>new Promise(resolve=>{finish=resolve;}),cancel:async()=>{cancelled=true;}});
 const pending=collect(provider,abort.signal);abort.abort();finish({text:'{"reply":"late","proposal":null}'});
 await assert.rejects(pending,/cancelled/);assert.ok(cancelled);
});
test('LOCAL-AI-002: pre-aborted calls never invoke native inference',async()=>{
 const abort=new AbortController();abort.abort();let called=false;
 await assert.rejects(collect(new OfflineAIProvider({generate:async()=>{called=true;return {text:'x'};},cancel:async()=>{}}),abort.signal),/cancelled/);assert.equal(called,false);
});
test('LOCAL-AI-002: missing/oversized output rejected; invalid JSON is not silently repaired',async()=>{
 for(const text of ['', 'x'.repeat(500001)])await assert.rejects(collect(new OfflineAIProvider({generate:async()=>({text}),cancel:async()=>{}})),/empty or oversized/);
 assert.equal(await collect(new OfflineAIProvider({generate:async()=>({text:'not JSON'}),cancel:async()=>{}})),'not JSON');
});
