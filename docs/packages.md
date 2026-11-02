# 编辑器功能推荐依赖

本文只记录建议安装的库，不修改 `package.json`。

## 1. 推荐技术栈

当前项目已包含 React 19、TypeScript、Vite、Ant Design 6、React Router 7 和 Axios。编辑器优先复用这些能力，不重复引入职责相同的框架。

## 2. 第一阶段必装

| 包名                 | 类型       | 用途                                                                 | 建议                 |
| -------------------- | ---------- | -------------------------------------------------------------------- | -------------------- |
| `@dnd-kit/core`      | 运行时依赖 | 实现组件面板拖入画布、画布内部排序、跨容器拖拽、碰撞检测和拖拽上下文 | 首选                 |
| `@dnd-kit/sortable`  | 运行时依赖 | 实现页面树、列表节点和容器内排序                                     | 首选                 |
| `@dnd-kit/utilities` | 运行时依赖 | 提供拖拽坐标、CSS transform 等工具                                   | 与上述两个包配套使用 |
| `react-selecto`      | 运行时依赖 | 在画布空白区域按住并拖动时框选组件，支持多选、交叉选择和快捷键组合   | 首选框选方案         |
| `zustand`            | 运行时依赖 | 管理编辑器、画布、选中节点、预览模式和保存状态                       | 首选状态库           |
| `immer`              | 运行时依赖 | 简化深层 Schema 的不可变更新，并配合 Zustand 保存历史快照            | 推荐                 |
| `zod`                | 运行时依赖 | 校验组件属性、页面 Schema、数据源配置和发布内容                      | 推荐                 |
| `nanoid`             | 运行时依赖 | 生成组件节点、页面、动作和数据源的短 ID                              | 推荐                 |

