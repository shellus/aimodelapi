import jwt from 'jsonwebtoken'

export default defineEventHandler((event) => {
  const path = event.path

  // 跳过非 API 路由、登录接口和 Nuxt 内部路由
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/') || path.startsWith('/api/_nuxt')) {
    return
  }

  const config = useRuntimeConfig()

  // 未配置 AUTH_KEY 则跳过鉴权
  if (!config.authKey) {
    return
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw createError({ statusCode: 401, message: '未登录' })
  }

  try {
    jwt.verify(token, config.jwtSecret || 'aimodelapi-default-secret')
  } catch {
    throw createError({ statusCode: 401, message: 'Token 无效' })
  }
})
