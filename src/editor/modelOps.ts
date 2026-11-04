import { nanoid } from 'nanoid';
import { FIELD_META } from '../registry/fieldMeta';
import type {
  EnumOption,
  FieldSchema,
  FieldType,
  MenuSchema,
  ModelSchema,
} from '../schema/types';

/**
 * 模型与字段的不可变操作。全是纯函数，方便单测与复用。
 */

export const FIELD_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const isValidFieldKey = (key: string): boolean =>
  FIELD_KEY_PATTERN.test(key);

const DEFAULT_ENUM_OPTIONS: EnumOption[] = [
  { value: 'option_a', label: '选项一', color: 'blue' },
  { value: 'option_b', label: '选项二', color: 'default' },
];

const primaryKeyField = (): FieldSchema => ({
  key: 'id',
  label: 'ID',
  type: 'string',
  width: 100,
  editable: false,
  filterable: false,
});

/** 模型必须绑定接口才能建立：apiKey 是数据来源，没有接口的模型无法通过校验 */
export const createModel = (apiKey: string, name = '新模型'): ModelSchema => ({
  key: `model_${nanoid(6)}`,
  name,
  description: '',
  apiKey,
  primaryKey: 'id',
  fields: [primaryKeyField()],
});

export const createField = (model: ModelSchema): FieldSchema => ({
  key: `field_${nanoid(4)}`,
  label: `新字段 ${model.fields.length + 1}`,
  type: 'string',
});

/**
 * 切换字段类型时顺带处理附属配置：
 * 枚举补默认选项、关联补默认指向，切走时清掉无意义的残留。
 */
export const withTypeApplied = (
  field: FieldSchema,
  type: FieldType,
  models: ModelSchema[] = [],
): FieldSchema => {
  if (type === field.type) return field;

  const next: FieldSchema = { ...field, type };

  if (type === 'enum') {
    next.options = field.options?.length
      ? field.options
      : DEFAULT_ENUM_OPTIONS.map((option) => ({ ...option }));
  } else {
    delete next.options;
  }

  if (type === 'relation') {
    const target = models.find(
      (model) => model.key !== field.relation?.modelKey,
    );
    next.relation = field.relation ?? {
      modelKey: target?.key ?? '',
      labelKey: target?.fields[0]?.key ?? '',
    };
  } else {
    delete next.relation;
  }

  return next;
};

export const findModel = (
  models: ModelSchema[],
  key: string,
): ModelSchema | undefined => models.find((model) => model.key === key);

export const isFieldKeyTaken = (
  model: ModelSchema,
  key: string,
  except?: string,
): boolean =>
  model.fields.some((field) => field.key === key && field.key !== except);

const mapModelFields = (
  models: ModelSchema[],
  modelKey: string,
  updater: (fields: FieldSchema[], model: ModelSchema) => FieldSchema[],
): ModelSchema[] =>
  models.map((model) =>
    model.key !== modelKey
      ? model
      : { ...model, fields: updater(model.fields, model) },
  );

export const updateModelInList = (
  models: ModelSchema[],
  key: string,
  patch: Partial<ModelSchema>,
): ModelSchema[] =>
  models.map((model) => (model.key === key ? { ...model, ...patch } : model));

export const removeModelFromList = (
  models: ModelSchema[],
  key: string,
): ModelSchema[] => models.filter((model) => model.key !== key);

export const addFieldToModel = (
  models: ModelSchema[],
  modelKey: string,
  field: FieldSchema,
): ModelSchema[] =>
  mapModelFields(models, modelKey, (fields) => [...fields, field]);

export const removeFieldFromModel = (
  models: ModelSchema[],
  modelKey: string,
  fieldKey: string,
): ModelSchema[] =>
  mapModelFields(models, modelKey, (fields) =>
    fields.filter((field) => field.key !== fieldKey),
  );

/** 字段在列表里的上下移动，主键永远排在第一位 */
export const moveFieldInModel = (
  models: ModelSchema[],
  modelKey: string,
  fieldKey: string,
  offset: -1 | 1,
): ModelSchema[] =>
  mapModelFields(models, modelKey, (fields, model) => {
    const index = fields.findIndex((field) => field.key === fieldKey);
    const target = index + offset;
    const minIndex = fields[0]?.key === model.primaryKey ? 1 : 0;

    if (index < 0 || target < minIndex || target >= fields.length)
      return fields;

    const next = [...fields];
    const moved = next[index]!;
    next[index] = next[target]!;
    next[target] = moved;
    return next;
  });

export const canMoveField = (
  model: ModelSchema,
  fieldKey: string,
  offset: -1 | 1,
): boolean => {
  const index = model.fields.findIndex((field) => field.key === fieldKey);
  const minIndex = model.fields[0]?.key === model.primaryKey ? 1 : 0;
  const target = index + offset;
  return index >= 0 && target >= minIndex && target < model.fields.length;
};

/**
 * 字段更新。改 key 时如果是主键字段，模型的主键声明要跟着走，
 * 否则 Schema 自己就不一致了。
 */
export const updateFieldInModel = (
  models: ModelSchema[],
  modelKey: string,
  fieldKey: string,
  patch: Partial<FieldSchema>,
): ModelSchema[] =>
  models.map((model) => {
    if (model.key !== modelKey) return model;

    return {
      ...model,
      primaryKey:
        model.primaryKey === fieldKey && patch.key
          ? patch.key
          : model.primaryKey,
      fields: model.fields.map((field) =>
        field.key === fieldKey ? { ...field, ...patch } : field,
      ),
    };
  });

/** 有多少菜单正绑定这个模型，删除前要给个明确提示 */
export const countModelRefs = (
  menus: MenuSchema[],
  modelKey: string,
): number => {
  let total = 0;
  const walk = (list: MenuSchema[]) => {
    list.forEach((menu) => {
      if (menu.modelKey === modelKey) total += 1;
      if (menu.children) walk(menu.children);
    });
  };
  walk(menus);
  return total;
};

/** 删除模型后，菜单上还挂着它的引用必须一起清掉，否则校验不过 */
export const clearModelRefsInMenus = (
  menus: MenuSchema[],
  modelKey: string,
): MenuSchema[] =>
  menus.map((menu) => ({
    ...menu,
    ...(menu.modelKey === modelKey ? { modelKey: undefined } : {}),
    ...(menu.children
      ? { children: clearModelRefsInMenus(menu.children, modelKey) }
      : {}),
  }));

export const fieldTypeOptions = (Object.keys(FIELD_META) as FieldType[]).map(
  (type) => ({ value: type, label: FIELD_META[type].label }),
);
