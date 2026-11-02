# 后台管理系统拖拽编辑器实现方案

## 1. 项目目标

构建一个面向后台管理系统的可视化低代码编辑器，允许用户通过拖拽 Ant Design 组件搭建页面，并通过属性配置、数据绑定、条件展示、事件处理和权限控制完成后台系统搭建。

编辑器采用“所见即所得”模式，并保持编辑态与运行态使用同一套页面描述和组件渲染能力。最终目标不是生成不可维护的源码，而是产出一份结构化的页面 Schema，由平台统一保存、校验、渲染、发布和回放。

### 核心能力

- 可视化搭建页面，并支持容器嵌套与组件排序。
- 页面、菜单、角色、权限和数据接口统一管理。
- 组件属性、样式、响应式布局、数据源和事件可视化配置。
- 运行时预览、历史版本、草稿保存、发布与回滚。
- 从 Schema 实时渲染后台页面，不依赖手写业务页面。
- 支持导入导出 JSON，以及二次开发自定义组件。

### 范围边界

首期只支持 PC 后台页面，并覆盖以下典型场景：

- 工作台、统计卡片、图表占位区、列表、表单和详情页。
- 登录态菜单、面包屑、侧边栏及顶部操作栏。
- CRUD 列表页面，包括查询、分页、新增、编辑和删除。
- 表格、搜索表单、弹窗、抽屉、Tab、步骤条和常见容器组件。

不建议首期直接实现自由画布、任意 CSS 编程、复杂动画、移动端原生低代码及任意第三方组件的安全沙箱。

## 2. 现有技术基础

项目已具备以下基础：

- React 19、TypeScript、Vite。
- Ant Design 6 与 Ant Design Icons。
- React Router 7。
- Axios 请求封装。
- 已有后台布局骨架 [LayoutView](/Users/ygh/Documents/autobackend/AutoBackend/src/views/LayoutView.tsx) 和启动页 [LaunchView](/Users/ygh/Documents/autobackend/AutoBackend/src/views/LaunchView.tsx)。

建议继续复用现有工程，新增拖拽能力时优先选择成熟的 React 生态库，例如 `@dnd-kit/core` 和 `@dnd-kit/sortable`。编辑器不直接改写 `LayoutView.tsx`，而是将通用后台壳拆成宿主组件，由 Schema 渲染其中的页面内容。

## 3. 整体架构

```text
编辑器前端
  ├─ 页面树与组件面板
  ├─ 画布与组件选中态
  ├─ 属性、样式、数据、事件面板
  ├─ Schema Store
  ├─ 组件注册中心
  ├─ 表达式与数据绑定解析器
  └─ 预览/发布服务

页面 Schema
  ├─ 应用与页面元数据
  ├─ 后台布局配置
  ├─ 页面组件树
  ├─ 数据源与变量
  ├─ 权限与菜单配置
  └─ 事件与动作流

运行时
  ├─ Schema 校验与兼容处理
  ├─ 布局宿主与页面渲染器
  ├─ 表达式求值
  ├─ 数据请求与动作执行
  └─ 权限过滤与组件映射
```

核心原则：

1. Schema 是唯一事实来源。
2. 编辑器和运行时共用组件注册中心。
3. 画布只负责编辑操作，运行时只负责渲染与执行。
4. 组件实现受控，不允许组件直接读取任意全局状态。
5. 所有 Schema 必须经过版本化校验，避免发布脏数据。

## 4. 页面 Schema 设计

建议将 Schema 分为应用、页面、组件节点、变量、数据源和动作。组件节点以树结构表达；容器节点通过 `children` 挂载子节点。

