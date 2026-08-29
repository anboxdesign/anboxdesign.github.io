import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolsDir, '..');
const mobilePath = path.join(root, 'ANBOX-Studio-mobile.html');
const desktopZipPath = path.join(root, 'ANBOX-Studio-desktop-final-20260826.zip');
const desktopDir = path.join(root, 'ANBOX-Studio-desktop-final-20260826');
const specPath = path.join(root, 'ANBOX-Studio-responsive-merge-spec-20260826.md');
const designSystemPath = path.join(root, 'design-system.md');
const bundledTildaSpecPath = path.join(root, 'Tilda_Vibe_Section_Spec.md');
const externalTildaSpecPath = path.resolve(root, '..', '..', 'Downloads', 'Tilda_Vibe_Section_Spec.md');
const tildaSpecPath = fs.existsSync(bundledTildaSpecPath) ? bundledTildaSpecPath : externalTildaSpecPath;
const approachLogoPath = path.join(root, 'assets', 'approach-r-mark.png');
const brandLogoPath = path.join(root, 'assets', 'brand', 'anbox-logo-rgb-dark.svg');
const casesCatalogPath = path.join(root, 'anbox-cases-2026-08-27.json');
const casesAssetDir = path.join(root, 'assets', 'cases');
const outputName = 'ANBOX-Studio-responsive-clean-20260826';
const outputDir = path.join(root, outputName);
const heroRetailLogos = [
  { name: 'Яндекс Лавка', src: 'https://logo-teka.com/wp-content/uploads/2025/11/yandex-lavka-logo.svg' },
  { name: 'Globus', src: 'https://logo-teka.com/wp-content/uploads/2025/08/globus-logo.svg' },
  { name: 'Перекрёсток', src: 'https://logo-teka.com/wp-content/uploads/2025/06/perekrestok-logo.svg' },
  { name: 'Metro Cash & Carry', src: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Metro_Deutschland_Logo_2024.svg' },
  { name: 'Золотое яблоко', src: 'https://logo-teka.com/wp-content/uploads/2025/07/zolotoe-yabloko-horizontal-logo.svg' },
  { name: 'Азбука вкуса', src: 'https://logo-teka.com/wp-content/uploads/2025/07/azbuka-vkusa-horizontal-logo.svg' },
  { name: 'Ozon', src: 'https://logo-teka.com/wp-content/uploads/2025/06/ozon-logo.svg' },
  { name: 'Wildberries', src: 'https://logo-teka.com/wp-content/uploads/2025/06/wildberries-horizontal-logo.svg' },
];

if (path.basename(outputDir) !== outputName || !outputDir.startsWith(`${root}${path.sep}`)) {
  throw new Error(`Unsafe output path: ${outputDir}`);
}

for (const required of [mobilePath, desktopZipPath, desktopDir, specPath, designSystemPath, tildaSpecPath, approachLogoPath, brandLogoPath, casesCatalogPath, casesAssetDir]) {
  if (!fs.existsSync(required)) throw new Error(`Missing source: ${required}`);
}

const mobileSource = fs.readFileSync(mobilePath, 'utf8');
const mobileStyle = mobileSource.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1];
const mobileScripts = [...mobileSource.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
const mobileRuntime = mobileScripts.at(-1)?.[1] || '';
const casesCatalog = JSON.parse(fs.readFileSync(casesCatalogPath, 'utf8'));
const imageTargets = {
  desktop: casesCatalog.imageTargets?.desktop || { width: 1536, height: 1024 },
  mobile: casesCatalog.imageTargets?.mobile || { width: 1080, height: 1350 },
};
const normalizeCaseMedia = (media, target) => {
  const source = media && typeof media === 'object' ? media : {};
  return {
    ...source,
    src: String(source.src || source.url || '').trim(),
    width: Number(source.width) > 0 ? Number(source.width) : Number(target.width),
    height: Number(source.height) > 0 ? Number(source.height) : Number(target.height),
  };
};
const portfolioCases = (casesCatalog.cases || []).map((project) => ({
  ...project,
  desktop: normalizeCaseMedia(project.desktop, imageTargets.desktop),
  mobile: normalizeCaseMedia(project.mobile, imageTargets.mobile),
}));
const heroCaseNumbers = casesCatalog.heroCases || [];

if (!mobileStyle || !mobileRuntime.includes("const opener = document.querySelector('.menu-button')")) {
  throw new Error('Mobile source structure changed: style/runtime markers not found');
}
if (casesCatalog.format !== 'anbox-gallery-cases' || casesCatalog.version !== 5 || portfolioCases.length !== 20 || heroCaseNumbers.length !== 5) {
  throw new Error('Cases catalog structure changed: expected version 5, 20 cases and 5 HERO cases');
}
if (new Set(portfolioCases.map((project) => project.number)).size !== portfolioCases.length
  || portfolioCases.some((project) => !project.desktop.src || !project.mobile.src)
  || heroCaseNumbers.some((number) => !portfolioCases.some((project) => project.number === number && project.onHero))) {
  throw new Error('Cases catalog is inconsistent: duplicate cases, missing images or invalid HERO selection');
}

const blockDefs = [
  { part: '00', output: '00-header.html', desktop: ['00-header.html'], rootClass: 'abh', mobile: 'header' },
  { part: '01', output: '01-hero.html', desktop: ['01-hero.html'], rootClass: 'abh-hero', mobile: 'hero' },
  { part: '02', output: '02-approach.html', desktop: ['02-approach.html'], rootClass: 'anbox-part-02', mobile: 'approach' },
  { part: '03', output: '03B-portfolio.html', desktop: ['03A-portfolio-styles.html', '03B-portfolio-screen.html'], rootClass: 'anbox-part-03', mobile: 'portfolio' },
  { part: '04', output: '04-services.html', desktop: ['04-services.html'], rootClass: 'anbox-part-04', mobile: 'services' },
  { part: '05', output: '05-packages.html', desktop: ['05-packages.html'], rootClass: 'anbox-part-05', mobile: 'packages' },
  { part: '06', output: '06-clients.html', desktop: ['06-clients.html'], rootClass: 'anbox-part-06', mobile: 'clients' },
  { part: '07', output: '07-team-training.html', desktop: ['07-team-training.html'], rootClass: 'anbox-part-07', mobile: 'studio' },
  { part: '08', output: '08-blog.html', desktop: ['08-blog.html'], rootClass: 'anbox-part-08', mobile: 'journal' },
  { part: '09', output: '09-contacts.html', desktop: ['09-contacts.html'], rootClass: 'anbox-part-09', mobile: 'contact' },
  { part: '10', output: '10-footer.html', desktop: ['10-footer.html'], rootClass: 'anbox-part-10', mobile: 'footer' },
];

function stripHtmlComments(value) {
  return value.replace(/<!--[\s\S]*?-->/g, '');
}

function extractBalancedElement(source, startIndex) {
  const open = source.slice(startIndex).match(/^<([a-z][\w:-]*)\b[^>]*>/i);
  if (!open) throw new Error(`Visual root not found at ${startIndex}`);
  const tag = open[1];
  const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  token.lastIndex = startIndex;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    const text = match[0];
    const closing = /^<\//.test(text);
    const selfClosing = /\/>$/.test(text);
    if (closing) depth -= 1;
    else if (!selfClosing) depth += 1;
    if (depth === 0) return { html: source.slice(startIndex, token.lastIndex), end: token.lastIndex };
  }
  throw new Error(`Unclosed root <${tag}>`);
}

function findRootStart(source, rootClass) {
  const pattern = new RegExp(`<(?:div|section|header|footer)\\b[^>]*class=["'][^"']*\\b${rootClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^"']*["'][^>]*>`, 'i');
  const match = pattern.exec(source);
  if (!match) throw new Error(`Desktop root .${rootClass} not found`);
  return match.index;
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = '';
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('Unclosed CSS block');
}

function removeCssComments(source) {
  let result = '';
  let quote = '';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quote) {
      result += char;
      if (char === '\\') {
        result += next || '';
        index += 1;
      } else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    result += char;
  }
  return result;
}

function stripIncompatibleMedia(source, mode) {
  const css = removeCssComments(source);
  let output = '';
  let cursor = 0;
  while (cursor < css.length) {
    const mediaIndex = css.indexOf('@media', cursor);
    if (mediaIndex < 0) {
      output += css.slice(cursor);
      break;
    }
    output += css.slice(cursor, mediaIndex);
    let brace = mediaIndex + 6;
    let quote = '';
    let parens = 0;
    for (; brace < css.length; brace += 1) {
      const char = css[brace];
      if (quote) {
        if (char === '\\') brace += 1;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === '(') parens += 1;
      else if (char === ')') parens -= 1;
      else if (char === '{' && parens === 0) break;
    }
    if (brace >= css.length) {
      output += css.slice(mediaIndex);
      break;
    }
    const end = findMatchingBrace(css, brace);
    const condition = css.slice(mediaIndex + 6, brace).trim();
    const hasCommaBranch = condition.includes(',');
    let drop = false;
    if (!hasCommaBranch && mode === 'desktop') {
      const maximums = [...condition.matchAll(/max-width\s*:\s*([\d.]+)px/gi)].map((match) => Number(match[1]));
      drop = maximums.length > 0 && maximums.every((value) => value <= 640);
    }
    if (!hasCommaBranch && mode === 'mobile') {
      const pixelMinimums = [...condition.matchAll(/min-width\s*:\s*([\d.]+)px/gi)].map((match) => Number(match[1]));
      const remMinimums = [...condition.matchAll(/min-width\s*:\s*([\d.]+)rem/gi)].map((match) => Number(match[1]) * 16);
      const minimums = [...pixelMinimums, ...remMinimums];
      drop = minimums.length > 0 && minimums.every((value) => value >= 641);
    }
    if (!drop) {
      const inner = stripIncompatibleMedia(css.slice(brace + 1, end), mode);
      output += `${css.slice(mediaIndex, brace + 1)}${inner}}`;
    }
    cursor = end + 1;
  }
  return output.replace(/([;{])([-\w]+):\s+/g, '$1$2:');
}

function compactCss(source) {
  const css = removeCssComments(source);
  let output = '';
  let quote = '';
  let whitespace = false;
  // A space before a pseudo selector can be a descendant combinator
  // (for example, `.anbox-part-05 :is(...)`). Trimming around every
  // colon silently changes the selector, so colons stay out of this set.
  const trimAround = new Set(['{', '}', ';', ',', '>']);
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (quote) {
      output += char;
      if (char === '\\') {
        output += css[index + 1] || '';
        index += 1;
      } else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      if (whitespace && output && !trimAround.has(output.at(-1))) output += ' ';
      whitespace = false;
      quote = char;
      output += char;
      continue;
    }
    if (/\s/.test(char)) {
      whitespace = true;
      continue;
    }
    if (trimAround.has(char)) {
      output = output.replace(/\s+$/, '');
      output += char;
      whitespace = false;
      continue;
    }
    if (whitespace && output && !trimAround.has(output.at(-1))) output += ' ';
    whitespace = false;
    output += char;
  }
  return output.trim().replace(/;}/g, '}').replace(/([;{])([-\w]+):\s+/g, '$1$2:');
}

const designColorMap = new Map([
  ['#f3f4f0', 'var(--abx-paper,#f3f4f0)'],
  ['#f5f3ef', 'var(--abx-paper,#f3f4f0)'],
  ['#f7f5f1', 'var(--abx-paper,#f3f4f0)'],
  ['#151716', 'var(--abx-ink,#151716)'],
  ['#161616', 'var(--abx-ink,#151716)'],
  ['#171717', 'var(--abx-ink,#151716)'],
  ['#202024', 'var(--abx-ink,#151716)'],
  ['#ad95ee', 'var(--abx-purple,#ad95ee)'],
  ['#9b7cff', 'var(--abx-purple,#ad95ee)'],
  ['#9f8bd8', 'var(--abx-purple,#ad95ee)'],
  ['#8b67ff', 'var(--abx-purple,#ad95ee)'],
  ['#b29cff', 'var(--abx-purple,#ad95ee)'],
  ['#7658d0', 'var(--abx-purple-strong,#7658d0)'],
  ['#826cff', 'var(--abx-purple-strong,#7658d0)'],
  ['#8f71e6', 'var(--abx-purple-strong,#7658d0)'],
  ['#7462bd', 'var(--abx-purple-strong,#7658d0)'],
  ['#856bc0', 'var(--abx-purple-strong,#7658d0)'],
  ['#6e55c0', 'var(--abx-purple-strong,#7658d0)'],
  ['#7157d8', 'var(--abx-purple-strong,#7658d0)'],
  ['#8d74d2', 'var(--abx-purple-strong,#7658d0)'],
  ['#dde63f', 'var(--abx-lime,#dde63f)'],
  ['#e6ef2f', 'var(--abx-lime,#dde63f)'],
  ['#bec72f', 'var(--abx-lime,#dde63f)'],
  ['#9aa314', 'var(--abx-ink,#151716)'],
]);

