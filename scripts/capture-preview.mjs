import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'ignore'});
let browser;
try {
  let ready=false; let lastConnectionError;
  for(let attempt=0;attempt<50;attempt++){
    try { const response=await fetch('http://127.0.0.1:4173'); if(response.ok){ready=true;break;} } catch (error) { lastConnectionError=error; }
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!ready) throw new Error('Preview server did not start',{cause:lastConnectionError});
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:4173');
  await mkdir('.local/screenshots',{recursive:true});
  await page.screenshot({path:'.local/screenshots/tablet-landscape.png',fullPage:true});
  console.log('Saved .local/screenshots/tablet-landscape.png');
} finally { await browser?.close(); server.kill(); }

