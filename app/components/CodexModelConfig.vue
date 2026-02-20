<script setup lang="ts">
import type { GeneralConfig } from '@/types'
import {
  extractCodexModelName,
  extractCodexReasoningEffort,
  setCodexBaseUrl,
  setCodexModelName,
  setCodexReasoningEffort,
  validateToml
} from '@/utils/toml'

interface Props {
  modelValue: {
    auth: Record<string, any>
    config: string
  }
  configOverrides: Record<string, any>
  apiKey: string
  baseUrl: string
  generalConfigId: string
  generalConfigs: GeneralConfig[]
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'update:configOverrides', value: Record<string, any>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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

const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const localConfigOverrides = computed({
  get: () => props.configOverrides,
  set: (value) => emit('update:configOverrides', value),
})

const codexModelName = ref('')
const codexReasoningEffort = ref('')
const isTomlValid = ref(true)
const tomlError = ref('')

const isUpdatingFromFields = ref(false)
const isAuthJsonValid = ref(true)
const authJsonError = ref('')

const reasoningEffortOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const templateConfig = computed(() => {
  if (!props.generalConfigId) return null
  const template = props.generalConfigs.find(c => c.id === props.generalConfigId)
  if (!template) return null
  try {
    const parsed = JSON.parse(template.content)
    return {
      auth: parsed.auth || {},
      config: parsed.config || ''
    }
  } catch {
    return null
  }
})

const codexAuthOverrides = computed<Record<string, any>>(() => {
  const raw = localConfigOverrides.value?.codexAuth
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw
})

const codexConfigOverride = computed(() => {
  const raw = localConfigOverrides.value?.codexConfig
  return typeof raw === 'string' ? raw : ''
})

const baseAuth = computed(() => {
  let auth = {}

  if (templateConfig.value?.auth) {
    auth = deepMerge(auth, templateConfig.value.auth)
  }

  auth = deepMerge(auth, localValue.value.auth)

  if (props.apiKey) {
    auth = deepMerge(auth, { OPENAI_API_KEY: props.apiKey })
  }

  return auth
})

const baseConfig = computed(() => {
  let config = ''

  if (templateConfig.value?.config) {
    config = templateConfig.value.config
  }

  if (localValue.value.config) {
    if (!config) {
      config = localValue.value.config
    } else {
      config = localValue.value.config + '\n\n# === 以下来自通用配置模板 ===\n' + config
    }
  }

  if (props.baseUrl) {
    config = setCodexBaseUrl(config, props.baseUrl)
  }

  return config
})

const finalAuth = computed(() => {
  return deepMerge(baseAuth.value, codexAuthOverrides.value)
})

const finalConfig = computed(() => {
  const config = codexConfigOverride.value || baseConfig.value
  if (!props.baseUrl) return config
  return setCodexBaseUrl(config, props.baseUrl)
})

const authJsonPreview = computed(() => {
  try {
    return JSON.stringify(finalAuth.value, null, 2)
  } catch {
    return ''
  }
})

function updateCodexOverrides(authDiff: Record<string, any>, configOverride: string) {
  const next = { ...(localConfigOverrides.value || {}) } as Record<string, any>

  if (Object.keys(authDiff).length > 0) {
    next.codexAuth = authDiff
  } else {
    delete next.codexAuth
  }

  if (configOverride) {
    next.codexConfig = configOverride
  } else {
    delete next.codexConfig
  }

  localConfigOverrides.value = next
}

watch(() => baseConfig.value, (newConfig) => {
  if (isUpdatingFromFields.value) return

  const validation = validateToml(newConfig)
  isTomlValid.value = validation.valid
  tomlError.value = validation.error || ''

  codexModelName.value = extractCodexModelName(newConfig)
  codexReasoningEffort.value = extractCodexReasoningEffort(newConfig)
}, { immediate: true })

watch(codexModelName, (newModel) => {
  if (!newModel) return

  isUpdatingFromFields.value = true
  localValue.value = {
    ...localValue.value,
    config: setCodexModelName(localValue.value.config, newModel)
  }
  nextTick(() => {
    isUpdatingFromFields.value = false
  })
})

watch(codexReasoningEffort, (newEffort) => {
  if (!newEffort) return

  isUpdatingFromFields.value = true
  localValue.value = {
    ...localValue.value,
    config: setCodexReasoningEffort(localValue.value.config, newEffort)
  }
  nextTick(() => {
    isUpdatingFromFields.value = false
  })
})

function handleAuthJsonChange(newJson: string) {
  try {
    const parsed = JSON.parse(newJson)
    isAuthJsonValid.value = true
    authJsonError.value = ''

    const authDiff = extractDiff(baseAuth.value, parsed)
    updateCodexOverrides(authDiff, codexConfigOverride.value)
  } catch (error) {
    isAuthJsonValid.value = false
    authJsonError.value = error instanceof Error ? error.message : 'JSON 格式错误'
  }
}

function handleConfigTomlChange(newToml: string) {
  const validation = validateToml(newToml)
  isTomlValid.value = validation.valid
  tomlError.value = validation.error || ''

  const configOverride = newToml === baseConfig.value ? '' : newToml
  updateCodexOverrides(codexAuthOverrides.value, configOverride)
}

onMounted(() => {
  if (baseConfig.value) {
    codexModelName.value = extractCodexModelName(baseConfig.value)
    codexReasoningEffort.value = extractCodexReasoningEffort(baseConfig.value)
  }
})
</script>

<template>
  <div class="space-y-6">
    <USeparator label="模型配置" />

