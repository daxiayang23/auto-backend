import type { BlockIconKey } from './blockIcons';
import { createBlock } from './componentLibrary';
import { findMenu, findMenuPath } from '../editor/menuOps';
import type {
  BlockProps,
  BlockType,
  PageBlock,
  ProjectSchema,
} from '../schema/types';

/**
 * 页面模板：一次生成整页组件组合，用户再在画布上微调。
 *
 * 和默认派生（generateDefaultBlocks）的区别：
 * 派生是「模型 → CRUD 页面」的隐式规则，模板是用户显式选择并固化下来的。
 * 所以模板块的 id 也必须是确定性的——应用模板后立刻选中某个块才不会错位。
 */
export interface PageTemplate {
  id: string;
  label: string;
  description: string;
  icon: BlockIconKey;
  /** 需要菜单绑定模型才有真实数据 */
  needsModel?: boolean;
  build: (project: ProjectSchema, menuKey: string) => PageBlock[];
}

const makeBlock = (
  menuKey: string,
  type: BlockType,
  ordinal: number,
  patch?: BlockProps,
): PageBlock => {
  const block = createBlock(type);
  return {
    ...block,
    id: `tpl_${menuKey}_${type}_${ordinal}`,
    props: { ...block.props, ...patch },
    visible: true,
  };
};

/** 每个模板都以「面包屑 + 页头」开头，这里统一生成 */
const pageShell = (
  project: ProjectSchema,
  menuKey: string,
  subtitle: string,
): PageBlock[] => {
  const menu = findMenu(project.menus, menuKey);
  const path =
    findMenuPath(project.menus, menuKey) ?? (menu ? [menu.label] : []);

  return [
    makeBlock(menuKey, 'breadcrumb', 0, {
      items: ['首页', ...path],
      separator: '/',
      showHome: true,
    }),
    makeBlock(menuKey, 'pageHeader', 0, {
      title: menu?.label ?? '页面',
      subtitle,
      extra: '',
      showBack: false,
      level: 3,
    }),
  ];
};

