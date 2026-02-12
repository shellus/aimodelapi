# AIModelAPI 开发规范

## 🚨 开发铁律（必读！）

### 文档优先原则

**铁律：先查文档，再写代码。绝不凭印象和猜测写代码。**

#### ❌ 错误的工作流程（禁止！）
1. 凭"印象"和"猜测"写代码（脑补组件应该怎么用）
2. 出问题了才去"找"文档
3. 找到一个看起来相关的例子
4. 修修补补（试错驱动开发）
5. 再次出错，继续修补

**症状**：
- 说"让我查文档"，实际上是在找支持已有代码的例子
- 写了代码后才发现理解错了
- 反复修改同一段代码
- 自以为"知道"怎么用，跳过查文档

#### ✅ 正确的工作流程（强制执行！）
1. **使用任何新组件/API 前，必须先完整阅读官方文档和示例**
2. **理解设计理念**（例如：UModal 已内置 title/body/footer，不需要嵌套 UCard）
3. **按照标准用法一次写对**
4. 如有疑问，查阅项目中已有的同类代码实现

**检查清单**：
- [ ] 我是否阅读了官方文档的完整示例？
- [ ] 我是否理解了组件的设计理念？
- [ ] 我是否检查了项目中已有的同类实现？
- [ ] 我是在**知识驱动**而非**试错驱动**？

#### 实战案例：UModal 的惨痛教训

**错误过程**：
1. 凭印象写了 `<UModal v-model="...">`（v3 语法）
2. 错误地在内部嵌套 `<UCard>`（根本不理解 UModal 的设计）
3. 发现弹窗默认显示，改成 `v-model:open`
4. 仍然有问题，因为嵌套结构是错的
5. 最后才真正读文档，发现 UModal 本身就支持 title/body/footer

**正确做法**：
1. 打开 nuxt-ui 技能或官方文档
2. 阅读 UModal 的完整示例
3. 理解：UModal 是完整的对话框容器，有自己的插槽结构
4. 一次写对：`<UModal v-model:open="..." title="..."><template #body>...</template></UModal>`

### DRY 原则强化

在实现任何功能前：
1. **必须**检查项目中是否有类似实现
2. **必须**复用已有的组件和工具函数
3. **必须**遵循项目已有的代码风格和模式

**反面案例**：项目已有 `JsonEditor` 组件，却自己用 `UTextarea` 实现 JSON 编辑。

## UI 框架规范

### 技术栈
- **UI 框架**: Nuxt UI v4
- **样式方案**: Tailwind CSS 4
- **组件库**: 使用 Nuxt UI 提供的组件，避免自行实现已有组件

### 设计参考
- **官方 Dashboard 模板**: https://github.com/nuxt-ui-templates/dashboard
- **官方文档**: https://ui.nuxt.com/docs
- **Showcase**: https://ui.nuxt.com/showcase

### ⚠️ Nuxt UI v4 重要注意事项

#### 1. 表单组件使用 `UFormField` 而非 `UFormGroup`

**错误示例（v3 语法）：**
```vue
<UFormGroup label="名称" name="name" required>
  <UInput v-model="form.name" />
</UFormGroup>
```

**正确示例（v4 语法）：**
```vue
<UFormField label="名称" name="name" required>
  <UInput v-model="form.name" />
</UFormField>
```

**症状**：使用 `UFormGroup` 会导致标签丢失、布局混乱、组件无法正常渲染。

#### 2. 表单输入框必须添加 `class="w-full"`

**错误示例：**
```vue
<UInput v-model="form.name" size="lg" />
```

**正确示例：**
```vue
<UInput v-model="form.name" size="lg" class="w-full" />
```

**症状**：不添加 `w-full` 会导致输入框宽度异常狭窄，尤其在双栏布局中更明显。

**适用组件**：
- `UInput` - 必须添加
- `USelect` - 必须添加
- `UTextarea` - 必须添加
- 所有表单输入组件 - 都建议添加

#### 3. Modal/Slideover 等弹窗组件使用 `v-model:open`

**错误示例（v3 语法）：**
```vue
<UModal v-model="isOpen">
  <UCard>
    <template #header>标题</template>
    内容
  </UCard>
</UModal>
```

**正确示例（v4 语法）：**
```vue
<UModal v-model:open="isOpen" title="标题">
  <template #body>内容</template>
  <template #footer>
    <UButton @click="isOpen = false">关闭</UButton>
  </template>
</UModal>
```

**关键点**：
- 使用 `v-model:open` 而非 `v-model`
- UModal 本身支持 `title`、`#body`、`#footer` 插槽
- **不要**在 UModal 内部嵌套 UCard（这是常见错误！）
- UModal 已经是一个完整的对话框容器，有自己的结构

