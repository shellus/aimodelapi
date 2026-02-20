# 功能介绍：通用配置管理 (General Configuration)

通用配置功能允许用户维护多套模板，并通过关联到 Provider 实现切换时自动应用。

## 核心价值

1. 切换 Provider 时自动应用模板，不需要手工改配置文件。
2. 上游配置变化（基础字段、模板）后，用户的最终编辑仍可保留。
3. 对 Claude 与 Codex 使用统一的 `configOverrides` 思路，但按各自文件格式落地。

## 分层配置架构

### Claude（写入 `~/.claude/settings.json`）

```
Layer 1: Provider 基础字段（env）
Layer 2: 通用配置模板（generalConfig.content）
Layer 3: Provider 自身配置（当前预留，尚未启用独立字段）
Layer 4: configOverrides（增量 diff）

final = merge(L2, L3, L4)
final.env = L1
```

说明：`env` 由 Layer 1 最终写入，避免模板或覆写误改认证与路由。

### Codex（写入 `~/.codex/auth.json` 与 `~/.codex/config.toml`）

```
Layer 1: Provider 基础字段（apiKey/baseUrl）
Layer 2: 通用配置模板（generalConfig.content: { auth, config })
Layer 3: Provider 自身配置（codexConfig: { auth, config })
Layer 4: configOverrides（最终编辑器差异）

final = merge(L1, L2, L3, L4)
```

当前 `configOverrides` 在 Codex 下使用两段结构：
- `codexAuth`: 对最终 `auth.json` 的差异对象。
- `codexConfig`: 对最终 `config.toml` 的覆盖字符串。

## 增量 diff 规则

`configOverrides` 只存“编辑器最终内容”相对基础合并结果的差异。

- Claude: 相对 `merge(L1_env, L2_template, L3_provider)` 提取 diff（当前 L3 为空，等价于 L1+L2）。
- Codex: 相对 `merge(L1, L2, L3)` 提取 diff（最终编辑器只写 `configOverrides`，不反写 L2/L3）。

## Provider 关键字段

```typescript
interface Provider {
  id: string
  name: string
  type: 'claude' | 'codex' | 'gemini' | 'opencode'

  // Layer 1
  apiKey: string
  baseUrl: string

  // Claude 模型映射
  modelConfig?: ClaudeModelConfig

  // Codex Provider 自身配置（Layer 3）
  codexConfig?: {
    auth: Record<string, any>
    config: string
  }

  // 通用模板
  generalConfigId?: string

  // Layer 4 最终编辑差异（Claude: 通用对象；Codex: codexAuth/codexConfig）
  configOverrides?: Record<string, any>
}
```

## 使用指南

1. 创建模板并保存为通用配置。
2. 在 Provider 编辑页关联模板（`generalConfigId`）。
3. 在最终配置编辑区调整内容并保存。
4. 系统只记录差异到 `configOverrides`，切换时按分层实时合并。

## 注意事项

- 模板 `content` 必须是合法 JSON。
- Codex 模板 `content` 推荐结构：`{ "auth": {}, "config": "...toml..." }`。
- `configOverrides` 设计为“增量覆盖”，上游层变更后会重新参与合并。
