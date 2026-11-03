import { nanoid } from 'nanoid';
import type { MenuSchema } from '../schema/types';

/**
 * 菜单树的一整套不可变操作。
 * 全部是纯函数，不碰 store、不碰 React，方便单独测试与复用。
 */

export const createMenuNode = (label = '新菜单'): MenuSchema => ({
  key: `menu_${nanoid(6)}`,
  label,
  icon: 'file',
});

export const findMenu = (
  menus: MenuSchema[],
  key: string,
): MenuSchema | undefined => {
  for (const menu of menus) {
    if (menu.key === key) return menu;
    if (menu.children) {
      const found = findMenu(menu.children, key);
      if (found) return found;
    }
  }
  return undefined;
};

export const updateMenuInTree = (
  menus: MenuSchema[],
  key: string,
  patch: Partial<MenuSchema>,
): MenuSchema[] =>
  menus.map((menu) => {
    if (menu.key === key) {
      return { ...menu, ...patch };
    }
    if (menu.children) {
      return { ...menu, children: updateMenuInTree(menu.children, key, patch) };
    }
    return menu;
  });

/** parentKey 为 null 时插入到根级末尾 */
export const insertMenuInTree = (
  menus: MenuSchema[],
  parentKey: string | null,
  node: MenuSchema,
): MenuSchema[] => {
  if (parentKey === null) return [...menus, node];

  return menus.map((menu) => {
    if (menu.key === parentKey) {
      return { ...menu, children: [...(menu.children ?? []), node] };
    }
    if (menu.children) {
      return {
        ...menu,
        children: insertMenuInTree(menu.children, parentKey, node),
      };
    }
    return menu;
  });
};

export const removeMenuFromTree = (
  menus: MenuSchema[],
  key: string,
): MenuSchema[] =>
  menus
    .filter((menu) => menu.key !== key)
    .map((menu) =>
      menu.children
        ? { ...menu, children: removeMenuFromTree(menu.children, key) }
        : menu,
    );

const swapInList = (
  list: MenuSchema[],
  key: string,
  offset: -1 | 1,
): MenuSchema[] => {
  const index = list.findIndex((menu) => menu.key === key);
  const target = index + offset;

  if (index < 0 || target < 0 || target >= list.length) return list;

  const next = [...list];
  const moved = next[index]!;
  next[index] = next[target]!;
  next[target] = moved;
  return next;
};

/** 只在同一层级内移动，跨层级拖拽留到画布阶段再做 */
export const moveMenuInTree = (
  menus: MenuSchema[],
  key: string,
  offset: -1 | 1,
): MenuSchema[] => {
  if (menus.some((menu) => menu.key === key)) {
    return swapInList(menus, key, offset);
  }
  return menus.map((menu) =>
    menu.children
      ? { ...menu, children: moveMenuInTree(menu.children, key, offset) }
      : menu,
  );
};

export const canMoveMenu = (
  menus: MenuSchema[],
  key: string,
  offset: -1 | 1,
): boolean => {
  const index = menus.findIndex((menu) => menu.key === key);

  if (index >= 0) {
    const target = index + offset;
    return target >= 0 && target < menus.length;
  }

  return menus.some(
    (menu) => menu.children && canMoveMenu(menu.children, key, offset),
  );
};

/**
 * 拖拽用的扁平视图：树在编辑态全展开，扁平后每一项都带 depth / parentId，
 * dnd-kit 只需要对一维数组排序，层级由 depth 投影回来决定。
 */
export interface FlatMenu {
  id: string;
  menu: MenuSchema;
  depth: number;
  parentId: string | null;
}

export const flattenMenus = (
  menus: MenuSchema[],
  parentId: string | null = null,
  depth = 0,
): FlatMenu[] =>
  menus.reduce<FlatMenu[]>((acc, menu) => {
    acc.push({ id: menu.key, menu, depth, parentId });
    if (menu.children?.length) {
      acc.push(...flattenMenus(menu.children, menu.key, depth + 1));
    }
    return acc;
  }, []);

/**
 * 扁平视图还原成树。
 * 不能依赖「父一定排在子前面」——拖拽过程中子项可能被排到父项之前，
 * 所以先建节点与父子索引，再按 parentId 递归组装；顺便用 seen 挡掉环。
 */
export const buildMenus = (flat: FlatMenu[]): MenuSchema[] => {
  const nodes = new Map<string, MenuSchema>();
  const childIds = new Map<string | null, string[]>();

  flat.forEach((item) => {
    const node: MenuSchema = { ...item.menu };
    delete node.children;
    nodes.set(item.id, node);

    const parentId = item.parentId ?? null;
    const siblings = childIds.get(parentId) ?? [];
    siblings.push(item.id);
    childIds.set(parentId, siblings);
  });

  const build = (parentId: string | null, seen: Set<string>): MenuSchema[] =>
    (childIds.get(parentId) ?? []).flatMap((id) => {
      const node = nodes.get(id);
      if (!node || seen.has(id)) return [];

      const children = build(id, new Set(seen).add(id));
      if (children.length) node.children = children;
      return [node];
    });

  return build(null, new Set<string>());
};

/** 从根到目标菜单的 label 路径，用于自动生成面包屑与页面标题 */
export const findMenuPath = (
  menus: MenuSchema[],
  key: string,
): string[] | null => {
  for (const menu of menus) {
    if (menu.key === key) return [menu.label];
    if (menu.children) {
      const rest = findMenuPath(menu.children, key);
      if (rest) return [menu.label, ...rest];
    }
  }
  return null;
};

/** key 是否在 ancestorKey 的子树里，用于阻止把父菜单拖进自己的子菜单 */
export const isDescendant = (
  menus: MenuSchema[],
  ancestorKey: string,
  key: string,
): boolean => {
  const ancestor = findMenu(menus, ancestorKey);
  if (!ancestor?.children) return false;
  return Boolean(findMenu(ancestor.children, key));
};

/** 删除后的落点：优先第一个挂载模型的菜单，否则第一个菜单 */
export const findFallbackMenuKey = (menus: MenuSchema[]): string => {
  for (const menu of menus) {
    if (menu.modelKey) return menu.key;
    if (menu.children) {
      const found = findFallbackMenuKey(menu.children);
      if (found) return found;
    }
  }
  return menus[0]?.key ?? '';
};
