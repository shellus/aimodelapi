<script setup lang="ts">
import type { GeneralConfig } from '@/types'

const toast = useToast()
const { authFetch } = useAuth()
const configs = ref<GeneralConfig[]>([])

async function refresh() {
  configs.value = await authFetch<GeneralConfig[]>('/api/general-configs?type=claude')
}

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}

const deletingId = ref<string | null>(null)
const deleteModal = ref(false)
const configToDelete = ref<{ id: string, name: string } | null>(null)

function openDeleteModal(id: string, name: string) {
  configToDelete.value = { id, name }
  deleteModal.value = true
}

async function confirmDelete() {
  if (!configToDelete.value) return

  deletingId.value = configToDelete.value.id
  try {
    await authFetch(`/api/general-configs/${configToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: '配置已删除', color: 'success' })
    await refresh()
  } catch (error: any) {
    toast.add({ title: '删除失败', description: error.message, color: 'error' })
  } finally {
    deletingId.value = null
    deleteModal.value = false
    configToDelete.value = null
  }
}

onMounted(refresh)
</script>

<template>
  <div class="min-h-screen bg-muted">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 border-b border-muted bg-elevated/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            color="gray"
            to="/"
          />
          <h1 class="text-xl font-bold text-default">✴️ Claude 通用配置模板</h1>
        </div>
        <UButton
          to="/general-configs/claude/add"
          icon="i-heroicons-plus"
          color="primary"
        >
          添加模板
        </UButton>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-8">
      <div v-if="configs?.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="config in configs"
          :key="config.id"
          class="flex flex-col overflow-hidden"
          :ui="{ body: { padding: 'p-5' }, footer: { padding: 'p-3' } }"
        >
          <div class="mb-4 flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-lg font-semibold text-default">
                {{ config.name }}
              </h3>
              <p class="mt-1 text-xs text-subtle">
                创建于 {{ new Date(config.createdAt).toLocaleString() }}
              </p>
            </div>
          </div>

          <!-- 预览内容 -->
          <div class="mb-6 rounded-lg bg-muted p-3">
            <pre class="max-h-32 overflow-hidden text-xs text-muted"><code>{{ formatJson(config.content) }}</code></pre>
          </div>

          <template #footer>
            <div class="flex w-full items-center justify-end gap-1">
              <UButton
                icon="i-heroicons-pencil-square"
                variant="ghost"
                color="gray"
                size="sm"
                :to="`/general-configs/claude/${config.id}`"
              />
              <UButton
                icon="i-heroicons-trash"
                variant="ghost"
                color="error"
                size="sm"
                @click="openDeleteModal(config.id, config.name)"
              />
            </div>
          </template>
        </UCard>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
        <UIcon name="i-heroicons-document-text" class="mb-4 h-12 w-12 text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400">暂无 Claude 通用配置模板</p>
        <UButton
          to="/general-configs/claude/add"
          variant="link"
          class="mt-2"
        >
          立即创建一个
        </UButton>
      </div>
    </main>

    <!-- 删除确认弹窗 -->
    <UModal v-model:open="deleteModal" title="确认删除">
      <template #body>
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <p class="text-gray-600 dark:text-gray-400">
          确定要删除配置模板 <strong class="text-gray-900 dark:text-white">{{ configToDelete?.name }}</strong> 吗？此操作无法撤销。
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            color="gray"
            @click="deleteModal = false"
          >
            取消
          </UButton>
          <UButton
            color="error"
            :loading="deletingId === configToDelete?.id"
            @click="confirmDelete"
          >
            确认删除
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
