# Остров открытий — мобильный paywall

Тестовое задание на Nuxt 4 + TypeScript: два тарифа, покупка и восстановление через server routes с постоянной записью в БД. Реальные деньги и платёжные SDK не используются.

[Живой сервис](https://discovery-island-paywall.discovery-island-paywall.workers.dev) · [Макет Figma](https://www.figma.com/design/DeCkXi6MVX7uve6YZvdDy3?node-id=2-12) · [GitHub](https://github.com/quisty1/discovery-island-paywall)

## Локальный запуск

Node.js 22.22.3+ или 24.15+ и pnpm 11.25.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm dev
```

Откройте http://localhost:3000. Аккаунт Cloudflare и секреты для разработки не нужны: используется локальный эмулятор D1 с данными в `.wrangler/state/v3`.

## Где находится код

- `app/` — mobile-first экран и компоненты; `app/composables/usePaywall.ts` — выбор тарифа и состояния запросов.
- `server/api/` — `GET /api/offers`, `POST /api/purchase`, `POST /api/restore`.
- `server/utils/` — подключение D1 и работа с покупками; `migrations/` — SQL-схема; `shared/types.ts` — общие типы.

## Деплой и база данных

Выбраны **Cloudflare Workers + D1**: Nuxt server routes и постоянная SQL-база работают без отдельного сервера. Покупка сохраняет тариф, UTC-время и UUID устройства из HttpOnly-cookie. Повтор запроса не создаёт дубликат; восстановление работает в том же браузере/webview, пока сохранена cookie.

Для своего деплоя создайте D1, замените `database_id` в `wrangler.jsonc`, выполните `pnpm db:migrate:remote` и `pnpm deploy`. Пошаговая инструкция, API и команды проверок — в [DEVELOPMENT.md](docs/DEVELOPMENT.md).

## AI-инструменты и проверка результата

**Codex** использовался для ревью проекта, визуальной сверки с Figma, запуска проверок и подготовки документации. Помимо чтения кода проверены реальные покупка и восстановление на живом сервисе, записи в удалённой D1 и мобильные снимки интерфейса.

Прошли 10 unit-тестов, 22 E2E в Chromium/WebKit, TypeScript и production build. Расхождение с экспортами Figma на проверенных экранах — 0,168–0,866% по pixelmatch с исключением сглаживания. Подробности и ограничения — в [VERIFICATION.md](VERIFICATION.md). Физические телефоны и настоящий встроенный webview не проверялись.

## Если бы было ещё 2 часа

Проверил бы экран в iOS/Android webview на физических устройствах: safe area, поворот, масштаб текста и нестабильную сеть; настроил бы запуск unit-тестов, TypeScript и сборки в GitHub Actions.
