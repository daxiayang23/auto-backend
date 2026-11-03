import { useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Button, Input, Popconfirm, Tag, Tooltip } from 'antd';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditableBox from './EditableBox';
import IconPicker from './IconPicker';
import { buildMenus, canMoveMenu, flattenMenus, isDescendant } from './menuOps';
import type { FlatMenu } from './menuOps';
import type { MenuIconKey, MenuSchema } from '../schema/types';
import { MENU_ICON_MAP } from '../registry/menuIcons';
import { useProjectStore } from '../store/projectStore';

/** 每一级缩进的像素，左右拖动时按它换算层级 */
const INDENT = 16;

interface Projection {
  depth: number;
  parentId: string | null;
}

/**
 * 拖拽的目标位置：先把扁平列表按 over 位置排一遍，
 * 再根据「上一项的深度 / 下一项的深度」把层级夹在合法区间里。
 */
const getProjection = (
  flat: FlatMenu[],
  activeId: string,
  overId: string,
  dragDepth: number,
): Projection | null => {
  const activeIndex = flat.findIndex((item) => item.id === activeId);
  const overIndex = flat.findIndex((item) => item.id === overId);
  if (activeIndex < 0 || overIndex < 0) return null;

  const activeItem = flat[activeIndex]!;
  const sorted = arrayMove(flat, activeIndex, overIndex);
  const previous = sorted[overIndex - 1];
  const next = sorted[overIndex + 1];

  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previous ? previous.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;
  const depth = Math.min(Math.max(projectedDepth, minDepth), maxDepth);

  const parentId = ((): string | null => {
    if (depth === 0 || !previous) return null;
    if (depth === previous.depth) return previous.parentId;
    if (depth > previous.depth) return previous.id;
    return (
      sorted
        .slice(0, overIndex)
        .reverse()
        .find((item) => item.depth === depth)?.parentId ?? null
    );
  })();

  return { depth, parentId };
};

interface SortableMenuNodeProps {
  item: FlatMenu;
  selected: boolean;
  editing: boolean;
  draft: string;
  actions: ReactNode;
  onSelect: () => void;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}

const SortableMenuNode = ({
  item,
  selected,
  editing,
  draft,
  actions,
  onSelect,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
}: SortableMenuNodeProps) => {
  const updateMenu = useProjectStore((state) => state.updateMenu);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'menu-sortable is-dragging' : 'menu-sortable'}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <EditableBox
        className="menu-node"
        label={item.menu.children?.length ? '菜单分组' : '菜单项'}
        target={{ kind: 'menu', key: item.id }}
        selected={selected}
        onClick={onSelect}
        onDoubleClick={onStartEdit}
        actions={actions}
      >
        <div
          className="menu-node-main"
          style={{ paddingLeft: item.depth * INDENT }}
        >
          <span
            ref={setActivatorNodeRef}
            className="menu-drag-handle"
            {...attributes}
            {...listeners}
          >
            <HolderOutlined />
          </span>

          <IconPicker
            value={item.menu.icon}
            onChange={(icon: MenuIconKey) => updateMenu(item.id, { icon })}
          />

          {editing ? (
            <Input
              size="small"
              autoFocus
              className="menu-node-input"
              value={draft}
              maxLength={12}
              onChange={(event) => onDraftChange(event.target.value)}
              onBlur={onCommitEdit}
              onClick={stop}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onCommitEdit();
                if (event.key === 'Escape') onCancelEdit();
              }}
            />
          ) : (
            <span className="menu-node-label">{item.menu.label}</span>
          )}

          {item.menu.modelKey ? (
            <Tag className="menu-node-model" color="blue">
              {item.menu.modelKey}
            </Tag>
          ) : (
            <span className="menu-node-unbound">未绑定</span>
          )}
        </div>
      </EditableBox>
    </div>
  );
};

/**
 * 编辑态的菜单：不复用 antd Menu，改由 MenuSchema 直接自绘。
 * 原因是 Menu 的 item 里塞输入框会打架，而编辑态要的是「每一项都能就地改」。
 * 预览态仍然走 antd Menu，两边共用同一份数据。
 */
