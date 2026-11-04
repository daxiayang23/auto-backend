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

/* -------------------- 接口定义 -------------------- */

export const API_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export type ApiMethod = (typeof API_METHODS)[number];

/**
 * 接口是模型的数据来源：模型必须绑定一个接口（必填），
 * 预览态走 mock，接真实后端时按这里的 method + path 发请求。
 */
export interface ApiSchema {
  key: string;
  /** 中文显示名，例如「用户列表」 */
  name: string;
  method: ApiMethod;
  /** 请求路径，以 / 开头 */
  path: string;
  description?: string;
}

export interface ModelSchema {
  key: string;
  /** 中文显示名，例如「用户」 */
  name: string;
  description?: string;
  /** 绑定的接口 key，必填：模型的数据增删改查都发往该接口 */
  apiKey: string;
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

/* -------------------- 数据库表编排 -------------------- */

export const SQL_DIALECTS = ['mysql', 'postgresql', 'sqlite'] as const;

export type SqlDialect = (typeof SQL_DIALECTS)[number];

/**
 * 逻辑列类型。Schema 里不存方言专有类型，
 * 渲染 SQL 时由 generateSql 查映射表翻译，切换数据库零成本。
 */
export const DB_COLUMN_TYPES = [
  'int',
  'bigint',
  'decimal',
  'varchar',
  'text',
  'boolean',
  'date',
  'datetime',
  'json',
  'uuid',
] as const;

export type DbColumnType = (typeof DB_COLUMN_TYPES)[number];

export const RELATION_KINDS = ['oneToOne', 'oneToMany', 'manyToMany'] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export interface DbColumn {
  /** 物理列名，snake_case 标识符 */
  key: string;
  /** 列备注，输出为 SQL COMMENT */
  label?: string;
  dbType: DbColumnType;
  /** varchar 长度 / decimal 总位数 */
  length?: number;
  /** decimal 小数位 */
  scale?: number;
  nullable?: boolean;
  /** 字符串默认值原样存储，生成时再决定是否加引号 */
  defaultValue?: string;
  /** 是否为主键的一部分（支持联合主键） */
  primary?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  indexed?: boolean;
}

export interface DbTable {
  /** 内部 id，关系用 key 引用，改物理表名不影响连线 */
  key: string;
  /** 物理表名 */
  name: string;
  comment?: string;
  /** ER 画布上的坐标，属于展示配置但随 Schema 持久化，方便恢复布局 */
  x: number;
  y: number;
  columns: DbColumn[];
}

export interface DbRelation {
  id: string;
  kind: RelationKind;
  /** 持外键的一侧（M:N 时为参与方 A） */
  fromTable: string;
  fromColumn: string;
  /** 被引用的一侧（M:N 时为参与方 B） */
  toTable: string;
  toColumn: string;
}

export interface DatabaseSchema {
  tables: DbTable[];
  relations: DbRelation[];
}

export interface ProjectSchema {
  schemaVersion: '1.0';
  id: string;
  name: string;
  menus: MenuSchema[];
  /** 全部接口定义：模型创建必须先有接口并完成绑定 */
  apis: ApiSchema[];
  models: ModelSchema[];
  /** 可选的页面覆盖配置；缺省即使用自动生成结果 */
  pages?: PageSchema[];
  /** 数据库表编排；旧版本 Schema 可能没有，运行时按空库兜底 */
  database?: DatabaseSchema;
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