```typescript
interface ProjectSchema {
  schemaVersion: '1.0';
  id: string;
  name: string;
  theme: ThemeSchema;
  layout: LayoutSchema;
  menus: MenuSchema[];
  pages: PageSchema[];
}

interface PageSchema {
  id: string;
  path: string;
  name: string;
  permission?: string;
  variables: VariableSchema[];
  dataSources: DataSourceSchema[];
  tree: ComponentNodeSchema;
}

interface ComponentNodeSchema {
  id: string;
  componentType: string;
  props: Record<string, unknown>;
  slots?: Record<string, ComponentNodeSchema[]>;
  children?: ComponentNodeSchema[];
  styles?: ResponsiveStyles;
  visible?: Expression;
  disabled?: Expression;
  permissions?: string[];
  dataBindings?: Record<string, Binding>;
  events?: Record<string, Action[]>;
}
```

### 5.1 数据绑定

统一使用路径表达式，不在组件中拼接业务请求逻辑：

```json
{
  "source": "dataSource.userList",
  "path": "data.records"
}
```

变量优先级建议为：

```text
组件局部变量 > 页面变量 > 应用变量 > 系统变量
```

常用系统变量包括 `user`, `token`, `route.params`, `device`, `today` 和 `now`。

表达式应采用受控字符串，例如 `${state.keyword}`，并通过白名单解析器计算。首期禁止执行任意 JavaScript 字符串。

### 5.2 动作模型

动作链按顺序执行，支持条件分支、异步等待和异常处理：

```json
{
  "id": "action-1",
  "type": "request",
  "config": {
    "dataSourceId": "deleteUser",
    "confirm": true,
    "confirmText": "确认删除该用户吗？"
  },
  "onSuccess": [
    { "type": "refresh", "config": { "dataSourceId": "userList" } },
    { "type": "message", "config": { "content": "删除成功" } }
  ]
}
```

首期动作类型建议为：

- `request`：调用数据源。
- `refresh`：刷新数据源或页面变量。
- `setVariable`：更新变量。
- `navigate`：路由跳转。
- `openModal` / `closeModal`：控制弹窗。
- `message` / `notification`：用户反馈。
- `validateForm`：校验表单。
- `submitForm`：提交表单。
- `copy`：复制文本。

## 5. 编辑器界面

推荐采用“四栏工作台”：

```text
┌─────────────── 顶部工具栏 ──────────────────────────────┐
│ Logo | 项目 | 页面 | 撤销 | 重做 | 保存 | 预览 | 发布     │
├──────────┬───────────────────────┬───────────────────────┤
│ 组件与   │                       │ 属性配置面板           │
│ 页面树   │        画布           │ 数据绑定               │
│          │                       │ 事件配置               │
│          ├───────────────────────┤ 样式与响应式           │
│          │ 源码/Schema/问题检查  │ 权限与可见性           │
└──────────┴───────────────────────┴───────────────────────┘
```

### 组件面板

组件按分类展示：

- 布局：栅格、行、列、分割区、卡片、Space、Flex。
- 基础：按钮、文字、图标、标签、统计、图片。
- 数据展示：表格、描述列表、列表、时间轴、Tag、Badge。
- 数据录入：输入框、选择器、日期、开关、单选、多选、上传、表单。
- 导航反馈：菜单、面包屑、Tabs、Steps、Modal、Drawer、Alert。
- 图表：折线图、柱状图、饼图、指标卡。

组件注册元数据至少包括：

```typescript
interface ComponentDefinition {
  type: string;
  title: string;
  category: ComponentCategory;
  icon: ReactNode;
  defaultProps: Record<string, unknown>;
  defaultStyles?: ResponsiveStyles;
  schema: FormSchema;
  acceptChildren?: boolean;
  draggable?: boolean;
  maxChildren?: number;
  component: React.ComponentType<any>;
  validate?: (node: ComponentNodeSchema) => ValidationIssue[];
}
```

属性面板不手写每个组件的配置表单，而是由组件注册中的 JSON Schema /表单元数据自动生成。

### 画布

画布需要支持：

- 从组件面板拖入画布。
- 在容器内部拖入、排序和跨容器移动。
- 点击选中组件，显示 8 点/边框操作区与悬浮工具条。
- 复制、粘贴、删除、置顶、置底、包裹容器。
- 撤销、重做和快捷键操作。
- 桌面、平板、移动视图切换。
- 组件禁用态、权限隐藏态和表达式隐藏态预览。
- 大纲树与画布双向定位。

