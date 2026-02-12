<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const toast = useToast()
const loading = ref(false)

// 编辑模式：如果 id 不是 'add' 则为编辑模式
const providerId = route.params.id as string
const isEditMode = computed(() => providerId !== 'add')

// 表单数据
const form = reactive({
  name: '',
  note: '',
  website: '',
  apiKey: '',
  baseUrl: '',
  apiFormat: 'anthropic',
  mainModel: '',
  thinkingModel: '',
  haikuModel: '',
  sonnetModel: '',
  opusModel: '',
  type: 'claude' as 'claude' | 'codex' | 'gemini' | 'opencode',
  icon: 'F',
  writeToCommon: false,
  configJson: JSON.stringify({
    env: {},
    includeCoAuthoredBy: false
  }, null, 2),
})

// API 格式选项
const apiFormatOptions = [
  { label: 'Anthropic Messages (原生)', value: 'anthropic' },
  { label: 'OpenAI Compatible', value: 'openai' },
  { label: 'Custom Format', value: 'custom' },
]

// 如果是编辑模式，加载现有数据
onMounted(async () => {
  if (isEditMode.value) {
    try {
      const provider = await $fetch(`/api/providers/${providerId}`)
      Object.assign(form, provider)
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
    if (isEditMode.value) {
      await $fetch(`/api/providers/${providerId}`, {
        method: 'PUT',
        body: form,
      })
      toast.add({ title: '更新成功', color: 'success' })
    } else {
      await $fetch('/api/providers', {
        method: 'POST',
        body: form,
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
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- 顶部导航 -->
      <header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div class="mx-auto max-w-5xl px-8">
          <div class="flex h-16 items-center gap-4">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              size="sm"
              @click="handleCancel"
            />
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ isEditMode ? '编辑供应商' : '添加新供应商' }}
            </h1>
          </div>
        </div>
      </header>

      <!-- 表单内容 -->
      <main class="mx-auto max-w-5xl px-8 py-12">
        <UForm :state="form" class="space-y-8" @submit="handleSubmit">
          <!-- 第一行：供应商名称 + 备注 -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="供应商名称" name="name" required>
              <UInput
                v-model="form.name"
                placeholder="例如：Claude 官方"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="备注" name="note">
              <UInput
                v-model="form.note"
                placeholder="例如：公司专用账号"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- 官网链接 -->
          <UFormField label="官网链接" name="website">
            <UInput
              v-model="form.website"
              placeholder="https://example.com（可选）"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <!-- API Key -->
          <UFormField label="API Key" name="apiKey" required>
            <UInput
              v-model="form.apiKey"
              placeholder="只需要填这里，下方配置会自动填充"
              size="lg"
              type="password"
              class="w-full"
            />
          </UFormField>

          <!-- 请求地址 -->
          <UFormField label="请求地址" name="baseUrl" required>
            <template #hint>
              <UButton
                color="primary"
                variant="soft"
                size="xs"
                icon="i-heroicons-bolt"
              >
                管理与测速
              </UButton>
            </template>
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

          <!-- API 格式 -->
          <UFormField label="API 格式" name="apiFormat" required>
            <USelect
              v-model="form.apiFormat"
              :options="apiFormatOptions"
              size="lg"
              class="w-full"
            />
            <template #help>
              <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                选择供应商 API 的输入格式
              </p>
            </template>
          </UFormField>

          <!-- 第二行：主模型 + 推理模型 -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="主模型" name="mainModel">
              <UInput
                v-model="form.mainModel"
                placeholder="claude-sonnet-4-20250514"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="推理模型 (Thinking)" name="thinkingModel">
              <UInput
                v-model="form.thinkingModel"
                placeholder="claude-3-7-sonnet-20250219"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- 第三行：Haiku + Sonnet -->
          <div class="grid grid-cols-2 gap-6">
            <UFormField label="Haiku 默认模型" name="haikuModel">
              <UInput
                v-model="form.haikuModel"
                placeholder="claude-3-5-haiku-20241022"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Sonnet 默认模型" name="sonnetModel">
              <UInput
                v-model="form.sonnetModel"
                placeholder="claude-sonnet-4-20250514"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Opus 默认模型 -->
          <UFormField label="Opus 默认模型" name="opusModel">
            <UInput
              v-model="form.opusModel"
              placeholder="claude-opus-4-20250514"
              size="lg"
              class="w-full"
            />
            <template #help>
              <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                可选：指定默认使用的 Claude 模型，留空则使用系统默认。
              </p>
            </template>
          </UFormField>

          <!-- 配置 JSON -->
          <UFormField label="配置 JSON" name="configJson">
            <template #hint>
              <div class="flex items-center gap-2">
                <UCheckbox
                  v-model="form.writeToCommon"
                  label="写入通用配置"
                />
                <UButton
                  color="gray"
                  variant="ghost"
                  size="xs"
                >
                  编辑通用配置
                </UButton>
              </div>
            </template>
            <UTextarea
              v-model="form.configJson"
              :rows="10"
              class="w-full font-mono text-sm"
              size="lg"
            />
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
  </UApp>
</template>
