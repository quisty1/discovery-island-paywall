import { getCookie, setCookie, getRequestURL, setHeader } from 'h3'
import type { H3Event } from 'h3'
import { isUuid } from './purchases'

export function deviceId(event: H3Event): string {
  setHeader(event, 'Cache-Control', 'no-store')
  const saved = getCookie(event, 'island_device')
  if (isUuid(saved)) return saved
  const id = crypto.randomUUID()
  setCookie(event, 'island_device', id, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return id
}
