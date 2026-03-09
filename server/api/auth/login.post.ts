import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ key: string }>(event)
  const config = useRuntimeConfig()

  if (!config.authKey) {
    throw createError({ statusCode: 500, message: '未配置 AUTH_KEY' })
  }

  if (!config.jwtSecret) {
    throw createError({ statusCode: 500, message: '未配置 JWT_SECRET' })
  }

  if (body.key !== config.authKey) {
    throw createError({ statusCode: 401, message: '密钥错误' })
  }

  const token = jwt.sign({ auth: true }, config.jwtSecret)

  return { success: true, token }
})
