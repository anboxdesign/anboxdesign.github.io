# ANBOX Studio website

Статус: `current`  
Последняя сборка: `2026-08-29`

## Готовый комплект

- `ANBOX-Studio-responsive-clean-20260826/` — актуальные responsive-блоки для последовательной вставки в Tilda;
- `ANBOX-Studio-responsive-clean-20260826/ANBOX-Studio-responsive-preview.html` — общий desktop-предпросмотр;
- `ANBOX-Studio-responsive-clean-20260826/ANBOX-Studio-mobile-preview.html` — mobile-предпросмотр;
- `ANBOX-Studio-responsive-clean-20260826/QA/` — итоговый отчёт проверки без тяжёлых скриншотов.

## Источники

- `ANBOX-Studio-desktop-final-20260826/` — desktop-источники отдельных секций;
- `ANBOX-Studio-mobile.html` — согласованный mobile-источник;
- `anbox-cases-2026-08-27.json` — актуальные данные и порядок кейсов;
- `assets/` — локальные изображения, логотипы и ресурсы;
- `tools/` — сборка и автоматическая проверка;
- `design-system.md`, `DESIGN.md`, `PRODUCT.md` и сопутствующие документы — зафиксированная система проекта.

## Сборка

Из каталога `studio-site`:

```powershell
node .\tools\build-anbox-responsive-clean.mjs
```

Проверка на рабочем компьютере ANBOX:

```powershell
node .\tools\qa-anbox-responsive.mjs
```

Сборщик не смешивает desktop и mobile: в каждом выходном файле находятся два соседних изолированных корня, переключаемых медиаправилом.

