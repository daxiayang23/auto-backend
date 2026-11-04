import { useState } from 'react';
import {
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import type { DbColumn, DbTable, DatabaseSchema } from '../../schema/types';
import {
  dbTypeOptions,
  isColumnKeyTaken,
  isValidDbKey,
  typeHasLength,
  typeSupportsAutoIncrement,
  getTableRelations,
} from '../dbOps';
import { useProjectStore } from '../../store/projectStore';

const KIND_LABELS: Record<string, string> = {
  oneToOne: '一对一',
  oneToMany: '一对多',
  manyToMany: '多对多',
};

interface TableStructureDrawerProps {
  table: DbTable;
  database: DatabaseSchema;
  open: boolean;
  onClose: () => void;
}

/**
 * 表结构编辑抽屉：物理表名 / 备注 + 列清单。
 * 列名、类型、约束直接在表格里改，与 ModelFieldsPanel 同一套交互习惯。
 */
const TableStructureDrawer = ({
  table,
  database,
  open,
  onClose,
}: TableStructureDrawerProps) => {
  const updateDbTable = useProjectStore((state) => state.updateDbTable);
  const updateDbColumn = useProjectStore((state) => state.updateDbColumn);
  const removeDbColumn = useProjectStore((state) => state.removeDbColumn);
  const addDbColumn = useProjectStore((state) => state.addDbColumn);
  const removeDbTable = useProjectStore((state) => state.removeDbTable);
  const removeDbRelation = useProjectStore((state) => state.removeDbRelation);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const keyInvalid = (column: DbColumn): boolean => {
    const draft = drafts[column.key];
    if (draft === undefined) return false;
    const next = draft.trim();
    return !isValidDbKey(next) || isColumnKeyTaken(table, next, column.key);
  };

  const commitKey = (column: DbColumn) => {
    const draft = drafts[column.key];
    if (draft === undefined) return;

    const next = draft.trim();
    if (!keyInvalid(column) && next !== column.key) {
      updateDbColumn(table.key, column.key, { key: next });
    }

    setDrafts((prev) => {
      const rest = { ...prev };
      delete rest[column.key];
      return rest;
    });
  };

  const patch = (columnKey: string, value: Partial<DbColumn>) =>
    updateDbColumn(table.key, columnKey, value);

  const tableRelations = getTableRelations(database, table.key);
  const byKey = new Map(database.tables.map((item) => [item.key, item]));

  const columns: TableColumnsType<DbColumn> = [
    {
      key: 'key',
      title: '列名',
      width: 150,
      render: (_, column) => (
        <Input
          size="small"
          className="field-key-input"
          value={drafts[column.key] ?? column.key}
          status={keyInvalid(column) ? 'error' : undefined}
          onChange={(event) =>
            setDrafts((prev) => ({
              ...prev,
              [column.key]: event.target.value,
            }))
          }
          onBlur={() => commitKey(column)}
          onPressEnter={() => commitKey(column)}
        />
      ),
    },
    {
      key: 'dbType',
      title: '类型',
      width: 150,
      render: (_, column) => (
        <Select
          size="small"
          className="field-type-select"
          value={column.dbType}
          options={dbTypeOptions}
          onChange={(dbType) => patch(column.key, { dbType })}
        />
      ),
    },
    {
      key: 'length',
      title: '长度',
      width: 88,
      render: (_, column) =>
        typeHasLength(column.dbType) ? (
          <InputNumber
            size="small"
            min={1}
            max={65535}
            value={column.length}
            controls={false}
            style={{ width: '100%' }}
            onChange={(length) =>
              patch(column.key, { length: length ?? undefined })
            }
          />
        ) : (
          <span className="cell-empty">—</span>
        ),
    },
    {
      key: 'scale',
      title: '小数位',
      width: 76,
      render: (_, column) =>
        column.dbType === 'decimal' ? (
          <InputNumber
            size="small"
            min={0}
            max={30}
            value={column.scale}
            controls={false}
            style={{ width: '100%' }}
            onChange={(scale) =>
              patch(column.key, { scale: scale ?? undefined })
            }
          />
        ) : (
          <span className="cell-empty">—</span>
        ),
    },
    {
      key: 'nullable',
      title: '可空',
      width: 60,
      render: (_, column) => (
        <Switch
          size="small"
          checked={column.nullable ?? false}
          onChange={(nullable) => patch(column.key, { nullable })}
        />
      ),
    },
    {
      key: 'primary',
      title: '主键',
      width: 56,
      render: (_, column) => (
        <Checkbox
          checked={column.primary ?? false}
          onChange={(event) =>
            patch(column.key, { primary: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'autoIncrement',
      title: '自增',
      width: 56,
      render: (_, column) => (
        <Checkbox
          checked={column.autoIncrement ?? false}
          disabled={!typeSupportsAutoIncrement(column.dbType)}
          onChange={(event) =>
            patch(column.key, { autoIncrement: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'unique',
      title: '唯一',
      width: 56,
      render: (_, column) => (
        <Checkbox
          checked={column.unique ?? false}
          onChange={(event) =>
            patch(column.key, { unique: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'indexed',
      title: '索引',
      width: 56,
      render: (_, column) => (
        <Checkbox
          checked={column.indexed ?? false}
          onChange={(event) =>
            patch(column.key, { indexed: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'defaultValue',
      title: '默认值',
      width: 110,
      render: (_, column) => (
        <Input
          size="small"
          value={column.defaultValue ?? ''}
          placeholder="如 0 / pending"
          onChange={(event) =>
            patch(column.key, { defaultValue: event.target.value || undefined })
          }
        />
      ),
    },
    {
      key: 'label',
      title: '备注',
      width: 130,
      render: (_, column) => (
        <Input
          size="small"
          value={column.label ?? ''}
          onChange={(event) =>
            patch(column.key, { label: event.target.value || undefined })
          }
        />
      ),
    },
    {
      key: 'actions',
      title: '',
      width: 44,
      render: (_, column) => (
        <Popconfirm
          title="删除该列？"
          description="挂在该列上的关系会一并删除"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => removeDbColumn(table.key, column.key)}
        >
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={860}
      title={
        <div className="db-drawer-title">
          <span>表结构 ·</span>
          <Input
            className="db-table-name-input"
            size="small"
            value={table.name}
            status={isValidDbKey(table.name) ? undefined : 'error'}
            onChange={(event) =>
              updateDbTable(table.key, { name: event.target.value })
            }
          />
          <Typography.Text type="secondary" className="db-table-count">
            {table.columns.length} 列
          </Typography.Text>
        </div>
      }
    >
      <div className="db-drawer-comment">
        <Input
          value={table.comment ?? ''}
          placeholder="表备注（输出为 SQL COMMENT）"
          onChange={(event) =>
            updateDbTable(table.key, { comment: event.target.value })
          }
        />
      </div>

      <Table
        rowKey="key"
        size="small"
        columns={columns}
        dataSource={table.columns}
        pagination={false}
        scroll={{ x: 1000 }}
      />

      <Button
        className="db-column-add"
        block
        icon={<PlusOutlined />}
        onClick={() => addDbColumn(table.key)}
      >
        新增列
      </Button>

      <div className="db-drawer-relations">
        <Typography.Text strong>
          表关系（{tableRelations.length}）
        </Typography.Text>
        {tableRelations.length ? (
          <div className="db-relation-list">
            {tableRelations.map((relation) => {
              const other =
                relation.fromTable === table.key
                  ? byKey.get(relation.toTable)
                  : byKey.get(relation.fromTable);
              const isFrom = relation.fromTable === table.key;

              return (
                <div className="db-relation-row" key={relation.id}>
                  <Tag
                    color={relation.kind === 'manyToMany' ? 'purple' : 'blue'}
                  >
                    {KIND_LABELS[relation.kind]}
                  </Tag>
                  <span className="db-relation-desc">
                    {isFrom
                      ? `${relation.fromColumn} → ${other?.name ?? '?'}(${relation.toColumn})`
                      : `${other?.name ?? '?'}(${relation.fromColumn}) → ${relation.toColumn}`}
                  </span>
                  <Popconfirm
                    title="删除该关系？"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeDbRelation(relation.id)}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有关系：点画布上方的「新建关系」连接其他表"
          />
        )}
      </div>

      <div className="db-drawer-footer">
        <Popconfirm
          title="删除该表？"
          description="表上挂的所有关系会一并删除"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            removeDbTable(table.key);
            onClose();
          }}
        >
          <Button danger icon={<DeleteOutlined />}>
            删除表
          </Button>
        </Popconfirm>
        <Button icon={<ThunderboltOutlined />} onClick={onClose}>
          完成
        </Button>
      </div>
    </Drawer>
  );
};

export default TableStructureDrawer;
