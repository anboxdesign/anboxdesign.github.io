import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/Users/Артём/Documents/сайт';
const sourcePath = path.join(root, 'ANBOX-Studio-mobile.html');
const kitDir = path.join(root, 'ANBOX-Studio-Tilda-screens-20260824-v4');
const startMarker = '<!-- ANBOX MOBILE CURRENT START -->';
const endMarker = '<!-- ANBOX MOBILE CURRENT END -->';

const source = fs.readFileSync(sourcePath, 'utf8');
const sourceStyle = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1];
const sourceScripts = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
const runtime = sourceScripts.at(-1)?.[1];

if (!sourceStyle || !runtime) {
  throw new Error('Не удалось извлечь мобильные стили или runtime из ANBOX-Studio-mobile.html');
}

function extract(openPattern, closeTag) {
  const match = source.match(new RegExp(`${openPattern}[\\s\\S]*?<\\/${closeTag}>`, 'i'));
  if (!match) throw new Error(`Не найден фрагмент: ${openPattern}`);
  return match[0].trim();
}

function extractRange(startPattern, endPattern) {
  const match = source.match(new RegExp(`${startPattern}([\\s\\S]*?)${endPattern}`, 'i'));
  if (!match) throw new Error(`Не найден диапазон: ${startPattern}`);
  return match[0].replace(new RegExp(`${endPattern}$`, 'i'), '').trim();
}

function section(className) {
  return extract(`<section\\s+class="[^"]*\\b${className}\\b[^"]*"`, 'section');
}

function stripOldInjection(text) {
  const start = text.indexOf(startMarker);
  if (start < 0) return text.trimEnd();
  const end = text.indexOf(endMarker, start);
  if (end < 0) throw new Error('Найдено начало мобильной вставки без конца');
  return (text.slice(0, start) + text.slice(end + endMarker.length)).trimEnd();
}

function wrapMobile(part, html, { main = false, id = '' } = {}) {
  const mainOpen = main ? `<main class="anbox-mobile-main"${id ? ` id="${id}"` : ''}>` : '';
  const mainClose = main ? '</main>' : '';
  return `<div class="anbox-mobile-part anbox-mobile-part--${part}">\n${mainOpen}\n${html}\n${mainClose}\n</div>`;
}

const header = extractRange('<header\\s+class="site-header"', '<main\\s+id="main">')
  .replace('id="top"', 'id="anbox-mobile-top"')
  .replaceAll('href="#top"', 'href="#anbox-mobile-top"');
const skipLink = '<a class="skip-link anbox-mobile-part" href="#anbox-mobile-main-start">К содержанию</a>';
const hero = `${section('hero')}\n${section('shelf-marquee')}`;
const footer = extract('<footer\\s+class="site-footer"', 'footer');

