import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: {baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:false},
  projects:[{name:'tablet-landscape',use:{viewport:{width:1280,height:800}}},{name:'tablet-portrait',use:{viewport:{width:800,height:1280}}},{name:'phone',use:{viewport:{width:390,height:844}}}]
});
