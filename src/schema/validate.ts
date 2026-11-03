import { z } from 'zod';
import { BLOCK_TYPES, FIELD_TYPES, MENU_ICONS } from './types';
import type { MenuSchema, ProjectSchema } from './types';

const enumOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1).optional(),
});

const relationSchema = z.object({
  modelKey: z.string().min(1),
  labelKey: z.string().min(1),
});

const fieldSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '字段名必须是合法的标识符'),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().optional(),
    options: z.array(enumOptionSchema).optional(),
    relation: relationSchema.optional(),
    width: z.number().int().positive().optional(),
    showInTable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    editable: z.boolean().optional(),
    placeholder: z.string().optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === 'enum' && !field.options?.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `枚举字段 ${field.key} 必须提供至少一个选项`,
      });
    }
    if (field.type === 'relation' && !field.relation) {
      ctx.addIssue({
        code: 'custom',
        path: ['relation'],
        message: `关联字段 ${field.key} 必须声明 relation 配置`,
      });
    }
  });

const modelSchema = z
  .object({
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    primaryKey: z.string().min(1),
    fields: z.array(fieldSchema).min(1, '模型至少需要一个字段'),
  })
  .superRefine((model, ctx) => {
    const seen = new Set<string>();
    model.fields.forEach((field, index) => {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index, 'key'],
          message: `模型 ${model.key} 存在重复字段 ${field.key}`,
        });
      }
      seen.add(field.key);
    });
    if (!seen.has(model.primaryKey)) {
      ctx.addIssue({
        code: 'custom',
        path: ['primaryKey'],
        message: `主键字段 ${model.primaryKey} 不在字段列表中`,
      });
    }
  });

const menuSchema: z.ZodType<MenuSchema> = z.lazy(() =>
  z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    icon: z.enum(MENU_ICONS).optional(),
    modelKey: z.string().min(1).optional(),
    children: z.array(menuSchema).optional(),
  }),
);

const pageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(BLOCK_TYPES),
  // props 保持开放：具体字段由组件注册表的属性表单元数据约束，
  // 这里只保证可 JSON 序列化，不把展示层元数据耦合进 Schema 校验
  props: z.record(z.string(), z.unknown()),
  visible: z.boolean().optional(),
});

const pageSchema = z.object({
  menuKey: z.string().min(1),
  blocks: z.array(pageBlockSchema),
});

const collectMenuKeys = (menus: MenuSchema[]): Set<string> => {
  const keys = new Set<string>();
  const walk = (list: MenuSchema[]) => {
    list.forEach((menu) => {
      keys.add(menu.key);
      if (menu.children) walk(menu.children);
    });
  };
  walk(menus);
  return keys;
};

const projectSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.string().min(1),
    name: z.string().min(1),
    menus: z.array(menuSchema),
    models: z.array(modelSchema).min(1),
    pages: z.array(pageSchema).optional(),
  })
  .superRefine((project, ctx) => {
    const modelKeys = new Set<string>();
    project.models.forEach((model, index) => {
      if (modelKeys.has(model.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['models', index, 'key'],
          message: `模型 key ${model.key} 重复`,
        });
      }
      modelKeys.add(model.key);
    });

    const walk = (menus: MenuSchema[], path: (string | number)[]) => {
      menus.forEach((menu, index) => {
        if (menu.modelKey && !modelKeys.has(menu.modelKey)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, index, 'modelKey'],
            message: `菜单 ${menu.key} 引用了不存在的模型 ${menu.modelKey}`,
          });
        }
        if (menu.children) {
          walk(menu.children, [...path, index, 'children']);
        }
      });
    };
    walk(project.menus, ['menus']);

    const menuKeys = collectMenuKeys(project.menus);
    const seenPages = new Set<string>();
    project.pages?.forEach((page, index) => {
      if (!menuKeys.has(page.menuKey)) {
        ctx.addIssue({
          code: 'custom',
          path: ['pages', index, 'menuKey'],
          message: `页面 ${page.menuKey} 引用了不存在的菜单`,
        });
      }
      if (seenPages.has(page.menuKey)) {
        ctx.addIssue({
          code: 'custom',
          path: ['pages', index, 'menuKey'],
          message: `菜单 ${page.menuKey} 存在重复的页面配置`,
        });
      }
      seenPages.add(page.menuKey);
    });
  });

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  { ok: true; data: T } | { ok: false; issues: ValidationIssue[] };

export const validateProject = (
  input: unknown,
): ValidationResult<ProjectSchema> => {
  const result = projectSchema.safeParse(input);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
};
