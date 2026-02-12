<script setup lang="ts">
import type { Provider } from '@/types'

const router = useRouter()
const providers = ref<Provider[]>([])
const status = ref<Record<string, string | undefined>>({})
const loading = ref(false)
const activeTab = ref<'claude' | 'codex' | 'gemini' | 'opencode'>('claude')
const hoveredId = ref<string | null>(null)

// 深色模式切换
const colorMode = useColorMode()

const toast = useToast()

// 按类型过滤的 Provider
const filteredProviders = computed(() => {
  return providers.value.filter(p => p.type === activeTab.value)
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

async function handleDelete(id: string) {
  try {
    await $fetch(`/api/providers/${id}`, { method: 'DELETE' })
    toast.add({ title: '删除成功', color: 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: '删除失败', description: String(error), color: 'error' })
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

onMounted(refresh)
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- 顶部工具栏 -->
      <header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div class="mx-auto max-w-7xl px-8">
          <div class="flex h-20 items-center justify-between">
            <!-- 左侧：品牌 + 状态 -->
            <div class="flex items-center gap-6">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">CC Switch</h1>
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-cog-6-tooth"
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                :icon="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
                @click="toggleColorMode"
              />
              <UToggle size="lg" />
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
                  background: 'bg-gray-100 dark:bg-gray-900',
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
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-book-open"
              />
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-paper-clip"
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
      <main class="mx-auto max-w-7xl px-8 py-12">
        <!-- Provider 列表 -->
        <div class="space-y-5">
          <div
            v-for="p in filteredProviders"
            :key="p.id"
            class="group relative transition-all"
            :class="[
              p.isCurrent
                ? 'rounded-2xl border-2 border-primary-500 bg-white shadow-lg dark:bg-gray-950'
                : 'rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950',
            ]"
            @mouseenter="hoveredId = p.id"
            @mouseleave="hoveredId = null"
          >
            <div class="flex items-center gap-5 p-6">
              <!-- 拖拽手柄 -->
              <div class="cursor-move text-gray-400">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                </svg>
              </div>

              <!-- 图标 -->
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold"
                :class="[
                  p.isCurrent
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                ]"
              >
                {{ p.icon || p.name.charAt(0).toUpperCase() }}
              </div>

              <!-- 内容 -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <div class="text-base font-semibold text-gray-900 dark:text-white">{{ p.name }}</div>
                  <UBadge v-if="p.notes" color="gray" variant="soft" size="sm" class="font-normal">
                    {{ p.notes }}
                  </UBadge>
                </div>
                <div class="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">{{ p.baseUrl }}</div>
              </div>

              <!-- 操作按钮（悬停/选中时显示） -->
              <div
                v-if="p.isCurrent || hoveredId === p.id"
                class="flex shrink-0 items-center gap-2.5"
              >
                <UButton
                  v-if="!p.isCurrent"
                  color="primary"
                  size="md"
                  :loading="loading"
                  @click="handleSwitch(p.id)"
                >
                  ▶ 启用
                </UButton>
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-pencil"
                  @click="startEdit(p)"
                />
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-clipboard-document"
                />
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-pencil-square"
                />
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-chart-bar"
                />
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-command-line"
                />
                <UButton
                  color="red"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-trash"
                  @click="handleDelete(p.id)"
                />
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <UEmptyState
            v-if="filteredProviders.length === 0"
            title="暂无 Provider"
            :description="`点击右上角添加第一个 ${typeIcons[activeTab]} ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Provider`"
            icon="i-heroicons-inbox"
          />
        </div>
      </main>
    </div>
  </UApp>
</template>
