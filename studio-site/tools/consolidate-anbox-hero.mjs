import fs from 'node:fs';

const file = 'C:/Users/Артём/Documents/сайт/ANBOX-Studio-Tilda-screens-20260824-v4/01-hero.html';
const marker = '<!-- ANBOX MOBILE CURRENT START -->';
const source = fs.readFileSync(file, 'utf8');
const markerIndex = source.indexOf(marker);

if (markerIndex < 0) throw new Error('Не найден маркер мобильной части HERO');

const desktop = source.slice(0, markerIndex);
const mobile = source.slice(markerIndex);
const styles = [...desktop.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];

if (!styles.length) throw new Error('В HERO не найдены стили для консолидации');

let css = styles.map((match) => match[1].trim()).join('\n\n');
const imports = [...css.matchAll(/^\s*@import[^\r\n]*;/gim)].map((match) => match[0].trim());
css = css
  .replace(/^\s*@import[^\r\n]*;/gim, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const currentStyle = `<style data-anbox-hero-current>\n${imports.join('\n')}\n${css}\n</style>`;
let firstStyle = true;
const consolidatedDesktop = desktop.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, () => {
  if (!firstStyle) return '';
  firstStyle = false;
  return currentStyle;
}).replace(/\n{3,}/g, '\n\n').trimEnd();

fs.writeFileSync(file, `${consolidatedDesktop}\n\n${mobile.trimStart()}`, 'utf8');
console.log(`HERO consolidated: ${styles.length} style blocks -> 1 current style block`);