const MenuTreeEditor = () => {
  const menus = useProjectStore((state) => state.project.menus);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const selectedKey = useProjectStore((state) =>
    state.selectedElement?.kind === 'menu' ? state.selectedElement.key : '',
  );
  const selectMenu = useProjectStore((state) => state.selectMenu);
  const updateMenu = useProjectStore((state) => state.updateMenu);
  const addMenu = useProjectStore((state) => state.addMenu);
  const removeMenu = useProjectStore((state) => state.removeMenu);
  const moveMenu = useProjectStore((state) => state.moveMenu);
  const resetMenus = useProjectStore((state) => state.resetMenus);
  const replaceMenus = useProjectStore((state) => state.replaceMenus);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragDepth, setDragDepth] = useState(0);
  /** 拖动过程中的预览树，松手才写进 Schema */
  const [preview, setPreview] = useState<MenuSchema[] | null>(null);
  /** 最后一次合法落点，onDragEnd 拿不到 over 时用它兜底 */
  const lastPreview = useRef<MenuSchema[] | null>(null);

  const displayMenus = preview ?? menus;
  const flat = useMemo(() => flattenMenus(displayMenus), [displayMenus]);
  const flatIds = useMemo(() => flat.map((item) => item.id), [flat]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const commitEdit = () => {
    if (!editingKey) return;
    const label = draft.trim();
    if (label) updateMenu(editingKey, { label });
    setEditingKey(null);
  };

  /** 算出拖拽落点并生成新树；不合法（拖进自己的子树）时返回 null */
  const projectMove = (
    active: string,
    over: string | null,
    depthOffset: number,
  ): MenuSchema[] | null => {
    if (!over || active === over) return null;

    const projection = getProjection(flat, active, over, depthOffset);
    if (!projection) return null;

    if (projection.parentId) {
      if (projection.parentId === active) return null;
      if (isDescendant(displayMenus, active, projection.parentId)) return null;
    }

    const activeIndex = flat.findIndex((item) => item.id === active);
    const moved = flat.map((item) =>
      item.id === active ? { ...item, ...projection } : item,
    );

    return buildMenus(
      arrayMove(
        moved,
        activeIndex,
        moved.findIndex((item) => item.id === over),
      ),
    );
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragDepth(0);
  };

  const handleDragMove = ({ delta }: DragMoveEvent) => {
    setDragDepth(Math.round(delta.x / INDENT));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const next = projectMove(
      String(active.id),
      over ? String(over.id) : null,
      dragDepth,
    );
    if (next) {
      lastPreview.current = next;
      setPreview(next);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    // 松手瞬间 over 可能落空，用拖动过程中最后一次合法落点提交
    const next =
      projectMove(
        String(active.id),
        over ? String(over.id) : null,
        dragDepth,
      ) ?? lastPreview.current;

    if (next) replaceMenus(next);

    lastPreview.current = null;
    setPreview(null);
    setActiveId(null);
    setDragDepth(0);
  };

  const handleDragCancel = () => {
    lastPreview.current = null;
    setPreview(null);
    setActiveId(null);
    setDragDepth(0);
  };

  const activeMenu = activeId
    ? flat.find((item) => item.id === activeId)?.menu
    : undefined;

  const renderActions = (menu: MenuSchema) => {
    const stop = (event: MouseEvent) => event.stopPropagation();

    return (
      <>
        <Tooltip title="新增子菜单">
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={(event) => {
              stop(event);
              addMenu(menu.key);
            }}
          />
        </Tooltip>
        <Tooltip title="上移">
          <Button
            size="small"
            type="text"
            icon={<ArrowUpOutlined />}
            disabled={!canMoveMenu(menus, menu.key, -1)}
            onClick={(event) => {
              stop(event);
              moveMenu(menu.key, -1);
            }}
          />
        </Tooltip>
        <Tooltip title="下移">
          <Button
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            disabled={!canMoveMenu(menus, menu.key, 1)}
            onClick={(event) => {
              stop(event);
              moveMenu(menu.key, 1);
            }}
          />
        </Tooltip>
        <Popconfirm
          title="删除该菜单项？"
          description={
            menu.children?.length
              ? `其下 ${menu.children.length} 个子菜单会一并删除`
              : '删除后可在下方恢复默认菜单'
          }
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => removeMenu(menu.key)}
        >
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={stop}
          />
        </Popconfirm>
      </>
    );
  };

  return (
    <div className="menu-tree">
      <div className="menu-tree-head">
        <span>菜单结构</span>
        <span className="menu-tree-hint">双击改名 · 拖动排序</span>
      </div>

      <div className="menu-tree-body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={flatIds}
            strategy={verticalListSortingStrategy}
          >
            {flat.map((item) => (
              <SortableMenuNode
                key={item.id}
                item={item}
                selected={item.id === activeMenuKey || item.id === selectedKey}
                editing={editingKey === item.id}
                draft={draft}
                actions={renderActions(item.menu)}
                onSelect={() => selectMenu(item.id)}
                onStartEdit={() => {
                  setEditingKey(item.id);
                  setDraft(item.menu.label);
                }}
                onDraftChange={setDraft}
                onCommitEdit={commitEdit}
                onCancelEdit={() => setEditingKey(null)}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeMenu ? (
              <div className="menu-drag-preview">
                {MENU_ICON_MAP[activeMenu.icon ?? 'file']}
                <span>{activeMenu.label}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="menu-tree-footer">
        <Button
          block
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addMenu()}
        >
          新增菜单项
        </Button>
        <Popconfirm
          title="恢复默认菜单？"
          description="当前新增、改名、排序都会丢失"
          okText="恢复"
          cancelText="取消"
          onConfirm={resetMenus}
        >
          <Button block size="small" icon={<RollbackOutlined />}>
            恢复默认
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};

export default MenuTreeEditor;
