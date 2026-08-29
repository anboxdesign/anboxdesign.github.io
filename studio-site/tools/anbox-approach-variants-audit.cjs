const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'ANBOX-approach-variants.html');
const outputDir = path.join(root, 'mobile-redesign-qa', 'approach-variants');

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });

  const results = [];
  for (const width of [320, 360, 375, 390, 412, 430, 768, 844, 1440]) {
    const height = width === 844 ? 390 : 900;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(target).href, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      variants: document.querySelectorAll('.variant').length,
      screens: [...document.querySelectorAll('.screen')].map((screen) => ({
        points: screen.querySelectorAll('.point, details').length,
        title: screen.querySelector('.screen__head h3')?.textContent.trim(),
        width: screen.getBoundingClientRect().width,
      })),
    }));

    results.push({ width, height, ...metrics });
    if (width === 1440) {
      await page.screenshot({ path: path.join(outputDir, 'all-variants.png'), fullPage: true });
    }
    if (width === 390) {
      const variants = page.locator('.variant');
      for (let index = 0; index < 5; index += 1) {
        await variants.nth(index).screenshot({ path: path.join(outputDir, `variant-${index + 1}.png`) });
      }
      const firstDetail = page.locator('.v5 details').first();
      await firstDetail.locator('summary').click();
      results.push({ disclosureOpens: await firstDetail.getAttribute('open') !== null });
    }
    await page.close();
  }

  const expectedTitle = 'Соединяем стратегию и дизайн в решения, которые работают на результат.';
  const pass = results.every((result) => {
    if (Object.hasOwn(result, 'disclosureOpens')) return result.disclosureOpens;
    return result.scrollWidth === result.clientWidth
      && result.variants === 5
      && result.screens.every((screen) => screen.points === 6 && screen.title === expectedTitle);
  });

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify({ pass, results }, null, 2));
  console.log(JSON.stringify({ pass, results }, null, 2));
  await browser.close();
  if (!pass) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
