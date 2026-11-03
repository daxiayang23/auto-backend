import { nanoid } from 'nanoid';
import { AGG_SOURCE_OPTIONS, METRIC_OPTIONS } from './aggregate';
import { BLOCK_ICON_OPTIONS } from './blockIcons';
import type { BlockIconKey } from './blockIcons';
import type { BlockProps, BlockType, PageBlock } from '../schema/types';

/* -------------------- 属性表单元数据 -------------------- */

export type PropControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'switch'
  | 'select'
  | 'color'
  | 'icon'
  | 'model'
  | 'field'
  | 'items'
  | 'lines';

export interface PropOption {
  value: string;
  label: string;
}

/** items 类型属性里，每一行的字段定义 */
export interface ItemFieldDef {
  key: string;
  label: string;
  control: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'field';
  options?: PropOption[];
  /** 选项来自运行时数据（模型列表 / 当前页面模型的字段） */
  dynamic?: 'models' | 'fields';
  defaultValue?: string | number;
}

export interface PropDef {
  key: string;
  label: string;
  control: PropControl;
  options?: PropOption[];
  itemFields?: ItemFieldDef[];
  /** 选项需要运行时数据（模型列表 / 当前模型字段） */
  dynamic?: 'models' | 'fields';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  /** 简单条件显示，例如只在某个开关打开时才出现 */
  showWhen?: { key: string; equals: unknown };
}

export const BLOCK_CATEGORIES = [
  '导航',
  '布局',
  '数据展示',
  '数据录入',
  '反馈',
  '图表',
] as const;

export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

export interface ComponentDef {
  type: BlockType;
  label: string;
  category: BlockCategory;
  icon: BlockIconKey;
  description: string;
  defaults: BlockProps;
  props: PropDef[];
  /** 一个页面只允许放一个，重复添加会被拒绝 */
  singleton?: boolean;
  /** 需要页面绑定模型才有真实数据 */
  needsModel?: boolean;
}

/* -------------------- 复用片段 -------------------- */

const COLOR_OPTIONS: PropOption[] = [
  'blue',
  'green',
  'red',
  'gold',
  'purple',
  'cyan',
  'magenta',
  'orange',
  'default',
].map((color) => ({ value: color, label: color }));

const ALIGN_OPTIONS: PropOption[] = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
];

const BUTTON_TYPE_OPTIONS: PropOption[] = [
  { value: 'primary', label: '主按钮' },
  { value: 'default', label: '默认' },
  { value: 'dashed', label: '虚线' },
  { value: 'link', label: '链接' },
];

const ACTION_OPTIONS: PropOption[] = [
  { value: 'create', label: '打开新增表单' },
  { value: 'refresh', label: '刷新数据' },
  { value: 'export', label: '导出当前数据 CSV' },
  { value: 'reset', label: '重置筛选' },
  { value: 'none', label: '仅展示（无动作）' },
];

const LABEL_VALUE_ITEMS: ItemFieldDef[] = [
  { key: 'label', label: '名称', control: 'text', defaultValue: '名称' },
  { key: 'value', label: '内容', control: 'text', defaultValue: '内容' },
];

const text = (key: string, label: string, placeholder?: string): PropDef => ({
  key,
  label,
  control: 'text',
  placeholder,
});

const num = (
  key: string,
  label: string,
  min: number,
  max: number,
): PropDef => ({
  key,
  label,
  control: 'number',
  min,
  max,
  step: 1,
});

const bool = (key: string, label: string): PropDef => ({
  key,
  label,
  control: 'switch',
});

const select = (
  key: string,
  label: string,
  options: PropOption[],
): PropDef => ({
  key,
  label,
  control: 'select',
  options,
});

const items = (
  key: string,
  label: string,
  itemFields: ItemFieldDef[],
): PropDef => ({
  key,
  label,
  control: 'items',
  itemFields,
});

/* -------------------- 组件注册中心 -------------------- */

/**
 * 用 satisfies Record<BlockType, ...> 强制注册中心完整覆盖类型白名单：
 * 以后在 types.ts 里加一个 BLOCK_TYPES，忘了注册这里就会编译失败。
 */
