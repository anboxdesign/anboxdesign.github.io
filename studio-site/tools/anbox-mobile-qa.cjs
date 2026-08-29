const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const phase = process.argv[2] || 'baseline';
const targetFile = process.argv[3] || 'ANBOX-Studio-mobile.html';
const outputDir = path.join(root, 'mobile-redesign-qa', phase);
const widths = [320, 390, 430];
const sections = [
  ['hero', '.hero'],
  ['approach', '#approach'],
  ['portfolio', '#work'],
  ['services', '#services'],
  ['packages', '#packages'],
  ['clients', '.clients'],
  ['studio', '#studio'],
  ['journal', '.journal'],
  ['contact', '#contact'],
];

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const report = {
    phase,
    targetFile,
    createdAt: new Date().toISOString(),
    widths: {},
    inventory: null,
    desktopParity: null,
  };

  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(root, targetFile)).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outputDir, `full-${width}.png`), fullPage: true });

    const metrics = await page.evaluate((sectionPairs) => {
      const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const sectionMetrics = {};
      for (const [name, selector] of sectionPairs) {
        const node = document.querySelector(selector);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        sectionMetrics[name] = {
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height),
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          textLength: compact(node.innerText).length,
        };
      }
      const overflowing = [...document.querySelectorAll('main *, footer *')]
        .filter((node) => !node.closest('.case-viewport'))
        .filter((node) => node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflowX === 'visible')
        .slice(0, 30)
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          className: compact(node.className),
          delta: node.scrollWidth - node.clientWidth,
          text: compact(node.textContent).slice(0, 100),
        }));
      const typography = [...document.querySelectorAll('main .section h2, main .section h3, main .section p, main .section small, main .section .button')]
        .slice(0, 120)
        .map((node) => {
          const style = getComputedStyle(node);
          return {
            tag: node.tagName.toLowerCase(),
            className: compact(node.className),
            text: compact(node.textContent).slice(0, 80),
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
          };
        });
      const touchTargets = [...document.querySelectorAll('a, button, summary, input:not([type="radio"]):not([type="checkbox"]), select, textarea, .choice, .consent')]
        .filter((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          if (node.matches('.consent a')) return false;
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            tag: node.tagName.toLowerCase(),
            className: compact(node.className),
            text: compact(node.textContent || node.getAttribute('aria-label')).slice(0, 70),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        });
      return {
        document: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          bodyScrollWidth: document.body.scrollWidth,
        },
        sections: sectionMetrics,
        overflowing,
        typography,
        touchTargets,
        hero: {
          html: document.querySelector('.hero')?.outerHTML || '',
          imageSrc: document.querySelector('.hero img')?.getAttribute('src') || '',
        },
      };
    }, sections);

    for (const [name, selector] of sections) {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        await locator.screenshot({ path: path.join(outputDir, `${name}-${width}.png`) });
      }
    }

    if (!report.inventory) {
      report.inventory = await page.evaluate((sectionPairs) => {
        const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const result = {};
        for (const [name, selector] of sectionPairs.filter(([key]) => key !== 'hero')) {
          const node = document.querySelector(selector);
          result[name] = {
            text: compact(node?.innerText),
            headings: [...(node?.querySelectorAll('h2, h3') || [])].map((item) => compact(item.textContent)),
            paragraphs: [...(node?.querySelectorAll('p') || [])].map((item) => compact(item.textContent)),
            listItems: [...(node?.querySelectorAll('li') || [])].map((item) => compact(item.textContent)),
            prices: [...(node?.querySelectorAll('.package-price strong') || [])].map((item) => compact(item.textContent)),
            names: [...(node?.querySelectorAll('.person-card h3') || [])].map((item) => compact(item.textContent)),
            links: [...(node?.querySelectorAll('a') || [])].map((item) => ({ text: compact(item.textContent), href: item.getAttribute('href') })),
          };
        }
        return result;
      }, sections);
    }

    report.widths[width] = metrics;
    await page.close();
  }

  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await desktopPage.goto(pathToFileURL(path.join(root, 'ANBOX-Studio-full-page.html')).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await desktopPage.waitForTimeout(1200);
  const desktopText = normalize(await desktopPage.locator('body').innerText());
  const mobileFragments = Object.values(report.inventory)
    .flatMap((section) => [...section.headings, ...section.paragraphs, ...section.listItems, ...section.prices, ...section.names])
    .map(normalize)
    .filter((text) => text.length >= 4);
  const uniqueFragments = [...new Set(mobileFragments)];
  const missing = uniqueFragments.filter((fragment) => !desktopText.includes(fragment));
  report.desktopParity = {
    comparedFragments: uniqueFragments.length,
    matchedFragments: uniqueFragments.length - missing.length,
    missingFragments: missing,
  };
  await desktopPage.close();

  fs.writeFileSync(path.join(outputDir, `${phase}-report.json`), JSON.stringify(report, null, 2));
  await browser.close();

  const compactResult = {
    phase,
    widths: Object.fromEntries(Object.entries(report.widths).map(([width, data]) => [width, {
      document: data.document,
      sectionHeights: Object.fromEntries(Object.entries(data.sections).map(([name, item]) => [name, item.height])),
      overflowingCount: data.overflowing.length,
      undersizedTouchTargets: data.touchTargets.filter((item) => item.width < 44 || item.height < 44).length,
    }])),
    desktopParity: report.desktopParity,
  };
  process.stdout.write(`${JSON.stringify(compactResult, null, 2)}\n`);
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
