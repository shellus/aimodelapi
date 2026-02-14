import { readSettings } from '../../../utils/settings'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const updated = await switchProvider(id)

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Provider not found'
    })
  }

  // 异步执行 post-switch hook
  const settings = await readSettings()
  if (settings.postSwitchHook?.trim()) {
    execAsync(settings.postSwitchHook, { timeout: 30000 })
      .then(({ stdout, stderr }) => {
        console.log('[Post-Switch Hook] 执行成功')
        if (stdout) console.log('[Post-Switch Hook] stdout:', stdout)
        if (stderr) console.error('[Post-Switch Hook] stderr:', stderr)
      })
      .catch((error) => {
        console.error('[Post-Switch Hook] 执行失败:', error.message)
      })
  }

  return updated
})
