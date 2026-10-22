import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const browser = await chromium.launch()
const context = await browser.newContext({ deviceScaleFactor: 1 })
const page = await context.newPage()
const results = []
try {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto(baseURL)
    await page.getByRole('radio', { name: /12 месяцев/ }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    const actual = `design/browser-chromium-${width}-${height}.png`
    await page.screenshot({ path: actual })
    const reference = PNG.sync.read(readFileSync(`design/figma-${width}-${height}.png`))
    const rendered = PNG.sync.read(readFileSync(actual))
    const diff = new PNG({ width, height })
    const changed = pixelmatch(reference.data, rendered.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: false,
    })
    const percent = (changed / (width * height)) * 100
    writeFileSync(`design/diff-${width}-${height}.png`, PNG.sync.write(diff))
    results.push({
      width,
      height,
      changedPixels: changed,
      differencePercent: percent,
      pass: percent <= 1,
    })
  }
  const report = {
    generatedAt: new Date().toISOString(),
    browser: await browser.version(),
    dpr: 1,
    pixelmatch: { threshold: 0.1, includeAA: false },
    acceptancePercent: 1,
    results,
  }
  writeFileSync('design/visual-report.json', JSON.stringify(report, null, 2) + '\n')
  console.table(results)
  if (results.some((x) => !x.pass)) process.exitCode = 1
} finally {
  await browser.close()
}
