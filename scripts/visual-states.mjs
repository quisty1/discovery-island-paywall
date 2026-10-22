import { chromium } from '@playwright/test'
import fs from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
const browser = await chromium.launch()
const report = []
for (const state of ['monthly', 'loading', 'purchasing', 'error', 'success']) {
  const height = state === 'error' ? 920 : 844
  const page = await browser.newPage({ viewport: { width: 390, height }, deviceScaleFactor: 1 })
  if (state === 'loading') await page.route('**/api/offers', () => {})
  await page.goto(process.env.TEST_BASE_URL || 'http://localhost:3000')
  if (state !== 'loading') await page.getByRole('radio', { name: /12 месяцев/ }).waitFor()
  if (state === 'monthly') await page.getByRole('radio', { name: /1 месяц/ }).check()
  if (state === 'purchasing') {
    await page.route('**/api/purchase', () => {})
    await page.getByRole('button', { name: 'Открыть за 2 390 ₽', exact: true }).click()
    await page.getByRole('button', { name: 'Открываем остров…', exact: true }).waitFor()
  }
  if (state === 'error') {
    await page.route('**/api/purchase', (r) => r.fulfill({ status: 503, json: {} }))
    await page.getByRole('button', { name: 'Открыть за 2 390 ₽', exact: true }).click()
    await page.getByRole('alert').waitFor()
  }
  if (state === 'success') {
    await page.getByRole('button', { name: 'Открыть за 2 390 ₽', exact: true }).click()
    await page.getByRole('heading', { name: 'Всё готово! Полный доступ открыт' }).waitFor()
  }
  await page.evaluate(() => document.fonts.ready)
  const root = `design/`
  await page.screenshot({
    path: `${root}browser-${state}-390-${height}.png`,
    animations: 'disabled',
  })
  const a = PNG.sync.read(fs.readFileSync(`${root}figma-${state}-390-${height}.png`))
  const b = PNG.sync.read(fs.readFileSync(`${root}browser-${state}-390-${height}.png`))
  const out = new PNG({ width: 390, height })
  const changed = pixelmatch(a.data, b.data, out.data, 390, height, {
    threshold: 0.1,
    includeAA: false,
  })
  fs.writeFileSync(`${root}diff-${state}-390-${height}.png`, PNG.sync.write(out))
  report.push({
    state,
    width: 390,
    height,
    changedPixels: changed,
    differencePercent: (100 * changed) / (390 * height),
    pass: (100 * changed) / (390 * height) <= 1,
  })
  await page.close()
}
await browser.close()
fs.writeFileSync('design/states-report.json', JSON.stringify(report, null, 2) + '\n')
console.log(report)
if (report.some((result) => !result.pass)) process.exitCode = 1