const switchCss = `<style data-anbox-mobile-switch>
.anbox-mobile-part{display:none!important}
@media (max-width:640px){
  .anbox-part-00,.anbox-part-01,.anbox-part-02,.anbox-part-03,.anbox-part-04,.anbox-part-05,.anbox-part-06,.anbox-part-07,.anbox-part-08,.anbox-part-09,.anbox-part-10{display:none!important}
  .anbox-mobile-part{
    display:block!important;
  }
  .anbox-mobile-part:not(.skip-link){
    position:relative;
    width:100vw!important;
    max-width:100vw!important;
    margin-inline:calc(50% - 50vw)!important;
  }
  .anbox-mobile-main{display:block;min-width:0}
  .anbox-mobile-part,.anbox-mobile-part *{box-sizing:border-box}
  .anbox-mobile-part--00{
    --paper:#f5f3ef;
    --white:#fff;
    --ink:#202024;
    --purple:#ad95ee;
    --lime:#dde63f;
    --pad:clamp(1rem,4.6vw,1.5rem);
    color:var(--white);
    font-family:"Onest",Arial,sans-serif;
  }
  .anbox-mobile-part--00 a{color:inherit;text-decoration:none}
  .anbox-mobile-part--00 button{font:inherit;color:inherit}
  .anbox-mobile-part--00 [hidden]{display:none!important}
  .anbox-mobile-part--00 .shell{width:min(100%,48rem);margin-inline:auto;padding-inline:var(--pad)}
  .skip-link.anbox-mobile-part{
    position:fixed;
    z-index:100;
    inset:.75rem auto auto .75rem;
    width:auto!important;
    max-width:calc(100vw - 1.5rem)!important;
    margin:0!important;
    padding:.75rem 1rem;
    border-radius:.5rem;
    background:var(--lime,#dde63f);
    color:var(--ink,#202024);
    transform:translateY(-180%);
  }
  .skip-link.anbox-mobile-part:focus{transform:translateY(0)}
  .anbox-mobile-part--00 .site-header{
    position:fixed;
    z-index:30;
    inset:0 0 auto;
    height:4.25rem;
    border-bottom:0;
    background:transparent;
    color:var(--white);
    backdrop-filter:none;
    transition:color 180ms cubic-bezier(.22,1,.36,1),background-color 180ms cubic-bezier(.22,1,.36,1),border-color 180ms cubic-bezier(.22,1,.36,1);
  }
  .anbox-mobile-part--00 .header-inner{height:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .anbox-mobile-part--00 .brand{min-height:2.75rem;display:inline-flex;align-items:center;color:var(--white)}
  .anbox-mobile-part--00 .brand__logo{width:clamp(8.75rem,39vw,10.5rem);height:auto;display:block;overflow:visible}
  .anbox-mobile-part--00 .menu-button{width:2.75rem;height:2.75rem;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.3);border-radius:50%;background:rgba(255,255,255,.16);color:var(--white);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:pointer}
  .anbox-mobile-part--00 .menu-icon,.anbox-mobile-part--00 .menu-icon::before,.anbox-mobile-part--00 .menu-icon::after{width:1rem;height:1px;display:block;background:currentColor;content:""}
  .anbox-mobile-part--00 .menu-icon::before{transform:translateY(-.3rem)}
  .anbox-mobile-part--00 .menu-icon::after{transform:translateY(.24rem)}
  .anbox-mobile-part--00 .no-js-nav{display:none!important}
  .anbox-mobile-part--00 .menu-sheet{position:fixed;z-index:50;inset:0;min-height:100vh;min-height:100dvh;overflow-y:auto;background:var(--purple);color:var(--ink)}
  .anbox-mobile-part--00 .menu-sheet__inner{width:min(100%,48rem);min-height:100vh;min-height:100dvh;margin-inline:auto;padding:max(1rem,env(safe-area-inset-top)) var(--pad) max(1.5rem,env(safe-area-inset-bottom));display:grid;grid-template-rows:auto 1fr auto;gap:2rem}
  .anbox-mobile-part--00 .menu-sheet__top{min-height:3.25rem;display:flex;align-items:center;justify-content:space-between}
  .anbox-mobile-part--00 .menu-sheet .brand{color:var(--ink)}
  .anbox-mobile-part--00 .menu-close{width:3rem;height:3rem;border:1px solid rgba(32,32,36,.35);border-radius:50%;background:transparent;font-size:1.45rem;cursor:pointer}
  .anbox-mobile-part--00 .menu-links{display:grid;align-content:center;gap:.2rem}
  .anbox-mobile-part--00 .menu-links a{min-height:3.6rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(32,32,36,.25);font-size:clamp(1.8rem,8vw,3rem);font-weight:600;line-height:1;letter-spacing:-.05em}
  .anbox-mobile-part--00 .menu-links span{font-size:.72rem;letter-spacing:0}
  .anbox-mobile-part--00 .menu-sheet__footer{display:flex;justify-content:space-between;gap:1rem;font-size:.78rem}
  .anbox-mobile-part--00 .site-header.is-scrolled{border-bottom:1px solid rgba(32,32,36,.1);background:rgba(245,243,239,.94);color:var(--ink);backdrop-filter:blur(1rem)}
  .anbox-mobile-part--00 .site-header.is-scrolled .brand{color:var(--ink)}
  .anbox-mobile-part--00 .site-header.is-scrolled .menu-button{border-color:var(--ink);background:var(--ink);color:var(--white);backdrop-filter:none}
}
</style>`;

const mobileBootstrap = `<script data-anbox-mobile-bootstrap>
document.documentElement.classList.add('js');
</script>`;

