<script setup lang="ts">
definePageMeta({ layout: false })

const key = ref('')
const error = ref('')
const loading = ref(false)
const { login } = useAuth()
const router = useRouter()

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await login(key.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted">
    <div class="w-full max-w-sm">
      <UCard>
        <template #header>
          <div class="text-center">
            <h1 class="text-xl font-bold text-default">AIModelAPI</h1>
            <p class="mt-1 text-sm text-muted">请输入密钥以继续</p>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <UFormField label="密钥" name="key">
            <UInput
              v-model="key"
              type="password"
              placeholder="AUTH_KEY"
              size="lg"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-circle"
            :title="error"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="loading"
          >
            登录
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
