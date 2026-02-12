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
})
