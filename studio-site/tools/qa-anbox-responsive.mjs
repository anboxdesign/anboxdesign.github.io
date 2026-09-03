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
const mobileSourcePath = path.join(root, 'ANBOX-Studio-mobile.html');
const desktopSourcePath = path.join(root, 'ANBOX-Studio-desktop-final-20260826', 'ANBOX-Studio-desktop-preview.html');
const casesCatalogPath = path.join(root, 'anbox-cases-2026-08-27.json');
const qaDir = path.join(outputDir, 'QA');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

if (!fs.existsSync(previewPath) || !fs.existsSync(edgePath)) throw new Error('Preview or Edge executable is missing');
fs.mkdirSync(qaDir, { recursive: true });
const casesCatalog = JSON.parse(fs.readFileSync(casesCatalogPath, 'utf8'));
const expectedCaseOrder = casesCatalog.cases.map((project) => project.number);
const expectedCaseTitles = casesCatalog.cases.map((project) => project.title);
const expectedHeroOrder = casesCatalog.heroCases;
const expectedDesktopUrls = casesCatalog.cases.map((project) => project.desktop.src || project.desktop.url);
const expectedMobileUrls = casesCatalog.cases.map((project) => project.mobile.src || project.mobile.url);
const expectedHeroUrls = expectedHeroOrder.map((number) => {
  const project = casesCatalog.cases.find((item) => item.number === number);
  return project?.desktop.src || project?.desktop.url || '';
});
// The catalog now carries the complete case descriptions instead of placeholder copy.
// Keep the cleanup guard strict while allowing that intentional content payload.
// The branded contact success state is intentional product UI rather than
// legacy payload, so keep the cleanup guard strict without penalising it.
const minimumCleanupReduction = 23.2;
const expectedTeamCopy = [
  'Анна Плавская Преподаватель магистратуры НИУ ВШЭ 15+ лет в дизайне · 6+ лет в образовании Автор образовательных программ · спикер WorldFood и RosUpack',
  'Артём Капустин Директор по развитию 12+ лет в маркетинге и продажах Экс-«Фармстандарт», STADA, Astellas',
  'Дарья Дарев Маркетинг-партнёр, fouraces.agency Академический руководитель программы по бренд-стратегии НИУ ВШЭ',
];
const expectedTeamPortraitUrls = [
  'https://static.tildacdn.com/tild3637-3830-4331-b734-656566663032/20260831143212443_1.png',
  'https://static.tildacdn.com/tild3965-3132-4364-a166-316631666439/1dcce6ac-c6da-4efb-9.png',
  'https://static.tildacdn.com/tild6331-6261-4232-a131-303137383866/6a09138b-bc43-42e6-b.png',
];

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ reducedMotion: 'reduce' });
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error' && !/Failed to load resource/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`);
});

const previewUrl = pathToFileURL(previewPath).href;
const visualFiles = fs.readdirSync(outputDir)
  .filter((name) => /^\d{2}(?!A).*\.html$|^03B-.*\.html$/.test(name))
  .sort();
const serviceFile = '03A-portfolio-system.html';
const blockFiles = [...visualFiles, serviceFile];
const structure = [];

for (const name of [...visualFiles, serviceFile]) {
  const html = fs.readFileSync(path.join(outputDir, name), 'utf8');
  const result = await page.evaluate(({ html, name }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const roots = [...doc.body.children].filter((node) => !['STYLE', 'SCRIPT', 'TEMPLATE', 'NOSCRIPT'].includes(node.tagName));
    const ids = [...doc.querySelectorAll('[id]')].map((node) => node.id);
    return {
      name,
      visualRoots: roots.length,
      desktopRoots: roots.filter((node) => node.classList.contains('anbox-desktop-part')).length,
      mobileRoots: roots.filter((node) => node.classList.contains('anbox-mobile-part')).length,
      duplicateIds: [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))],
    };
  }, { html, name });
  structure.push(result);
}

