import { readGeneralConfigs } from '../../utils/general-configs'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as 'claude' | 'codex' | undefined

  const allConfigs = await readGeneralConfigs()

  // 如果指定了类型，则过滤（旧数据没有 type 字段时默认为 claude）
  if (type && (type === 'claude' || type === 'codex')) {
    return allConfigs.filter(c => (c.type || 'claude') === type)
  }

  return allConfigs
})
