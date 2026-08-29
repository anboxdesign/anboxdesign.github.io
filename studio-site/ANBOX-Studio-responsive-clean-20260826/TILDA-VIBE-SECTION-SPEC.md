# Спецификация: создание «Вайб-секции» внутри VibeBlock Tilda

## 1. Термины

**VibeBlock** — кодовый блок Tilda, содержащий HTML, CSS и JavaScript.

**Вайб-секция** — отдельная часть VibeBlock, которую редактор Tilda распознаёт как самостоятельную секцию и показывает для неё панель:

- «Вайб-секция»;
- «Контент»;
- «Чат»;
- дублирование;
- удаление;
- перемещение.

## 2. Главное условие

Внутри одного VibeBlock должно находиться минимум два соседних корневых HTML-элемента.

Tilda не требует именно тег `<section>`. Подходят `<div>`, `<section>`, `<main>`, `<article>` и другие контейнеры.

Панель показывается, когда редактор насчитывает больше одной верхнеуровневой секции:

```js
section.count > 1
```

Теги `<style>`, `<script>`, `<link>` и `<template>` при подсчёте не учитываются.

## 3. Рабочая структура блока «Наш подход»

```html
<style>
  /* Общие стили */
</style>

<!-- Корневой блок №1: desktop -->
<div class="anbox-part-02">
  <div class="anbox-full-page anbox-composite">
    <section id="abx-approach-v8">
      <!-- Desktop-контент -->
    </section>
  </div>
</div>

<script>
  /* Desktop-логика */
</script>

<style>
  /* Mobile-стили */
</style>

<!-- Корневой блок №2: mobile -->
<div class="anbox-mobile-part anbox-mobile-part--02">
  <main class="anbox-mobile-main">
    <section class="section approach" id="approach">
      <!-- Mobile-контент -->
    </section>
  </main>
</div>

<script>
  /* Mobile-логика */
</script>
```

Редактор видит два корневых элемента:

```html
<div class="anbox-part-02">...</div>
<div class="anbox-mobile-part anbox-mobile-part--02">...</div>
```

Поэтому появляется панель «Вайб-секция».

## 4. Нерабочая структура

```html
<section class="anbox-part-02">
  <div>
    <section>
      <!-- Весь контент -->
    </section>
  </div>
</section>
```

Здесь только один корневой элемент. Наличие вложенного `<section>` не гарантирует появления панели.

Также нельзя объединять desktop и mobile общим контейнером:

```html
<!-- Не рекомендуется -->
<div class="common-wrapper">
  <div class="desktop-version">...</div>
  <div class="mobile-version">...</div>
</div>
```

Надёжнее оставить версии соседними корневыми элементами.

## 5. Правила адаптивности

Desktop- и mobile-версии переключаются через CSS, но остаются в DOM отдельными элементами:

```css
.anbox-desktop {
  display: block;
}

.anbox-mobile {
  display: none;
}

@media (max-width: 640px) {
  .anbox-desktop {
    display: none;
  }

  .anbox-mobile {
    display: block;
  }
}
```

Tilda учитывает оба элемента даже тогда, когда один из них скрыт через `display: none`.

Требования:

- desktop и mobile должны быть соседними корневыми элементами;
- у каждой версии должны быть собственные уникальные `id`;
- CSS-селекторы одной версии не должны влиять на другую;
- JavaScript должен запускаться только внутри своего корневого элемента;
- содержимое не должно кратковременно отображаться одновременно при загрузке.

## 6. Эталонная структура HERO

В HERO используются две соседние секции:

```html
<section class="abh-hero anbox-part-01" id="top">
  <!-- Desktop HERO -->
</section>

<section
  class="abh-mobile-hero hero anbox-mobile-part"
  id="anbox-mobile-main-start"
>
  <!-- Mobile HERO -->
</section>
```

