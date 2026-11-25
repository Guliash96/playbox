# PlayBox

Збірка казуальних головоломок для Telegram Mini App та браузера (далі Android/iOS через Capacitor).

## Запуск
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # готова статика в dist/
npm run typecheck
```

## Структура
```
src/
  main.ts            роутинг (#parking, #bus …), запуск гри
  hub.ts             головне меню
  core/              спільне: ui (модалки, тости), store (прогрес), platform (Telegram/web/Capacitor),
                     ads (реклама + покупка "без реклами"), flow (кінець рівня, серця)
  art/               SVG-малюнки: машини, автобуси, коти, монети, плитки маджонгу
  games/registry.ts  список ігор (назва, колір, іконка, ліниве завантаження)
  games/<гра>.ts     логіка гри + <гра>.css (фон і стиль)
```
Нова гра = файл у `games/` з `export default { title, theme, start(el), stop() }` + рядок у `registry.ts`.

## Деплой (GitHub Pages)
1. Створи репозиторій, залий код у гілку `main`.
2. Settings → Pages → Source: **GitHub Actions**. Workflow `.github/workflows/deploy.yml` збере й опублікує сайт.
3. Адреса буде `https://<логін>.github.io/<репо>/`.

Альтернатива: Cloudflare Pages (build command `npm run build`, output `dist`).

## Telegram Mini App
1. У @BotFather: `/newbot` → отримай бота.
2. `/mybots` → бот → **Bot Settings → Menu Button** → вкажи URL з деплою.
3. (опційно) `/newapp` → прив'яжи той самий URL, щоб мати пряме посилання `t.me/<бот>/<app>`.
Скрипт `telegram-web-app.js` уже підключений в `index.html`; кнопка "Назад", хаптика й розгортання на весь екран працюють через `core/platform.ts`.

## Монетизація (зараз демо-заглушки в `core/ads.ts`)
| Платформа | Реклама | Без реклами |
|---|---|---|
| Telegram | Adsgram | Telegram Stars (`openInvoice`, потрібен бекенд для створення інвойсу) |
| Web | AdSense for Games / SDK CrazyGames, Poki | Stripe |
| Android / iOS | AdMob (Capacitor) | Google Play Billing / StoreKit |
