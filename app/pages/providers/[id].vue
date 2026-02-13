<script setup lang="ts">
import type { GeneralConfig } from '@/types'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { authFetch } = useAuth()
const loading = ref(false)

// 编辑模式：如果 id 不是 'add' 则为编辑模式
const providerId = route.params.id as string
const isEditMode = computed(() => providerId !== 'add')

// 表单数据
const form = reactive({
  name: '',
  type: 'claude' as 'claude' | 'codex' | 'gemini' | 'opencode',
  apiKey: '',
  baseUrl: '',
  websiteUrl: '',
  notes: '',
  generalConfigId: '',
  configOverrides: {} as Record<string, any>,
  modelConfig: {
    model: '',
    thinkingModel: '',
    haikuModel: '',
    sonnetModel: '',
    opusModel: '',
  }
})

// 通用配置模板列表
const generalConfigs = ref<GeneralConfig[]>([])
const generalConfigOptions = computed(() => {
  return generalConfigs.value.map(c => ({ label: c.name, value: c.id }))
})

// JSON 编辑器内容
const jsonContent = ref('')
const isJsonValid = ref(true)

// 应用类型选项
const typeOptions = [
  { label: 'Claude', value: 'claude' },
  { label: 'CodeX', value: 'codex' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenCode', value: 'opencode' },
]

// 深度合并对象
function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

// 提取两个对象之间的增量差异
function extractDiff(base: any, edited: any): Record<string, any> {
  const diff: Record<string, any> = {}
  for (const key in edited) {
    if (!(key in base)) {
      diff[key] = edited[key]
    } else if (
      edited[key] && typeof edited[key] === 'object' && !Array.isArray(edited[key]) &&
      base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
    ) {
      const nestedDiff = extractDiff(base[key], edited[key])
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff
      }
    } else if (JSON.stringify(base[key]) !== JSON.stringify(edited[key])) {
      diff[key] = edited[key]
    }
  }
  return diff
}

// 生成 Provider 环境变量配置
function generateProviderEnv() {
  const env: Record<string, string> = {
    ANTHROPIC_AUTH_TOKEN: form.apiKey,
    ANTHROPIC_BASE_URL: form.baseUrl,
  }
  if (form.modelConfig.model) env.ANTHROPIC_MODEL = form.modelConfig.model
  if (form.modelConfig.thinkingModel) env.ANTHROPIC_REASONING_MODEL = form.modelConfig.thinkingModel
  if (form.modelConfig.haikuModel) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = form.modelConfig.haikuModel
  if (form.modelConfig.sonnetModel) env.ANTHROPIC_DEFAULT_SONNET_MODEL = form.modelConfig.sonnetModel
  if (form.modelConfig.opusModel) env.ANTHROPIC_DEFAULT_OPUS_MODEL = form.modelConfig.opusModel
  return env
}

// 计算最终合并后的 JSON 配置
const mergedConfig = computed(() => {
  let config: any = {}

  // Layer 2: 模板
  if (form.generalConfigId) {
    const template = generalConfigs.value.find(c => c.id === form.generalConfigId)
    if (template) {
      try {
        config = JSON.parse(template.content)
      } catch (e) { /* ignore */ }
    }
  }

  // Layer 1: Provider 环境变量
  const providerEnv = generateProviderEnv()
  config = deepMerge(config, { env: providerEnv })

  // Layer 3: 用户覆写
  if (Object.keys(form.configOverrides).length > 0) {
    config = deepMerge(config, form.configOverrides)
  }

  return JSON.stringify(config, null, 2)
})

// 监听合并配置变化，更新 JSON 编辑器
watch(mergedConfig, (newValue) => {
  jsonContent.value = newValue
})

// JSON 编辑器内容变化时，验证 JSON 格式
watch(jsonContent, (newValue) => {
  try {
    JSON.parse(newValue)
    isJsonValid.value = true
  } catch (e) {
    isJsonValid.value = false
  }
})

