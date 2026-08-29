const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const sourceFile = path.join(root, 'ANBOX-Studio-mobile.html');
const variantsFile = path.join(root, 'hero-layout-variants.html');
const outputDir = path.join(root, 'hero-layout-variants');
const frameFile = path.join(outputDir, 'hero-video-frame.png');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const names = ['bottom', 'split', 'middle', 'center', 'diagonal'];

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath: edge });
  const source = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await source.goto(pathToFileURL(sourceFile).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await source.waitForTimeout(2600);
  await source.evaluate(async () => {
    const video = document.querySelector('[data-hero-video]');
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
    }
    video.pause();
  });
  await source.addStyleTag({ content: '.hero::after{content:none!important}.hero__content,.site-header{visibility:hidden!important}' });
  await source.locator('.hero').screenshot({ path: frameFile });
  await source.close();

  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(variantsFile).href, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const studies = page.locator('[data-variant]');
  const count = await studies.count();
  if (count !== 5) throw new Error(`Expected 5 variants, received ${count}`);

  const qa = await page.locator('.hero-frame').evaluateAll((nodes) => nodes.map((frame) => {
    const frameRect = frame.getBoundingClientRect();
    const heading = frame.querySelector('.hero-heading');
    const headline = frame.querySelector('.hero-headline');
    const support = frame.querySelector('.hero-support');
    const button = frame.querySelector('.hero-button');
    const header = frame.querySelector('.hero-header');
    const bounds = [headline, support, button].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left - frameRect.left),
        top: Math.round(rect.top - frameRect.top),
        right: Math.round(rect.right - frameRect.left),
        bottom: Math.round(rect.bottom - frameRect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
    const [headlineRect, supportRect, buttonRect] = bounds;
    const headerRect = header.getBoundingClientRect();
    const inside = bounds.every((rect) => rect.left >= 0 && rect.top >= 0 && rect.right <= frameRect.width && rect.bottom <= frameRect.height);
    return {
      name: frame.getAttribute('aria-label'),
      inside,
      separatedFromHeader: headlineRect.top >= Math.round(headerRect.bottom - frameRect.top) + 24,
      groupsDoNotOverlap: headlineRect.bottom <= supportRect.top || supportRect.bottom <= headlineRect.top,
      headingSize: Number.parseFloat(getComputedStyle(heading).fontSize),
      buttonHeight: buttonRect.height,
      headlineRect,
      supportRect,
    };
  }));

  const invalid = qa.filter((item) => !item.inside
    || !item.separatedFromHeader
    || !item.groupsDoNotOverlap
    || item.headingSize < 48
    || item.headingSize > 64
    || item.buttonHeight < 44);
  if (invalid.length) throw new Error(`Variant QA failed: ${JSON.stringify(invalid, null, 2)}`);

  for (let index = 0; index < count; index += 1) {
    const frame = studies.nth(index).locator('.hero-frame');
    await frame.screenshot({
      path: path.join(outputDir, `hero-variant-${String(index + 1).padStart(2, '0')}-${names[index]}.png`),
    });
  }

  const dimensions = await page.locator('.hero-frame').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  }));

  await page.evaluate(() => document.body.classList.add('is-contact'));
  await page.setViewportSize({ width: 760, height: 1100 });
  await page.screenshot({ path: path.join(outputDir, 'hero-variants-contact-sheet.png'), fullPage: true });

  await browser.close();
  process.stdout.write(`${JSON.stringify({ ok: true, count, frameFile, outputDir, dimensions, qa }, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
