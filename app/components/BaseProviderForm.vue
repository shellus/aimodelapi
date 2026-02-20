<script setup lang="ts">
import type { ProviderAppType } from '@/types'

interface Props {
  modelValue: {
    name: string
    type: ProviderAppType
    apiKey: string
    baseUrl: string
    websiteUrl: string
    notes: string
  }
  isEditMode?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
}

const props = withDefaults(defineProps<Props>(), {
  isEditMode: false,
})

const emit = defineEmits<Emits>()

const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="space-y-6">
    <!-- 供应商名称 -->
    <UFormField label="供应商名称" name="name" required>
      <UInput
        v-model="localValue.name"
        placeholder="例如：Claude 官方"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <!-- 第一行：备注 + 官网链接 -->
    <div class="grid grid-cols-2 gap-6">
      <UFormField label="备注" name="notes">
        <UInput
          v-model="localValue.notes"
          placeholder="例如：公司专用账号"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="官网链接" name="websiteUrl">
        <UInput
          v-model="localValue.websiteUrl"
          placeholder="https://example.com（可选）"
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- API Key -->
    <UFormField label="API Key" name="apiKey" required>
      <UInput
        v-model="localValue.apiKey"
        placeholder="API Key"
        size="lg"
        type="password"
        class="w-full"
      />
    </UFormField>

    <!-- 请求地址 -->
    <UFormField label="请求地址" name="baseUrl" required>
      <UInput
        v-model="localValue.baseUrl"
        placeholder="https://your-api-endpoint.com"
        size="lg"
        class="w-full"
      />
      <template #help>
        <UAlert
          color="warning"
          variant="soft"
          icon="i-heroicons-light-bulb"
          title="填写兼容 API 的服务端点地址，不要以斜杠结尾"
          class="mt-3"
        />
      </template>
    </UFormField>
  </div>
</template>