Это второй подтверждённый рабочий вариант. В первом блоке корневыми элементами являются `<div>`, а в HERO — `<section>`. Следовательно, тип тега не важен: важны соседство и количество корневых элементов.

## 7. Правила работы с изображениями

### 7.1. Основной формат

Значимые изображения следует вставлять настоящим тегом `<img>`:

```html
<img
  src="https://static.tildacdn.com/path/image.jpg"
  alt="Проект Мистраль"
  width="1080"
  height="1080"
>
```

Это даёт Tilda возможность распознать изображение как отдельный редактируемый элемент.

Обязательные атрибуты:

- `src` — постоянный HTTPS-адрес;
- `alt` — описание содержания;
- `width` и `height` — исходные пропорции изображения.

Для декоративной картинки используется пустой `alt`:

```html
<img
  src="https://static.tildacdn.com/path/decor.png"
  alt=""
  width="1200"
  height="600"
>
```

### 7.2. Загрузка изображений

Главное изображение первого экрана:

```html
<img
  src="..."
  alt="Проект Мистраль"
  width="1080"
  height="1080"
  fetchpriority="high"
>
```

Второстепенные и скрытые изображения:

```html
<img
  src="..."
  alt="Проект BEZOOM"
  width="1080"
  height="1080"
  loading="lazy"
>
```

Правила:

- `fetchpriority="high"` получает только главное изображение первого экрана;
- слайды после первого используют `loading="lazy"`;
- нельзя ставить высокий приоритет всем изображениям;
- скрытая mobile-версия также должна использовать отложенную загрузку, если медиа не требуется сразу.

### 7.3. Размер и кадрирование

Контейнер управляет формой и обрезкой:

```css
.project-media {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  aspect-ratio: 1 / 1;
}

.project-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 50%;
}
```

Требования:

- изображение не должно определять высоту секции случайным образом;
- контейнер получает `aspect-ratio`, фиксированную высоту или `min-height`;
- для фотографий обычно используется `object-fit: cover`;
- для логотипов и упаковки, которые нельзя обрезать, используется `object-fit: contain`;
- точка кадрирования задаётся через `object-position`.

### 7.4. Слайдеры

Структура одного слайда:

```html
<article
  class="project-slide is-active"
  data-title="Мистраль"
  data-meta="Упаковка · редизайн"
>
  <img
    src="https://static.tildacdn.com/path/project.jpg"
    alt="Проект Мистраль"
    width="1080"
    height="1080"
    fetchpriority="high"
  >
</article>
```

Неактивные слайды:

```css
.project-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  visibility: hidden;
}

.project-slide.is-active {
  opacity: 1;
  visibility: visible;
}
```

Каждая картинка должна оставаться отдельным `<img>`. Не следует собирать весь слайдер одним CSS-фоном.

### 7.5. Фоновые изображения

CSS-фон допустим только для декоративных изображений:

```css
.decorative-background {
  background-image: url("https://static.tildacdn.com/path/background.jpg");
  background-size: cover;
  background-position: center;
}
```

Значимый контент не следует помещать:

- в `background-image`;
- в `::before`;
- в `::after`.

Такие изображения хуже редактируются, не имеют нормального `alt` и могут не распознаваться как самостоятельный медиаконтент.

### 7.6. `<picture>`

Для разных исходников под разные экраны разрешён `<picture>`, но внутри обязательно должен оставаться `<img>`:

```html
<picture>
  <source
    media="(max-width: 640px)"
    srcset="https://static.tildacdn.com/path/mobile.webp"
  >
  <img
    src="https://static.tildacdn.com/path/desktop.jpg"
    alt="Описание проекта"
    width="1600"
    height="900"
  >
</picture>
```

### 7.7. Видео

Для фонового mobile-видео:

```html
<video
  src="https://static.tildacdn.com/path/video.mp4"
  poster="https://static.tildacdn.com/path/poster.jpg"
  autoplay
  muted
  loop
  playsinline
  preload="metadata"
  aria-hidden="true"
></video>
```

