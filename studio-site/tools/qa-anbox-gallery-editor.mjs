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
const servicePath = path.join(outputDir, '03A-portfolio-system.html');
const galleryPath = path.join(outputDir, '03B-portfolio.html');
const qaDir = path.join(outputDir, 'QA', 'gallery-editor');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

fs.mkdirSync(qaDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const results = [];
const errors = [];

function attachErrors(page, label) {
  page.on('pageerror', (error) => errors.push(`${label}: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource/i.test(message.text())) {
      errors.push(`${label}: console: ${message.text()}`);
    }
  });
}

async function measureGallery(frame) {
  return frame.evaluate(() => {
    const mobile = matchMedia('(max-width:640px)').matches;
    const root = document.querySelector(mobile ? '.anbox-mobile-part--03' : '.anbox-desktop-part--03');
    const stage = root?.querySelector(mobile ? '.case-track' : '.anxg__stage');
    const cases = [...(root?.querySelectorAll(mobile ? '.case-slide' : '.anxg__case') || [])];
    const visibleCases = cases.filter((item) => getComputedStyle(item).display !== 'none');
    const first = cases[0];
    const image = first?.querySelector(mobile ? '.case-slide__image img' : '.anxg__cover--desktop');
    const caption = first?.querySelector(mobile ? '.case-slide__caption' : '.anxg__details');
    const gates = [...(root?.querySelectorAll('.portfolio-more-slot') || [])];
    const rootRect = root?.getBoundingClientRect();
    const stageStyle = stage ? getComputedStyle(stage) : null;
    return {
      editor: document.documentElement.classList.contains('anbox-gallery-editor'),
      editorDocument: document.documentElement.hasAttribute('data-anbox-gallery-editor-document'),
      mobile,
      rootHeight: rootRect ? Math.ceil(rootRect.height) : 0,
      rootWidth: rootRect ? Math.ceil(rootRect.width) : 0,
      editorHeightData: root?.dataset.anboxEditorHeight || '',
      allRootStates: [...document.querySelectorAll('.anbox-desktop-part--03,.anbox-mobile-part--03')].map((item) => ({ className: item.className, display: getComputedStyle(item).display, height: item.dataset.anboxEditorHeight || '' })),
      stagePosition: stageStyle?.position || '',
      stageHeight: stage ? Math.ceil(stage.getBoundingClientRect().height) : 0,
      visibleCases: visibleCases.length,
      firstVisible: !!first && getComputedStyle(first).display !== 'none' && getComputedStyle(first).visibility !== 'hidden',
      imageVisible: !!image && getComputedStyle(image).display !== 'none' && getComputedStyle(image).visibility !== 'hidden' && image.getBoundingClientRect().height > 0,
      captionVisible: !!caption && getComputedStyle(caption).display !== 'none' && getComputedStyle(caption).visibility !== 'hidden' && caption.getBoundingClientRect().height > 0,
      gatesVisible: gates.filter((item) => getComputedStyle(item).display !== 'none').length,
      blockerClasses: [...document.querySelectorAll('.anbox-part-00,.anbox-part-01,.anbox-part-02,.anbox-part-04,.anbox-part-05,.anbox-part-06,.anbox-part-07,.anbox-part-08,.anbox-part-09,.anbox-part-10')].map((item) => item.className),
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    };
  });
}

const previewUrl = pathToFileURL(previewPath).href;
for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
]) {
  const label = `assembled-${viewport.width}`;
  const page = await browser.newPage({ viewport });
  attachErrors(page, label);
  await page.goto(`${previewUrl}?v=gallery-editor-qa-${viewport.width}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.body.classList.add('t-body_edit'));
  await page.waitForTimeout(220);
  const result = await measureGallery(page);
  const continuity = await page.evaluate(() => {
    const gallery = document.querySelector('.anbox-part-03:not([style*="display: none"])') || document.querySelector('.anbox-part-03');
    const previous = document.querySelector('.anbox-part-02');
    const next = document.querySelector('.anbox-part-04');
    const galleryRect = gallery?.getBoundingClientRect();
    const previousRect = previous?.getBoundingClientRect();
    const nextRect = next?.getBoundingClientRect();
    return {
      documentHeightForced: document.documentElement.hasAttribute('data-anbox-gallery-editor-document'),
      previousGap: galleryRect && previousRect ? Math.round(galleryRect.top - previousRect.bottom) : null,
      nextGap: galleryRect && nextRect ? Math.round(nextRect.top - galleryRect.bottom) : null,
    };
  });
  results.push({ label, ...result, ...continuity });
  if (viewport.width === 390 || viewport.width === 1440 || viewport.width === 3840) {
    const locator = page.locator(viewport.width <= 640 ? '.anbox-mobile-part--03' : '.anbox-desktop-part--03');
    await locator.screenshot({ path: path.join(qaDir, `${label}.png`) });
  }
  await page.close();
}

const isolatedSource = `${fs.readFileSync(servicePath, 'utf8')}\n${fs.readFileSync(galleryPath, 'utf8')}`;
for (const frameWidth of [390, 1200]) {
  const label = `iframe-${frameWidth}`;
  const page = await browser.newPage({ viewport: { width: Math.max(430, frameWidth + 40), height: 1000 } });
  attachErrors(page, label);
  await page.setContent('<!doctype html><html><body class="t-body_edit" style="margin:0"><iframe id="gallery-frame" title="Gallery editor preview" style="display:block;width:100%;border:0"></iframe></body></html>');
  await page.locator('#gallery-frame').evaluate((frame, payload) => { frame.style.width = `${payload.width}px`; frame.srcdoc = payload.source; }, { width: frameWidth, source: isolatedSource });
  const frameHandle = page.locator('#gallery-frame');
  await frameHandle.elementHandle();
  await page.waitForTimeout(450);
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  if (!frame) throw new Error(`Missing gallery iframe at ${frameWidth}px`);
  const result = await measureGallery(frame);
  const frameSize = await frameHandle.evaluate((element) => ({
    height: Math.ceil(element.getBoundingClientRect().height),
    inlineHeight: element.style.getPropertyValue('height'),
    maxHeight: element.style.getPropertyValue('max-height'),
  }));
  results.push({ label, ...result, frameHeight: frameSize.height, inlineHeight: frameSize.inlineHeight, maxHeight: frameSize.maxHeight });
  await frameHandle.screenshot({ path: path.join(qaDir, `${label}.png`) });
  await page.close();
}

await browser.close();

const failures = [];
for (const result of results) {
  if (!result.editor) failures.push(`${result.label}: editor mode was not detected`);
  if (result.visibleCases !== 1) failures.push(`${result.label}: expected one visible case, got ${result.visibleCases}`);
  if (!result.firstVisible || !result.imageVisible || !result.captionVisible) failures.push(`${result.label}: representative case is incomplete`);
  if (result.gatesVisible !== 0) failures.push(`${result.label}: batch gates remain visible`);
  if (result.stagePosition === 'sticky' || result.stagePosition === 'fixed') failures.push(`${result.label}: gallery remains ${result.stagePosition}`);
  if (result.rootHeight <= 0 || result.rootHeight > 1100) failures.push(`${result.label}: non-compact root height ${result.rootHeight}px`);
  if (result.overflowX > 1) failures.push(`${result.label}: horizontal overflow ${result.overflowX}px`);
  if (result.label.startsWith('assembled-') && result.documentHeightForced) failures.push(`${result.label}: assembled document height was forced`);
  if (result.label.startsWith('assembled-') && (result.previousGap ?? 0) < -1) failures.push(`${result.label}: overlaps previous block by ${Math.abs(result.previousGap)}px`);
  if (result.label.startsWith('assembled-') && (result.nextGap ?? 0) < -1) failures.push(`${result.label}: overlaps next block by ${Math.abs(result.nextGap)}px`);
  if (result.label.startsWith('iframe-')) {
    if (!result.editorDocument) failures.push(`${result.label}: standalone document was not content-sized`);
    if (Math.abs(result.frameHeight - result.rootHeight) > 2) failures.push(`${result.label}: iframe ${result.frameHeight}px does not match root ${result.rootHeight}px`);
  }
}
failures.push(...errors);

const report = { status: failures.length ? 'FAIL' : 'PASS', failures, results, qaDir };
fs.writeFileSync(path.join(qaDir, 'results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
