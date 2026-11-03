import type { MouseEvent } from 'react';
import {
  DeleteOutlined,
  DatabaseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip } from 'antd';
import EditableBox from './EditableBox';
import { countModelRefs } from './modelOps';
import { useProjectStore } from '../store/projectStore';

/** 编辑态侧边栏的模型列表：模型的「查 / 增 / 删」入口 */
const ModelListEditor = () => {
  const models = useProjectStore((state) => state.project.models);
  const menus = useProjectStore((state) => state.project.menus);
  const selectedKey = useProjectStore((state) =>
    state.selectedElement?.kind === 'model' ||
    state.selectedElement?.kind === 'field'
      ? state.selectedElement.kind === 'model'
        ? state.selectedElement.key
        : state.selectedElement.owner
      : '',
  );
  const selectModel = useProjectStore((state) => state.selectModel);
  const addModel = useProjectStore((state) => state.addModel);
  const removeModel = useProjectStore((state) => state.removeModel);
  const resetModels = useProjectStore((state) => state.resetModels);

  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div className="menu-tree">
      <div className="menu-tree-head">
        <span>数据模型</span>
        <Tooltip title="新增模型">
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => addModel()}
          />
        </Tooltip>
      </div>

      <div className="menu-tree-body">
        {models.map((model) => {
          const refs = countModelRefs(menus, model.key);

          return (
            <EditableBox
              key={model.key}
              className="menu-node"
              label="数据模型"
              target={{ kind: 'model', key: model.key }}
              selected={model.key === selectedKey}
              onClick={() => selectModel(model.key)}
              actions={
                <Popconfirm
                  title="删除该模型？"
                  description={
                    refs
                      ? `有 ${refs} 个菜单正绑定它，删除后这些菜单会变成未绑定`
                      : '模型下的字段会一并删除'
                  }
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => removeModel(model.key)}
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
                <DatabaseOutlined className="menu-node-icon" />
                <span className="menu-node-label">{model.name}</span>
                <Tag className="menu-node-model">{model.fields.length}</Tag>
              </div>
            </EditableBox>
          );
        })}
      </div>

      <div className="menu-tree-footer">
        <Button
          block
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addModel()}
        >
          新增模型
        </Button>
        <Popconfirm
          title="恢复默认模型？"
          description="当前新增与改动的模型会丢失"
          okText="恢复"
          cancelText="取消"
          onConfirm={resetModels}
        >
          <Button block size="small">
            恢复默认
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};

export default ModelListEditor;
