import { chromium } from '/workspace/gingerbread-house/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const outDir = '/workspace/gingerbread-android/assets/captures';
fs.mkdirSync(outDir, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:8765/index.html';

function waitServer() {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      const req = http.get(URL, (res) => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() - t0 > 20000) reject(new Error('server timeout'));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

await waitServer();

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function decorate(page) {
  const idle = async () => {
    await page.waitForFunction(() => window.GB && !window.GB.busy(), null, { timeout: 25000 });
    await page.waitForTimeout(200);
  };
  const ws = (x, y, z) => page.evaluate(([x, y, z]) => window.GB.worldScreen(x, y, z), [x, y, z]);
  async function drag(from, to, steps = 12) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps });
    await page.mouse.up();
  }
  const tray = async (k) => {
    await page.locator(`[data-kind="${k}"]`).scrollIntoViewIfNeeded();
    const b = await page.locator(`[data-kind="${k}"]`).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  await page.waitForFunction(() => window.GB);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { try { window.GB; document.querySelector('#name').value = 'Sam'; } catch {} });

  await page.evaluate(() => window.GB.autoBuild());
  await page.waitForFunction(() => window.GB.placed().length >= 7, null, { timeout: 20000 });
  await idle();
  await page.waitForTimeout(600);

  await page.evaluate(() => window.GB.setPhase('decorate'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.GB.view(5.2, 5.0, 11.2, 0, 1.8, 0));
  await page.waitForTimeout(250);

  const shingle = page.locator('#shingle');
  if (await shingle.count()) await shingle.click();
  await page.waitForTimeout(300);
  const fence = page.locator('#fencearound');
  if (await fence.count()) await fence.click();
  await page.waitForTimeout(400);

  const z = 2.5 + 0.12;
  try {
    for (const x of [-1.5, 1.5]) await drag(await tray('gumdrop'), await ws(x, 0.95, z), 10);
    await page.mouse.click(...Object.values(await tray('peppermint')));
    for (const [x, y] of [[-1.35, 2.5], [1.35, 2.5], [0, 4.25]]) {
      const q = await ws(x, y, z);
      await page.mouse.click(q.x, q.y);
    }
    await drag(await tray('cane'), await ws(-0.95, 0.05, 3.3), 10);
    await drag(await tray('cane'), await ws(0.95, 0.05, 3.3), 10);
    await drag(await tray('gingerman'), await ws(1.9, 0.05, 3.5), 10);
    await drag(await tray('tree'), await ws(-3.1, 0.05, 2.4), 10);
  } catch (e) {
    console.warn('decorate extras failed', e.message);
  }
  await idle();
}

const glArgs = {};

// --- Phone screenshots 1080x1920 ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.GB);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'phone-01-build.png'), type: 'png' });

  await decorate(page);
  await page.screenshot({ path: path.join(outDir, 'phone-03-decorate.png'), type: 'png' });

  await page.evaluate(() => window.GB.setPhase('ice'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.GB.view(4.6, 4.2, 10.6, 0, 2, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'phone-02-ice.png'), type: 'png' });

  await page.evaluate(() => window.GB.setPhase('decorate'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.GB.view(-6, 4.5, 9, 0, 1.8, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'phone-04-decorate-angle.png'), type: 'png' });

  await page.evaluate(() => {
    document.querySelector('#name').value = 'Sam';
    document.querySelector('#name').dispatchEvent(new Event('input', { bubbles: true }));
    window.GB.setPhase('finish');
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.GB.view(6.5, 4.8, 9.5, 0, 1.6, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'phone-05-finish.png'), type: 'png' });

  await ctx.close();
  console.log('phone screenshots done');
}

// --- Clean square + wide shots with UI hidden (for icon / feature graphic) ---
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await decorate(page);
  await page.evaluate(() => {
    for (const id of ['topbar', 'guide', 'panel', 'actions', 'hint', 'toast', 'loading', 'namecard', 'modal', 'dropzone']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    window.GB.view(5.4, 4.6, 10.4, 0, 1.55, 0);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, 'icon-source.png'), type: 'png' });
  await ctx.close();
  console.log('icon-source done');
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 940 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await decorate(page);
  await page.evaluate(() => {
    for (const id of ['topbar', 'guide', 'panel', 'actions', 'hint', 'toast', 'loading', 'namecard', 'modal', 'dropzone']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    window.GB.view(4.2, 3.6, 11.5, 0, 1.5, 0);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, 'feature-source.png'), type: 'png' });
  await ctx.close();
  console.log('feature-source done');
}

await browser.close();
console.log('CAPTURE_OK', fs.readdirSync(outDir).join(', '));
