import {test,expect} from '@playwright/test';
test('AI controlled response: preview, exact approval, calendar refresh and offline history',async({page,context})=>{
 await page.route('https://api.openai.com/v1/responses',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply:'Review this reading plan.',proposal:{intent:'Reading day',operations:[{action:'create',kind:'task',values:{title:'AI reading task',scheduledStartAt:'2026-10-04T10:00:00Z',scheduledEndAt:'2026-10-04T11:00:00Z'}}]}})}]}]})}));
 await page.goto('/');await page.getByLabel('Profile name',{exact:true}).fill('AI planner');await page.getByLabel('Password',{exact:true}).fill('synthetic-ai-password');await page.getByLabel('Confirm password').fill('synthetic-ai-password');await page.getByRole('button',{name:'Create profile',exact:true}).click();
 await page.getByRole('button',{name:'Ask AI',exact:true}).click();
 await page.getByRole('combobox',{name:'AI action',exact:true}).selectOption('chat');await page.getByText('AI connection settings',{exact:true}).click();await page.getByRole('combobox',{name:'AI provider',exact:true}).selectOption('openai');await page.getByLabel('Model ID',{exact:true}).fill('test-model');await page.getByLabel('API key',{exact:true}).fill('synthetic-provider-credential');
 await page.getByRole('checkbox',{name:'Send this conversation and selected context to OpenAI for processing'}).check();await page.getByLabel('Your message',{exact:true}).fill('Plan reading tomorrow');await page.getByRole('button',{name:'Send to AI',exact:true}).click();
 await expect(page.getByRole('button',{name:'Apply schedule (1 changes)',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Edit AI reading task',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Apply schedule (1 changes)',exact:true}).click();await expect(page.getByRole('status',{name:'AI status'})).toHaveText('Approved plan saved. Calendar and tasks updated.');
 await page.getByRole('button',{name:'Calendar',exact:true}).click();
 await page.getByLabel('Calendar date',{exact:true}).fill('2026-10-04');await expect(page.getByRole('button',{name:'Edit AI reading task',exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:'Complete AI reading task',exact:true}).check();await expect(page.getByRole('checkbox',{name:'Complete AI reading task',exact:true})).toBeChecked();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});await context.setOffline(true);await page.reload();await page.getByLabel('Password',{exact:true}).fill('synthetic-ai-password');await page.getByRole('button',{name:'Unlock profile',exact:true}).click();
 await page.getByRole('button',{name:'Ask AI',exact:true}).click();
 await page.getByRole('combobox',{name:'Conversation',exact:true}).selectOption({label:'Plan reading tomorrow'});await expect(page.getByText('Review this reading plan.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Calendar',exact:true}).click();
 await page.getByLabel('Calendar date',{exact:true}).fill('2026-10-04');await expect(page.getByRole('checkbox',{name:'Complete AI reading task',exact:true})).toBeChecked();
});
