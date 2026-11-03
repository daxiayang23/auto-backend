import type { MouseEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditableBox from './EditableBox';
import PageRenderer from '../components/PageRenderer';
import { BLOCK_ICON_MAP } from '../registry/blockIcons';
import { COMPONENT_MAP } from '../registry/componentLibrary';
import { TEMPLATES } from '../registry/dashboardTemplates';
import {
  findMenuByKey,
  hasStoredPage,
  resolvePage,
} from '../registry/generatePage';
import { useProjectStore } from '../store/projectStore';
import type { PageBlock } from '../schema/types';

interface CanvasBlockProps {
  block: PageBlock;
  index: number;
  total: number;
  menuKey: string;
  content: ReactNode;
  onSelect: () => void;
  onMove: (offset: -1 | 1) => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}

/**
 * 画布上单个组件：外面一层负责 dnd-kit 的排序，里面一层复用 EditableBox 的选中壳。
 * 拖拽只认左侧手柄，块里的按钮、输入框照常可用。
 */
const CanvasBlock = ({
  block,
  index,
  total,
  menuKey,
  content,
  onSelect,
  onMove,
  onToggleVisible,
  onRemove,
}: CanvasBlockProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const hidden = block.visible === false;
  const stop = (event: MouseEvent) => event.stopPropagation();
  const def = COMPONENT_MAP[block.type];

  return (
    <div
      ref={setNodeRef}
      className={
        isDragging ? 'canvas-block-wrap is-dragging' : 'canvas-block-wrap'
      }
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <EditableBox
        className={hidden ? 'canvas-block is-hidden' : 'canvas-block'}
        label={def?.label ?? block.type}
        target={{ kind: 'block', key: block.id, owner: menuKey }}
        onClick={onSelect}
        actions={
          <div onClick={stop}>
            <Tooltip title="拖动排序">
              <button
                type="button"
                ref={setActivatorNodeRef}
                className="canvas-drag-handle"
                {...attributes}
                {...listeners}
              >
                <HolderOutlined />
              </button>
            </Tooltip>
            <Tooltip title="上移">
              <Button
                size="small"
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={index <= 0}
                onClick={() => onMove(-1)}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                size="small"
                type="text"
                icon={<ArrowDownOutlined />}
                disabled={index >= total - 1}
                onClick={() => onMove(1)}
              />
            </Tooltip>
            <Tooltip title={hidden ? '显示' : '隐藏'}>
              <Button
                size="small"
                type="text"
                icon={hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={onToggleVisible}
              />
            </Tooltip>
            <Popconfirm
              title="删除该组件？"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={onRemove}
            >
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </div>
        }
      >
        {content}
      </EditableBox>
    </div>
  );
};

/** 编辑态画布：与预览共用同一套 PageRenderer，只在外面套可编辑外壳 */
const PageCanvas = () => {
  const project = useProjectStore((state) => state.project);
  const menuKey = useProjectStore((state) => state.activeMenuKey);
  const selectBlock = useProjectStore((state) => state.selectBlock);
  const addBlock = useProjectStore((state) => state.addBlock);
  const removeBlock = useProjectStore((state) => state.removeBlock);
  const moveBlock = useProjectStore((state) => state.moveBlock);
  const reorderBlocks = useProjectStore((state) => state.reorderBlocks);
  const toggleBlockVisible = useProjectStore(
    (state) => state.toggleBlockVisible,
  );
  const resetPage = useProjectStore((state) => state.resetPage);
  const applyTemplate = useProjectStore((state) => state.applyTemplate);
  const setEditorTab = useProjectStore((state) => state.setEditorTab);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const blocks = useMemo(
    () => resolvePage(project, menuKey),
    [project, menuKey],
  );
  const blockIds = useMemo(() => blocks.map((block) => block.id), [blocks]);
  const menu = findMenuByKey(project.menus, menuKey);
  const customized = hasStoredPage(project, menuKey);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveId(String(active.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const from = blockIds.indexOf(String(active.id));
    const to = blockIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    reorderBlocks(menuKey, arrayMove(blockIds, from, to));
  };

  const wrapBlock = (block: PageBlock, content: ReactNode) => (
    <CanvasBlock
      key={block.id}
      block={block}
      index={blocks.findIndex((item) => item.id === block.id)}
      total={blocks.length}
      menuKey={menuKey}
      content={content}
      onSelect={() => selectBlock(menuKey, block.id)}
      onMove={(offset) => moveBlock(menuKey, block.id, offset)}
      onToggleVisible={() => toggleBlockVisible(menuKey, block.id)}
      onRemove={() => removeBlock(menuKey, block.id)}
    />
  );

  const activeBlock = activeId
    ? blocks.find((block) => block.id === activeId)
    : undefined;

  return (
    <div className="page-canvas">
      <div className="canvas-head">
        <div className="canvas-head-text">
          <Typography.Text strong>
            {menu?.label ?? '未选择页面'}
          </Typography.Text>
          <Typography.Text type="secondary">
            {' '}
            · {blocks.length} 个组件
            {customized ? ' · 已自定义' : ' · 由模型自动生成'}
          </Typography.Text>
        </div>
        <Space size={6}>
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            onClick={() => setTemplateOpen(true)}
          >
            页面模板
          </Button>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setEditorTab('library')}
          >
            添加组件
          </Button>
          <Popconfirm
            title="恢复默认页面？"
            description="手工添加与修改的组件都会丢失"
            okText="恢复"
            cancelText="取消"
            onConfirm={() => resetPage(menuKey)}
          >
            <Button size="small">恢复默认</Button>
          </Popconfirm>
        </Space>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext
          items={blockIds}
          strategy={verticalListSortingStrategy}
        >
          <PageRenderer
            key={menuKey}
            project={project}
            menuKey={menuKey}
            blocks={blocks}
            includeHidden
            wrapBlock={wrapBlock}
          />
        </SortableContext>

        <DragOverlay>
          {activeBlock ? (
            <div className="canvas-drag-preview">
              <span className="canvas-drag-preview-icon">
                {
                  BLOCK_ICON_MAP[
                    COMPONENT_MAP[activeBlock.type]?.icon ?? 'card'
                  ]
                }
              </span>
              {COMPONENT_MAP[activeBlock.type]?.label ?? activeBlock.type}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 快捷添加区：常用组件一键追加，不必每次切到组件库 */}
      <div className="canvas-quick-add">
        <Typography.Text type="secondary">快速添加：</Typography.Text>
        {(
          [
            'breadcrumb',
            'searchBox',
            'filterForm',
            'alertNotice',
            'statCards',
            'chart',
          ] as const
        ).map((type) => (
          <Button
            key={type}
            size="small"
            onClick={() => addBlock(menuKey, type)}
          >
            + {COMPONENT_MAP[type].label}
          </Button>
        ))}
      </div>

      <Modal
        title="选择页面模板"
        open={templateOpen}
        width={720}
        onCancel={() => setTemplateOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" className="template-modal-hint">
          套用模板会替换「{menu?.label ?? '当前页面'}
          」现有的全部组件，之后再在画布上微调即可。
        </Typography.Paragraph>

        <div className="template-grid">
          {TEMPLATES.map((template) => {
            const blocked = Boolean(template.needsModel) && !menu?.modelKey;

            return (
              <button
                type="button"
                key={template.id}
                className={
                  blocked ? 'template-card is-disabled' : 'template-card'
                }
                disabled={blocked}
                onClick={() => {
                  applyTemplate(menuKey, template.id);
                  setTemplateOpen(false);
                }}
              >
                <span className="template-card-icon">
                  {BLOCK_ICON_MAP[template.icon]}
                </span>
                <span className="template-card-body">
                  <b>{template.label}</b>
                  <small>{template.description}</small>
                  {blocked ? (
                    <Tag className="template-card-tag">需先绑定模型</Tag>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default PageCanvas;