export const TEMPLATES = [
  {
    id: 'overview',
    label: '概览大屏',
    description: '指标卡 + 分布图 + 动态列表，不依赖模型也能用',
    icon: 'stat',
    build: (project, menuKey) => [
      ...pageShell(project, menuKey, '关键指标与趋势总览'),
      makeBlock(menuKey, 'statCards', 0, {
        columns: 4,
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
            label: '今日新增',
            value: '128',
            suffix: '条',
            color: 'green',
            icon: 'rise',
            source: 'static',
            field: '',
          },
          {
            label: '待处理',
            value: '17',
            suffix: '项',
            color: 'gold',
            icon: 'alert',
            source: 'static',
            field: '',
          },
          {
            label: '完成率',
            value: '86',
            suffix: '%',
            color: 'purple',
            icon: 'check',
            source: 'static',
            field: '',
          },
        ],
      }),
      makeBlock(menuKey, 'chart', 0, {
        chartType: 'bar',
        title: '分布概览',
        dataMode: 'static',
        height: 220,
        color: 'blue',
        series: [
          { label: '华东', value: 42 },
          { label: '华南', value: 31 },
          { label: '华北', value: 26 },
          { label: '西南', value: 18 },
        ],
      }),
      makeBlock(menuKey, 'listBlock', 0, {
        title: '最近动态',
        size: 'default',
        items: [
          {
            title: '系统初始化完成',
            description: '基础数据与菜单已就绪',
            extra: '今天',
          },
          {
            title: '新增数据模型',
            description: '字段映射已自动生成',
            extra: '昨天',
          },
          {
            title: '页面模板上线',
            description: '支持一键套用并继续微调',
            extra: '2 天前',
          },
        ],
      }),
    ],
  },
  {
    id: 'monitor',
    label: '监控大屏',
    description: '指标卡 + 占比饼图 + 趋势折线 + 进度条',
    icon: 'chart',
    build: (project, menuKey) => [
      ...pageShell(project, menuKey, '运行状态实时监控'),
      makeBlock(menuKey, 'statCards', 0, {
        columns: 3,
        items: [
          {
            label: '在线设备',
            value: '86',
            suffix: '台',
            color: 'green',
            icon: 'check',
            source: 'count',
            field: '',
          },
          {
            label: '告警数',
            value: '4',
            suffix: '条',
            color: 'red',
            icon: 'alert',
            source: 'static',
            field: '',
          },
          {
            label: '平均负载',
            value: '63',
            suffix: '%',
            color: 'cyan',
            icon: 'rise',
            source: 'static',
            field: '',
          },
        ],
      }),
      makeBlock(menuKey, 'chart', 0, {
        chartType: 'pie',
        title: '状态占比',
        dataMode: 'static',
        height: 220,
        color: 'blue',
        series: [
          { label: '正常', value: 68 },
          { label: '预警', value: 21 },
          { label: '异常', value: 11 },
        ],
      }),
      makeBlock(menuKey, 'chart', 1, {
        chartType: 'line',
        title: '近七日趋势',
        dataMode: 'static',
        height: 200,
        color: 'purple',
        series: [
          { label: '周一', value: 32 },
          { label: '周二', value: 41 },
          { label: '周三', value: 38 },
          { label: '周四', value: 52 },
          { label: '周五', value: 46 },
          { label: '周六', value: 28 },
          { label: '周日', value: 24 },
        ],
      }),
      makeBlock(menuKey, 'progressList', 0, {
        items: [
          { label: 'CPU 使用率', percent: 63, color: 'blue' },
          { label: '内存使用率', percent: 78, color: 'gold' },
          { label: '磁盘占用', percent: 45, color: 'green' },
        ],
      }),
    ],
  },
  {
    id: 'crud',
    label: '数据管理页',
    description: '搜索 + 筛选 + 操作按钮 + 数据表格（需绑定模型）',
    icon: 'table',
    needsModel: true,
    build: (project, menuKey) => [
      ...pageShell(project, menuKey, '按模型自动生成的增删改查页面'),
      makeBlock(menuKey, 'searchBox', 0),
      makeBlock(menuKey, 'filterForm', 0),
      makeBlock(menuKey, 'buttonGroup', 0),
      makeBlock(menuKey, 'dataTable', 0),
    ],
  },
  {
    id: 'insight',
    label: '模型洞察',
    description: '按当前模型的数值/枚举字段自动聚合指标与图表',
    icon: 'chart',
    needsModel: true,
    build: (project, menuKey) => {
      const model = project.models.find(
        (item) => item.key === findMenu(project.menus, menuKey)?.modelKey,
      );
      const numericField =
        model?.fields.find((field) => field.type === 'number')?.key ?? '';
      const categoryField =
        model?.fields.find(
          (field) => field.type === 'enum' || field.type === 'boolean',
        )?.key ??
        model?.fields[0]?.key ??
        'status';

      return [
        ...pageShell(project, menuKey, '指标与图表直接由模型数据聚合'),
        makeBlock(menuKey, 'statCards', 0, {
          columns: 4,
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
              label: '数值求和',
              value: '0',
              suffix: '',
              color: 'green',
              icon: 'rise',
              source: 'sum',
              field: numericField,
            },
            {
              label: '数值平均',
              value: '0',
              suffix: '',
              color: 'purple',
              icon: 'check',
              source: 'avg',
              field: numericField,
            },
            {
              label: '分类去重数',
              value: '0',
              suffix: '类',
              color: 'gold',
              icon: 'tag',
              source: 'distinct',
              field: categoryField,
            },
          ],
        }),
        makeBlock(menuKey, 'chart', 0, {
          chartType: 'bar',
          title: `${categoryField} 分布`,
          dataMode: 'model',
          groupBy: categoryField,
          metric: numericField ? 'sum' : 'count',
          valueField: numericField,
          height: 240,
          color: 'blue',
          series: [],
        }),
        makeBlock(menuKey, 'chart', 1, {
          chartType: 'pie',
          title: `${categoryField} 占比`,
          dataMode: 'model',
          groupBy: categoryField,
          metric: 'count',
          valueField: '',
          height: 200,
          color: 'purple',
          series: [],
        }),
      ];
    },
  },
  {
    id: 'detail',
    label: '详情页',
    description: '描述列表 + 时间线 + 状态标签',
    icon: 'description',
    build: (project, menuKey) => [
      ...pageShell(project, menuKey, '以只读视角展示一条记录的完整信息'),
      makeBlock(menuKey, 'descriptions', 0, {
        title: '基本信息',
        column: 2,
        bordered: true,
        items: [
          { label: '名称', value: '示例记录' },
          { label: '负责人', value: '张三' },
          { label: '所属部门', value: '平台研发' },
          { label: '创建时间', value: '2026-11-03' },
        ],
      }),
      makeBlock(menuKey, 'tagGroup', 0),
      makeBlock(menuKey, 'timeline', 0),
    ],
  },
  {
    id: 'blank',
    label: '空白页',
    description: '只保留面包屑与页头，从零开始搭',
    icon: 'card',
    build: (project, menuKey) => [
      ...pageShell(project, menuKey, '从左侧组件库添加第一个组件'),
      makeBlock(menuKey, 'alertNotice', 0, {
        message: '开始搭建',
        description:
          '从左侧「组件」面板选择内置组件添加进来，或切换页面模板一键套用。',
        type: 'info',
        showIcon: true,
        closable: false,
      }),
    ],
  },
] satisfies PageTemplate[];

export const findTemplate = (id: string): PageTemplate | undefined =>
  TEMPLATES.find((template) => template.id === id);
