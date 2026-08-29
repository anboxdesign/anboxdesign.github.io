const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'mobile-redesign-qa', 'approach-candidates');
const url = pathToFileURL(path.join(root, 'ANBOX-Studio-mobile.html')).href;

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });

  for (const width of [320, 390]) {
    for (const ratio of [40, 42, 44]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.goto(url, { waitUntil: 'load' });
      await page.addStyleTag({ content: `.approach-page { grid-template-columns: minmax(0, ${ratio}fr) minmax(0, ${100 - ratio}fr) !important; }` });
      await page.evaluate(() => document.fonts.ready);
      for (let state = 1; state <= 3; state += 1) {
        if (state > 1) {
          await page.locator('[data-approach-next]').click();
          await page.waitForTimeout(350);
        }
        await page.locator('#approach').screenshot({
          path: path.join(outputDir, `${width}-${ratio}-${state}.png`),
        });
      }
      await page.close();
    }
  }
  await browser.close();
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
