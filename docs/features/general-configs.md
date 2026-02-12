# 功能介绍：通用配置管理 (General Configuration)

通用配置功能允许用户维护多套 `~/.claude/settings.json` 的配置模板，并通过关联到 Provider 实现切换时自动应用。

## 核心价值

在 Claude Code 中，`settings.json` 同时存储了：
1. **环境变量**：由 Provider 管理器维护（如 `ANTHROPIC_AUTH_TOKEN`）。
2. **通用设置**：如权限控制（permissions）、插件启用状态（enabledPlugins）、主题（theme）、状态栏（statusLine）等。

**通用配置功能解决了"在切换高级设置时不想破坏当前 Provider 认证信息"的问题。**

## 三层配置架构

Provider 最终写入 `settings.json` 的内容由 3 层叠加而成，切换时实时合并：

```
Layer 1: Provider 基础字段（自动转换为 env）
├── apiKey  → ANTHROPIC_AUTH_TOKEN
├── baseUrl → ANTHROPIC_BASE_URL
└── model   → ANTHROPIC_MODEL

Layer 2: 关联的通用配置模板（generalConfigId → content）
├── permissions, plugins, theme, ...
│   通过 deepMerge 合并

Layer 3: 用户手动覆写（configOverrides，增量 diff）
├── 用户在"最终配置"编辑器中做的个性化修改
│   存储的是相对于 merge(L1, L2) 的差异部分
```

### 合并流程（切换 Provider 时实时执行）

```
1. base = deepMerge(L1_env, L2_template)
2. final = deepMerge(base, L3_configOverrides)
3. 写入 settings.json = final
```

### 增量 diff 计算（保存 Provider 时执行）

```
1. base = deepMerge(L1_env, L2_template)
2. edited = 用户在编辑器中修改后的 JSON
3. configOverrides = extractDiff(base, edited)
   → 只保留用户新增/修改的键，删除与 base 相同的键
```

### 为什么存增量 diff 而不是完整 JSON

- **修改 Provider 的 key/url（Layer 1）**→ 重新合并 → 用户覆写不丢失
- **更换/更新关联模板（Layer 2）**→ 重新合并 → 用户覆写不丢失
- **Layer 3 始终是"用户意图"的精确表达**，不会被上游变更污染

> [!note] L3 设计约束：只支持增和改，不支持删除
> `configOverrides` 只记录用户新增或修改的键值，不记录用户删除的键。
> 如需移除模板中的某个字段，应修改模板本身或更换模板，而非在 L3 中操作。
> 这确保 `configOverrides` 中每个 key 都是用户**明确想要的值**，语义清晰，不存在隐式操作。

### Provider 数据结构

```typescript
interface Provider {
  id: string
  name: string
  type: ProviderAppType              // 'claude' | 'codex' | 'gemini' | 'opencode'

  // Layer 1: 基础字段（切换时转换为 env 写入 settings.json）
  apiKey: string                     // → ANTHROPIC_AUTH_TOKEN
  baseUrl: string                    // → ANTHROPIC_BASE_URL
  modelConfig?: ClaudeModelConfig    // model → ANTHROPIC_MODEL

  // Layer 2 & 3: 配置合并
  generalConfigId?: string           // 关联的通用配置模板 ID
  configOverrides?: Record<string, any>  // 用户手动覆写（增量 diff）

  // 状态与元数据
  isCurrent: boolean                 // 是否为当前激活的 Provider
  notes?: string
  websiteUrl?: string
  createdAt: number
  sortIndex?: number                 // 拖拽排序索引
}

interface GeneralConfig {
  id: string
  name: string
  content: string                    // JSON 字符串（模板内容）
  createdAt: number
}
```

## 使用指南

### 1. 进入管理页面
在首页工具栏右侧，点击 **"调节（Adjustments）"** 图标即可进入通用配置模板列表。

### 2. 创建模板
- 点击"添加模板"。
- **名称**：起一个易于识别的名字，如"全能开发模式"或"极简安全模式"。
- **配置内容**：输入合法的 JSON。
    - 例如，开启所有权限的配置：
      ```json
      {
        "permissions": {
          "allow": ["Bash", "Edit", "Write", "Read", "Glob", "Grep", "Skill"]
        }
      }
      ```

### 3. 关联到 Provider
在 Provider 的编辑页面中，选择关联的通用配置模板（`generalConfigId`）。可选择"无"或点击清除按钮取消关联。

### 4. 编辑最终配置
在 Provider 编辑页面中，"最终配置预览"编辑器展示 `deepMerge(L1, L2, L3)` 的结果。用户可直接编辑，保存时系统自动提取增量 diff 存为 `configOverrides`。

### 5. 未关联模板的 Provider
如果 Provider 没有关联模板且没有 configOverrides，切换时只写入 env 变量（Key、URL、Model），`settings.json` 中的其他设置保持不变。

## 注意事项
- 模板内容必须是有效的 JSON 格式。
- 模板通过深合并应用，同名键会被覆盖，但 `env` 字段始终受保护。
- 模板只通过 Provider 的 `generalConfigId` 关联生效，不支持独立应用。
- `configOverrides` 存储增量 diff，允许上游（L1/L2）变更时保留用户定制。
