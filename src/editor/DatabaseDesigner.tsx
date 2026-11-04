import { useMemo, useState } from 'react';
import {
  ApartmentOutlined,
  CodeOutlined,
  LayoutOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Button, Empty, Space, Tag, Tooltip, Typography } from 'antd';
import type { DatabaseSchema } from '../schema/types';
import { ensureDatabase } from './dbOps';
import TableCard from './dbDesigner/TableCard';
import RelationEdges from './dbDesigner/RelationEdges';
import TableStructureDrawer from './dbDesigner/TableStructureDrawer';
import RelationEditModal from './dbDesigner/RelationEditModal';
import SqlPreviewModal from './dbDesigner/SqlPreviewModal';
import { CARD_WIDTH, cardHeight } from './dbDesigner/geometry';
import { useProjectStore } from '../store/projectStore';

/**
 * 表编排主视图：ER 画布 + 表结构抽屉 + 关系弹窗 + SQL 预览。
 * 画布坐标存进 Schema，拖动松手才提交，中间态留在组件里。
 */
const DatabaseDesigner = () => {
  const project = useProjectStore((state) => state.project);
  const selectedTableKey = useProjectStore((state) => state.selectedDbTableKey);
  const selectedRelationId = useProjectStore(
    (state) => state.selectedDbRelationId,
  );
  const selectDbTable = useProjectStore((state) => state.selectDbTable);
  const selectDbRelation = useProjectStore((state) => state.selectDbRelation);
  const addDbTable = useProjectStore((state) => state.addDbTable);
  const moveDbTable = useProjectStore((state) => state.moveDbTable);
  const layoutDbTables = useProjectStore((state) => state.layoutDbTables);

  const [relationCreateOpen, setRelationCreateOpen] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);

  const database: DatabaseSchema = ensureDatabase(project.database);
  const selectedTable = database.tables.find(
    (table) => table.key === selectedTableKey,
  );
  const selectedRelation = database.relations.find(
    (relation) => relation.id === selectedRelationId,
  );

  // 画布尺寸按内容撑开，保证边缘的表也能滚动看到
  const canvasSize = useMemo(() => {
    let width = 0;
    let height = 0;
    database.tables.forEach((table) => {
      width = Math.max(width, table.x + CARD_WIDTH + 80);
      height = Math.max(height, table.y + cardHeight(table) + 80);
    });
    return { width: Math.max(width, 600), height: Math.max(height, 400) };
  }, [database.tables]);

  return (
    <div className="db-designer">
      <div className="db-toolbar">
        <Space size={6}>
          <Tooltip title="新建一张表">
            <Button
              size="small"
              icon={<TableOutlined />}
              onClick={() => addDbTable()}
            >
              新建表
            </Button>
          </Tooltip>
          <Tooltip title="连接两张表（1:1 / 1:N / M:N）">
            <Button
              size="small"
              icon={<ApartmentOutlined />}
              onClick={() => setRelationCreateOpen(true)}
            >
              新建关系
            </Button>
          </Tooltip>
          <Tooltip title="按依赖关系重新排布画布">
            <Button
              size="small"
              icon={<LayoutOutlined />}
              onClick={() => layoutDbTables()}
            >
              自动布局
            </Button>
          </Tooltip>
          <Tooltip title="生成可直接执行的建表 SQL">
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CodeOutlined />}
              onClick={() => setSqlOpen(true)}
            >
              生成 SQL
            </Button>
          </Tooltip>
        </Space>

        <Space size={6}>
          <Tag>{database.tables.length} 张表</Tag>
          <Tag>{database.relations.length} 条关系</Tag>
        </Space>
      </div>

      <div className="db-canvas-scroll">
        {database.tables.length ? (
          <div
            className="db-canvas"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <RelationEdges
              database={database}
              width={canvasSize.width}
              height={canvasSize.height}
              selectedId={selectedRelationId}
              onSelect={selectDbRelation}
            />

            {database.tables.map((table) => (
              <TableCard
                key={table.key}
                table={table}
                database={database}
                selected={table.key === selectedTableKey}
                onSelect={selectDbTable}
                onMove={moveDbTable}
              />
            ))}
          </div>
        ) : (
          <div className="stage-placeholder">
            <Empty
              description={
                <span>
                  画布还是空的：点上方「新建表」开始设计数据库，
                  建好后可一键生成 SQL 导入 MySQL / PostgreSQL
                </span>
              }
            >
              <Button
                type="primary"
                icon={<TableOutlined />}
                onClick={() => addDbTable()}
              >
                新建第一张表
              </Button>
            </Empty>
          </div>
        )}
      </div>

      <Typography.Text className="db-canvas-hint" type="secondary">
        拖动表标题移动位置 · 点击表卡片编辑结构 · 点击连线编辑关系
      </Typography.Text>

      {selectedTable ? (
        <TableStructureDrawer
          table={selectedTable}
          database={database}
          open
          onClose={() => selectDbTable(null)}
        />
      ) : null}

      <RelationEditModal
        open={relationCreateOpen || Boolean(selectedRelation)}
        relation={selectedRelation ?? undefined}
        database={database}
        onCancel={() => {
          setRelationCreateOpen(false);
          selectDbRelation(null);
        }}
      />

      <SqlPreviewModal
        open={sqlOpen}
        database={database}
        onCancel={() => setSqlOpen(false)}
      />
    </div>
  );
};

export default DatabaseDesigner;
