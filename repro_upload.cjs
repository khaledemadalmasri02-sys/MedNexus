const { chromium } = require('/home/khaled/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const fs = require('fs');

const EXEC = '/home/khaled/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const PDF = '/home/khaled/Downloads/Lecture-1-DM.pdf';

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', m => console.log('[console]', m.type(), m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('requestfailed', r => console.log('[requestfailed]', r.url(), r.failure() && r.failure().errorText));

  // 1) Load the app to establish same-origin + CSRF cookie
  const resp = await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  console.log('[goto]', resp && resp.status());

  // 2) Read CSRF token from cookie
  const csrf = await page.evaluate(() => {
    const m = document.cookie.match(/csrf_token=([^;]+)/);
    return m ? m[1] : null;
  });
  console.log('[csrf]', csrf ? csrf.slice(0, 12) + '...' : 'NONE');

  // 3) Read the PDF and create a File in the browser, then do the XHR upload
  const b64 = fs.readFileSync(PDF).toString('base64');
  const result = await page.evaluate(async ({ b64, csrf }) => {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const file = new File([buf], 'Lecture-1-DM.pdf', { type: 'application/pdf' });
    const fd = new FormData();
    fd.append('files', file);

    return await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/extract/pdf/batch');
      if (csrf) xhr.setRequestHeader('x-csrf-token', csrf);
      xhr.withCredentials = true;
      const events = [];
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const p = Math.round((e.loaded / e.total) * 100);
          events.push('progress ' + p + '% (' + e.loaded + '/' + e.total + ')');
          console.log('[xhr progress]', p + '%');
        }
      };
      xhr.onload = () => resolve({ ok: true, status: xhr.status, body: xhr.responseText.slice(0, 200), events });
      xhr.onerror = () => resolve({ ok: false, error: 'Network error during upload', events });
      xhr.ontimeout = () => resolve({ ok: false, error: 'timeout', events });
      xhr.send(fd);
      // safety timeout
      setTimeout(() => resolve({ ok: false, error: 'script-timeout-60s', events }), 60000);
    });
  }, { b64, csrf });

  console.log('[RESULT]', JSON.stringify(result, null, 2));
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