Правила:

- для автозапуска обязательны `muted` и `playsinline`;
- рекомендуется указывать `poster`;
- декоративное видео получает `aria-hidden="true"`;
- содержательное видео должно иметь доступное название и управление;
- необходимо учитывать `prefers-reduced-motion`.

## 8. Правила JavaScript

Вся логика ограничивается конкретным корнем:

```js
(function () {
  var root = document.querySelector(".anbox-part-02");

  if (!root || root.dataset.ready === "1") {
    return;
  }

  root.dataset.ready = "1";

  // Вся работа ведётся через root.querySelector(...)
})();
```

Запрещено без необходимости использовать глобальные селекторы:

```js
// Плохо
document.querySelector(".project-slide");
```

Нужно:

```js
// Правильно
root.querySelector(".project-slide");
```

Это предотвращает конфликты между desktop-, mobile-версиями и продублированными блоками.

## 9. Ограничение редактора Tilda

Desktop- и mobile-контейнеры считаются двумя самостоятельными Вайб-секциями. Поэтому действия панели применяются к каждому корневому элементу отдельно.

При использовании команд «Удалить», «Дублировать» и «Переместить» необходимо проверять, какая версия выбрана. Дублирование только desktop-контейнера не создаёт полноценную пару desktop + mobile.

Не рекомендуется добавлять пустую скрытую секцию только ради появления панели. Второй корневой элемент должен содержать реальную mobile-версию или другую полноценную часть блока.

## 10. Критерии приёмки

Блок считается корректной Вайб-секцией, если:

- внутри VibeBlock есть минимум два соседних корневых элемента;
- вокруг них нет общего HTML-контейнера;
- `<style>` и `<script>` находятся вне корневых визуальных элементов;
- при наведении появляется панель «Вайб-секция»;
- каждая версия выделяется отдельной рамкой;
- desktop отображается выше 640 px;
- mobile отображается на ширине 640 px и меньше;
- изображения имеют `src`, `alt`, `width` и `height`;
- главное изображение загружается приоритетно;
- остальные изображения загружаются лениво;
- значимые изображения представлены тегом `<img>`;
- идентификаторы desktop и mobile не повторяются;
- JavaScript ограничен своим корневым контейнером;
- страница не получает горизонтальную прокрутку;
- после публикации внешний вид совпадает с редактором.

## 11. Минимальный шаблон

```html
<style>
  .example-desktop {
    display: block;
  }

  .example-mobile {
    display: none;
  }

  .example-media {
    overflow: hidden;
    aspect-ratio: 16 / 9;
  }

  .example-media img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 640px) {
    .example-desktop {
      display: none;
    }

    .example-mobile {
      display: block;
    }
  }
</style>

<section class="example-desktop" aria-labelledby="example-desktop-title">
  <h2 id="example-desktop-title">Заголовок desktop</h2>

  <div class="example-media">
    <img
      src="https://static.tildacdn.com/path/desktop.jpg"
      alt="Описание изображения"
      width="1600"
      height="900"
      fetchpriority="high"
    >
  </div>
</section>

<section class="example-mobile" aria-labelledby="example-mobile-title">
  <h2 id="example-mobile-title">Заголовок mobile</h2>

  <div class="example-media">
    <img
      src="https://static.tildacdn.com/path/mobile.jpg"
      alt="Описание изображения"
      width="800"
      height="1000"
      loading="lazy"
    >
  </div>
</section>

<script>
  (function () {
    var desktop = document.querySelector(".example-desktop");
    var mobile = document.querySelector(".example-mobile");

    if (!desktop || !mobile) {
      return;
    }

    // Логика блока
  })();
</script>
```

## 12. Примечание

Механизм определения Вайб-секций является внутренней логикой редактора Tilda, а не публичным HTML-стандартом. После крупных обновлений Tilda необходимо повторно проверить условие появления панели.