const mobileMenuRuntime = `<script data-anbox-mobile-menu-runtime>
(function(){
  var root=document.querySelector('.anbox-mobile-part--00');
  if(!root||root.dataset.mobileMenuReady==='1')return;
  var opener=root.querySelector('.menu-button');
  var menu=root.querySelector('.menu-sheet');
  var closer=menu&&menu.querySelector('.menu-close');
  if(!opener||!menu||!closer)return;
  var headerLogo=root.querySelector('.site-header .brand__logo');
  var logoSymbol=headerLogo&&headerLogo.querySelector('symbol');
  if(headerLogo&&logoSymbol){
    var logoShapes=Array.prototype.map.call(logoSymbol.children,function(node){return node.cloneNode(true)});
    while(headerLogo.firstChild)headerLogo.removeChild(headerLogo.firstChild);
    logoShapes.forEach(function(node){headerLogo.appendChild(node)});
  }
  var menuBrand=menu.querySelector('.menu-sheet__top .brand');
  if(headerLogo&&menuBrand){
    var menuLogo=headerLogo.cloneNode(true);
    menuLogo.removeAttribute('role');
    menuLogo.removeAttribute('aria-label');
    menuLogo.setAttribute('aria-hidden','true');
    while(menuBrand.firstChild)menuBrand.removeChild(menuBrand.firstChild);
    menuBrand.appendChild(menuLogo);
  }
  root.dataset.mobileMenuReady='1';
  menu.dataset.anboxMenuReady='1';
  function openMenu(){menu.hidden=false;document.documentElement.style.overflow='hidden';opener.setAttribute('aria-expanded','true');closer.focus()}
  function closeMenu(returnFocus){menu.hidden=true;document.documentElement.style.overflow='';opener.setAttribute('aria-expanded','false');if(returnFocus!==false)opener.focus()}
  opener.addEventListener('click',openMenu);
  closer.addEventListener('click',function(){closeMenu(true)});
  menu.addEventListener('click',function(event){if(event.target.closest('a'))closeMenu(false)});
  document.addEventListener('keydown',function(event){if(!menu.hidden&&event.key==='Escape'){event.preventDefault();closeMenu(true)}});
})();
</script>`;

const coreCss = `<style media="(max-width:640px)" data-anbox-mobile-core="ANBOX-Studio-mobile.html">
${sourceStyle}
</style>`;

const runtimeScript = `<script data-anbox-mobile-runtime>
(function(){
  var mobileQuery=window.matchMedia('(max-width:640px)'),mobileStarted=false;
  function startMobile(){
    if(mobileStarted||!mobileQuery.matches)return;
    mobileStarted=true;
    document.documentElement.classList.replace('no-js','js');
    ${runtime}
  }
  startMobile();
  if(mobileQuery.addEventListener)mobileQuery.addEventListener('change',startMobile);
  else if(mobileQuery.addListener)mobileQuery.addListener(startMobile);
})();
</script>`;

const injections = new Map([
  // 00-header and 01-hero are compact self-contained VibeBlocks.
  // Do not append generated mobile layers to them: their current desktop
  // and mobile implementations live inside the files themselves.
  ['02-approach.html', wrapMobile('02', section('approach'), { main: true })],
  ['03B-portfolio-screen.html', wrapMobile('03', section('portfolio'), { main: true })],
  ['04-services.html', wrapMobile('04', section('services'), { main: true })],
  ['05-packages.html', wrapMobile('05', section('packages'), { main: true })],
  ['06-clients.html', `${coreCss}\n${wrapMobile('06', section('clients'), { main: true })}`],
  ['07-team-training.html', wrapMobile('07', section('studio'), { main: true })],
  ['08-blog.html', wrapMobile('08', section('journal'), { main: true })],
  ['09-contacts.html', wrapMobile('09', section('contact'), { main: true })],
  ['10-footer.html', `${wrapMobile('10', footer)}\n${runtimeScript}`],
]);

for (const [name, injection] of injections) {
  const file = path.join(kitDir, name);
  const current = stripOldInjection(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, `${current}\n\n${startMarker}\n${injection}\n${endMarker}\n`, 'utf8');
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
  '10-footer.html',
];

const preview = order.map((name) => fs.readFileSync(path.join(kitDir, name), 'utf8').trim()).join('\n\n');
fs.writeFileSync(path.join(kitDir, 'ANBOX-Studio-all-screens-preview.html'), `${preview}\n`, 'utf8');

console.log('Мобильная композиция перенесена из ANBOX-Studio-mobile.html');
for (const name of order) {
  console.log(`${name}: ${fs.statSync(path.join(kitDir, name)).size} bytes`);
}
