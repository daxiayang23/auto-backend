import { createBlock } from './componentLibrary';
import { findTemplate } from './dashboardTemplates';
import { generateCrudPage } from './generateCrud';
import { findMenu, findMenuPath } from '../editor/menuOps';
import type {
  BlockProps,
  BlockType,
  PageBlock,
  PageSchema,
  ProjectSchema,
} from '../schema/types';

export const findMenuByKey = findMenu;

/**
 * 模型 → 默认页面组件列表。这是「生成优先」的落点：
 * 未做任何手工配置的菜单，页面完全由这里的规则实时派生。
 *
 * 注意：派生块的 id 必须是确定性的。否则用户选中一个自动生成的组件后，
 * 第一次改属性会触发页面固化，随机 id 一变就找不到刚才选中的那个块了。
 */
export const generateDefaultBlocks = (
  project: ProjectSchema,
  menuKey: string,
): PageBlock[] => {
  const menu = findMenuByKey(project.menus, menuKey);
  const path =
    findMenuPath(project.menus, menuKey) ?? (menu ? [menu.label] : []);
  const label = menu?.label ?? '页面';
  const model = project.models.find((item) => item.key === menu?.modelKey);
  const page = model ? generateCrudPage(model) : undefined;

  const auto = (
    type: BlockType,
    index: number,
    patch?: BlockProps,
  ): PageBlock => {
    const block = createBlock(type);
    return {
      ...block,
      id: `auto_${menuKey}_${type}_${index}`,
      props: { ...block.props, ...patch },
    };
  };

  // 没绑模型的菜单直接给一套大屏：指标卡 + 图表 + 动态列表，
  // 比只丢一条「页面待建设」提示有用得多，用户再按需改或换模板。
  if (!page) {
    return findTemplate('overview')?.build(project, menuKey) ?? [];
  }

  return [
    auto('breadcrumb', 0, {
      items: ['首页', ...path],
      separator: '/',
      showHome: true,
    }),
    auto('pageHeader', 0, {
      title: label,
      subtitle: `由模型 ${model?.key} 自动生成 · ${page.columns.length} 列 · ${page.filters.length} 个筛选项`,
      extra: '',
      showBack: false,
      level: 3,
    }),
    auto('searchBox', 0),
    auto('filterForm', 0),
    auto('dataTable', 0),
  ];
};

export const generateDefaultPage = (
  project: ProjectSchema,
  menuKey: string,
): PageSchema => ({ menuKey, blocks: generateDefaultBlocks(project, menuKey) });

/**
 * 页面解析的唯一入口：有手工配置就用手工配置，否则实时派生默认页面。
 * 编辑态和预览态都调它，保证两边看到同一份组件列表。
 */
export const resolvePage = (
  project: ProjectSchema,
  menuKey: string,
): PageBlock[] =>
  project.pages?.find((item) => item.menuKey === menuKey)?.blocks ??
  generateDefaultBlocks(project, menuKey);

export const hasStoredPage = (
  project: ProjectSchema,
  menuKey: string,
): boolean => Boolean(project.pages?.some((item) => item.menuKey === menuKey));