画布中的节点应使用统一的可编辑包装器，避免为每个 Ant Design 组件定制选中逻辑：

```text
CanvasNode
  ├─ drag handle
  ├─ drop zones
  ├─ selection overlay
  ├─ quick actions
  └─ Renderer component
```

## 6. 状态与数据流

建议引入轻量状态管理，例如 Zustand，避免编辑器状态散落在组件中。

```typescript
interface EditorStore {
  project: ProjectSchema;
  currentPageId: string;
  selectedNodeId?: string;
  hoveredNodeId?: string;
  history: HistoryEntry[];
  historyIndex: number;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  saveStatus: 'saved' | 'saving' | 'dirty';

  selectNode(nodeId: string): void;
  updateNode(nodeId: string, patch: NodePatch): void;
  moveNode(sourceId: string, target: DropTarget): void;
  undo(): void;
  redo(): void;
  saveDraft(): Promise<void>;
}
```

撤销和重做以不可变的历史快照实现：

```text
一次拖拽 = 一次历史记录
属性输入期间 = 合并为一次历史记录
保存草稿 = 不产生历史记录
撤销 = 恢复上一个不可变快照
```

属性面板输入每 300 至 500ms 合并一次更新，以避免每个按键都写入历史。拖拽结束才提交最终结构变更。

## 7. CRUD 页面生成方案

优先实现“模型 + 页面模板 + Schema”组合，而不是让每个 CRUD 页面由复杂自由拖拽从零搭建。

用户选择数据模型后，可自动生成：

- 搜索表单。
- 数据表格。
- 分页条。
- 新增弹窗。
- 编辑弹窗。
- 详情抽屉。
- 删除确认动作。
- 列表、详情、新增、编辑接口绑定。

自动生成过程可分为：

```text
模型字段元数据
    -> 字段类型映射
    -> CRUD 模板节点
    -> 用户调整
    -> 页面 Schema
    -> 权限/接口绑定
    -> 发布运行
```

字段类型映射示例：

| 模型字段 | 列表展示     | 查询组件        | 新增/编辑组件  |
| -------- | ------------ | --------------- | -------------- |
| string   | Text         | Input           | Input          |
| enum     | Tag          | Select          | Select         |
| boolean  | Switch/Tag   | Select          | Switch         |
| date     | Date         | DateRangePicker | DatePicker     |
| datetime | DateTime     | DateRangePicker | DateTimePicker |
| number   | Statistic    | InputNumber     | InputNumber    |
| relation | RelationText | Select          | Select         |

## 8. 数据源与接口接入

每个数据源只保存抽象配置，不在组件中直接写请求地址：

```typescript
interface DataSourceSchema {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, ExpressionValue>;
  params?: Record<string, ExpressionValue>;
  body?: Record<string, ExpressionValue>;
  responseMapping?: Record<string, string>;
  pagination?: PaginationSchema;
  cache?: CacheSchema;
}
```

运行时统一通过 Axios 请求封装执行：

1. 解析表达式和变量。
2. 注入认证信息。
3. 校验权限。
4. 发送请求。
5. 处理 HTTP 错误与业务错误码。
6. 根据 `responseMapping` 归一化返回值。
7. 更新页面变量或触发动作链。

表格的分页、排序和筛选参数应生成固定请求上下文，避免组件自行拼接业务参数。

## 9. 权限与菜单

菜单、页面和组件可以分别配置权限。运行时按以下顺序过滤：

```text
用户登录 -> 获取权限 -> 过滤菜单 -> 校验路由 -> 渲染页面 -> 过滤组件
```

建议使用资源码和动作码：

- `user:view`
- `user:create`
- `user:update`
- `user:delete`

菜单、页面和组件节点都支持一个或多个资源码，组件权限规则支持“有任意权限”或“同时具有全部权限”。无权限访问页面时显示统一 403 页面，组件不渲染。

敏感动作即使隐藏按钮，也必须由后端再次校验权限。