const blockSources = blockFiles.map((name) => fs.readFileSync(path.join(outputDir, name), 'utf8'));
const previewSource = fs.readFileSync(previewPath, 'utf8');
const headingText = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const heroBlockSource = fs.readFileSync(path.join(outputDir, '01-hero.html'), 'utf8');
const mobileH1Match = heroBlockSource.match(/<h1\b(?=[^>]*\bclass=["'][^"']*\bhero__title\b[^"']*["'])[^>]*>([\s\S]*?)<\/h1>/i);
const desktopLevelOneMatch = heroBlockSource.match(/<div\b(?=[^>]*\bclass=["'][^"']*\babh-hero__title\b[^"']*["'])(?=[^>]*\brole=["']heading["'])(?=[^>]*\baria-level=["']1["'])[^>]*>([\s\S]*?)<\/div>/i);
const headingAudit = {
  h1ByFile: Object.fromEntries(blockFiles.map((name, index) => [name, (blockSources[index].match(/<h1\b/gi) || []).length])),
  previewH1Count: (previewSource.match(/<h1\b/gi) || []).length,
  desktopTitle: headingText(desktopLevelOneMatch?.[1]),
  mobileTitle: headingText(mobileH1Match?.[1]),
  desktopLevelOneRoleCount: (heroBlockSource.match(/\brole=["']heading["'][^>]*\baria-level=["']1["']/gi) || []).length,
};
const styleSources = blockSources.flatMap((html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]));
const legacyColorPattern = /#(?:f5f3ef|f7f5f1|202024|171717|161616|9b7cff|9f8bd8|8b67ff|b29cff|826cff|8f71e6|7462bd|856bc0|6e55c0|7157d8|8d74d2|e6ef2f|bec72f|9aa314)\b/gi;
const legacyColors = [...new Set(styleSources.flatMap((css) => css.match(legacyColorPattern) || []).map((color) => color.toLowerCase()))];
const desktopSourceFiles = ['00-header.html', '01-hero.html', '02-approach.html', '03A-portfolio-styles.html', '03B-portfolio-screen.html', '04-services.html', '05-packages.html', '06-clients.html', '07-team-training.html', '08-blog.html', '09-contacts.html', '10-footer.html'];
const sourceBytes = fs.statSync(mobileSourcePath).size + desktopSourceFiles.reduce((sum, name) => sum + fs.statSync(path.join(root, 'ANBOX-Studio-desktop-final-20260826', name)).size, 0);
// Embedded client and brand artwork are asset payloads, not executable/style code.
// Exclude their vector bodies so the cleanup metric remains comparable with source
// HTML that referenced the same SVG files externally.
const blockBytes = blockSources.reduce((sum, html) => {
  const codeOnly = html
    .replace(/<svg\b[^>]*\bdata-anxl-inline-sprite\b[^>]*>[\s\S]*?<\/svg>/gi, '<svg data-anxl-inline-sprite></svg>')
    .replace(/<svg\b[^>]*\bclass=["'][^"']*\banxl__logo-art\b[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi, '<img data-anxl-inline-logo>')
    .replace(/<svg\b[^>]*\bclass=["'][^"']*\bfooter-brand__logo\b[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi, '<svg data-abm-inline-brand></svg>')
    .replace(/(<a\b[^>]*\bclass=["'][^"']*\babct__footer-logo\b[^"']*["'][^>]*>)[\s\S]*?<\/svg>/gi, '$1<svg data-abct-inline-brand></svg>')
    .replace(/<style\b[^>]*\bdata-anbox-reveal-core\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*\bdata-anbox-reveal-core\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\bdata-anbox-reveal-init\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return sum + Buffer.byteLength(codeOnly);
}, 0);
const cleanupAudit = {
  sourceBytes,
  blockBytes,
  reductionPercent: Number(((1 - blockBytes / sourceBytes) * 100).toFixed(1)),
  styleTagsByFile: Object.fromEntries(blockFiles.map((name, index) => [name, (blockSources[index].match(/<style\b/gi) || []).length])),
  importCount: styleSources.reduce((sum, css) => sum + (css.match(/@import\b/gi) || []).length, 0),
  scrollReplayRuntimeCount: blockSources.reduce((sum, html) => sum + (html.match(/data-anbox-scroll-replay/gi) || []).length, 0),
  legacyColors,
};
const headerBlockSource = fs.readFileSync(path.join(outputDir, '00-header.html'), 'utf8');
const blogBlockSource = fs.readFileSync(path.join(outputDir, '08-blog.html'), 'utf8');
const navigationAudit = {
  legacyApproachLabels: (headerBlockSource.match(/>\s*Подход(?:\s|<)/g) || []).length,
  desktopBlogTarget: /<nav class="abh__nav"[^>]*>[\s\S]*?<a href="#ablog">Блог<\/a>/.test(headerBlockSource),
  desktopDesignersFirst: /<nav class="abh__nav"[^>]*>\s*<a href="https:\/\/anboxdesign\.ru\/study">Дизайнерам<\/a>/.test(headerBlockSource),
  mobileBlogTargets: (headerBlockSource.match(/href="#abm-journal">Блог/g) || []).length,
  mobileBlogAnchor: /class="section journal" id="abm-journal"/.test(blogBlockSource),
  mobileDesignersFirst: /<nav class="no-js-nav"[^>]*>\s*<a href="https:\/\/anboxdesign\.ru\/study">Дизайнерам<\/a>/.test(headerBlockSource) && /<nav class="menu-links"[^>]*>\s*<a href="https:\/\/anboxdesign\.ru\/study">Дизайнерам <span>01<\/span><\/a>/.test(headerBlockSource),
};
const revealStructureAudit = {
  coreStyleCount: (headerBlockSource.match(/<style\b[^>]*\bdata-anbox-reveal-core\b/gi) || []).length,
  coreRuntimeCount: (headerBlockSource.match(/<script\b[^>]*\bdata-anbox-reveal-core\b/gi) || []).length,
  initByFile: Object.fromEntries(visualFiles.map((name) => {
    const html = fs.readFileSync(path.join(outputDir, name), 'utf8');
    return [name, (html.match(/<script\b[^>]*\bdata-anbox-reveal-init\b/gi) || []).length];
  })),
  serviceInitCount: (fs.readFileSync(path.join(outputDir, serviceFile), 'utf8').match(/data-anbox-reveal-init/gi) || []).length,
};

const scriptSyntaxErrors = [];
for (const name of visualFiles) {
  const html = fs.readFileSync(path.join(outputDir, name), 'utf8');
  let index = 0;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    index += 1;
    try {
      new Function(match[1]);
    } catch (error) {
      scriptSyntaxErrors.push(`${name} script ${index}: ${error.message}`);
    }
  }
}

async function loadAt(filePath, width, height = 1000) {
  await page.setViewportSize({ width, height });
  await page.goto(pathToFileURL(filePath).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(700);
}

const widths = [320, 360, 375, 390, 412, 640, 641, 768, 1024, 1440, 1920, 3840];
const viewportResults = [];
for (const width of widths) {
  await loadAt(previewPath, width, width >= 1440 ? 1200 : 1000);
  const result = await page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    };
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    const missingImageMetadata = [...document.images].filter((image) => !image.getAttribute('src') || image.getAttribute('alt') === null || !image.getAttribute('width') || !image.getAttribute('height')).length;
    const video = document.querySelector('.anbox-mobile-part--01 video');
    const heroShell = document.querySelector('.abh-hero__shell,.abh-hero__stage,.abh-hero');
    const mobileViewport = innerWidth <= 640;
    const footer = document.querySelector(mobileViewport ? '.anbox-mobile-part--10 .site-footer' : '.anbox-desktop-part--10 .abct__site-footer');
    const footerRect = footer?.getBoundingClientRect();
    const footerLogo = footer?.querySelector(mobileViewport ? '.footer-brand__logo' : '.abct__footer-logo svg');
    const footerLogoRect = footerLogo?.getBoundingClientRect();
    const footerSocialTargets = footer ? [...footer.querySelectorAll('a[aria-label="Telegram"],a[aria-label="Instagram"],a[aria-label="Behance"]')].map((link) => {
      const rect = link.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }) : [];
    const roundedRect = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Number(rect.left.toFixed(2)),
        top: Number(rect.top.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        bottom: Number(rect.bottom.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    };
    const roundedTextRect = (node) => {
      const textNode = node ? [...node.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim()) : null;
      if (!textNode) return null;
      const range = document.createRange();
      range.selectNode(textNode);
      const rect = range.getBoundingClientRect();
      return {
        top: Number(rect.top.toFixed(2)),
        bottom: Number(rect.bottom.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    };
    const desktopHeader = document.querySelector('.anbox-desktop-part--00 .abh__desktop');
    const desktopNav = desktopHeader?.querySelector('.abh__nav');
    const desktopNavLinks = desktopNav ? [...desktopNav.querySelectorAll('a')] : [];
    const desktopLogo = desktopHeader?.querySelector('.abh__logo');
    const desktopCta = desktopHeader?.querySelector('.abh__cta');
    const desktopCtaArrow = desktopCta?.querySelector('span');
    const desktopHeaderItemRects = [desktopLogo, ...desktopNavLinks, desktopCta].map(roundedRect);
    const desktopHeaderGaps = desktopHeaderItemRects.slice(1).map((rect, index) => Number((rect.left - desktopHeaderItemRects[index].right).toFixed(2)));
    const contactTextarea = document.querySelector('.anbox-desktop-part--09 #abct-contacts .abct__textarea');
    const contactSubmit = document.querySelector('.anbox-desktop-part--09 #abct-contacts .abct__submit-row .abct__submit');
    const contactDirect = document.querySelector('.anbox-desktop-part--09 #abct-contacts .abct__submit-row .abct__direct-note');
    const contactSubmitArrow = contactSubmit?.querySelector('.abct__action-arrow');
    const approachLogo = document.querySelector('.anbox-desktop-part--02 #abx-approach-v8 .abxa8__card:nth-child(2) .abxa8__seal');
    const portfolioCaseLinks = [...document.querySelectorAll('.anbox-desktop-part--03 #anxg-gallery .anxg__case-link')];
    const portfolioNextProject = document.querySelector('.anbox-desktop-part--03 #anxg-gallery .anxg__next-project');
    const mobilePortfolioCard = document.querySelector('.anbox-mobile-part--03 .case-slide');
    const mobilePortfolioViewport = document.querySelector('.anbox-mobile-part--03 .case-viewport');
    const mobilePortfolioImage = document.querySelector('.anbox-mobile-part--03 .case-slide__image');
    return {
      width: innerWidth,
      visibleDesktop: [...document.querySelectorAll('.anbox-desktop-part')].filter(visible).length,
      visibleMobile: [...document.querySelectorAll('.anbox-mobile-part')].filter(visible).length,
      pageOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      duplicateIds: [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))],
      missingImageMetadata,
      heroShellWidth: heroShell ? Math.round(heroShell.getBoundingClientRect().width) : null,
      footer: footer && footerRect ? {
        display: getComputedStyle(footer).display,
        left: Math.round(footerRect.left),
        width: Math.round(footerRect.width),
        height: Math.round(footerRect.height),
        socialTargets: footerSocialTargets,
        logo: footerLogo && footerLogoRect ? {
          tag: footerLogo.tagName.toLowerCase(),
          width: Math.round(footerLogoRect.width),
          height: Math.round(footerLogoRect.height),
          pathCount: footerLogo.querySelectorAll('path').length,
          visible: footerLogoRect.width > 0 && footerLogoRect.height > 0 && getComputedStyle(footerLogo).visibility !== 'hidden',
        } : null,
      } : null,
      headerNav: !mobileViewport && desktopHeader && desktopNav ? {
        header: roundedRect(desktopHeader),
        nav: roundedRect(desktopNav),
        links: desktopNavLinks.map(roundedRect),
        linkText: desktopNavLinks.map(roundedTextRect),
        navVisible: getComputedStyle(desktopNav).display !== 'none',
        logo: roundedRect(desktopLogo),
        logoMark: roundedRect(desktopLogo?.querySelector('svg')),
        cta: roundedRect(desktopCta),
        ctaText: roundedTextRect(desktopCta),
        logoVisible: getComputedStyle(desktopLogo).display !== 'none',
        ctaVisible: getComputedStyle(desktopCta).display !== 'none',
        ctaArrowHidden: getComputedStyle(desktopCtaArrow).display === 'none',
        ctaUnderline: Number.parseFloat(getComputedStyle(desktopCta).borderBottomWidth),
        navType: desktopNavLinks.length ? `${getComputedStyle(desktopNavLinks[0]).fontSize}/${getComputedStyle(desktopNavLinks[0]).fontWeight}/${getComputedStyle(desktopNavLinks[0]).lineHeight}` : '',
        ctaType: `${getComputedStyle(desktopCta).fontSize}/${getComputedStyle(desktopCta).fontWeight}/${getComputedStyle(desktopCta).lineHeight}`,
        itemGaps: desktopHeaderGaps,
        menuVisible: getComputedStyle(desktopHeader.querySelector('.abh__tablet-button')).display !== 'none',
      } : null,
      contactCtas: !mobileViewport && contactTextarea && contactSubmit && contactDirect ? {
        textarea: roundedRect(contactTextarea),
        submit: roundedRect(contactSubmit),
        direct: roundedRect(contactDirect),
        submitArrowColor: contactSubmitArrow ? getComputedStyle(contactSubmitArrow).color : '',
        submitArrowBackground: contactSubmitArrow ? getComputedStyle(contactSubmit).backgroundColor : '',
      } : null,
      approachLogo: !mobileViewport && approachLogo ? {
        embedded: approachLogo.currentSrc.startsWith('data:image/png;base64,'),
        naturalWidth: approachLogo.naturalWidth,
        naturalHeight: approachLogo.naturalHeight,
        filter: getComputedStyle(approachLogo).filter,
      } : null,
      portfolioActions: !mobileViewport && portfolioNextProject ? {
        caseLinkCount: portfolioCaseLinks.length,
        nextProject: roundedRect(portfolioNextProject),
        nextProjectVisible: getComputedStyle(portfolioNextProject).display !== 'none' && portfolioNextProject.getBoundingClientRect().width > 0,
      } : null,
      mobilePortfolioRadii: mobileViewport && mobilePortfolioCard && mobilePortfolioViewport && mobilePortfolioImage
        ? [mobilePortfolioCard, mobilePortfolioViewport, mobilePortfolioImage].flatMap((node) => {
          const style = getComputedStyle(node);
          return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(Number.parseFloat);
        })
        : null,
      tokens: {
        paper: getComputedStyle(document.documentElement).getPropertyValue('--abx-paper').trim(),
        ink: getComputedStyle(document.documentElement).getPropertyValue('--abx-ink').trim(),
        purple: getComputedStyle(document.documentElement).getPropertyValue('--abx-purple').trim(),
        purpleStrong: getComputedStyle(document.documentElement).getPropertyValue('--abx-purple-strong').trim(),
        lime: getComputedStyle(document.documentElement).getPropertyValue('--abx-lime').trim(),
      },
      video: video ? {
        autoplay: video.autoplay,
        muted: video.muted,
        loop: video.loop,
        playsInline: video.playsInline,
        preload: video.preload,
      } : null,
    };
  });
  viewportResults.push(result);
  if ([390, 1440, 3840].includes(width)) {
    await page.screenshot({ path: path.join(qaDir, `preview-${width}.png`), fullPage: false });
  }
  if ([390, 641, 1440, 3840].includes(width)) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(qaDir, `footer-${width}.png`), fullPage: false });
  }
}

async function verifyHeaderScroll(width, height, selector) {
  await loadAt(previewPath, width, height);
  const top = await page.locator(selector).evaluate((node) => ({
    hidden: node.classList.contains('is-hidden'),
    top: Number(node.getBoundingClientRect().top.toFixed(2)),
  }));
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(350);
  const down = await page.locator(selector).evaluate((node) => ({
    hidden: node.classList.contains('is-hidden'),
    bottom: Number(node.getBoundingClientRect().bottom.toFixed(2)),
  }));
  await page.evaluate(() => window.scrollBy(0, -220));
  await page.waitForTimeout(350);
  const up = await page.locator(selector).evaluate((node) => ({
    hidden: node.classList.contains('is-hidden'),
    top: Number(node.getBoundingClientRect().top.toFixed(2)),
  }));
  return { width, top, down, up };
}

const headerScrollBehavior = [
  await verifyHeaderScroll(390, 844, '.anbox-mobile-part--00 .site-header'),
  await verifyHeaderScroll(1440, 1000, '.anbox-desktop-part--00'),
];

const heroLayoutCases = [
  { width: 320, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];
const heroLayouts = [];
for (const viewport of heroLayoutCases) {
  await loadAt(previewPath, viewport.width, viewport.height);
  const layout = await page.evaluate(() => {
    const hero = document.querySelector('.anbox-mobile-part--01 .hero');
    const content = hero?.querySelector('.hero__content');
    const title = hero?.querySelector('.hero__title');
    const rule = hero?.querySelector('.hero__rule');
    const intro = hero?.querySelector('.hero__intro');
    const actions = hero ? [...hero.querySelectorAll('.hero__action')] : [];
    const rect = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height } : null;
    };
    return {
      width: innerWidth,
      height: innerHeight,
      hero: rect(hero),
      content: rect(content),
      title: rect(title),
      rule: rect(rule),
      intro: rect(intro),
      actionRects: actions.map(rect),
      titleText: title?.textContent.replace(/\s+/g, ' ').trim() || '',
      introText: intro?.textContent.replace(/\s+/g, ' ').trim() || '',
      actionTexts: actions.map((action) => action.textContent.replace(/\s+/g, ' ').trim()),
      actionTargets: actions.map((action) => action.getAttribute('href')),
    };
  });
  heroLayouts.push(layout);
  if (viewport.width === 390) await page.screenshot({ path: path.join(qaDir, 'hero-content-390x844.png'), fullPage: false });
}

await loadAt(previewPath, 390, 1000);
const mobileInteraction = {};
let mobileHeroShelfAudit = null;
const menuButton = page.locator('.anbox-mobile-part--00 .menu-button');
if (await menuButton.count()) {
  await menuButton.click();
  mobileInteraction.menuOpened = await menuButton.getAttribute('aria-expanded') === 'true';
  const close = page.locator('.anbox-mobile-part--00 .menu-close,.anbox-mobile-part--00 [data-menu-close]').first();
  if (await close.count()) await close.click();
}
const mobileHeroShelf = page.locator('.anbox-mobile-part--01 .shelf-marquee').first();
if (await mobileHeroShelf.count()) {
  await mobileHeroShelf.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.anbox-mobile-part--01 .shelf-marquee__sequence:first-child .shelf-marquee__logo')];
    return images.length === 8 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, null, { timeout: 10000 }).catch(() => {});
  mobileHeroShelfAudit = await page.evaluate(() => {
    const images = [...document.querySelectorAll('.anbox-mobile-part--01 .shelf-marquee__sequence:first-child .shelf-marquee__logo')];
    return { total: images.length, loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length };
  });
  await mobileHeroShelf.screenshot({ path: path.join(qaDir, 'hero-shelf-mobile-390.png') });
}
const approachNext = page.locator('.anbox-mobile-part--02 [data-approach-next]').first();
if (await approachNext.count()) {
  const before = await page.locator('.anbox-mobile-part--02 [data-approach-current]').textContent();
  await approachNext.click();
  await page.waitForTimeout(250);
  const after = await page.locator('.anbox-mobile-part--02 [data-approach-current]').textContent();
  mobileInteraction.approachAdvanced = before !== after;
}
const mobilePortfolioFirst = page.locator('.anbox-mobile-part--03 .case-slide:not([hidden])').first();
let mobilePortfolioAppearance = null;
if (await mobilePortfolioFirst.count()) {
  await mobilePortfolioFirst.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  mobilePortfolioAppearance = await page.evaluate(() => {
    const portfolio = document.querySelector('.anbox-mobile-part--03 .portfolio');
    const dock = portfolio?.querySelector('[data-portfolio-dock]');
    const dockTitle = portfolio?.querySelector('[data-portfolio-dock-title]');
    const titleAccent = dockTitle ? getComputedStyle(dockTitle, '::after') : null;
    const moreButton = portfolio?.querySelector('[data-portfolio-more]');
    const captions = portfolio ? [...portfolio.querySelectorAll('.case-slide:not([hidden]) .case-slide__caption')] : [];
    return {
      dockVisible: Boolean(dock && !dock.hidden && getComputedStyle(dock).display !== 'none'),
      dockedState: Boolean(portfolio?.classList.contains('is-caption-docked')),
      titleAccentVisible: Boolean(titleAccent
        && titleAccent.content !== 'none'
        && Number.parseFloat(titleAccent.width) >= 40
        && Number.parseFloat(titleAccent.height) >= 2
        && titleAccent.backgroundColor === 'rgb(173, 149, 238)'),
      moreButtonPurpleBorder: Boolean(moreButton
        && getComputedStyle(moreButton).borderColor === 'rgb(173, 149, 238)'),
      visibleInlineCaptions: captions.filter((caption) => {
        const style = getComputedStyle(caption);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).length,
      caseLinkCount: portfolio?.querySelectorAll('.case-slide__link,[data-portfolio-dock-link]').length || 0,
    };
  });
  await page.screenshot({ path: path.join(qaDir, 'portfolio-mobile-390.png'), fullPage: false });
}
const serviceTabs = page.locator('.anbox-mobile-part--04 .service-tab');
if (await serviceTabs.count() > 1) {
  await serviceTabs.nth(1).click();
  mobileInteraction.serviceTabSelected = await serviceTabs.nth(1).getAttribute('aria-selected') === 'true';
}
const packageTabs = page.locator('.anbox-mobile-part--05 .package-tab');
if (await packageTabs.count() > 1) {
  await packageTabs.nth(1).click();
  mobileInteraction.packageTabSelected = await packageTabs.nth(1).getAttribute('aria-selected') === 'true';
}
const portfolioRevealFlow = [];
for (const batch of [2, 3, 4]) {
  const revealButton = page.locator(`.anbox-mobile-part--03 [data-portfolio-reveal="${batch}"]`);
  if (!(await revealButton.count()) || !(await revealButton.isVisible())) {
    portfolioRevealFlow.push({ batch, ok: false, reason: 'button-not-visible' });
    continue;
  }

  let gatePinStable = true;
  if (batch === 2) {
    const gateStart = await page.evaluate(() => {
      const slot = document.querySelector('.anbox-mobile-part--03 [data-portfolio-gate="2"]');
      return slot.getBoundingClientRect().top + window.scrollY - 68;
    });
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), gateStart);
    await page.waitForTimeout(100);
    const gateTopBefore = await revealButton.evaluate((node) => node.getBoundingClientRect().top);
    await page.evaluate(() => window.scrollBy({ top: (window.innerHeight - 68) * .75, behavior: 'auto' }));
    await page.waitForTimeout(100);
    const gateTopAfter = await revealButton.evaluate((node) => node.getBoundingClientRect().top);
    gatePinStable = Math.abs(gateTopAfter - gateTopBefore) <= 2;
  }

  const hiddenBefore = await page.locator('.anbox-mobile-part--03 [data-portfolio-batch][hidden]').count();
  await revealButton.click();
  await page.waitForTimeout(900);
  const hiddenAfter = await page.locator('.anbox-mobile-part--03 [data-portfolio-batch][hidden]').count();
  const edgePair = ({ 2: ['06', '07'], 3: ['10', '11'], 4: ['15', '16'] })[batch];
  const state = await page.evaluate(({ currentBatch, edgePair }) => {
    const root = document.querySelector('.anbox-mobile-part--03');
    const visibleSlides = [...root.querySelectorAll('.case-slide:not([hidden])')];
    const firstNewSlide = root.querySelector(`[data-portfolio-batch="${currentBatch}"]`);
    const firstRect = firstNewSlide?.getBoundingClientRect();
    const captionsKeepLayout = visibleSlides.every((slide) => getComputedStyle(slide.querySelector('.case-slide__caption')).display !== 'none');
    const nextButton = root.querySelector(`[data-portfolio-reveal="${currentBatch + 1}"]`);
    const firstTitle = firstNewSlide?.querySelector('h3')?.textContent.trim() || '';
    const dockTitle = root.querySelector('[data-portfolio-dock-title]')?.textContent.trim() || '';
    const topCase = document.elementFromPoint(window.innerWidth / 2, 160)?.closest('.case-slide')?.dataset.anboxCase || '';
    const edgePairStable = edgePair.every((number) => {
      const slide = root.querySelector(`.case-slide[data-anbox-case="${number}"]`);
      if (!slide || slide.hidden || slide.hasAttribute('data-anbox-reveal-ready')) return false;
      const style = getComputedStyle(slide);
      const rect = slide.getBoundingClientRect();
      return style.display !== 'none'
        && Number.parseFloat(style.opacity) > .99
        && Math.abs(rect.width - window.innerWidth) <= 1;
    });
    const stackedAtTop = visibleSlides.filter((slide) => Math.abs(slide.getBoundingClientRect().top - 68) <= 2);
    const paintedStackedAtTop = stackedAtTop.filter((slide) => getComputedStyle(slide).visibility !== 'hidden');
    const pastSlides = visibleSlides.filter((slide) => slide.classList.contains('is-past'));
    const stackPaintStable = paintedStackedAtTop.length === 1
      && paintedStackedAtTop[0] === firstNewSlide
      && !firstNewSlide.classList.contains('is-past')
      && pastSlides.length === (currentBatch - 1) * 5;
    const trackRect = root.querySelector('.case-track')?.getBoundingClientRect();
    const flowStable = Boolean(trackRect) && visibleSlides.every((slide) => {
      const slideRect = slide.getBoundingClientRect();
      const imageRect = slide.querySelector('.case-slide__image')?.getBoundingClientRect();
      const style = getComputedStyle(slide);
      return Math.abs(slideRect.left - trackRect.left) <= 1
        && Math.abs(slideRect.width - trackRect.width) <= 1
        && imageRect
        && Math.abs(imageRect.left - slideRect.left) <= 1
        && Math.abs(imageRect.width - slideRect.width) <= 1
        && style.position === 'sticky'
        && ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(style.transform)
        && ['none', '0px'].includes(style.translate);
    });
    return {
      visibleSlides: visibleSlides.length,
      firstTop: firstRect ? Math.round(firstRect.top) : null,
      captionsKeepLayout,
      nextButtonVisible: Boolean(nextButton && !nextButton.closest('[data-portfolio-more-slot]').hidden),
      firstCase: firstNewSlide?.dataset.anboxCase || '',
      topCase,
      dockMatchesFirst: dockTitle === firstTitle,
      edgePair,
      edgePairStable,
      stackedAtTop: stackedAtTop.length,
      paintedStackedAtTop: paintedStackedAtTop.length,
      pastSlides: pastSlides.length,
      stackPaintStable,
      flowStable,
    };
  }, { currentBatch: batch, edgePair });
  const revealedCount = hiddenBefore - hiddenAfter;
  if (batch === 3) await page.screenshot({ path: path.join(qaDir, 'portfolio-reveal-second-mobile-390.png'), fullPage: false });
  const expectedNextButton = batch < 4;
  const ok = revealedCount === 5
    && state.visibleSlides === batch * 5
    && state.firstTop >= 60
    && state.firstTop <= 80
    && state.captionsKeepLayout
    && state.topCase === state.firstCase
    && state.dockMatchesFirst
    && state.edgePairStable
    && state.stackPaintStable
    && state.flowStable
    && gatePinStable
    && state.nextButtonVisible === expectedNextButton;
  portfolioRevealFlow.push({ batch, revealedCount, gatePinStable, ...state, ok });
}
mobileInteraction.portfolioRevealed = portfolioRevealFlow.every((step) => step.ok);
let portfolioReverseFlow = null;
if (mobileInteraction.portfolioRevealed) {
  await page.evaluate(() => {
    const root = document.querySelector('.anbox-mobile-part--03');
    const track = root.querySelector('.case-track');
    const target = root.querySelector('.case-slide[data-anbox-case="10"]');
    let flowTop = track.getBoundingClientRect().top + window.scrollY;
    for (const child of track.children) {
      if (child === target) break;
      if (child.hidden) continue;
      const style = getComputedStyle(child);
      flowTop += child.offsetHeight
        + (Number.parseFloat(style.marginTop) || 0)
        + (Number.parseFloat(style.marginBottom) || 0);
    }
    window.scrollTo({ top: Math.max(0, flowTop - 68), behavior: 'auto' });
  });
  await page.waitForTimeout(200);
  portfolioReverseFlow = await page.evaluate(() => {
    const root = document.querySelector('.anbox-mobile-part--03');
    const visibleSlides = [...root.querySelectorAll('.case-slide:not([hidden])')];
    const target = root.querySelector('.case-slide[data-anbox-case="10"]');
    const paintedStacked = visibleSlides.filter((slide) => {
      const style = getComputedStyle(slide);
      return style.visibility !== 'hidden' && Math.abs(slide.getBoundingClientRect().top - 68) <= 2;
    });
    return {
      targetVisible: Boolean(target && !target.classList.contains('is-past') && getComputedStyle(target).visibility !== 'hidden'),
      topCase: document.elementFromPoint(window.innerWidth / 2, 160)?.closest('.case-slide')?.dataset.anboxCase || '',
      paintedStacked: paintedStacked.length,
      pastSlides: visibleSlides.filter((slide) => slide.classList.contains('is-past')).length,
    };
  });
}
mobileInteraction.portfolioReverseStable = Boolean(portfolioReverseFlow
  && portfolioReverseFlow.targetVisible
  && portfolioReverseFlow.topCase === '10'
  && portfolioReverseFlow.paintedStacked === 1
  && portfolioReverseFlow.pastSlides === 9);
const mobileForm = page.locator('.anbox-mobile-part--09 #abm-project-form');
if (await mobileForm.count()) {
  await mobileForm.locator('[name="name"]').fill('QA');
  await mobileForm.locator('[name="email"]').fill('qa@example.com');
  await mobileForm.locator('[name="phone"]').fill('+7 999 000-00-00');
  await mobileForm.locator('[name="message"]').fill('Проверка состояния формы');
  await mobileForm.locator('.consent input[type="checkbox"]').check();
  await mobileForm.locator('[type="submit"]').click();
  await page.waitForTimeout(100);
  mobileInteraction.formSuccess = await page.locator('.anbox-mobile-part--09 #abm-form-success').isVisible();
}

await page.emulateMedia({ reducedMotion: 'no-preference' });
await loadAt(previewPath, 390, 844);
await page.waitForTimeout(3200);
const heroVideoBefore = await page.evaluate(() => {
  const hero = document.querySelector('.anbox-mobile-part--01 .hero');
  const video = hero?.querySelector('video');
  return video ? { currentTime: video.currentTime, paused: video.paused, loop: video.loop, opacity: getComputedStyle(video).opacity, introState: hero.dataset.introState } : null;
});
await page.waitForTimeout(700);
const heroVideoAfter = await page.evaluate(() => {
  const video = document.querySelector('.anbox-mobile-part--01 .hero video');
  return video ? { currentTime: video.currentTime, paused: video.paused } : null;
});
await page.screenshot({ path: path.join(qaDir, 'hero-loop-after-intro-390.png'), fullPage: false });
const marqueeReady = await page.evaluate(() => {
  const marquee = document.querySelector('.anbox-mobile-part--01 [data-shelf-marquee]');
  if (!marquee) return false;
  window.scrollTo(0, marquee.offsetTop - (innerHeight - marquee.offsetHeight));
  return true;
});
await page.waitForTimeout(180);
const marqueeAtFullReveal = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector('.anbox-mobile-part--01 [data-shelf-marquee-track]')).getPropertyValue('--shelf-marquee-x')) || 0);
await page.evaluate(() => window.scrollBy(0, 140));
await page.waitForTimeout(180);
const marqueeAfterHold = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector('.anbox-mobile-part--01 [data-shelf-marquee-track]')).getPropertyValue('--shelf-marquee-x')) || 0);
const heroMediaBehavior = {
  videoKeepsPlaying: Boolean(heroVideoBefore && heroVideoAfter && heroVideoBefore.introState === 'ready' && heroVideoBefore.loop && !heroVideoBefore.paused && !heroVideoAfter.paused && heroVideoAfter.currentTime > heroVideoBefore.currentTime + .2 && heroVideoBefore.opacity === '1'),
  marqueeStartsAtBeginning: marqueeReady && Math.abs(marqueeAtFullReveal) <= 1,
  marqueeMovesAfterHold: marqueeAfterHold < -1,
  samples: { heroVideoBefore, heroVideoAfter, marqueeAtFullReveal, marqueeAfterHold },
};
await page.emulateMedia({ reducedMotion: 'reduce' });

await loadAt(previewPath, 1440, 1100);
const desktopInteraction = {};
const approachLogoCard = page.locator('.anbox-desktop-part--02 #abx-approach-v8 .abxa8__card:nth-child(2)');
if (await approachLogoCard.count()) {
  await approachLogoCard.scrollIntoViewIfNeeded();
  await approachLogoCard.screenshot({ path: path.join(qaDir, 'approach-logo-1440.png') });
}
const heroDots = page.locator('.anbox-desktop-part--01 [data-dot]');
if (await heroDots.count() > 1) {
  await heroDots.nth(1).click();
  desktopInteraction.heroDotSelected = await heroDots.nth(1).getAttribute('aria-selected') === 'true';
}
const desktopPortfolio = page.locator('.anbox-desktop-part--03 #anxg-gallery');
const desktopNext = page.locator('.anbox-desktop-part--03 [data-anxg-next]:visible').first();
if (await desktopPortfolio.count() && await desktopNext.count()) {
  await desktopPortfolio.locator('.anxg__stage').screenshot({ path: path.join(qaDir, 'portfolio-actions-1440.png') });
  const before = await desktopPortfolio.getAttribute('data-anxg-current');
  await desktopNext.click();
  await page.waitForTimeout(200);
  const after = await desktopPortfolio.getAttribute('data-anxg-current');
  desktopInteraction.portfolioAdvanced = before !== after;
}
const desktopServiceToggle = page.locator('.anbox-desktop-part--04 [data-anxs-toggle]:visible').first();
if (await desktopServiceToggle.count()) {
  const before = await desktopServiceToggle.getAttribute('aria-expanded');
  await desktopServiceToggle.click();
  const after = await desktopServiceToggle.getAttribute('aria-expanded');
  desktopInteraction.serviceToggle = before !== after;
}
const desktopPackageCards = page.locator('.anbox-desktop-part--05 [data-anxp-card]');
if (await desktopPackageCards.count() > 1) {
  await desktopPackageCards.nth(1).click();
  desktopInteraction.packageSelected = await desktopPackageCards.nth(1).getAttribute('aria-selected') === 'true';
}
const desktopBlog = page.locator('.anbox-desktop-part--08 #ablog');
let blogCoverAudit = null;
if (await desktopBlog.count()) {
  await desktopBlog.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const image = document.querySelector('.anbox-desktop-part--08 img.ablog__cover-image');
    return Boolean(image?.complete && image.naturalWidth > 0);
  }, null, { timeout: 10000 });
  await desktopBlog.locator('.ablog__desktop').screenshot({ path: path.join(qaDir, 'blog-grid-1440.png') });
  blogCoverAudit = await page.evaluate(() => {
    const covers = [...document.querySelectorAll('.anbox-desktop-part--08 img[data-ablog-editable-cover],.anbox-mobile-part--08 img[data-ablog-editable-cover]')];
    const desktopCover = document.querySelector('.anbox-desktop-part--08 img.ablog__cover-image');
    const desktopFeedIntro = document.querySelector('.anbox-desktop-part--08 .ablog__feed-intro');
    const mobileCover = document.querySelector('.anbox-mobile-part--08 img.article-cover');
    const desktopRect = desktopCover?.getBoundingClientRect();
    const feedIntroRect = desktopFeedIntro?.getBoundingClientRect();
    return {
      total: covers.length,
      placeholders: document.querySelectorAll('.anbox-desktop-part--08 .ablog__cover--placeholder,.anbox-desktop-part--08 .ablog__m-cover--placeholder,.anbox-desktop-part--08 .ablog__placeholder-label').length,
      dimensions: covers.map((image) => [image.getAttribute('width'), image.getAttribute('height')]),
      sourcesEditable: covers.every((image) => image.tagName === 'IMG' && image.hasAttribute('src')),
      desktopObjectFit: desktopCover ? getComputedStyle(desktopCover).objectFit : '',
      desktopFrameRatio: desktopRect ? desktopRect.width / desktopRect.height : 0,
      desktopNaturalRatio: desktopCover?.naturalWidth && desktopCover?.naturalHeight ? desktopCover.naturalWidth / desktopCover.naturalHeight : 0,
      desktopRowsAligned: Boolean(desktopRect && feedIntroRect && Math.abs(desktopRect.height - feedIntroRect.height) <= 1),
      mobileTag: mobileCover?.tagName || '',
      desktopType: document.querySelector('.anbox-desktop-part--08 .ablog__meta span')?.textContent.trim() || '',
      desktopTitle: document.querySelector('.anbox-desktop-part--08 .ablog__feature-copy h3')?.textContent.trim() || '',
      desktopLead: document.querySelector('.anbox-desktop-part--08 .ablog__feature-copy p')?.textContent.trim() || '',
      desktopAction: document.querySelector('.anbox-desktop-part--08 .ablog__read')?.textContent.trim() || '',
      desktopTarget: document.querySelector('.anbox-desktop-part--08 .ablog__feature-link')?.href || '',
      mobileType: document.querySelector('.anbox-mobile-part--08 .article-card__body small')?.textContent.trim() || '',
      mobileTitle: document.querySelector('.anbox-mobile-part--08 .article-card__body h3')?.textContent.trim() || '',
      mobileTarget: document.querySelector('.anbox-mobile-part--08 .article-card')?.href || '',
    };
  });
}
const desktopContactActions = page.locator('.anbox-desktop-part--09 #abct-contacts .abct__submit-row');
if (await desktopContactActions.count()) {
  await desktopContactActions.screenshot({ path: path.join(qaDir, 'contact-actions-1440.png') });
}

