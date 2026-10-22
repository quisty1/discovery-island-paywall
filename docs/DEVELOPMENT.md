# Остров открытий — мобильный paywall

Nuxt 4.6.1 + Vue 3 + TypeScript. Экран, API и серверная запись покупки находятся в одном проекте. Оплата демонстрационная: реальные деньги, платёжные SDK и ключи оплаты не используются.

**[Живой сервис](https://discovery-island-paywall.discovery-island-paywall.workers.dev)** · **[Редактируемый макет Figma](https://www.figma.com/design/DeCkXi6MVX7uve6YZvdDy3?node-id=2-12)** · [Основной экран PNG](../design/browser-chromium-390-844.png)

## Запуск

Требуется Node.js 22.22.3+ или 24.15+ (проверено на 24.21) и pnpm 11.25.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm dev
```

Откройте `http://localhost:3000`. В dev-режиме `nitro-cloudflare-dev` подключает локальный эмулятор D1; данные находятся в `.wrangler/state/v3`, не в оперативной памяти. Для разработки аккаунт Cloudflare не нужен.

Годовой тариф выбран по умолчанию. После покупки экран показывает подтверждение только после записи в D1. Обновите страницу и нажмите «Восстановить покупки», чтобы проверить сохранённую покупку.

## Архитектура и API

- `app/` — mobile-first экран, компоненты карточки, покупки и успеха; состояние запросов в `usePaywall`.
- `server/api/` — Nitro-маршруты, `server/utils/` — тарифы, cookie устройства и операции D1.
- `shared/types.ts` — общие типы клиента и сервера; `migrations/` — схема постоянной БД.
- `public/` — локальный Nunito (OFL-лицензия рядом) и те же SVG, что использованы в Figma.

| Запрос               | Вход                                                  | Результат                                                               |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/offers`    | —                                                     | `{ offers: Offer[] }`, установка cookie устройства при первом обращении |
| `POST /api/purchase` | `{ offerId: "monthly" \| "yearly", requestId: UUID }` | `{ id, offerId, createdAt }`                                            |
| `POST /api/restore`  | —                                                     | `{ purchase: Purchase \| null }`                                        |

`amount` — цена в копейках, `currency` — `RUB`, `period` — `month` / `year`. Тарифы и цены задаёт сервер. Неизвестный тариф или некорректный UUID дают HTTP 400; повтор того же requestId с другим тарифом — 409; недоступная БД — 503.

В D1 сохраняются `id`, `offer_id`, `device_id`, `created_at` (UTC ISO 8601), `request_id`. Уникальный индекс `(device_id, request_id)` защищает от повторных записей, включая конкурентные запросы. При сетевой ошибке клиент повторно использует requestId: потеря ответа не создаёт вторую покупку.

Условный идентификатор устройства — случайный UUID в first-party cookie `island_device`, HttpOnly, SameSite=Lax, Secure при HTTPS, срок 1 год. Персональные данные не запрашиваются. Восстановление доступно только в том же браузере/webview, пока сохранена cookie. Это демонстрационная операция без проверки срока подписки, платежей и автоматических продлений.

## Проверки

```bash
pnpm test
pnpm typecheck
pnpm exec playwright install chromium webkit
pnpm test:e2e
pnpm test:visual
pnpm test:visual:states
pnpm build
```

E2E и визуальные проверки ожидают запущенное приложение. Для проверки production-сборки:

```bash
pnpm build
pnpm preview
# В другом терминале:
TEST_BASE_URL=http://localhost:8787 pnpm test:e2e
TEST_BASE_URL=http://localhost:8787 pnpm test:visual
```

Unit-тесты выполняют настоящие SQLite-запросы по той же миграции. E2E проверяют настоящий API с локальным D1; сетевые перехваты используются отдельно для loading/error. Проверяются покупка обоих тарифов, восстановление, отсутствие дублей, изоляция устройств, клавиатура, размеры 360×800 / 390×844 / 430×932 и короткий экран 360×640.

### Сравнение с Figma

В `design/` сохранены PNG из Figma, браузерные снимки, изображения разницы и `visual-report.json`. Воспроизводимый скрипт — `pnpm test:visual`. Метрика: pixelmatch, DPR 1, `threshold: 0.1`, `includeAA: false`, допустимо не больше 1% различающихся пикселей. Сглаживание границ исключено, сами текст, иллюстрация и интерфейс участвуют в сравнении. Результаты относятся к указанным размерам и окружению; проверка на физическом телефоне отдельно нужна для реальных safe area и особенностей встроенного webview.

Сводные результаты и ограничения: [VERIFICATION.md](../VERIFICATION.md).

## Деплой в Cloudflare Workers + D1

Сервис опубликован 22 октября 2026 года: **https://discovery-island-paywall.discovery-island-paywall.workers.dev**. Удалённая D1 `discovery-island-purchases` создана в регионе Eastern Europe, миграция `0001_purchases.sql` применена; её настоящий `database_id` указан в `wrangler.jsonc`.

Workers и D1 выбраны, поскольку доступны на бесплатном тарифе, поддерживают Nitro server routes и постоянную SQL-базу без отдельного сервера. Платные опции для деплоя не подключались. Действуют [лимиты Workers Free](https://developers.cloudflare.com/workers/platform/limits/) и [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/).

Повторная публикация из аккаунта, которому принадлежат Worker и D1:

```bash
pnpm exec wrangler login --scopes account:read user:read workers:write workers_scripts:write d1:write
pnpm db:migrate:remote
pnpm deploy
```

Проверка записей в удалённой БД:

```bash
pnpm exec wrangler d1 execute DB --remote --config wrangler.jsonc --command "SELECT id, offer_id, created_at FROM purchases ORDER BY created_at DESC LIMIT 5"
```

После повторного деплоя покупка восстанавливается в том же браузере/webview: D1 существует отдельно от Worker. Для публикации в другом аккаунте сначала создайте свою D1 командой `pnpm exec wrangler d1 create discovery-island-purchases --config wrangler.jsonc --update-config=false`, замените `database_id`, сохранив binding `DB`, и примените миграцию. При нескольких аккаунтах задайте `CLOUDFLARE_ACCOUNT_ID` через окружение.

Nuxt собирается с Nitro preset `cloudflare_module`. Nitro формирует `.output/server/wrangler.json`, а Wrangler использует перенаправление из `.wrangler/deploy/config.json`. Скрипты миграций явно используют исходный `wrangler.jsonc`, чтобы путь к `migrations/` не зависел от build output. Приложение получает D1 через `event.context.cloudflare.env.DB`; секретный ключ БД в браузере или исходниках не нужен.

Публикуется полноценный Worker с SSR и server routes. Не используйте `nuxt generate` или статический экспорт: они не выполняют запись покупки.
