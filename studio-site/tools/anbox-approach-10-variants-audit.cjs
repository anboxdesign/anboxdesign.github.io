const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'ANBOX-approach-10-variants.html');
const outputDir = path.join(root, 'mobile-redesign-qa', 'approach-10-variants');
const expectedTitle = 'Соединяем стратегию и дизайн в решения, которые работают на результат.';
const expectedHeadings = [
  '15+ лет в индустрии',
  'Экспертиза, которой делимся',
  'В России и в мире',
  'Слушаем и слышим',
  'Личное вовлечение',
  'От идеи до тиража',
];

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });

  const results = [];
  const viewports = [
    { width: 320, height: 720 },
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 2140, height: 980 },
  ];
  for (const viewport of viewports) {
    const { width, height } = viewport;
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(target).href, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    const metrics = await page.evaluate(({ expectedTitle, expectedHeadings }) => {
      const variants = [...document.querySelectorAll('.variant')];
      const screens = variants.map((variant) => {
        const screen = variant.querySelector('.screen');
        const rect = screen.getBoundingClientRect();
        const allText = screen.textContent.replace(/\s+/g, ' ').trim();
        const descendants = [...screen.querySelectorAll('*')]
          .filter((node) => getComputedStyle(node).display !== 'none')
          .map((node) => {
            const nodeRect = node.getBoundingClientRect();
            return {
              tag: node.tagName,
              className: node.className || '',
              hidden: nodeRect.width === 0 && nodeRect.height === 0,
              inRail: Boolean(node.closest('.rail')),
              left: nodeRect.left,
              right: nodeRect.right,
            };
          });
        const horizontalLeaks = descendants.filter((node) => {
          return !node.hidden && !node.inRail && (node.left < rect.left - 1 || node.right > rect.right + 1);
        });
        return {
          width: Math.round(rect.width * 10) / 10,
          title: screen.querySelector('.screen-head h3')?.textContent.trim(),
          headingsPresent: expectedHeadings.filter((heading) => allText.includes(heading)),
          horizontalLeaks: horizontalLeaks.slice(0, 5),
        };
      });
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        variantCount: variants.length,
        screens,
        expectedTitle,
      };
    }, { expectedTitle, expectedHeadings });
    results.push({ width, height, ...metrics });

    if (width === 2140) {
      await page.screenshot({ path: path.join(outputDir, 'all-variants.png'), fullPage: true });
    }
    await page.close();
  }

  const imagePage = await browser.newPage({ viewport: { width: 480, height: 980 }, deviceScaleFactor: 1 });
  await imagePage.goto(pathToFileURL(target).href, { waitUntil: 'networkidle', timeout: 30000 });
  await imagePage.evaluate(() => document.fonts.ready);
  const variants = imagePage.locator('.variant');
  for (let index = 0; index < 10; index += 1) {
    await variants.nth(index).screenshot({
      path: path.join(outputDir, `variant-${String(index + 1).padStart(2, '0')}.png`),
    });
  }

  const firstDetail = imagePage.locator('.layout-5 details').first();
  await firstDetail.locator('summary').click();
  const disclosureCloses = await firstDetail.getAttribute('open') === null;
  const matrixButton = imagePage.locator('.layout-6 .matrix button').nth(5);
  await matrixButton.click();
  const matrixSwitches = await imagePage.locator('.layout-6 .detail-panel strong').textContent() === expectedHeadings[5];
  await imagePage.close();

  const pass = results.every((result) => result.scrollWidth === result.clientWidth
    && result.variantCount === 10
    && result.screens.every((screen) => screen.title === expectedTitle
      && screen.headingsPresent.length >= (screen === result.screens[9] ? 2 : 6)
      && screen.horizontalLeaks.length === 0))
    && disclosureCloses
    && matrixSwitches;

  const report = { pass, disclosureCloses, matrixSwitches, results };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!pass) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
