import { create } from 'zustand';
import type {
  BlockProps,
  BlockType,
  FieldSchema,
  MenuSchema,
  ModelSchema,
  ProjectSchema,
} from '../schema/types';
import { validateProject } from '../schema/validate';
import { defaultProject } from '../mock/data';
import { createBlock } from '../registry/componentLibrary';
import { findTemplate } from '../registry/dashboardTemplates';
import {
  canAddBlock,
  dropPages,
  ensurePages,
  getPageBlocks,
  insertBlock,
  moveBlock as moveBlockInPage,
  patchBlockProps,
  removeBlock as removeBlockFromPage,
  reorderBlocks as reorderBlocksInPage,
  toggleBlockVisible as toggleBlockVisibleInPage,
  upsertPage,
} from '../editor/componentOps';
import {
  createMenuNode,
  findFallbackMenuKey,
  findMenu,
  insertMenuInTree,
  moveMenuInTree,
  removeMenuFromTree,
  updateMenuInTree,
} from '../editor/menuOps';
import {
  addFieldToModel,
  clearModelRefsInMenus,
  createField,
  createModel,
  findModel,
  moveFieldInModel,
  removeFieldFromModel,
  removeModelFromList,
  updateFieldInModel,
  updateModelInList,
  withTypeApplied,
} from '../editor/modelOps';

// Schema 是唯一事实来源，进入运行时前必须过一遍校验，
// 避免脏数据把渲染器打挂在用户面前。
const bootstrap = validateProject(defaultProject);
if ('issues' in bootstrap) {
  console.error('项目 Schema 校验未通过：', bootstrap.issues);
}

export type DeskMode = 'edit' | 'preview';

/** 编辑态左侧面板：菜单结构 / 数据模型 / 组件库 */
export type EditorTab = 'menu' | 'model' | 'library';

/** 编辑态选中的元素：kind 决定属性面板渲染哪套表单 */
export type ElementKind = 'menu' | 'page' | 'model' | 'field' | 'block';

export interface ElementRef {
  kind: ElementKind;
  key: string;
  /** 二级定位：字段属于哪个模型 */
  owner?: string;
}

interface ProjectStore {
  project: ProjectSchema;
  deskMode: DeskMode;
  editorTab: EditorTab;
  activeMenuKey: string;
  selectedElement: ElementRef | null;
  setDeskMode: (deskMode: DeskMode) => void;
  setEditorTab: (editorTab: EditorTab) => void;
  setActiveMenuKey: (key: string) => void;
  selectElement: (element: ElementRef | null) => void;
  /** 编辑态点菜单：既切当前页，也把它设为选中元素 */
  selectMenu: (key: string) => void;
  addMenu: (parentKey?: string) => void;
  updateMenu: (key: string, patch: Partial<MenuSchema>) => void;
  removeMenu: (key: string) => void;
  moveMenu: (key: string, offset: -1 | 1) => void;
  resetMenus: () => void;
  /** 拖拽结束后一次性提交整棵树，避免拖动过程把中间态写进 Schema */
  replaceMenus: (menus: MenuSchema[]) => void;
  selectModel: (key: string) => void;
  addModel: () => void;
  updateModel: (key: string, patch: Partial<ModelSchema>) => void;
  removeModel: (key: string) => void;
  resetModels: () => void;
  selectField: (modelKey: string, fieldKey: string) => void;
  addField: (modelKey: string) => void;
  updateField: (
    modelKey: string,
    fieldKey: string,
    patch: Partial<FieldSchema>,
  ) => void;
  removeField: (modelKey: string, fieldKey: string) => void;
  moveField: (modelKey: string, fieldKey: string, offset: -1 | 1) => void;
  resetFields: (modelKey: string) => void;
  /** 页面组件编排：所有操作都先 ensurePages 把派生页面固化下来 */
  selectBlock: (menuKey: string, blockId: string) => void;
  addBlock: (menuKey: string, type: BlockType) => void;
  updateBlock: (menuKey: string, blockId: string, patch: BlockProps) => void;
  removeBlock: (menuKey: string, blockId: string) => void;
  moveBlock: (menuKey: string, blockId: string, offset: -1 | 1) => void;
  toggleBlockVisible: (menuKey: string, blockId: string) => void;
  /** 拖拽排序：按新 id 顺序重排，松手才提交 */
  reorderBlocks: (menuKey: string, orderedIds: string[]) => void;
  /** 删除该菜单的覆盖配置，回到自动生成页面 */
  resetPage: (menuKey: string) => void;
  /** 整体套用一个页面模板（大屏 / CRUD / 详情…） */
  applyTemplate: (menuKey: string, templateId: string) => void;
  /** 导入外部 Schema 快照：整份替换，并重置当前选中与所在页面 */
  replaceProject: (project: ProjectSchema) => void;
}

/** 字段配置的初始基线，「恢复默认」以它为准 */
const BASELINE = defaultProject;