## 10. 文件与目录规划

在现有结构中建议新增：

```text
src/
  editor/
    components/
      EditorLayout.tsx
      ComponentPalette.tsx
      Canvas.tsx
      CanvasNode.tsx
      PropertyPanel.tsx
      EventPanel.tsx
      PageTree.tsx
      Toolbar.tsx
    store/
      editorStore.ts
      history.ts
    schema/
      types.ts
      validator.ts
      defaults.ts
    registry/
      registry.ts
      ant-design/
      containers/
      charts/
    renderer/
      PageRenderer.tsx
      NodeRenderer.tsx
      slotRenderer.tsx
    runtime/
      expression.ts
      actionRunner.ts
      dataSource.ts
      permissions.ts
    services/
      projectApi.ts
      schemaStorage.ts
  runtime/
    LayoutHost.tsx
    ErrorBoundary.tsx
    NotFound.tsx
  views/
    LayoutView.tsx
    LaunchView.tsx
    EditorView.tsx
    PreviewView.tsx
```

路由建议为：

```text
/                 启动页
/layout           运行态后台壳
/editor/:projectId 编辑器
/preview/:projectId/:pageId 预览
```

## 11. 核心交互流程

### 添加组件

1. 用户从组件面板拖拽组件。
2. Dnd 命中画布或容器的有效放置区。
3. 计算目标父节点和插入索引。
4. 根据组件定义生成默认节点。
5. 提交不可变结构变更并选中新节点。
6. 属性面板读取组件定义并展示配置项。

### 修改属性

1. 画布选中节点。
2. 属性面板生成配置表单。
3. 表单更新调用 `updateNode`。
4. Store 校验节点和属性类型。
5. 画布局部重新渲染。
6. 脏状态变更触发自动保存倒计时。

### 发布页面

1. 校验所有页面 Schema。
2. 校验组件类型、必填属性、数据源和权限。
3. 创建版本快照。
4. 将草稿标记为发布版本。
5. 运行时读取发布版本，不读取草稿。
6. 发布失败时保留草稿并显示具体节点错误。

## 12. 技术选型

### 必须新增

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `zustand`
- `nanoid`
- `zod`
- `immer`

`zod` 用于 Schema 校验，`immer` 用于简化不可变状态更新。拖拽不由 Zustand 直接驱动，画布结束拖拽后一次性提交结构变更，以降低渲染和历史快照开销。

### 可选新增

- `@ant-design/pro-components`：快速实现 ProTable、ProForm 等业务组件。
- `echarts` + `echarts-for-react`：图表组件。
- `react-json-view`：Schema 调试。
- Monaco Editor：表达式和高级配置编辑。

正式开发前应先验证 `@dnd-kit` 与 Ant Design 复杂组件的嵌套拖拽兼容性，并用一个列表页面作为性能和交互基准。

## 13. 自动保存与版本管理

保存策略如下：

- 草稿修改后延迟 800ms 自动保存。
- 手动保存立即写入。
- 离开页面前提示未保存修改。
- 发布时强制校验并创建不可变版本。
- 版本保留最近 20 个以及每次手动发布的版本。
- 支持版本比较、恢复草稿和回滚发布。

草稿、发布版本与运行时版本应明确分离：

```text
draft         用户持续编辑的数据
version       用户可恢复的发布时间快照
published     当前运行环境实际加载的数据
```

## 14. 渲染性能与可靠性

- 页面节点超过一定数量时，对画布节点启用局部 memo。
- 属性面板订阅当前节点，避免整个项目 Schema 变更导致面板重渲染。
- 编辑态组件可通过 `memo` 及稳定 key 降低重渲染。
- 表格列、表单项和事件配置不在每次渲染时重新创建 JSON Schema。
- Schema 大小过阈值时启用分页面请求和 IndexedDB 草稿缓存。
- 渲染器外层设置 ErrorBoundary，组件异常不影响整个编辑器。
- 所有远程图片、视频和脚本必须经过白名单或受控组件限制。
- 渲染属性中的 URL、事件表达式和 HTML 片段需要校验或转义。

