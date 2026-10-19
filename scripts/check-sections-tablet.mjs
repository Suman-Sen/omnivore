import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const [adbPath,serial]=process.argv.slice(2);
if(!adbPath||!serial)throw new Error('Provide adb and serial');
const adb=(...args)=>execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8'}).trim();
const {fixtureNames}=JSON.parse(readFileSync('logs/device/2026-10-04-appearance.json','utf8'));
const evidence={checkedAt:new Date().toISOString(),tests:[]},name='Reading '+Date.now().toString(36);
let browser,port,page;
async function connect(profileName){
 const pid=adb('shell','pidof','app.omnivae.personal');port=adb('forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`);browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost'));
 await page.getByRole('combobox',{name:'Profile',exact:true}).selectOption({label:profileName});await page.getByLabel('Password',{exact:true}).fill('synthetic-device-passphrase');await page.getByRole('button',{name:'Unlock profile',exact:true}).click();await expect(page.getByTestId('active-profile')).toHaveText(profileName);
}
async function disconnect(){if(browser)await browser.close();if(port)adb('forward','--remove',`tcp:${port}`);browser=undefined;port=undefined;}
try{
 adb('shell','am','force-stop','app.omnivae.personal');adb('shell','am','start','-W','-n','app.omnivae.personal/.MainActivity');await connect(fixtureNames[0]);
 await page.getByRole('button',{name:'＋ Add section',exact:true}).click();await page.getByLabel('Section name',{exact:true}).fill(name);await page.getByLabel('Section description').fill('Synthetic native section');await page.getByRole('button',{name:'Create section',exact:true}).click();
 await page.getByRole('navigation',{name:'Sections',exact:true}).getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'Add entry',exact:true}).click();await page.getByLabel('Entry title').fill('Native reading checklist');await page.getByLabel('Entry content').fill('Private synthetic note');await page.getByRole('button',{name:'Save entry',exact:true}).click();await expect(page.getByRole('heading',{name:'Native reading checklist',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mark done',exact:true}).click();await expect(page.getByRole('button',{name:'Reopen entry',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Manage sections',exact:true}).click();await page.getByRole('button',{name:'Hide '+name,exact:true}).click();await expect(page.getByRole('navigation',{name:'Sections',exact:true}).getByRole('button',{name,exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Show '+name,exact:true}).click();await expect(page.getByRole('navigation',{name:'Sections',exact:true}).getByRole('button',{name,exact:true})).toBeVisible();
 evidence.tests.push({id:'SECTION-001/002/004',result:'pass',detail:'native custom section/create entry/complete/hide/restore'});
 await disconnect();adb('shell','am','force-stop','app.omnivae.personal');adb('shell','am','start','-W','-n','app.omnivae.personal/.MainActivity');await connect(fixtureNames[0]);
 await page.getByRole('navigation',{name:'Sections',exact:true}).getByRole('button',{name,exact:true}).click();await expect(page.getByRole('button',{name:'Reopen entry',exact:true})).toBeVisible();await expect(page.getByText('Private synthetic note',{exact:true})).toBeVisible();
 await page.screenshot({path:'logs/device/2026-10-05-sections.png'});
 evidence.tests.push({id:'SECTION-003/004',result:'pass',detail:'section and completed entry survive native cold process restart'});
 await page.getByRole('button',{name:'Lock / switch profile'}).filter({visible:true}).click();await page.getByRole('combobox',{name:'Profile',exact:true}).selectOption({label:fixtureNames[1]});await page.getByLabel('Password',{exact:true}).fill('synthetic-device-passphrase');await page.getByRole('button',{name:'Unlock profile',exact:true}).click();await expect(page.getByTestId('active-profile')).toHaveText(fixtureNames[1]);await expect(page.getByRole('navigation',{name:'Sections',exact:true}).getByRole('button',{name,exact:true})).toHaveCount(0);
 evidence.tests.push({id:'SECTION-005',result:'pass',detail:'custom section does not appear in second native profile'});
 await page.getByRole('button',{name:'Lock / switch profile'}).filter({visible:true}).click();console.log('PASS native section create/edit checklist, hide/show, restart and isolation');
}catch(error){evidence.failure=String(error);throw error;}
finally{writeFileSync('logs/device/2026-10-05-sections.json',JSON.stringify(evidence,null,2)+'\n');await disconnect();}
