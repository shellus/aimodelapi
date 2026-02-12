# 三层配置架构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 Provider 的三层配置合并架构（L1 基础字段 + L2 通用模板 + L3 用户覆写），切换时实时合并写入 settings.json。

**Architecture:** Provider 保存时计算用户编辑产生的增量 diff 存为 `configOverrides`。切换 Provider 时实时执行 `deepMerge(L2_template, L3_overrides)` + L1 env 写入。增量 diff 设计确保 L1/L2 变更不会丢失 L3 用户定制。

**Tech Stack:** Nuxt 4, TypeScript, Nuxt UI v4, 文件系统 JSON 存储

---

### Task 1: 类型定义新增 configOverrides 字段

**Files:**
- Modify: `types/index.ts:9-38` (Provider interface)
- Modify: `types/index.ts:96-108` (ProviderRequest interface)

**Step 1: 在 Provider 接口新增 configOverrides**

在 `types/index.ts` 的 `Provider` 接口中，`generalConfigId` 下方新增：

```typescript
  configOverrides?: Record<string, any>  // Layer 3: 用户手动覆写（增量 diff）
```

**Step 2: 在 ProviderRequest 接口新增 configOverrides**

在 `types/index.ts` 的 `ProviderRequest` 接口中，`generalConfigId` 下方新增：

```typescript
  configOverrides?: Record<string, any>
```

---

### Task 2: 后端工具函数新增 extractDiff 和更新 switchProvider

**Files:**
- Modify: `server/utils/claude-settings.ts` (新增 extractDiff 导出函数)
- Modify: `server/utils/providers.ts:85-118` (switchProvider 增加 L3 合并)

**Step 1: 在 claude-settings.ts 末尾新增 extractDiff 函数**

```typescript
/**
 * 提取两个对象之间的增量差异
 * 返回 edited 中与 base 不同的键值（新增或修改的）
 */
export function extractDiff(base: any, edited: any): Record<string, any> {
  const diff: Record<string, any> = {}

  for (const key in edited) {
    if (!(key in base)) {
      // 新增的键
      diff[key] = edited[key]
    } else if (
      edited[key] && typeof edited[key] === 'object' && !Array.isArray(edited[key]) &&
      base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
    ) {
      // 嵌套对象：递归比较
      const nestedDiff = extractDiff(base[key], edited[key])
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff
      }
    } else if (JSON.stringify(base[key]) !== JSON.stringify(edited[key])) {
      // 值不同
      diff[key] = edited[key]
    }
  }

  return diff
}
```

**Step 2: 更新 switchProvider 支持三层合并**

将 `server/utils/providers.ts` 的 `switchProvider` 函数（第85-118行）替换为：

```typescript
export async function switchProvider(id: string): Promise<Provider | null> {
  const providers = await readProviders()
  const target = providers.find(p => p.id === id)
  if (!target) return null

  // 取消所有 isCurrent
  for (const p of providers) p.isCurrent = false
  target.isCurrent = true

  await writeProviders(providers)

  // === 三层合并 ===

  // Layer 2: 通用配置模板
  let merged: any = {}
  if (target.generalConfigId) {
    const config = await getGeneralConfig(target.generalConfigId)
    if (config) {
      try {
        merged = JSON.parse(config.content)
      } catch (e) {
        // 模板 JSON 解析失败，忽略
      }
    }
  }

  // Layer 3: 用户覆写（增量 diff）
  if (target.configOverrides && Object.keys(target.configOverrides).length > 0) {
    merged = deepMerge(merged, target.configOverrides)
  }

  // 写入合并后的配置（带 env 保护）
  if (Object.keys(merged).length > 0) {
    await applyGeneralConfigContent(JSON.stringify(merged))
  }

  // Layer 1: Provider 环境变量
  const env: Record<string, string> = {
    ANTHROPIC_AUTH_TOKEN: target.apiKey,
    ANTHROPIC_BASE_URL: target.baseUrl,
  }
  if (target.modelConfig?.model) {
    env.ANTHROPIC_MODEL = target.modelConfig.model
  }
  await writeClaudeEnv(env)

  return target
}
```

需要在文件顶部从 claude-settings 导入 deepMerge（或者复用已有的）。注意 `claude-settings.ts` 中的 `deepMerge` 当前未导出，需要加 `export`。

