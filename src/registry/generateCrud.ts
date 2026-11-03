import { BOOLEAN_FILTER_OPTIONS, FIELD_META } from './fieldMeta';
import type {
  ColumnSchema,
  CrudPageSchema,
  FieldSchema,
  FilterSchema,
  FormFieldSchema,
  FormControl,
  ModelSchema,
  ProjectSchema,
} from '../schema/types';

const notNull = <T>(value: T | null): value is T => value !== null;

/**
 * 三个 resolve 函数是"默认规则 + 显式覆盖"的唯一定义处。
 * 生成器和字段编辑器都调用它们，保证两边看到的永远一致。
 */
export const resolveShowInTable = (field: FieldSchema): boolean => {
  if (field.showInTable !== undefined) return field.showInTable;
  const meta = FIELD_META[field.type];
  // 长文本默认不进表格，否则一行能撑爆页面
  return meta.column !== null && field.type !== 'text';
};

export const resolveShowInFilter = (field: FieldSchema): boolean => {
  if (field.filterable !== undefined) return field.filterable;
  return FIELD_META[field.type].filter !== null;
};

export const resolveShowInForm = (
  field: FieldSchema,
  primaryKey: string,
): boolean => {
  if (field.editable !== undefined) return field.editable;
  // 主键通常由后端生成，默认不出现在新增表单里
  return field.key !== primaryKey;
};

const buildPlaceholder = (control: FormControl, label: string): string => {
  if (control === 'select') return `请选择${label}`;
  if (control === 'switch') return '';
  return `请输入${label}`;
};

const toColumn = (field: FieldSchema): ColumnSchema | null => {
  const meta = FIELD_META[field.type];
  if (!meta.column) return null;

  return {
    key: field.key,
    title: field.label,
    renderer: meta.column.renderer,
    align: meta.column.align,
    width: field.width,
    options: field.options,
    sortable: meta.sortable,
  };
};

const toFilter = (field: FieldSchema): FilterSchema | null => {
  const meta = FIELD_META[field.type];
  if (!meta.filter) return null;

  return {
    key: field.key,
    label: field.label,
    control: meta.filter,
    options: field.type === 'boolean' ? BOOLEAN_FILTER_OPTIONS : field.options,
  };
};

const toFormField = (field: FieldSchema): FormFieldSchema => {
  const control = FIELD_META[field.type].form;

  return {
    key: field.key,
    label: field.label,
    control,
    required: field.required ?? false,
    options: field.type === 'boolean' ? undefined : field.options,
    placeholder: field.placeholder ?? buildPlaceholder(control, field.label),
  };
};

/**
 * 模型 → 页面。纯函数，不依赖任何运行时状态，可单测、可缓存。
 */
export const generateCrudPage = (model: ModelSchema): CrudPageSchema => {
  const columns = model.fields
    .filter(resolveShowInTable)
    .map(toColumn)
    .filter(notNull);

  const filters = model.fields
    .filter(resolveShowInFilter)
    .map(toFilter)
    .filter(notNull);

  const formFields = model.fields
    .filter((field) => resolveShowInForm(field, model.primaryKey))
    .map(toFormField);

  return {
    modelKey: model.key,
    title: `${model.name}管理`,
    primaryKey: model.primaryKey,
    columns,
    filters,
    formFields,
    pageSize: 10,
  };
};

export const generateCrudPages = (
  project: ProjectSchema,
): Map<string, CrudPageSchema> =>
  new Map(
    project.models.map(
      (model) => [model.key, generateCrudPage(model)] as const,
    ),
  );
