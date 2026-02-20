# Provider 供应商管理

> [!info]
> 本功能允许用户在 UI 界面中集中管理多个 AI 供应商（如 Claude 官方、CodeX、Gemini 等），并一键切换 Claude Code 的配置。

## 核心功能

### 1. 多类型支持
支持四种主要应用类型：
- **Claude**: 原生 Anthropic 协议支持。
- **CodeX**: OpenAI 兼容协议。
- **Gemini**: Google Gemini 协议。
- **OpenCode**: 自定义开源协议。

### 2. 场景化模型配置
支持针对不同场景指定默认模型：
- **主模型 (Main)**: 全局默认模型。
- **推理模型 (Thinking)**: 复杂任务优先使用的模型。
- **Haiku/Sonnet/Opus**: 分级别指定默认映射模型。

### 3. 配置一键切换
点击"启用"后，系统通过[分层配置架构](./general-configs.md#分层配置架构)按统一四层模型合并配置（Claude 的 Layer 3 当前预留），并写入目标文件（Claude: `~/.claude/settings.json`；Codex: `~/.codex/auth.json` 与 `~/.codex/config.toml`）。

### 4. 通用配置关联
每个 Provider 可关联一个[通用配置模板](./general-configs.md)，切换时自动应用权限、插件等高级设置。用户还可在编辑页的"最终配置预览"中做个性化修改，系统会以增量 diff 形式保留。

## 页面布局
- **列表页 (`/`)**: 采用卡片式布局，展示供应商状态、名称、Base URL 及备注。
- **编辑页 (`/providers/[id]`)**: 动态表单，支持实时验证和最终配置预览编辑。

## 使用技巧
> [!tip]
> 如果您在使用第三方中转，建议在"主模型"中填入 `claude-3-7-sonnet-20250219` 或类似名称，以确保切换后 Claude Code 能够直接识别。
