# CC-Switch-Web 开发规范

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

#### 3. 必需的配置

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

示例：
```vue
<UForm :schema="schema" :state="state" @submit="onSubmit">
  <UFormGroup label="Provider 名称" name="name">
    <UInput v-model="state.name" />
  </UFormGroup>
  <UButton type="submit">提交</UButton>
</UForm>
```

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

#### 语义化颜色
- **Primary**: 主要操作（切换 Provider、保存配置）
- **Success**: 成功状态（当前激活的 Provider）
- **Warning**: 警告信息（配置不完整）
- **Error**: 错误状态（连接失败）
- **Gray**: 次要信息（禁用状态）

#### 使用方式
```vue
<UButton color="primary">主要操作</UButton>
<UBadge color="success">已激活</UBadge>
<UAlert color="warning">警告信息</UAlert>
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
