const { chromium } = require('/home/khaled/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const PDF = '/home/khaled/Downloads/Lecture-1-DM.pdf';
const fs = require('fs');
const b64 = fs.readFileSync(PDF).toString('base64');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/khaled/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', m => { const t = m.text(); if (!t.includes('React DevTools') && !t.includes('GL Driver') && !t.includes('[vite]')) console.log('[console]', m.type(), t.slice(0,300)); });
  page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0,300)));

  await page.goto('http://localhost:5173/generate', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.waitForSelector('input[type=file]', { timeout: 8000, state: 'attached' });

  // Inject the file into the input via DataTransfer and dispatch change (mimics real selection)
  await page.evaluate((b64) => {
    const input = document.querySelector('input[type=file]');
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const file = new File([buf], 'Lecture-1-DM.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('[injected] change dispatched, files=', input.files.length);
  }, b64);

  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(5000);
    const snap = await page.evaluate(() => {
      const txt = document.body.innerText.replace(/\s+/g, ' ');
      const m = txt.match(/(Extracting text[^.]*)|\b\d{1,3}%\b|(stuck|error|Error)[^\n.]*/i);
      const prog = Array.from(document.querySelectorAll('*')).map(e => e.getAttribute('aria-valuenow')).filter(Boolean);
      return { snippet: m ? m[0] : '', prog, hasExtracting: txt.includes('Extracting'), hasError: /error|Error/.test(txt.slice(0,800)) };
    });
    console.log(`--- t=${(i+1)*5}s --- progress=${snap.prog.join(',')} extracting=${snap.hasExtracting} error=${snap.hasError} snippet="${snap.snippet.slice(0,120)}"`);
    if (snap.hasError && !snap.hasExtracting) break;
  }
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e.message); process.exit(1); });
