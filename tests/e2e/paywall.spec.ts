import { expect, test } from '@playwright/test'

test('select a plan, buy, reload and restore the persisted purchase', async ({ page }) => {
  await page.goto('/')
  const monthly = page.getByRole('radio', { name: /1 месяц/ })
  await monthly.check()
  await expect(page.getByRole('button', { name: 'Открыть за 399 ₽', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Открыть за 399 ₽', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Всё готово! Полный доступ открыт' }),
  ).toBeVisible()
  await expect(page.getByText('1 месяц · 399 ₽')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Восстановить покупки', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Всё готово! Полный доступ открыт' }),
  ).toBeVisible()
})

test('loading, failed offers and retry', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  await page.route('**/api/offers', async (route) => {
    await gate
    await route.fulfill({ status: 503, json: { statusMessage: 'Unavailable' } })
  })
  await page.goto('/')
  await expect(page.getByRole('status', { name: 'Загружаем тарифы' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Загружаем тарифы…', exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить тарифы')
  await page.unroute('**/api/offers')
  await page.getByRole('button', { name: 'Загрузить снова' }).click()
  await expect(page.getByRole('radio', { name: /12 месяцев/ })).toBeChecked()
})

test('purchase error retains choice; retry keeps request ID and prevents duplicate clicks', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('radio', { name: /12 месяцев/ })).toBeChecked()
  const bodies: { offerId: string; requestId: string }[] = []
  await page.route('**/api/purchase', async (route) => {
    bodies.push(route.request().postDataJSON())
    await route.fulfill({ status: 503, json: {} })
  })
  await page.getByRole('button', { name: 'Открыть за 2 390 ₽', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить покупку')
  await expect(page.getByRole('radio', { name: /12 месяцев/ })).toBeChecked()
  await page.getByRole('button', { name: 'Повторить · 2 390 ₽', exact: true }).click()
  await expect.poll(() => bodies.length).toBe(2)
  expect(bodies[0]).toEqual(bodies[1])
  await page.unroute('**/api/purchase')
  let release!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  await page.route('**/api/purchase', async (route) => {
    await gate
    await route.continue()
  })
  await page.getByRole('button', { name: 'Повторить · 2 390 ₽', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Открываем остров…', exact: true })).toBeDisabled()
  await expect(page.getByRole('radio', { name: /1 месяц/ })).toBeDisabled()
  release()
  await expect(
    page.getByRole('heading', { name: 'Всё готово! Полный доступ открыт' }),
  ).toBeVisible()
})

test('restore empty state and server failure are actionable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Восстановить покупки', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Покупок пока нет')
  await page.route('**/api/restore', (route) => route.fulfill({ status: 503, json: {} }))
  await page.getByRole('button', { name: 'Восстановить покупки', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось восстановить покупки')
  await expect(page.getByRole('button', { name: 'Повторить восстановление' })).toBeVisible()
})

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 360, height: 640 },
]) {
  test(`mobile layout ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('radio', { name: /12 месяцев/ })).toBeChecked()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    const primary = page.getByRole('button', { name: 'Открыть за 2 390 ₽', exact: true })
    await primary.scrollIntoViewIfNeeded()
    await expect(primary).toBeInViewport()
    const box = await primary.boundingBox()
    expect(box?.height).toBe(56)
    const restore = page.getByRole('button', { name: 'Восстановить покупки', exact: true })
    await restore.scrollIntoViewIfNeeded()
    await expect(restore).toBeInViewport()
    await page.screenshot({
      path: `design/browser-${test.info().project.name}-${viewport.width}-${viewport.height}.png`,
      fullPage: true,
    })
  })
}

test('keyboard radio navigation and visible focus', async ({ page }) => {
  await page.goto('/')
  const yearly = page.getByRole('radio', { name: /12 месяцев/ })
  await yearly.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: /1 месяц/ })).toBeChecked()
})

test('API validates input, preserves cookies and isolates devices', async ({
  request,
  playwright,
  baseURL,
}) => {
  const offers = await request.get('/api/offers')
  expect(offers.status()).toBe(200)
  expect((await offers.json()).offers).toHaveLength(2)
  expect(offers.headers()['set-cookie']).toContain('HttpOnly')
  const requestId = crypto.randomUUID()
  const first = await request.post('/api/purchase', { data: { offerId: 'yearly', requestId } })
  expect(first.status()).toBe(200)
  const purchase = await first.json()
  const second = await request.post('/api/purchase', { data: { offerId: 'yearly', requestId } })
  expect(await second.json()).toEqual(purchase)
  const restored = await request.post('/api/restore')
  expect((await restored.json()).purchase).toEqual(purchase)
  const invalid = await request.post('/api/purchase', {
    data: { offerId: 'invalid', requestId: crypto.randomUUID() },
  })
  expect(invalid.status()).toBe(400)
  const conflict = await request.post('/api/purchase', { data: { offerId: 'monthly', requestId } })
  expect(conflict.status()).toBe(409)
  const other = await playwright.request.newContext({ baseURL })
  expect((await (await other.post('/api/restore')).json()).purchase).toBeNull()
  await other.dispose()
})

test('retry after a committed purchase with a lost response returns the original receipt', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('radio', { name: /12 месяцев/ })).toBeChecked()
  let committed: { id: string; offerId: string; createdAt: string } | undefined
  let attempts = 0
  await page.route('**/api/purchase', async (route) => {
    attempts++
    if (attempts === 1) {
      const response = await route.fetch()
      expect(response.status()).toBe(200)
      committed = await response.json()
      await route.abort('failed')
    } else await route.continue()
  })
  await page.getByRole('button', { name: 'Открыть за 2 390 ₽', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить покупку')
  const response = page.waitForResponse(
    (res) => res.url().endsWith('/api/purchase') && res.status() === 200,
  )
  await page.getByRole('button', { name: 'Повторить · 2 390 ₽', exact: true }).click()
  expect(await (await response).json()).toEqual(committed)
  await expect(
    page.getByRole('heading', { name: 'Всё готово! Полный доступ открыт' }),
  ).toBeVisible()
  const restored = await page.request.post('/api/restore')
  expect((await restored.json()).purchase).toEqual(committed)
  expect(attempts).toBe(2)
})
