import { Alert, Button, Empty, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import EditableBox from './EditableBox';
import { API_METHOD_COLORS, findApiRefModels } from './apiOps';
import type { ApiSchema } from '../schema/types';
import { useProjectStore } from '../store/projectStore';

/**
 * 「接口」tab 的主区域：接口与模型的绑定关系总览。
 * 点选任意一行，右侧属性面板即可编辑该接口。
 */
const ApiOverview = () => {
  const apis = useProjectStore((state) => state.project.apis);
  const models = useProjectStore((state) => state.project.models);
  const selectApi = useProjectStore((state) => state.selectApi);
  const addApi = useProjectStore((state) => state.addApi);
  const selectedKey = useProjectStore((state) =>
    state.selectedElement?.kind === 'api' ? state.selectedElement.key : '',
  );

  // apiKey 为空或指向已删除接口的模型，都属于「未绑定」
  const unboundModels = models.filter(
    (model) => !apis.some((api) => api.key === model.apiKey),
  );

  const columns: TableColumnsType<ApiSchema> = [
    {
      key: 'name',
      title: '接口名称',
      width: 160,
      render: (_, api) => <Typography.Text strong>{api.name}</Typography.Text>,
    },
    {
      key: 'method',
      title: '方法',
      width: 90,
      render: (_, api) => (
        <Tag color={API_METHOD_COLORS[api.method]}>
          {api.method.toUpperCase()}
        </Tag>
      ),
    },
    {
      key: 'path',
      title: '路径',
      width: 220,
      render: (_, api) => <code>{api.path}</code>,
    },
    {
      key: 'models',
      title: '绑定模型',
      render: (_, api) => {
        const refs = findApiRefModels(models, api.key);
        return refs.length ? (
          refs.map((model) => (
            <Tag key={model.key} color="blue">
              {model.name}
            </Tag>
          ))
        ) : (
          <Typography.Text type="secondary">暂无绑定</Typography.Text>
        );
      },
    },
    {
      key: 'description',
      title: '说明',
      ellipsis: true,
      render: (_, api) => api.description || '—',
    },
  ];

  return (
    <EditableBox className="mapping-panel" label="接口总览">
      <div className="mapping-panel-head">
        <div>
          <Typography.Title level={4} className="generated-page-title">
            接口 · {apis.length} 个
          </Typography.Title>
          <Typography.Text type="secondary" className="generated-page-meta">
            模型的建立依赖接口：每个模型都必须绑定一个接口作为数据来源
          </Typography.Text>
        </div>

        <div className="mapping-panel-tools">
          <Button icon={<PlusOutlined />} onClick={() => addApi()}>
            新增接口
          </Button>
        </div>
      </div>

      {unboundModels.length ? (
        <Alert
          className="api-overview-alert"
          type="warning"
          showIcon
          message={`${unboundModels.length} 个模型尚未绑定接口`}
          description={`${unboundModels
            .map((model) => model.name)
            .join(
              '、',
            )} 需要在属性面板选择一个接口，否则无法通过 Schema 校验。`}
        />
      ) : null}

      {apis.length ? (
        <div onClick={(event) => event.stopPropagation()}>
          <Table<ApiSchema>
            rowKey="key"
            size="middle"
            columns={columns}
            dataSource={apis}
            pagination={false}
            className="field-table"
            rowClassName={(api) =>
              api.key === selectedKey ? 'field-row-selected' : ''
            }
            onRow={(api) => ({
              onClick: () => selectApi(api.key),
            })}
          />
        </div>
      ) : (
        <Empty description="还没有接口，点击右上角「新增接口」创建一个" />
      )}

      <Typography.Paragraph type="secondary" className="mapping-hint">
        新增模型时必须先绑定接口（必填）；删除接口会自动解绑挂在上面的模型，
        这些模型需要重新选择数据来源。预览态走内置 mock 数据，接真实后端时按
        method + path 发请求。
      </Typography.Paragraph>
    </EditableBox>
  );
};

export default ApiOverview;
