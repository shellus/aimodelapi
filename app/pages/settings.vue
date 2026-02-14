<script setup lang="ts">
const router = useRouter()
const toast = useToast()
const { authFetch } = useAuth()
const loading = ref(true)
const saving = ref(false)

interface AppSettings {
  postSwitchHook?: string
}

const form = reactive<AppSettings>({
  postSwitchHook: ''
})

// 加载设置
async function loadSettings() {
  loading.value = true
  try {
    const data = await authFetch<AppSettings>('/api/settings')
    form.postSwitchHook = data.postSwitchHook || ''
  } catch (error) {
    toast.add({ title: '加载设置失败', description: String(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

// 保存设置
async function handleSubmit() {
  saving.value = true
  try {
    await authFetch('/api/settings', {
      method: 'PUT',
      body: form
    })
    toast.add({ title: '保存成功', color: 'success' })
  } catch (error) {
    toast.add({ title: '保存失败', description: String(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  router.push('/')
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="min-h-screen bg-muted">
    <!-- 顶部导航 -->
    <header class="border-b border-muted bg-elevated">
      <div class="mx-auto max-w-5xl px-8">
        <div class="flex h-16 items-center gap-4">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            size="sm"
            @click="handleCancel"
          />
          <h1 class="text-xl font-bold text-default">设置</h1>
        </div>
      </div>
    </header>

    <!-- 表单内容 -->
    <main class="mx-auto max-w-5xl px-8 py-12">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>

      <UForm v-else :state="form" class="space-y-8" @submit="handleSubmit">
        <!-- 命令 Hook 配置 -->
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-default mb-1">命令 Hook</h2>
            <p class="text-sm text-subtle">配置在特定事件触发时自动执行的命令</p>
          </div>

          <UFormField
            label="切换 Provider 后执行的命令"
            name="postSwitchHook"
            help="切换 Provider 后会异步执行此命令，结果输出到服务端终端。超时时间：30 秒"
          >
            <UInput
              v-model="form.postSwitchHook"
              placeholder="例如: curl http://127.0.0.1:8384/rest/db/scan?folder=default"
              size="lg"
              class="w-full font-mono"
            />
          </UFormField>

          <!-- 使用示例 -->
          <div class="rounded-lg border border-muted bg-elevated p-4">
            <div class="text-sm font-medium text-default mb-3">使用示例</div>
            <div class="space-y-2 text-sm text-subtle">
              <div class="flex items-start gap-2">
                <span class="text-muted">•</span>
                <div class="flex-1">
                  <div class="text-default mb-1">触发 Syncthing 刷新目录</div>
                  <code class="block text-xs bg-muted px-2 py-1 rounded font-mono">
                    curl http://127.0.0.1:8384/rest/db/scan?folder=default
                  </code>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-muted">•</span>
                <div class="flex-1">
                  <div class="text-default mb-1">执行自定义脚本</div>
                  <code class="block text-xs bg-muted px-2 py-1 rounded font-mono">
                    bash /path/to/script.sh
                  </code>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-muted">•</span>
                <div class="flex-1">
                  <div class="text-default mb-1">发送系统通知</div>
                  <code class="block text-xs bg-muted px-2 py-1 rounded font-mono">
                    notify-send "Provider 已切换"
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-3 pt-4">
          <UButton
            color="gray"
            variant="ghost"
            @click="handleCancel"
          >
            取消
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
          >
            保存
          </UButton>
        </div>
      </UForm>
    </main>
  </div>
</template>
