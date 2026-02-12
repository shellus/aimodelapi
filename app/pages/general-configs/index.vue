<script setup lang="ts">
import type { GeneralConfig } from '@/types'

const toast = useToast()
const { data: configs, refresh } = await useFetch<GeneralConfig[]>('/api/general-configs')

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}

const applyingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteModal = ref(false)
const configToDelete = ref<{ id: string, name: string } | null>(null)

async function handleApply(id: string) {
  applyingId.value = id
  try {
    await $fetch(`/api/general-configs/${id}/apply`, { method: 'POST' })
    toast.add({ title: '配置已应用', color: 'success' })
  } catch (error: any) {
    toast.add({ title: '应用失败', description: error.message, color: 'error' })
  } finally {
    applyingId.value = null
  }
}

function openDeleteModal(id: string, name: string) {
  configToDelete.value = { id, name }
  deleteModal.value = true
}

async function confirmDelete() {
  if (!configToDelete.value) return

  deletingId.value = configToDelete.value.id
  try {
    await $fetch(`/api/general-configs/${configToDelete.value.id}`, { method: 'DELETE' })
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
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            color="gray"
            to="/"
          />
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">通用配置模板</h1>
        </div>
        <UButton
          to="/general-configs/add"
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
              <h3 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {{ config.name }}
              </h3>
              <p class="mt-1 text-xs text-gray-500">
                创建于 {{ new Date(config.createdAt).toLocaleString() }}
              </p>
            </div>
          </div>

          <!-- 预览内容 -->
          <div class="mb-6 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <pre class="max-h-32 overflow-hidden text-xs text-gray-600 dark:text-gray-400"><code>{{ formatJson(config.content) }}</code></pre>
          </div>

          <template #footer>
            <div class="flex w-full items-center justify-between">
              <div class="flex gap-1">
                <UButton
                  icon="i-heroicons-pencil-square"
                  variant="ghost"
                  color="gray"
                  size="sm"
                  :to="`/general-configs/${config.id}`"
                />
                <UButton
                  icon="i-heroicons-trash"
                  variant="ghost"
                  color="error"
                  size="sm"
                  @click="openDeleteModal(config.id, config.name)"
                />
              </div>
              <UButton
                color="primary"
                size="sm"
                :loading="applyingId === config.id"
                @click="handleApply(config.id)"
              >
                应用此配置
              </UButton>
            </div>
          </template>
        </UCard>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
        <UIcon name="i-heroicons-document-text" class="mb-4 h-12 w-12 text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400">暂无通用配置模板</p>
        <UButton
          to="/general-configs/add"
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
