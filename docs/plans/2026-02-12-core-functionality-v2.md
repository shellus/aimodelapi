# CC-Switch-Web 核心功能完善计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成从数据模型、后端 API 到前端表单的完整闭环，实现 Provider 的 CRUD 和环境切换功能。

**Architecture:** 统一使用 `/types/index.ts` 定义的 `Provider` 和 `ProviderRequest` 类型。后端通过 `server/utils/providers.ts` 进行 JSON 持久化，并通过 `server/utils/claude-settings.ts` 修改 Claude Code 配置。前端通过动态路由 `[id].vue` 实现添加和编辑的统一。

**Tech Stack:** Nuxt 4, Nuxt UI v4, Tailwind CSS 4, Zod (验证)

---

### Task 1: 更新类型定义

**Files:**
- Modify: `/data/projects/aimodelapi/types/index.ts`

**步骤:**
1. 移除 `ProviderCategory` 类型定义。
2. 移除 `Provider` 接口中的 `category` 字段。
3. 移除 `ProviderMeta` 中关于 `settingsConfig` 和 `writeToCommon` 的相关字段（暂不实现）。
4. 确保 `ProviderAppType` 包含 `claude`, `codex`, `gemini`, `opencode`。

---

### Task 2: 更新后端工具函数

**Files:**
- Modify: `/data/projects/aimodelapi/server/utils/providers.ts`

**步骤:**
1. 导入 `/types/index.ts` 中的类型。
2. 更新 `createProvider` 函数：
   - 移除 `apiFormat` 等旧字段。
   - 支持 `type` 字段。
   - 生成 8 位 UUID。
   - 处理 `modelConfig`。
3. 更新 `updateProvider` 函数以支持 `modelConfig`。
4. 更新 `switchProvider`：
   - 在写入环境变量时，优先使用 `modelConfig.model`。

---

### Task 3: 完善 API 路由

**Files:**
- Create: `/data/projects/aimodelapi/server/api/providers/[id].get.ts`
- Modify: `/data/projects/aimodelapi/server/api/providers/index.post.ts`
- Modify: `/data/projects/aimodelapi/server/api/providers/[id].put.ts`

**步骤:**
1. 实现 `[id].get.ts` 以支持编辑页面的数据回显。
2. 在 POST/PUT 路由中更新 Zod 校验 Schema，匹配新的 `ProviderRequest` 结构（包含 `type` 和 `modelConfig`）。

---

### Task 4: 更新前端供应商表单

**Files:**
- Modify: `/data/projects/aimodelapi/app/pages/providers/[id].vue`

**步骤:**
1. 添加 `type` 选择器（USelect）。
2. 更新 `form` 响应式对象，包含 `modelConfig` 的 5 个字段。
3. 修正字段名（如 `note` -> `notes`, `website` -> `websiteUrl`）。
4. 实现 `fetchProvider` 逻辑，在编辑模式下填充表单。
5. 更新提交逻辑，确保空模型字段被过滤。

---

### Task 5: 更新供应商列表页

**Files:**
- Modify: `/data/projects/aimodelapi/app/pages/index.vue`

**步骤:**
1. 导入 `/types/index.ts` 类型。
2. 修正编辑按钮的跳转路径为 `/providers/${p.id}`。
3. 在卡片中显示 `notes` 备注。
4. 优化卡片图标的显示逻辑。

---

### Task 6: 验证与清理

**步骤:**
1. 删除旧数据：`rm -f ~/.aimodelapi/providers.json`。
2. 运行项目：`npm run dev`。
3. 手动测试：创建不同类型的 Provider -> 编辑 -> 切换 -> 检查 `~/.claude/settings.json` 是否正确更新。