const desktopContactStates = {};
const desktopContactForm = page.locator('.anbox-desktop-part--09 #abct-form');
if (await desktopContactForm.count()) {
  await desktopContactForm.scrollIntoViewIfNeeded();
  await desktopContactForm.locator('#abct-name').fill('QA');
  await desktopContactForm.locator('#abct-company').fill('ANBOX');
  await desktopContactForm.locator('#abct-email').fill('qa@example.com');
  await desktopContactForm.locator('#abct-phone').fill('+7 999 000-00-00');
  await desktopContactForm.locator('#abct-project').fill('Проверка состояний формы');
  await desktopContactForm.locator('[data-abct-contact-chips] input').first().evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await desktopContactForm.evaluate((form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await page.waitForTimeout(120);
  desktopContactStates.consentError = await page.evaluate(() => {
    const input = document.querySelector('.anbox-desktop-part--09 #abct-consent');
    const error = document.querySelector('.anbox-desktop-part--09 #abct-consent-error');
    const errorStyle = error ? getComputedStyle(error) : null;
    const errorRect = error?.getBoundingClientRect();
    return {
      text: error?.textContent.trim() || '',
      fontSize: errorStyle ? Number.parseFloat(errorStyle.fontSize) : null,
      width: errorRect ? Math.round(errorRect.width) : 0,
      height: errorRect ? Math.round(errorRect.height) : 0,
      invalid: input?.getAttribute('aria-invalid') || '',
      describedBy: input?.getAttribute('aria-describedby') || '',
      visible: Boolean(error && errorStyle.display !== 'none' && errorStyle.visibility !== 'hidden'),
    };
  });
  await desktopContactForm.locator('.abct__consent').screenshot({ path: path.join(qaDir, 'contact-consent-error-1440.png') });
  await desktopContactForm.locator('#abct-consent').check();
  await page.waitForTimeout(60);
  desktopContactStates.consentCleared = await page.evaluate(() => {
    const input = document.querySelector('.anbox-desktop-part--09 #abct-consent');
    const error = document.querySelector('.anbox-desktop-part--09 #abct-consent-error');
    return input?.getAttribute('aria-invalid') === 'false' && !error?.textContent.trim();
  });
  await page.evaluate(() => {
    const popup = document.createElement('div');
    popup.className = 't-form-success-popup';
    popup.textContent = 'Tilda success popup';
    document.body.appendChild(popup);
    document.querySelector('.anbox-desktop-part--09 #abct-form')
      ?.dispatchEvent(new CustomEvent('tildaform:aftersuccess'));
  });
  await page.waitForTimeout(180);
  desktopContactStates.success = await page.evaluate(() => {
    const form = document.querySelector('.anbox-desktop-part--09 #abct-form');
    const body = form?.querySelector('.abct__form-body');
    const success = form?.querySelector('.abct__success');
    const popup = document.querySelector('.t-form-success-popup');
    const actions = success ? [...success.querySelectorAll('.abct__success-actions a')] : [];
    const mark = success?.querySelector('.abct__success-mark');
    const markRect = mark?.getBoundingClientRect();
    return {
      state: form?.dataset.abctSuccess || '',
      bodyHidden: Boolean(body && getComputedStyle(body).display === 'none' && body.getAttribute('aria-hidden') === 'true'),
      visible: Boolean(success && getComputedStyle(success).display === 'grid' && success.getAttribute('aria-hidden') === 'false'),
      popupHidden: Boolean(popup && getComputedStyle(popup).display === 'none'),
      focused: document.activeElement === success,
      hasMark: Boolean(mark?.querySelector('svg') && markRect && markRect.width >= 60 && markRect.height >= 60 && getComputedStyle(mark).display === 'grid'),
      actionTargets: actions.map((link) => link.getAttribute('href')),
    };
  });
  await desktopContactForm.locator('.abct__success').screenshot({ path: path.join(qaDir, 'contact-success-1440.png') });
}

desktopInteraction.teamPortraitsEditable = await page.evaluate(() => {
  const portraits = [...document.querySelectorAll('.anbox-desktop-part--07 .anxt__portrait')];
  return portraits.length === 3
    && portraits.every((portrait) => !portrait.classList.contains('anxt__portrait--placeholder'))
    && portraits.every((portrait) => Number.parseFloat(getComputedStyle(portrait.querySelector('img')).opacity) === 1);
});

async function auditTeamCopy(width, height, version) {
  await loadAt(previewPath, width, height);
  const rootSelector = version === 'desktop'
    ? '.anbox-desktop-part--07 #anxt-team-training .anxt__team'
    : '.anbox-mobile-part--07 .team-grid';
  const cardSelector = version === 'desktop' ? '.anxt__person' : '.person-card';
  const captionSelector = version === 'desktop' ? '.anxt__person>div' : '.person-card__caption';
  const root = page.locator(rootSelector);
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const result = await root.evaluate((node, { cardSelector, captionSelector }) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const cards = [...node.querySelectorAll(cardSelector)];
    return {
      copy: cards.map((card) => normalize(card.textContent)),
      portraitUrls: cards.map((card) => card.querySelector('img')?.getAttribute('src') || ''),
      captionOverflow: cards.map((card) => {
        const caption = card.querySelector(captionSelector);
        return caption ? Math.max(0, caption.scrollHeight - caption.clientHeight) : -1;
      }),
    };
  }, { cardSelector, captionSelector });
  await root.screenshot({ path: path.join(qaDir, `team-${version}-${width}.png`) });
  return { width, version, ...result };
}

const teamCopyAudit = [
  await auditTeamCopy(1440, 1000, 'desktop'),
  await auditTeamCopy(390, 844, 'mobile'),
];

const desktopPortfolioGeometry = [];
for (const [width, height] of [[1200, 900], [1440, 1000], [1920, 1200], [3840, 2160]]) {
  await loadAt(previewPath, width, height);
  const gallery = page.locator('.anbox-desktop-part--03 #anxg-gallery');
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector('.anbox-desktop-part--03 #anxg-gallery');
    const media = root.querySelector('.anxg__case.anxg-is-active .anxg__media');
    const details = root.querySelector('.anxg__case.anxg-is-active .anxg__details');
    const technical = root.querySelector('.anxg__case.anxg-is-active .anxg__data:not(.anxg__data--scale)');
    const nextProject = root.querySelector('.anxg__next-project');
    const technicalRows = [...root.querySelectorAll('.anxg__case .anxg__data:not(.anxg__data--scale)')];
    const mediaRect = media.getBoundingClientRect();
    const detailsRect = details.getBoundingClientRect();
    const technicalRect = technical.getBoundingClientRect();
    const nextProjectRect = nextProject.getBoundingClientRect();
    return {
      mediaWidth: Math.round(mediaRect.width * 100) / 100,
      mediaHeight: Math.round(mediaRect.height * 100) / 100,
      mediaRatio: Math.round((mediaRect.width / mediaRect.height) * 1000) / 1000,
      detailsHeight: Math.round(detailsRect.height * 100) / 100,
      detailsOverflow: Math.max(0, details.scrollHeight - details.clientHeight),
      technicalCount: technicalRows.length,
      technicalBottomValues: [...new Set(technicalRows.map((node) => getComputedStyle(node).bottom))],
      technicalButtonBottomDiff: Math.round((technicalRect.bottom - nextProjectRect.bottom) * 100) / 100,
    };
  });
  desktopPortfolioGeometry.push({ width, ...geometry });
  if (width === 1440) await gallery.locator('.anxg__stage').screenshot({ path: path.join(qaDir, 'portfolio-3x2-1440.png') });
}

