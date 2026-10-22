import { purchase } from '../utils/purchases'
import { database } from '../utils/database'
import { deviceId } from '../utils/device'
export default defineEventHandler(async (event) => {
  const id = deviceId(event)
  const input: unknown = await readBody(event)
  return purchase(database(event), id, input)
})
