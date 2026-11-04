import { useState } from 'react';
import type { MouseEvent } from 'react';
import {
  DatabaseOutlined,
  DeleteOutlined,
  LinkOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import EditableBox from './EditableBox';
import { countModelRefs } from './modelOps';
import { useProjectStore } from '../store/projectStore';

/**
 * 编辑态侧边栏的模型列表：模型的「查 / 增 / 删」入口。
 * 模型的建立依赖接口——新增模型必须先绑定一个接口（必填项）。
 */
const ModelListEditor = () => {
  const models = useProjectStore((state) => state.project.models);
  const apis = useProjectStore((state) => state.project.apis);
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
  const addApi = useProjectStore((state) => state.addApi);

  const [createOpen, setCreateOpen] = useState(false);
  const [chosenApi, setChosenApi] = useState<string | undefined>(undefined);
  const [modelName, setModelName] = useState('');

  const stop = (event: MouseEvent) => event.stopPropagation();

  const openCreate = () => {
    setChosenApi(apis[0]?.key);
    setModelName('');
    setCreateOpen(true);
  };

  const confirmCreate = () => {
    if (!chosenApi) return;
    addModel(chosenApi, modelName.trim() || undefined);
    setCreateOpen(false);
  };

  return (
    <div className="menu-tree">
      <div className="menu-tree-head">
        <span>数据模型</span>
        <Tooltip title="新增模型（需先绑定接口）">
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={openCreate}
          />
        </Tooltip>
      </div>

      <div className="menu-tree-body">
        {models.map((model) => {
          const refs = countModelRefs(menus, model.key);
          const boundApi = apis.find((api) => api.key === model.apiKey);

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
              <div className="api-node-path">
                {boundApi ? (
                  <>
                    <LinkOutlined /> {boundApi.method.toUpperCase()}{' '}
                    {boundApi.path}
                  </>
                ) : (
                  <span className="api-node-unbound">
                    <WarningOutlined /> 未绑定接口
                  </span>
                )}
              </div>
            </EditableBox>
          );
        })}
      </div>

      <div className="menu-tree-footer">
        <Button block size="small" icon={<PlusOutlined />} onClick={openCreate}>
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

      <Modal
        title="新增模型"
        open={createOpen}
        okText="创建模型"
        cancelText="取消"
        okButtonProps={{ disabled: !chosenApi }}
        onOk={confirmCreate}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
      >
        <label className="inspector-field">
          <span className="inspector-label">
            绑定接口 <span className="inspector-required">必填</span>
          </span>
          {apis.length ? (
            <Select
              value={chosenApi}
              placeholder="必须选择一个接口"
              status={chosenApi ? undefined : 'error'}
              onChange={setChosenApi}
              options={apis.map((api) => ({
                value: api.key,
                label: `${api.name}（${api.method.toUpperCase()} ${api.path}）`,
              }))}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  还没有任何接口。模型的建立依赖接口，请先创建一个。
                  <Button
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => addApi()}
                  >
                    新增接口
                  </Button>
                </span>
              }
            />
          )}
        </label>

        <label className="inspector-field">
          <span className="inspector-label">模型名称（可选）</span>
          <Input
            value={modelName}
            maxLength={12}
            placeholder="默认「新模型」，创建后可改"
            onChange={(event) => setModelName(event.target.value)}
          />
        </label>

        <Typography.Paragraph
          type="secondary"
          className="inspector-hint"
          style={{ marginBottom: 0 }}
        >
          创建后模型的字段、表格列、筛选项、表单都由字段元数据自动生成；
          数据的增删改查会发往所绑定的接口（预览态走内置 mock 数据）。
        </Typography.Paragraph>
      </Modal>
    </div>
  );
};

export default ModelListEditor;
