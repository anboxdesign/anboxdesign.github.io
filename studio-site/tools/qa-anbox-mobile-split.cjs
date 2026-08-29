const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const file = 'file:///C:/Users/%D0%90%D1%80%D1%82%D1%91%D0%BC/Documents/%D1%81%D0%B0%D0%B9%D1%82/ANBOX-Studio-Tilda-screens-20260824-v4/ANBOX-Studio-all-screens-preview.html';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const qaDir = 'C:/Users/Артём/Documents/сайт/ANBOX-Studio-Tilda-screens-20260824-v4/qa';
fs.mkdirSync(qaDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const widths = [320, 360, 390, 412, 640, 641, 1440];
  const results = [];

  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(file, { waitUntil: 'load' });
    await page.waitForTimeout(700);

    const state = await page.evaluate(() => {
      const visible = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
      const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mobileParts: [...document.querySelectorAll('.anbox-mobile-part')].filter(visible).length,
        desktopParts: [...document.querySelectorAll('[class*="anbox-part-"]')].filter((el) => /(^|\s)anbox-part-\d\d(\s|$)/.test(el.className) && visible(el)).length,
        mobileSections: document.querySelectorAll('.anbox-mobile-main > section').length,
        hasMenu: Boolean(document.querySelector('#mobile-menu')),
        hasContact: Boolean(document.querySelector('.anbox-mobile-part #contact')),
        duplicates,
      };
    });

    if (width <= 640) {
      await page.locator('.anbox-mobile-part .menu-button').click();
      state.menuOpen = await page.locator('#mobile-menu').isVisible();
      state.menuExpanded = await page.locator('.anbox-mobile-part .menu-button').getAttribute('aria-expanded');
      await page.locator('.anbox-mobile-part .menu-close').click();
      state.menuClosed = !(await page.locator('#mobile-menu').isVisible());

      await page.locator('#service-tab-company').click();
      state.serviceTabChanged = await page.locator('#service-tab-company').getAttribute('aria-selected');
      await page.locator('#tab-launch').click();
      state.packageTabChanged = await page.locator('#tab-launch').getAttribute('aria-selected');

      if (width === 390) {
        for (const [name, selector] of [
          ['approach', '.anbox-mobile-part #approach'],
          ['portfolio', '.anbox-mobile-part #work'],
          ['services', '.anbox-mobile-part #services'],
          ['studio', '.anbox-mobile-part #studio'],
          ['contact', '.anbox-mobile-part #contact'],
          ['footer', '.anbox-mobile-part #privacy'],
        ]) {
          await page.locator(selector).screenshot({ path: path.join(qaDir, `mobile-390-${name}.png`) });
        }
      }
    }

    results.push({ width, ...state });
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