建议使用 pnpm 安装：

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-selecto zustand immer zod nanoid
```

安装前应执行兼容性检查，重点确认 React 19 环境以及后续升级时的 peer dependency。

## 3. 框选功能选型

框选能力建议首选 `react-selecto`，原因是它专注于鼠标框选和键盘辅助多选，不需要自行维护复杂的框相交计算。

接入时建议遵循以下规则：

- 框选区域限制在画布工作区内。
- 框选目标使用稳定的节点 DOM `data-node-id`。
- 框选结束后统一提交一次多选状态变更。
- 框选碰到组件拖拽层、属性面板或顶部工具栏时不应触发。
- 按住 `Shift` 或 `Ctrl/Cmd` 时追加或切换选中状态。
- 键盘删除、复制、移动和批量样式修改应作用于全部选中节点。

如果项目希望完全控制框选外观和碰撞逻辑，也可以不安装框选库，仅使用浏览器 Pointer Events、DOMRect 和画布坐标计算实现矩形框选。框选组件数量较少时，这种方案维护成本更低；组件数量较多时，框选库通常更稳定。

### 备选方案

| 包名                   | 适用场景                                   | 结论                         |
| ---------------------- | ------------------------------------------ | ---------------------------- |
| `@viselect/vanilla`    | 框选逻辑需要脱离 React 或嵌入非 React 画布 | React 项目中不作为首选       |
| `react-drag-to-select` | 简单矩形框选                               | 功能与维护状态需在接入前确认 |
| 自定义 Pointer Events  | 节点数量少、交互规则固定                   | 首版可采用，避免额外依赖     |

不建议使用基于 `mousemove` 轮询的旧实现，应使用 Pointer Events 和 `requestAnimationFrame` 处理框选移动。

## 4. 编辑器布局

推荐使用 `react-resizable-panels`，为左侧组件面板、画布和右侧属性面板提供可拖拽调整宽度的区域。

```bash
pnpm add react-resizable-panels
```

该库适合编辑器布局，但不承担画布组件拖拽。组件拖拽仍由 `@dnd-kit` 负责。

如果首版布局固定，也可以暂时不安装该库，先用 CSS Grid 或 Flex 完成布局。交互稳定后再增加面板拖拽调整功能。

## 5. 撤销、重做与快捷键

首版可不引入独立历史库，由 Zustand Store 维护有界快照历史：

- 每次拖拽结束写入一个快照。
- 属性面板连续输入合并为一个快照。
- 删除、多选移动和批量修改单独写入快照。
- 草稿保存不写入历史。
- 历史记录限制在 50 至 100 步。

备选方案：

| 包名                 | 用途                                         | 建议                         |
| -------------------- | -------------------------------------------- | ---------------------------- |
| `zundo`              | 为 Zustand 增加 undo/redo 时间旅行能力       | 组件快照规则复杂时可考虑     |
| `hotkeys-js`         | 注册撤销、重做、复制、粘贴、删除和全选快捷键 | 浏览器快捷键冲突较多时可考虑 |
| `react-hotkeys-hook` | 在 React Hooks 中注册快捷键                  | 首选 React 快捷键封装        |

建议先不增加多个历史和快捷键库，核心交互可以由 Store、`keydown` 监听和统一命令函数实现。

## 6. 属性面板与表单

Ant Design 已提供表单、输入框、选择器和折叠面板。Schema 驱动属性面板应优先复用 Ant Design，不引入第二套完整表单系统。

备选依赖：

| 包名                   | 用途                              | 建议阶段                 |
| ---------------------- | --------------------------------- | ------------------------ |
| `@jsonforms/react`     | 基于 JSON Schema 自动生成复杂表单 | 第二阶段评估             |
| `react-hook-form`      | 管理复杂表单状态和校验            | 表单规则明显复杂时再评估 |
| `@monaco-editor/react` | 编辑表达式、请求参数或高级 JSON   | 高级配置阶段             |

首版不建议同时引入 Ant Design Form、JSONForms 和 React Hook Form，以免出现三套校验与数据模型。

## 7. 页面与组件树

页面树、组件大纲和菜单树可以先使用 Ant Design `Tree` 组件，不需要额外引入树形库。

拖拽排序页面树时，可以复用同一套 `@dnd-kit/sortable`，不要额外引入可视化拖拽树库。

## 8. 有限格子画布与组件调整

有限格子画布不需要引入画布框架、无限画布或自由定位库。推荐使用固定列数和固定行高的 CSS Grid，由项目 Schema 保存组件的 `gridColumn`、`gridRow`、列宽和行高。

例如，一块 12 列画布可以保存为：

```typescript
interface GridPosition {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}
```

组件拖入时，根据鼠标位置计算目标格子；组件跨多个格子时，根据占用矩形计算可放置区域。移动、扩展和压缩都只更新 Schema，不需要把组件渲染成绝对定位元素。

### 推荐方案

- 布局计算：原生 CSS Grid。
- 组件拖入、跨容器移动与碰撞检测：`@dnd-kit/core`。
- 相邻组件排序：`@dnd-kit/sortable`。
- 画布框选：`react-selecto` 或原生 Pointer Events。
- 网格辅助线和占位框：项目自实现。
- 组件选中框、8 点缩放：项目自实现。

首版缩放画布时，只调整画布容器的 CSS scale 或列宽预览比例，不需要引入缩放平移库。

### 是否需要网格布局库

一般不需要。`react-grid-layout` 虽然提供拖拽、排序、缩放和栅格布局，但它更适合仪表盘式自由布局，容易引入绝对定位样式、额外布局状态和与后台页面 Schema 重叠的模型。

只有在满足以下条件时才建议评估该库：

- 画布允许组件自由改变行列尺寸。
- 碰撞、压缩、移动布局完全由库接管。
- 不要求组件位置由稳定的页面 Schema 精确控制。
- 可以接受布局 state 与 Schema 模型之间的转换成本。

`react-rnd`、`re-resizable` 和 `react-zoom-pan-pinch` 都不是有限格子画布的首选：

| 包名                   | 用途                | 结论                                 |
| ---------------------- | ------------------- | ------------------------------------ |
| `react-rnd`            | 自由定位和 8 向缩放 | 适合绝对定位画布，不适合固定网格首版 |
| `re-resizable`         | 组件尺寸调整        | 需要自定义网格吸附时再评估           |
| `react-zoom-pan-pinch` | 无限画布缩放和平移  | 当前有限画布不需要                   |
| `react-grid-layout`    | 仪表盘网格拖拽      | 仅在需要自由仪表盘布局时评估         |

组件调整尺寸时，建议由项目封装一个统一网格缩放逻辑：吸附到列宽，禁止跨越最大列数和保留区，并在拖动过程中只展示占位框，拖动结束后一次性提交 Schema 变更。

## 9. 图表与 CRUD

按需加入，避免首版带来不必要的体积：

| 包名                         | 用途                                            | 建议阶段                              |
| ---------------------------- | ----------------------------------------------- | ------------------------------------- |
| `echarts`                    | 基础柱状图、折线图、饼图                        | 图表组件阶段                          |
| `echarts-for-react`          | React 包装 ECharts                              | 图表组件阶段                          |
| `@ant-design/pro-components` | ProTable、ProForm、ProDescriptions 等 CRUD 封装 | 用户明确需要时再评估                  |
| `@tanstack/react-table`      | 高度定制化表格                                  | Ant Design Table 无法满足需求时再评估 |
| `@tanstack/react-virtual`    | 超长列表和表格虚拟化                            | 数据量较大时再评估                    |

## 10. 测试与开发工具

当前工程已有 ESLint、TypeScript、Vite 和 Prettier。新增功能时建议补充：

| 包名                          | 用途                                 | 建议 |
| ----------------------------- | ------------------------------------ | ---- |
| `vitest`                      | 单元测试与 Schema 校验测试           | 推荐 |
| `@testing-library/react`      | 组件交互和画布测试                   | 推荐 |
| `@testing-library/user-event` | 模拟拖拽前后的用户操作               | 推荐 |
| `jsdom`                       | 测试 DOM、Pointer Events 和框选      | 推荐 |
| `@playwright/test`            | E2E 测试，覆盖拖入、框选、撤销和发布 | 推荐 |

框选与拖拽逻辑建议尽量在运行时 DOMRect 和纯函数层覆盖，避免 E2E 测试成为唯一验证方式。

示例开发依赖：

```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom @playwright/test
```

## 11. 分阶段安装清单

### 第一阶段：基础拖拽与框选

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-selecto zustand immer zod nanoid
pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom
```

