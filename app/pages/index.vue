<script setup lang="ts">
import type { Provider } from '@/types'
import VueDraggable from 'vuedraggable'

const router = useRouter()
const providers = ref<Provider[]>([])
const status = ref<Record<string, string | undefined>>({})
const loading = ref(false)
const activeTab = ref<'claude' | 'codex' | 'gemini' | 'opencode'>('claude')
const hoveredId = ref<string | null>(null)

// 深色模式切换
const colorMode = useColorMode()

const toast = useToast()

// 删除确认弹窗
const deleteModal = ref(false)
const providerToDelete = ref<{ id: string, name: string } | null>(null)

// 按类型过滤的 Provider（按 sortIndex 排序）
const filteredProviders = computed({
  get() {
    return providers.value
      .filter(p => p.type === activeTab.value)
      .sort((a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999))
  },
  set(newValue) {
    // 更新拖拽后的顺序和 sortIndex
    newValue.forEach((p, index) => {
      p.sortIndex = index
    })
    const otherProviders = providers.value.filter(p => p.type !== activeTab.value)
    providers.value = [...otherProviders, ...newValue]
  }
})

// 类型对应的图标映射
const typeIcons: Record<string, string> = {
  claude: '✴️',
  codex: '⚛️',
  gemini: '✦',
  opencode: '📱',
}

// 切换深色模式
function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// 显示功能未完成提示
function showFeatureNotReady(featureName: string) {
  toast.add({
    title: `${featureName}功能开发中`,
    description: '该功能将在后续版本中推出',
    color: 'warning',
  })
}

async function fetchProviders() {
  providers.value = await $fetch<Provider[]>('/api/providers')
}

async function fetchStatus() {
  status.value = await $fetch<Record<string, string | undefined>>('/api/status')
}

async function refresh() {
  await Promise.all([fetchProviders(), fetchStatus()])
}

function startEdit(p: Provider) {
  router.push(`/providers/${p.id}`)
}

function openDeleteModal(id: string, name: string) {
  providerToDelete.value = { id, name }
  deleteModal.value = true
}

