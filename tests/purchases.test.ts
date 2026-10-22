import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { purchase, restore } from '../server/utils/purchases'
import type { PurchaseDatabase } from '../server/utils/purchases'

let sql: DatabaseSync
let db: PurchaseDatabase
const device = 'a38f4953-74fe-41d9-9b7f-852a31e90fa7'
const requestId = 'f50bf4e4-0257-4cde-b491-524f369df2e2'
beforeEach(() => {
  sql = new DatabaseSync(':memory:')
  sql.exec(readFileSync(new URL('../migrations/0001_purchases.sql', import.meta.url), 'utf8'))
  db = {
    prepare(query: string) {
      let values: (string | number | null)[] = []
      const statement = {
        bind(...next: (string | number | null)[]) {
          values = next
          return statement
        },
        async first<T>() {
          return (sql.prepare(query).get(...values) ?? null) as T | null
        },
        async run() {
          return sql.prepare(query).run(...values)
        },
      }
      return statement
    },
  }
})
describe('persistent demo purchases', () => {
  it.each(['yearly', 'monthly'])('saves %s and restores by device', async (offerId) => {
    const result = await purchase(db, device, { offerId, requestId })
    expect(result.offerId).toBe(offerId)
    expect(result.id).toMatch(/^[\da-f-]{36}$/)
    expect(Number.isNaN(Date.parse(result.createdAt))).toBe(false)
    expect(await restore(db, device)).toEqual(result)
    expect(await restore(db, 'other-device')).toBeNull()
    expect(sql.prepare('SELECT count(*) AS n FROM purchases').get()?.n).toBe(1)
  })
  it('deduplicates concurrent retries', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => purchase(db, device, { offerId: 'yearly', requestId })),
    )
    expect(new Set(results.map((x) => x.id)).size).toBe(1)
    expect(sql.prepare('SELECT count(*) AS n FROM purchases').get()?.n).toBe(1)
  })
  it('rejects reusing a request ID for a different offer', async () => {
    await purchase(db, device, { offerId: 'yearly', requestId })
    await expect(purchase(db, device, { offerId: 'monthly', requestId })).rejects.toMatchObject({
      statusCode: 409,
    })
  })
  it.each([null, {}, { offerId: 'invalid', requestId }, { offerId: 'yearly', requestId: 'bad' }])(
    'rejects invalid input %j',
    async (input) => {
      await expect(purchase(db, device, input)).rejects.toMatchObject({ statusCode: 400 })
      expect(sql.prepare('SELECT count(*) AS n FROM purchases').get()?.n).toBe(0)
    },
  )
  it('scopes idempotency to the device', async () => {
    const a = await purchase(db, device, { offerId: 'yearly', requestId })
    const b = await purchase(db, 'other-device', { offerId: 'yearly', requestId })
    expect(a.id).not.toBe(b.id)
  })
  it('does not report success when storage fails', async () => {
    sql.close()
    await expect(purchase(db, device, { offerId: 'yearly', requestId })).rejects.toMatchObject({
      statusCode: 503,
    })
    await expect(restore(db, device)).rejects.toMatchObject({ statusCode: 503 })
  })
})
