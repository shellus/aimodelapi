export function useAuth() {
  const token = useState<string>('auth-token', () => '')
  const isLoggedIn = useState<boolean>('auth-logged-in', () => false)
  const needAuth = useState<boolean>('auth-need', () => true)

  // 客户端初始化时从 localStorage 恢复
  function initFromStorage() {
    if (import.meta.server) return
    const saved = localStorage.getItem('token')
    if (saved) {
      token.value = saved
      isLoggedIn.value = true
    }
  }

  // 登录
  async function login(key: string) {
    const res = await $fetch<{ success: boolean; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { key },
    })
    if (res.success) {
      token.value = res.token
      isLoggedIn.value = true
      if (import.meta.client) {
        localStorage.setItem('token', res.token)
      }
    }
    return res
  }

  // 登出
  function logout() {
    token.value = ''
    isLoggedIn.value = false
    if (import.meta.client) {
      localStorage.removeItem('token')
    }
    navigateTo('/login')
  }

  // 检查是否需要认证
  async function checkAuth() {
    if (import.meta.server) return

    const saved = localStorage.getItem('token')
    if (saved) {
      token.value = saved
      try {
        await $fetch('/api/providers', {
          headers: { Authorization: `Bearer ${saved}` },
        })
        isLoggedIn.value = true
        needAuth.value = true
      } catch (e: any) {
        if (e.statusCode === 401) {
          localStorage.removeItem('token')
          token.value = ''
          isLoggedIn.value = false
          needAuth.value = true
        }
      }
    } else {
      // 无 token，尝试无认证访问，判断服务端是否启用了认证
      try {
        await $fetch('/api/providers')
        isLoggedIn.value = true
        needAuth.value = false
      } catch (e: any) {
        if (e.statusCode === 401) {
          needAuth.value = true
        }
      }
    }
  }

  // 获取带认证的 headers
  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  // 带认证的 $fetch 封装
  function authFetch<T>(url: string, opts: any = {}): Promise<T> {
    return $fetch<T>(url, {
      ...opts,
      headers: {
        ...opts.headers,
        ...authHeaders(),
      },
    })
  }

  return {
    token,
    isLoggedIn,
    needAuth,
    initFromStorage,
    login,
    logout,
    checkAuth,
    authHeaders,
    authFetch,
  }
}