async function confirmDelete() {
  if (!providerToDelete.value) return

  try {
    await $fetch(`/api/providers/${providerToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: '删除成功', color: 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: '删除失败', description: String(error), color: 'error' })
  } finally {
    deleteModal.value = false
    providerToDelete.value = null
  }
}

async function handleSwitch(id: string) {
  loading.value = true
  try {
    await $fetch(`/api/providers/${id}/switch`, { method: 'POST' })
    toast.add({ title: '切换成功', color: 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: '切换失败', description: String(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

// 拖动排序处理
async function handleDragEnd() {
  const updates = filteredProviders.value.map((p, index) => ({
    id: p.id,
    sortIndex: index,
  }))

  try {
    await $fetch('/api/providers/sort', {
      method: 'PATCH',
      body: updates,
    })
  } catch (error) {
    toast.add({ title: '排序保存失败', description: String(error), color: 'error' })
    await refresh() // 恢复原顺序
  }
}

onMounted(refresh)
</script>

<template>
    <div class="min-h-screen bg-muted">
      <!-- 顶部工具栏 -->
      <header class="border-b border-muted bg-elevated">
        <div class="mx-auto max-w-7xl px-8">
          <div class="flex h-20 items-center justify-between">
            <!-- 左侧：品牌 + 状态 -->
            <div class="flex items-center gap-6">
              <h1 class="text-2xl font-bold text-default">CC Switch</h1>
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-cog-6-tooth"
                title="设置"
                @click="showFeatureNotReady('设置')"
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                :icon="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
                title="切换深色模式"
                @click="toggleColorMode"
              />
            </div>

            <!-- 中间：标签页切换 -->
            <UTabs
              v-model="activeTab"
              :items="[
                { label: '✴️ Claude', value: 'claude' },
                { label: '⚛️ Codex', value: 'codex' },
                { label: '✦ Gemini', value: 'gemini' },
                { label: '📱 OpenCode', value: 'opencode' },
              ]"
              :ui="{
                list: {
                  background: 'bg-muted',
                  rounded: 'rounded-full',
                  padding: 'p-1.5',
                  gap: 'gap-1',
                  base: 'text-base font-medium',
                },
              }"
            />

            <!-- 右侧：工具图标 + 添加按钮 -->
            <div class="flex items-center gap-3">
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-adjustments-horizontal"
                to="/general-configs"
                title="通用配置模板"
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-wrench"
                title="Skills 管理"
                @click="showFeatureNotReady('Skills 管理')"
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-book-open"
                title="系统提示词管理"
                @click="showFeatureNotReady('系统提示词管理')"
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-clock"
                title="会话历史管理"
                @click="showFeatureNotReady('会话历史管理')"
              />
              <UButton
                color="primary"
                size="md"
                @click="router.push('/providers/add')"
              >
                + 添加
              </UButton>
            </div>
          </div>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="mx-auto max-w-7xl px-8 py-8">
        <!-- Provider 列表 -->
        <VueDraggable
          v-model="filteredProviders"
          item-key="id"
          :animation="200"
          handle=".drag-handle"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          @end="handleDragEnd"
        >
          <template #item="{ element: p }">
            <div
              class="group relative transition-all"
              :class="[
                p.isCurrent
                  ? 'rounded-xl border-2 border-primary-500 bg-elevated shadow-lg'
                  : 'rounded-xl border border-muted bg-elevated',
              ]"
              @mouseenter="hoveredId = p.id"
              @mouseleave="hoveredId = null"
            >
              <div class="flex items-center gap-4 p-4">
                <!-- 拖拽手柄 -->
                <div class="drag-handle cursor-move text-muted hover:text-default">
                  <UIcon name="i-heroicons-bars-3" class="size-4" />
                </div>

                <!-- 图标 -->
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold"
                  :class="[
                    p.isCurrent
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                      : 'border-muted bg-muted text-muted',
                  ]"
                >
                  {{ p.icon || p.name.charAt(0).toUpperCase() }}
                </div>

                <!-- 内容 -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <div class="text-sm font-semibold text-default truncate">{{ p.name }}</div>
                    <UBadge v-if="p.notes" color="gray" variant="soft" size="xs" class="font-normal shrink-0">
                      {{ p.notes }}
                    </UBadge>
                  </div>
                  <div class="mt-0.5 text-xs text-subtle truncate">{{ p.baseUrl }}</div>
                </div>

                <!-- 操作按钮（悬停/选中时显示） -->
                <div
                  v-if="p.isCurrent || hoveredId === p.id"
                  class="flex shrink-0 items-center gap-1.5"
                >
                  <UButton
                    v-if="!p.isCurrent"
                    color="primary"
                    size="xs"
                    :loading="loading"
                    @click="handleSwitch(p.id)"
                  >
                    启用
                  </UButton>
                  <UButton
                    color="gray"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-pencil"
                    title="编辑"
                    @click="startEdit(p)"
                  />
                  <UButton
                    color="red"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    title="删除"
                    @click="openDeleteModal(p.id, p.name)"
                  />
                </div>
              </div>
            </div>
          </template>
        </VueDraggable>

        <!-- 空状态 -->
        <UEmpty
          v-if="filteredProviders.length === 0"
          :description="`点击右上角添加第一个 ${typeIcons[activeTab]} ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Provider`"
          icon="i-heroicons-inbox"
        />
      </main>
    </div>

    <!-- 删除确认弹窗 -->
    <UModal v-model:open="deleteModal" title="确认删除">
      <template #body>
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <p class="text-gray-600 dark:text-gray-400">
          确定要删除 Provider <strong class="text-gray-900 dark:text-white">{{ providerToDelete?.name }}</strong> 吗？此操作无法撤销。
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
            @click="confirmDelete"
          >
            确认删除
          </UButton>
        </div>
      </template>
    </UModal>
</template>
