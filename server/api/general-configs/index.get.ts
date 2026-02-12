import { readGeneralConfigs } from '../../utils/general-configs'

export default defineEventHandler(async () => {
  return await readGeneralConfigs()
})
