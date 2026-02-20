<script setup lang="ts">
import type { GeneralConfig } from '@/types'

interface Props {
  generalConfigId: string
  configOverrides: Record<string, any>
  providerEnv: Record<string, string>
  generalConfigs: GeneralConfig[]
}

interface Emits {
  (e: 'update:generalConfigId', value: string): void
  (e: 'update:configOverrides', value: Record<string, any>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localGeneralConfigId = computed({
  get: () => props.generalConfigId,
  set: (value) => emit('update:generalConfigId', value),
})

const localL4Overrides = computed({
  get: () => props.configOverrides,
  set: (value) => emit('update:configOverrides', value),
})

// 通用配置模板选项
const generalConfigOptions = computed(() => {
  return props.generalConfigs.map(c => ({ label: c.name, value: c.id }))
})

// JSON 编辑器内容
const jsonContent = ref('')
const isJsonValid = ref(true)

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

// 计算最终合并后的 JSON 配置（统一四层框架）
const mergedConfig = computed(() => {
  let config: any = {}

  // Layer 2: 模板
  if (localGeneralConfigId.value) {
    const template = props.generalConfigs.find(c => c.id === localGeneralConfigId.value)
    if (template) {
      try {
        config = JSON.parse(template.content)
      } catch (e) { /* ignore */ }
    }
  }

  // Layer 1: Provider 环境变量
  config = deepMerge(config, { env: props.providerEnv })

  // Layer 3: Provider 自身配置（Claude 当前为空，保留概念位）
  // Layer 4: 用户覆写（configOverrides）
  if (Object.keys(localL4Overrides.value).length > 0) {
    config = deepMerge(config, localL4Overrides.value)
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

// 计算并更新 Layer 4 覆写
function updateL4Overrides() {
  // 计算基础层：L1 + L2 + L3（Claude 的 L3 当前为空）
  let base: any = {}
  if (localGeneralConfigId.value) {
    const template = props.generalConfigs.find(c => c.id === localGeneralConfigId.value)
    if (template) {
      try { base = JSON.parse(template.content) } catch (e) { /* */ }
    }
  }
  base = deepMerge(base, { env: props.providerEnv })

  // 用户编辑后的完整 JSON
  let edited: any = {}
  try { edited = JSON.parse(jsonContent.value) } catch (e) { /* */ }

  // 提取增量 diff
  const overrides = extractDiff(base, edited)
  localL4Overrides.value = overrides
}

// 暴露方法给父组件
defineExpose({
  updateL4Overrides,
})
</script>

<template>
  <div class="space-y-6">
    <USeparator label="高级配置" />

    <!-- 关联通用配置模板 -->
    <UFormField label="关联通用配置模板" name="generalConfigId">
      <div class="flex items-center gap-2">
        <USelect
          v-model="localGeneralConfigId"
          :items="generalConfigOptions"
          placeholder="选择通用配置模板（可选）"
          size="lg"
          class="w-full"
        />
        <UButton
          v-if="localGeneralConfigId"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark"
          size="lg"
          @click="localGeneralConfigId = ''"
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
  </div>
</template>