async function auditDesktopGalleryPin() {
  const width = 1440;
  const height = 1000;
  await loadAt(previewPath, width, height);
  const initial = await page.evaluate(() => {
    const part = document.querySelector('.anbox-desktop-part--03');
    const root = document.querySelector('.anbox-desktop-part--03 #anxg-gallery');
    const stage = root.querySelector('.anxg__stage');
    const partRect = part.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    return {
      rootDocumentTop: rootRect.top + scrollY,
      rootHeight: rootRect.height,
      stageHeight: stageRect.height,
      stageTopCss: parseFloat(getComputedStyle(stage).top),
      position: getComputedStyle(stage).position,
      exitGap: Number((partRect.bottom - rootRect.bottom).toFixed(2)),
    };
  });
  const stickyStart = initial.rootDocumentTop - initial.stageTopCss + 2;
  await page.evaluate((top) => window.scrollTo(0, top), stickyStart);
  await page.waitForTimeout(350);
  const sample = () => page.evaluate(() => {
    const root = document.querySelector('.anbox-desktop-part--03 #anxg-gallery');
    const stage = root.querySelector('.anxg__stage');
    const header = document.querySelector('.anbox-desktop-part--00');
    const rootRect = root.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    return {
      rootTop: Number(rootRect.top.toFixed(2)),
      rootBottom: Number(rootRect.bottom.toFixed(2)),
      stageTop: Number(stageRect.top.toFixed(2)),
      stageBottom: Number(stageRect.bottom.toFixed(2)),
      headerHidden: header.classList.contains('is-hidden'),
      headerBottom: Number(headerRect.bottom.toFixed(2)),
    };
  });
  const entered = await sample();
  await page.evaluate((distance) => window.scrollBy(0, distance), Math.round(height * .55));
  await page.waitForTimeout(350);
  const held = await sample();
  await page.screenshot({ path: path.join(qaDir, 'portfolio-pinned-1440.png'), fullPage: false });
  await page.evaluate((distance) => window.scrollBy(0, distance), Math.round(height * .6));
  await page.waitForTimeout(350);
  const released = await sample();
  await page.screenshot({ path: path.join(qaDir, 'portfolio-exit-spacing-1440.png'), fullPage: false });
  return {
    width,
    height,
    position: initial.position,
    dwell: Number((initial.rootHeight - initial.stageHeight).toFixed(2)),
    exitGap: initial.exitGap,
    entered,
    held,
    released,
  };
}

