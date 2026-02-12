# AIModelAPI

Claude Code Provider 切换工具。本地运行的 Web 应用，通过浏览器 UI 管理和切换 Claude Code 的上游 API Provider。

## 工作原理

通过修改 `~/.claude/settings.json`，切换不同 API Provider 的环境变量和高级配置。切换时采用[三层配置合并架构](./docs/features/general-configs.md#三层配置架构)，支持模板关联和用户个性化覆写。

## 数据存储

| 文件 | 用途 |
|------|------|
| `~/.aimodelapi/providers.json` | Provider 配置列表 |
| `~/.aimodelapi/general-configs.json` | 通用配置模板列表 |
| `~/.claude/settings.json` | Claude Code 系统配置（写入目标） |

## 技术栈

- Nuxt 4（Vue 3 + Nitro server）
- Nuxt UI v4（组件库）
- Tailwind CSS 4

## 使用方法

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:3000`。

## 文档索引

- [功能介绍：供应商管理](./docs/features/provider-management.md)
- [功能介绍：通用配置管理](./docs/features/general-configs.md)
