# Provider 管理功能完善实施计划

## 目标

完善 Provider 管理功能，包括 UI 优化、模板关联、JSON 编辑、拖动排序等核心功能。

## 任务清单

### 1. 主页面 UI 优化
- [ ] 响应式 Grid 布局（小屏1列，中屏2列，大屏3列）
- [ ] 间距优化（gap-4, p-4）
- [ ] 按钮功能明确化（未实现功能显示提示）
- [ ] 移除无用的 Toggle 开关
- [ ] 卡片高度优化（图标缩小、紧凑布局）

### 2. Provider 编辑页面增强
- [ ] 添加"关联通用配置模板"选择器
- [ ] 添加 JSON 预览编辑器（CodeMirror 6）
- [ ] 实现模板+Provider配置合并预览
- [ ] 实现 JSON 编辑后解析回填表单
- [ ] 双向同步逻辑

### 3. 拖动排序功能
- [ ] 集成 VueDraggable
- [ ] 实现拖拽重排序 UI
- [ ] 后端排序更新 API
- [ ] 持久化排序状态

### 4. 后端 API 补充
- [ ] `PATCH /api/providers/sort` - 批量更新排序
- [ ] 确保 Provider 数据模型支持 sortIndex

## 技术选型

- **拖拽库**: vuedraggable@next
- **JSON 编辑器**: CodeMirror 6 + @codemirror/lang-json
- **布局**: Tailwind CSS Grid + Nuxt UI 组件

## 实施顺序

1. 主页面 UI 优化（视觉改进，无依赖）
2. 拖动排序功能（独立功能）
3. Provider 编辑页面增强（核心功能）
4. 后端 API 补充（支持排序）

## 关键文件

- `app/pages/index.vue` - 主页面
- `app/pages/providers/[id].vue` - 编辑页面
- `server/api/providers/sort.patch.ts` - 排序 API（新建）
- `server/utils/providers.ts` - Provider 工具函数
