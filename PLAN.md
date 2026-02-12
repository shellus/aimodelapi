# CC-Switch-Web 实施计划

## 项目概述

基于 Nuxt 4 的 Claude Code Provider 切换 Web 应用 MVP。本地运行，浏览器访问 UI，通过修改 `~/.claude/settings.json` 的 `env` 字段切换上游 API。

## 技术方案

- **框架**：Nuxt 4（Vue 3 + Nitro server）
- **UI**：Tailwind CSS 4 + 手写组件（MVP 不引入组件库）
- **数据存储**：`~/.cc-switch-web/providers.json`（JSON 文件）
- **切换机制**：读写 `~/.claude/settings.json` 中的 `env` 对象

### Claude settings.json 写入的 env 键

| 键名 | 用途 |
|------|------|
| `ANTHROPIC_AUTH_TOKEN` | API 密钥 |
| `ANTHROPIC_BASE_URL` | API 端点地址 |
| `ANTHROPIC_MODEL` | 默认模型（可选） |

### Provider 数据模型

```typescript
interface Provider {
  id: string           // nanoid
  name: string         // 显示名称，如 "官方 API"、"中转站 A"
  apiKey: string       // ANTHROPIC_AUTH_TOKEN
  baseUrl: string      // ANTHROPIC_BASE_URL
  model?: string       // ANTHROPIC_MODEL（可选）
  isCurrent: boolean   // 是否为当前激活的 Provider
  createdAt: number    // 创建时间戳
}
```

## 实施步骤

### 1. 项目初始化
- 创建 Nuxt 4 项目
- 配置 Tailwind CSS 4
- 编写 README.md

### 2. Server API 层
- `GET /api/providers` - 获取所有 Provider
- `POST /api/providers` - 创建 Provider
- `PUT /api/providers/:id` - 更新 Provider
- `DELETE /api/providers/:id` - 删除 Provider
- `POST /api/providers/:id/switch` - 切换到指定 Provider
- `GET /api/status` - 获取当前 Claude settings.json 状态

文件读写工具函数：
- `server/utils/providers.ts` - Provider JSON 文件读写
- `server/utils/claude-settings.ts` - Claude settings.json 读写（原子写入：写临时文件 → rename）

### 3. 前端页面
- `pages/index.vue` - 唯一页面，包含：
  - 当前激活 Provider 状态卡片
  - Provider 列表（卡片式，显示名称、baseUrl、激活状态）
  - 每个 Provider 卡片上的操作：切换 / 编辑 / 删除
  - 添加 Provider 的表单（模态框或内联）

### 4. 集成测试
- 手动验证：添加 Provider → 切换 → 检查 settings.json 是否正确写入