### 第二阶段：编辑器布局与预览

```bash
pnpm add react-resizable-panels
pnpm add -D @playwright/test
```

### 第三阶段：按需功能

```bash
pnpm add echarts echarts-for-react
```

其他高级组件应在具体需求出现后再安装，不应预装完整低代码平台依赖集。

## 12. 不建议首版引入的库

- `react-grid-layout`：适合自由仪表盘，不适合后台页面树结构。
- `react-beautiful-dnd`：维护状态变化较多，不适合作为新项目首选。
- `reactflow`：适合流程图、节点图，不适合普通后台页面组件树。
- `react-rnd`：容易让页面退化为绝对定位画布，首版不引入。
- `react-grid-layout`：有限格子首版应优先由 CSS Grid 和 Schema 自己控制，避免引入独立布局状态。
- `react-zoom-pan-pinch`：当前不是无限画布，不需要缩放和平移画布。
- Redux Toolkit：当前编辑器规模不需要额外引入 Redux 的样板代码。
- MobX：对现有 React 19 状态模型不具备明显必要性。
- 任意可执行代码编辑器：表达式应限制为受控语法，不引入随意 `eval` 能力。

## 13. 推荐结论

首版只引入以下核心依赖：

1. `@dnd-kit/core`
2. `@dnd-kit/sortable`
3. `@dnd-kit/utilities`
4. `react-selecto`
5. `zustand`
6. `immer`
7. `zod`
8. `nanoid`

其中拖拽、框选和状态管理构成编辑器核心闭环；有限格子布局由 CSS Grid 实现，不需要额外画布库。其他布局面板、快捷键、图表、虚拟化和高级表单能力都可以按阶段加入。