**Step 3: 导出 deepMerge**

在 `server/utils/claude-settings.ts:45` 将 `function deepMerge` 改为 `export function deepMerge`。

---

### Task 3: 后端 API 路由接受 configOverrides 字段

**Files:**
- Modify: `server/api/providers/index.post.ts` (创建 Provider 的 schema)
- Modify: `server/api/providers/[id].put.ts` (更新 Provider 的 schema，需确认实际文件名)

**Step 1: 查找并更新 Provider 创建 API 的 zod schema**

在创建和更新 Provider 的 API 路由中，zod schema 需新增：

```typescript
configOverrides: z.record(z.string(), z.any()).optional(),
```

**Step 2: 更新 createProvider 函数**

在 `server/utils/providers.ts` 的 `createProvider` 函数中，确保 `configOverrides` 字段被持久化：

```typescript
configOverrides: data.configOverrides,
```

---

### Task 4: 前端编辑页实现三层合并和 diff 计算

**Files:**
- Modify: `app/pages/providers/[id].vue`

这是最关键的改动。当前页面已有 `mergedConfig` 和 `jsonContent`，但缺少：
1. 加载时恢复 configOverrides
2. 保存时计算 diff
3. USelect 的清除功能

**Step 1: 表单新增 configOverrides 字段**

```typescript
const form = reactive({
  // ...现有字段
  configOverrides: {} as Record<string, any>,
})
```

**Step 2: 修改 mergedConfig 计算属性，纳入 L3**

```typescript
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
```

**Step 3: 修改保存逻辑，计算 diff**

在 `handleSubmit` 中，保存前计算 configOverrides：

```typescript
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
submitBody.configOverrides = Object.keys(overrides).length > 0 ? overrides : undefined
```

需要在前端实现 `extractDiff` 函数（从后端复制或抽为共享 utils）。

**Step 4: 加载编辑时恢复 configOverrides**

在 `onMounted` 的编辑模式中：

```typescript
form.configOverrides = provider.configOverrides || {}
```

**Step 5: 修复 USelect 清除功能**

当前 generalConfigId 的 USelect 没有清除按钮。参考 Nuxt UI v4 文档，使用正确的方式支持清除选择。给 USelect 内容添加一个"无"选项或使用 `nullable` 属性。

将 generalConfigOptions 改为包含空选项：

```typescript
const generalConfigOptions = computed(() => {
  return [
    { label: '无（不关联模板）', value: '' },
    ...generalConfigs.value.map(c => ({ label: c.name, value: c.id }))
  ]
})
```

**Step 6: 移除 jsonContent watch 中对表单的反向同步**

当前 `watch(jsonContent, ...)` 会把 JSON 编辑器的 env 字段反向同步到表单，这在三层架构下会导致循环。用户编辑 JSON 的修改应该只体现为 diff，不应直接修改 L1 字段。

删除 `watch(jsonContent, ...)` 中对 `form.apiKey`、`form.baseUrl`、`form.modelConfig.model` 的反向写入。

---

### Task 5: 验证与清理

**Step 1: 手动测试流程**

1. 创建通用配置模板，内容为 `{ "permissions": { "allow": ["Bash"] } }`
2. 创建 Provider，关联模板，查看最终配置预览是否正确合并
3. 在预览编辑器中修改内容（如添加 `"theme": "dark"`），保存
4. 重新打开编辑页，确认 configOverrides 被正确保留和应用
5. 修改关联的模板内容，重新打开编辑页，确认模板更新反映 + 用户覆写保留
6. 切换 Provider，检查 `~/.claude/settings.json` 内容是否为三层合并结果
7. 取消模板关联（选择"无"），确认 configOverrides 仍然生效

**Step 2: 移除 console.log 调试输出**

`[id].vue:35` 和 `[id].vue:131` 中有 `console.log`，需要移除。

---

## 实施注意事项

1. **DRY**: `deepMerge` 和 `extractDiff` 应只在一处定义。考虑放在 `utils/` 共享目录，或前后端各一份（因 Nuxt server/app 隔离）。
2. **ENV 保护**: `applyGeneralConfigContent` 已有 env 保护逻辑，不需要修改。
3. **向后兼容**: 旧 Provider 没有 `configOverrides` 字段，代码中已用 `?.` 和 `|| {}` 处理。