// 加载通用配置模板列表
async function loadGeneralConfigs() {
  try {
    generalConfigs.value = await authFetch<GeneralConfig[]>('/api/general-configs')
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
      form.name = provider.name
      form.type = provider.type
      form.apiKey = provider.apiKey
      form.baseUrl = provider.baseUrl
      form.websiteUrl = provider.websiteUrl || ''
      form.notes = provider.notes || ''
      form.generalConfigId = provider.generalConfigId || ''
      form.configOverrides = provider.configOverrides || {}

      // 映射模型配置
      if (provider.modelConfig) {
        form.modelConfig.model = provider.modelConfig.model || ''
        form.modelConfig.thinkingModel = provider.modelConfig.thinkingModel || ''
        form.modelConfig.haikuModel = provider.modelConfig.haikuModel || ''
        form.modelConfig.sonnetModel = provider.modelConfig.sonnetModel || ''
        form.modelConfig.opusModel = provider.modelConfig.opusModel || ''
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
    // 计算 L1+L2 的 base（不含 L3）
    let base: any = {}
    if (form.generalConfigId) {
      const template = generalConfigs.value.find(c => c.id === form.generalConfigId)
      if (template) {
        try { base = JSON.parse(template.content) } catch (e) { /* */ }
      }
    }
    base = deepMerge(base, { env: generateProviderEnv() })

    // 用户编辑后的完整 JSON
    let edited: any = {}
    try { edited = JSON.parse(jsonContent.value) } catch (e) { /* */ }

    // 提取增量 diff
    const overrides = extractDiff(base, edited)

    // 处理提交数据，移除空字段
    const submitBody: any = {
      name: form.name,
      type: form.type,
      apiKey: form.apiKey,
      baseUrl: form.baseUrl,
      notes: form.notes,
      websiteUrl: form.websiteUrl,
      generalConfigId: form.generalConfigId || undefined,
      configOverrides: Object.keys(overrides).length > 0 ? overrides : {},
      modelConfig: {}
    }

    // 只提交有值的模型配置
    for (const [key, value] of Object.entries(form.modelConfig)) {
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
    toast.add({ title: '操作失败', description: String(error), color: 'error' })
  } finally {
    loading.value = false
  }
}

// 当 API Key 变化时，自动填充 baseUrl（如果为空）
watch(() => form.apiKey, (newKey) => {
  if (newKey && !form.baseUrl) {
    // 这里可以根据 API Key 前缀自动推断 baseUrl
    // 暂时留空，用户手动填写
  }
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
            <h1 class="text-xl font-bold text-default">
              {{ isEditMode ? '编辑供应商' : '添加新供应商' }}
            </h1>
          </div>
        </div>
      </header>

      <!-- 表单内容 -->
      <main class="mx-auto max-w-5xl px-8 py-12">
        <UForm :state="form" class="space-y-8" @submit="handleSubmit">
          <!-- 第一行：供应商名称 + 应用类型 -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="供应商名称" name="name" required>
              <UInput
                v-model="form.name"
                placeholder="例如：Claude 官方"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="应用类型" name="type" required>
              <USelect
                v-model="form.type"
                :options="typeOptions"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- 第二行：备注 + 官网链接 -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="备注" name="notes">
              <UInput
                v-model="form.notes"
                placeholder="例如：公司专用账号"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="官网链接" name="websiteUrl">
              <UInput
                v-model="form.websiteUrl"
                placeholder="https://example.com（可选）"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- API Key -->
          <UFormField label="API Key" name="apiKey" required>
            <UInput
              v-model="form.apiKey"
              placeholder="API Key"
              size="lg"
              type="password"
              class="w-full"
            />
          </UFormField>

          <!-- 请求地址 -->
          <UFormField label="请求地址" name="baseUrl" required>
            <UInput
              v-model="form.baseUrl"
              placeholder="https://your-api-endpoint.com"
              size="lg"
              class="w-full"
            />
            <template #help>
              <UAlert
                color="warning"
                variant="soft"
                icon="i-heroicons-light-bulb"
                title="填写兼容 Claude API 的服务端点地址，不要以斜杠结尾"
                class="mt-3"
              />
            </template>
          </UFormField>

          <USeparator label="模型配置 (可选)" />

          <!-- 第二行：主模型 + 推理模型 -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="主模型" name="modelConfig.model">
              <UInput
                v-model="form.modelConfig.model"
                placeholder="claude-3-7-sonnet-20250219"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="推理模型 (Thinking)" name="modelConfig.thinkingModel">
              <UInput
                v-model="form.modelConfig.thinkingModel"
                placeholder="claude-3-7-sonnet-20250219"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- 第三行：Haiku + Sonnet -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="Haiku 默认模型" name="modelConfig.haikuModel">
              <UInput
                v-model="form.modelConfig.haikuModel"
                placeholder="claude-3-5-haiku-20241022"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Sonnet 默认模型" name="modelConfig.sonnetModel">
              <UInput
                v-model="form.modelConfig.sonnetModel"
                placeholder="claude-3-5-sonnet-20241022"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Opus 默认模型 -->
          <UFormField label="Opus 默认模型" name="modelConfig.opusModel">
            <UInput
              v-model="form.modelConfig.opusModel"
              placeholder="claude-3-opus-20240229"
              size="lg"
              class="w-full"
            />
            <template #help>
              <p class="mt-1.5 text-sm text-subtle">
                指定不同场景下的默认模型，留空则使用系统默认。
              </p>
            </template>
          </UFormField>

          <USeparator label="高级配置" />

          <!-- 关联通用配置模板 -->
          <UFormField label="关联通用配置模板" name="generalConfigId">
            <div class="flex items-center gap-2">
              <USelect
                v-model="form.generalConfigId"
                :items="generalConfigOptions"
                placeholder="选择通用配置模板（可选）"
                size="lg"
                class="w-full"
              />
              <UButton
                v-if="form.generalConfigId"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                size="lg"
                @click="form.generalConfigId = ''"
              />
            </div>
            <template #help>
              <p class="mt-1.5 text-sm text-subtle">
                选择一个通用配置模板，切换 Provider 时会先应用模板配置，再写入 Provider 自身的环境变量。
              </p>
            </template>
          </UFormField>

          <!-- 最终配置预览 -->
          <UFormField label="最终配置预览（可编辑）" name="jsonConfig">
            <JsonEditor
              v-model="jsonContent"
              class="mt-2"
            />
            <template #help>
              <div class="mt-2 flex items-center gap-2">
                <UBadge
                  :color="isJsonValid ? 'success' : 'error'"
                  variant="soft"
                  size="sm"
                >
                  {{ isJsonValid ? '✓ JSON 格式正确' : '✗ JSON 格式错误' }}
                </UBadge>
                <p class="text-sm text-muted">
                  编辑 JSON 可自定义配置，保存时会自动计算与模板的差异并保留。
                </p>
              </div>
            </template>
          </UFormField>

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