const desktopGalleryPin = await auditDesktopGalleryPin();

async function auditDesktopIntroLines() {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, 1440, 1000);
  const definitions = [
    { part: '04', section: '.anbox-desktop-part--04 #anxs-services', mask: '.anbox-desktop-part--04 .anxs-matrix__statement', line: '.anbox-desktop-part--04 .anxs-matrix__statement', mode: 'border', capture: '.anbox-desktop-part--04 .anxs-matrix__intro' },
    { part: '05', section: '.anbox-desktop-part--05 #anxp-packages', mask: '.anbox-desktop-part--05 #anxp-title', line: '.anbox-desktop-part--05 #anxp-title', mode: 'pseudo', capture: '.anbox-desktop-part--05 .anxp__header' },
    { part: '07', section: '.anbox-desktop-part--07 #anxt-team-training', mask: '.anbox-desktop-part--07 .anxt__team-copy', line: '.anbox-desktop-part--07 .anxt__team-copy>p', mode: 'pseudo', capture: '.anbox-desktop-part--07 .anxt__team-copy' },
    { part: '08', section: '.anbox-desktop-part--08 #ablog', mask: '.anbox-desktop-part--08 .ablog__intro', line: '.anbox-desktop-part--08 .ablog__intro>i', mode: 'self', capture: '.anbox-desktop-part--08 .ablog__head' },
    { part: '09', section: '.anbox-desktop-part--09 #abct-contacts', mask: '.anbox-desktop-part--09 .abct__heading h2', line: '.anbox-desktop-part--09 .abct__heading h2', mode: 'border', capture: '.anbox-desktop-part--09 .abct__heading' },
  ];
  const results = [];
  for (const definition of definitions) {
    await page.locator(definition.section).evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(1550);
    const result = await page.evaluate((definition) => {
      const maskNode = document.querySelector(definition.mask);
      const lineNode = document.querySelector(definition.line);
      const lineStyle = getComputedStyle(lineNode, definition.mode === 'pseudo' ? '::before' : null);
      const maskStyle = getComputedStyle(maskNode);
      const width = definition.mode === 'border' ? parseFloat(lineStyle.borderLeftWidth) : parseFloat(lineStyle.width);
      const color = definition.mode === 'border' ? lineStyle.borderLeftColor : lineStyle.backgroundColor;
      const maskSize = maskStyle.webkitMaskSize || maskStyle.maskSize;
      return {
        width,
        color,
        maskSize,
        preserveLayer: maskSize.split(',').some((layer) => /3px\s+100%/.test(layer.trim())),
        visible: width >= 1.5 && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent',
      };
    }, definition);
    await page.locator(definition.capture).screenshot({ path: path.join(qaDir, `intro-line-${definition.part}-1440.png`) });
    results.push({ part: definition.part, ...result });
  }
  return results;
}

const desktopIntroLines = await auditDesktopIntroLines();

async function measureBaseline(filePath, width, selectors) {
  await loadAt(filePath, width, width >= 1000 ? 1100 : 1000);
  return page.evaluate((selectors) => Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
    const node = document.querySelector(selector);
    if (!node) return [key, null];
    const rect = node.getBoundingClientRect();
    return [key, { width: Math.round(rect.width), height: Math.round(rect.height) }];
  })), selectors);
}

const parity = {
  mobileSource390: await measureBaseline(mobileSourcePath, 390, { hero: '.hero', approach: '.approach', portfolio: '.portfolio' }),
  mobileFinal390: await measureBaseline(previewPath, 390, { hero: '.anbox-mobile-part--01 .hero', approach: '.anbox-mobile-part--02 .approach', portfolio: '.anbox-mobile-part--03 .portfolio' }),
  desktopSource1440: await measureBaseline(desktopSourcePath, 1440, { hero: '.abh-hero', approach: '.anbox-part-02', portfolio: '.anbox-part-03' }),
  desktopFinal1440: await measureBaseline(previewPath, 1440, { hero: '.anbox-desktop-part--01', approach: '.anbox-desktop-part--02', portfolio: '.anbox-desktop-part--03' }),
  desktopSource3840: await measureBaseline(desktopSourcePath, 3840, { hero: '.abh-hero', approach: '.anbox-part-02', portfolio: '.anbox-part-03' }),
  desktopFinal3840: await measureBaseline(previewPath, 3840, { hero: '.anbox-desktop-part--01', approach: '.anbox-desktop-part--02', portfolio: '.anbox-desktop-part--03' }),
};

await loadAt(previewPath, 1440, 1000);
const desktopHeroShelfAudit = await page.evaluate(() => {
  const images = [...document.querySelectorAll('.anbox-desktop-part--01 .abh-hero__shelf-group:first-child img')];
  return { total: images.length, loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length };
});
const casesAudit = await page.evaluate(() => {
  const normalizeText = (node) => node.textContent.replace(/\s+/g, ' ').trim();
  return ({
  desktopOrder: [...document.querySelectorAll('.anbox-desktop-part--03 [data-anxg-case]')].map((node) => node.dataset.anxgCase),
  desktopTitles: [...document.querySelectorAll('.anbox-desktop-part--03 [data-anxg-title]')].map(normalizeText),
  mobileOrder: [...document.querySelectorAll('.anbox-mobile-part--03 .case-slide[data-anbox-case]')].map((node) => node.dataset.anboxCase),
  mobileTitles: [...document.querySelectorAll('.anbox-mobile-part--03 .case-slide__copy h3')].map(normalizeText),
  heroOrder: [...document.querySelectorAll('.anbox-desktop-part--01 .abh-hero__slide[data-anbox-case]')].map((node) => node.dataset.anboxCase),
  desktopUrls: [...document.querySelectorAll('.anbox-desktop-part--03 [data-anxg-case] .anxg__cover--desktop')].map((node) => node.getAttribute('src')),
  mobileUrls: [...document.querySelectorAll('.anbox-mobile-part--03 .case-slide[data-anbox-case] img')].map((node) => node.getAttribute('src')),
  heroUrls: [...document.querySelectorAll('.anbox-desktop-part--01 .abh-hero__slide[data-anbox-case] img')].map((node) => node.getAttribute('src')),
  heroMarkedDesktop: [...document.querySelectorAll('.anbox-desktop-part--03 [data-anbox-hero="true"]')].map((node) => node.dataset.anboxCase),
  heroMarkedMobile: [...document.querySelectorAll('.anbox-mobile-part--03 [data-anbox-hero="true"]')].map((node) => node.dataset.anboxCase),
  watchCaseButtons: [...document.querySelectorAll('.anxg__case-link,.case-slide__link,[data-portfolio-dock-link]')].length,
  });
});

async function auditRevealTrigger(width, height, selector) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, width, height);
  await page.waitForTimeout(100);
  async function moveEdge(edge, desired) {
    await page.evaluate(({ selector, edge, desired }) => {
      const node = document.querySelector(selector);
      const rect = node.getBoundingClientRect();
      window.scrollBy(0, (edge === 'top' ? rect.top : rect.bottom) - desired);
    }, { selector, edge, desired });
    await page.waitForTimeout(180);
    return page.evaluate((selector) => {
      const node = document.querySelector(selector);
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const translate = style.translate === 'none'
        ? [0, 0]
        : style.translate.trim().split(/\s+/).map((value) => Number.parseFloat(value) || 0);
      const clipRaw = (style.clipPath.match(/-?\d*\.?\d+/g) || []).map(Number);
      const clipValues = clipRaw.length === 1 ? [clipRaw[0], clipRaw[0], clipRaw[0], clipRaw[0]]
        : clipRaw.length === 2 ? [clipRaw[0], clipRaw[1], clipRaw[0], clipRaw[1]]
          : clipRaw.length === 3 ? [clipRaw[0], clipRaw[1], clipRaw[2], clipRaw[1]]
            : clipRaw;
      const maskSize = style.maskSize || style.webkitMaskSize || 'none';
      const maskWidths = [...maskSize.matchAll(/(-?\d*\.?\d+)%/g)].map((match) => Number(match[1]));
      const maskPosition = style.maskPosition || style.webkitMaskPosition || 'none';
      const maskXs = maskPosition === 'none' ? [] : maskPosition.split(',').map((layer) => Number.parseFloat(layer.trim())).filter(Number.isFinite);
      const maskHiddenXs = style.getPropertyValue('--abx-heading-mask-hidden-position').split(',').map((layer) => Number.parseFloat(layer.trim())).filter(Number.isFinite);
      const maskFullXs = style.getPropertyValue('--abx-heading-mask-full-position').split(',').map((layer) => Number.parseFloat(layer.trim())).filter(Number.isFinite);
      const maskProgress = maskXs.map((value, index) => {
        const hidden = maskHiddenXs[index];
        const full = maskFullXs[index];
        return Number.isFinite(hidden) && Number.isFinite(full) && Math.abs(full - hidden) > .01
          ? Math.max(0, Math.min(1, (value - hidden) / (full - hidden)))
          : null;
      }).filter(Number.isFinite);
      const words = [...node.querySelectorAll('[data-anbox-reveal-word]')].map((word) => ({
        line: Number(word.dataset.anboxRevealLine || 0),
        opacity: Number.parseFloat(getComputedStyle(word).opacity),
        width: word.getBoundingClientRect().width,
      }));
      const lineOpacities = [...new Set(words.map((word) => word.line))].sort((a, b) => a - b).map((line) => {
        const values = words.filter((word) => word.line === line).map((word) => word.opacity);
        return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
      });
      return {
        in: node.classList.contains('anbox-reveal-in'),
        edge: node.dataset.anboxRevealEdge,
        top: Math.round(rect.top * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
        opacity: Number.parseFloat(style.opacity),
        translateX: Math.round((translate[0] || 0) * 100) / 100,
        translateY: Math.round((translate[1] || 0) * 100) / 100,
        clipPath: style.clipPath,
        clipValues,
        maskSize,
        maskWidths,
        maskPosition,
        maskXs,
        maskProgress,
        wordCount: words.length,
        wordsIntact: words.every((word) => word.width > .5),
        lineOpacities,
        lineCount: Number(node.dataset.anboxRevealLines || 0),
      };
    }, selector);
  }
  const before = await moveEdge('top', height + 8);
  const entered = await moveEdge('top', height - 40);
  const exitedTop = await moveEdge('bottom', -100);
  const returnedTop = await moveEdge('bottom', 100);
  const structure = await page.evaluate(() => ({
    nestedTargets: [...document.querySelectorAll('[data-anbox-reveal-ready="1"]')].filter((node) => node.querySelector('[data-anbox-reveal-ready="1"]')).length,
    clientTargets: document.querySelectorAll('.anbox-desktop-part--06 [data-anbox-reveal-ready],.anbox-mobile-part--06 [data-anbox-reveal-ready]').length,
  }));
  return { width, selector, before, entered, exitedTop, returnedTop, ...structure };
}

