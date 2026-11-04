import type { MouseEvent } from 'react';
import { DeleteOutlined, PlusOutlined, TableOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip } from 'antd';
import { ensureDatabase } from './dbOps';
import { useProjectStore } from '../store/projectStore';

/** 编辑态侧边栏的表列表：点选后在画布中定位并打开结构抽屉 */
const DbTableListEditor = () => {
  const database = ensureDatabase(
    useProjectStore((state) => state.project.database),
  );
  const selectedKey = useProjectStore((state) => state.selectedDbTableKey);
  const selectDbTable = useProjectStore((state) => state.selectDbTable);
  const addDbTable = useProjectStore((state) => state.addDbTable);
  const removeDbTable = useProjectStore((state) => state.removeDbTable);

  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div className="menu-tree">
      <div className="menu-tree-head">
        <span>数据库表</span>
        <Tooltip title="新建表">
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => addDbTable()}
          />
        </Tooltip>
      </div>

      <div className="menu-tree-body">
        {database.tables.map((table) => (
          // 选中态走表编排自己的 selectedDbTableKey，不进全局 selectedElement
          <div
            key={table.key}
            className={`editable-box menu-node${
              table.key === selectedKey ? ' is-selected' : ''
            }`}
            onClick={() => selectDbTable(table.key)}
          >
            <span className="editable-tag">数据表</span>
            <div className="editable-actions">
              <Popconfirm
                title="删除该表？"
                description="表上挂的关系会一并删除"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => removeDbTable(table.key)}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={stop}
                />
              </Popconfirm>
            </div>
            <div className="menu-node-main">
              <TableOutlined className="menu-node-icon" />
              <span className="menu-node-label">{table.name}</span>
              <Tag className="menu-node-model">{table.columns.length}</Tag>
            </div>
          </div>
        ))}
      </div>

      <div className="menu-tree-footer">
        <Button
          block
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addDbTable()}
        >
          新建表
        </Button>
      </div>
    </div>
  );
};

export default DbTableListEditor;
