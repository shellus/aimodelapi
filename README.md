# CC-Switch-Web

Claude Code Provider 切换工具。本地运行的 Web 应用，通过浏览器 UI 管理和切换 Claude Code 的上游 API Provider。

## 工作原理

通过修改 `~/.claude/settings.json` 的 `env` 字段，切换 `ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_BASE_URL`、`ANTHROPIC_MODEL` 等环境变量，实现不同 API Provider 之间的快速切换。

Provider 配置存储在 `~/.cc-switch-web/providers.json`。

## 技术栈

- Nuxt 4（Vue 3 + Nitro server）
- Tailwind CSS 4
- 纯手写组件，无组件库依赖

## 使用方法

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:3000`。

## 项目进度

- [x] 项目初始化：Nuxt 4 + Tailwind CSS 4
- [x] Server 工具函数（providers.ts / claude-settings.ts）
- [x] Server API 路由（CRUD + 切换）
- [x] 前端页面（Provider 管理 UI）
- [ ] 集成测试

## 文档索引

- [功能介绍：供应商管理](./docs/features/provider-management.md)
