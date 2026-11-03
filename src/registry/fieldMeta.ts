import type {
  ColumnRenderer,
  FieldType,
  FilterControl,
  FormControl,
} from '../schema/types';

/**
 * 整个产品的核心算法：字段类型 → 展示/筛选/录入三段映射。
 * 新增一种字段类型只需在这里补一行，生成器、表格、表单三处自动生效。
 */
export interface FieldMeta {
  label: string;
  column: {
    renderer: ColumnRenderer;
    align?: 'left' | 'center' | 'right';
  } | null;
  filter: FilterControl | null;
  form: FormControl;
  sortable: boolean;
}

export const FIELD_META: Record<FieldType, FieldMeta> = {
  string: {
    label: '单行文本',
    column: { renderer: 'text' },
    filter: 'input',
    form: 'input',
    sortable: true,
  },
  text: {
    label: '多行文本',
    column: { renderer: 'longText' },
    filter: null,
    form: 'textarea',
    sortable: false,
  },
  number: {
    label: '数字',
    column: { renderer: 'number', align: 'right' },
    filter: 'numberRange',
    form: 'inputNumber',
    sortable: true,
  },
  boolean: {
    label: '布尔',
    column: { renderer: 'boolean', align: 'center' },
    filter: 'select',
    form: 'switch',
    sortable: false,
  },
  enum: {
    label: '枚举',
    column: { renderer: 'tag' },
    filter: 'select',
    form: 'select',
    sortable: false,
  },
  date: {
    label: '日期',
    column: { renderer: 'date' },
    filter: 'dateRange',
    form: 'date',
    sortable: true,
  },
  datetime: {
    label: '日期时间',
    column: { renderer: 'datetime' },
    filter: 'dateRange',
    form: 'datetime',
    sortable: true,
  },
  relation: {
    label: '关联',
    column: { renderer: 'relation' },
    filter: 'select',
    form: 'select',
    sortable: false,
  },
};

/** 布尔字段在筛选项里需要显式的三态选项，否则无法表达「不过滤」 */
export const BOOLEAN_FILTER_OPTIONS = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' },
];