    <div class="grid grid-cols-2 gap-6">
      <UFormField label="模型名称" name="codexModelName">
        <UInput
          v-model="codexModelName"
          placeholder="gpt-5.3-codex"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="推理强度" name="codexReasoningEffort">
        <USelect
          v-model="codexReasoningEffort"
          :items="reasoningEffortOptions"
          placeholder="选择推理强度"
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

    <slot name="after-model-config" />

    <UFormField label="auth.json" name="codexConfig.auth">
      <UTextarea
        :model-value="authJsonPreview"
        :rows="5"
        placeholder="{}"
        class="w-full font-mono text-sm"
        @update:model-value="handleAuthJsonChange"
      />
      <template #help>
        <div class="mt-2 flex items-center gap-2">
          <UBadge
            :color="isAuthJsonValid ? 'success' : 'error'"
            variant="soft"
            size="sm"
          >
            {{ isAuthJsonValid ? '✓ JSON 格式正确' : '✗ JSON 格式错误' }}
          </UBadge>
          <p v-if="authJsonError" class="text-sm text-error">
            {{ authJsonError }}
          </p>
          <p v-else class="text-sm text-muted">
            最终 auth.json（L1+L2+L3+L4）。直接编辑会记录到 configOverrides。
          </p>
        </div>
      </template>
    </UFormField>

    <UFormField label="config.toml" name="codexConfig.config">
      <UTextarea
        :model-value="finalConfig"
        :rows="15"
        placeholder="留空则自动生成默认配置"
        class="w-full font-mono text-sm"
        @update:model-value="handleConfigTomlChange"
      />
      <template #help>
        <div class="mt-2 flex items-center gap-2">
          <UBadge
            :color="isTomlValid ? 'success' : 'error'"
            variant="soft"
            size="sm"
          >
            {{ isTomlValid ? '✓ TOML 格式正确' : '✗ TOML 格式错误' }}
          </UBadge>
          <p v-if="tomlError" class="text-sm text-error">
            {{ tomlError }}
          </p>
          <p v-else class="text-sm text-muted">
            最终 config.toml（L1+L2+L3+L4）。请求地址始终跟随基础表单，其他编辑会记录到 configOverrides。
          </p>
        </div>
      </template>
    </UFormField>
  </div>
</template>
