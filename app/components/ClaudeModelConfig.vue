<script setup lang="ts">
import type { ClaudeModelConfig } from '@/types'

interface Props {
  modelValue: ClaudeModelConfig
}

interface Emits {
  (e: 'update:modelValue', value: ClaudeModelConfig): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="space-y-6">
    <USeparator label="模型配置 (可选)" />

    <!-- 第一行：主模型 + 推理模型 -->
    <div class="grid grid-cols-2 gap-6">
      <UFormField label="主模型" name="modelConfig.model">
        <UInput
          v-model="localValue.model"
          placeholder="claude-3-7-sonnet-20250219"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="推理模型 (Thinking)" name="modelConfig.thinkingModel">
        <UInput
          v-model="localValue.thinkingModel"
          placeholder="claude-3-7-sonnet-20250219"
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- 第二行：Haiku + Sonnet -->
    <div class="grid grid-cols-2 gap-6">
      <UFormField label="Haiku 默认模型" name="modelConfig.haikuModel">
        <UInput
          v-model="localValue.haikuModel"
          placeholder="claude-3-5-haiku-20241022"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Sonnet 默认模型" name="modelConfig.sonnetModel">
        <UInput
          v-model="localValue.sonnetModel"
          placeholder="claude-3-5-sonnet-20241022"
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- Opus 默认模型 -->
    <UFormField label="Opus 默认模型" name="modelConfig.opusModel">
      <UInput
        v-model="localValue.opusModel"
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
  </div>
</template>
