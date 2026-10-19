import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
const [adbPath, serial] = process.argv.slice(2);
if (!adbPath || !serial) throw new Error('Usage: node scripts/check-tablet.mjs <adb.exe> <serial>');
const adb = (...args) => execFileSync(adbPath, ['-s', serial, ...args], { encoding: 'utf8' }).trim();
const evidence = { checkedAt: new Date().toISOString(), coldStarts: [], networkTest: 'WebView simulated offline; device radios unchanged' };
for (let attempt = 0; attempt < 3; attempt++) {
  adb('shell', 'am', 'force-stop', 'app.omnivae.personal');
  const launch = adb('shell', 'am', 'start', '-W', '-n', 'app.omnivae.personal/.MainActivity');
  if (!launch.includes('Status: ok')) throw new Error(launch);
  const appPid = adb('shell', 'pidof', 'app.omnivae.personal');
  if (!/^\d+$/.test(appPid)) throw new Error('Expected one Omnivae process');
  const port = adb('forward', 'tcp:0', `localabstract:webview_devtools_remote_${appPid}`);
  let browser;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 30000 });
    const context = browser.contexts()[0];
    const page = context.pages().find(candidate => candidate.url().startsWith('https://localhost'));
    if (!page) throw new Error('Omnivae bundled page not found');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Make room');
    for (const label of ['Solid', 'High contrast', 'Glass']) {
      const radio = page.getByRole('radio', { name: label, exact: false });
      await radio.check();
      await expect(radio).toBeChecked();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Make room');
    } finally {
      await context.setOffline(false);
    }
    expect(errors).toEqual([]);
    const errorsLog = adb('logcat', '-d', `--pid=${appPid}`, '*:E');
    if (/Error injecting safe area CSS|FATAL EXCEPTION|Uncaught (?:TypeError|Error|ReferenceError)/.test(errorsLog)) throw new Error(errorsLog);
    evidence.coldStarts.push({ attempt: attempt + 1, launch, viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), themeControls: 'pass', horizontalOverflow: false, simulatedOfflineReload: 'pass', startupRegression: 'pass', errorsLog });
    console.log(`PASS cold start ${attempt + 1}: themes, viewport, simulated offline reload, startup error regression`);
  } finally {
    if (browser) await browser.close();
    adb('forward', '--remove', `tcp:${port}`);
  }
}
mkdirSync('logs/device', { recursive: true });
writeFileSync('logs/device/2026-10-02-tablet.json', JSON.stringify(evidence, null, 2) + '\n');
