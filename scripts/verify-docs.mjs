import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const names=['prd.md','architecture.md','rules.md','phases.md','schema.md','memory.md','testing.md'];
const docs=Object.fromEntries(names.map(name=>[name,new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(name))]));
for(const name of names) assert.ok(docs[name].trim(),name);
console.log('PASS DOC-001/002: all required files exist and are nonempty UTF-8');
for(const name of names){
  assert.ok(docs[name].startsWith('# Omnivae'),name);
  assert.equal((docs[name].match(/^```/gm)??[]).length%2,0,name);
}
console.log('PASS DOC-003/009: product headings and fence balance');
for(const name of ['rules.md','phases.md','memory.md','testing.md']) assert.match(docs[name],/tests?[^\n]*pass|pass[^\n]*tests?/i);
console.log('PASS DOC-004: completion-rule declarations present');
const gates=[...new Set(docs['phases.md'].match(/P\d+-GATE-[A-Z-]+/g))];
for(const gate of gates) assert.ok(docs['testing.md'].includes(gate),gate);
console.log('PASS DOC-005: named phase gates resolve');
for(const term of ['local-first','profile isolation','Career','approval','BYOK','offline']) assert.ok(docs['prd.md'].toLowerCase().includes(term.toLowerCase()),term);
console.log('PASS DOC-006: invariant terms present; semantic review still required');
for(const term of ['profiles','tasks','goals','calendar_events','notes','ai_memories','health_samples','files']) assert.ok(docs['schema.md'].includes('`'+term+'`'),term);
console.log('PASS DOC-007: required logical entities present');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]);}
const scanFiles=[...names,...files('packages'),...files('apps/web/app'),...files('scripts'),...files('tests')];
for(const file of scanFiles){
  const text=readFileSync(file,'utf8');
  assert.doesNotMatch(text,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,file);
  assert.doesNotMatch(text,/\b(?:sk-[A-Za-z0-9]{32,}|ghp_[A-Za-z0-9]{36})\b/,file);
}
console.log('PASS DOC-010/FND-009 baseline pattern scan: no detected key/token patterns in scanned first-party files. Not a complete security audit.');
console.log('DOC-008 requires manual comparison of memory completion claims with current evidence; not automatically certified.');