function collectMenuKeys(menus: MenuSchema[]): string[] {
  return menus.flatMap((menu) => [
    menu.key,
    ...collectMenuKeys(menu.children ?? []),
  ]);
}

const restoreField = (field: FieldSchema, modelKey: string): FieldSchema => {
  const origin = BASELINE.models
    .find((model) => model.key === modelKey)
    ?.fields.find((item) => item.key === field.key);

  if (!origin) return field;

  return {
    ...field,
    label: origin.label,
    required: origin.required,
    showInTable: origin.showInTable,
    filterable: origin.filterable,
    editable: origin.editable,
  };
};

/** 选中元素是否依附于某个模型，删除模型/字段时用于清理脏选中 */
const isDangling = (
  element: ElementRef | null,
  modelKey: string,
  fieldKey?: string,
): boolean => {
  if (!element) return false;
  if (element.kind === 'model') return element.key === modelKey;
  if (element.kind === 'field') {
    return (
      element.owner === modelKey && (!fieldKey || element.key === fieldKey)
    );
  }
  return false;
};

/** 模型列表整批替换后，选中元素是否还找得到 */
const survivesIn = (
  element: ElementRef | null,
  models: ModelSchema[],
): boolean => {
  if (!element) return true;
  if (element.kind === 'model') {
    return models.some((model) => model.key === element.key);
  }
  if (element.kind === 'field') {
    return models.some(
      (model) =>
        model.key === element.owner &&
        model.fields.some((field) => field.key === element.key),
    );
  }
  return true;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  project: defaultProject,
  deskMode: 'preview',
  editorTab: 'menu',
  activeMenuKey: 'users',
  selectedElement: null,
  setDeskMode: (deskMode) => set({ deskMode }),
  setEditorTab: (editorTab) => set({ editorTab }),
  setActiveMenuKey: (activeMenuKey) => set({ activeMenuKey }),
  selectElement: (selectedElement) => set({ selectedElement }),
  selectMenu: (key) =>
    set({ activeMenuKey: key, selectedElement: { kind: 'menu', key } }),
  addMenu: (parentKey) => {
    const node = createMenuNode();

    set((state) => ({
      project: {
        ...state.project,
        menus: insertMenuInTree(state.project.menus, parentKey ?? null, node),
      },
      activeMenuKey: node.key,
      selectedElement: { kind: 'menu', key: node.key },
    }));
  },
  updateMenu: (key, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        menus: updateMenuInTree(state.project.menus, key, patch),
      },
    })),
  removeMenu: (key) =>
    set((state) => {
      const menus = removeMenuFromTree(state.project.menus, key);
      const activeExists = Boolean(findMenu(menus, state.activeMenuKey));
      const nextActive = activeExists
        ? state.activeMenuKey
        : findFallbackMenuKey(menus);
      const removed = findMenu(state.project.menus, key);
      const removedKeys = removed
        ? [removed.key, ...collectMenuKeys(removed.children ?? [])]
        : [key];

      return {
        project: {
          ...state.project,
          menus,
          pages: dropPages(state.project.pages, removedKeys),
        },
        activeMenuKey: nextActive,
        selectedElement:
          state.selectedElement?.kind === 'menu' &&
          state.selectedElement.key === key
            ? null
            : state.selectedElement,
      };
    }),
  moveMenu: (key, offset) =>
    set((state) => ({
      project: {
        ...state.project,
        menus: moveMenuInTree(state.project.menus, key, offset),
      },
    })),
  resetMenus: () =>
    set((state) => {
      const menus = structuredClone(BASELINE.menus);
      const keptKeys = new Set(collectMenuKeys(menus));

      return {
        project: {
          ...state.project,
          menus,
          pages:
            state.project.pages?.filter((page) => keptKeys.has(page.menuKey)) ??
            [],
        },
        activeMenuKey: findFallbackMenuKey(BASELINE.menus),
        selectedElement: null,
      };
    }),
  replaceMenus: (menus) =>
    set((state) => ({ project: { ...state.project, menus } })),
  selectModel: (key) => set({ selectedElement: { kind: 'model', key } }),
  addModel: () => {
    const model = createModel();

    set((state) => ({
      project: { ...state.project, models: [...state.project.models, model] },
      selectedElement: { kind: 'model', key: model.key },
    }));
  },
  updateModel: (key, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        models: updateModelInList(state.project.models, key, patch),
      },
    })),
  removeModel: (key) =>
    set((state) => {
      const models = removeModelFromList(state.project.models, key);
      const menus = clearModelRefsInMenus(state.project.menus, key);

      return {
        project: { ...state.project, models, menus },
        selectedElement: isDangling(state.selectedElement, key)
          ? null
          : state.selectedElement,
      };
    }),
  resetModels: () =>
    set((state) => {
      const models = structuredClone(BASELINE.models);

      return {
        project: { ...state.project, models },
        selectedElement: survivesIn(state.selectedElement, models)
          ? state.selectedElement
          : null,
      };
    }),
  selectField: (modelKey, fieldKey) =>
    set({
      selectedElement: { kind: 'field', key: fieldKey, owner: modelKey },
    }),
  addField: (modelKey) =>
    set((state) => {
      const model = findModel(state.project.models, modelKey);
      if (!model) return state;

      const field = createField(model);

      return {
        project: {
          ...state.project,
          models: addFieldToModel(state.project.models, modelKey, field),
        },
        selectedElement: { kind: 'field', key: field.key, owner: modelKey },
      };
    }),
  updateField: (modelKey, fieldKey, patch) =>
    set((state) => {
      const model = findModel(state.project.models, modelKey);
      const field = model?.fields.find((item) => item.key === fieldKey);

      // 换类型要连带的 options / relation 一次性算好，避免 UI 与校验各说各话
      const resolved =
        patch.type && field
          ? withTypeApplied(field, patch.type, state.project.models)
          : {};

      return {
        project: {
          ...state.project,
          models: updateFieldInModel(state.project.models, modelKey, fieldKey, {
            ...resolved,
            ...patch,
          }),
        },
      };
    }),
  removeField: (modelKey, fieldKey) =>
    set((state) => ({
      project: {
        ...state.project,
        models: removeFieldFromModel(state.project.models, modelKey, fieldKey),
      },
      selectedElement: isDangling(state.selectedElement, modelKey, fieldKey)
        ? null
        : state.selectedElement,
    })),
  moveField: (modelKey, fieldKey, offset) =>
    set((state) => ({
      project: {
        ...state.project,
        models: moveFieldInModel(
          state.project.models,
          modelKey,
          fieldKey,
          offset,
        ),
      },
    })),
  resetFields: (modelKey) =>
    set((state) => ({
      project: {
        ...state.project,
        models: state.project.models.map((model) =>
          model.key !== modelKey
            ? model
            : {
                ...model,
                fields: model.fields.map((field) =>
                  restoreField(field, modelKey),
                ),
              },
        ),
      },
    })),
  selectBlock: (menuKey, blockId) =>
    set({ selectedElement: { kind: 'block', key: blockId, owner: menuKey } }),
  addBlock: (menuKey, type) =>
    set((state) => {
      const pages = ensurePages(state.project, menuKey);
      if (!canAddBlock(getPageBlocks(pages, menuKey), type)) return state;

      const block = createBlock(type);
      return {
        project: {
          ...state.project,
          pages: insertBlock(pages, menuKey, block),
        },
        selectedElement: { kind: 'block', key: block.id, owner: menuKey },
      };
    }),
  updateBlock: (menuKey, blockId, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        pages: patchBlockProps(
          ensurePages(state.project, menuKey),
          menuKey,
          blockId,
          patch,
        ),
      },
    })),
  removeBlock: (menuKey, blockId) =>
    set((state) => ({
      project: {
        ...state.project,
        pages: removeBlockFromPage(
          ensurePages(state.project, menuKey),
          menuKey,
          blockId,
        ),
      },
      selectedElement:
        state.selectedElement?.kind === 'block' &&
        state.selectedElement.key === blockId
          ? null
          : state.selectedElement,
    })),
  moveBlock: (menuKey, blockId, offset) =>
    set((state) => ({
      project: {
        ...state.project,
        pages: moveBlockInPage(
          ensurePages(state.project, menuKey),
          menuKey,
          blockId,
          offset,
        ),
      },
    })),
  toggleBlockVisible: (menuKey, blockId) =>
    set((state) => ({
      project: {
        ...state.project,
        pages: toggleBlockVisibleInPage(
          ensurePages(state.project, menuKey),
          menuKey,
          blockId,
        ),
      },
    })),
  reorderBlocks: (menuKey, orderedIds) =>
    set((state) => ({
      project: {
        ...state.project,
        pages: reorderBlocksInPage(
          ensurePages(state.project, menuKey),
          menuKey,
          orderedIds,
        ),
      },
    })),
  resetPage: (menuKey) =>
    set((state) => ({
      project: {
        ...state.project,
        pages: (state.project.pages ?? []).filter(
          (page) => page.menuKey !== menuKey,
        ),
      },
      selectedElement:
        state.selectedElement?.kind === 'block' &&
        state.selectedElement.owner === menuKey
          ? null
          : state.selectedElement,
    })),
  applyTemplate: (menuKey, templateId) =>
    set((state) => {
      const template = findTemplate(templateId);
      if (!template) return state;

      return {
        project: {
          ...state.project,
          pages: upsertPage(
            state.project.pages ?? [],
            menuKey,
            template.build(state.project, menuKey),
          ),
        },
        selectedElement: null,
      };
    }),
  replaceProject: (project) =>
    set(() => ({
      project,
      activeMenuKey: findFallbackMenuKey(project.menus),
      selectedElement: null,
    })),
}));
