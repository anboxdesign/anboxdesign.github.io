const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'ANBOX-Studio-mobile.html');
const outputDir = path.join(root, 'mobile-video-hero-qa', 'final');
const source = fs.readFileSync(target, 'utf8');
const heroSource = source.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0] || '';
const cases = [
  { width: 320, height: 568, name: '320-short' },
  { width: 360, height: 640, name: '360' },
  { width: 375, height: 667, name: '375' },
  { width: 390, height: 844, name: '390' },
  { width: 412, height: 915, name: '412' },
  { width: 430, height: 932, name: '430' },
  { width: 844, height: 390, name: 'landscape' },
];
const screenshotCases = new Set(['320-short', '390', '430', 'landscape']);
const checks = [];
const record = (name, pass, detail = {}) => checks.push({ name, pass: Boolean(pass), detail });

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  record('HERO CSS contains no hover selectors', !/:hover\b/.test(source), {
    hoverSelectors: (source.match(/:hover\b/g) || []).length,
  });
  record('HERO uses the approved 50% uniform veil', /\.hero::after\s*\{[\s\S]*?background:\s*rgba\(26,\s*8,\s*8,\s*\.5\)/.test(source), {});
  record('HERO copy has no hanging short prepositions, training link or CTA', heroSource.includes('от&nbsp;анализа')
    && heroSource.includes('до&nbsp;запуска')
    && heroSource.includes('в&nbsp;производство')
    && !heroSource.includes('раздел обучения')
    && !heroSource.includes('hero__actions')
    && !heroSource.includes('Создать сильный бренд'), {});

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });

  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: item.width, height: item.height } });
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (item.name === '390') {
      const preview = await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        return {
          introState: hero.dataset.introState,
          overlayOpacity: Number.parseFloat(getComputedStyle(hero, '::after').opacity),
          contentOpacity: Number.parseFloat(getComputedStyle(hero.querySelector('.hero__content')).opacity),
          videoOpacity: Number.parseFloat(getComputedStyle(document.querySelector('[data-hero-video]')).opacity),
        };
      });
      record('HERO opens with clean video before copy', preview.introState === 'preview'
        && preview.overlayOpacity <= .05
        && preview.contentOpacity <= .05
        && preview.videoOpacity >= .95, preview);
    }
    await page.waitForFunction(() => document.querySelector('.hero')?.dataset.introState === 'ready', null, { timeout: 5000 });
    await page.waitForTimeout(900);

    const metrics = await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      const video = document.querySelector('[data-hero-video]');
      const shelfMarquee = document.querySelector('[data-shelf-marquee]');
      const approach = document.querySelector('#approach');
      const heroRect = hero.getBoundingClientRect();
      const contentRect = hero.querySelector('.hero__content').getBoundingClientRect();
      const shelfRect = shelfMarquee.getBoundingClientRect();
      const approachRect = approach.getBoundingClientRect();
      const titleRect = hero.querySelector('#hero-title').getBoundingClientRect();
      const intro = hero.querySelector('.hero__intro');
      const introRect = intro.getBoundingClientRect();
      const introStyle = getComputedStyle(intro);
      const visibleContent = [...hero.querySelectorAll('#hero-title, .hero__intro')];
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
        hero: { width: heroRect.width, height: heroRect.height },
        composition: {
          titleTop: titleRect.top - heroRect.top,
          titleLeft: titleRect.left - heroRect.left,
          introLeft: introRect.left - heroRect.left,
          introWidth: introRect.width,
          introLines: (() => {
            const range = document.createRange();
            range.selectNodeContents(hero.querySelector('.hero__intro'));
            return range.getClientRects().length;
          })(),
          introRightGapToContent: contentRect.right - introRect.right,
          introLineHeightRatio: Number.parseFloat(introStyle.lineHeight) / Number.parseFloat(introStyle.fontSize),
          ctaCount: hero.querySelectorAll('a, button').length,
          trainingLinkCount: hero.querySelectorAll('a[href*="/study"], .hero__text-link').length,
        },
        overlay: getComputedStyle(hero, '::after').backgroundColor,
        overlayOpacity: getComputedStyle(hero, '::after').opacity,
        contentOpacity: getComputedStyle(hero.querySelector('.hero__content')).opacity,
        introState: hero.dataset.introState,
        heroBackgroundImage: getComputedStyle(hero).backgroundImage,
        contentInside: visibleContent.every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left >= heroRect.left - 1 && rect.right <= heroRect.right + 1
            && rect.top >= heroRect.top - 1 && rect.bottom <= heroRect.bottom + 1;
        }),
        title: document.querySelector('#hero-title').textContent.replace(/\s+/g, ' ').trim(),
        titleLines: document.querySelectorAll('#hero-title > span').length,
        titleSize: Number.parseFloat(getComputedStyle(document.querySelector('#hero-title')).fontSize),
        video: {
          src: video.currentSrc || video.src,
          poster: video.poster,
          autoplay: video.autoplay,
          muted: video.muted,
          defaultMuted: video.defaultMuted,
          volume: video.volume,
          loop: video.loop,
          playsInline: video.playsInline,
          paused: video.paused,
          controls: video.controls,
          preload: video.preload,
          objectFit: getComputedStyle(video).objectFit,
        },
        audioControls: hero.querySelectorAll('[data-hero-video-mute], video[controls]').length,
        header: {
          count: document.querySelectorAll('.site-header').length,
          position: getComputedStyle(document.querySelector('.site-header')).position,
        },
        shelfMarquee: {
          label: shelfMarquee.getAttribute('aria-label'),
          logoCount: shelfMarquee.querySelectorAll('.shelf-marquee__logo').length,
          height: shelfRect.height,
          followsHero: Math.abs(shelfRect.top - heroRect.bottom) <= 1,
          precedesApproach: Math.abs(approachRect.top - shelfRect.bottom) <= 1,
          trackTransform: getComputedStyle(shelfMarquee.querySelector('[data-shelf-marquee-track]')).transform,
        },
        h1Count: document.querySelectorAll('h1').length,
      };
    });

    record(`HERO geometry and content at ${item.name}`, metrics.document.scrollWidth === metrics.document.clientWidth
      && metrics.hero.width === metrics.viewport.width
      && metrics.hero.height >= metrics.viewport.height
      && metrics.contentInside
      && metrics.title === 'Создаём бренды, которые выбирают'
      && metrics.titleLines === 4
      && metrics.titleSize >= 42
      && metrics.titleSize <= 64
      && metrics.composition.ctaCount === 0
      && metrics.header.count === 1
      && metrics.header.position === 'fixed'
      && metrics.h1Count === 1, metrics);

    record(`uniform overlay and shelf marquee at ${item.name}`, metrics.overlay === 'rgba(26, 8, 8, 0.5)'
      && metrics.overlayOpacity === '1'
      && metrics.contentOpacity === '1'
      && metrics.introState === 'ready'
      && metrics.shelfMarquee.label === 'Наши бренды на полках'
      && metrics.shelfMarquee.logoCount === 16
      && metrics.shelfMarquee.height >= 60
      && metrics.shelfMarquee.height <= 82
      && metrics.shelfMarquee.followsHero
      && metrics.shelfMarquee.precedesApproach, {
      overlay: metrics.overlay,
      shelfMarquee: metrics.shelfMarquee,
    });

    record(`selected diagonal composition at ${item.name}`, metrics.composition.titleTop >= 90
      && metrics.composition.introWidth <= 288.5
      && Math.abs(metrics.composition.introRightGapToContent) <= 1
      && (item.name !== '390' || metrics.composition.introLines === 2)
      && metrics.composition.introLineHeightRatio >= 1.3
      && metrics.composition.ctaCount === 0
      && metrics.composition.trainingLinkCount === 0, metrics.composition);

    record(`permanent-muted video attributes at ${item.name}`, metrics.video.src === 'https://static.tildacdn.com/vide3864-3162-4733-b066-663966656461/0817.mp4'
      && metrics.video.poster.endsWith('/hero-layout-variants/hero-video-frame.png')
      && metrics.video.autoplay
      && metrics.video.muted
      && metrics.video.defaultMuted
      && metrics.video.volume === 0
      && metrics.video.loop
      && metrics.video.playsInline
      && metrics.video.paused
      && !metrics.video.controls
      && metrics.video.preload === 'auto'
      && metrics.video.objectFit === 'cover'
      && metrics.audioControls === 0, metrics.video);

    record(`no page script errors at ${item.name}`, consoleErrors.length === 0, { consoleErrors });

    if (screenshotCases.has(item.name)) {
      await page.locator('.hero').screenshot({ path: path.join(outputDir, `hero-${item.name}.png`) });
    }

    if (item.name === '390') {
      await page.locator('.shelf-marquee').screenshot({ path: path.join(outputDir, 'shelf-marquee-390.png') });
      await page.evaluate(() => {
        const video = document.querySelector('[data-hero-video]');
        video.muted = false;
        video.volume = 1;
      });
      await page.waitForTimeout(80);
      const forcedMute = await page.evaluate(() => {
        const video = document.querySelector('[data-hero-video]');
        return { muted: video.muted, defaultMuted: video.defaultMuted, volume: video.volume };
      });
      record('programmatic unmute is immediately reversed', forcedMute.muted && forcedMute.defaultMuted && forcedMute.volume === 0, forcedMute);

      await page.evaluate(() => scrollTo(0, document.querySelector('.hero').getBoundingClientRect().height + 120));
      await page.waitForTimeout(260);
      const offscreen = await page.evaluate(() => ({
        paused: document.querySelector('[data-hero-video]').paused,
        headerScrolled: document.querySelector('.site-header').classList.contains('is-scrolled'),
      }));
      record('video pauses offscreen and header changes surface', offscreen.paused && offscreen.headerScrolled, offscreen);

      await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const video = document.querySelector('[data-hero-video]');
        hero.dataset.videoState = 'error';
        video.pause();
      });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(80);
      const fallback = await page.evaluate(() => ({
        videoOpacity: getComputedStyle(document.querySelector('[data-hero-video]')).opacity,
        heroBackgroundImage: getComputedStyle(document.querySelector('.hero')).backgroundImage,
        titleVisible: document.querySelector('#hero-title').getBoundingClientRect().height > 0,
        introVisible: document.querySelector('.hero__intro').getBoundingClientRect().height > 0,
        introState: document.querySelector('.hero').dataset.introState,
        ctaCount: document.querySelector('.hero').querySelectorAll('a, button').length,
      }));
      record('media-error fallback keeps poster and copy without CTA', fallback.videoOpacity === '0'
        && fallback.heroBackgroundImage.includes('hero-video-frame.png')
        && fallback.titleVisible
        && fallback.introVisible
        && fallback.introState === 'ready'
        && fallback.ctaCount === 0, fallback);
    }

    await page.close();
  }

  const reducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reducedPage.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await reducedPage.waitForTimeout(500);
  const reduced = await reducedPage.evaluate(() => {
    const video = document.querySelector('[data-hero-video]');
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      introState: document.querySelector('.hero').dataset.introState,
      poster: video.poster,
    };
  });
  record('reduced motion keeps poster, copy and silent paused video', reduced.matches
    && reduced.paused
    && reduced.muted
    && reduced.volume === 0
    && reduced.introState === 'ready'
    && reduced.poster.endsWith('/hero-layout-variants/hero-video-frame.png'), reduced);
  await reducedPage.close();

  const zoomPage = await browser.newPage({ viewport: { width: 160, height: 422 }, deviceScaleFactor: 2 });
  await zoomPage.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await zoomPage.waitForTimeout(400);
  const zoom = await zoomPage.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('.hero #hero-title, .hero #hero-title > span, .hero__intro')].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
    }).map((node) => ({ tag: node.tagName, text: node.textContent.trim(), rect: node.getBoundingClientRect().toJSON() })),
  }));
  record('200% zoom keeps HERO inside the viewport', zoom.scrollWidth === zoom.clientWidth && zoom.offenders.length === 0, zoom);
  await zoomPage.close();

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.filter((item) => item.pass).length,
      failed: checks.filter((item) => !item.pass).length,
    },
    checks,
  };
  fs.writeFileSync(path.join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ summary: report.summary, failed: checks.filter((item) => !item.pass) }, null, 2));
  if (report.summary.failed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
