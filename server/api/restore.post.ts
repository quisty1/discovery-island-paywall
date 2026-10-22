import { restore } from '../utils/purchases'
import { database } from '../utils/database'
import { deviceId } from '../utils/device'
export default defineEventHandler(async (event) => {
  const id = deviceId(event)
  return { purchase: await restore(database(event), id) }
})
