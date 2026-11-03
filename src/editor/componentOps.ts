import { COMPONENT_MAP } from '../registry/componentLibrary';
import { generateDefaultPage } from '../registry/generatePage';
import type {
  BlockProps,
  BlockType,
  PageBlock,
  PageSchema,
  ProjectSchema,
} from '../schema/types';

/**
 * 页面配置懒固化：派生页面只在第一次编辑时写进 project.pages，
 * 之后所有改动都作用在存储的配置上，不会再被自动生成的默认值覆盖。
 */
export const ensurePages = (
  project: ProjectSchema,
  menuKey: string,
): PageSchema[] => {
  const pages = project.pages ? [...project.pages] : [];
  if (!pages.some((page) => page.menuKey === menuKey)) {
    pages.push(generateDefaultPage(project, menuKey));
  }
  return pages;
};

const mapPage = (
  pages: PageSchema[],
  menuKey: string,
  transform: (blocks: PageBlock[]) => PageBlock[],
): PageSchema[] =>
  pages.map((page) =>
    page.menuKey === menuKey
      ? { ...page, blocks: transform(page.blocks) }
      : page,
  );

export const getPageBlocks = (
  pages: PageSchema[] | undefined,
  menuKey: string,
): PageBlock[] => pages?.find((page) => page.menuKey === menuKey)?.blocks ?? [];

export const canAddBlock = (blocks: PageBlock[], type: BlockType): boolean =>
  !COMPONENT_MAP[type].singleton ||
  !blocks.some((block) => block.type === type);

export const insertBlock = (
  pages: PageSchema[],
  menuKey: string,
  block: PageBlock,
  atIndex?: number,
): PageSchema[] =>
  mapPage(pages, menuKey, (blocks) => {
    if (!canAddBlock(blocks, block.type)) return blocks;
    const next = [...blocks];
    const index =
      atIndex === undefined
        ? next.length
        : Math.max(0, Math.min(atIndex, next.length));
    next.splice(index, 0, block);
    return next;
  });

export const patchBlockProps = (
  pages: PageSchema[],
  menuKey: string,
  blockId: string,
  patch: BlockProps,
): PageSchema[] =>
  mapPage(pages, menuKey, (blocks) =>
    blocks.map((block) =>
      block.id === blockId
        ? { ...block, props: { ...block.props, ...patch } }
        : block,
    ),
  );

export const removeBlock = (
  pages: PageSchema[],
  menuKey: string,
  blockId: string,
): PageSchema[] =>
  mapPage(pages, menuKey, (blocks) =>
    blocks.filter((block) => block.id !== blockId),
  );

export const moveBlock = (
  pages: PageSchema[],
  menuKey: string,
  blockId: string,
  offset: -1 | 1,
): PageSchema[] =>
  mapPage(pages, menuKey, (blocks) => {
    const from = blocks.findIndex((block) => block.id === blockId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= blocks.length) return blocks;
    const next = [...blocks];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });

/** 拖拽结束按新 id 顺序重排；id 对不上（例如中途删了块）就保持原序，宁可不改也不丢块 */
export const reorderBlocks = (
  pages: PageSchema[],
  menuKey: string,
  orderedIds: string[],
): PageSchema[] =>
  mapPage(pages, menuKey, (blocks) => {
    const byId = new Map(blocks.map((block) => [block.id, block]));
    const next = orderedIds
      .map((id) => byId.get(id))
      .filter((block): block is PageBlock => Boolean(block));

    return next.length === blocks.length ? next : blocks;
  });

/** 整体替换页面的组件列表：用于应用模板 */
export const upsertPage = (
  pages: PageSchema[],
  menuKey: string,
  blocks: PageBlock[],
): PageSchema[] => {
  if (!pages.some((page) => page.menuKey === menuKey)) {
    return [...pages, { menuKey, blocks }];
  }
  return mapPage(pages, menuKey, () => blocks);
};

export const toggleBlockVisible = (
  pages: PageSchema[],
  menuKey: string,
  blockId: string,
): PageSchema[] =>
  mapPage(pages, menuKey, (blocks) =>
    blocks.map((block) =>
      block.id === blockId
        ? { ...block, visible: block.visible === false }
        : block,
    ),
  );

/** 删除菜单时把孤儿页面配置一并清掉，保持 Schema 校验可通过 */
export const dropPages = (
  pages: PageSchema[] | undefined,
  menuKeys: string[],
): PageSchema[] =>
  pages?.filter((page) => !menuKeys.includes(page.menuKey)) ?? [];
