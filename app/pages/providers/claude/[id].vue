<script setup lang="ts">
import type { GeneralConfig, ClaudeModelConfig } from '@/types'
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
  type: 'claude' as const,
  apiKey: '',
  baseUrl: '',
  websiteUrl: '',
  notes: '',
})

// Claude 模型配置
const modelConfig = reactive<ClaudeModelConfig>({
  model: '',
  thinkingModel: '',
  haikuModel: '',
  sonnetModel: '',
  opusModel: '',
})

// Claude 高级配置
const generalConfigId = ref('')
const configOverrides = ref<Record<string, any>>({})

// 通用配置模板列表
const generalConfigs = ref<GeneralConfig[]>([])

// 高级配置组件引用
const advancedConfigRef = ref<any>(null)

// 生成 Provider 环境变量配置
const providerEnv = computed(() => {
  const env: Record<string, string> = {
    ANTHROPIC_AUTH_TOKEN: baseForm.apiKey,
    ANTHROPIC_BASE_URL: baseForm.baseUrl,
  }
  if (modelConfig.model) env.ANTHROPIC_MODEL = modelConfig.model
  if (modelConfig.thinkingModel) env.ANTHROPIC_REASONING_MODEL = modelConfig.thinkingModel
  if (modelConfig.haikuModel) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = modelConfig.haikuModel
  if (modelConfig.sonnetModel) env.ANTHROPIC_DEFAULT_SONNET_MODEL = modelConfig.sonnetModel
  if (modelConfig.opusModel) env.ANTHROPIC_DEFAULT_OPUS_MODEL = modelConfig.opusModel
  return env
})

// 加载通用配置模板列表（只加载 Claude 类型）
async function loadGeneralConfigs() {
  try {
    generalConfigs.value = await authFetch<GeneralConfig[]>('/api/general-configs?type=claude')
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

      // 映射模型配置
      if (provider.modelConfig) {
        modelConfig.model = provider.modelConfig.model || ''
        modelConfig.thinkingModel = provider.modelConfig.thinkingModel || ''
        modelConfig.haikuModel = provider.modelConfig.haikuModel || ''
        modelConfig.sonnetModel = provider.modelConfig.sonnetModel || ''
        modelConfig.opusModel = provider.modelConfig.opusModel || ''
      }
    } catch (error) {
      toast.add({ title: '加载失败', description: String(error), color: 'error' })
      router.push('/')
    }
  }
})

// 取消操作
function handleCancel() {
  router.push('/')
}

// 提交表单
async function handleSubmit() {
  loading.value = true
  try {
    // 更新 L4 覆写（configOverrides）
    if (advancedConfigRef.value) {
      advancedConfigRef.value.updateL4Overrides()
    }

    // 处理提交数据
    const submitBody: any = {
      name: baseForm.name,
      type: baseForm.type,
      apiKey: baseForm.apiKey,
      baseUrl: baseForm.baseUrl,
      notes: baseForm.notes,
      websiteUrl: baseForm.websiteUrl,
      generalConfigId: generalConfigId.value || undefined,
      configOverrides: Object.keys(configOverrides.value).length > 0 ? configOverrides.value : {},
      modelConfig: {}
    }

    // 只提交有值的模型配置
    for (const [key, value] of Object.entries(modelConfig)) {
      if (value) {
        submitBody.modelConfig[key] = value
      }
    }

    if (Object.keys(submitBody.modelConfig).length === 0) {
      delete submitBody.modelConfig
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
    router.push('/')
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
              {{ isEditMode ? '编辑 Claude Provider' : '添加 Claude Provider' }}
            </h1>
          </div>
          <UButton
            v-if="isEditMode"
            color="primary"
            size="md"
            icon="i-heroicons-plus"
            to="/providers/claude/add"
          >
            添加 Claude Provider
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

        <!-- Claude 模型配置 -->
        <ClaudeModelConfig v-model="modelConfig" />

        <!-- Claude 高级配置 -->
        <ClaudeAdvancedConfig
          ref="advancedConfigRef"
          v-model:general-config-id="generalConfigId"
          v-model:config-overrides="configOverrides"
          :provider-env="providerEnv"
          :general-configs="generalConfigs"
        />

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