**症状**：使用 `v-model` 会导致弹窗状态控制失效，页面加载时弹窗可能默认显示。嵌套 UCard 会导致样式混乱。

**适用组件**：
- `UModal` - 必须使用 `v-model:open`
- `USlideover` - 必须使用 `v-model:open`
- `UContextMenu` - 必须使用 `v-model:open`

#### 4. USelect 不支持空字符串作为 value

Nuxt UI v4 的 USelect 基于 Reka UI（Radix），**底层不支持空字符串 `''` 作为选项的 `value`**。

**错误示例：**
```typescript
// 试图添加"无"选项让用户清除选择
const options = [
  { label: '无', value: '' },  // ❌ 不生效，选不中
  ...items
]
```

**正确做法：在 USelect 旁边添加清除按钮**
```vue
<div class="flex items-center gap-2">
  <USelect v-model="form.fieldId" :items="options" class="w-full" />
  <UButton
    v-if="form.fieldId"
    color="neutral"
    variant="ghost"
    icon="i-heroicons-x-mark"
    @click="form.fieldId = ''"
  />
</div>
```

**症状**：添加空值选项后，下拉列表中该选项无法被选中，或选中后 v-model 值不变。

#### 5. 必需的配置

在 `nuxt.config.ts` 中：
```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
})
```

在 `app/assets/css/main.css` 中：
```css
@import 'tailwindcss';
@import '@nuxt/ui';
```

在 `app/app.vue` 中用 `<UApp>` 包装：
```vue
<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
```

### 组件使用原则

#### 1. 优先使用 Nuxt UI 组件
在实现任何 UI 功能前，先查阅 Nuxt UI 文档，优先使用官方组件：
- 表单：`UForm`, `UFormField`, `UInput`, `UButton`, `USelect` 等
- 布局：`UContainer`, `UCard`, `UDivider` 等
- 反馈：`UNotification`, `UModal`, `UAlert` 等
- 导航：`UVerticalNavigation`, `UBreadcrumb`, `UTabs` 等

#### 2. 组件命名规范
- Nuxt UI 组件统一使用 `U` 前缀（如 `UButton`）
- 自定义组件使用 Pascal Case（如 `ProviderCard`）
- 避免与 Nuxt UI 组件重名

#### 3. 样式定制
- 使用 Nuxt UI 的 `ui` prop 进行组件样式定制
- 遵循 Tailwind CSS 工具类优先原则
- 避免编写自定义 CSS，除非 Tailwind 无法实现

示例：
```vue
<UButton
  :ui="{
    base: 'custom-class',
    variant: {
      solid: 'bg-primary-500 hover:bg-primary-600'
    }
  }"
>
  按钮
</UButton>
```

#### 4. 主题配置
- 使用 Nuxt UI 的主题系统进行全局样式配置
- 在 `app.config.ts` 中定义主题变量
- 支持明暗主题切换

#### 5. 图标使用
- 使用 Nuxt UI 内置的 `UIcon` 组件
- 图标库：Heroicons（默认）或其他兼容库
- 统一图标风格，避免混用多种图标库

### 布局规范

#### Dashboard 布局结构
参考官方 Dashboard 模板，采用以下布局：
```
┌─────────────────────────────────┐
│         Header (可选)            │
├──────────┬──────────────────────┤
│          │                      │
│ Sidebar  │   Main Content       │
│          │                      │
│          │                      │
└──────────┴──────────────────────┘
```

- **Sidebar**: 使用 `UVerticalNavigation` 实现导航
- **Main Content**: 使用 `UContainer` + `UCard` 组织内容
- **响应式**: 移动端自动折叠 Sidebar

### 表单规范

#### 表单验证
- 使用 `UForm` 组件配合 Zod 进行表单验证
- 统一错误提示样式
- 实时验证 + 提交验证

> [!important]
> 后端 API 路由（`server/api/`）**必须**引入 `zod` 对请求体进行校验，确保数据持久化前的安全性。

### 后端开发经验

#### 1. API 路由结构
- 详情获取：`[id].get.ts`
- 状态切换：`[id]/switch.post.ts`
- 列表获取：`index.get.ts`

#### 2. 工具函数封装
- 核心逻辑（如文件读写、环境切换）应封装在 `server/utils/` 中，保持 API 层的简洁。
- 路径处理：始终使用 `node:path` 和 `node:os` 的 `homedir()` 处理用户目录。
- 文件写入：必须采用原子化写入策略（先写 `.tmp` 文件，再 `rename`），防止因进程意外中断导致配置文件损坏。

#### 3. 依赖项注意
- 确保 `zod` 已正确安装并包含在 `package.json` 中，否则热更新可能导致后端 500 错误。

#### 4. 配置合并与联动规范