async function auditClientMarquee(width, height, rootSelector, trackSelector) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, width, height);
  await page.locator(rootSelector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  const track = page.locator(trackSelector).first();
  const before = await track.evaluate((node) => getComputedStyle(node).transform);
  await page.evaluate(() => window.scrollBy(0, 140));
  await page.waitForTimeout(320);
  const after = await track.evaluate((node) => getComputedStyle(node).transform);
  return { width, before, after, moved: before !== after };
}

async function auditCardSequence() {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, 1440, 600);
  await page.locator('.anbox-desktop-part--02 #abx-approach-v8').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const samples = [];
  for (const wait of [80, 160, 160]) {
    await page.waitForTimeout(wait);
    samples.push(await page.evaluate(() => [...document.querySelectorAll('.anbox-desktop-part--02 [data-abxa8-card]')].map((node) => {
      const style = getComputedStyle(node);
      const translate = style.translate === 'none' ? [0, 0] : style.translate.trim().split(/\s+/).map((value) => Number.parseFloat(value) || 0);
      return { opacity: Number.parseFloat(style.opacity), translateX: translate[0] || 0, translateY: translate[1] || 0, filter: style.filter, clipPath: style.clipPath };
    })));
  }
  return samples;
}

async function auditApproachHover() {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, 1440, 900);
  const root = page.locator('.anbox-desktop-part--02 #abx-approach-v8');
  await root.evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(1650);
  const card = page.locator('.anbox-desktop-part--02 [data-abxa8-card]').nth(1);
  const read = () => card.evaluate((node) => {
    const style = getComputedStyle(node);
    const translate = style.translate === 'none' ? [0, 0] : style.translate.trim().split(/\s+/).map((value) => Number.parseFloat(value) || 0);
    const seal = node.querySelector('.abxa8__seal');
    return {
      translateY: translate[1] || 0,
      shadow: style.boxShadow,
      sealTransform: seal ? getComputedStyle(seal).transform : 'none',
      moving: node.dataset.anboxRevealMoving || '',
    };
  });
  const before = await read();
  await card.hover();
  await page.waitForTimeout(560);
  const hovered = await read();
  return { before, hovered };
}

async function auditApproachScrollStability() {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, 1440, 900);
  const root = page.locator('.anbox-desktop-part--02 #abx-approach-v8');
  await root.evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(1800);
  const read = () => page.evaluate(() => {
    const section = document.querySelector('.anbox-desktop-part--02 #abx-approach-v8');
    const cards = [...section.querySelectorAll('[data-abxa8-card]')];
    return {
      scrollY: window.scrollY,
      isIn: section.classList.contains('is-in'),
      cards: cards.map((card) => {
        const rect = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        return {
          documentTop: rect.top + window.scrollY,
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
        };
      }),
    };
  });
  const before = await read();
  await page.evaluate(() => {
    const section = document.querySelector('.anbox-desktop-part--02 #abx-approach-v8');
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + 260, behavior: 'instant' });
  });
  await page.waitForTimeout(320);
  const after = await read();
  return { before, after };
}

async function auditOwnedRevealClassPersistence() {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadAt(previewPath, 1440, 900);
  const definitions = [
    { part: '02', section: '.anbox-desktop-part--02 #abx-approach-v8', state: '.anbox-desktop-part--02 #abx-approach-v8', className: 'is-in', line: '.anbox-desktop-part--02 .abxa8__title', mode: 'pseudo' },
    { part: '04', section: '.anbox-desktop-part--04 #anxs-services', state: '.anbox-desktop-part--04 #anxs-services', className: 'is-in', line: '.anbox-desktop-part--04 .anxs-matrix__statement', mode: 'border' },
    { part: '05', section: '.anbox-desktop-part--05 #anxp-packages', state: '.anbox-desktop-part--05 #anxp-packages', className: 'anxp-is-in', line: '.anbox-desktop-part--05 #anxp-title', mode: 'pseudo' },
    { part: '07', section: '.anbox-desktop-part--07 #anxt-team-training', state: '.anbox-desktop-part--07 #anxt-team-training', className: 'anxt-is-in', line: '.anbox-desktop-part--07 .anxt__team-copy>p', mode: 'pseudo' },
    { part: '08', section: '.anbox-desktop-part--08 #ablog', state: '.anbox-desktop-part--08 .ablog__head', className: 'is-visible', line: '.anbox-desktop-part--08 .ablog__intro>i', mode: 'self' },
    { part: '09', section: '.anbox-desktop-part--09 #abct-contacts', state: '.anbox-desktop-part--09 #abct-contacts', className: 'abct-is-in', line: '.anbox-desktop-part--09 .abct__heading h2', mode: 'border' },
  ];
  const results = [];
  for (const definition of definitions) {
    await page.locator(definition.section).evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(380);
    const entered = await page.locator(definition.state).evaluate((node, className) => node.classList.contains(className), definition.className);
    await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'instant' }));
    await page.waitForTimeout(220);
    const after = await page.evaluate((definition) => {
      const state = document.querySelector(definition.state);
      const line = document.querySelector(definition.line);
      const style = getComputedStyle(line, definition.mode === 'pseudo' ? '::before' : null);
      const width = Number.parseFloat(definition.mode === 'border' ? style.borderLeftWidth : style.width) || 0;
      const color = definition.mode === 'border' ? style.borderLeftColor : style.backgroundColor;
      return {
        active: state.classList.contains(definition.className),
        lineVisible: width >= 1.5 && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent',
        width,
        color,
      };
    }, definition);
    results.push({ part: definition.part, entered, ...after });
  }
  return results;
}

const revealAudit = {
  desktop: await auditRevealTrigger(1440, 1000, '.anbox-desktop-part--08 .ablog__intro'),
  clientsDesktop: await auditClientMarquee(1440, 1000, '.anbox-desktop-part--06', '.anbox-desktop-part--06 .anxl__track'),
  clientsMobile: await auditClientMarquee(390, 844, '.anbox-mobile-part--06', '.anbox-mobile-part--06 .logo-track'),
  cardSequence: await auditCardSequence(),
  approachHover: await auditApproachHover(),
  approachScrollStability: await auditApproachScrollStability(),
  ownedRevealClasses: await auditOwnedRevealClassPersistence(),
};
await page.emulateMedia({ reducedMotion: 'no-preference' });
await loadAt(previewPath, 1440, 1000);
revealAudit.contentSequences = await page.evaluate(() => {
  const sequence = (selector) => [...document.querySelectorAll(selector)].map((node) => ({
    kind: node.dataset.anboxRevealKind,
    order: Number(node.dataset.anboxRevealOrder),
    total: Number(node.dataset.anboxRevealTotal),
    down: Number(node.dataset.anboxRevealDelayDown),
    up: Number(node.dataset.anboxRevealDelayUp),
  }));
  const transitionDelay = (selector, pseudo = null) => {
    const node = document.querySelector(selector);
    return node ? getComputedStyle(node, pseudo).transitionDelay : '';
  };
  return {
    approach: sequence('.anbox-desktop-part--02 [data-abxa8-card]'),
    services: sequence('.anbox-desktop-part--04 .anxs-matrix__column'),
    packages: sequence('.anbox-desktop-part--05 [data-anxp-card]'),
    people: sequence('.anbox-desktop-part--07 .anxt__person'),
    heroHeadingKinds: [...document.querySelectorAll('.anbox-desktop-part--01 .abh-hero__title>span')].map((node) => node.dataset.anboxRevealKind || ''),
    portfolioMediaKind: document.querySelector('.anbox-desktop-part--03 .anxg__viewport')?.dataset.anboxRevealKind || '',
    blogHeadingKind: document.querySelector('.anbox-desktop-part--08 .ablog__intro')?.dataset.anboxRevealKind || '',
    blogHeadingLines: Number(document.querySelector('.anbox-desktop-part--08 .ablog__intro')?.dataset.anboxRevealLines || 0),
    timings: {
      block: getComputedStyle(document.documentElement).getPropertyValue('--abx-reveal-block').trim(),
      heading: getComputedStyle(document.documentElement).getPropertyValue('--abx-reveal-heading').trim(),
    },
    highlightDelays: [
      transitionDelay('.anbox-desktop-part--02 .abxa8__highlight', '::before'),
      transitionDelay('.anbox-desktop-part--04 .anxs-matrix__statement mark'),
      transitionDelay('.anbox-desktop-part--05 .anxp__highlight'),
      transitionDelay('.anbox-desktop-part--08 .ablog__intro h2 span'),
      transitionDelay('.anbox-desktop-part--09 .abct__heading h2 span'),
    ],
    approachPanelMotion: (() => {
      const node = document.querySelector('.anbox-desktop-part--02 [data-abxa8-card]');
      if (!node) return null;
      const wasActive = node.classList.contains('anbox-reveal-in');
      node.style.setProperty('transition', 'none', 'important');
      node.classList.remove('anbox-reveal-in');
      void node.offsetWidth;
      const style = getComputedStyle(node);
      const translate = style.translate === 'none' ? [0, 0] : style.translate.trim().split(/\s+/).map((value) => Number.parseFloat(value) || 0);
      const result = { opacity: Number.parseFloat(style.opacity), translateX: translate[0] || 0, translateY: translate[1] || 0, filter: style.filter, clipPath: style.clipPath };
      if (wasActive) node.classList.add('anbox-reveal-in');
      node.style.removeProperty('transition');
      return result;
    })(),
  };
});
await loadAt(previewPath, 390, 844);
revealAudit.mobileIsolation = await page.evaluate(() => ({
  mountedRoots: document.querySelectorAll('.anbox-mobile-part[data-anbox-reveal-mounted="1"]').length,
  sharedTargets: document.querySelectorAll('.anbox-mobile-part [data-anbox-reveal-ready="1"]').length,
  totalCases: document.querySelectorAll('.anbox-mobile-part--03 .case-slide[data-anbox-case]').length,
  sharedCaseTargets: document.querySelectorAll('.anbox-mobile-part--03 .case-slide[data-anbox-reveal-ready="1"]').length,
}));
await page.emulateMedia({ reducedMotion: 'reduce' });
await loadAt(previewPath, 1440, 1000);
revealAudit.reduced = await page.evaluate(() => {
  const target = document.querySelector('.anbox-desktop-part--02 [data-abxa8-card]');
  const logo = document.querySelector('.anbox-mobile-part--10 .footer-brand__logo');
  const style = getComputedStyle(target);
  return {
    targetVisible: style.opacity === '1' && (style.translate === 'none' || style.translate === '0px'),
    footerLogoExcluded: Boolean(logo && !logo.hasAttribute('data-anbox-reveal-ready')),
  };
});

await browser.close();

