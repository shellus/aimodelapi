// 手动加载 .env 以支持开发环境
import { readFileSync, existsSync } from 'fs'
if (existsSync('.env')) {
  readFileSync('.env', 'utf-8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=')
    if (key && !key.startsWith('#') && !process.env[key]) {
      process.env[key] = vals.join('=')
    }
  })
}

export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },
  css: ['~/assets/css/main.css'],
  icon: {
    serverBundle: 'local',
  },
  fonts: {
    provider: 'none',
  },
  runtimeConfig: {
    authKey: process.env.AUTH_KEY || '',
    jwtSecret: process.env.JWT_SECRET || 'aimodelapi-default-secret',
  },
})
