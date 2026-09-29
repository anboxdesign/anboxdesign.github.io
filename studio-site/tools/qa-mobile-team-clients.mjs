import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolsDir, '..');
const outputDir = path.join(root, 'ANBOX-Studio-responsive-clean-20260826');
const previewPath = path.join(outputDir, 'ANBOX-Studio-responsive-preview.html');
const qaDir = path.join(outputDir, 'QA');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const widths = [320, 360, 375, 390, 412, 640, 641, 768, 1440, 3840];

fs.mkdirSync(qaDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error' && !/Failed to load resource/i.test(message.text())) errors.push(`console: ${message.text()}`);
});

await page.goto(pathToFileURL(previewPath).href, { waitUntil: 'domcontentloaded' });
const results = [];

for (const width of widths) {
  const height = width >= 1440 ? Math.round(width * 9 / 16) : 844;
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(100);
  results.push(await page.evaluate((viewportWidth) => {
    const mobile = viewportWidth <= 640;
    const teamRoot = document.querySelector(mobile ? '.anbox-mobile-part--07' : '.anbox-desktop-part--07');
    const clientRoot = document.querySelector(mobile ? '.anbox-mobile-part--06' : '.anbox-desktop-part--06');
    const cards = mobile ? [...teamRoot.querySelectorAll('.person-card')] : [];
    return {
      width: viewportWidth,
      pageOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      teamVisible: Boolean(teamRoot && getComputedStyle(teamRoot).display !== 'none'),
      clientsVisible: Boolean(clientRoot && getComputedStyle(clientRoot).display !== 'none'),
      team: cards.map((card) => {
        const frame = card.querySelector('.person-photo').getBoundingClientRect();
        const image = card.querySelector('.person-photo img');
        const caption = card.querySelector('.person-card__caption');
        const sourceRatio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
        return {
          name: card.querySelector('h3')?.textContent.trim(),
          cardDisplay: getComputedStyle(card).display,
          frameRatio: Number((frame.width / frame.height).toFixed(3)),
          sourceRatio: Number(sourceRatio.toFixed(3)),
          verticalCrop: frame.width / frame.height > sourceRatio + 0.01,
          objectPosition: getComputedStyle(image).objectPosition,
          captionOverflow: Math.max(0, caption.scrollHeight - caption.clientHeight),
        };
      }),
      logoRows: mobile ? clientRoot.querySelectorAll('.logo-row').length : 0,
      logoSequences: mobile ? [...clientRoot.querySelectorAll('.logo-row')].map((row) => row.querySelectorAll('.logo-sequence').length) : [],
    };
  }, width));
}

await page.setViewportSize({ width: 390, height: 844 });
const clients = page.locator('.anbox-mobile-part--06');
await clients.scrollIntoViewIfNeeded();
const firstTransform = await page.locator('.anbox-mobile-part--06 .logo-track').first().evaluate((node) => getComputedStyle(node).transform);
await page.waitForTimeout(500);
const secondTransform = await page.locator('.anbox-mobile-part--06 .logo-track').first().evaluate((node) => getComputedStyle(node).transform);
await clients.screenshot({ path: path.join(qaDir, 'clients-mobile-two-row-390.png') });
await page.locator('.anbox-mobile-part--06 .logo-motion-toggle').click();
const paused = await page.locator('.anbox-mobile-part--06 .logo-track').first().evaluate((node) => getComputedStyle(node).animationPlayState);

const team = page.locator('.anbox-mobile-part--07');
await team.scrollIntoViewIfNeeded();
await Promise.all([...Array(3)].map((_value, index) => page.locator('.anbox-mobile-part--07 .person-photo img').nth(index).evaluate((image) => image.complete || new Promise((resolve) => {
  image.addEventListener('load', resolve, { once: true });
  image.addEventListener('error', resolve, { once: true });
}))));
await team.screenshot({ path: path.join(qaDir, 'team-mobile-head-safe-390.png') });

const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await reduced.goto(pathToFileURL(previewPath).href, { waitUntil: 'domcontentloaded' });
const reducedState = await reduced.locator('.anbox-mobile-part--06 .logo-track').first().evaluate((node) => ({
  animationName: getComputedStyle(node).animationName,
  transform: getComputedStyle(node).transform,
}));
await reduced.close();

const report = {
  generatedAt: new Date().toISOString(),
  results,
  marquee: {
    moves: firstTransform !== secondTransform,
    firstTransform,
    secondTransform,
    paused,
    reducedState,
  },
  errors,
};

fs.writeFileSync(path.join(qaDir, 'team-clients-mobile-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();

const failures = [
  ...results.filter((result) => result.pageOverflow > 0),
  ...results.filter((result) => result.width <= 640 && (result.team.length !== 3 || result.team.some((card) => card.verticalCrop || card.captionOverflow > 0))),
  ...results.filter((result) => result.width <= 640 && (result.logoRows !== 2 || result.logoSequences.some((count) => count !== 2))),
];
if (!report.marquee.moves || report.marquee.paused !== 'paused' || report.marquee.reducedState.animationName !== 'none' || errors.length || failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', widths, marquee: report.marquee, screenshots: ['clients-mobile-two-row-390.png', 'team-mobile-head-safe-390.png'] }, null, 2));