const expectedTokens = { paper: '#f3f4f0', ink: '#151716', purple: '#ad95ee', purpleStrong: '#7658d0', lime: '#dde63f' };
const failures = [];
for (const item of structure) {
  const expectedRoots = item.name === serviceFile ? 0 : 2;
  if (item.visualRoots !== expectedRoots) failures.push(`${item.name}: visual roots ${item.visualRoots}, expected ${expectedRoots}`);
  if (item.name !== serviceFile && (item.desktopRoots !== 1 || item.mobileRoots !== 1)) failures.push(`${item.name}: desktop/mobile roots ${item.desktopRoots}/${item.mobileRoots}`);
  if (item.duplicateIds.length) failures.push(`${item.name}: duplicate IDs ${item.duplicateIds.join(', ')}`);
}
for (const item of viewportResults) {
  const mobile = item.width <= 640;
  if (item.visibleMobile !== (mobile ? 11 : 0) || item.visibleDesktop !== (mobile ? 0 : 11)) failures.push(`${item.width}px: visible roots desktop/mobile ${item.visibleDesktop}/${item.visibleMobile}`);
  if (item.pageOverflow > 1) failures.push(`${item.width}px: page overflow ${item.pageOverflow}px`);
  if (item.duplicateIds.length) failures.push(`${item.width}px: duplicate IDs ${item.duplicateIds.join(', ')}`);
  if (item.missingImageMetadata) failures.push(`${item.width}px: ${item.missingImageMetadata} images without metadata`);
  if (mobile && (!item.mobilePortfolioRadii || item.mobilePortfolioRadii.some((radius) => radius !== 0))) failures.push(`${item.width}px: mobile portfolio cards are still rounded`);
  if (JSON.stringify(item.tokens) !== JSON.stringify(expectedTokens)) failures.push(`${item.width}px: token mismatch`);
  if (!item.footer) failures.push(`${item.width}px: footer is missing`);
  else if (mobile) {
    if (item.footer.display !== 'block' || Math.abs(item.footer.width - item.width) > 1 || item.footer.height < 160) failures.push(`${item.width}px: mobile footer geometry is invalid`);
    if (item.footer.socialTargets.length !== 3 || item.footer.socialTargets.some((target) => target.width < 44 || target.height < 44)) failures.push(`${item.width}px: mobile footer social targets are too small`);
    if (!item.footer.logo || item.footer.logo.tag !== 'svg' || !item.footer.logo.visible || item.footer.logo.pathCount < 10) failures.push(`${item.width}px: mobile footer logo is missing or depends on an external asset`);
  } else {
    const expectedFooterWidth = item.width > 1920 ? item.width - 2 * Math.min(256, Math.max(24, item.width * 0.06667)) : item.width;
    if (item.footer.display !== 'grid' || Math.abs(item.footer.width - expectedFooterWidth) > 2 || item.footer.height < 100) failures.push(`${item.width}px: desktop footer grid is invalid`);
    if (item.footer.socialTargets.length !== 3 || item.footer.socialTargets.some((target) => target.width < 24 || target.height < 24)) failures.push(`${item.width}px: desktop footer social targets are invalid`);
    if (!item.headerNav || item.headerNav.links.length !== 6 || !item.headerNav.logoVisible || !item.headerNav.ctaVisible || !item.headerNav.ctaArrowHidden || item.headerNav.ctaUnderline < 1) failures.push(`${item.width}px: desktop header structure is invalid`);
    else if (item.width >= 1025 && (!item.headerNav.navVisible || item.headerNav.menuVisible || item.headerNav.logo.right >= item.headerNav.links[0].left || item.headerNav.links.at(-1).right >= item.headerNav.cta.left || Math.max(...item.headerNav.itemGaps) - Math.min(...item.headerNav.itemGaps) > 1)) failures.push(`${item.width}px: desktop header grid spacing is invalid`);
    else if (item.width >= 1025 && (item.headerNav.navType !== item.headerNav.ctaType || Math.max(item.headerNav.logoMark.bottom, ...item.headerNav.linkText.map((rect) => rect.bottom), item.headerNav.ctaText.bottom) - Math.min(item.headerNav.logoMark.bottom, ...item.headerNav.linkText.map((rect) => rect.bottom), item.headerNav.ctaText.bottom) > 1)) failures.push(`${item.width}px: desktop header baseline or type is inconsistent`);
    else if (item.width <= 1024 && (item.headerNav.navVisible || !item.headerNav.menuVisible)) failures.push(`${item.width}px: tablet header adaptation is invalid`);
    if (!item.contactCtas || Math.abs(item.contactCtas.submit.width - item.contactCtas.direct.width) > 1 || Math.abs(item.contactCtas.submit.height - item.contactCtas.direct.height) > 1) failures.push(`${item.width}px: contact CTAs have mismatched geometry`);
    else if (item.width >= 961 && (Math.abs(item.contactCtas.submit.top - item.contactCtas.textarea.top) > 1 || Math.abs(item.contactCtas.direct.bottom - item.contactCtas.textarea.bottom) > 1)) failures.push(`${item.width}px: contact CTAs are not aligned to the project field`);
    if (item.contactCtas?.submitArrowColor === item.contactCtas?.submitArrowBackground) failures.push(`${item.width}px: contact submit arrow has no contrast`);
    if (!item.approachLogo || !item.approachLogo.embedded || item.approachLogo.naturalWidth !== 309 || item.approachLogo.naturalHeight !== 309 || !/brightness\(0\).*invert\(1\)/.test(item.approachLogo.filter)) failures.push(`${item.width}px: approach logo is missing, altered or not white`);
    if (item.width >= 1025 && (!item.portfolioActions || item.portfolioActions.caseLinkCount !== 0 || !item.portfolioActions.nextProjectVisible)) failures.push(`${item.width}px: removed case CTA is present or next-project control is missing`);
  }
}
for (const item of headerScrollBehavior) {
  if (item.top.hidden || Math.abs(item.top.top) > 1 || !item.down.hidden || item.down.bottom > 1 || item.up.hidden || Math.abs(item.up.top) > 1) failures.push(`${item.width}px: fixed header scroll behavior is invalid`);
}
if (scriptSyntaxErrors.length) failures.push(...scriptSyntaxErrors);
if (runtimeErrors.length) failures.push(...runtimeErrors.map((error) => `runtime: ${error}`));
for (const [name, passed] of Object.entries({ ...mobileInteraction, ...desktopInteraction })) if (passed !== true) failures.push(`interaction ${name}: ${String(passed)}`);
if (desktopContactStates.consentError?.text !== 'Пожалуйста, подтвердите ознакомление'
  || desktopContactStates.consentError?.fontSize > 9
  || desktopContactStates.consentError?.width < 120
  || desktopContactStates.consentError?.height > 12
  || desktopContactStates.consentError?.invalid !== 'true'
  || desktopContactStates.consentError?.describedBy !== 'abct-consent-error'
  || !desktopContactStates.consentError?.visible
  || !desktopContactStates.consentCleared) failures.push('desktop contact: consent validation message, size or accessibility state is invalid');
if (desktopContactStates.success?.state !== '1'
  || !desktopContactStates.success?.bodyHidden
  || !desktopContactStates.success?.visible
  || !desktopContactStates.success?.popupHidden
  || !desktopContactStates.success?.focused
  || !desktopContactStates.success?.hasMark
  || JSON.stringify(desktopContactStates.success?.actionTargets) !== JSON.stringify(['#anxg-gallery', 'https://t.me/anbox_design'])) failures.push('desktop contact: branded success state or Tilda popup suppression is invalid');
for (const item of desktopPortfolioGeometry) {
  if (Math.abs(item.mediaRatio - 1.5) > .005) failures.push(`${item.width}px: desktop portfolio media ratio is ${item.mediaRatio}, expected 1.5`);
  if (item.detailsHeight < 123 || item.detailsHeight > 141 || item.detailsOverflow > 1) failures.push(`${item.width}px: desktop portfolio technical panel geometry is invalid`);
  if (item.technicalCount !== expectedCaseOrder.length || JSON.stringify(item.technicalBottomValues) !== JSON.stringify(['15px']) || Math.abs(item.technicalButtonBottomDiff) > 1) failures.push(`${item.width}px: portfolio technical line is not aligned with the next-project button across all cases`);
}
if (desktopGalleryPin.position !== 'sticky' || Math.abs(desktopGalleryPin.dwell - desktopGalleryPin.height) > 2) failures.push('portfolio: desktop gallery is not pinned for exactly one viewport');
if (desktopGalleryPin.exitGap < 63) failures.push('portfolio: desktop gallery has no intentional exit spacing');
if (Math.abs(desktopGalleryPin.entered.stageTop - desktopGalleryPin.held.stageTop) > 2 || desktopGalleryPin.held.rootTop >= 0 || desktopGalleryPin.held.rootBottom <= desktopGalleryPin.height) failures.push('portfolio: desktop gallery does not hold a full-screen scene while scrolling');
if (!desktopGalleryPin.held.headerHidden || desktopGalleryPin.held.headerBottom > 1) failures.push('portfolio: desktop header remains visible over the pinned gallery');
if (desktopGalleryPin.released.stageTop >= desktopGalleryPin.held.stageTop - 40) failures.push('portfolio: desktop gallery does not release after one viewport');
if (desktopIntroLines.some((item) => !item.visible || !item.preserveLayer)) failures.push('reveal: a desktop subtitle rule is clipped by the heading mask');
for (const item of teamCopyAudit) {
  if (JSON.stringify(item.copy) !== JSON.stringify(expectedTeamCopy)
    || JSON.stringify(item.portraitUrls) !== JSON.stringify(expectedTeamPortraitUrls)
    || item.captionOverflow.some((value) => value !== 0)) failures.push(`${item.version} team: biography copy or portrait URLs are missing or clipped`);
}
for (const item of heroLayouts) {
  const ordered = item.title && item.rule && item.intro && item.actionRects.length === 1
    && item.title.bottom <= item.rule.top + 1
    && item.rule.bottom <= item.intro.top + 1
    && item.intro.bottom <= item.actionRects[0].top + 1;
  const inside = item.hero && item.content && item.content.top >= item.hero.top - 1 && item.content.bottom <= item.hero.bottom + 1 && item.content.left >= item.hero.left - 1 && item.content.right <= item.hero.right + 1;
  const bottomAir = item.hero && item.content && item.hero.bottom - item.content.bottom >= 40;
  const targets = item.actionRects.length === 1 && item.actionRects.every((rect) => rect.height >= 44 && rect.width >= 44);
  const copy = item.titleText === 'Создаём бренды, которые выбирают'
    && item.introText === 'Стратегический дизайн — от анализа рынка до запуска в производство'
    && JSON.stringify(item.actionTexts) === JSON.stringify(['Обсудить проект'])
    && JSON.stringify(item.actionTargets) === JSON.stringify(['#abm-contact']);
  if (!ordered || !inside || !bottomAir || !targets || !copy) failures.push(`${item.width}x${item.height}: mobile HERO content does not match the reference`);
}
if (!mobilePortfolioAppearance?.dockVisible || !mobilePortfolioAppearance?.dockedState || mobilePortfolioAppearance?.visibleInlineCaptions !== 0 || mobilePortfolioAppearance?.caseLinkCount !== 0) failures.push('mobile portfolio: caption is duplicated, bottom dock is inactive or case CTA is still present');
if (!mobilePortfolioAppearance?.titleAccentVisible || !mobilePortfolioAppearance?.moreButtonPurpleBorder) failures.push('mobile portfolio: title accent or purple reveal-button border is missing');
if (!blogCoverAudit
  || blogCoverAudit.total !== 3
  || blogCoverAudit.placeholders !== 0
  || !blogCoverAudit.sourcesEditable
  || blogCoverAudit.desktopObjectFit !== 'cover'
  || blogCoverAudit.mobileTag !== 'IMG'
  || JSON.stringify(blogCoverAudit.dimensions) !== JSON.stringify([['1670', '941'], ['900', '1200'], ['1200', '680']])
  || Math.abs(blogCoverAudit.desktopFrameRatio - blogCoverAudit.desktopNaturalRatio) > 0.005
  || !blogCoverAudit.desktopRowsAligned
  || blogCoverAudit.desktopType !== 'Новости'
  || blogCoverAudit.desktopTitle !== 'ANBOX Studio — соорганизатор сессии «Упаковка» на WorldFood 2026'
  || blogCoverAudit.desktopLead !== 'Приглашаем посетить экспертную сессию 18 сентября.'
  || blogCoverAudit.desktopAction !== 'Подробнее на сайте ↗'
  || blogCoverAudit.mobileType !== 'Новости · дизайн упаковки'
  || blogCoverAudit.mobileTitle !== blogCoverAudit.desktopTitle
  || blogCoverAudit.desktopTarget !== 'https://world-food.ru/ru/business-program/bp26/1Forum/DAY4-Pitch/'
  || blogCoverAudit.mobileTarget !== blogCoverAudit.desktopTarget) failures.push('blog: editable cover or synchronized WorldFood news content is missing or malformed');
if (JSON.stringify(casesAudit.desktopOrder) !== JSON.stringify(expectedCaseOrder)
  || JSON.stringify(casesAudit.mobileOrder) !== JSON.stringify(expectedCaseOrder)
  || JSON.stringify(casesAudit.desktopTitles) !== JSON.stringify(expectedCaseTitles)
  || JSON.stringify(casesAudit.mobileTitles) !== JSON.stringify(expectedCaseTitles)) failures.push('portfolio catalog: desktop/mobile order or titles do not match the imported JSON');
if (JSON.stringify(casesAudit.desktopUrls) !== JSON.stringify(expectedDesktopUrls)
  || JSON.stringify(casesAudit.mobileUrls) !== JSON.stringify(expectedMobileUrls)
  || JSON.stringify(casesAudit.heroUrls) !== JSON.stringify(expectedHeroUrls)) failures.push('cases media: gallery or desktop HERO URLs do not match the imported JSON');
if (JSON.stringify(casesAudit.heroOrder) !== JSON.stringify(expectedHeroOrder)
  || JSON.stringify(casesAudit.heroMarkedDesktop) !== JSON.stringify(expectedHeroOrder)
  || JSON.stringify(casesAudit.heroMarkedMobile) !== JSON.stringify(expectedHeroOrder)) failures.push('HERO catalog: selected cases do not match JSON checkmarks');
