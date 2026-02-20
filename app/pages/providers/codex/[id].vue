<script setup lang="ts">
import type { CodexConfig, GeneralConfig } from '@/types'
import { formatValidationError } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { authFetch } = useAuth()
const loading = ref(false)

// 编辑模式：如果 id 不是 'add' 则为编辑模式
const providerId = route.params.id as string
const isEditMode = computed(() => providerId !== 'add')

// 基础表单数据
const baseForm = reactive({
  name: '',
  type: 'codex' as const,
  apiKey: '',
  baseUrl: '',
  websiteUrl: '',
  notes: '',
})

// Codex 配置
const codexConfig = ref<CodexConfig>({
  auth: {},
  config: '',
})

// Codex 高级配置
const generalConfigId = ref('')
const configOverrides = ref<Record<string, any>>({})

// 通用配置模板列表
const generalConfigs = ref<GeneralConfig[]>([])

// 加载通用配置模板列表（只加载 Codex 类型）
async function loadGeneralConfigs() {
  try {
    generalConfigs.value = await authFetch<GeneralConfig[]>('/api/general-configs?type=codex')
  } catch (error) {
    // 静默处理，模板列表为空不影响核心功能
  }
}

// 如果是编辑模式，加载现有数据
onMounted(async () => {
  await loadGeneralConfigs()

  if (isEditMode.value) {
    try {
      const provider = await authFetch<any>(`/api/providers/${providerId}`)

      // 映射基础字段
      baseForm.name = provider.name
      baseForm.type = provider.type
      baseForm.apiKey = provider.apiKey
      baseForm.baseUrl = provider.baseUrl
      baseForm.websiteUrl = provider.websiteUrl || ''
      baseForm.notes = provider.notes || ''
      generalConfigId.value = provider.generalConfigId || ''
      configOverrides.value = provider.configOverrides || {}

      // 映射 Codex 配置
      if (provider.codexConfig) {
        codexConfig.value.auth = provider.codexConfig.auth || {}
        codexConfig.value.config = provider.codexConfig.config || ''
      }
    } catch (error) {
      toast.add({ title: '加载失败', description: String(error), color: 'error' })
      router.push('/?tab=codex')
    }
  }
})

// 取消操作
function handleCancel() {
  router.push('/?tab=codex')
}

// 提交表单
async function handleSubmit() {
  loading.value = true
  try {
    // 处理提交数据
    const submitBody: any = {
      name: baseForm.name,
      type: baseForm.type,
      apiKey: baseForm.apiKey,
      baseUrl: baseForm.baseUrl,
      notes: baseForm.notes,
      websiteUrl: baseForm.websiteUrl,
      generalConfigId: generalConfigId.value || undefined,
      codexConfig: {
        auth: codexConfig.value.auth,
        config: codexConfig.value.config,
      },
      configOverrides: Object.keys(configOverrides.value).length > 0 ? configOverrides.value : undefined
    }

    if (isEditMode.value) {
      await authFetch(`/api/providers/${providerId}`, {
        method: 'PUT',
        body: submitBody,
      })
      toast.add({ title: '更新成功', color: 'success' })
    } else {
      await authFetch('/api/providers', {
        method: 'POST',
        body: submitBody,
      })
      toast.add({ title: '添加成功', color: 'success' })
    }
    router.push('/?tab=codex')
  } catch (error) {
    const errorMessage = formatValidationError(error)
    toast.add({ title: '操作失败', description: errorMessage, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted">
    <!-- 顶部导航 -->
    <header class="border-b border-muted bg-elevated">
      <div class="mx-auto max-w-5xl px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-4">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              size="sm"
              @click="handleCancel"
            />
            <h1 class="text-xl font-bold text-default">
              {{ isEditMode ? '编辑 Codex Provider' : '添加 Codex Provider' }}
            </h1>
          </div>
          <UButton
            v-if="isEditMode"
            color="primary"
            size="md"
            icon="i-heroicons-plus"
            to="/providers/codex/add"
          >
            添加 Codex Provider
          </UButton>
        </div>
      </div>
    </header>

    <!-- 表单内容 -->
    <main class="mx-auto max-w-5xl px-8 py-12">
      <UForm class="space-y-8" @submit="handleSubmit">
        <!-- 基础表单 -->
        <BaseProviderForm
          v-model="baseForm"
          :is-edit-mode="isEditMode"
        />

        <!-- Codex 模型配置 -->
        <CodexModelConfig
          v-model="codexConfig"
          v-model:config-overrides="configOverrides"
          :api-key="baseForm.apiKey"
          :base-url="baseForm.baseUrl"
          :general-config-id="generalConfigId"
          :general-configs="generalConfigs"
        >
          <template #after-model-config>
            <!-- 关联通用配置模板 -->
            <CodexAdvancedConfig
              v-model:general-config-id="generalConfigId"
              :general-configs="generalConfigs"
            />
          </template>
        </CodexModelConfig>

        <!-- 底部操作按钮 -->
        <div class="flex justify-end gap-3 pt-4">
          <UButton
            color="gray"
            variant="soft"
            size="lg"
            @click="handleCancel"
          >
            取消
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="lg"
            :loading="loading"
          >
            {{ isEditMode ? '保存' : '+ 添加' }}
          </UButton>
        </div>
      </UForm>
    </main>
  </div>
</template>