## 15. 分阶段实施计划

### 第一阶段：Schema 与基础画布（2 周）

- 定义项目、页面、组件节点的 Zod Schema 与 TypeScript 类型。
- 实现组件注册中心。
- 实现组件面板、画布、节点选择与属性面板。
- 支持拖拽添加、排序、删除、复制、撤销、重做。
- 完成 Button、Card、Row、Col、Text、Input、Table 等基础组件。

验收标准：

- 可以拖入和嵌套基础组件。
- 刷新后草稿保持结构与属性。
- 可以撤销和重做组件结构变更。
- Schema 能通过校验并在运行时复现。

### 第二阶段：数据与 CRUD（2 周）

- 实现数据源、变量、表达式绑定。
- 实现表格分页、搜索表单、弹窗 CRUD。
- 实现动作链和普通表单提交。
- 实现 CRUD 页面模板。
- 接入现有 Axios 封装。

验收标准：

- 新增一个模型后可以生成可运行的列表页。
- 列表支持搜索、分页、新增、编辑、删除。
- 请求失败时有明确提示且不会破坏页面结构。

### 第三阶段：后台壳与权限（1.5 周）

- 将 `LayoutView` 改造为运行态布局宿主。
- 动态生成菜单与路由。
- 接入页面和组件权限。
- 完成预览模式、移动视图和页面 403。
- 预览与编辑态隔离草稿/发布版本。

验收标准：

- 菜单和路由由 Schema 驱动。
- 不同角色看到不同菜单和组件。
- 未授权路由不会渲染页面内容。

### 第四阶段：发布与工程化（1 周）

- 实现草稿自动保存。
- 实现版本、发布、回滚。
- 实现 Schema 导入、导出与格式迁移。
- 完成组件异常边界和发布校验。
- 完成基础单元测试、组件测试和端到端测试。

验收标准：

- 发布后可独立加载运行态 Schema。
- 错误 Schema 不会发布。
- 发布版本可回滚到上一版本。

## 16. 推荐的里程碑与验收示例

首个可演示版本应能完成以下完整链路：

1. 进入编辑器并创建“用户管理”页面。
2. 从面板拖入查询表单、用户表格和操作按钮。
3. 配置用户列表数据源和分页参数。
4. 配置新增、编辑、删除动作。
5. 配置 `user:create`、`user:update`、`user:delete` 权限。
6. 保存草稿并切换预览。
7. 发布到运行态后台。
8. 切换角色后验证菜单、按钮和路由权限。

完成后再扩展图表、报表、工作流审批和跨页面数据联动等能力。

## 17. 风险与规避措施

| 风险                        | 影响                     | 规避措施                                 |
| --------------------------- | ------------------------ | ---------------------------------------- |
| 嵌套拖拽实现复杂            | 编辑器交互不稳定         | 先封装容器规则与命中算法，再扩展组件     |
| Schema 演进导致旧页面不可用 | 已发布页面失效           | 强制版本号、迁移函数和发布前兼容校验     |
| 编辑态组件过于开放          | XSS、任意请求、无限递归  | 执行受控表达式、白名单组件和表达式转义   |
| 任意属性配置过于灵活        | 页面难以维护             | 属性面板由组件定义生成，并限制非法值     |
| 组件数量增长导致注册混乱    | 运行时体积和维护成本增长 | 按需加载组件，统一注册元数据和自动化测试 |
| 自动保存覆盖冲突            | 多人编辑丢失修改         | 草稿增加 revision、乐观锁和冲突合并提示  |

## 18. 最终推荐方案

建议采用“React + Ant Design + Schema 驱动 + CRUD 模板”的渐进式低代码方案，而不是直接生成组件源码或让画布执行任意代码。

最小闭环从基础组件、页面树、属性面板和运行时渲染开始，随后加入数据源、事件、权限和 CRUD 模板。这样可以保证首期交付速度，同时为后续自定义组件、复杂工作流和多租户扩展保留清晰边界。
