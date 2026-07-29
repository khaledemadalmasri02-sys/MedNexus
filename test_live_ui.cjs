const { chromium } = require('/home/khaled/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const EXEC = '/home/khaled/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const allLogs = [];
  const networkLogs = [];

  page.on('console', m => {
    const text = m.text();
    if (!text.includes('GL Driver') && !text.includes('ReadPixels')) {
      allLogs.push(`[${m.type()}] ${text}`);
    }
  });

  page.on('pageerror', e => allLogs.push(`[pageerror] ${e.message}`));

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      let body = '';
      try { body = await response.text(); } catch {}
      networkLogs.push(`${response.status()} ${url.replace('https://mednexus.fit', '')} -> ${body.slice(0, 200)}`);
    }
  });

  // Navigate and fill form
  await page.goto('https://mednexus.fit/generate', { waitUntil: 'networkidle' });

  const nameInput = page.locator('input[placeholder="e.g. Cardiology Basics"]');
  await nameInput.fill('Debug Test Cardiology');

  const textArea = page.locator('textarea[placeholder="Paste your notes, textbook content, or any text you want to generate cards from..."]');
  await textArea.fill('The left atrium is the most posterior part of the heart. Enlargement of the left atrium causes compression of esophagus leading to dysphagia. The right ventricle is the most anterior and most commonly injured in trauma.');

  // Check UI state before clicking
  const beforeText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('[Before Generate]\n', beforeText.replace(/\s+/g, ' ').slice(0, 300));

  // Intercept the SSE call
  const sseLogs = [];
  const origFetch = await page.evaluateHandle(() => window.fetch);

  await page.addInitScript(() => {
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const res = await origFetch.apply(this, args);
      if (args[0] && args[0].includes && args[0].includes('generate')) {
        console.log('[intercepted-fetch] url=' + args[0] + ' status=' + res.status);
        const cloned = res.clone();
        cloned.text().then(t => console.log('[intercepted-fetch-body] ' + t.slice(0, 600))).catch(() => {});
      }
      return res;
    };
  });

  await page.reload({ waitUntil: 'networkidle' });

  await page.fill('input[placeholder="e.g. Cardiology Basics"]', 'Debug Test Cardiology');
  await page.fill('textarea[placeholder="Paste your notes, textbook content, or any text you want to generate cards from..."]', 'The left atrium is the most posterior part of the heart. Enlargement of the left atrium causes compression of esophagus leading to dysphagia. The right ventricle is the most anterior and most commonly injured in trauma.');

  const generateBtn = page.locator('button:has-text("Generate Flashcards")');
  await generateBtn.click();

  await page.waitForTimeout(10000);

  const afterText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 600));
  console.log('[After Generate]\n', afterText);

  console.log('\n--- Console Logs ---');
  allLogs.forEach(l => console.log(l));

  console.log('\n--- Network Logs ---');
  networkLogs.forEach(l => console.log(l));

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e.message, e.stack); process.exit(1); });
