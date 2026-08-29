ANBOX Studio — responsive clean — 2026-08-26

Порядок вставки VibeBlock в Tilda:
01. 00-header.html
02. 01-hero.html
03. 02-approach.html
04. 03A-portfolio-system.html
05. 03B-portfolio.html
06. 04-services.html
07. 05-packages.html
08. 06-clients.html
09. 07-team-training.html
10. 08-blog.html
11. 09-contacts.html
12. 10-footer.html

Каждый визуальный HTML-файл содержит два соседних корня: desktop и mobile.
Breakpoint: mobile <= 640 px; desktop >= 641 px.
00-header.html должен идти первым: в нём находятся общие токены, mobile design layer и desktop reveal-core.
03A-portfolio-system.html — служебный блок со стилями; вставляйте непосредственно перед 03B.
03B-portfolio.html — визуальный блок с соседними desktop/mobile корнями и маркерами data-anbox-case для редактирования кейсов.
CSS ограничен корнями версий; недостижимые селекторы прошлых секций и повторные scroll-replay runtime удалены.
Desktop reveal запускается только после фактического входа элемента минимум на 16 px в viewport; при возврате вверх последовательности воспроизводятся в обратном порядке.
Новый reveal-core не монтируется на mobile-корни: mobile сохраняет собственные согласованные анимации и механику «Смотреть ещё кейсы».
Текст и действия на desktop проявляются чистым fade за 400 ms. Изображения не масштабируются и не деформируются.
Заголовок длится на 500 ms дольше и раскрывается по фактическим строкам мягкой маской без изменения HTML-разметки текста. Выделение стартует через 500 ms после его завершения.
Карточки идут по одной с шагом 130–150 ms, получают только короткую глубину 6–8 px и едва заметный расфокус без изменения геометрии.
06-clients.html не подключён к reveal-core: обе ленты логотипов сохраняют собственный независимый runtime.
Цветовые роли: paper #F3F4F0, ink #151716, purple #AD95EE, purple-strong #7658D0, lime #DDE63F.
Mobile HERO сохраняет autoplay, muted, loop, playsinline и preload=auto.
ANBOX-Studio-responsive-preview.html — общий локальный предпросмотр.
ANBOX-Studio-mobile-preview.html — актуальный предпросмотр общей страницы в фиксированном мобильном viewport 390 px.
SPEC.md — спецификация объединения; DESIGN-SYSTEM.md — зафиксированная система; TILDA-VIBE-SECTION-SPEC.md — исходный контракт Tilda.
Сохраняйте папки assets и hero-layout-variants, а также bebas-neue-bold.woff рядом с HTML.

После вставки проверьте в Tilda, что обе соседние версии выделяются как отдельные Вайб-секции.