function normalizeDesignColors(source) {
  return source.replace(/#[0-9a-f]{6}\b/gi, (color) => designColorMap.get(color.toLowerCase()) || color);
}

function hoistCssImports(source) {
  const imports = [];
  let output = '';
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('@import', cursor);
    if (start < 0) {
      output += source.slice(cursor);
      break;
    }
    output += source.slice(cursor, start);
    let quote = '';
    let round = 0;
    let end = start + 7;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (quote) {
        if (char === '\\') end += 1;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === '(') round += 1;
      else if (char === ')') round -= 1;
      else if (char === ';' && round === 0) break;
    }
    if (end >= source.length) {
      output += source.slice(start);
      break;
    }
    let rule = source.slice(start, end + 1);
    rule = rule.replace(/url\((['"])([\s\S]*?)\1\)/i, (_full, delimiter, url) => {
      return `url(${delimiter}${url.replace(/\s+/g, '')}${delimiter})`;
    }).replace(/\s+/g, ' ').trim();
    if (!imports.includes(rule)) imports.push(rule);
    cursor = end + 1;
  }
  return { css: output, imports };
}

const componentFamilyForPart = {
  '00': 'abh-header',
  '01': 'abh-hero',
  '02': 'abxa8',
  '03': 'anxg',
  '04': 'anxs',
  '05': 'anxp',
  '06': 'anxl',
  '07': 'anxt',
  '08': 'ablog',
  '09': 'abct',
  // Footer intentionally reuses the current contacts family prefix: abct__footer-*.
  '10': 'abct',
};

function splitSelectorList(prelude) {
  const selectors = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let quote = '';
  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') round += 1;
    else if (char === ')') round -= 1;
    else if (char === '[') square += 1;
    else if (char === ']') square -= 1;
    else if (char === ',' && round === 0 && square === 0) {
      selectors.push(prelude.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(prelude.slice(start).trim());
  return selectors.filter(Boolean);
}

function selectorFamilies(selector) {
  const families = new Set();
  const patterns = [
    ['abh-hero', /\.abh-hero(?:\b|__|--)/],
    ['abh-header', /\.abh(?!-hero)(?:\b|__|--)/],
    ['abxa8', /(?:#abx-approach-v8\b|\.abxa8(?:\b|__|--))/],
    ['abx8', /(?:#abx8\b|\.abx8(?:\b|__|--))/],
    ['anxg', /(?:#anxg-gallery\b|\.anxg(?:\b|__|--|-is-))/],
    ['anxs', /(?:#anxs-services\b|\.anxs(?:\b|__|--|-is-|-v\d))/],
    ['anxp', /(?:#anxp-packages\b|\.anxp(?:\b|__|--|-is-))/],
    ['anxl', /(?:#anxl-logos\b|\.anxl(?:\b|__|--|-is-))/],
    ['anxt', /(?:#anxt-team-training\b|\.anxt(?:\b|__|--|-is-))/],
    ['ablog', /(?:#ablog\b|\.ablog(?:\b|__|--|-is-))/],
    ['abct', /(?:#abct-contacts\b|\.abct(?:\b|__|--|-is-))/],
    ['abf', /\.abf(?:\b|__|--|-is-)/],
  ];
  for (const [family, pattern] of patterns) if (pattern.test(selector)) families.add(family);
  return families;
}

function pruneCssForPart(css, part) {
  const currentFamily = componentFamilyForPart[part];
  let output = '';
  let cursor = 0;
  while (cursor < css.length) {
    let quote = '';
    let round = 0;
    let square = 0;
    let boundary = -1;
    let boundaryType = '';
    for (let index = cursor; index < css.length; index += 1) {
      const char = css[index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === '(') round += 1;
      else if (char === ')') round -= 1;
      else if (char === '[') square += 1;
      else if (char === ']') square -= 1;
      else if (round === 0 && square === 0 && (char === ';' || char === '{')) {
        boundary = index;
        boundaryType = char;
        break;
      }
    }
    if (boundary < 0) {
      output += css.slice(cursor);
      break;
    }
    if (boundaryType === ';') {
      output += css.slice(cursor, boundary + 1);
      cursor = boundary + 1;
      continue;
    }
    const prelude = css.slice(cursor, boundary).trim();
    const end = findMatchingBrace(css, boundary);
    const body = css.slice(boundary + 1, end);
    if (/^@(media|supports|container|layer|scope|starting-style)\b/i.test(prelude)) {
      const prunedBody = pruneCssForPart(body, part);
      if (prunedBody.trim()) output += `${prelude}{${prunedBody}}`;
    } else if (prelude.startsWith('@')) {
      output += `${prelude}{${body}}`;
    } else {
      const selectors = splitSelectorList(prelude).filter((selector) => {
        const families = selectorFamilies(selector);
        return families.size === 0 || families.has(currentFamily);
      });
      if (selectors.length) output += `${selectors.join(',')}{${body}}`;
    }
    cursor = end + 1;
  }
  return compactCss(output);
}

function scopeMobileSelector(selector) {
  const value = selector.trim();
  if (!value) return [];
  if (/^body\[data-menu-open=/i.test(value)) return [value];
  if (/^:root\b/.test(value)) return [value.replace(/^:root\b/, '.anbox-mobile-part')];
  if (/^html\b/.test(value)) return [value.replace(/^html\b/, '.anbox-mobile-part')];
  if (/^body\b/.test(value)) return [value.replace(/^body\b/, '.anbox-mobile-part')];
  if (/^\.(?:js|no-js)\b/.test(value)) {
    return [value.replace(/^(\.(?:js|no-js)\b)/, '$1 .anbox-mobile-part')];
  }
  if (/^\.anbox-mobile-part(?:\b|--)/.test(value)) return [value];
  if (/^\*/.test(value)) {
    return [
      value.replace(/^\*/, '.anbox-mobile-part'),
      value.replace(/^\*/, '.anbox-mobile-part *'),
    ];
  }
  return [`.anbox-mobile-part ${value}`];
}

function scopeMobileCss(css) {
  let output = '';
  let cursor = 0;
  while (cursor < css.length) {
    let quote = '';
    let round = 0;
    let square = 0;
    let boundary = -1;
    let boundaryType = '';
    for (let index = cursor; index < css.length; index += 1) {
      const char = css[index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === '(') round += 1;
      else if (char === ')') round -= 1;
      else if (char === '[') square += 1;
      else if (char === ']') square -= 1;
      else if (round === 0 && square === 0 && (char === ';' || char === '{')) {
        boundary = index;
        boundaryType = char;
        break;
      }
    }
    if (boundary < 0) {
      output += css.slice(cursor);
      break;
    }
    if (boundaryType === ';') {
      output += css.slice(cursor, boundary + 1);
      cursor = boundary + 1;
      continue;
    }
    const prelude = css.slice(cursor, boundary).trim();
    const end = findMatchingBrace(css, boundary);
    const body = css.slice(boundary + 1, end);
    if (/^@(media|supports|container|layer|starting-style)\b/i.test(prelude)) {
      output += `${prelude}{${scopeMobileCss(body)}}`;
    } else if (prelude.startsWith('@')) {
      output += `${prelude}{${body}}`;
    } else {
      const selectors = splitSelectorList(prelude).flatMap(scopeMobileSelector);
      if (selectors.length) output += `${selectors.join(',')}{${body}}`;
    }
    cursor = end + 1;
  }
  return compactCss(output);
}

function consolidateCss(chunks, mode) {
  let css = chunks.filter(Boolean).join('\n');
  css = stripIncompatibleMedia(css, mode);
  const hoisted = hoistCssImports(css);
  css = hoisted.css;
  css = normalizeDesignColors(css);
  return compactCss(css);
}

function addRootClasses(markup, rootClass, part) {
  const pattern = new RegExp(`class=(["'])([^"']*\\b${rootClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^"']*)\\1`, 'i');
  return markup.replace(pattern, (_full, quote, classes) => {
    const next = [...new Set(`${classes} anbox-desktop-part anbox-desktop-part--${part}`.trim().split(/\s+/))].join(' ');
    return `class=${quote}${next}${quote}`;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceBalancedInner(markup, pattern, inner) {
  const match = pattern.exec(markup);
  if (!match) throw new Error(`Balanced element not found: ${pattern}`);
  const extracted = extractBalancedElement(markup, match.index);
  const opening = extracted.html.match(/^<([a-z][\w:-]*)\b[^>]*>/i);
  if (!opening) throw new Error(`Opening tag not found: ${pattern}`);
  const tag = opening[1];
  const replacement = `${opening[0]}${inner}</${tag}>`;
  return `${markup.slice(0, match.index)}${replacement}${markup.slice(extracted.end)}`;
}

function caseAlt(project) {
  return project.alt?.trim() || `${project.title}: ${project.works || project.result || project.category || 'кейс ANBOX Studio'}`;
}

function caseMediaStyle(media) {
  const declarations = [];
  const x = Number(media.x ?? 50);
  const y = Number(media.y ?? 50);
  const zoom = Number(media.zoom ?? 1);
  if (x !== 50 || y !== 50) declarations.push(`object-position:${x}% ${y}%`);
  if (zoom !== 1) declarations.push(`transform:scale(${zoom})`);
  return declarations.length ? ` style="${declarations.join(';')}"` : '';
}

function renderCaseImage(media, className, alt, priority = false) {
  const loading = priority ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
  return `<img class="${className}" src="${escapeHtml(media.src)}" alt="${escapeHtml(alt)}" width="${media.width}" height="${media.height}"${caseMediaStyle(media)}${loading}>`;
}

function renderDesktopPortfolio(markup) {
  const nav = portfolioCases.map((project, index) => {
    const active = index === 0 ? ' anxg-is-active' : '';
    const current = index === 0 ? ' aria-current="true"' : '';
    return `<a class="anxg__nav-item${active}" href="#anxg-case-${project.number}" data-anxg-select="${project.number}"${current}><b>${project.number}</b><span>${escapeHtml(project.title)}</span><i aria-hidden="true">↗</i></a>`;
  }).join('');
  const options = portfolioCases.map((project) => `<option value="${project.number}">${project.number} / ${escapeHtml(project.title)}</option>`).join('');
  const cases = portfolioCases.map((project, index) => {
    const active = index === 0 ? ' anxg-is-active' : '';
    const hero = project.onHero ? ' data-anbox-hero="true"' : '';
    const alt = caseAlt(project);
    return `<article id="anxg-case-${project.number}" class="anxg__case${active}" data-anxg-case="${project.number}" data-anbox-case="${project.number}"${hero}><figure class="anxg__media"><div class="anxg__imagebox">${renderCaseImage(project.desktop, 'anxg__cover anxg__cover--desktop', alt)}${renderCaseImage(project.mobile, 'anxg__cover anxg__cover--mobile', alt)}</div><figcaption><span>${project.number}</span><span>${escapeHtml(project.category)}</span></figcaption></figure><footer class="anxg__details"><div class="anxg__identity"><p data-anxg-info>${escapeHtml(project.info)}</p><h3 data-anxg-title>${escapeHtml(project.title)}</h3></div><div class="anxg__data"><small>Что сделали</small><p data-anxg-works>${escapeHtml(project.works || project.result)}</p></div><div class="anxg__data anxg__data--scale"><small>Масштаб</small><strong data-anxg-scale>${escapeHtml(project.scale)}</strong></div><div class="anxg__result"><small>Результат</small><p data-anxg-result>${escapeHtml(project.result)}</p></div></footer></article>`;
  }).join('');
  let result = markup
    .replace(/data-anxg-total=["'][^"']*["']/i, `data-anxg-total="${portfolioCases.length}"`)
    .replace(/data-anxg-current=["'][^"']*["']/i, 'data-anxg-current="01"');
  result = replaceBalancedInner(result, /<div\b[^>]*class=["'][^"']*\banxg__nav-track\b[^"']*["'][^>]*>/i, nav);
  result = replaceBalancedInner(result, /<select\b[^>]*\bdata-anxg-mobile-select\b[^>]*>/i, options);
  result = replaceBalancedInner(result, /<div\b[^>]*class=["'][^"']*\banxg__viewport\b[^"']*["'][^>]*>/i, cases);
  return result;
}

function renderMobilePortfolio(markup) {
  const track = [];
  portfolioCases.forEach((project, index) => {
    const batch = Math.floor(index / 5) + 1;
    const hidden = batch > 1 ? ` id="abm-portfolio-case-${project.number}" data-portfolio-batch="${batch}" hidden tabindex="-1"` : '';
    const hero = project.onHero ? ' data-anbox-hero="true"' : '';
    const alt = caseAlt(project);
    track.push(`<article class="case-slide" style="--abm-case-order:${index + 1}"${hidden} data-anbox-case="${project.number}"${hero}><figure class="case-slide__image">${renderCaseImage(project.mobile, '', alt).replace('class="" ', '')}</figure><footer class="case-slide__caption"><div class="case-slide__copy"><h3>${escapeHtml(project.title)}</h3><p class="case-slide__works">${escapeHtml(project.works || project.result)}</p></div></footer></article>`);
    if ([4, 9, 14].includes(index)) {
      const reveal = batch + 1;
      const controls = portfolioCases.slice(index + 1, index + 6).map((item) => `abm-portfolio-case-${item.number}`).join(' ');
      const isHidden = reveal > 2 ? ' hidden' : '';
      track.push(`<div class="portfolio-more-slot" data-portfolio-more-slot data-portfolio-gate="${reveal}"${isHidden}><button class="portfolio-more" id="abm-portfolio-more-button-${String(reveal).padStart(2, '0')}" type="button" data-portfolio-more data-portfolio-reveal="${reveal}" aria-controls="${controls}">Смотреть ещё кейсы</button></div>`);
    }
  });
  const first = portfolioCases[0];
  let result = replaceBalancedInner(markup, /<div\b[^>]*class=["'][^"']*\bcase-track\b[^"']*["'][^>]*>/i, track.join(''));
  result = replaceBalancedInner(result, /<div\b[^>]*class=["'][^"']*\bportfolio-caption-dock\b[^"']*["'][^>]*>/i, `<div class="portfolio-caption-dock__copy"><strong data-portfolio-dock-title>${escapeHtml(first.title)}</strong><span data-portfolio-dock-works>${escapeHtml(first.works || first.result)}</span></div>`);
  return result;
}

function heroMeta(project) {
  const parts = String(project.works || project.result || project.category).split('·').map((part) => part.trim()).filter(Boolean);
  return parts.slice(0, 2).join(' · ');
}

function heroRetailLogoImages(className, duplicate = false) {
  return heroRetailLogos.map((logo) => `<img class="${className}" src="${logo.src}" alt="${duplicate ? '' : `Логотип ${escapeHtml(logo.name)}`}" width="212" height="82"${duplicate ? '' : ' decoding="async"'}${className === 'shelf-marquee__logo' ? ' loading="lazy"' : ''}>`).join('');
}

function renderDesktopHeroShelf(markup) {
  const firstGroup = `<div class="abh-hero__shelf-group">${heroRetailLogos.map((logo) => `<span class="abh-hero__brand"><img src="${logo.src}" alt="Логотип ${escapeHtml(logo.name)}" width="212" height="82" decoding="async"></span>`).join('')}</div>`;
  const duplicateGroup = `<div class="abh-hero__shelf-group" aria-hidden="true">${heroRetailLogos.map((logo) => `<span class="abh-hero__brand"><img src="${logo.src}" alt="" width="212" height="82"></span>`).join('')}</div>`;
  return replaceBalancedInner(markup, /<div\b[^>]*class=["'][^"']*\babh-hero__shelf-track\b[^"']*["'][^>]*>/i, `${firstGroup}${duplicateGroup.repeat(2)}`);
}

function renderMobileHeroShelf(markup) {
  const label = '<span class="shelf-marquee__label">Наши работы на полках:</span>';
  const firstSequence = `<div class="shelf-marquee__sequence" data-shelf-marquee-sequence>${label}${heroRetailLogoImages('shelf-marquee__logo')}</div>`;
  const duplicateSequence = `<div class="shelf-marquee__sequence" aria-hidden="true">${label}${heroRetailLogoImages('shelf-marquee__logo', true)}</div>`;
  let result = replaceBalancedInner(markup, /<div\b[^>]*class=["'][^"']*\bshelf-marquee__track\b[^"']*["'][^>]*>/i, `${firstSequence}${duplicateSequence}`);
  result = result.replace('aria-label="Логотипы брендов, созданных ANBOX Studio"', 'aria-label="Магазины, где представлены проекты ANBOX Studio"');
  return result;
}

function renderDesktopHero(markup) {
  const projects = heroCaseNumbers.map((number) => portfolioCases.find((project) => project.number === number));
  if (projects.some((project) => !project)) throw new Error('HERO references a case missing from the catalog');
  const slides = projects.map((project, index) => `<article class="abh-hero__slide${index === 0 ? ' is-active' : ''}" data-anbox-case="${project.number}" data-title="${escapeHtml(project.title)}" data-meta="${escapeHtml(heroMeta(project))}" data-link="#anxg-case-${project.number}">${renderCaseImage(project.desktop, '', caseAlt(project), index === 0).replace('class="" ', '')}</article>`).join('');
  const dots = projects.map((_project, index) => `<button class="abh-hero__dot${index === 0 ? ' is-active' : ''}" data-dot="${index}" aria-label="Проект ${index + 1}"></button>`).join('');
  const first = projects[0];
  let result = markup.replace(/<article\b[^>]*class=["'][^"']*\babh-hero__slide\b[^"']*["'][\s\S]*?(?=<div\b[^>]*class=["'][^"']*\babh-hero__project\b)/i, slides);
  result = replaceBalancedInner(result, /<div\b[^>]*class=["'][^"']*\babh-hero__dots\b[^"']*["'][^>]*>/i, dots);
  result = result
    .replace(/(<strong\b[^>]*\bdata-project-title\b[^>]*>)[\s\S]*?(<\/strong>)/i, `$1${escapeHtml(first.title)}$2`)
    .replace(/(<small\b[^>]*\bdata-project-meta\b[^>]*>)[\s\S]*?(<\/small>)/i, `$1${escapeHtml(heroMeta(first))}$2`)
    .replace(/(<a\b[^>]*\bdata-project-link\b[^>]*\bhref=)["'][^"']*["']/i, `$1"#anxg-case-${first.number}"`);
  return renderDesktopHeroShelf(result);
}

function addPortfolioCaseHandles(markup, mode) {
  let index = 0;
  const pattern = mode === 'desktop'
    ? /<([a-z][\w:-]*)\b([^>]*\bdata-anxg-case\b[^>]*)>/gi
    : /<article\b([^>]*\bclass=["'][^"']*\bcase-slide\b[^"']*["'][^>]*)>/gi;
  return markup.replace(pattern, (full, tagOrAttrs, maybeAttrs) => {
    if (/\bdata-anbox-case\s*=/i.test(full)) return full;
    index += 1;
    const handle = `data-anbox-case="${String(index).padStart(2, '0')}"`;
    if (mode === 'desktop') return `<${tagOrAttrs}${maybeAttrs} ${handle}>`;
    return `<article${tagOrAttrs} ${handle}>`;
  });
}

function synchronizeBlogFeed(markup) {
  return markup.replace(
    /(<aside\b[^>]*\bclass=["'][^"']*\bablog__feed\b[^"']*["'][^>]*>)([\s\S]*?)(<\/aside>)/i,
    (full, open, body, close) => {
      if (body.includes('ablog__feed-intro') || body.includes('ablog__feed-bottom')) return full;
      const topicsIndex = body.search(/<ul\b[^>]*\bclass=["'][^"']*\bablog__topics\b/i);
      if (topicsIndex < 0) return full;
      const intro = body.slice(0, topicsIndex).trim();
      const bottom = body.slice(topicsIndex).trim();
      return `${open}\n        <div class="ablog__feed-intro">\n${intro}\n        </div>\n        <div class="ablog__feed-bottom">\n${bottom}\n        </div>\n      ${close}`;
    },
  );
}

const contactActionArrow = '<svg class="abct__action-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 6l6 6-6 6"></path></svg>';
const contactSuccessMarkup = `<div class="js-successbox t-form__successbox abct__success" role="status" aria-live="polite" aria-hidden="true" tabindex="-1" style="display:none">
              <p class="abct__success-status"><span aria-hidden="true"></span>Заявка отправлена</p>
              <div class="abct__success-copy">
                <span class="abct__success-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M14 25.5 21 32l14-16"></path></svg></span>
                <strong>Спасибо!</strong>
                <p>Мы получили вашу заявку и свяжемся с вами в ближайшее время.</p>
              </div>
              <div class="abct__success-actions">
                <a class="abct__success-primary" href="#anxg-gallery"><span>Смотреть кейсы</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 6l6 6-6 6"></path></svg></a>
                <a class="abct__success-secondary" href="https://t.me/anbox_design" target="_blank" rel="noopener"><span>Написать в Telegram</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 6l6 6-6 6"></path></svg></a>
              </div>
            </div>`;

function normalizeContactActionArrows(markup) {
  let result = markup;
  for (const className of ['abct__submit', 'abct__direct-note']) {
    const control = new RegExp(`(<(?:button|a)\\b[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?)<i\\b[^>]*\\baria-hidden=["']true["'][^>]*>\\s*[→↗]\\s*<\\/i>`, 'i');
    result = result.replace(control, `$1${contactActionArrow}`);
  }
  return result;
}

function normalizeContactStates(markup) {
  return markup
    .replace(/<div\b[^>]*\bclass=["'][^"']*\babct__success\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i, contactSuccessMarkup)
    .replace('<input type="checkbox" name="Согласие"', '<input id="abct-consent" type="checkbox" name="Согласие" aria-describedby="abct-consent-error"')
    .replace('<span class="t-input-error abct__consent-error" aria-live="polite"></span>', '<span id="abct-consent-error" class="t-input-error abct__consent-error" role="alert" aria-live="polite"></span>');
}

function normalizeDesktopHeroHeading(markup) {
  const converted = markup.replace(
    /<h1\b(?=[^>]*\bclass=["'][^"']*\babh-hero__title\b[^"']*["'])[^>]*>/i,
    (tag) => tag.replace(/^<h1/i, '<div').replace(/>$/, ' role="heading" aria-level="1">'),
  );
  if (converted === markup) throw new Error('Desktop HERO H1 was not found');
  return converted.replace('</h1>', '</div>');
}

function unlockDesktopTeamPortraits(markup) {
  return markup.replace(/\s+anxt__portrait--placeholder\b/g, '');
}

function headerVisibilityRuntime(targetExpression, syncSurface = false) {
  return `(function(){var h=${targetExpression};if(!h||h.dataset.anboxScrollHeader==='1')return;h.dataset.anboxScrollHeader='1';var previous=Math.max(window.scrollY,0),travel=0,frame=0;function sync(){var current=Math.max(window.scrollY,0),delta=current-previous;if(${syncSurface ? 'true' : 'false'})h.classList.toggle('is-scrolled',current>12);if(current<=12||document.body.dataset.menuOpen==='true'||h.querySelector('.is-open')){h.classList.remove('is-hidden');travel=0}else if(delta>0){travel=travel<0?delta:travel+delta;if(travel>=16)h.classList.add('is-hidden')}else if(delta<0){travel=travel>0?delta:travel+delta;if(travel<=-10)h.classList.remove('is-hidden')}previous=current;frame=0}function schedule(){if(!frame)frame=requestAnimationFrame(sync)}window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});h.addEventListener('focusin',function(){h.classList.remove('is-hidden')});sync()})();`;
}

function gateDesktopScript(code, part, index) {
  let runtime = code.trim();
  if (!runtime) return '';
  if (/querySelectorAll\("#anxg-gallery \[data-anxg-scale\]"\)/.test(runtime)) {
    runtime = '(function(){var root=document.getElementById("anxg-gallery");if(!root)return;root.querySelectorAll("[data-anxg-scale]").forEach(function(t){var e=t.textContent.match(/\\d+\\+?\\s*SKU/i);e&&(t.textContent=e[0].replace(/sku/i,"SKU"))})})();';
  }
  if (part === '09') {
    runtime = runtime
      .replace('setFieldError(input, valid ? "" : "Заполните обязательное поле");', 'setFieldError(input, valid ? "" : (input.closest(".abct__consent") ? "Пожалуйста, подтвердите ознакомление" : "Заполните обязательное поле"));')
      .replace('    abctTypography(root);', `    if (form) {
      var success = form.querySelector(".abct__success");
      var formBody = form.querySelector(".abct__form-body");
      form.addEventListener("tildaform:aftersuccess", function () {
        if (!success || form.dataset.abctSuccess === "1") return;
        form.dataset.abctSuccess = "1";
        success.setAttribute("aria-hidden", "false");
        if (formBody) formBody.setAttribute("aria-hidden", "true");
        if (submit) submit.setAttribute("disabled", "disabled");
        if (typeof success.focus === "function") success.focus({ preventScroll: true });
      });
    }

    abctTypography(root);`);
  }
  return `<script data-anbox-desktop-runtime="${part}-${index}">\n(function(){\n  var query=window.matchMedia('(min-width:641px)');\n  var started=false;\n  function start(){\n    if(started||!query.matches)return;\n    started=true;\n    ${runtime}\n  }\n  start();\n  if(query.addEventListener)query.addEventListener('change',start);\n  else if(query.addListener)query.addListener(start);\n})();\n</script>`;
}

function desktopHighlightCss(part) {
  const selectors = {
    '05': '.anbox-part-05 #anxp-packages .anxp__highlight',
    '08': '.anbox-part-08 #ablog .ablog__intro h2 span',
  };
  const selector = selectors[part];
  return selector ? `@media(min-width:641px){${selector}{padding:.03em .14em .07em!important;margin-inline:-.14em!important;-webkit-box-decoration-break:clone!important;box-decoration-break:clone!important}}` : '';
}

function finalDesktopCss(part) {
  if (part === '00') {
    return `@media(min-width:641px){
.anbox-desktop-part--00.abh{position:fixed!important;z-index:900!important;inset:0 0 auto!important;width:100%!important;height:82px!important;pointer-events:none;transform:translateY(0);transition:transform 240ms cubic-bezier(.16,1,.3,1),background-color 180ms cubic-bezier(.22,1,.36,1),border-color 180ms cubic-bezier(.22,1,.36,1)}
.anbox-desktop-part--00.abh .abh__desktop{pointer-events:auto}
.anbox-desktop-part--00.abh.is-scrolled{border-bottom:1px solid rgba(21,23,22,.1);background:rgba(243,244,240,.94);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.anbox-desktop-part--00.abh.is-hidden{transform:translateY(-100%)}
.anbox-desktop-part--00 .abh__desktop .abh__cta span{display:none!important}
}
@media(min-width:1025px){
.anbox-desktop-part--00 .abh__desktop{display:grid;grid-template-columns:154px repeat(7,max-content);align-items:end;justify-content:space-between;column-gap:0}
.anbox-desktop-part--00 .abh__desktop .abh__logo{display:block!important;padding-bottom:8px}
.anbox-desktop-part--00 .abh__desktop .abh__cta{display:inline-flex!important;gap:0!important;padding:10px 0 8px!important}
.anbox-desktop-part--00 .abh__desktop .abh__tablet-button{display:none!important}
.anbox-desktop-part--00 .abh__desktop .abh__nav{position:static!important;inset:auto!important;width:auto!important;margin:0!important;padding:0!important;display:contents!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
.anbox-desktop-part--00 .abh__desktop .abh__nav a{padding:10px 0!important;border:0!important}
}
@media(prefers-reduced-motion:reduce){
.anbox-desktop-part--00.abh{transition:none!important}
}`;
  }
  if (part === '01') {
    return `.anbox-desktop-part--01 .abh-hero__shelf-track{width:max-content!important;display:flex!important;animation:abh-retail-shelf 32s linear infinite!important}.anbox-desktop-part--01 .abh-hero__shelf-group{width:auto!important;padding:0 24px!important;display:flex!important;grid-template-columns:none!important;flex:0 0 auto!important;gap:48px!important}.anbox-desktop-part--01 .abh-hero__brand{padding:0!important}.anbox-desktop-part--01 .abh-hero__brand img{width:auto!important;max-width:180px!important;height:32px!important}.anbox-desktop-part--01 .abh-hero__brand:first-child img{transform:translateY(-2px)}.anbox-desktop-part--01 .abh-hero__brand:nth-child(2) img{height:46px!important}.anbox-desktop-part--01 .abh-hero__brand:nth-child(7) img{height:25px!important}.anbox-desktop-part--01 .abh-hero__brand:nth-child(8) img{height:23px!important}@keyframes abh-retail-shelf{from{transform:translate3d(0,0,0)}to{transform:translate3d(-33.333333%,0,0)}}`;
  }
  if (part === '02') {
    return `.anbox-part-02 #abx-approach-v8 .abxa8__card:nth-child(2) .abxa8__seal{filter:brightness(0) invert(1)!important}`;
  }
  if (part === '03') {
    return `@media(min-width:1025px){
.anbox-part-03{box-sizing:border-box;overflow-x:clip!important;overflow-y:visible!important;padding-bottom:clamp(64px,4.167vw,160px);background:var(--anbox-graphite,#202123)!important}
.anbox-part-03 #anxg-gallery{--anxg-case-media-height:38.2vw;--anxg-details-height:clamp(124px,7vw,140px);--anxg-stage-height:calc(var(--anxg-case-media-height) + var(--anxg-details-height) + var(--anbox-grid-gap));--anxg-sticky-dwell:100svh;position:relative;z-index:901;min-height:calc(var(--anxg-stage-height) + var(--anxg-sticky-dwell))!important;padding-block:0!important;overflow:visible!important}
.anbox-part-03 #anxg-gallery .anxg__stage{position:sticky!important;top:max(12px,calc((100svh - var(--anxg-stage-height))/2))!important;height:var(--anxg-stage-height)!important;min-height:0!important;max-height:none!important;padding-block:0!important}
.anbox-part-03 #anxg-gallery .anxg__viewport,.anbox-part-03 #anxg-gallery .anxg__case{height:100%!important}
.anbox-part-03 #anxg-gallery .anxg__case{grid-template-rows:var(--anxg-case-media-height) var(--anxg-details-height)!important;row-gap:var(--anbox-grid-gap)!important}
.anbox-part-03 #anxg-gallery .anxg__media,.anbox-part-03 #anxg-gallery .anxg__imagebox{width:100%!important;min-width:0!important;height:var(--anxg-case-media-height)!important;aspect-ratio:3/2!important}
.anbox-part-03 #anxg-gallery .anxg__details{height:var(--anxg-details-height)!important;min-height:0!important;padding:16px 18px!important;grid-template-rows:auto auto!important;row-gap:0!important;align-content:start!important;overflow:hidden!important}
.anbox-part-03 #anxg-gallery .anxg__data:not(.anxg__data--scale){position:absolute!important;right:197px!important;bottom:15px!important;left:0!important;width:auto!important;margin:0!important;padding:0!important;border:0!important}
.anbox-part-03 #anxg-gallery .anxg__data.anxg__data--scale{top:16px!important;right:18px!important}
.anbox-part-03 #anxg-gallery .anxg__next-project{right:calc(var(--anbox-content-inset) + 18px)!important;bottom:16px!important}
}`;
  }
  if (part === '07') {
    return `@media(min-width:641px){
.anbox-part-07 #anxt-team-training .anxt__primary{box-sizing:border-box!important;width:clamp(220px,15.625vw,600px)!important;height:clamp(42px,2.188vw,84px)!important;min-height:clamp(42px,2.188vw,84px)!important;padding:0 clamp(16px,.833vw,32px)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;border:0!important;border-radius:clamp(8px,.417vw,16px)!important;background:var(--abx-lime,#dde63f)!important;color:var(--abx-ink,#151716)!important;font-family:var(--anbox-font-text,"Onest",Arial,sans-serif)!important;font-size:clamp(10px,.521vw,20px)!important;font-weight:700!important;line-height:1!important;white-space:nowrap!important}
.anbox-part-07 #anxt-team-training .anxt__primary-arrow{width:clamp(20px,1.042vw,40px);height:clamp(20px,1.042vw,40px);display:block;flex:0 0 auto;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.7;transform-origin:center;transition:transform 220ms cubic-bezier(.22,1,.36,1)}
}
@media(hover:hover) and (pointer:fine){.anbox-part-07 #anxt-team-training .anxt__primary:is(:hover,:focus-visible) .anxt__primary-arrow{transform:translate(3px,-3px) rotate(-45deg)}}
.anbox-part-07 #anxt-team-training .anxt__primary:active .anxt__primary-arrow{transform:translate(3px,-3px) rotate(-45deg)}
@media(prefers-reduced-motion:reduce){.anbox-part-07 #anxt-team-training .anxt__primary-arrow{transition:none!important;transform:none!important}}`;
  }
  if (part === '08') {
    return `@media(min-width:841px){
.anbox-part-08 #ablog .ablog__shell{container-type:inline-size}
.anbox-part-08 #ablog .ablog__desktop{--ablog-media-row:304px}
.anbox-part-08 #ablog .ablog__feature,
.anbox-part-08 #ablog .ablog__feed{min-height:calc(var(--ablog-media-row) + 260px)!important}
.anbox-part-08 #ablog .ablog__feature-link{grid-template-rows:var(--ablog-media-row) minmax(0,1fr)!important}
.anbox-part-08 #ablog .ablog__feed{display:grid!important;grid-template-rows:var(--ablog-media-row) minmax(0,1fr)!important;padding:0!important}
.anbox-part-08 #ablog .ablog__feed-intro{min-width:0;padding:28px 28px 0}
.anbox-part-08 #ablog .ablog__feed-bottom{min-height:0;padding:0 28px 26px;display:flex;flex-direction:column}
.anbox-part-08 #ablog .ablog__topics{margin:0 0 auto!important}
.anbox-part-08 #ablog .ablog__read{box-sizing:border-box;min-height:54px;margin-top:0!important;padding-top:0!important;align-self:end}
.anbox-part-08 #ablog .ablog__feed-cta{box-sizing:border-box;height:54px!important;min-height:54px!important;flex:0 0 54px}
@supports(width:1cqw){
.anbox-part-08 #ablog .ablog__desktop{--ablog-media-row:calc(32.869261477cqw - 6.573852295px)}
@container(max-width:883px){.anbox-part-08 #ablog .ablog__desktop{--ablog-media-row:calc(56.347305389cqw - 214.119760479px)}}
}
}`;
  }
  if (part === '09') {
    return `.anbox-part-09 #abct-contacts .abct__action-arrow{width:20px!important;height:20px!important;display:block!important;flex:0 0 20px!important;overflow:visible!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important;transform-origin:center!important}
.anbox-part-09 #abct-contacts .abct__submit .abct__action-arrow{color:var(--abx-ink,#151716)!important}
.anbox-part-09 #abct-contacts .abct__direct-note .abct__action-arrow{color:#fff!important}
@media(min-width:961px){
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__form-body>.abct__submit-row{padding:clamp(23px,calc(11px + .625vw),35px) 0 0!important;gap:8px!important}
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__submit,
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__direct-note{width:100%!important;height:42px!important;min-height:42px!important;margin:0!important;padding:5px 14px!important}
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__submit i,
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__direct-note i{width:32px!important;height:32px!important;flex:0 0 32px!important}
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__submit i{background:var(--abct-ink)!important;color:var(--abct-lime)!important}
}
@media(min-width:641px) and (max-width:960px){
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__submit,
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__direct-note{width:100%!important;height:56px!important;min-height:56px!important;margin:0!important}
.anbox-part-09 #abct-contacts.abct .abct__form-card .abct__submit-row .abct__submit i{background:var(--abct-ink)!important;color:var(--abct-lime)!important}
}
.anbox-part-09 #abct-form .abct__consent{grid-template-columns:18px minmax(0,1fr)!important}
.anbox-part-09 #abct-form .abct__consent-error{grid-column:2!important;width:auto!important;height:auto!important;min-height:0!important;margin:3px 0 0!important;padding:0!important;display:block!important;place-items:initial!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#f2a6b8!important;font-size:clamp(8px,.417vw,16px)!important;font-weight:500!important;line-height:1.2!important;letter-spacing:.01em!important}
.anbox-part-09 #abct-form .abct__consent-error:empty{display:none!important}
.anbox-part-09 #abct-form .abct__consent input[aria-invalid="true"]+span{border-color:#f2a6b8!important;box-shadow:0 0 0 2px rgba(242,166,184,.14)}
.anbox-part-09 #abct-form .abct__success{box-sizing:border-box;width:100%;height:auto!important;min-height:clamp(520px,36vw,620px)!important;margin:0;padding:4px;display:none!important;grid-template-rows:auto minmax(0,1fr) auto;align-content:stretch;justify-items:stretch;text-align:left;outline:none;color:var(--anbox-on-dark,var(--abx-paper,#f3f4f0));background:transparent}
.anbox-part-09 #abct-form[data-abct-success="1"] .abct__form-body{display:none!important}
.anbox-part-09 #abct-form[data-abct-success="1"] .abct__success{display:grid!important}
.anbox-part-09 #abct-form .abct__success span{width:auto;height:auto;padding:0;display:inline;background:transparent;border-radius:0;font-size:inherit}
.anbox-part-09 #abct-form .abct__success-status{margin:0!important;display:flex;align-items:center;gap:9px;color:rgba(243,244,240,.58)!important;font-size:10px!important;font-weight:600;line-height:1.2;letter-spacing:.055em;text-transform:uppercase}
.anbox-part-09 #abct-form .abct__success-status>span{width:7px;height:7px;display:block;border-radius:50%;background:var(--abct-lime);box-shadow:0 0 0 4px rgba(221,230,63,.1)}
.anbox-part-09 #abct-form .abct__success-copy{align-self:center;max-width:430px;padding-block:28px}
.anbox-part-09 #abct-form .abct__success span.abct__success-mark{width:68px;height:68px;display:grid;place-items:center;border:1px solid rgba(173,149,238,.68);border-radius:50%;background:rgba(173,149,238,.1)}
.anbox-part-09 #abct-form .abct__success-mark svg{width:34px;height:34px;display:block;fill:none;stroke:var(--abct-lime);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.anbox-part-09 #abct-form .abct__success-copy strong{margin-top:26px;display:block;color:var(--anbox-on-dark,var(--abx-paper,#f3f4f0));font-family:var(--abct-text);font-size:clamp(36px,2.5vw,48px);font-weight:600;line-height:1;letter-spacing:-.035em;text-transform:none}
.anbox-part-09 #abct-form .abct__success-copy p{max-width:38ch;margin:14px 0 0!important;color:rgba(243,244,240,.68)!important;font-size:13px!important;line-height:1.5}
.anbox-part-09 #abct-form .abct__success-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.anbox-part-09 #abct-form .abct__success-actions a{box-sizing:border-box;min-height:46px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid rgba(243,244,240,.16);border-radius:var(--anbox-radius-sm,8px);font-size:10px;font-weight:700;line-height:1.15;letter-spacing:.01em;text-transform:uppercase;transition:background-color .24s ease,border-color .24s ease,color .24s ease}
.anbox-part-09 #abct-form .abct__success-actions a:first-child{border-color:var(--abct-lime);background:var(--abct-lime);color:var(--abct-ink)}
.anbox-part-09 #abct-form .abct__success-actions svg{width:18px;height:18px;flex:0 0 18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;transition:transform .24s cubic-bezier(.22,1,.36,1)}
@media(hover:hover) and (pointer:fine){.anbox-part-09 #abct-form .abct__success-actions a:hover svg{transform:translateX(3px)}.anbox-part-09 #abct-form .abct__success-actions a:last-child:hover{border-color:var(--abct-purple);color:var(--abct-purple)}}
html:has(#abct-form[data-abct-success="1"]) .t-form-success-popup{display:none!important;visibility:hidden!important;pointer-events:none!important}
@media(min-width:641px) and (max-width:960px){.anbox-part-09 #abct-form .abct__success{min-height:480px!important}.anbox-part-09 #abct-form .abct__success-actions{grid-template-columns:1fr}}
@media(prefers-reduced-motion:no-preference){.anbox-part-09 #abct-form[data-abct-success="1"] .abct__success-status,.anbox-part-09 #abct-form[data-abct-success="1"] .abct__success-copy,.anbox-part-09 #abct-form[data-abct-success="1"] .abct__success-actions{animation:abct-success-in .62s cubic-bezier(.16,1,.3,1) both}.anbox-part-09 #abct-form[data-abct-success="1"] .abct__success-copy{animation-delay:.08s}.anbox-part-09 #abct-form[data-abct-success="1"] .abct__success-actions{animation-delay:.16s}}
@keyframes abct-success-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`;
  }
  if (part === '10') {
    return `.anbox-part-10,.anbox-part-10 .abct__site-footer{--anbox-footer-bg:#fff!important;background:#fff!important}`;
  }
  return '';
}

function composedMobileCss(part) {
  if (part === '00') return `.anbox-mobile-part--00 .site-header{position:fixed!important;inset:0 0 auto!important;transform:translateY(0);will-change:transform;transition:transform 220ms cubic-bezier(.16,1,.3,1),color 180ms cubic-bezier(.22,1,.36,1),background-color 180ms cubic-bezier(.22,1,.36,1),border-color 180ms cubic-bezier(.22,1,.36,1)!important}.anbox-mobile-part--00 .site-header.is-hidden{transform:translateY(-100%)}@media(prefers-reduced-motion:reduce){.anbox-mobile-part--00 .site-header{transition:none!important}}`;
  if (part === '01') return `.anbox-mobile-part--01 .hero{min-height:100svh;align-items:flex-end!important;background-position:62% center!important}.anbox-mobile-part--01 .hero::after{background:linear-gradient(180deg,rgba(11,7,17,.16) 0%,rgba(11,7,17,.08) 28%,rgba(24,11,41,.54) 58%,rgba(14,8,25,.94) 100%),linear-gradient(90deg,rgba(27,11,47,.68) 0%,rgba(34,16,57,.32) 55%,rgba(10,8,13,.04) 100%)}.anbox-mobile-part--01 .hero[data-intro-state="ready"] .hero__video{opacity:1}.anbox-mobile-part--01 .hero__video{object-position:62% center}.anbox-mobile-part--01 .hero__content{--abm-hero-copy-width:min(100%,34rem);width:var(--abm-hero-copy-width)!important;max-width:var(--abm-hero-copy-width)!important;align-self:flex-end!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;transform:none!important}.anbox-mobile-part--01 .hero__eyebrow{position:absolute;top:calc(4.25rem + max(24px,env(safe-area-inset-top)));left:max(var(--pad),env(safe-area-inset-left));width:max-content;max-width:calc(100% - (var(--pad) * 2));margin:0;display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.78);font-size:10px;font-weight:600;line-height:1.2;letter-spacing:.12em;white-space:nowrap;text-transform:uppercase}.anbox-mobile-part--01 .hero__eyebrow::before{width:28px;height:1px;flex:0 0 28px;background:var(--lime);content:""}.anbox-mobile-part--01 .hero .hero__title{width:100%;max-width:100%;margin:0!important;font-size:clamp(50px,14.5vw,60px);line-height:.86;letter-spacing:-.025em;text-shadow:0 2px 28px rgba(8,4,14,.32)}.anbox-mobile-part--01 .hero__rule{width:42px;height:2px;margin:18px 0 16px;display:block;background:var(--purple)}.anbox-mobile-part--01 .hero__intro{width:min(100%,23rem)!important;max-width:31ch!important;margin:0!important;padding:0!important;border:0!important;color:rgba(255,255,255,.9);font-size:clamp(14px,3.8vw,16px);line-height:1.32;text-shadow:0 1px 18px rgba(8,4,14,.42);justify-self:auto!important}.anbox-mobile-part--01 .hero__actions{width:min(100%,21.5rem);margin-top:20px;display:grid;gap:2px}.anbox-mobile-part--01 .hero__action{min-height:44px;padding:0 2px;display:flex;align-items:center;justify-content:flex-start;gap:10px;border:0;border-radius:0;color:var(--white);font-size:clamp(11px,3vw,12px);font-weight:650;line-height:1;letter-spacing:.015em;text-decoration:none;text-transform:uppercase;transition:transform .2s cubic-bezier(.22,1,.36,1)}.anbox-mobile-part--01 .hero__action:not(.hero__action--primary)>span:first-child{padding-bottom:3px;border-bottom:1px solid rgba(173,149,238,.9)}.anbox-mobile-part--01 .hero__action--primary{min-height:54px;padding:0 16px;justify-content:space-between;border:1px solid var(--lime);border-radius:8px;background:var(--lime);color:var(--ink)}.anbox-mobile-part--01 .hero__action:active{transform:scale(.985)}.anbox-mobile-part--01 .hero__action:focus-visible{outline:3px solid var(--purple);outline-offset:3px}.anbox-mobile-part--01 .hero__action--primary:focus-visible{outline-color:var(--lime)}.anbox-mobile-part--01 .hero__action svg{width:20px;height:20px;flex:0 0 20px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.6}@media(max-height:40rem) and (orientation:landscape){.anbox-mobile-part--01 .hero{min-height:35rem!important}.anbox-mobile-part--01 .hero__content{--abm-hero-copy-width:min(78%,30rem)}.anbox-mobile-part--01 .hero__eyebrow{top:calc(4.25rem + 10px)}.anbox-mobile-part--01 .hero .hero__title{font-size:clamp(44px,7.8vw,54px)}.anbox-mobile-part--01 .hero__rule{margin-block:12px 10px}.anbox-mobile-part--01 .hero__intro{font-size:14px}.anbox-mobile-part--01 .hero__actions{width:min(100%,30rem);margin-top:12px;grid-template-columns:minmax(12rem,1fr) auto;align-items:center;gap:18px}.anbox-mobile-part--01 .hero__action{min-height:48px}.anbox-mobile-part--01 .hero__action--primary{min-height:48px}}`;
  if (part === '03') return `.anbox-mobile-part--03{--abm-gallery-top:4.25rem;--abm-gate-space:calc((100svh - 8.5rem - var(--abx-mob-height-action,52px))/2)}.anbox-mobile-part--03,.anbox-mobile-part--03 .portfolio,.anbox-mobile-part--03 .case-viewport,.anbox-mobile-part--03 .case-track{max-width:100%!important;overflow-x:clip!important}.anbox-mobile-part--03 .case-track{width:100%!important;display:block!important;transform:none!important;transition:none!important;will-change:auto!important}.anbox-mobile-part--03 .case-viewport,.anbox-mobile-part--03 .case-slide,.anbox-mobile-part--03 .case-slide__image,.anbox-mobile-part--03 .case-slide__caption{border-radius:0!important}.anbox-mobile-part--03 .case-slide,.js .anbox-mobile-part--03 .case-slide{position:sticky!important;top:var(--abm-gallery-top)!important;right:auto!important;bottom:auto!important;left:auto!important;z-index:var(--abm-case-order)!important;width:100%!important;max-width:100%!important;min-height:calc(100vh - var(--abm-gallery-top))!important;min-height:calc(100svh - var(--abm-gallery-top))!important;margin-inline:0!important;display:flex!important;flex-direction:column!important;overflow:clip!important;scroll-margin-top:var(--abm-gallery-top);isolation:isolate}.anbox-mobile-part--03 .case-slide[hidden]{display:none!important}.anbox-mobile-part--03 .case-slide.is-past{visibility:hidden!important;pointer-events:none!important;isolation:auto!important}.anbox-mobile-part--03 .case-slide+.case-slide{box-shadow:0 -14px 30px rgba(0,0,0,.3)}.anbox-mobile-part--03 .case-slide__image,.anbox-mobile-part--03 .case-slide__image img,.anbox-mobile-part--03 .case-slide__caption{box-sizing:border-box!important;width:100%!important;max-width:100%!important;margin-inline:0!important;inset-inline:auto!important}.anbox-mobile-part--03 .case-slide__image{flex:1 1 0!important;min-height:clamp(360px,56svh,560px)!important}.anbox-mobile-part--03 .case-slide__image img{display:block!important}.anbox-mobile-part--03 .case-slide__caption,.anbox-mobile-part--03 .portfolio-caption-dock{grid-template-columns:minmax(0,1fr)!important}.anbox-mobile-part--03 .case-slide__caption h3,.anbox-mobile-part--03 .portfolio-caption-dock strong{display:flex!important;align-items:center!important;gap:10px!important}.anbox-mobile-part--03 .case-slide__caption h3::after,.anbox-mobile-part--03 .portfolio-caption-dock strong::after{width:42px;height:2px;flex:0 0 42px;background:var(--purple,var(--abx-purple,#ad95ee));content:""}.anbox-mobile-part--03 .portfolio-more-slot{min-height:calc(200svh - 8.5rem)!important;padding:var(--abm-gate-space) var(--pad)!important}.anbox-mobile-part--03 .portfolio-more{position:sticky!important;top:calc(var(--abm-gallery-top) + var(--abm-gate-space))!important;border-color:var(--purple,var(--abx-purple,#ad95ee))!important}.anbox-mobile-part--03 .portfolio.is-caption-docked .case-slide__caption{display:grid!important;visibility:hidden!important;pointer-events:none!important}@media(prefers-reduced-motion:reduce){.anbox-mobile-part--03 .case-slide+.case-slide{box-shadow:none}}`;
  if (part === '10') return `.anbox-mobile-part--10 .site-footer{background:#fff!important}`;
  return '';
}

function finalMobileCss(part) {
  const css = composedMobileCss(part);
  if (part === '03') return css.replace('100svh - 8.5rem - var(--abx-mob-height-action,52px)', '100svh - 4.25rem - var(--abx-mob-height-action,52px)');
  if (part !== '01') return css;
  return `${css}.anbox-mobile-part--01 .hero{padding-bottom:max(42px,env(safe-area-inset-bottom))!important}.anbox-mobile-part--01 .hero__action{min-height:54px;padding:0 16px;justify-content:space-between;border:1px solid var(--abx-purple,#ad95ee);border-radius:8px;color:var(--white)}.anbox-mobile-part--01 .hero__action:not(.hero__action--primary)>span:first-child{padding-bottom:0;border-bottom:0}.anbox-mobile-part--01 .shelf-marquee{padding-block:12px;border-color:rgba(21,23,22,.13);background:var(--abx-paper,#f3f4f0);color:var(--abx-ink,#151716)}.anbox-mobile-part--01 .shelf-marquee__track,.anbox-mobile-part--01 .shelf-marquee__sequence{gap:32px}.anbox-mobile-part--01 .shelf-marquee__label{padding-right:10px;color:var(--abx-ink,#151716);font-size:11px;letter-spacing:.045em}.anbox-mobile-part--01 .shelf-marquee__logo{width:auto;height:28px;max-width:148px;flex:0 0 auto;object-fit:contain}.anbox-mobile-part--01 .shelf-marquee__logo:first-of-type{transform:translateY(-1px)}.anbox-mobile-part--01 .shelf-marquee__logo:nth-of-type(2){height:38px}.anbox-mobile-part--01 .shelf-marquee__logo:nth-of-type(7){height:22px}.anbox-mobile-part--01 .shelf-marquee__logo:nth-of-type(8){height:20px}`;
}

function buildDesktop(def) {
  const cssChunks = [];
  let visualRoot = '';
  let scriptIndex = 0;
  const scripts = [];

  for (const filename of def.desktop) {
    const filePath = path.join(desktopDir, filename);
    let source = stripHtmlComments(fs.readFileSync(filePath, 'utf8'));
    if (!source.trim()) continue;

    const hasRoot = new RegExp(`class=["'][^"']*\\b${def.rootClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(source);
    if (!hasRoot) {
      for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) cssChunks.push(match[1]);
      continue;
    }

    const rootStart = findRootStart(source, def.rootClass);
    const prefix = source.slice(0, rootStart);
    for (const match of prefix.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) cssChunks.push(match[1]);

    const extracted = extractBalancedElement(source, rootStart);
    visualRoot = addRootClasses(extracted.html.trim(), def.rootClass, def.part);
    if (def.part === '00') {
      visualRoot = visualRoot
        .replace('<a href="#abx-approach-v8">Подход</a>', '<a href="#ablog">Блог</a>')
        .replace('<a href="#anxg-gallery">Проекты</a><a href="#anxs-services">Услуги</a><a href="https://anboxdesign.ru/study">Дизайнерам</a>', '<a href="https://anboxdesign.ru/study">Дизайнерам</a><a href="#anxg-gallery">Проекты</a><a href="#anxs-services">Услуги</a>');
    }
    if (def.part === '01') visualRoot = normalizeDesktopHeroHeading(renderDesktopHero(visualRoot));
    if (def.part === '02') {
      const approachLogoDataUri = `data:image/png;base64,${fs.readFileSync(approachLogoPath).toString('base64')}`;
      visualRoot = visualRoot.replace(
        /(<img\b(?=[^>]*\bclass=["'][^"']*\babxa8__seal\b)[^>]*\bsrc=)(["'])([\s\S]*?)\2/i,
        `$1"${approachLogoDataUri}"`,
      );
    }
    if (def.part === '03') visualRoot = addPortfolioCaseHandles(renderDesktopPortfolio(visualRoot), 'desktop');
    if (def.part === '07') visualRoot = unlockDesktopTeamPortraits(visualRoot);
    if (def.part === '08') visualRoot = synchronizeBlogFeed(visualRoot);
    if (def.part === '09') visualRoot = normalizeContactStates(normalizeContactActionArrows(visualRoot));
    const tail = source.slice(extracted.end);
    for (const match of tail.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = match[1] || '';
      if (/data-anbox-scroll-replay/i.test(attrs)) continue;
      scriptIndex += 1;
      scripts.push(gateDesktopScript(match[2], def.part, scriptIndex));
    }
  }

  if (def.part === '00') {
    scriptIndex += 1;
    scripts.push(gateDesktopScript(headerVisibilityRuntime("document.querySelector('.anbox-desktop-part--00')", true), def.part, scriptIndex));
  }
  if (def.part === '03') {
    scriptIndex += 1;
    scripts.push(gateDesktopScript(`(function(){
      var gallery=document.querySelector('.anbox-desktop-part--03 #anxg-gallery');
      if(!gallery||gallery.dataset.anboxAspectSync==='1')return;
      gallery.dataset.anboxAspectSync='1';
      var viewport=gallery.querySelector('.anxg__viewport');
      var desktop=window.matchMedia('(min-width:1025px)');
      var frame=0;
      function sync(){
        frame=0;
        if(!desktop.matches){gallery.style.removeProperty('--anxg-case-media-height');return}
        var width=viewport.getBoundingClientRect().width;
        if(width>0)gallery.style.setProperty('--anxg-case-media-height',(width*2/3).toFixed(2)+'px');
      }
      function schedule(){if(!frame)frame=requestAnimationFrame(sync)}
      if(window.ResizeObserver)new ResizeObserver(schedule).observe(viewport);
      window.addEventListener('resize',schedule,{passive:true});
      if(desktop.addEventListener)desktop.addEventListener('change',schedule);
      else if(desktop.addListener)desktop.addListener(schedule);
      schedule();
    })();`, def.part, scriptIndex));
  }
  if (!visualRoot) throw new Error(`No visual root assembled for ${def.output}`);
  const prunedCss = pruneCssForPart(consolidateCss(cssChunks, 'desktop'), def.part);
  const finalCss = finalDesktopCss(def.part);
  const highlightCss = desktopHighlightCss(def.part);
  return {
    css: [prunedCss, finalCss, highlightCss].filter(Boolean).join('\n'),
    root: visualRoot,
    scripts: scripts.filter(Boolean).join('\n'),
  };
}

function extractSection(className) {
  const match = new RegExp(`<section\\s+class=["'][^"']*\\b${className}\\b[^"']*["']`, 'i').exec(mobileSource);
  if (!match) throw new Error(`Mobile section .${className} not found`);
  return extractBalancedElement(mobileSource, match.index).html.trim();
}

function extractHeader() {
  const start = mobileSource.indexOf('<a class="skip-link"');
  const end = mobileSource.indexOf('<main id="main">', start);
  if (start < 0 || end < 0) throw new Error('Mobile header range not found');
  return mobileSource.slice(start, end).trim();
}

function extractFooter() {
  const start = mobileSource.indexOf('<footer class="site-footer"');
  if (start < 0) throw new Error('Mobile footer not found');
  return extractBalancedElement(mobileSource, start).html.trim();
}

function sliceRuntime(startMarker, endMarker) {
  const start = mobileRuntime.indexOf(startMarker);
  if (start < 0) throw new Error(`Runtime start marker missing: ${startMarker}`);
  const end = endMarker ? mobileRuntime.indexOf(endMarker, start) : mobileRuntime.lastIndexOf('})();');
  if (end < 0) throw new Error(`Runtime end marker missing: ${endMarker}`);
  return mobileRuntime.slice(start, end).trim();
}

function mobileRuntimeFor(part) {
  const sharedReducedMotion = "const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');\n";
  let code = '';
  if (part === '00') {
    code = sliceRuntime('const body = document.body;', "const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');")
      .replace("document.querySelector('.menu-button')", "root.querySelector('.menu-button')")
      .replace("document.querySelector('#mobile-menu')", "root.querySelector('#mobile-menu')")
      .replace("document.querySelector('.site-header .brand__logo')", "root.querySelector('.site-header .brand__logo')");
  } else if (part === '01') {
    code = sliceRuntime("const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');", "const logoMarqueeSection = document.querySelector('[data-logo-marquee]');")
      .replace("document.querySelector('.hero')", "root.querySelector('.hero')")
      .replace("document.querySelector('.site-header')", "document.querySelector('.anbox-mobile-part--00 .site-header')")
      .replace("document.querySelector('[data-shelf-marquee]')", "root.querySelector('[data-shelf-marquee]')")
      .replace('        heroVideo.pause();\n        if (hero.dataset.videoState', '        if (hero.dataset.videoState')
      .replace('          && !reducedMotion.matches\n          && !heroIntroRevealed;', '          && !reducedMotion.matches;')
      .replace('        const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)));', '        const hold = Math.min(120, innerHeight * .12);\n        const progress = Math.min(1, Math.max(0, (innerHeight - rect.top - hold) / (innerHeight + rect.height - hold)));')
      .replace("        }, { rootMargin: '25% 0px' });", "        }, { rootMargin: '0px' });");
  } else if (part === '02') {
    code = `${sharedReducedMotion}${sliceRuntime("const approachCarousel = document.querySelector('[data-approach-carousel]');", "const portfolio = document.querySelector('#work');")}`
      .replace("document.querySelector('[data-approach-carousel]')", "root.querySelector('[data-approach-carousel]')");
  } else if (part === '03') {
    code = `${sharedReducedMotion}${sliceRuntime("const portfolio = document.querySelector('#work');", "const serviceTabs = [...document.querySelectorAll('.service-tab')];")}`
      .replace("document.querySelector('#work')", "root.querySelector('#work')")
      .replace("      const servicesSection = document.querySelector('#services');\n", '')
      .replace("document.querySelector('.site-header').getBoundingClientRect().height", '68')
      .replace('const nextSectionBlocksDock = servicesSection.getBoundingClientRect().top <= window.innerHeight - 104;', 'const nextSectionBlocksDock = portfolio.getBoundingClientRect().bottom <= window.innerHeight - 104;')
      .replace("      const portfolioDockLink = portfolio.querySelector('[data-portfolio-dock-link]');\n", '')
      .replace("          const link = activeSlide.querySelector('.case-slide__link');\n", '')
      .replace('          portfolioDockLink.href = link.href;\n          portfolioDockLink.target = link.target;\n', '');
  } else if (part === '04') {
    code = sliceRuntime("const serviceTabs = [...document.querySelectorAll('.service-tab')];", "const tabs = [...document.querySelectorAll('.package-tab')];")
      .replace("document.querySelectorAll('.service-tab')", "root.querySelectorAll('.service-tab')")
      .replace("document.querySelectorAll('.service-panel')", "root.querySelectorAll('.service-panel')");
  } else if (part === '05') {
    code = sliceRuntime("const tabs = [...document.querySelectorAll('.package-tab')];", "const form = document.querySelector('#project-form');")
      .replace("document.querySelectorAll('.package-tab')", "root.querySelectorAll('.package-tab')")
      .replace("document.querySelectorAll('.package-panel')", "root.querySelectorAll('.package-panel')");
  } else if (part === '06') {
    code = `${sharedReducedMotion}${sliceRuntime("const logoMarqueeSection = document.querySelector('[data-logo-marquee]');", "const approachCarousel = document.querySelector('[data-approach-carousel]');")}`
      .replace("document.querySelector('[data-logo-marquee]')", "root.querySelector('[data-logo-marquee]')");
  } else if (part === '09') {
    code = sliceRuntime("const form = document.querySelector('#project-form');", null)
      .replace("document.querySelector('#project-form')", "root.querySelector('#project-form')")
      .replace("document.querySelector('#form-success')", "root.querySelector('#form-success')");
  }
  if (part === '00') code = `${code}\n${headerVisibilityRuntime("root.querySelector('.site-header')")}`;
  if (!code) return '';
  return `<script data-anbox-mobile-runtime="${part}">\n(function(){\n  var root=document.querySelector('.anbox-mobile-part--${part}');\n  var query=window.matchMedia('(max-width:640px)');\n  var started=false;\n  function start(){\n    if(started||!query.matches||!root)return;\n    started=true;\n    ${code}\n  }\n  start();\n  if(query.addEventListener)query.addEventListener('change',start);\n  else if(query.addListener)query.addListener(start);\n})();\n</script>`;
}

const mobileIds = new Set([...mobileSource.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
mobileIds.add('mobile-main-start');
const mobileIdMap = new Map([...mobileIds].map((id) => [id, `abm-${id}`]));

function prefixMobileIds(value) {
  let result = value;
  result = result.replace(/\bid=(["'])([^"']+)\1/gi, (full, quote, id) => {
    return mobileIdMap.has(id) ? `id=${quote}${mobileIdMap.get(id)}${quote}` : full;
  });
  result = result.replace(/\b(aria-controls|aria-labelledby|aria-describedby|for)=(["'])([^"']+)\2/gi, (full, attr, quote, tokens) => {
    const next = tokens.split(/\s+/).map((token) => mobileIdMap.get(token) || token).join(' ');
    return `${attr}=${quote}${next}${quote}`;
  });
  result = result.replace(/#([A-Za-z_][\w:.-]*)/g, (full, id) => mobileIdMap.has(id) ? `#${mobileIdMap.get(id)}` : full);
  return result;
}

function addLazyLoading(markup) {
  return markup.replace(/<img\b[^>]*>/gi, (tag) => /\sloading\s*=/i.test(tag) ? tag : tag.replace(/>$/, ' loading="lazy">'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clientLogoSprite() {
  const logoDir = path.join(desktopDir, 'assets', 'client-logos');
  const symbols = [];

  for (let index = 1; index <= 8; index += 1) {
    const number = String(index).padStart(2, '0');
    const source = fs.readFileSync(path.join(logoDir, `client-logo-${number}.svg`), 'utf8').trim();
    const rootMatch = source.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/i);
    const viewBox = rootMatch?.[1].match(/\bviewBox=["']([^"']+)["']/i)?.[1];
    if (!rootMatch || !viewBox) throw new Error(`Client logo ${number} is not a valid inline SVG`);

    let body = rootMatch[2];
    const ids = [...body.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
    for (const id of ids) {
      const nextId = `anxl-${number}-${id}`;
      const escapedId = escapeRegExp(id);
      body = body
        .replace(new RegExp(`id=(["'])${escapedId}\\1`, 'g'), `id="${nextId}"`)
        .replace(new RegExp(`url\\(#${escapedId}\\)`, 'g'), `url(#${nextId})`)
        .replace(new RegExp(`((?:xlink:)?href)=(['"])#${escapedId}\\2`, 'g'), `$1="#${nextId}"`);
    }
    symbols.push(`<symbol id="anxl-client-${number}" viewBox="${viewBox}">${body}</symbol>`);
  }

  return {
    style: `<style data-anxl-inline-style>.anxl__sprite{position:absolute!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}.anbox-mobile-part--06 .logo-cell .anxl__logo-art{width:100%;height:auto;aspect-ratio:212/82;display:block;object-fit:contain}</style>`,
    sprite: `<svg class="anxl__sprite" data-anxl-inline-sprite aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${symbols.join('')}</svg>`,
  };
}

function placeClientLogoSpriteInsideDesktopRoot(markup) {
  const spritePattern = /<svg\b[^>]*\bdata-anxl-inline-sprite\b[^>]*>[\s\S]*?<\/svg>/gi;
  const spriteMatches = [...markup.matchAll(spritePattern)];
  const spriteMatch = spriteMatches[0];
  const rootMatch = markup.match(/<div\b[^>]*class=["'][^"']*\banbox-desktop-part--06\b[^"']*["'][^>]*>/i);
  if (!spriteMatch || !rootMatch) throw new Error('Inline client sprite or desktop clients root not found');
  let styleSeen = false;
  const withoutDuplicateStyles = markup.replace(/<style\b[^>]*\bdata-anxl-inline-style\b[^>]*>[\s\S]*?<\/style>/gi, (style) => {
    if (styleSeen) return '';
    styleSeen = true;
    return style;
  });
  const withoutSprites = withoutDuplicateStyles.replace(spritePattern, '');
  return withoutSprites.replace(rootMatch[0], `${rootMatch[0]}\n${spriteMatch[0]}`);
}

function inlineClientLogos(markup) {
  if (markup.includes('data-anxl-inline-sprite')) return placeClientLogoSpriteInsideDesktopRoot(markup);
  const embedded = markup
    .replace(/\.anxl__logo img/g, '.anxl__logo :is(img,.anxl__logo-art)')
    .replace(/<img\b([^>]*?)\bsrc=["']assets\/client-logos\/client-logo-(\d{2})\.svg["']([^>]*)>/gi, (tag, before, number, after) => {
      const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] || `Логотип клиента ${number}`;
      return `<svg class="anxl__logo-art" data-anxl-asset="${number}" role="img" aria-label="${alt}" width="212" height="82" viewBox="0 0 212 82" focusable="false"><use href="#anxl-client-${number}"></use></svg>`;
    });
  const assets = clientLogoSprite();
  const withInternalSprite = embedded.replace(
    /(<div\b[^>]*class=["'][^"']*\banbox-desktop-part--06\b[^"']*["'][^>]*>)/i,
    `$1\n${assets.sprite}`,
  );
  if (withInternalSprite === embedded) throw new Error('Desktop clients root not found for inline SVG sprite');
  return `${assets.style}\n\n${withInternalSprite}`;
}

function inlineClientLogosInPreview(markup) {
  const commentStart = markup.indexOf('<!-- ANBOX Studio · 06 ·');
  const end = markup.indexOf('<!-- ANBOX Studio · 07 ·', commentStart);
  if (commentStart < 0 || end < 0) throw new Error('Clients block range not found in preview');
  const precedingSprite = markup.lastIndexOf('data-anxl-inline-sprite', commentStart);
  const possibleInlinePrefix = precedingSprite >= 0
    ? markup.lastIndexOf('<style data-anxl-inline-style>', precedingSprite)
    : -1;
  const start = possibleInlinePrefix >= 0 ? possibleInlinePrefix : commentStart;
  return `${markup.slice(0, start)}${inlineClientLogos(markup.slice(start, end))}${markup.slice(end)}`;
}

function inlineMobileFooterLogo(markup) {
  if (/<svg\b[^>]*class=["'][^"']*\bfooter-brand__logo\b/i.test(markup)) return markup;
  const source = fs.readFileSync(brandLogoPath, 'utf8');
  const viewBox = source.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  const purplePaths = [...source.matchAll(/<path\b[^>]*class=["']st0["'][^>]*d=["']([^"']+)["'][^>]*\/>/gi)].map((match) => `<path d="${match[1]}"/>`);
  const inkPaths = [...source.matchAll(/<path\b[^>]*class=["']st2["'][^>]*d=["']([^"']+)["'][^>]*\/>/gi)].map((match) => `<path d="${match[1]}"/>`);
  if (!viewBox || !purplePaths.length || !inkPaths.length) throw new Error('Brand logo source changed: inline footer logo could not be built');
  const svg = `<svg class="footer-brand__logo" viewBox="${viewBox}" width="307" height="39" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g fill="#ad95ee">${purplePaths.join('')}</g><g fill="#151716">${inkPaths.join('')}</g></svg>`;
  const result = markup.replace(/<img\b(?=[^>]*class=["'][^"']*\bfooter-brand__logo\b[^"']*["'])[^>]*>/i, svg);
  if (result === markup) throw new Error('Mobile footer logo element not found');
  return result;
}

function mobileFragment(name) {
  if (name === 'header') return extractHeader().replace('href="#main"', 'href="#mobile-main-start"');
  if (name === 'hero') return `${extractSection('hero')}\n${extractSection('shelf-marquee')}`;
  if (name === 'footer') return inlineMobileFooterLogo(extractFooter());
  return extractSection(name);
}

function buildMobile(def) {
  let fragment = addLazyLoading(mobileFragment(def.mobile));
  if (def.part === '00') {
    fragment = fragment
      .replace(/href="#approach">Подход/g, 'href="#abm-journal">Блог')
      .replace('<a href="#work">Проекты</a><a href="#services">Услуги</a><a href="https://anboxdesign.ru/study">Дизайнерам</a>', '<a href="https://anboxdesign.ru/study">Дизайнерам</a><a href="#work">Проекты</a><a href="#services">Услуги</a>')
      .replace(/\s*<a href="#work">Проекты <span>01<\/span><\/a>\s*<a href="#services">Услуги <span>02<\/span><\/a>\s*<a href="https:\/\/anboxdesign\.ru\/study">Дизайнерам <span>03<\/span><\/a>/, '\n        <a href="https://anboxdesign.ru/study">Дизайнерам <span>01</span></a>\n        <a href="#work">Проекты <span>02</span></a>\n        <a href="#services">Услуги <span>03</span></a>');
  }
  if (def.part === '01') {
    fragment = renderMobileHeroShelf(fragment)
      .replace(
        /<span>Создаём<\/span>\s*<span>бренды,<\/span>\s*<span>которые<\/span>\s*<span>выбирают<\/span>/,
        '<span>Создаём бренды,</span>\n          <span>которые выбирают</span>',
      )
      .replace(/\s*<p class="hero__eyebrow">[^<]*<\/p>/, '')
      .replace('<h1 id="hero-title">', '<h1 class="hero__title" id="hero-title">');
  }
  if (def.part === '08') fragment = fragment.replace('<section class="section journal"', '<section class="section journal" id="abm-journal"');
  if (def.part === '03') fragment = addPortfolioCaseHandles(renderMobilePortfolio(fragment), 'mobile');
  const rootId = def.part === '01' ? ' id="abm-mobile-main-start"' : '';
  fragment = `<div class="anbox-mobile-part anbox-mobile-part--${def.part}" data-anbox-version="mobile"${rootId}>\n${fragment}\n</div>`;
  return {
    root: prefixMobileIds(fragment),
    css: finalMobileCss(def.part),
    script: prefixMobileIds(mobileRuntimeFor(def.part)),
  };
}

const switchCss = `<style data-anbox-responsive-switch>
.anbox-mobile-part{display:none!important}
@media(max-width:640px){.anbox-desktop-part{display:none!important}.anbox-mobile-part{display:block!important}}
</style>`;

const coreTokenCss = `<style data-anbox-core-tokens>
@import url("https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap");
:root{--abx-paper:#f3f4f0;--abx-ink:#151716;--abx-graphite:#202123;--abx-purple:#ad95ee;--abx-purple-strong:#7658d0;--abx-lime:#dde63f;--anbox-paper:var(--abx-paper);--anbox-ink:var(--abx-ink);--anbox-graphite:var(--abx-graphite);--anbox-purple:var(--abx-purple);--anbox-lime:var(--abx-lime);--anbox-shell:1200px;--anbox-wide-shell:3328px;--anbox-fluid-inset:clamp(20px,6.667vw,256px)}
</style>`;

const preparedMobileCss = consolidateCss([mobileStyle], 'mobile')
  .replace(/\bmain(?=\s+\.section)/g, '.anbox-mobile-part');

const mobileCoreCss = `<style media="(max-width:640px)" data-anbox-mobile-design-system>
${prefixMobileIds(scopeMobileCss(preparedMobileCss))}
</style>`;

const bootstrap = `<script data-anbox-responsive-bootstrap>document.documentElement.classList.add('js');</script>`;

const revealCoreCss = `<style data-anbox-reveal-core>
:root{--abx-reveal-block:400ms;--abx-reveal-panel:640ms;--abx-reveal-media:520ms;--abx-reveal-heading:900ms;--abx-reveal-exit:220ms;--abx-reveal-enter-ease:cubic-bezier(.16,1,.3,1);--abx-reveal-exit-ease:cubic-bezier(.4,0,.2,1)}
[data-anbox-reveal-ready="1"]{--abx-reveal-enter:var(--abx-reveal-block);--abx-reveal-shift:0px;opacity:0!important;translate:0 var(--abx-reveal-shift)!important;filter:none!important;clip-path:none;transition-property:opacity,translate,filter!important;transition-duration:var(--abx-reveal-exit)!important;transition-timing-function:var(--abx-reveal-exit-ease)!important;transition-delay:0ms!important}
[data-anbox-reveal-ready="1"]:is([data-anbox-reveal-kind="panel"],[data-anbox-reveal-kind="case"]){--abx-reveal-enter:var(--abx-reveal-panel);--abx-reveal-shift:8px;filter:blur(1.5px)!important}
[data-anbox-reveal-ready="1"]:is([data-anbox-reveal-kind="panel"],[data-anbox-reveal-kind="case"])[data-anbox-reveal-edge="top"]{--abx-reveal-shift:-8px}
[data-anbox-reveal-ready="1"][data-anbox-reveal-kind="media"]{--abx-reveal-enter:var(--abx-reveal-media)}
[data-anbox-reveal-ready="1"]:is([data-anbox-reveal-kind="display"],[data-anbox-reveal-kind="heading"]){--abx-reveal-enter:var(--abx-reveal-heading);opacity:1!important;translate:0 0!important;filter:none!important;-webkit-mask-image:var(--abx-heading-mask-image,linear-gradient(#000 0 0));mask-image:var(--abx-heading-mask-image,linear-gradient(#000 0 0));-webkit-mask-position:var(--abx-heading-mask-hidden-position,0 0);mask-position:var(--abx-heading-mask-hidden-position,0 0);-webkit-mask-size:var(--abx-heading-mask-size,100% 100%);mask-size:var(--abx-heading-mask-size,100% 100%);-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;transition:none!important}
[data-anbox-reveal-ready="1"][data-anbox-reveal-moving="1"]{transform:none!important;will-change:opacity,translate,filter}
[data-anbox-reveal-ready="1"][data-anbox-reveal-moving="1"]:is([data-anbox-reveal-kind="display"],[data-anbox-reveal-kind="heading"]) *{transform:none!important}
[data-anbox-reveal-ready="1"].anbox-reveal-in{opacity:1!important;translate:0 0!important;filter:none!important;transition-duration:var(--abx-reveal-enter)!important;transition-timing-function:var(--abx-reveal-enter-ease)!important;transition-delay:var(--abx-reveal-delay,0ms)!important}
[data-anbox-reveal-ready="1"]:is([data-anbox-reveal-kind="display"],[data-anbox-reveal-kind="heading"]).anbox-reveal-in{-webkit-mask-position:var(--abx-heading-mask-full-position,0 0);mask-position:var(--abx-heading-mask-full-position,0 0)}
@media(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){.anbox-desktop-part--02.anbox-part-02 #abx-approach-v8 .abxa8__card.anbox-reveal-in:not([data-anbox-reveal-moving="1"]){transition:translate .5s cubic-bezier(.22,1,.36,1),box-shadow .46s ease,background-color .46s ease,border-color .42s ease!important}.anbox-desktop-part--02.anbox-part-02 #abx-approach-v8 .abxa8__card.anbox-reveal-in:not([data-anbox-reveal-moving="1"]):hover{translate:0 clamp(-6px,-.333cqw,-4px)!important}}
.anbox-desktop-part--02.anbox-part-02 #abx-approach-v8.abxa8.is-js.is-in .abxa8__highlight::before{transition:transform .68s cubic-bezier(.65,0,.35,1) 1.46s!important}
.anbox-desktop-part--04.anbox-part-04 #anxs-services .anxs-matrix__statement mark{background-color:transparent!important;background-image:linear-gradient(var(--anbox-purple-soft,#ded4f7),var(--anbox-purple-soft,#ded4f7))!important;background-position:left center!important;background-repeat:no-repeat!important;background-size:0 93%!important;transition:background-size .72s cubic-bezier(.65,0,.35,1) 1.46s!important}
.anbox-desktop-part--04.anbox-part-04 #anxs-services.is-in .anxs-matrix__statement mark{background-size:100% 93%!important}
.anbox-desktop-part--05.anbox-part-05 #anxp-packages .anxp__highlight,.anbox-desktop-part--08.anbox-part-08 #ablog .ablog__intro h2 span,.anbox-desktop-part--09.anbox-part-09 #abct-contacts .abct__heading h2 span{transition:background-size .72s cubic-bezier(.65,0,.35,1) 1.46s!important}
@media(prefers-reduced-motion:reduce){[data-anbox-reveal-ready="1"]{opacity:1!important;translate:none!important;transform:none!important;filter:none!important;clip-path:none!important;-webkit-mask:none!important;mask:none!important;transition:none!important;will-change:auto!important}}
</style>`;

const revealCoreRuntime = `<script data-anbox-reveal-core>(function(w){
if(w.ANBOXReveal)return;
var reduced=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;
var direction='down';var lastY=w.scrollY||0;var states=[];var frame=0;
function timeMs(value){var n=parseFloat(value)||0;return value.indexOf('ms')>-1?n:n*1000}
function motionBudget(node){var style=w.getComputedStyle(node);var durations=style.transitionDuration.split(',').map(timeMs);var delays=style.transitionDelay.split(',').map(timeMs);var max=0;durations.forEach(function(duration,index){max=Math.max(max,duration+(delays[index%delays.length]||0))});return max+48}
function measureHeading(state){var node=state.node;var host=node.getBoundingClientRect();var rects=[];var walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);var text;while((text=walker.nextNode())){if(!text.nodeValue||!text.nodeValue.trim())continue;var range=document.createRange();range.selectNodeContents(text);Array.prototype.forEach.call(range.getClientRects(),function(rect){if(rect.width>.5&&rect.height>.5)rects.push({top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right})})}rects.sort(function(a,b){return Math.abs(a.top-b.top)>2?a.top-b.top:a.left-b.left});var lines=[];rects.forEach(function(rect){var line=lines.find(function(item){return Math.abs(item.top-rect.top)<3});if(line){line.top=Math.min(line.top,rect.top);line.bottom=Math.max(line.bottom,rect.bottom);line.left=Math.min(line.left,rect.left);line.right=Math.max(line.right,rect.right)}else lines.push({top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right})});if(!lines.length)lines=[{top:host.top,bottom:host.bottom,left:host.left,right:host.right}];var feather=w.innerWidth<=640?30:44;state.headingLines=lines.slice(0,6).map(function(line){var left=Math.max(0,Math.round(line.left-host.left));var width=Math.max(1,Math.ceil(line.right-line.left));return{top:Math.max(0,Math.round(line.top-host.top)),left:left,height:Math.max(1,Math.ceil(line.bottom-line.top+1)),maskWidth:width+feather}});var images=state.headingLines.map(function(){return'linear-gradient(90deg,#000 0,#000 calc(100% - '+feather+'px),rgba(0,0,0,.78) calc(100% - '+Math.round(feather*.45)+'px),transparent 100%)'}).join(',');var sizes=state.headingLines.map(function(line){return line.maskWidth+'px '+line.height+'px'}).join(',');var hidden=state.headingLines.map(function(line){return(line.left-line.maskWidth)+'px '+line.top+'px'}).join(',');var full=state.headingLines.map(function(line){return line.left+'px '+line.top+'px'}).join(',');if(state.preserveLeft>0){images+=',linear-gradient(#000 0 0)';sizes+=','+state.preserveLeft+'px 100%';hidden+=',0 0';full+=',0 0'}node.style.setProperty('--abx-heading-mask-image',images);node.style.setProperty('--abx-heading-mask-size',sizes);node.style.setProperty('--abx-heading-mask-hidden-position',hidden);node.style.setProperty('--abx-heading-mask-full-position',full);node.dataset.anboxRevealLines=String(state.headingLines.length)}
function headingFrames(state,total){var lines=state.headingLines||[];var stagger=110;var span=Math.max(560,total-Math.max(0,lines.length-1)*stagger);var steps=Math.max(2,Math.ceil(total/24));var frames=[];for(var step=0;step<=steps;step++){var time=total*step/steps;var positions=lines.map(function(line,index){var start=index*stagger;var raw=Math.max(0,Math.min(1,(time-start)/span));var progress=1-Math.pow(1-raw,4);var x=line.left-line.maskWidth*(1-progress);return x.toFixed(2)+'px '+line.top+'px'}).join(',');frames.push({offset:step/steps,maskPosition:positions,webkitMaskPosition:positions,easing:'linear'})}return frames}
function startHeading(state,delay){measureHeading(state);if(state.headingAnimation)state.headingAnimation.cancel();var total=w.innerWidth<=640?860:900;var frames=headingFrames(state,total);if(reduced||!state.node.animate||!frames.length)return;var animation=state.node.animate(frames,{duration:total,delay:delay,easing:'linear',fill:'both'});state.headingAnimation=animation;animation.finished.then(function(){if(state.headingAnimation!==animation)return;state.headingAnimation=null;animation.cancel()}).catch(function(){})}
function setState(state,on,edge){var node=state.node;var delay=on?(edge==='top'?state.delayTop:state.delayBottom):0;var isHeading=state.kind==='display'||state.kind==='heading';node.dataset.anboxRevealEdge=edge;node.style.setProperty('--abx-reveal-delay',delay+'ms');node.dataset.anboxRevealMoving='1';w.clearTimeout(state.motionTimer);if(state.headingAnimation){state.headingAnimation.cancel();state.headingAnimation=null}if(on){if(isHeading){node.classList.add('anbox-reveal-in');startHeading(state,delay)}else{node.style.setProperty('transition','none','important');node.classList.remove('anbox-reveal-in');void node.offsetWidth;node.style.removeProperty('transition');void node.offsetWidth;node.classList.add('anbox-reveal-in')}}else node.classList.remove('anbox-reveal-in');var budget=isHeading?(w.innerWidth<=640?860:900)+delay+48:motionBudget(node);state.motionTimer=w.setTimeout(function(){delete node.dataset.anboxRevealMoving},budget)}
function scan(){frame=0;var viewport=w.innerHeight||document.documentElement.clientHeight;states.forEach(function(state){var rect=state.node.getBoundingClientRect();var rendered=rect.width>0&&rect.height>0;var on=rendered&&rect.bottom>16&&rect.top<viewport-16;if(on===state.on)return;state.on=on;var edge=on?(direction==='up'?'top':'bottom'):(rect.bottom<=16?'top':'bottom');setState(state,on,edge)})}
function schedule(){if(!frame)frame=w.requestAnimationFrame(scan)}
w.addEventListener('scroll',function(){var next=w.scrollY||0;if(Math.abs(next-lastY)>2)direction=next<lastY?'up':'down';lastY=next;schedule()},{passive:true});
w.addEventListener('resize',function(){states.forEach(function(state){if(state.kind==='display'||state.kind==='heading'){if(state.headingAnimation){state.headingAnimation.cancel();state.headingAnimation=null}measureHeading(state)}});schedule()},{passive:true});w.addEventListener('load',schedule,{once:true});document.addEventListener('click',function(){w.setTimeout(schedule,0)},true);
if(w.ResizeObserver)new ResizeObserver(schedule).observe(document.documentElement);
function mount(root,config){if(!root||root.dataset.anboxRevealMounted==='1')return;root.dataset.anboxRevealMounted='1';(config.items||[]).forEach(function(rule){var nodes=[].slice.call(root.querySelectorAll(rule.selector));var base=Number(rule.delay)||0;var step=Number(rule.stagger)||0;var cap=rule.maxDelay==null?720:Number(rule.maxDelay);nodes.forEach(function(node,index){if(node.dataset.anboxRevealReady==='1')return;var kind=rule.kind||'text';node.dataset.anboxRevealKind=kind;node.dataset.anboxRevealEdge='bottom';var state={node:node,root:root,on:null,kind:kind,preserveLeft:Number(rule.preserveLeft)||0,delayBottom:Math.min(base+index*step,cap),delayTop:Math.min(base+(nodes.length-1-index)*step,cap)};node.dataset.anboxRevealOrder=String(index+1);node.dataset.anboxRevealTotal=String(nodes.length);node.dataset.anboxRevealDelayDown=String(state.delayBottom);node.dataset.anboxRevealDelayUp=String(state.delayTop);node.style.setProperty('--abx-reveal-delay',state.delayBottom+'ms');if(kind==='display'||kind==='heading')measureHeading(state);node.dataset.anboxRevealReady='1';states.push(state);if(reduced)setState(state,true,'bottom')})});schedule()}
var api={mount:mount};var queue=w.ANBOXRevealQueue||[];w.ANBOXReveal=api;w.ANBOXRevealQueue=[];queue.forEach(function(run){run(api)})
})(window);</script>`;

const revealProfiles = {
  '01': {
    desktop: { items: [
      { selector: '.abh-hero__title>span', kind: 'display', stagger: 150, maxDelay: 150 },
      { selector: '.abh-hero__subtitle', kind: 'text', delay: 180 },
      { selector: '.abh-hero__actions', kind: 'action', delay: 260 },
      { selector: '.abh-hero__visual', kind: 'media', delay: 100 },
    ] },
    mobile: { items: [
      { selector: '.hero h1>span', kind: 'display', stagger: 150, maxDelay: 150 },
      { selector: '.hero__rule', kind: 'line', delay: 140 },
      { selector: '.hero__intro', kind: 'text', delay: 190 },
      { selector: '.hero__actions', kind: 'action', delay: 250 },
    ] },
  },
  '02': {
    desktop: {
      items: [
        { selector: '.abxa8__kicker', kind: 'text' },
        { selector: '.abxa8__title-wrap', kind: 'heading', delay: 60 },
        { selector: '[data-abxa8-card]', kind: 'panel', delay: 170, stagger: 130, maxDelay: 820 },
      ],
    },
    mobile: { items: [
      { selector: '.section-kicker', kind: 'text' },
      { selector: '.section-title', kind: 'heading', delay: 45 },
      { selector: '.approach-viewport', kind: 'case', delay: 110 },
      { selector: '.approach-controls', kind: 'action', delay: 150 },
    ] },
  },
  '03': {
    desktop: {
      items: [
        { selector: '.anxg__rail', kind: 'panel' },
        { selector: '.anxg__viewport', kind: 'media', delay: 130 },
      ],
    },
    mobile: { items: [
      { selector: '.section-kicker', kind: 'text' },
      { selector: '.section-title', kind: 'heading', delay: 45 },
      { selector: '.case-slide', kind: 'case', delay: 70 },
      { selector: '.portfolio-more-slot', kind: 'action', delay: 80 },
    ] },
  },
  '04': {
    desktop: {
      items: [
        { selector: '.anxs-matrix__kicker', kind: 'text' },
        { selector: '.anxs-matrix__statement', kind: 'heading', delay: 60, preserveLeft: 3 },
        { selector: '.anxs-matrix__column', kind: 'panel', delay: 150, stagger: 150, maxDelay: 300 },
      ],
    },
    mobile: { items: [
      { selector: '.services-card>.section-kicker', kind: 'text' },
      { selector: '.services-card>.section-title', kind: 'heading', delay: 45 },
      { selector: '.service-tabs', kind: 'action', delay: 110 },
      { selector: '.service-panels', kind: 'panel', delay: 150 },
      { selector: '.services-cta', kind: 'action', delay: 90 },
    ] },
  },
  '05': {
    desktop: {
      items: [
        { selector: '.anxp__kicker', kind: 'text' },
        { selector: '.anxp__header h2', kind: 'heading', delay: 60, preserveLeft: 3 },
        { selector: '[data-anxp-card]', kind: 'panel', delay: 170, stagger: 140, maxDelay: 450 },
        { selector: '.anxp__custom', kind: 'action', delay: 120 },
      ],
    },
    mobile: { items: [
      { selector: '.section-kicker', kind: 'text' },
      { selector: '.section-title', kind: 'heading', delay: 45 },
      { selector: '.section-lead', kind: 'text', delay: 90 },
      { selector: '.package-tabs', kind: 'action', delay: 120 },
      { selector: '.package-panels', kind: 'panel', delay: 150 },
      { selector: '.custom-package', kind: 'action', delay: 90 },
    ] },
  },
  '07': {
    desktop: {
      items: [
        { selector: '.anxt__team-copy', kind: 'heading', preserveLeft: 3 },
        { selector: '.anxt__person', kind: 'panel', delay: 150, stagger: 140, maxDelay: 430 },
        { selector: '.anxt__training-copy', kind: 'text', delay: 470 },
        { selector: '.anxt__training-visual', kind: 'media', delay: 520 },
      ],
    },
    mobile: { items: [
      { selector: '.section-kicker', kind: 'text' },
      { selector: '.section-title', kind: 'heading', delay: 45 },
      { selector: '.section-lead', kind: 'text', delay: 90 },
      { selector: '.person-card', kind: 'panel', delay: 90 },
      { selector: '.training-card', kind: 'case', delay: 90 },
    ] },
  },
  '08': {
    desktop: {
      items: [
        { selector: '.ablog__kicker', kind: 'text' },
        { selector: '.ablog__intro', kind: 'heading', delay: 55, preserveLeft: 3 },
        { selector: '.ablog__feature', kind: 'case', delay: 130 },
        { selector: '.ablog__feed', kind: 'panel', delay: 250 },
      ],
    },
    mobile: { items: [
      { selector: '.section-kicker', kind: 'text' },
      { selector: '.section-title', kind: 'heading', delay: 45 },
      { selector: '.article-card', kind: 'case', delay: 90 },
      { selector: '.news-card', kind: 'panel', delay: 90 },
    ] },
  },
  '09': {
    desktop: {
      items: [
        { selector: '.abct__kicker', kind: 'text' },
        { selector: '.abct__heading h2', kind: 'heading', delay: 55, preserveLeft: 3 },
        { selector: '.abct__lead', kind: 'text', delay: 110 },
        { selector: '.abct__form-card', kind: 'panel', delay: 180 },
      ],
    },
    mobile: { items: [
      { selector: '.section-kicker', kind: 'text' },
      { selector: '.section-title', kind: 'heading', delay: 45 },
      { selector: '.section-lead', kind: 'text', delay: 90 },
      { selector: '.telegram-card', kind: 'action', delay: 120 },
      { selector: '.contact-card', kind: 'panel', delay: 150 },
    ] },
  },
  '10': {
    desktop: { items: [
      { selector: '.abct__footer-logo', kind: 'fade' },
      { selector: '.abct__footer-line', kind: 'text', delay: 60 },
      { selector: '.abct__footer-legal', kind: 'action', delay: 100 },
      { selector: '.abct__footer-end', kind: 'action', delay: 140 },
    ] },
    mobile: { items: [
      { selector: '.footer-tagline', kind: 'text' },
      { selector: '.footer-meta', kind: 'action', delay: 80 },
    ] },
  },
};

function revealInitScript(def) {
  const profile = revealProfiles[def.part]?.desktop;
  if (!profile) return '';
  return `<script data-anbox-reveal-init="${def.part}">(function(){var profile=${JSON.stringify(profile)};function run(api){document.querySelectorAll('.anbox-desktop-part--${def.part}').forEach(function(root){api.mount(root,profile)})}if(window.ANBOXReveal)run(window.ANBOXReveal);else(window.ANBOXRevealQueue=window.ANBOXRevealQueue||[]).push(run)})();</script>`;
}


if (process.argv.includes('--inline-client-logos-only')) {
  const blockPath = path.join(outputDir, '06-clients.html');
  const previewPath = path.join(outputDir, 'ANBOX-Studio-responsive-preview.html');
  fs.writeFileSync(blockPath, inlineClientLogos(fs.readFileSync(blockPath, 'utf8')), 'utf8');
  fs.writeFileSync(previewPath, inlineClientLogosInPreview(fs.readFileSync(previewPath, 'utf8')), 'utf8');
  console.log(`Embedded client logos in ${blockPath} and responsive preview`);
  process.exit(0);
}

if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const outputs = [];
for (const def of blockDefs) {
  const desktop = buildDesktop(def);
  const mobile = buildMobile(def);
  if (def.part === '03') {
    const serviceContent = [
      '<!-- ANBOX Studio · 03A · portfolio service layer · place immediately before 03B -->',
      `<style data-anbox-desktop-style="03">\n${desktop.css}\n</style>`,
    ].join('\n\n').trim() + '\n';
    fs.writeFileSync(path.join(outputDir, '03A-portfolio-system.html'), serviceContent, 'utf8');
    outputs.push({ part: '03A', output: '03A-portfolio-system.html', content: serviceContent, service: true });
  }
  const parts = [
    `<!-- ANBOX Studio · ${def.part} · responsive clean · desktop + mobile -->`,
    switchCss,
  ];
  if (def.part !== '03') parts.push(`<style data-anbox-desktop-style="${def.part}">\n${desktop.css}\n</style>`);
  if (def.part === '00') parts.push(coreTokenCss, mobileCoreCss, revealCoreCss, bootstrap, revealCoreRuntime);
  if (mobile.css) parts.push(`<style media="(max-width:640px)" data-anbox-mobile-patch="${def.part}">\n${mobile.css}\n</style>`);
  parts.push(desktop.root, mobile.root);
  if (desktop.scripts) parts.push(desktop.scripts);
  if (mobile.script) parts.push(mobile.script);
  const revealInit = revealInitScript(def);
  if (revealInit) parts.push(revealInit);
  let content = `${parts.join('\n\n').trim()}\n`;
  if (def.part === '06') content = inlineClientLogos(content);
  fs.writeFileSync(path.join(outputDir, def.output), content, 'utf8');
  outputs.push({ ...def, content });
}

const preview = `<!doctype html>
<html lang="ru" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="ANBOX Studio — стратегия, брендинг и дизайн упаковки от исследования до запуска в производство.">
  <meta name="theme-color" content="#f3f4f0">
  <link rel="icon" href="data:,">
  <title>ANBOX Studio — responsive clean preview</title>
  <style>html{overflow-wrap:anywhere}body{margin:0;background:#f3f4f0}</style>
</head>
<body>
${outputs.map((item) => item.content.trim()).join('\n\n')}
</body>
</html>
`;
fs.writeFileSync(path.join(outputDir, 'ANBOX-Studio-responsive-preview.html'), preview, 'utf8');

const mobilePreview = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f3f4f0">
  <link rel="icon" href="data:,">
  <title>ANBOX Studio — mobile preview</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    html,body{width:100%;height:100%;margin:0}
    body{overflow:hidden;display:flex;justify-content:center;background:#deddda}
    iframe{width:390px;height:100dvh;border:0;background:#f3f4f0;box-shadow:0 0 0 1px rgba(21,23,22,.12),0 18px 60px rgba(21,23,22,.12)}
    @media(max-width:390px){iframe{width:100%;box-shadow:none}}
  </style>
</head>
<body>
  <iframe src="ANBOX-Studio-responsive-preview.html" title="Мобильная версия сайта ANBOX Studio"></iframe>
</body>
</html>
`;
fs.writeFileSync(path.join(outputDir, 'ANBOX-Studio-mobile-preview.html'), mobilePreview, 'utf8');

fs.cpSync(path.join(desktopDir, 'assets'), path.join(outputDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'assets', 'brand'), { recursive: true });
fs.copyFileSync(path.join(root, 'assets', 'brand', 'anbox-logo-rgb-dark.svg'), path.join(outputDir, 'assets', 'brand', 'anbox-logo-rgb-dark.svg'));
fs.cpSync(casesAssetDir, path.join(outputDir, 'assets', 'cases'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'hero-layout-variants'), { recursive: true });
fs.copyFileSync(path.join(root, 'hero-layout-variants', 'hero-video-frame.png'), path.join(outputDir, 'hero-layout-variants', 'hero-video-frame.png'));
fs.copyFileSync(path.join(root, 'bebas-neue-bold.woff'), path.join(outputDir, 'bebas-neue-bold.woff'));
fs.copyFileSync(specPath, path.join(outputDir, 'SPEC.md'));
fs.copyFileSync(designSystemPath, path.join(outputDir, 'DESIGN-SYSTEM.md'));
fs.copyFileSync(tildaSpecPath, path.join(outputDir, 'TILDA-VIBE-SECTION-SPEC.md'));

const readme = [
  'ANBOX Studio — responsive clean — 2026-08-26',
  '',
  'Порядок вставки VibeBlock в Tilda:',
  ...outputs.map((item, index) => `${String(index + 1).padStart(2, '0')}. ${item.output}`),
  '',
  'Каждый визуальный HTML-файл содержит два соседних корня: desktop и mobile.',
  'Breakpoint: mobile <= 640 px; desktop >= 641 px.',
  '00-header.html должен идти первым: в нём находятся общие токены, mobile design layer и desktop reveal-core.',
  '03A-portfolio-system.html — служебный блок со стилями; вставляйте непосредственно перед 03B.',
  '03B-portfolio.html — визуальный блок с соседними desktop/mobile корнями и маркерами data-anbox-case для редактирования кейсов.',
  'CSS ограничен корнями версий; недостижимые селекторы прошлых секций и повторные scroll-replay runtime удалены.',
  'Desktop reveal запускается только после фактического входа элемента минимум на 16 px в viewport; при возврате вверх последовательности воспроизводятся в обратном порядке.',
  'Новый reveal-core не монтируется на mobile-корни: mobile сохраняет собственные согласованные анимации и механику «Смотреть ещё кейсы».',
  'Текст и действия на desktop проявляются чистым fade за 400 ms. Изображения не масштабируются и не деформируются.',
  'Заголовок длится на 500 ms дольше и раскрывается по фактическим строкам мягкой маской без изменения HTML-разметки текста. Выделение стартует через 500 ms после его завершения.',
  'Карточки идут по одной с шагом 130–150 ms, получают только короткую глубину 6–8 px и едва заметный расфокус без изменения геометрии.',
  '06-clients.html не подключён к reveal-core: обе ленты логотипов сохраняют собственный независимый runtime.',
  'Цветовые роли: paper #F3F4F0, ink #151716, purple #AD95EE, purple-strong #7658D0, lime #DDE63F.',
  'Mobile HERO сохраняет autoplay, muted, loop, playsinline и preload=auto.',
  'ANBOX-Studio-responsive-preview.html — общий локальный предпросмотр.',
  'ANBOX-Studio-mobile-preview.html — актуальный предпросмотр общей страницы в фиксированном мобильном viewport 390 px.',
  'SPEC.md — спецификация объединения; DESIGN-SYSTEM.md — зафиксированная система; TILDA-VIBE-SECTION-SPEC.md — исходный контракт Tilda.',
  'Сохраняйте папки assets и hero-layout-variants, а также bebas-neue-bold.woff рядом с HTML.',
  '',
  'После вставки проверьте в Tilda, что обе соседние версии выделяются как отдельные Вайб-секции.',
].join('\n');
fs.writeFileSync(path.join(outputDir, 'README.txt'), `${readme}\n`, 'utf8');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const sourceManifest = [
  'ANBOX Studio responsive clean — source manifest',
  `mobile SHA-256  ${sha256(mobilePath)}  ${path.basename(mobilePath)}`,
  `desktop SHA-256 ${sha256(desktopZipPath)}  ${path.basename(desktopZipPath)}`,
  `spec SHA-256    ${sha256(specPath)}  ${path.basename(specPath)}`,
  `design SHA-256  ${sha256(designSystemPath)}  ${path.basename(designSystemPath)}`,
  `tilda SHA-256   ${sha256(tildaSpecPath)}  ${path.basename(tildaSpecPath)}`,
].join('\n');
fs.writeFileSync(path.join(outputDir, 'SOURCE-MANIFEST.txt'), `${sourceManifest}\n`, 'utf8');

const sourceBytes = blockDefs.flatMap((def) => def.desktop).reduce((sum, filename) => sum + fs.statSync(path.join(desktopDir, filename)).size, 0) + fs.statSync(mobilePath).size;
const blockBytes = outputs.reduce((sum, item) => sum + Buffer.byteLength(item.content), 0);
console.log(JSON.stringify({
  outputDir,
  blocks: outputs.map((item) => ({ name: item.output, bytes: Buffer.byteLength(item.content) })),
  sourceBytes,
  blockBytes,
  reductionPercent: Number(((1 - blockBytes / sourceBytes) * 100).toFixed(1)),
}, null, 2));
