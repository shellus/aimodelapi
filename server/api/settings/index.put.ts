import { writeSettings, type AppSettings } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  const body = await readBody<AppSettings>(event)
  await writeSettings(body)
  return { success: true }
})
