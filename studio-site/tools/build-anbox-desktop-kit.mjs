import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolsDir, '..');
const sourceDir = path.join(root, 'ANBOX-Studio-Tilda-screens-20260824-v4');
const outputDir = path.join(root, 'ANBOX-Studio-desktop-final-20260826');
const expectedName = 'ANBOX-Studio-desktop-final-20260826';

if (path.basename(outputDir) !== expectedName || !outputDir.startsWith(root + path.sep)) {
  throw new Error(`Unsafe output path: ${outputDir}`);
}

const order = [
  '00-header.html',
  '01-hero.html',
  '02-approach.html',
  '03A-portfolio-styles.html',
  '03B-portfolio-screen.html',
  '04-services.html',
  '05-packages.html',
  '06-clients.html',
  '07-team-training.html',
  '08-blog.html',
  '09-contacts.html',
  '10-footer.html'
];

function stripMobileInjection(source) {
  return source.replace(
    /\s*<!-- ANBOX MOBILE CURRENT START -->[\s\S]*?<!-- ANBOX MOBILE CURRENT END -->\s*/g,
    '\n'
  ).trim();
}

function desktopHeader(source) {
  const lines = stripMobileInjection(source).split(/\r?\n/);
  return lines
    .filter((line) => !line.startsWith('@media(max-width:640px)'))
    .filter((line) => !line.includes('class="abh__mobile site-header"'))
    .filter((line) => !line.includes('class="abh__mobile-menu"'))
    .map((line) => {
      if (line.includes('.abh__mobile,.abh__mobile-menu,.anbox-mobile-part{display:none!important}')) {
        return line.replace('.abh__mobile,.abh__mobile-menu,.anbox-mobile-part{display:none!important}', '');
      }
      if (line.startsWith('@media(prefers-reduced-motion:reduce)')) {
        return '@media(prefers-reduced-motion:reduce){.abh__nav a::after{transition:none}}';
      }
      if (line.startsWith('(function(){var r=document.getElementById(\'abh-current\')')) {
        return "(function(){var r=document.getElementById('abh-current');if(!r||r.dataset.ready)return;r.dataset.ready='1';var d=r.querySelector('.abh__desktop'),tb=r.querySelector('.abh__tablet-button');if(!d||!tb)return;tb.addEventListener('click',function(){var on=d.classList.toggle('is-open');tb.setAttribute('aria-expanded',String(on))});document.addEventListener('keydown',function(e){if(e.key==='Escape'){d.classList.remove('is-open');tb.setAttribute('aria-expanded','false')}})})();";
      }
      return line;
    })
    .join('\n')
    .trim();
}

function desktopHero(source) {
  const lines = stripMobileInjection(source).split(/\r?\n/);
  return lines
    .filter((line) => !line.startsWith('@media(max-width:640px)'))
    .filter((line) => !line.includes('class="abh-mobile-hero hero anbox-mobile-part"'))
    .map((line) => {
      if (line.includes('.abh-mobile-hero{display:none}')) {
        return line.replace('.abh-mobile-hero{display:none}', '');
      }
      if (line.startsWith('@media(prefers-reduced-motion:reduce)')) {
        return '@media(prefers-reduced-motion:reduce){.abh-hero__slide{transition:none}.abh-hero__primary,.abh-hero__primary>span:last-child{transition:none!important;transform:none!important}}';
      }
      if (line.startsWith('(function(){var root=document.querySelector(\'.abh-hero\')')) {
        return line.replace(/;document\.querySelectorAll\('\.abh-mobile-hero__video'\)[\s\S]*?(?=\}\)\(\);$)/, '');
      }
      return line;
    })
    .join('\n')
    .trim();
}

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

for (const name of order) {
  const sourcePath = path.join(sourceDir, name);
  let content = fs.readFileSync(sourcePath, 'utf8');
  if (name === '00-header.html') content = desktopHeader(content);
  else if (name === '01-hero.html') content = desktopHero(content);
  else content = stripMobileInjection(content);
  fs.writeFileSync(path.join(outputDir, name), `${content}\n`, 'utf8');
}

fs.cpSync(path.join(sourceDir, 'assets'), path.join(outputDir, 'assets'), { recursive: true });

const preview = order
  .map((name) => fs.readFileSync(path.join(outputDir, name), 'utf8').trim())
  .join('\n\n');
fs.writeFileSync(
  path.join(outputDir, 'ANBOX-Studio-desktop-preview.html'),
  `${preview}\n`,
  'utf8'
);

const readme = [
  'ANBOX Studio — desktop final — 2026-08-26',
  '',
  'Порядок вставки блоков в Tilda:',
  ...order.map((name, index) => `${String(index + 1).padStart(2, '0')}. ${name}`),
  '',
  '03A-portfolio-styles.html вставляется непосредственно перед 03B-portfolio-screen.html.',
  'ANBOX-Studio-desktop-preview.html — общий предпросмотр всей desktop-версии.',
  'Папка assets должна сохранять относительный путь рядом с HTML.'
].join('\n');
fs.writeFileSync(path.join(outputDir, 'README.txt'), `${readme}\n`, 'utf8');

console.log(outputDir);
for (const name of order) {
  const size = fs.statSync(path.join(outputDir, name)).size;
  console.log(`${name}: ${size} bytes`);
}
