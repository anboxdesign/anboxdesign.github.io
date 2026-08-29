const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Артём/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'ANBOX-Studio-mobile.html');
const baselinePath = path.join(root, 'mobile-redesign-qa', 'baseline', 'baseline-report.json');
const outputDir = path.join(root, 'mobile-redesign-qa', 'final');
const normalWidths = [320, 360, 375, 390, 412, 430, 768];
const screenshotWidths = new Set([320, 390, 430]);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const source = fs.readFileSync(target, 'utf8');
const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const px = (value) => Number.parseFloat(value || '0');

const checks = [];
const record = (name, pass, detail = {}) => checks.push({ name, pass: Boolean(pass), detail });

record('mobile interactions use press states without hover selectors', !/:hover\b/.test(source) && (source.match(/:active\b/g) || []).length >= 10, {
  hoverSelectors: (source.match(/:hover\b/g) || []).length,
  activeSelectors: (source.match(/:active\b/g) || []).length,
});

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });

  const widthReports = {};
  let canonicalInventory;
  let canonicalHero;

  for (const width of normalWidths) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(800);

    if (screenshotWidths.has(width)) {
      await page.screenshot({ path: path.join(outputDir, `full-${width}.png`), fullPage: true });
      for (const [name, selector] of [
        ['hero', '.hero'], ['approach', '#approach'], ['portfolio', '#work'], ['services', '#services'],
        ['packages', '#packages'], ['clients', '.clients'], ['studio', '#studio'],
        ['journal', '.journal'], ['contact', '#contact'], ['footer', '.site-footer'],
      ]) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await page.locator(selector).evaluate(async (node) => {
          const images = [...node.querySelectorAll('img')];
          const loadingStates = images.map((image) => image.loading);
          images.forEach((image) => { image.loading = 'eager'; });
          await Promise.race([
            Promise.all(images.map((image) => image.decode().catch(() => {}))),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
          images.forEach((image, index) => { image.loading = loadingStates[index]; });
        });
        await page.locator(selector).screenshot({ path: path.join(outputDir, `${name}-${width}.png`) });
      }
    }

    await page.evaluate(() => scrollTo(0, 0));

    const metrics = await page.evaluate(() => {
      const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const styles = (selector) => [...document.querySelectorAll(selector)].map((node) => {
        const style = getComputedStyle(node);
        return {
          text: compact(node.textContent).slice(0, 100),
          fontFamily: style.fontFamily,
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseInt(style.fontWeight, 10),
          lineHeight: Number.parseFloat(style.lineHeight),
        };
      });
      const targetNodes = [...document.querySelectorAll('a, button, summary, input:not([type="radio"]):not([type="checkbox"]), select, textarea, .choice, .consent')]
        .filter((node) => !node.matches('.consent a'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
        })
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { text: compact(node.textContent || node.getAttribute('aria-label')).slice(0, 80), width: rect.width, height: rect.height };
        });
      const approach = document.querySelector('#approach');
      const approachCards = [...document.querySelectorAll('.principle')];
      const approachPages = [...document.querySelectorAll('.approach-page')];
      const approachViewport = document.querySelector('.approach-viewport');
      const approachButtons = [...document.querySelectorAll('.approach-button')];
      const viewport = document.querySelector('.case-viewport');
      const caseSlides = [...document.querySelectorAll('.case-slide')];
      const visibleCaseSlides = caseSlides.filter((slide) => !slide.hidden);
      const firstSlide = visibleCaseSlides[0];
      const firstSlideRect = firstSlide.getBoundingClientRect();
      const portfolioMoreButtons = [...document.querySelectorAll('.portfolio-more')];
      const visiblePortfolioMoreButtons = portfolioMoreButtons.filter((button) => !button.closest('[data-portfolio-more-slot]').hidden);
      const portfolioTitleRect = document.querySelector('#work-title').getBoundingClientRect();
      const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
      const founder = document.querySelector('.person-card:first-child').getBoundingClientRect();
      const secondPerson = document.querySelector('.person-card:nth-child(2)').getBoundingClientRect();
      const telegram = document.querySelector('.telegram-card');
      const form = document.querySelector('#project-form');
      const servicesTitleMark = document.querySelector('.services-card .section-title mark');
      return {
        document: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        },
        h2: styles('main .section h2'),
        h3: styles('main .section h3'),
        cardTitles: styles('.audience-card h3, .article-card h3, .news-card h3'),
        approachTitles: styles('.principle__title'),
        body: styles('.section-lead, .case-slide__summary, .package-panel__lead, .package-features li, .training-card__summary, .article-card p'),
        meta: styles('.section-kicker, .audience-card small, .case-slide__meta small, .package-panel__head small, .training-card__tag, .article-card__body small, .news-card__top'),
        actions: styles('.section .button, .package-tab, .case-slide__link'),
        touchTargets: targetNodes,
        approach: {
          height: approach.getBoundingClientRect().height,
          pages: approachPages.length,
          cardsPerPage: approachPages.map((page) => page.querySelectorAll('.principle').length),
          cardCount: approachCards.length,
          internalTabs: approach.querySelectorAll('[role="tab"], [data-approach-tab]').length,
          progressSteps: approach.querySelectorAll('.approach-progress i').length,
          hasIndex: Boolean(approach.querySelector('.principle__index')),
          numbers: [...approach.querySelectorAll('.principle__number')].map((node) => compact(node.textContent)),
          lines: [...approach.querySelectorAll('.principle__line')].map((node) => {
            const rect = node.getBoundingClientRect();
            return { width: rect.width, height: rect.height, background: getComputedStyle(node).backgroundColor };
          }),
          titleBackgrounds: approachCards.map((node) => getComputedStyle(node.querySelector('.principle__title')).backgroundColor),
          paragraphMin: Math.min(...approachCards.map((node) => Number.parseFloat(getComputedStyle(node.querySelector('p')).fontSize))),
          titleMin: Math.min(...approachCards.map((node) => Number.parseFloat(getComputedStyle(node.querySelector('.principle__title')).fontSize))),
          titleMax: Math.max(...approachCards.map((node) => Number.parseFloat(getComputedStyle(node.querySelector('.principle__title')).fontSize))),
          titleLeadingMin: Math.min(...approachCards.map((node) => {
            const style = getComputedStyle(node.querySelector('.principle__title'));
            return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
          })),
          paragraphLeadingMin: Math.min(...approachCards.map((node) => {
            const style = getComputedStyle(node.querySelector('p'));
            return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
          })),
          minTextWidth: Math.min(...approachCards.map((node) => {
            const text = node.querySelector('p');
            const rect = text.getBoundingClientRect();
            const style = getComputedStyle(text);
            return rect.width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) - 2;
          })),
          titleMinHeight: Math.min(...approachCards.map((node) => node.querySelector('.principle__title').getBoundingClientRect().height)),
          titleWidthDeltas: approachCards.map((node) => {
            const card = node.getBoundingClientRect();
            const title = node.querySelector('.principle__title').getBoundingClientRect();
            return Math.abs(card.width - title.width);
          }),
          viewportClientWidth: approachViewport.clientWidth,
          viewportScrollWidth: approachViewport.scrollWidth,
          pageWidths: approachPages.map((page) => page.getBoundingClientRect().width),
          pageHeights: approachPages.map((page) => page.getBoundingClientRect().height),
          controls: approachButtons.map((button) => {
            const rect = button.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
          status: compact(approach.querySelector('.approach-status').textContent),
          lastTitle: compact(approachCards.at(-1)?.querySelector('.principle__title')?.textContent),
        },
        portfolio: {
          slides: caseSlides.length,
          visibleSlides: visibleCaseSlides.length,
          hiddenSlides: caseSlides.filter((slide) => slide.hidden).length,
          sectionLeads: document.querySelectorAll('#work > .shell > .section-lead').length,
          titleToCasesGap: firstSlideRect.top - portfolioTitleRect.bottom,
          viewportClientWidth: viewport.clientWidth,
          viewportScrollWidth: viewport.scrollWidth,
          firstSlideWidth: firstSlideRect.width,
          slideWidths: visibleCaseSlides.map((slide) => slide.getBoundingClientRect().width),
          slideHeights: visibleCaseSlides.map((slide) => slide.getBoundingClientRect().height),
          positions: visibleCaseSlides.map((slide) => getComputedStyle(slide).position),
          stickyTops: visibleCaseSlides.map((slide) => Number.parseFloat(getComputedStyle(slide).top)),
          documentTops: visibleCaseSlides.map((slide) => slide.getBoundingClientRect().top + scrollY),
          availableHeight: innerHeight - headerHeight,
          headerHeight,
          controls: document.querySelectorAll('.carousel-button').length,
          statuses: document.querySelectorAll('.carousel-status').length,
          captions: visibleCaseSlides.filter((slide) => slide.querySelector('.case-slide__caption')).length,
          captionHeights: visibleCaseSlides.map((slide) => slide.querySelector('.case-slide__caption').getBoundingClientRect().height),
          captionTitles: visibleCaseSlides.map((slide) => compact(slide.querySelector('.case-slide__caption h3').textContent)),
          publishedAdditionalTitles: caseSlides.filter((slide) => slide.hasAttribute('data-portfolio-batch') && !slide.hasAttribute('data-portfolio-draft')).map((slide) => compact(slide.querySelector('h3').textContent)),
          reserveSlides: caseSlides.filter((slide) => slide.hasAttribute('data-portfolio-draft')).length,
          works: visibleCaseSlides.map((slide) => compact(slide.querySelector('.case-slide__works')?.textContent)),
          caseLinks: visibleCaseSlides.map((slide) => slide.querySelector('.case-slide__link')).map((link) => ({
            text: compact(link.textContent),
            href: link.href,
            width: link.getBoundingClientRect().width,
            height: link.getBoundingClientRect().height,
          })),
          summaries: document.querySelectorAll('.case-slide__summary').length,
          metaGroups: document.querySelectorAll('.case-slide__meta').length,
          imageLabels: document.querySelectorAll('.case-slide__image figcaption').length,
          more: {
            count: portfolioMoreButtons.length,
            visibleCount: visiblePortfolioMoreButtons.length,
            text: compact(visiblePortfolioMoreButtons[0]?.textContent),
            tag: visiblePortfolioMoreButtons[0]?.tagName,
            ariaDisabledStates: portfolioMoreButtons.map((button) => button.getAttribute('aria-disabled')),
            confirmationStates: portfolioMoreButtons.filter((button) => /добавлен/i.test(button.textContent)).length,
            width: visiblePortfolioMoreButtons[0]?.getBoundingClientRect().width || 0,
            height: visiblePortfolioMoreButtons[0]?.getBoundingClientRect().height || 0,
          },
        },
        services: {
          cards: document.querySelectorAll('.services-card').length,
          cardHeight: document.querySelector('.services-card').getBoundingClientRect().height,
          cardBackground: getComputedStyle(document.querySelector('.services-card')).backgroundColor,
          titleColor: getComputedStyle(document.querySelector('.services-card .section-title')).color,
          titleMarks: document.querySelectorAll('.services-card .section-title mark').length,
          titleMarkBackground: servicesTitleMark ? getComputedStyle(servicesTitleMark).backgroundColor : null,
          activeTabBackground: getComputedStyle(document.querySelector('.service-tab[aria-selected="true"]')).backgroundColor,
          titleSize: Number.parseFloat(getComputedStyle(document.querySelector('.services-card .section-title')).fontSize),
          tabs: document.querySelectorAll('.service-tab').length,
          selectedTabs: document.querySelectorAll('.service-tab[aria-selected="true"]').length,
          visiblePanels: [...document.querySelectorAll('.service-panel')].filter((node) => !node.hidden).length,
          panelItemCounts: [...document.querySelectorAll('.service-panel')].map((panel) => panel.querySelectorAll('.service-list li').length),
          descriptions: document.querySelectorAll('.service-panel p, .service-panel details, .service-panel summary').length,
          itemNames: [...document.querySelectorAll('.service-item__name')].map((node) => compact(node.textContent)),
          itemNameMin: Math.min(...[...document.querySelectorAll('.service-item__name')].map((node) => Number.parseFloat(getComputedStyle(node).fontSize))),
          tabTargets: [...document.querySelectorAll('.service-tab')].map((node) => {
            const rect = node.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
          rowHeights: [...document.querySelectorAll('.service-panel:not([hidden]) .service-list li')].map((node) => node.getBoundingClientRect().height),
          firstRuleWidth: Number.parseFloat(getComputedStyle(document.querySelector('.service-panel:not([hidden]) .service-list')).borderTopWidth),
          internalRuleWidth: Number.parseFloat(getComputedStyle(document.querySelector('.service-panel:not([hidden]) .service-list li')).borderBottomWidth),
          lastRuleWidth: Number.parseFloat(getComputedStyle(document.querySelector('.service-panel:not([hidden]) .service-list li:last-child')).borderBottomWidth),
          ctaGap: document.querySelector('.services-cta').getBoundingClientRect().top - document.querySelector('.service-panel:not([hidden]) .service-list').getBoundingClientRect().bottom,
          ctaBackground: getComputedStyle(document.querySelector('.services-cta')).backgroundColor,
          ctaText: compact(document.querySelector('.services-cta .button').textContent),
        },
        packages: {
          title: compact(document.querySelector('#packages-title').textContent),
          tabs: document.querySelectorAll('.package-tab').length,
          visiblePanels: [...document.querySelectorAll('.package-panel')].filter((node) => getComputedStyle(node).display !== 'none').length,
          customBackground: getComputedStyle(document.querySelector('.custom-package')).backgroundColor,
          customTextColor: getComputedStyle(document.querySelector('.custom-package p')).color,
          bulletCenterOffsets: [...document.querySelectorAll('.package-panel.is-active .package-features li')].map((node) => {
            const bullet = getComputedStyle(node, '::before');
            return Math.abs(Number.parseFloat(bullet.top) - node.getBoundingClientRect().height / 2);
          }),
          bulletTransforms: [...document.querySelectorAll('.package-panel.is-active .package-features li')].map((node) => getComputedStyle(node, '::before').transform),
        },
        clients: {
          logos: document.querySelectorAll('.logo-cell img').length,
          rows: document.querySelectorAll('.logo-row').length,
          rowCounts: [...document.querySelectorAll('.logo-row')].map((row) => row.querySelectorAll('.logo-cell').length),
          headings: document.querySelectorAll('.clients h1, .clients h2, .clients h3, .clients .section-kicker').length,
          rowOverflow: [...document.querySelectorAll('.logo-row')].map((row) => getComputedStyle(row).overflowX),
          trackWidths: [...document.querySelectorAll('.logo-track')].map((track) => track.scrollWidth),
          rowWidths: [...document.querySelectorAll('.logo-row')].map((row) => row.clientWidth),
          cardWidths: [...document.querySelectorAll('.logo-cell')].map((card) => card.getBoundingClientRect().width),
          cardBackgrounds: [...document.querySelectorAll('.logo-cell')].map((card) => getComputedStyle(card).backgroundColor),
          cardBorders: [...document.querySelectorAll('.logo-cell')].map((card) => Number.parseFloat(getComputedStyle(card).borderTopWidth)),
          sectionHeight: document.querySelector('.clients').getBoundingClientRect().height,
        },
        team: {
          people: document.querySelectorAll('.person-card').length,
          founderWidth: founder.width,
          otherWidth: secondPerson.width,
          photos: document.querySelectorAll('.person-photo img').length,
          demoLabels: document.querySelectorAll('.person-photo__badge').length,
          photoFits: [...document.querySelectorAll('.person-photo img')].map((image) => getComputedStyle(image).objectFit),
          names: styles('.person-card h3'),
          roles: styles('.person-card p'),
          captionAlignments: [...document.querySelectorAll('.person-card__caption')].map((caption) => getComputedStyle(caption).textAlign),
          captionPaddingTops: [...document.querySelectorAll('.person-card__caption')].map((caption) => Number.parseFloat(getComputedStyle(caption).paddingTop)),
          photoNameGaps: [...document.querySelectorAll('.person-card')].map((card) => {
            const photo = card.querySelector('.person-photo').getBoundingClientRect();
            const name = card.querySelector('h3').getBoundingClientRect();
            return name.top - photo.bottom;
          }),
          secondaryHeights: [...document.querySelectorAll('.person-card:nth-child(n+2)')].map((card) => card.getBoundingClientRect().height),
          trainingCards: document.querySelectorAll('.training-card').length,
          trainingProgramItems: document.querySelectorAll('.training-program li').length,
          trainingImages: document.querySelectorAll('.training-visual img').length,
          trainingVisualPosition: getComputedStyle(document.querySelector('.training-visual')).position,
          trainingVisualCoverage: (() => {
            const card = document.querySelector('.training-card').getBoundingClientRect();
            const visual = document.querySelector('.training-visual').getBoundingClientRect();
            return { widthDelta: Math.abs(card.width - visual.width), heightDelta: Math.abs(card.height - visual.height) };
          })(),
          trainingProof: compact(document.querySelector('.training-proof')?.textContent),
          trainingSummary: compact(document.querySelector('.training-card__summary')?.textContent),
          trainingCourseLinks: document.querySelectorAll('.training-course-link').length,
          trainingCourseButtons: [...document.querySelectorAll('.training-card > .button')].map((button) => compact(button.textContent)),
        },
        journal: {
          cards: document.querySelectorAll('.journal-grid > a').length,
          nestedLinks: document.querySelectorAll('.journal-grid a a').length,
          label: compact(document.querySelector('.journal .section-kicker')?.textContent),
          sectionTitle: compact(document.querySelector('.journal .section-title')?.textContent),
        },
        contact: {
          telegramBeforeForm: Boolean(telegram && form && (telegram.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING)),
          fieldColumns: getComputedStyle(document.querySelector('.form-grid--two')).gridTemplateColumns.split(' ').length,
          minFieldFont: Math.min(...[...document.querySelectorAll('.field input, .field select, .field textarea')].map((node) => Number.parseFloat(getComputedStyle(node).fontSize))),
          choiceColumns: getComputedStyle(document.querySelector('.choice-grid')).gridTemplateColumns.split(' ').length,
          requiredFieldLabels: [...document.querySelectorAll('.field input:required, .field textarea:required, .field select:required')].map((field) => compact(field.closest('.field')?.querySelector('label')?.textContent)),
          budgetPrompt: document.querySelector('#budget option[value=""]')?.textContent.trim(),
        },
        footer: {
          socialLinks: document.querySelectorAll('.site-footer .socials a').length,
          socialIcons: document.querySelectorAll('.site-footer .socials svg').length,
          socialLabels: [...document.querySelectorAll('.site-footer .socials a')].map((link) => link.getAttribute('aria-label')),
          socialText: [...document.querySelectorAll('.site-footer .socials a')].map((link) => compact(link.textContent)),
          socialSizes: [...document.querySelectorAll('.site-footer .socials a')].map((link) => {
            const rect = link.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
          externalLinksSafe: [...document.querySelectorAll('.site-footer .socials a')].every((link) => link.target === '_blank' && link.relList.contains('noopener')),
          topDisplay: getComputedStyle(document.querySelector('.footer-top')).display,
          policyLinks: document.querySelectorAll('.site-footer .footer-meta a[href="#privacy"]').length,
        },
        hero: (() => {
          const node = document.querySelector('.hero');
          const clone = node.cloneNode(true);
          const video = node.querySelector('[data-hero-video]');
          const title = node.querySelector('#hero-title');
          const primary = node.querySelector('.hero__actions .button');
          const secondary = node.querySelector('.hero__text-link');
          const header = document.querySelector('.site-header');
          const rect = node.getBoundingClientRect();
          const titleRect = title.getBoundingClientRect();
          const primaryRect = primary.getBoundingClientRect();
          const secondaryRect = secondary.getBoundingClientRect();
          clone.removeAttribute('data-video-state');
          return {
            html: clone.outerHTML,
            height: rect.height,
            title: compact(title.textContent),
            titleLines: title.querySelectorAll(':scope > span').length,
            titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
            primaryHref: primary.getAttribute('href'),
            secondaryHref: secondary.href,
            secondaryTarget: secondary.target,
            actionTargets: [primaryRect, secondaryRect].map((item) => ({ width: item.width, height: item.height })),
            contentInside: titleRect.left >= rect.left - 1 && titleRect.right <= rect.right + 1
              && primaryRect.left >= rect.left - 1 && primaryRect.right <= rect.right + 1
              && secondaryRect.left >= rect.left - 1 && secondaryRect.right <= rect.right + 1
              && secondaryRect.bottom <= rect.bottom + 1,
            video: {
              src: video.currentSrc || video.src,
              autoplay: video.autoplay,
              muted: video.muted,
              defaultMuted: video.defaultMuted,
              volume: video.volume,
              loop: video.loop,
              playsInline: video.playsInline,
              preload: video.preload,
              controls: video.controls,
              objectFit: getComputedStyle(video).objectFit,
            },
            audioControls: node.querySelectorAll('[data-hero-video-mute], video[controls]').length,
            duplicateBlocks: node.querySelectorAll('.hero-project, .abx8__visual, .abx8__clients').length,
            documentH1s: document.querySelectorAll('h1').length,
            siteHeaders: document.querySelectorAll('.site-header').length,
            headerPosition: getComputedStyle(header).position,
          };
        })(),
        images: [...document.querySelectorAll('main .section img')].map((node) => ({
          src: node.getAttribute('src'), loading: node.getAttribute('loading'), width: node.getAttribute('width'), height: node.getAttribute('height'),
        })),
      };
    });

    if (width === 390) {
      canonicalHero = metrics.hero;
      canonicalInventory = await page.evaluate(() => Object.fromEntries([
        ['approach', document.querySelector('#approach')], ['portfolio', document.querySelector('#work')],
        ['services', document.querySelector('#services')], ['packages', document.querySelector('#packages')],
        ['clients', document.querySelector('.clients')], ['studio', document.querySelector('#studio')],
        ['journal', document.querySelector('.journal')], ['contact', document.querySelector('#contact')],
      ].map(([key, node]) => [key, {
        headings: [...node.querySelectorAll(key === 'approach' ? 'h2, .principle__title' : 'h2, h3')]
          .filter((item) => !item.closest('[data-portfolio-draft]'))
          .map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
        listItems: key === 'approach'
          ? [...node.querySelectorAll('.principle')].map((item) => `${item.querySelector('.principle__title')?.textContent || ''}${item.querySelector('p')?.textContent || ''}`.replace(/\s+/g, ' ').trim())
          : [...node.querySelectorAll('li')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
        prices: [...node.querySelectorAll('.package-price strong')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
        names: [...node.querySelectorAll('.person-card h3')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
      }])));

      await page.evaluate(() => scrollTo(0, document.querySelector('.hero').getBoundingClientRect().height + 120));
      await page.waitForTimeout(260);
      const heroOffscreenState = await page.evaluate(() => {
        const video = document.querySelector('[data-hero-video]');
        return {
          paused: video.paused,
          muted: video.muted,
          defaultMuted: video.defaultMuted,
          volume: video.volume,
          headerScrolled: document.querySelector('.site-header').classList.contains('is-scrolled'),
        };
      });
      await page.evaluate(() => {
        const video = document.querySelector('[data-hero-video]');
        video.muted = false;
        video.volume = 1;
      });
      await page.waitForTimeout(80);
      const heroForcedMuteState = await page.evaluate(() => {
        const video = document.querySelector('[data-hero-video]');
        return { muted: video.muted, defaultMuted: video.defaultMuted, volume: video.volume };
      });
      record('video pauses offscreen and remains permanently muted', heroOffscreenState.paused
        && heroOffscreenState.muted
        && heroOffscreenState.defaultMuted
        && heroOffscreenState.volume === 0
        && heroOffscreenState.headerScrolled
        && heroForcedMuteState.muted
        && heroForcedMuteState.defaultMuted
        && heroForcedMuteState.volume === 0, { heroOffscreenState, heroForcedMuteState });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(180);

      const approachStatus = await page.locator('[data-approach-current]').textContent();
      await page.locator('[data-approach-next]').click();
      await page.waitForTimeout(500);
      const approachNextStatus = await page.locator('[data-approach-current]').textContent();
      record('Approach next button changes the visible pair', approachStatus === '01' && approachNextStatus === '02', { approachStatus, approachNextStatus });
      await page.locator('#approach').screenshot({ path: path.join(outputDir, 'approach-390-page-02.png') });

      await page.locator('.approach-viewport').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      record('Approach keyboard navigation works', (await page.locator('[data-approach-current]').textContent()) === '03');
      await page.locator('#approach').screenshot({ path: path.join(outputDir, 'approach-390-page-03.png') });

      for (let state = 4; state <= 6; state += 1) {
        await page.locator('[data-approach-next]').click();
        await page.waitForTimeout(350);
        await page.locator('#approach').screenshot({ path: path.join(outputDir, `approach-390-page-${String(state).padStart(2, '0')}.png`) });
      }
      record('Approach reaches the sixth and final thesis', (await page.locator('[data-approach-current]').textContent()) === '06');

      const portfolioStack = await page.evaluate(() => {
        const slides = [...document.querySelectorAll('.case-slide')];
        const secondTop = slides[1].getBoundingClientRect().top + scrollY;
        const before = scrollY;
        scrollTo(0, secondTop - innerHeight * .58);
        return { before, requested: secondTop - innerHeight * .58 };
      });
      await page.waitForTimeout(250);
      const portfolioStackState = await page.evaluate(() => {
        const slides = [...document.querySelectorAll('.case-slide')];
        const first = slides[0].getBoundingClientRect();
        const second = slides[1].getBoundingClientRect();
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const topNode = document.elementFromPoint(innerWidth / 2, Math.min(second.bottom - 2, second.top + 12));
        return {
          scrollY,
          headerBottom: header.bottom,
          first: { top: first.top, bottom: first.bottom },
          second: { top: second.top, bottom: second.bottom },
          secondOnTop: topNode?.closest('.case-slide') === slides[1],
        };
      });
      await page.screenshot({ path: path.join(outputDir, 'portfolio-390-stack.png') });
      record('portfolio uses ordinary vertical document scroll', portfolioStackState.scrollY > portfolioStack.before, { portfolioStack, portfolioStackState });
      record('portfolio next case rises from below and overlays previous', Math.abs(portfolioStackState.first.top - portfolioStackState.headerBottom) <= 1
        && portfolioStackState.second.top > portfolioStackState.headerBottom
        && portfolioStackState.second.top < portfolioStackState.first.bottom
        && portfolioStackState.secondOnTop, portfolioStackState);

      const dockDuringOverlap = await page.evaluate(() => {
        const dock = document.querySelector('[data-portfolio-dock]');
        const rect = dock.getBoundingClientRect();
        return { hidden: dock.hidden, title: dock.querySelector('strong').textContent.trim(), height: rect.height, bottom: rect.bottom, viewportHeight: innerHeight };
      });
      record('portfolio caption remains visible while cases overlap', !dockDuringOverlap.hidden
        && dockDuringOverlap.title === 'Мистраль'
        && dockDuringOverlap.height >= 64
        && Math.abs(dockDuringOverlap.bottom - dockDuringOverlap.viewportHeight) <= 1, dockDuringOverlap);

      await page.evaluate(() => {
        const second = document.querySelectorAll('.case-slide')[1];
        const secondTop = second.getBoundingClientRect().top + scrollY;
        scrollTo(0, secondTop - innerHeight * .42);
      });
      await page.waitForTimeout(120);
      record('portfolio dock switches to the dominant case', (await page.locator('[data-portfolio-dock-title]').textContent()).trim() === 'BEZOOM');

      const revealBatch = async (batch, expectedVisible, expectedFocus, expectedNewTitles) => {
        const button = page.locator(`[data-portfolio-reveal="${batch}"]`);
        await button.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          document.documentElement.style.scrollBehavior = 'auto';
          scrollTo(0, rect.top + scrollY - (innerHeight - rect.height) / 2);
        });
        await page.waitForTimeout(120);
        const scrollBefore = await page.evaluate(() => scrollY);
        await button.click();
        await page.waitForTimeout(180);
        const state = await page.evaluate(() => {
          const slides = [...document.querySelectorAll('.case-slide')];
          const visible = slides.filter((slide) => !slide.hidden);
          const visibleButtons = [...document.querySelectorAll('[data-portfolio-more]')].filter((node) => !node.closest('[data-portfolio-more-slot]').hidden);
          return {
            scrollY,
            visible: visible.length,
            hidden: slides.filter((slide) => slide.hidden).length,
            titles: visible.map((slide) => slide.querySelector('h3').textContent.trim()),
            sticky: visible.every((slide) => getComputedStyle(slide).position === 'sticky'),
            fullHeight: visible.every((slide) => slide.getBoundingClientRect().height >= innerHeight - document.querySelector('.site-header').getBoundingClientRect().height),
            visibleButtons: visibleButtons.length,
            buttonTexts: [...document.querySelectorAll('[data-portfolio-more]')].map((node) => node.textContent.trim()),
            ariaDisabledStates: [...document.querySelectorAll('[data-portfolio-more]')].map((node) => node.getAttribute('aria-disabled')),
            focusedCase: document.activeElement?.id,
            status: document.querySelector('[data-portfolio-load-status]').textContent.trim(),
          };
        });
        record(`portfolio batch ${batch} opens without a confirmation-button state`, state.visible === expectedVisible
          && state.titles.slice(expectedVisible - expectedNewTitles.length).join(',') === expectedNewTitles.join(',')
          && state.sticky
          && state.fullHeight
          && state.buttonTexts.every((text) => text === 'Смотреть ещё кейсы')
          && state.ariaDisabledStates.every((value) => value === null)
          && state.focusedCase === expectedFocus
          && state.status.includes(expectedNewTitles[0])
          && Math.abs(state.scrollY - scrollBefore) <= 1, { scrollBefore, state });
        return state;
      };

      const batchTwoState = await revealBatch(2, 10, 'portfolio-case-06', ['KRUNO', 'CLARETTE', 'Plantago', 'Remarine', 'Beauty Bite']);
      record('portfolio offers the third batch only after the second batch', batchTwoState.visibleButtons === 1);

      await page.evaluate(() => {
        const sixth = document.querySelector('#portfolio-case-06');
        const sixthTop = sixth.getBoundingClientRect().top + scrollY;
        const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
        document.documentElement.style.scrollBehavior = 'auto';
        scrollTo(0, sixthTop - headerHeight + 80);
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outputDir, 'portfolio-390-batch-02.png') });
      record('second portfolio batch reuses the persistent case caption', await page.locator('[data-portfolio-dock]').isVisible()
        && (await page.locator('[data-portfolio-dock-title]').textContent()).trim() === 'KRUNO');

      const batchThreeState = await revealBatch(3, 15, 'portfolio-case-11', ['IRON MAN', 'Баден-Баден', 'НА СПОРТЕ', 'EGO kids', 'COSMOBYR']);
      record('portfolio offers the final batch only after the third batch', batchThreeState.visibleButtons === 1);
      const batchFourState = await revealBatch(4, 16, 'portfolio-case-16', ['Vitaminum']);
      record('portfolio stops after all published cases and keeps four draft reserves hidden', batchFourState.visibleButtons === 0 && batchFourState.hidden === 4);
      await page.screenshot({ path: path.join(outputDir, 'portfolio-390-batch-final.png') });

      await page.locator('#tab-mvp').click();
      record('package tab exposes exactly one panel', await page.locator('.package-panel:visible').count() === 1 && await page.locator('#panel-mvp').isVisible());
      await page.locator('#tab-mvp').focus();
      await page.keyboard.press('ArrowRight');
      record('package keyboard navigation works', await page.locator('#tab-base').getAttribute('aria-selected') === 'true');

      await page.evaluate(() => {
        const section = document.querySelector('[data-logo-marquee]');
        scrollTo(0, section.getBoundingClientRect().top + scrollY - innerHeight * .72);
      });
      await page.waitForTimeout(120);
      const logoMotionBefore = await page.evaluate(() => [...document.querySelectorAll('.logo-track')].map((track) => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41));
      await page.evaluate(() => scrollBy(0, 160));
      await page.waitForTimeout(120);
      const logoMotionAfter = await page.evaluate(() => [...document.querySelectorAll('.logo-track')].map((track) => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41));
      record('client logo rows move in opposite directions on vertical scroll', logoMotionAfter[0] > logoMotionBefore[0] + 1
        && logoMotionAfter[1] < logoMotionBefore[1] - 1, { logoMotionBefore, logoMotionAfter });
      await page.locator('.clients').screenshot({ path: path.join(outputDir, 'clients-390-motion.png') });

      const companyServiceTab = page.locator('#service-tab-company');
      await companyServiceTab.click();
      record('service tab exposes one simple six-item list', await companyServiceTab.getAttribute('aria-selected') === 'true'
        && await page.locator('.service-panel:not([hidden])').count() === 1
        && await page.locator('#service-panel-company:not([hidden]) .service-list li').count() === 6
        && await page.locator('.service-panel p, .service-panel details').count() === 0);
      await companyServiceTab.focus();
      await page.keyboard.press('ArrowLeft');
      record('service tab keyboard navigation works', await page.locator('#service-tab-product').getAttribute('aria-selected') === 'true');

      await page.locator('.menu-button').click();
      record('menu opens and moves focus', await page.locator('#mobile-menu').isVisible() && await page.evaluate(() => document.activeElement?.classList.contains('menu-close')));
      await page.keyboard.press('Escape');
      record('menu closes with Escape and returns focus', await page.locator('#mobile-menu').isHidden() && await page.evaluate(() => document.activeElement?.classList.contains('menu-button')));
    }

    widthReports[width] = metrics;
    record(`no document horizontal overflow at ${width}px`, metrics.document.scrollWidth === metrics.document.clientWidth, metrics.document);
    record(`H2 scale at ${width}px`, metrics.h2.every((item) => item.fontSize >= 24 && item.fontSize <= 28 && item.lineHeight / item.fontSize >= 1.05 && item.lineHeight / item.fontSize <= 1.15), metrics.h2);
    record(`H3 ceiling and Onest at ${width}px`, metrics.h3.every((item) => item.fontSize <= 24 && item.fontFamily.toLowerCase().includes('onest')), metrics.h3);
    record(`card-title scale at ${width}px`, metrics.cardTitles.every((item) => item.fontSize >= 17 && item.fontSize <= 20), metrics.cardTitles);
    record(`Approach title hierarchy at ${width}px`, metrics.approachTitles.every((item) => item.fontSize >= 15 && item.fontSize <= 16 && item.lineHeight / item.fontSize >= 1.15), {
      titles: metrics.approachTitles,
    });
    record(`body scale and 1.1 leading at ${width}px`, metrics.body.every((item) => item.fontSize >= 15 && item.fontSize <= 17 && Math.abs(item.lineHeight / item.fontSize - 1.1) <= 0.015), metrics.body);
    record(`meta scale at ${width}px`, metrics.meta.every((item) => item.fontSize >= 12 && item.fontSize <= 13), metrics.meta);
    record(`action scale at ${width}px`, metrics.actions.every((item) => item.fontSize >= 15 && item.fontSize <= 16), metrics.actions);
    record(`touch targets at ${width}px`, metrics.touchTargets.every((item) => item.width >= 44 && item.height >= 44), metrics.touchTargets.filter((item) => item.width < 44 || item.height < 44));
    record(`Approach uses six one-thesis pages at ${width}px`, metrics.approach.pages === 6
      && metrics.approach.cardsPerPage.every((count) => count === 1)
      && metrics.approach.cardCount === 6
      && metrics.approach.internalTabs === 0
      && metrics.approach.progressSteps === 6
      && !metrics.approach.hasIndex
      && metrics.approach.numbers.join(',') === '01,02,03,04,05,06'
      && metrics.approach.lines.every((line) => line.width === 28 && line.height === 2 && line.background !== 'rgba(0, 0, 0, 0)')
      && metrics.approach.titleBackgrounds.every((background) => background === 'rgba(0, 0, 0, 0)')
      && metrics.approach.paragraphMin >= 15
      && metrics.approach.titleMin >= 15
      && metrics.approach.titleMax <= 16
      && metrics.approach.titleLeadingMin >= 1.18
      && Math.abs(metrics.approach.paragraphLeadingMin - 1.1) <= 0.015
      && metrics.approach.minTextWidth >= 230
      && metrics.approach.titleMinHeight >= 17
      && metrics.approach.titleWidthDeltas.every((delta) => delta <= 1)
      && metrics.approach.viewportScrollWidth > metrics.approach.viewportClientWidth
      && metrics.approach.pageWidths.every((pageWidth) => Math.abs(pageWidth - metrics.approach.viewportClientWidth) <= 1)
      && Math.max(...metrics.approach.pageHeights) - Math.min(...metrics.approach.pageHeights) <= 1
      && metrics.approach.controls.every((control) => control.width >= 44 && control.height >= 44), metrics.approach);
    record(`Approach closes with production delivery at ${width}px`, metrics.approach.lastTitle === 'От идеи до тиража', metrics.approach);
    record(`portfolio stack at ${width}px`, metrics.portfolio.slides === 20
      && metrics.portfolio.visibleSlides === 5
      && metrics.portfolio.hiddenSlides === 15
      && metrics.portfolio.reserveSlides === 4
      && metrics.portfolio.sectionLeads === 0
      && metrics.portfolio.titleToCasesGap >= 48
      && metrics.portfolio.viewportScrollWidth === metrics.portfolio.viewportClientWidth
      && Math.abs(metrics.portfolio.firstSlideWidth - metrics.portfolio.viewportClientWidth) <= 1
      && metrics.portfolio.slideWidths.every((slideWidth) => Math.abs(slideWidth - metrics.portfolio.viewportClientWidth) <= 1)
      && metrics.portfolio.slideHeights.every((height) => height >= metrics.portfolio.availableHeight)
      && metrics.portfolio.positions.every((position) => position === 'sticky')
      && metrics.portfolio.stickyTops.every((top) => Math.abs(top - metrics.portfolio.headerHeight) <= 1)
      && metrics.portfolio.documentTops.slice(1).every((top, index) => top - metrics.portfolio.documentTops[index] >= metrics.portfolio.slideHeights[index] - 1)
      && metrics.portfolio.controls === 0
      && metrics.portfolio.statuses === 0
      && metrics.portfolio.captions === 5
      && metrics.portfolio.captionHeights.every((height) => height >= 100 && height <= 108)
      && metrics.portfolio.captionTitles.join(',') === 'Мистраль,BEZOOM,Lakom,Schwarz,Purera'
      && metrics.portfolio.publishedAdditionalTitles.join(',') === 'KRUNO,CLARETTE,Plantago,Remarine,Beauty Bite,IRON MAN,Баден-Баден,НА СПОРТЕ,EGO kids,COSMOBYR,Vitaminum'
      && metrics.portfolio.works.length === 5
      && metrics.portfolio.works.every(Boolean)
      && metrics.portfolio.caseLinks.every((link) => link.text === 'Смотреть кейс'
        && link.href === 'https://anboxdesign.ru/more'
        && link.width >= 44
        && link.height >= 44)
      && metrics.portfolio.summaries === 0
      && metrics.portfolio.metaGroups === 0
      && metrics.portfolio.imageLabels === 0
      && metrics.portfolio.more.count === 3
      && metrics.portfolio.more.visibleCount === 1
      && metrics.portfolio.more.text === 'Смотреть ещё кейсы'
      && metrics.portfolio.more.tag === 'BUTTON'
      && metrics.portfolio.more.ariaDisabledStates.every((value) => value === null)
      && metrics.portfolio.more.confirmationStates === 0
      && metrics.portfolio.more.height >= 44, metrics.portfolio);
    record(`services composition at ${width}px`, metrics.services.cards === 1
      && metrics.services.cardHeight >= 600
      && metrics.services.cardHeight < 760
      && metrics.services.cardBackground === 'rgb(255, 255, 255)'
      && metrics.services.titleColor === 'rgb(32, 32, 36)'
      && metrics.services.titleMarks === 0
      && metrics.services.titleMarkBackground === null
      && metrics.services.activeTabBackground === 'rgb(173, 149, 238)'
      && metrics.services.titleSize <= 28
      && metrics.services.tabs === 2
      && metrics.services.selectedTabs === 1
      && metrics.services.visiblePanels === 1
      && metrics.services.panelItemCounts.join(',') === '6,6'
      && metrics.services.descriptions === 0
      && metrics.services.itemNames.join(',') === 'Аналитика,Нейминг,Разработка логотипа,Дизайн упаковки,Сопровождение производства,Инфографика для маркетплейсов,Аналитика,Нейминг,Разработка логотипа,Разработка айдентики,Разработка сайта,Брендбук'
      && metrics.services.itemNameMin >= 15
      && metrics.services.tabTargets.every((target) => target.width >= 44 && target.height >= 44)
      && metrics.services.rowHeights.every((height) => height >= 54)
      && metrics.services.firstRuleWidth === 0
      && metrics.services.internalRuleWidth === 1
      && metrics.services.lastRuleWidth === 0
      && metrics.services.ctaGap >= 24
      && metrics.services.ctaGap <= 32
      && metrics.services.ctaBackground === 'rgba(0, 0, 0, 0)'
      && metrics.services.ctaText === 'Обсудить задачу →', metrics.services);
    record(`packages composition at ${width}px`, metrics.packages.title === 'Выберите готовый пакет.'
      && metrics.packages.tabs === 3
      && metrics.packages.visiblePanels === 1
      && metrics.packages.customBackground === 'rgb(255, 255, 255)'
      && metrics.packages.customTextColor === 'rgb(79, 75, 83)'
      && metrics.packages.bulletCenterOffsets.every((offset) => offset <= 0.5)
      && metrics.packages.bulletTransforms.every((value) => value !== 'none'), metrics.packages);
    record(`clients opposing logo rows at ${width}px`, metrics.clients.logos === 8
      && metrics.clients.rows === 2
      && metrics.clients.rowCounts.join(',') === '4,4'
      && metrics.clients.headings === 0
      && metrics.clients.rowOverflow.every((value) => value === 'clip' || value === 'hidden')
      && metrics.clients.trackWidths.every((trackWidth, index) => trackWidth > metrics.clients.rowWidths[index])
      && Math.max(...metrics.clients.cardWidths) - Math.min(...metrics.clients.cardWidths) <= 1
      && metrics.clients.cardBackgrounds.every((value) => value === 'rgba(0, 0, 0, 0)')
      && metrics.clients.cardBorders.every((value) => value === 0)
      && metrics.clients.sectionHeight <= 212, metrics.clients);
    record(`team photo hierarchy at ${width}px`, metrics.team.people === 3
      && metrics.team.founderWidth > metrics.team.otherWidth
      && metrics.team.photos === 3
      && metrics.team.demoLabels === 3
      && metrics.team.photoFits.every((value) => value === 'cover')
      && metrics.team.names.every((item) => item.fontSize === 16 && Number(item.fontWeight) === 600 && item.lineHeight / item.fontSize >= 1.2)
      && metrics.team.roles.every((item) => item.fontSize === 14 && item.lineHeight / item.fontSize >= 1.38)
      && metrics.team.captionAlignments.every((value) => value === 'left' || value === 'start')
      && metrics.team.captionPaddingTops.every((value) => value === 10)
      && metrics.team.photoNameGaps.every((value) => Math.abs(value - 10) <= .5)
      && Math.max(...metrics.team.secondaryHeights) - Math.min(...metrics.team.secondaryHeights) <= 1
      && metrics.team.trainingCards === 1
      && metrics.team.trainingProgramItems === 0
      && metrics.team.trainingImages === 1
      && metrics.team.trainingVisualPosition === 'absolute'
      && metrics.team.trainingVisualCoverage.widthDelta <= .5
      && metrics.team.trainingVisualCoverage.heightDelta <= .5
      && metrics.team.trainingProof === ''
      && metrics.team.trainingSummary === 'Практический формат для команды: от анализа категории до презентации готовой концепции.'
      && metrics.team.trainingCourseLinks === 0
      && metrics.team.trainingCourseButtons.length === 1
      && metrics.team.trainingCourseButtons[0].startsWith('Перейти на сайт курса'), metrics.team);
    record(`journal link structure at ${width}px`, metrics.journal.cards === 2
      && metrics.journal.nestedLinks === 0
      && metrics.journal.label === '08Блог'
      && metrics.journal.sectionTitle === 'Новости и статьи.', metrics.journal);
    record(`contact flow at ${width}px`, metrics.contact.telegramBeforeForm
      && metrics.contact.fieldColumns === 1
      && metrics.contact.minFieldFont >= 16
      && metrics.contact.choiceColumns <= 2
      && metrics.contact.requiredFieldLabels.join('|') === 'Ваше имя*|E-mail*|Телефон*|О проекте*'
      && metrics.contact.budgetPrompt === 'Выберите вариант', metrics.contact);
    record(`footer icon composition at ${width}px`, metrics.footer.socialLinks === 3
      && metrics.footer.socialIcons === 3
      && metrics.footer.socialLabels.join('|') === 'Telegram|Instagram|Behance'
      && metrics.footer.socialText.every((value) => value === '')
      && metrics.footer.socialSizes.every((size) => size.width >= 44 && size.height >= 44)
      && metrics.footer.externalLinksSafe
      && metrics.footer.topDisplay === 'flex'
      && metrics.footer.policyLinks === 1, metrics.footer);
    record(`responsive images at ${width}px`, metrics.images.every((item) => item.loading === 'lazy' && item.width && item.height), metrics.images.filter((item) => item.loading !== 'lazy' || !item.width || !item.height));

    await page.close();
  }

  for (const width of [320, 390, 430]) {
    const hero = widthReports[width].hero;
    record(`video HERO composition at ${width}px`, hero.height >= 843
      && hero.title === 'Создаём бренды, которые выбирают'
      && hero.titleLines === 4
      && hero.titleSize >= 48
      && hero.titleSize <= 64
      && hero.primaryHref === '#contact'
      && hero.secondaryHref === 'https://anboxdesign.ru/study'
      && hero.secondaryTarget === '_blank'
      && hero.actionTargets.every((target) => target.width >= 44 && target.height >= 44)
      && hero.contentInside
      && hero.video.src === 'https://static.tildacdn.com/vide3864-3162-4733-b066-663966656461/0817.mp4'
      && hero.video.autoplay
      && hero.video.muted
      && hero.video.defaultMuted
      && hero.video.volume === 0
      && hero.video.loop
      && hero.video.playsInline
      && hero.video.preload === 'metadata'
      && !hero.video.controls
      && hero.video.objectFit === 'cover'
      && hero.audioControls === 0
      && hero.duplicateBlocks === 0
      && hero.documentH1s === 1
      && hero.siteHeaders === 1
      && hero.headerPosition === 'fixed', hero);
    record(`Approach is shorter than baseline at ${width}px`, widthReports[width].approach.height < baseline.widths[String(width)].sections.approach.height, {
      before: baseline.widths[String(width)].sections.approach.height,
      after: widthReports[width].approach.height,
    });
  }

  const baselineInventory = baseline.inventory;
  for (const key of Object.keys(canonicalInventory)) {
    for (const field of ['headings', 'listItems', 'prices', 'names']) {
      const before = (baselineInventory[key]?.[field] || []).map(normalize);
      const after = (canonicalInventory[key]?.[field] || []).map(normalize);
      const intentionalApproachOrder = key === 'approach' && (field === 'headings' || field === 'listItems');
      const intentionalPortfolioReduction = key === 'portfolio' && field === 'listItems';
      const intentionalPortfolioExtension = key === 'portfolio' && field === 'headings'
        && JSON.stringify(after.slice(0, before.length)) === JSON.stringify(before)
        && after.slice(before.length).join(',') === 'KRUNO,CLARETTE,Plantago,Remarine,Beauty Bite,IRON MAN,Баден-Баден,НА СПОРТЕ,EGO kids,COSMOBYR,Vitaminum';
      const intentionalServicesComposition = key === 'services' && (
        (field === 'headings' && after.join(',') === 'От отдельной задачи до полного запуска.')
        || (field === 'listItems' && after.join(',') === '01Аналитика,02Нейминг,03Разработка логотипа,04Дизайн упаковки,05Сопровождение производства,06Инфографика для маркетплейсов,01Аналитика,02Нейминг,03Разработка логотипа,04Разработка айдентики,05Разработка сайта,06Брендбук')
      );
      const intentionalPackagesHeading = key === 'packages' && field === 'headings'
        && after.join(',') === 'Выберите готовый пакет.,MVP,BASE,LAUNCH';
      const intentionalPackagesList = key === 'packages' && field === 'listItems'
        && before.length === after.length
        && after.every((item, index) => {
          if (index === 8) return item === 'Дизайн упаковки или носителя';
          if (index === 13) return item === 'Дизайн линейки упаковки';
          return item === before[index];
        });
      const intentionalClientsComposition = key === 'clients' && field === 'headings' && after.length === 0;
      const intentionalStudioHeading = key === 'studio' && (
        (field === 'headings' && after.join('|') === 'Создаём бренды. Обучаем команды.|Анна Плавская|Артем Капустин|Дарья Дарев|Курс-наставничество по дизайну упаковки')
        || (field === 'listItems' && after.length === 0)
      );
      const intentionalJournalHeading = key === 'journal' && field === 'headings'
        && after[0] === 'Новости и статьи.'
        && JSON.stringify(after.slice(1)) === JSON.stringify(before.slice(1));
      const comparableBefore = intentionalApproachOrder ? [...before].sort() : before;
      const comparableAfter = intentionalApproachOrder ? [...after].sort() : after;
      record(`mobile content lock: ${key}.${field}`, JSON.stringify(comparableBefore) === JSON.stringify(comparableAfter)
        || (intentionalPortfolioReduction && after.length === 0)
        || intentionalPortfolioExtension
        || intentionalServicesComposition
        || intentionalPackagesHeading
        || intentionalPackagesList
        || intentionalClientsComposition
        || intentionalStudioHeading
        || intentionalJournalHeading, { before, after, intentionalPortfolioReduction, intentionalPortfolioExtension, intentionalServicesComposition, intentionalPackagesHeading, intentionalPackagesList, intentionalClientsComposition, intentionalStudioHeading, intentionalJournalHeading });
    }
  }

  const zoomPage = await browser.newPage({ viewport: { width: 160, height: 422 }, deviceScaleFactor: 2 });
  await zoomPage.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await zoomPage.waitForTimeout(300);
  const zoomMetrics = await zoomPage.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    wideContainers: [...document.querySelectorAll('body *')].filter((node) => node.scrollWidth > node.clientWidth + 1).slice(0, 30).map((node) => ({
      tag: node.tagName,
      className: typeof node.className === 'string' ? node.className : '',
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      overflowX: getComputedStyle(node).overflowX,
    })),
    viewportOffenders: [...document.querySelectorAll('body *')].filter((node) => {
      if (node.closest('.case-viewport, .approach-viewport, .logo-row')) return false;
      const rect = node.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
    }).slice(0, 30).map((node) => ({
      tag: node.tagName,
      className: typeof node.className === 'string' ? node.className : '',
      text: String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      rect: { left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right },
    })),
    clipped: [...document.querySelectorAll('main *')].filter((node) => {
      const style = getComputedStyle(node);
      return !node.matches('.hero, .hero__video, .article-cover, .case-slide, .case-slide__image, .training-card, .training-visual')
        && style.overflowX === 'hidden' && node.scrollWidth > node.clientWidth + 1;
    }).slice(0, 20).map((node) => ({ tag: node.tagName, className: node.className, delta: node.scrollWidth - node.clientWidth })),
  }));
  await zoomPage.screenshot({ path: path.join(outputDir, 'text-zoom-200-320.png'), fullPage: true });
  record('200% text zoom keeps all screens inside the viewport', zoomMetrics.viewportOffenders.length === 0, zoomMetrics);
  record('200% text zoom has no clipped text containers', zoomMetrics.clipped.length === 0, zoomMetrics.clipped);
  await zoomPage.close();

  const reducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reducedPage.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await reducedPage.evaluate(() => {
    const section = document.querySelector('[data-logo-marquee]');
    scrollTo(0, section.getBoundingClientRect().top + scrollY - innerHeight * .72);
  });
  await reducedPage.waitForTimeout(120);
  const reducedBefore = await reducedPage.evaluate(() => [...document.querySelectorAll('.logo-track')].map((track) => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41));
  await reducedPage.evaluate(() => scrollBy(0, 160));
  await reducedPage.waitForTimeout(120);
  const reduced = await reducedPage.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    trackTransition: getComputedStyle(document.querySelector('.case-track')).transitionDuration,
    logoPositions: [...document.querySelectorAll('.logo-track')].map((track) => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41),
    heroVideoPaused: document.querySelector('[data-hero-video]').paused,
    heroVideoMuted: document.querySelector('[data-hero-video]').muted,
    heroVideoDefaultMuted: document.querySelector('[data-hero-video]').defaultMuted,
    heroVideoVolume: document.querySelector('[data-hero-video]').volume,
  }));
  record('reduced-motion fallback active', reduced.matches
    && Number.parseFloat(reduced.trackTransition) <= 0.00001
    && reduced.heroVideoPaused
    && reduced.heroVideoMuted
    && reduced.heroVideoDefaultMuted
    && reduced.heroVideoVolume === 0
    && reduced.logoPositions.every((value, index) => Math.abs(value - reducedBefore[index]) <= .5), { reducedBefore, reduced });
  await reducedPage.close();

  const previewPage = await browser.newPage({ viewport: { width: 430, height: 844 } });
  await previewPage.goto(pathToFileURL(path.join(root, 'ANBOX-Studio-mobile-preview.html')).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await previewPage.waitForTimeout(400);
  const frame = previewPage.frames().find((item) => item !== previewPage.mainFrame());
  const previewHero = await frame.locator('.hero').evaluate((node) => {
    const clone = node.cloneNode(true);
    clone.removeAttribute('data-video-state');
    return clone.outerHTML;
  });
  const previewSections = await frame.locator('main > section').count();
  record('preview references canonical mobile page', previewHero === canonicalHero.html && previewSections === 9, { previewSections });
  await previewPage.screenshot({ path: path.join(outputDir, 'preview-430.png'), fullPage: true });
  await previewPage.close();

  const successPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await successPage.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await successPage.locator('#name').fill('Тест');
  await successPage.locator('#email').fill('test@example.com');
  await successPage.locator('#phone').fill('+7 999 123-45-67');
  await successPage.locator('#message').fill('Тестовая заявка');
  await successPage.locator('.consent input').check();
  await successPage.locator('#project-form button[type="submit"]').click();
  const successText = normalize(await successPage.locator('#form-success').textContent());
  record('form success explicitly remains a demo state', successText.includes('нужно подключить ваш обработчик заявок'), { successText });
  await successPage.close();

  await browser.close();

  const failed = checks.filter((item) => !item.pass);
  const report = {
    createdAt: new Date().toISOString(),
    target: path.basename(target),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    widthReports,
    checks,
  };
  fs.writeFileSync(path.join(outputDir, 'qa-report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ summary: report.summary, failed }, null, 2)}\n`);
  process.exitCode = failed.length ? 1 : 0;
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
