const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'mobile-redesign-qa', 'research-live');
const sites = [
  { id: 'collins', url: 'https://wearecollins.com/programs/brandmerger/', anchor: 'Program Features', items: ['Portfolio Architecture', 'Purpose Definition', 'Brand Identity Design', 'Employee Brand Engagement', 'Brand Positioning & Messaging Guidelines', 'Executive Transformation Management'] },
  { id: 'greyspace', url: 'https://www.greyspacestudios.com/', anchor: 'What we do', items: ['Brand Strategy & Positioning', 'Brand Identity Systems & Packaging', 'Digital Product & Experience Design'] },
  { id: 'smaller', url: 'https://smalleragency.com/', anchor: 'What we do, end to end', items: ['position.', 'identity.', 'package.'] },
  { id: 'lpk', url: 'https://lpk.com/', anchor: 'WHY CLIENTS CHOOSE US', items: ['Future fluent.', 'Strategy + design as one.'] },
  { id: 'straightforward', url: 'https://straightforward.design/our-services-2/', anchor: 'Found', items: ['Found', 'Understood', 'Lived', 'Loved'] },
  { id: 'kott', url: 'https://kott.studio/about', anchor: 'the facts, printed', items: ['founded', 'shape', 'range', 'proof', 'answers'] },
];

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const report = [];

  for (const site of sites) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3500);
      for (const label of ['Accept', 'Accept all', 'Allow all', 'I agree', 'OK']) {
        const button = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
        if (await button.count() && await button.isVisible().catch(() => false)) {
          await button.click().catch(() => {});
          break;
        }
      }
      const anchor = page.getByText(site.anchor, { exact: false }).first();
      const found = await anchor.count() > 0;
      if (found) {
        await anchor.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -150));
        await page.waitForTimeout(700);
      }
      await page.screenshot({ path: path.join(outputDir, `${site.id}-390.png`) });
      const metrics = found ? await anchor.evaluate((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          text: node.textContent.replace(/\s+/g, ' ').trim().slice(0, 160),
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          width: rect.width,
        };
      }) : null;
      const itemMetrics = [];
      for (const text of site.items) {
        const item = page.getByText(text, { exact: true }).first();
        if (!await item.count()) {
          itemMetrics.push({ text, found: false });
          continue;
        }
        itemMetrics.push(await item.evaluate((node, expectedText) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          const parentRect = node.parentElement?.getBoundingClientRect();
          return {
            text: expectedText,
            found: true,
            tag: node.tagName,
            x: Math.round(rect.x * 10) / 10,
            y: Math.round((rect.y + window.scrollY) * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            parentWidth: parentRect ? Math.round(parentRect.width * 10) / 10 : null,
          };
        }, text));
      }
      report.push({ ...site, ok: true, found, metrics, itemMetrics, title: await page.title() });
    } catch (error) {
      report.push({ ...site, ok: false, error: String(error.message || error) });
    }
    await context.close();
  }

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
