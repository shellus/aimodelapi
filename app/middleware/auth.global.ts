export default defineNuxtRouteMiddleware(async (to) => {
  // 登录页不需要守卫
  if (to.path === '/login') return

  // 仅客户端执行
  if (import.meta.server) return

  const { checkAuth, needAuth, isLoggedIn } = useAuth()
  await checkAuth()

  // 服务端未启用认证，放行
  if (!needAuth.value) return

  // 需要认证但未登录，跳转登录页
  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
})
