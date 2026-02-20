<script setup lang="ts">
import type { GeneralConfig } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { authFetch } = useAuth()

const configId = route.params.id as string
const isEditMode = computed(() => configId !== 'add')
const loading = ref(false)
const saving = ref(false)

const form = reactive({
  name: '',
  type: 'codex' as const,
  content: JSON.stringify({
    auth: {},
    config: ''
  }, null, 2)
})

// Codex 配置（用于编辑器）
const codexConfig = ref({
  auth: {} as Record<string, any>,
  config: ''
})

// 监听 codexConfig 变化，更新 form.content
watch(codexConfig, (newConfig) => {
  form.content = JSON.stringify(newConfig, null, 2)
}, { deep: true })

// 如果是编辑模式，加载现有数据
onMounted(async () => {
  if (isEditMode.value) {
    loading.value = true
    try {
      const config = await authFetch<GeneralConfig>(`/api/general-configs/${configId}`)
      form.name = config.name
      form.content = config.content

      // 解析 content 到 codexConfig
      try {
        const parsed = JSON.parse(config.content)
        codexConfig.value = {
          auth: parsed.auth || {},
          config: parsed.config || ''
        }
      } catch {
        // 如果解析失败，使用默认值
        codexConfig.value = {
          auth: {},
          config: ''
        }
      }
    } catch (error: any) {
      toast.add({
        title: '加载失败',
        description: error.data?.statusMessage || error.message,
        color: 'error'
      })
      router.push('/general-configs/codex')
    } finally {
      loading.value = false
    }
  }
})

// 处理 auth.json 编辑器变化
function handleAuthJsonChange(newJson: string) {
  try {
    codexConfig.value.auth = JSON.parse(newJson)
  } catch {
    // 忽略 JSON 解析错误，用户可能正在编辑
  }
}

async function handleSubmit() {
  // 基础 JSON 校验
  try {
    JSON.parse(form.content)
  } catch (e) {
    toast.add({ title: 'JSON 格式错误', description: '请检查配置内容是否为有效的 JSON', color: 'error' })
    return
  }

  saving.value = true
  try {
    await authFetch('/api/general-configs/codex', {
      method: 'POST',
      body: {
        id: isEditMode.value ? configId : undefined,
        name: form.name,
        content: form.content
      }
    })
    toast.add({ title: isEditMode.value ? '已更新配置' : '已创建配置', color: 'success' })
    router.push('/general-configs/codex')
  } catch (error: any) {
    toast.add({ title: '保存失败', description: error.data?.statusMessage || error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted">
    <header class="sticky top-0 z-10 border-b border-muted bg-elevated/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            color="gray"
            @click="router.back()"
          />
          <h1 class="text-xl font-bold text-default">
            {{ isEditMode ? '编辑 Codex 配置模板' : '新建 Codex 配置模板' }}
          </h1>
        </div>
        <div class="flex gap-3">
          <UButton
            variant="ghost"
            color="gray"
            @click="router.back()"
          >
            取消
          </UButton>
          <UButton
            color="primary"
            :loading="saving"
            @click="handleSubmit"
          >
            保存模板
          </UButton>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-6 py-10">
      <UCard :ui="{ body: { padding: 'p-8' } }">
        <div v-if="loading" class="space-y-6">
          <USkeleton class="h-10 w-1/3" />
          <USkeleton class="h-64 w-full" />
        </div>

        <UForm v-else :state="form" class="space-y-8" @submit="handleSubmit">
          <UFormField label="模板名称" name="name" required help="给这个配置起一个好记的名字">
            <UInput
              v-model="form.name"
              placeholder="例如：开发环境偏好 / 极简模式"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <USeparator label="Codex 配置" />

          <!-- auth.json 编辑器 -->
          <UFormField label="auth.json" name="auth">
            <UTextarea
              :model-value="JSON.stringify(codexConfig.auth, null, 2)"
              :rows="5"
              placeholder="{}"
              class="w-full font-mono text-sm"
              @update:model-value="handleAuthJsonChange"
            />
            <template #help>
              <p class="mt-1 text-sm text-subtle">
                认证配置文件，将与 Provider 的 auth.json 合并（Provider 优先级更高）
              </p>
            </template>
          </UFormField>

          <!-- config.toml 编辑器 -->
          <UFormField label="config.toml" name="config">
            <UTextarea
              v-model="codexConfig.config"
              :rows="15"
              placeholder="留空则不提供默认配置"
              class="w-full font-mono text-sm"
            />
            <template #help>
              <p class="mt-1 text-sm text-subtle">
                Codex 配置文件（TOML 格式），将与 Provider 的 config.toml 合并（Provider 优先级更高）
              </p>
            </template>
          </UFormField>
        </UForm>
      </UCard>
    </main>
  </div>
</template>