架构详情见 [三层配置架构](./docs/features/general-configs.md#三层配置架构)。以下是开发时必须遵守的规则：

- **ENV 保护策略**：`applyGeneralConfigContent` 在写入前备份当前 `env` 字段，合并后强制还原。任何修改合并逻辑的代码都必须保留此机制。
- **合并顺序不可变**：先 `deepMerge(L2, L3)` 写入非 env 配置，再 `writeClaudeEnv(L1)` 写入环境变量。颠倒顺序会导致 env 被覆盖。
- **增量 diff 而非完整 JSON**：前端保存时必须通过 `extractDiff(base, edited)` 计算差异存为 `configOverrides`，禁止直接存储编辑器的完整 JSON。
- **路径禁止硬编码**：数据文件路径常量统一定义在 `server/utils/providers.ts` 和 `server/utils/general-configs.ts` 中，API 路由层必须通过导入工具函数操作。

### 交互规范

#### 加载状态
- 使用 `UButton` 的 `loading` prop 显示加载状态
- 长时间操作使用 `UProgress` 或 `USkeleton`

#### 通知反馈
- 成功操作：使用 `useToast().add()` 显示成功提示
- 错误处理：使用 `useToast().add()` 显示错误信息
- 确认操作：使用 `UModal` 进行二次确认

#### 空状态
- 使用 `UEmptyState` 组件显示空数据状态
- 提供明确的操作引导

### 颜色规范

#### 语义化颜色类（必须使用）

**铁律：禁止使用原始 Tailwind 颜色类（如 `bg-gray-50`、`text-gray-900`），必须使用 Nuxt UI 的语义化类。**

| 用途 | 语义化类 | 替代的原始类 |
|------|---------|-------------|
| 页面背景 | `bg-muted` | `bg-gray-50 dark:bg-gray-900` |
| 卡片/容器背景 | `bg-elevated` | `bg-white dark:bg-gray-950` |
| 边框 | `border-muted` | `border-gray-200 dark:border-gray-800` |
| 主要文本 | `text-default` | `text-gray-900 dark:text-white` |
| 次要文本 | `text-muted` | `text-gray-600 dark:text-gray-400` |
| 辅助文本 | `text-subtle` | `text-gray-500 dark:text-gray-400` |

**优势**：
- 自动适配深色/浅色模式
- 符合设计系统一致性
- 主题切换无需修改代码

#### 组件颜色属性
- **Primary**: 主要操作（切换 Provider、保存配置）
- **Success**: 成功状态（当前激活的 Provider）
- **Warning**: 警告信息（配置不完整）
- **Error**: 错误状态（连接失败）
- **Gray**: 次要信息（禁用状态）

#### 使用方式
```vue
<!-- 组件颜色属性 -->
<UButton color="primary">主要操作</UButton>
<UBadge color="success">已激活</UBadge>
<UAlert color="warning">警告信息</UAlert>

<!-- 语义化颜色类 -->
<div class="bg-muted border border-muted">
  <h1 class="text-default">标题</h1>
  <p class="text-muted">次要文本</p>
  <span class="text-subtle">辅助信息</span>
</div>
```

### 响应式设计

#### 断点使用
遵循 Tailwind CSS 默认断点：
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

#### 移动端优先
- 默认样式适配移动端
- 使用 `md:` 等前缀适配桌面端
- Sidebar 在移动端自动隐藏，通过按钮切换

### 性能优化

#### 组件懒加载
- 使用 `defineAsyncComponent` 懒加载大型组件
- Modal、Drawer 等弹窗组件优先懒加载

#### 图片优化
- 使用 Nuxt 的 `<NuxtImg>` 组件
- 提供合适的尺寸和格式

### 可访问性

#### 基础要求
- 所有交互元素支持键盘操作
- 表单元素提供清晰的 label
- 使用语义化 HTML 标签
- 支持屏幕阅读器

Nuxt UI 组件已内置可访问性支持，正确使用即可满足基本要求。

## 开发流程

### 新增页面
1. 在 `app/pages/` 创建页面文件
2. 使用 Nuxt UI 布局组件搭建结构
3. 参考 Dashboard 模板的页面组织方式

### 新增组件
1. 检查 Nuxt UI 是否已提供类似组件
2. 如需自定义，在 `app/components/` 创建
3. 遵循 Nuxt UI 的设计风格和 API 设计

### 样式调整
1. 优先使用 Tailwind 工具类
2. 使用 Nuxt UI 的 `ui` prop 定制组件样式
3. 避免编写全局 CSS

## 参考资源

- **Nuxt UI 文档**: https://ui.nuxt.com/docs
- **Dashboard 模板**: https://github.com/nuxt-ui-templates/dashboard
- **Tailwind CSS 文档**: https://tailwindcss.com/docs
- **Nuxt 文档**: https://nuxt.com/docs
