import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
test('FND-008: domain imports do not depend on presentation, databases or vendors',()=>{
  for(const file of files('packages/domain')) {
    const text=readFileSync(file,'utf8');
    assert.doesNotMatch(text,/(?:from\s*|import\s*\()['"](?:react|next|@capacitor|dexie|.*sqlite|openai|@anthropic)/i,file);
  }
});
test('Android shell bundles exported assets without a live server URL',()=>{
  const config=readFileSync('capacitor.config.ts','utf8');
  assert.match(config,/webDir: 'apps\/web\/out'/);
  assert.doesNotMatch(config,/server\s*:/);
  assert.match(readFileSync('apps/web/next.config.ts','utf8'),/output: 'export'/);
});
test('Session contract preserves monthly scheduling, voice and on-device inference',()=>{
  const contract=readFileSync('docs/delivery-contract.md','utf8');
  for(const term of ['day, week, and month','Two-way voice','on-device AI','APK','crash/bug']) assert.ok(contract.includes(term),term);
});

test("FND-002: all first-party source files are valid UTF-8",()=>{
  for(const root of ["apps/web/app","packages","scripts","tests"])for(const file of files(root))new TextDecoder("utf-8",{fatal:true}).decode(readFileSync(file));
});
