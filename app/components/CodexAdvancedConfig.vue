<script setup lang="ts">
import type { GeneralConfig } from '@/types'

interface Props {
  generalConfigId: string
  generalConfigs: GeneralConfig[]
}

interface Emits {
  (e: 'update:generalConfigId', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localGeneralConfigId = computed({
  get: () => props.generalConfigId,
  set: (value) => emit('update:generalConfigId', value),
})

// 通用配置模板选项
const generalConfigOptions = computed(() => {
  return props.generalConfigs.map(c => ({ label: c.name, value: c.id }))
})
</script>

<template>
  <div class="space-y-6">
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
          选择一个通用配置模板，模板配置会与上方的表单输入合并显示在下方的 auth.json 和 config.toml 中，表单输入优先级更高。
        </p>
      </template>
    </UFormField>
  </div>
</template>
