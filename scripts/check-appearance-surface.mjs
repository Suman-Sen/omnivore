import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const [adbPath,serial]=process.argv.slice(2);
if(!adbPath||!serial)throw new Error('Provide adb and serial');
const adb=(...args)=>execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8'}).trim();
const {fixtureNames}=JSON.parse(readFileSync('logs/device/2026-10-04-appearance.json','utf8'));
const rotation=adb('shell','settings','get','system','user_rotation');
const auto=adb('shell','settings','get','system','accelerometer_rotation');
const airplane=adb('shell','cmd','connectivity','airplane-mode');
const evidence={checkedAt:new Date().toISOString(),tests:[],rotation:[],restored:false};
let browser,port,page;
const restoreSetting=(key,value)=>value==='null'?adb('shell','settings','delete','system',key):adb('shell','settings','put','system',key,value);
async function connect(){
 const pid=adb('shell','pidof','app.omnivae.personal');port=adb('forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`);
 browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost'));
 await page.getByRole('combobox',{name:'Profile',exact:true}).selectOption({label:fixtureNames[0]});
 await page.getByLabel('Password',{exact:true}).fill('synthetic-device-passphrase');
 await page.getByRole('button',{name:'Unlock profile',exact:true}).click();
 await expect(page.getByLabel('Accent hex color')).toHaveValue('#ffcc00');
}
try{
 if(!['enabled','disabled'].includes(airplane))throw new Error('Cannot determine original airplane mode');
 adb('shell','cmd','connectivity','airplane-mode','enable');
 expect(adb('shell','cmd','connectivity','airplane-mode')).toBe('enabled');
 adb('shell','am','force-stop','app.omnivae.personal');
 const launch=adb('shell','am','start','-W','-n','app.omnivae.personal/.MainActivity');expect(launch).toContain('Status: ok');
 await connect();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=120;c.height=120;const x=c.getContext('2d');x.fillStyle='#30709c';x.fillRect(0,0,120,120);return c.toDataURL('image/png').split(',')[1];});
 await page.getByLabel('Background image',{exact:true}).setInputFiles({name:'surface.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await expect(page.getByRole('status',{name:'Profile status'})).toHaveText('Background image saved on this device.');
 await page.getByRole('button',{name:'Calendar',exact:true}).click();
 await expect(page.locator('.workspace')).toHaveCSS('background-image',/data:image/);
 await expect(page.getByRole('region',{name:'Planning workspace',exact:true})).toHaveCSS('background-color','rgba(255, 255, 255, 0.94)');
 await page.getByRole('button',{name:'Tasks',exact:true}).click();
 const taskTitle='Airplane test '+Date.now();
 await page.getByRole('button',{name:'New task',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill(taskTitle);await page.getByRole('button',{name:'Save task',exact:true}).click();
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:taskTitle,exact:true})});
 await card.getByRole('button',{name:'Complete',exact:true}).click();await expect(card.getByRole('button',{name:'Reopen',exact:true})).toBeVisible();
 await page.reload();await page.getByRole('combobox',{name:'Profile',exact:true}).selectOption({label:fixtureNames[0]});await page.getByLabel('Password',{exact:true}).fill('synthetic-device-passphrase');await page.getByRole('button',{name:'Unlock profile',exact:true}).click();await page.getByRole('button',{name:'Tasks',exact:true}).click();await expect(card.getByRole('button',{name:'Reopen',exact:true})).toBeVisible();
 await expect(page.locator('.workspace')).toHaveCSS('background-image',/data:image/);
 evidence.tests.push({id:'TABLET-002/THEME-004',result:'pass',detail:'airplane-mode enabled, cold process launch, unlock, encrypted background and completed task remain available'});
 adb('shell','settings','put','system','accelerometer_rotation','0');
 for(const orientation of ['0','1']){
  adb('shell','settings','put','system','user_rotation',orientation);
  await new Promise(resolve=>setTimeout(resolve,1500));
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.locator('#appearance').scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Accent hex color')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const dimensions=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  await page.screenshot({path:`logs/device/2026-10-04-appearance-rotation-${orientation}.png`});
  evidence.rotation.push({orientation,...dimensions,horizontalOverflow:false});
 }
 expect(evidence.rotation.some(v=>v.width>v.height)).toBe(true);expect(evidence.rotation.some(v=>v.height>v.width)).toBe(true);
 evidence.tests.push({id:'THEME-002',result:'pass',detail:'physical portrait/landscape layout checks; screenshots captured for visual review'});
 const pid=adb('shell','pidof','app.omnivae.personal');
 const startup=adb('logcat','-d',`--pid=${pid}`,'*:E');
 expect(/Error injecting safe area CSS|FATAL EXCEPTION|Uncaught (?:TypeError|Error|ReferenceError)/.test(startup)).toBe(false);
 evidence.tests.push({id:'ANDROID-001',result:'pass',detail:'no matching fatal/uncaught/safe-area error in sampled app process log'});
 await page.getByRole('button',{name:'Calendar',exact:true}).click();
 await page.screenshot({path:'logs/device/2026-10-04-organized-calendar.png'});
 await page.getByRole('button',{name:'Lock / switch profile'}).filter({visible:true}).click();
 console.log('PASS airplane-mode cold launch, durable data, physical rotation and scoped startup checks');
}catch(error){evidence.failure=String(error);throw error;}
finally{
 restoreSetting('user_rotation',rotation);restoreSetting('accelerometer_rotation',auto);
 if(['enabled','disabled'].includes(airplane))adb('shell','cmd','connectivity','airplane-mode',airplane==='enabled'?'enable':'disable');
 evidence.restored=adb('shell','settings','get','system','user_rotation')===rotation&&adb('shell','settings','get','system','accelerometer_rotation')===auto&&adb('shell','cmd','connectivity','airplane-mode')===airplane;
 writeFileSync('logs/device/2026-10-04-appearance-surface.json',JSON.stringify(evidence,null,2)+'\n');
 if(browser)await browser.close();if(port)adb('forward','--remove',`tcp:${port}`);
}
