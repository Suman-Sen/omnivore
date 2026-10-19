import {spawnSync} from 'node:child_process';
const commands=[['scripts/requirements.mjs','--check'],['scripts/verify-docs.mjs'],['--test','tests/foundation.test.mjs','tests/profiles.test.ts','tests/planning.test.ts','tests/sqlite-migrations.test.ts','tests/ai-provider.test.ts','tests/offline-ai.test.ts','tests/proposal.test.ts','tests/calendar-view.test.ts','tests/progress.test.ts','tests/sections.test.ts'],['scripts/check-build-dependencies.mjs'],['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/eslint/bin/eslint.js','apps/web/app','packages','scripts','tests','capacitor.config.ts','playwright.config.ts','eslint.config.mjs','--max-warnings=0'],['node_modules/next/dist/bin/next','build','apps/web'],['scripts/build-offline.mjs'],['node_modules/@playwright/test/cli.js','test']];
for(const args of commands){
  console.log('\nCHECK '+args.join(' '));
  const result=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
  if(result.error) throw result.error;
  if(result.status!==0) process.exit(result.status??1);
}
console.log('Web foundation checks passed. Native/device gates are separate and must not be inferred.');