const registry = {
  /* ---------------- 导航 ---------------- */
  breadcrumb: {
    label: '面包屑',
    category: '导航',
    icon: 'menu',
    description: '显示当前页面在菜单结构中的位置',
    defaults: { items: ['首页', '数据管理'], separator: '/', showHome: true },
    props: [
      {
        ...text('items', '层级（每行一项）', '首页 / 数据管理'),
        control: 'lines',
        hint: '留空则自动按菜单路径生成',
      },
      text('separator', '分隔符', '/'),
      bool('showHome', '显示首页图标'),
    ],
  },
  pageHeader: {
    label: '页头标题',
    category: '导航',
    icon: 'header',
    description: '页面标题、副标题与右上角操作区',
    defaults: { title: '', subtitle: '', extra: '', showBack: false, level: 3 },
    props: [
      text('title', '标题', '留空使用模型名称'),
      text('subtitle', '副标题', '由模型字段自动生成'),
      text('extra', '右侧文字'),
      bool('showBack', '显示返回按钮'),
      num('level', '标题级别', 2, 5),
    ],
  },
  tabs: {
    label: '标签页',
    category: '导航',
    icon: 'tabs',
    description: '多视图切换容器',
    defaults: {
      type: 'line',
      defaultActive: 0,
      items: [
        { key: 'all', label: '全部', content: '这里是「全部」的内容区' },
        { key: 'active', label: '进行中', content: '这里是「进行中」的内容区' },
        { key: 'done', label: '已完成', content: '这里是「已完成」的内容区' },
      ],
    },
    props: [
      select('type', '样式', [
        { value: 'line', label: '线条' },
        { value: 'card', label: '卡片' },
        { value: 'editable-card', label: '可编辑卡片' },
      ]),
      num('defaultActive', '默认选中第几项', 0, 20),
      items('items', '标签项', [
        { key: 'key', label: 'key', control: 'text', defaultValue: 'tab' },
        {
          key: 'label',
          label: '名称',
          control: 'text',
          defaultValue: '新标签',
        },
        {
          key: 'content',
          label: '内容',
          control: 'textarea',
          defaultValue: '内容',
        },
      ]),
    ],
  },
  stepsBar: {
    label: '步骤条',
    category: '导航',
    icon: 'steps',
    description: '流程进度展示',
    defaults: {
      current: 1,
      status: 'process',
      items: [
        { title: '提交申请', description: '填写基本信息' },
        { title: '审核中', description: '等待管理员确认' },
        { title: '完成', description: '流程结束' },
      ],
    },
    props: [
      num('current', '当前步骤（从 0 开始）', 0, 20),
      select('status', '状态', [
        { value: 'wait', label: '等待' },
        { value: 'process', label: '进行中' },
        { value: 'finish', label: '完成' },
        { value: 'error', label: '错误' },
      ]),
      items('items', '步骤', [
        {
          key: 'title',
          label: '标题',
          control: 'text',
          defaultValue: '新步骤',
        },
        {
          key: 'description',
          label: '说明',
          control: 'text',
          defaultValue: '说明',
        },
      ]),
    ],
  },

  /* ---------------- 布局 ---------------- */
  divider: {
    label: '分割线',
    category: '布局',
    icon: 'divider',
    description: '区块之间的水平分隔',
    defaults: { text: '', orientation: 'center', dashed: true },
    props: [
      text('text', '文字', '可不填'),
      select('orientation', '文字位置', [
        { value: 'left', label: '左' },
        { value: 'center', label: '中' },
        { value: 'right', label: '右' },
      ]),
      bool('dashed', '虚线'),
    ],
  },
  card: {
    label: '卡片',
    category: '布局',
    icon: 'card',
    description: '带标题的内容容器',
    defaults: {
      title: '卡片标题',
      content: '这里是一段可以配置的说明文字。',
      extra: '',
      bordered: true,
    },
    props: [
      text('title', '标题'),
      { ...text('content', '内容'), control: 'textarea' },
      text('extra', '右上角文字'),
      bool('bordered', '显示边框'),
    ],
  },
  grid: {
    label: '栅格卡片',
    category: '布局',
    icon: 'grid',
    description: '多列并排的内容卡片',
    defaults: {
      columns: 2,
      items: [
        { title: '模块 A', content: '第一块内容' },
        { title: '模块 B', content: '第二块内容' },
      ],
    },
    props: [
      num('columns', '列数', 1, 4),
      items('items', '卡片', [
        {
          key: 'title',
          label: '标题',
          control: 'text',
          defaultValue: '新模块',
        },
        {
          key: 'content',
          label: '内容',
          control: 'textarea',
          defaultValue: '内容',
        },
      ]),
    ],
  },
  spacer: {
    label: '留白',
    category: '布局',
    icon: 'spacer',
    description: '调整组件之间的垂直间距',
    defaults: { height: 24 },
    props: [num('height', '高度（px）', 0, 200)],
  },

  /* ---------------- 数据展示 ---------------- */
  statCards: {
    label: '指标卡',
    category: '数据展示',
    icon: 'stat',
    description: '关键指标展示，可手填数值或按模型字段自动聚合',
    defaults: {
      columns: 3,
      items: [
        {
          label: '总记录数',
          value: '0',
          suffix: '条',
          color: 'blue',
          icon: 'database',
          source: 'count',
          field: '',
        },
        {
          label: '求和示例',
          value: '0',
          suffix: '',
          color: 'green',
          icon: 'rise',
          source: 'static',
          field: '',
        },
        {
          label: '平均示例',
          value: '0',
          suffix: '',
          color: 'purple',
          icon: 'check',
          source: 'static',
          field: '',
        },
      ],
    },
    props: [
      num('columns', '每行卡片数', 1, 6),
      items('items', '指标项', [
        {
          key: 'label',
          label: '名称',
          control: 'text',
          defaultValue: '新指标',
        },
        {
          key: 'source',
          label: '数值来源',
          control: 'select',
          options: AGG_SOURCE_OPTIONS,
          defaultValue: 'static',
        },
        {
          key: 'field',
          label: '统计字段',
          control: 'field',
          dynamic: 'fields',
          defaultValue: '',
        },
        {
          key: 'value',
          label: '手填数值（仅手填来源生效）',
          control: 'text',
          defaultValue: '0',
        },
        { key: 'suffix', label: '单位', control: 'text', defaultValue: '' },
        {
          key: 'color',
          label: '颜色',
          control: 'color',
          options: COLOR_OPTIONS,
        },
        {
          key: 'icon',
          label: '图标',
          control: 'select',
          options: BLOCK_ICON_OPTIONS,
        },
      ]),
    ],
  },
  dataTable: {
    label: '数据表格',
    category: '数据展示',
    icon: 'table',
    description: '绑定模型的 CRUD 表格：分页、排序、新增/编辑/删除',
    singleton: true,
    needsModel: true,
    defaults: {
      title: '',
      pageSize: 10,
      size: 'middle',
      bordered: false,
      striped: false,
      showIndex: false,
      showActions: true,
    },
    props: [
      text('title', '表格标题', '留空则不显示'),
      num('pageSize', '每页条数', 5, 100),
      select('size', '密度', [
        { value: 'small', label: '紧凑' },
        { value: 'middle', label: '中等' },
        { value: 'large', label: '宽松' },
      ]),
      bool('bordered', '显示边框'),
      bool('striped', '斑马纹'),
      bool('showIndex', '显示序号列'),
      bool('showActions', '显示新增/操作列'),
    ],
  },
  descriptions: {
    label: '描述列表',
    category: '数据展示',
    icon: 'description',
    description: '键值对形式的详情信息',
    defaults: {
      title: '基本信息',
      column: 2,
      bordered: true,
      items: [
        { label: '负责人', value: '张三' },
        { label: '所属部门', value: '平台研发' },
        { label: '创建时间', value: '2026-11-03' },
        { label: '状态', value: '正常' },
      ],
    },
    props: [
      text('title', '标题'),
      num('column', '每行列数', 1, 4),
      bool('bordered', '显示边框'),
      items('items', '条目', LABEL_VALUE_ITEMS),
    ],
  },
  listBlock: {
    label: '列表',
    category: '数据展示',
    icon: 'list',
    description: '标题 + 描述 + 附注的条目列表',
    defaults: {
      title: '最近动态',
      size: 'default',
      items: [
        {
          title: '系统初始化完成',
          description: '基础数据与菜单已就绪',
          extra: '今天',
        },
        {
          title: '新增用户模型',
          description: '字段映射已自动生成',
          extra: '昨天',
        },
      ],
    },
    props: [
      text('title', '标题'),
      select('size', '密度', [
        { value: 'small', label: '紧凑' },
        { value: 'default', label: '默认' },
        { value: 'large', label: '宽松' },
      ]),
      items('items', '条目', [
        {
          key: 'title',
          label: '标题',
          control: 'text',
          defaultValue: '新条目',
        },
        {
          key: 'description',
          label: '描述',
          control: 'textarea',
          defaultValue: '描述',
        },
        { key: 'extra', label: '附注', control: 'text', defaultValue: '' },
      ]),
    ],
  },
  timeline: {
    label: '时间线',
    category: '数据展示',
    icon: 'timeline',
    description: '按时间顺序展示事件',
    defaults: {
      items: [
        { label: '2026-11-01', content: '项目启动', color: 'blue' },
        { label: '2026-11-02', content: '完成模型设计', color: 'green' },
        { label: '2026-11-03', content: '页面搭建中', color: 'gray' },
      ],
    },
    props: [
      items('items', '节点', [
        {
          key: 'label',
          label: '时间',
          control: 'text',
          defaultValue: '2026-11-03',
        },
        {
          key: 'content',
          label: '内容',
          control: 'text',
          defaultValue: '事件',
        },
        {
          key: 'color',
          label: '颜色',
          control: 'color',
          options: [
            { value: 'blue', label: '蓝' },
            { value: 'green', label: '绿' },
            { value: 'red', label: '红' },
            { value: 'gray', label: '灰' },
          ],
        },
      ]),
    ],
  },
  tagGroup: {
    label: '标签组',
    category: '数据展示',
    icon: 'tag',
    description: '一组状态 / 分类标签',
    defaults: {
      items: [
        { text: '进行中', color: 'blue' },
        { text: '待审核', color: 'gold' },
        { text: '已归档', color: 'default' },
      ],
    },
    props: [
      items('items', '标签', [
        { key: 'text', label: '文字', control: 'text', defaultValue: '新标签' },
        {
          key: 'color',
          label: '颜色',
          control: 'color',
          options: COLOR_OPTIONS,
        },
      ]),
    ],
  },
  progressList: {
    label: '进度条',
    category: '数据展示',
    icon: 'progress',
    description: '一组百分比进度',
    defaults: {
      items: [
        { label: '需求完成度', percent: 78, color: 'blue' },
        { label: '测试覆盖率', percent: 56, color: 'green' },
        { label: '上线准备', percent: 30, color: 'gold' },
      ],
    },
    props: [
      items('items', '进度项', [
        {
          key: 'label',
          label: '名称',
          control: 'text',
          defaultValue: '新进度',
        },
        {
          key: 'percent',
          label: '百分比',
          control: 'number',
          defaultValue: 50,
        },
        {
          key: 'color',
          label: '颜色',
          control: 'color',
          options: COLOR_OPTIONS,
        },
      ]),
    ],
  },
  emptyState: {
    label: '空状态',
    category: '数据展示',
    icon: 'empty',
    description: '无数据时的占位提示',
    defaults: { description: '暂无数据' },
    props: [text('description', '提示文字')],
  },

  /* ---------------- 数据录入 / 操作 ---------------- */
  searchBox: {
    label: '搜索框',
    category: '数据录入',
    icon: 'search',
    description: '关键字搜索，实时过滤页面上的数据表格',
    singleton: true,
    needsModel: true,
    defaults: {
      placeholder: '搜索关键字',
      width: 280,
      allowClear: true,
      showButton: true,
      fields: '',
    },
    props: [
      text('placeholder', '占位文字'),
      num('width', '宽度（px）', 120, 600),
      bool('allowClear', '允许清空'),
      bool('showButton', '显示搜索按钮'),
      {
        ...text('fields', '搜索字段', 'name, email'),
        control: 'lines',
        hint: '每行一个字段 key，留空则搜索全部字段',
      },
    ],
  },
  filterForm: {
    label: '筛选框',
    category: '数据录入',
    icon: 'filter',
    description: '按模型字段生成查询条件，与表格联动',
    singleton: true,
    needsModel: true,
    defaults: {
      layout: 'inline',
      showReset: true,
      showSearchButton: true,
      fields: '',
    },
    props: [
      select('layout', '布局', [
        { value: 'inline', label: '行内' },
        { value: 'vertical', label: '纵向' },
      ]),
      bool('showReset', '显示重置按钮'),
      bool('showSearchButton', '显示查询按钮'),
      {
        ...text('fields', '使用的字段', 'status'),
        control: 'lines',
        hint: '每行一个字段 key，留空则使用所有可筛选字段',
      },
    ],
  },
  buttonGroup: {
    label: '按钮组',
    category: '数据录入',
    icon: 'button',
    description: '新增、刷新、导出、重置等常用操作',
    needsModel: true,
    defaults: {
      align: 'left',
      items: [
        { text: '新增', type: 'primary', action: 'create' },
        { text: '刷新', type: 'default', action: 'refresh' },
        { text: '导出', type: 'default', action: 'export' },
      ],
    },
    props: [
      select('align', '对齐', ALIGN_OPTIONS),
      items('items', '按钮', [
        { key: 'text', label: '文字', control: 'text', defaultValue: '新按钮' },
        {
          key: 'type',
          label: '样式',
          control: 'select',
          options: BUTTON_TYPE_OPTIONS,
        },
        {
          key: 'action',
          label: '动作',
          control: 'select',
          options: ACTION_OPTIONS,
        },
      ]),
    ],
  },
  dateRangeFilter: {
    label: '日期筛选',
    category: '数据录入',
    icon: 'calendar',
    description: '按日期字段区间过滤数据',
    needsModel: true,
    defaults: { label: '创建时间', fieldKey: 'createdAt' },
    props: [
      text('label', '标签'),
      { key: 'fieldKey', label: '日期字段', control: 'field' },
    ],
  },

  /* ---------------- 反馈 ---------------- */
  alertNotice: {
    label: '提示条',
    category: '反馈',
    icon: 'alert',
    description: '页面级提示、警告或说明',
    defaults: {
      message: '温馨提示',
      description: '这是一条可以在右侧属性面板里修改的提示信息。',
      type: 'info',
      showIcon: true,
      closable: false,
    },
    props: [
      text('message', '标题'),
      { ...text('description', '内容'), control: 'textarea' },
      select('type', '类型', [
        { value: 'success', label: '成功' },
        { value: 'info', label: '信息' },
        { value: 'warning', label: '警告' },
        { value: 'error', label: '错误' },
      ]),
      bool('showIcon', '显示图标'),
      bool('closable', '可关闭'),
    ],
  },

  /* ---------------- 图表 ---------------- */
  chart: {
    label: '图表',
    category: '图表',
    icon: 'chart',
    description: '按模型字段聚合或手填静态数据的柱状 / 折线 / 饼图（内置 SVG）',
    defaults: {
      chartType: 'bar',
      title: '数据分布',
      dataMode: 'model',
      groupBy: 'status',
      metric: 'count',
      valueField: '',
      series: [],
      height: 220,
      color: 'blue',
    },
    props: [
      select('chartType', '图表类型', [
        { value: 'bar', label: '柱状图' },
        { value: 'line', label: '折线图' },
        { value: 'pie', label: '饼图' },
      ]),
      text('title', '标题'),
      select('dataMode', '数据来源', [
        { value: 'model', label: '绑定模型（按字段聚合）' },
        { value: 'static', label: '静态数据（手填）' },
      ]),
      {
        key: 'groupBy',
        label: '分组字段',
        control: 'field',
        showWhen: { key: 'dataMode', equals: 'model' },
      },
      {
        key: 'metric',
        label: '统计方式',
        control: 'select',
        options: METRIC_OPTIONS,
        showWhen: { key: 'dataMode', equals: 'model' },
      },
      {
        key: 'valueField',
        label: '数值字段',
        control: 'field',
        showWhen: { key: 'dataMode', equals: 'model' },
        hint: '统计方式为「求和 / 平均」时按该字段计算',
      },
      {
        ...items('series', '数据项', [
          {
            key: 'label',
            label: '名称',
            control: 'text',
            defaultValue: '类目',
          },
          { key: 'value', label: '数值', control: 'number', defaultValue: 10 },
        ]),
        showWhen: { key: 'dataMode', equals: 'static' },
        hint: '顺序即图表从左到右的顺序',
      },
      num('height', '高度（px）', 120, 500),
      { key: 'color', label: '主色', control: 'color', options: COLOR_OPTIONS },
    ],
  },
} satisfies Record<BlockType, Omit<ComponentDef, 'type'>>;

export const COMPONENT_MAP = Object.fromEntries(
  Object.entries(registry).map(([type, config]) => [
    type,
    { ...config, type: type as BlockType },
  ]),
) as unknown as Record<BlockType, ComponentDef>;

export const COMPONENT_LIBRARY: ComponentDef[] = Object.values(COMPONENT_MAP);

/** 由注册中心生成一个带默认配置的新组件块 */
export const createBlock = (type: BlockType): PageBlock => ({
  id: `blk_${nanoid(8)}`,
  type,
  props: structuredClone(COMPONENT_MAP[type].defaults),
  visible: true,
});

/** 读取配置值，缺省回退到组件默认值（老 Schema 缺字段也不会崩） */
export const readProp = <T>(block: PageBlock, key: string): T =>
  (block.props[key] ?? COMPONENT_MAP[block.type].defaults[key]) as T;

export const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string'
    ? value
    : value === undefined || value === null
      ? fallback
      : String(value);

export const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const asBool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      )
    : [];

/** lines 属性：字符串数组或换行文本，统一成数组 */
export const asLines = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};