if (casesAudit.watchCaseButtons !== 0) failures.push(`portfolio catalog: ${casesAudit.watchCaseButtons} case CTA controls remain`);
if (desktopHeroShelfAudit.total !== 8 || desktopHeroShelfAudit.loaded !== 8) failures.push(`desktop HERO shelf: loaded ${desktopHeroShelfAudit.loaded}/${desktopHeroShelfAudit.total} retailer logos`);
if (!mobileHeroShelfAudit || mobileHeroShelfAudit.total !== 8 || mobileHeroShelfAudit.loaded !== 8) failures.push(`mobile HERO shelf: loaded ${mobileHeroShelfAudit?.loaded || 0}/${mobileHeroShelfAudit?.total || 0} retailer logos`);
for (const [name, passed] of Object.entries(heroMediaBehavior).filter(([name]) => name !== 'samples')) if (passed !== true) failures.push(`mobile hero ${name}: ${String(passed)}`);
if (cleanupAudit.importCount !== 1) failures.push(`cleanup: @import count ${cleanupAudit.importCount}, expected 1`);
if (Object.values(headingAudit.h1ByFile).reduce((sum, count) => sum + count, 0) !== 1
  || headingAudit.previewH1Count !== 1
  || headingAudit.h1ByFile['01-hero.html'] !== 1
  || headingAudit.desktopLevelOneRoleCount !== 1
  || !headingAudit.desktopTitle
  || headingAudit.desktopTitle !== headingAudit.mobileTitle) failures.push('SEO headings: page must contain one H1 while the mobile visual title keeps an equivalent accessible level-one heading');
if (cleanupAudit.scrollReplayRuntimeCount !== 0) failures.push(`cleanup: scroll replay runtimes ${cleanupAudit.scrollReplayRuntimeCount}`);
if (cleanupAudit.legacyColors.length) failures.push(`cleanup: legacy colors ${cleanupAudit.legacyColors.join(', ')}`);
if (cleanupAudit.reductionPercent < minimumCleanupReduction) failures.push(`cleanup: reduction ${cleanupAudit.reductionPercent}% is below ${minimumCleanupReduction}%`);
if (navigationAudit.legacyApproachLabels !== 0 || !navigationAudit.desktopBlogTarget || !navigationAudit.desktopDesignersFirst || navigationAudit.mobileBlogTargets < 2 || !navigationAudit.mobileBlogAnchor || !navigationAudit.mobileDesignersFirst) failures.push('navigation: order, Blog label or target is inconsistent');
if (revealStructureAudit.coreStyleCount !== 1 || revealStructureAudit.coreRuntimeCount !== 1 || revealStructureAudit.serviceInitCount !== 0) failures.push('reveal: shared core or service-block isolation is invalid');
for (const name of visualFiles) {
  const expected = name === '00-header.html' || name === '06-clients.html' ? 0 : 1;
  if (revealStructureAudit.initByFile[name] !== expected) failures.push(`reveal: ${name} init count ${revealStructureAudit.initByFile[name]}, expected ${expected}`);
}
for (const [version, audit] of Object.entries({ desktop: revealAudit.desktop })) {
  const stationary = Math.abs(audit.entered.translateX) < 0.1 && Math.abs(audit.entered.translateY) < 0.1 && Math.abs(audit.returnedTop.translateX) < 0.1 && Math.abs(audit.returnedTop.translateY) < 0.1;
  const solidHeadline = audit.entered.opacity > 0.99 && audit.returnedTop.opacity > 0.99;
  const hiddenByLines = audit.before.lineCount > 0 && audit.before.maskProgress.length === audit.before.lineCount && audit.before.maskProgress.every((value) => value < .01);
  const lineReveal = (sample) => sample.lineCount > 0 && sample.maskProgress.length === sample.lineCount && sample.maskProgress[0] > .05 && sample.maskProgress[0] < 1 && sample.maskProgress.every((value, index) => index === 0 || value <= sample.maskProgress[index - 1] + .01);
  if (audit.before.in || !audit.entered.in || audit.entered.top >= (version === 'desktop' ? 1000 : 844) || !stationary || !solidHeadline || !hiddenByLines || !lineReveal(audit.entered) || audit.entered.clipPath !== 'none' || audit.exitedTop.in || !audit.returnedTop.in || audit.returnedTop.edge !== 'top' || !lineReveal(audit.returnedTop) || audit.nestedTargets !== 0 || audit.clientTargets !== 0) failures.push(`reveal: ${version} viewport trigger or soft line reveal is invalid`);
}
for (const [name, sequence] of Object.entries(revealAudit.contentSequences).filter(([name]) => ['approach', 'services', 'packages', 'people'].includes(name))) {
  const down = sequence.map((item) => item.down);
  const up = sequence.map((item) => item.up);
  const downSequential = down.every((value, index) => index === 0 || value > down[index - 1]);
  const upSequential = up.every((value, index) => index === 0 || value < up[index - 1]);
  if (sequence.length < 2 || sequence.some((item) => item.kind !== 'panel' || item.total !== sequence.length) || !downSequential || !upSequential) failures.push(`reveal: ${name} cards are not sequenced one by one in both directions`);
}
const approachPanelMotion = revealAudit.contentSequences.approachPanelMotion;
const timingsValid = revealAudit.contentSequences.timings.block === '400ms' && revealAudit.contentSequences.timings.heading === '900ms';
const highlightDelayValid = revealAudit.contentSequences.highlightDelays.every((value) => Math.abs(Number.parseFloat(value) - 1.46) < 0.01);
if (revealAudit.contentSequences.heroHeadingKinds.length !== 2 || revealAudit.contentSequences.heroHeadingKinds.some((kind) => kind !== 'display') || revealAudit.contentSequences.portfolioMediaKind !== 'media' || revealAudit.contentSequences.blogHeadingKind !== 'heading' || revealAudit.contentSequences.blogHeadingLines < 2 || !timingsValid || !highlightDelayValid || !approachPanelMotion || approachPanelMotion.clipPath !== 'none' || approachPanelMotion.opacity !== 0 || Math.abs(approachPanelMotion.translateX) > 0.1 || Math.abs(approachPanelMotion.translateY) < 7 || !approachPanelMotion.filter.includes('blur')) failures.push('reveal: content-specific motion roles are invalid');
if (revealAudit.mobileIsolation.mountedRoots !== 0 || revealAudit.mobileIsolation.sharedTargets !== 0 || revealAudit.mobileIsolation.totalCases !== 20 || revealAudit.mobileIsolation.sharedCaseTargets !== 0) failures.push('reveal: mobile is not isolated from the desktop reveal controller');
const cardSamples = revealAudit.cardSequence;
const softCardSequence = cardSamples.length === 3
  && cardSamples[0].every((card) => card.opacity === 0 && Math.abs(card.translateY) >= 7 && card.filter.includes('blur') && card.clipPath === 'none')
  && cardSamples[1][0].opacity > 0.15 && cardSamples[1].slice(1).every((card) => card.opacity === 0)
  && cardSamples[2][0].opacity > 0.8 && cardSamples[2][1].opacity > 0.2 && cardSamples[2][2].opacity < 0.15 && cardSamples[2].slice(3).every((card) => card.opacity === 0);
if (!softCardSequence) failures.push('reveal: cards do not appear softly and sequentially');
if (Math.abs(revealAudit.approachHover.before.translateY) > .1 || revealAudit.approachHover.before.moving || revealAudit.approachHover.hovered.translateY > -3 || revealAudit.approachHover.hovered.shadow === revealAudit.approachHover.before.shadow || revealAudit.approachHover.hovered.sealTransform === 'none') failures.push('approach: desktop card hover lift, shadow or seal motion is blocked');
const approachScroll = revealAudit.approachScrollStability;
const approachDocumentPositionsStable = approachScroll.before.cards.length === approachScroll.after.cards.length
  && approachScroll.before.cards.every((card, index) => Math.abs(card.documentTop - approachScroll.after.cards[index].documentTop) < 1);
if (!approachScroll.before.isIn || !approachScroll.after.isIn || !approachDocumentPositionsStable || approachScroll.after.cards.some((card) => card.opacity < .99 || !['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(card.transform))) failures.push('approach: desktop block jumps or resets after its heading leaves the viewport');
if (revealAudit.ownedRevealClasses.some((item) => !item.entered || !item.active || !item.lineVisible)) failures.push('reveal: a block-owned entrance class or vertical heading rule is reset by the shared controller');
if (!revealAudit.clientsDesktop.moved || !revealAudit.clientsMobile.moved) failures.push('reveal: client marquees no longer move independently');
if (!revealAudit.reduced.targetVisible || !revealAudit.reduced.footerLogoExcluded) failures.push('reveal: reduced-motion fallback or mobile footer logo isolation is invalid');

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  failures,
  structure,
  scriptSyntaxErrors,
  runtimeErrors,
  viewportResults,
  headerScrollBehavior,
  heroLayouts,
  mobileInteraction,
  portfolioRevealFlow,
  mobilePortfolioAppearance,
  blogCoverAudit,
  portfolioReverseFlow,
  desktopInteraction,
  desktopContactStates,
  desktopPortfolioGeometry,
  desktopGalleryPin,
  desktopIntroLines,
  teamCopyAudit,
  heroMediaBehavior,
  parity,
  casesAudit,
  desktopHeroShelfAudit,
  mobileHeroShelfAudit,
  cleanupAudit,
  headingAudit,
  navigationAudit,
  revealStructureAudit,
  revealAudit,
};
fs.writeFileSync(path.join(qaDir, 'qa-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const markdown = [
  '# ANBOX Studio — QA',
  '',
  `Статус: **${report.status}**`,
  '',
  `Проверены ширины: ${widths.map((width) => `${width} px`).join(', ')}.`,
  '',
  '- Визуальные файлы: по одному desktop-корню и одному mobile-корню.',
  '- Служебный `03A`: без визуального корня; стили применяются к следующему `03B`.',
  '- Переключение: mobile до 640 px включительно; desktop от 641 px.',
  '- Проверены дубли ID, горизонтальный скролл страницы, метаданные изображений, синтаксис и ошибки runtime.',
  '- Проверены menu, approach, service/package tabs, portfolio reveal, desktop HERO и portfolio navigation.',
  '- Подвал отдельно проверен как mobile block и desktop grid, включая wide/4K shell и размеры социальных ссылок.',
  '- Desktop-header: логотип, навигация и подчёркнутый CTA используют одну нижнюю оптическую линию и типографику; tablet использует компактное меню.',
  '- Контакты: CTA одинакового размера, выровнены по полю задачи; стрелка submit контрастна.',
  '- Подход: исходная монограмма встроена в блок без внешнего файла и отображается белой.',
  '- Галерея: порядок и тексты всех 20 кейсов совпадают с импортированным JSON; CTA «Смотреть кейс» удалён, «Следующий проект» сохранён.',
  '- Галерея mobile: информация о кейсе показывается один раз в нижней панели; карточки без скруглений и без CTA «Смотреть кейс».',
  '- HERO desktop: используются пять кейсов с отметкой HERO в JSON — 01, 06, 07, 12 и 15.',
  '- HERO mobile: `autoplay + muted + loop + playsinline + preload=auto`.',
  '- HERO mobile: video продолжает loop после вступления; логотипы начинают движение после полного появления строки.',
  '- HERO mobile: заголовок, описание, нижний отступ не менее 40 px и единственная контурная CTA «Обсудить проект» проверены на 320×667, 390×844 и 412×915.',
  `- Очистка: объём блоков уменьшен на ${cleanupAudit.reductionPercent}%; повторных scroll-replay runtime — ${cleanupAudit.scrollReplayRuntimeCount}; подключений Onest — ${cleanupAudit.importCount}.`,
  '- Навигация: пункт «Блог» ведёт к desktop- и mobile-якорям соответствующего блока.',
  '- Reveal: старт только после фактического входа элемента в viewport; обратный вход сверху проверен; блок клиентов и mobile footer logo исключены.',
  '',
  failures.length ? `## Ошибки\n\n${failures.map((item) => `- ${item}`).join('\n')}` : 'Ошибок по критериям сборки не найдено.',
].join('\n');
fs.writeFileSync(path.join(qaDir, 'QA-REPORT.md'), `${markdown}\n`, 'utf8');

console.log(JSON.stringify({ status: report.status, failures, qaDir }, null, 2));
if (failures.length) process.exitCode = 1;
