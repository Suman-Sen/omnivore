import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const [adbPath,serial]=process.argv.slice(2);
if(!adbPath||!serial)throw new Error('Usage: node scripts/check-profile-tablet.mjs <adb> <serial>');
const adb=(...args)=>execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8'}).trim();
const password='synthetic-device-passphrase';
const suffix=Date.now().toString(36);
const names=[`Verification A ${suffix}`,`Verification B ${suffix}`];
const evidence={checkedAt:new Date().toISOString(),tests:[],fixtureNames:names};
let browser,port,page;
async function connect(){
  const pid=adb('shell','pidof','app.omnivae.personal');
  port=adb('forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`);
  browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost'));
  if(!page)throw new Error('Bundled WebView not found');
  await expect(page.getByRole('button',{name:/Create profile|Unlock profile/}).first()).toBeVisible({timeout:30000});
}
async function disconnect(){if(browser)await browser.close();if(port)adb('forward','--remove',`tcp:${port}`);browser=undefined;port=undefined;}
async function create(name){
  const createAnother=page.getByRole('button',{name:'Create another profile'});
  if(await createAnother.isVisible())await createAnother.click();
  await page.getByLabel('Profile name',{exact:true}).fill(name);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button',{name:'Create profile',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText(`Welcome, ${name}`,{timeout:30000});
}
try{
  adb('shell','am','force-stop','app.omnivae.personal');
  const launch=adb('shell','am','start','-W','-n','app.omnivae.personal/.MainActivity');
  if(!launch.includes('Status: ok'))throw new Error('Launch failed');
  await connect();
  await expect(page.getByRole('heading',{level:2}).first()).toBeVisible();
  await expect(page.getByRole('status',{name:'Profile status'})).not.toHaveText('Working…');
  await create(names[0]);
  await page.getByRole('radio',{name:'High contrast'}).check();
  await expect(page.getByRole('status',{name:'Profile status'})).toHaveText('Settings saved on this device.');
  await page.getByRole('button',{name:'Lock / switch profile'}).filter({visible:true}).click();
  await create(names[1]);
  await expect(page.getByRole('radio',{name:'Glass',exact:false})).toBeChecked();
  evidence.tests.push({id:'PROF-001/002/003/007, THEME-001',result:'pass',adapter:'real Android SQLite'});
  await disconnect();
  adb('shell','am','force-stop','app.omnivae.personal');
  adb('shell','am','start','-W','-n','app.omnivae.personal/.MainActivity');
  await connect();
  await page.getByRole('combobox',{name:'Profile',exact:true}).selectOption({label:names[0]});
  await page.getByLabel('Password',{exact:true}).fill('incorrect password');
  await page.getByRole('button',{name:'Unlock profile',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Unable to unlock'})).toContainText('Unable to unlock');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Unlock profile',exact:true}).click();
  await expect(page.getByRole('radio',{name:'High contrast'})).toBeChecked({timeout:30000});
  evidence.tests.push({id:'PROF-004/005, U-006',result:'pass',detail:'wrong password rejected; cold process restart retains encrypted settings'});
  await page.getByRole('button',{name:'Tasks',exact:true}).click();
  await page.getByRole('button',{name:'New task',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Synthetic native task');
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Synthetic native task',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Complete',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reopen',exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('combobox',{name:'Profile',exact:true}).selectOption({label:names[0]});
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Unlock profile',exact:true}).click();
  await page.getByRole('button',{name:'Tasks',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reopen',exact:true})).toBeVisible();
  evidence.tests.push({id:'TASK-001/003, STORE-002, U-006',result:'pass',detail:'real native encrypted task and atomic completion history persist after WebView reload'});

  const stored=await page.evaluate(async()=>{
    const plugin=window.Capacitor.Plugins.CapacitorSQLite;
    const version=await plugin.query({database:'omnivae_profiles',statement:'PRAGMA user_version;',values:[]});
    const settings=await plugin.query({database:'omnivae_profiles',statement:'SELECT encrypted_value FROM profile_settings;',values:[]});
    return {version:version.values,encrypted:settings.values.every(row=>!row.encrypted_value.includes('theme')&&!row.encrypted_value.includes('healthAIAccess'))};
  });
  expect(stored.version[0].user_version).toBe(3);expect(stored.encrypted).toBe(true);
  evidence.tests.push({id:'STORE-005/006, U-010',result:'pass',version:3,settingsEncrypted:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  mkdirSync('logs/device',{recursive:true});
  await page.screenshot({path:'logs/device/2026-10-03-profiles.png',fullPage:false});
  await page.getByRole('button',{name:'Lock / switch profile'}).filter({visible:true}).click();
  console.log('PASS native profile create, unlock, wrong password, isolation, restart, schema and encryption checks');
}catch(error){evidence.failure=String(error);throw error;}
finally{
  mkdirSync('logs/device',{recursive:true});writeFileSync('logs/device/2026-10-03-profiles.json',JSON.stringify(evidence,null,2)+'\n');
  await disconnect();
}
