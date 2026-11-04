import type { MouseEvent } from 'react';
import { ApiOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip } from 'antd';
import EditableBox from './EditableBox';
import { API_METHOD_COLORS, countApiRefs } from './apiOps';
import { useProjectStore } from '../store/projectStore';

/** 编辑态侧边栏的接口列表：模型的建立依赖接口，这里是接口的「查 / 增 / 删」入口 */
const ApiListEditor = () => {
  const apis = useProjectStore((state) => state.project.apis);
  const models = useProjectStore((state) => state.project.models);
  const selectedKey = useProjectStore((state) =>
    state.selectedElement?.kind === 'api' ? state.selectedElement.key : '',
  );
  const selectApi = useProjectStore((state) => state.selectApi);
  const addApi = useProjectStore((state) => state.addApi);
  const removeApi = useProjectStore((state) => state.removeApi);

  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div className="menu-tree">
      <div className="menu-tree-head">
        <span>接口</span>
        <Tooltip title="新增接口">
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => addApi()}
          />
        </Tooltip>
      </div>

      <div className="menu-tree-body">
        {apis.map((api) => {
          const refs = countApiRefs(models, api.key);

          return (
            <EditableBox
              key={api.key}
              className="menu-node"
              label="接口"
              target={{ kind: 'api', key: api.key }}
              selected={api.key === selectedKey}
              onClick={() => selectApi(api.key)}
              actions={
                <Popconfirm
                  title="删除该接口？"
                  description={
                    refs
                      ? `有 ${refs} 个模型正绑定它，删除后这些模型需要重新绑定接口`
                      : '接口定义会被移除'
                  }
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => removeApi(api.key)}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={stop}
                  />
                </Popconfirm>
              }
            >
              <div className="menu-node-main">
                <ApiOutlined className="menu-node-icon" />
                <span className="menu-node-label">{api.name}</span>
                <Tag
                  color={API_METHOD_COLORS[api.method]}
                  className="menu-node-model"
                >
                  {api.method.toUpperCase()}
                </Tag>
              </div>
              <div className="api-node-path">{api.path}</div>
            </EditableBox>
          );
        })}
      </div>

      <div className="menu-tree-footer">
        <Button
          block
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addApi()}
        >
          新增接口
        </Button>
      </div>
    </div>
  );
};

export default ApiListEditor;
