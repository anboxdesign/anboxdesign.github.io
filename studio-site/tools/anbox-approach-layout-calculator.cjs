const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const pageUrl = pathToFileURL(path.join(root, 'ANBOX-Studio-mobile.html')).href;
const widths = [320, 390, 430];
const ratios = [0.38, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5];
const paddings = [10, 11, 12];
const titleSizes = [15, 15.5, 16];
const bodyLeadings = [1.42, 1.44, 1.46];

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const results = [];
  const testPages = [];

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.id = 'approach-candidate-style';
      document.head.append(style);
    });
    testPages.push({ width, context, page });
  }

  for (const ratio of ratios) {
    for (const padding of paddings) {
      for (const titleSize of titleSizes) {
        for (const bodyLeading of bodyLeadings) {
          const samples = [];

          for (const { width, page } of testPages) {
            await page.evaluate((css) => {
              document.querySelector('#approach-candidate-style').textContent = css;
            }, `
              .approach-page { grid-template-columns: minmax(0, ${ratio}fr) minmax(0, ${1 - ratio}fr) !important; }
              .principle { padding: ${padding}px !important; }
              .principle h3 { font-size: ${titleSize}px !important; line-height: 1.2 !important; }
              .principle p { font-size: 14px !important; line-height: ${bodyLeading} !important; }
            `);

            const metrics = await page.evaluate(() => {
              const lineCount = (node) => {
                const range = document.createRange();
                range.selectNodeContents(node);
                const tops = [...range.getClientRects()].map((rect) => Math.round(rect.top * 2) / 2);
                return new Set(tops).size;
              };

              return [...document.querySelectorAll('.approach-page')].map((pageNode) => {
                const cards = [...pageNode.querySelectorAll('.principle')].map((card) => {
                  const title = card.querySelector('h3');
                  const body = card.querySelector('p');
                  const cardStyle = getComputedStyle(card);
                  const titleStyle = getComputedStyle(title);
                  const bodyStyle = getComputedStyle(body);
                  const rect = card.getBoundingClientRect();
                  const titleLines = lineCount(title);
                  const bodyLines = lineCount(body);
                  const paddingY = parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.paddingBottom);
                  const paddingX = parseFloat(cardStyle.paddingLeft) + parseFloat(cardStyle.paddingRight);
                  const intrinsicHeight = paddingY
                    + titleLines * parseFloat(titleStyle.lineHeight)
                    + parseFloat(bodyStyle.marginTop)
                    + bodyLines * parseFloat(bodyStyle.lineHeight)
                    + 2;
                  return {
                    title: title.textContent.trim(),
                    width: rect.width,
                    innerWidth: rect.width - paddingX - 2,
                    titleLines,
                    bodyLines,
                    intrinsicHeight,
                    overflow: card.scrollWidth > card.clientWidth + 1,
                  };
                });
                return { cards, pairDelta: Math.abs(cards[0].intrinsicHeight - cards[1].intrinsicHeight) };
              });
            });
            samples.push({ width, pages: metrics });
          }

          const cards = samples.flatMap((sample) => sample.pages.flatMap((page) => page.cards));
          const pairDeltas = samples.flatMap((sample) => sample.pages.map((page) => page.pairDelta));
          const minInnerWidth = Math.min(...cards.map((card) => card.innerWidth));
          const maxIntrinsicHeight = Math.max(...cards.map((card) => card.intrinsicHeight));
          const maxTitleLines = Math.max(...cards.map((card) => card.titleLines));
          const maxBodyLines = Math.max(...cards.map((card) => card.bodyLines));
          const averagePairDelta = pairDeltas.reduce((sum, value) => sum + value, 0) / pairDeltas.length;
          const invalidPenalty = (minInnerWidth < 90 ? 1000 : 0)
            + (maxTitleLines > 4 ? (maxTitleLines - 4) * 160 : 0)
            + (maxBodyLines > 11 ? (maxBodyLines - 11) * 80 : 0)
            + (cards.some((card) => card.overflow) ? 1000 : 0);
          const score = maxIntrinsicHeight + averagePairDelta * 0.45 + invalidPenalty;

          results.push({
            ratio: `${Math.round(ratio * 100)}/${Math.round((1 - ratio) * 100)}`,
            padding,
            titleSize,
            bodyLeading,
            minInnerWidth: round(minInnerWidth),
            maxIntrinsicHeight: round(maxIntrinsicHeight),
            maxTitleLines,
            maxBodyLines,
            averagePairDelta: round(averagePairDelta),
            score: round(score),
            samples,
          });
        }
      }
    }
  }

  results.sort((a, b) => a.score - b.score);
  process.stdout.write(`${JSON.stringify(results.slice(0, 15).map(({ samples, ...result }) => result), null, 2)}\n`);
  const bestByRatio = [];
  const seenRatios = new Set();
  for (const result of results) {
    if (seenRatios.has(result.ratio)) continue;
    seenRatios.add(result.ratio);
    bestByRatio.push(result);
  }
  process.stdout.write('\nBEST RESULT BY RATIO\n');
  process.stdout.write(`${JSON.stringify(bestByRatio.map(({ samples, ...result }) => result), null, 2)}\n`);
  process.stdout.write('\nDETAILS FOR TOP RESULT\n');
  process.stdout.write(`${JSON.stringify(results[0], null, 2)}\n`);
  for (const { context } of testPages) await context.close();
  await browser.close();
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
