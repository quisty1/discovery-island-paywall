import { createError } from 'h3'
import type { H3Event } from 'h3'
import type { PurchaseDatabase } from './purchases'
export function database(event: H3Event): PurchaseDatabase {
  const binding = event.context.cloudflare?.env?.DB as PurchaseDatabase | undefined
  if (!binding)
    throw createError({ statusCode: 503, statusMessage: 'Database binding is unavailable' })
  return binding
}
