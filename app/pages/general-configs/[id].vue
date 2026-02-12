<script setup lang="ts">
import type { GeneralConfig } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const configId = route.params.id as string
const isEditMode = computed(() => configId !== 'add')
const loading = ref(false)
const saving = ref(false)

const form = reactive({
  name: '',
  content: '{\n  "theme": "dark",\n  "includeCoAuthoredBy": false\n}'
})

// 如果是编辑模式，加载现有数据
onMounted(async () => {
  if (isEditMode.value) {
    loading.value = true
    try {
      const config = await $fetch<GeneralConfig>(`/api/general-configs/${configId}`)
      form.name = config.name
      form.content = config.content
    } catch (error: any) {
      toast.add({
        title: '加载失败',
        description: error.data?.statusMessage || error.message,
        color: 'error'
      })
      router.push('/general-configs')
    } finally {
      loading.value = false
    }
  }
})

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
    await $fetch('/api/general-configs', {
      method: 'POST',
      body: {
        id: isEditMode.value ? configId : undefined,
        name: form.name,
        content: form.content
      }
    })
    toast.add({ title: isEditMode.value ? '已更新配置' : '已创建配置', color: 'success' })
    router.push('/general-configs')
  } catch (error: any) {
    toast.add({ title: '保存失败', description: error.data?.statusMessage || error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            color="gray"
            @click="router.back()"
          />
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode ? '编辑模板' : '新建配置模板' }}
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

          <UFormField label="配置内容 (JSON)" name="content" required>
            <template #help>
              <p class="mt-1 text-sm text-gray-500">
                该 JSON 将被深度合并到 <code>~/.claude/settings.json</code> 中。环境变量（env）将被自动保护。
              </p>
            </template>
            <JsonEditor v-model="form.content" />
          </UFormField>
        </UForm>
      </UCard>
    </main>
  </div>
</template>
