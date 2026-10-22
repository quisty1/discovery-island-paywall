import { createError, isError } from 'h3'
import type { Purchase } from '../../shared/types'
import { offers } from './offers'

interface Statement {
  bind(...values: (string | number | null)[]): Statement
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}
export interface PurchaseDatabase {
  prepare(query: string): Statement
}
interface Row {
  id: string
  offer_id: Purchase['offerId']
  created_at: string
}
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const fromRow = (row: Row): Purchase => ({
  id: row.id,
  offerId: row.offer_id,
  createdAt: row.created_at,
})
const unavailable = () =>
  createError({ statusCode: 503, statusMessage: 'Purchase storage is unavailable' })

export async function purchase(
  db: PurchaseDatabase,
  deviceId: string,
  input: unknown,
): Promise<Purchase> {
  if (
    !input ||
    typeof input !== 'object' ||
    !('offerId' in input) ||
    !('requestId' in input) ||
    !offers.some((x) => x.id === input.offerId) ||
    !isUuid(input.requestId)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid offerId or requestId' })
  }
  const offerId = input.offerId as Purchase['offerId']
  try {
    await db
      .prepare(
        'INSERT INTO purchases (id, offer_id, device_id, created_at, request_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(device_id, request_id) DO NOTHING',
      )
      .bind(crypto.randomUUID(), offerId, deviceId, new Date().toISOString(), input.requestId)
      .run()
    const row = await db
      .prepare(
        'SELECT id, offer_id, created_at FROM purchases WHERE device_id = ? AND request_id = ?',
      )
      .bind(deviceId, input.requestId)
      .first<Row>()
    if (!row) throw unavailable()
    if (row.offer_id !== offerId)
      throw createError({ statusCode: 409, statusMessage: 'Request ID belongs to another offer' })
    return fromRow(row)
  } catch (error) {
    if (isError(error)) throw error
    throw unavailable()
  }
}
export async function restore(db: PurchaseDatabase, deviceId: string): Promise<Purchase | null> {
  try {
    const row = await db
      .prepare(
        'SELECT id, offer_id, created_at FROM purchases WHERE device_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
      )
      .bind(deviceId)
      .first<Row>()
    return row ? fromRow(row) : null
  } catch {
    throw unavailable()
  }
}
