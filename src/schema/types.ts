/**
 * 平台唯一事实来源：所有可持久化的结构都在这一层定义。
 * 约束：这里的类型必须可 JSON 序列化，禁止出现 ReactNode / 函数 / 类实例。
 */

export const FIELD_TYPES = [
  'string',
  'text',
  'number',
  'boolean',
  'enum',
  'date',
  'datetime',
  'relation',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface EnumOption {
  value: string;
  label: string;
  /** antd Tag 的颜色语义，仅影响展示 */
  color?: string;
}

export interface RelationConfig {
  /** 关联的模型 key */
  modelKey: string;
  /** 关联表用哪个字段做展示 */
  labelKey: string;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** type 为 enum 时必填 */
  options?: EnumOption[];
  /** type 为 relation 时必填 */
  relation?: RelationConfig;
  /** 列表列宽，缺省由表格自适应 */
  width?: number;
  /** 覆盖默认行为：该字段是否出现在表格 / 筛选项 / 表单 */
  showInTable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  placeholder?: string;
}

export interface ModelSchema {
  key: string;
  /** 中文显示名，例如「用户」 */
  name: string;
  description?: string;
  primaryKey: string;
  fields: FieldSchema[];
}

export const MENU_ICONS = [
  'dashboard',
  'users',
  'table',
  'chart',
  'setting',
  'file',
] as const;

export type MenuIconKey = (typeof MENU_ICONS)[number];

/**
 * 菜单只存纯数据。icon 存字符串 key，渲染时再查图标表，
 * 这样菜单可以 stringify、可以 diff、可以进版本库。
 */
export interface MenuSchema {
  key: string;
  label: string;
  icon?: MenuIconKey;
  /** 绑定模型后，该菜单由 CRUD 生成器产出页面 */
  modelKey?: string;
  children?: MenuSchema[];
}

/* -------------------- 页面组件编排 -------------------- */

/**
 * 内置组件的类型白名单。注册表必须完整覆盖这些 key（编译期用 Record 约束），
 * 校验层只认这份列表，避免脏 type 混进 Schema。
 */
export const BLOCK_TYPES = [
  // 导航
  'breadcrumb',
  'pageHeader',
  'tabs',
  'stepsBar',
  // 布局
  'divider',
  'card',
  'grid',
  'spacer',
  // 数据展示
  'statCards',
  'dataTable',
  'descriptions',
  'listBlock',
  'timeline',
  'tagGroup',
  'progressList',
  'emptyState',
  // 数据录入 / 操作
  'searchBox',
  'filterForm',
  'buttonGroup',
  'dateRangeFilter',
  // 反馈
  'alertNotice',
  // 图表
  'chart',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/** props 只允许 JSON 值，禁止函数 / ReactNode，保证整页可持久化 */
export type BlockProps = Record<string, unknown>;

export interface PageBlock {
  id: string;
  type: BlockType;
  props: BlockProps;
  /** 隐藏但保留配置，方便临时对比效果 */
  visible?: boolean;
}

/**
 * 页面以菜单为单位编排组件。
 * 未写入 pages 的菜单由 generateDefaultPage 从模型实时派生（生成优先），
 * 用户第一次增删组件时才固化成这里的配置（编辑兜底）。
 */
export interface PageSchema {
  menuKey: string;
  blocks: PageBlock[];
}

export interface ProjectSchema {
  schemaVersion: '1.0';
  id: string;
  name: string;
  menus: MenuSchema[];
  models: ModelSchema[];
  /** 可选的页面覆盖配置；缺省即使用自动生成结果 */
  pages?: PageSchema[];
}

/* -------------------- 生成产物 -------------------- */

export const COLUMN_RENDERERS = [
  'text',
  'longText',
  'tag',
  'date',
  'datetime',
  'number',
  'boolean',
  'relation',
] as const;

export type ColumnRenderer = (typeof COLUMN_RENDERERS)[number];

export const FILTER_CONTROLS = [
  'input',
  'select',
  'switch',
  'numberRange',
  'dateRange',
] as const;

export type FilterControl = (typeof FILTER_CONTROLS)[number];

export const FORM_CONTROLS = [
  'input',
  'textarea',
  'inputNumber',
  'select',
  'switch',
  'date',
  'datetime',
] as const;

export type FormControl = (typeof FORM_CONTROLS)[number];

export interface ColumnSchema {
  key: string;
  title: string;
  renderer: ColumnRenderer;
  width?: number;
  options?: EnumOption[];
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface FilterSchema {
  key: string;
  label: string;
  control: FilterControl;
  options?: EnumOption[];
}

export interface FormFieldSchema {
  key: string;
  label: string;
  control: FormControl;
  required?: boolean;
  options?: EnumOption[];
  placeholder?: string;
}

/** 由 ModelSchema 派生出来的页面描述，不参与持久化 */
export interface CrudPageSchema {
  modelKey: string;
  title: string;
  primaryKey: string;
  columns: ColumnSchema[];
  filters: FilterSchema[];
  formFields: FormFieldSchema[];
  pageSize: number;
}
