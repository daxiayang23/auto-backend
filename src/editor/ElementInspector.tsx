import { useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Switch,
  Typography,
} from 'antd';
import EnumOptionsEditor from './EnumOptionsEditor';
import IconPicker from './IconPicker';
import BlockInspector from './BlockInspector';
import { findMenu } from './menuOps';
import {
  fieldTypeOptions,
  countModelRefs,
  findModel,
  isFieldKeyTaken,
  isValidFieldKey,
} from './modelOps';
import {
  generateCrudPage,
  resolveShowInFilter,
  resolveShowInForm,
  resolveShowInTable,
} from '../registry/generateCrud';
import { MENU_ICON_LABELS } from '../registry/menuIcons';
import type { MenuIconKey } from '../schema/types';
import { useProjectStore } from '../store/projectStore';

const MenuInspector = ({ menuKey }: { menuKey: string }) => {
  const menus = useProjectStore((state) => state.project.menus);
  const models = useProjectStore((state) => state.project.models);
  const updateMenu = useProjectStore((state) => state.updateMenu);
  const removeMenu = useProjectStore((state) => state.removeMenu);

  const menu = findMenu(menus, menuKey);

  if (!menu) {
    return (
      <Empty
        description="该菜单已不存在"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="inspector-body">
      <Typography.Title level={5} className="inspector-title">
        菜单项
      </Typography.Title>

      <label className="inspector-field">
        <span className="inspector-label">名称</span>
        <Input
          value={menu.label}
          maxLength={12}
          onChange={(event) =>
            updateMenu(menu.key, { label: event.target.value })
          }
        />
      </label>

      <div className="inspector-field">
        <span className="inspector-label">图标</span>
        <div className="inspector-icon-row">
          <IconPicker
            value={menu.icon}
            onChange={(icon: MenuIconKey) => updateMenu(menu.key, { icon })}
          />
          <Typography.Text type="secondary">
            {menu.icon ? MENU_ICON_LABELS[menu.icon] : '未设置'}
          </Typography.Text>
        </div>
      </div>

      <label className="inspector-field">
        <span className="inspector-label">绑定模型</span>
        <Select
          value={menu.modelKey ?? ''}
          onChange={(value: string) =>
            updateMenu(menu.key, { modelKey: value ? value : undefined })
          }
          options={[
            { value: '', label: '不绑定（页面待建设）' },
            ...models.map((model) => ({
              value: model.key,
              label: `${model.name}（${model.key}）`,
            })),
          ]}
        />
      </label>

      <Descriptions
        className="inspector-meta"
        column={1}
        size="small"
        colon={false}
      >
        <Descriptions.Item label="key">
          <code>{menu.key}</code>
        </Descriptions.Item>
        <Descriptions.Item label="子菜单">
          {menu.children?.length ?? 0}
        </Descriptions.Item>
      </Descriptions>

      <Typography.Paragraph type="secondary" className="inspector-hint">
        绑定模型后，该菜单的页面由模型字段自动生成：表格列、筛选项、新增/编辑表单全部来自字段元数据。
      </Typography.Paragraph>

      <Popconfirm
        title="删除该菜单项？"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => removeMenu(menu.key)}
      >
        <Button danger block icon={<DeleteOutlined />}>
          删除菜单项
        </Button>
      </Popconfirm>
    </div>
  );
};

const ModelInspector = ({ modelKey }: { modelKey: string }) => {
  const menus = useProjectStore((state) => state.project.menus);
  const models = useProjectStore((state) => state.project.models);
  const updateModel = useProjectStore((state) => state.updateModel);
  const removeModel = useProjectStore((state) => state.removeModel);

  const model = findModel(models, modelKey);

  if (!model) {
    return (
      <Empty
        description="该模型已不存在"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const refs = countModelRefs(menus, model.key);

  return (
    <div className="inspector-body">
      <Typography.Title level={5} className="inspector-title">
        数据模型
      </Typography.Title>

      <label className="inspector-field">
        <span className="inspector-label">模型名称</span>
        <Input
          value={model.name}
          maxLength={12}
          onChange={(event) =>
            updateModel(model.key, { name: event.target.value })
          }
        />
      </label>

      <label className="inspector-field">
        <span className="inspector-label">说明</span>
        <Input.TextArea
          rows={2}
          value={model.description ?? ''}
          placeholder="这个模型管什么数据"
          onChange={(event) =>
            updateModel(model.key, { description: event.target.value })
          }
        />
      </label>

      <label className="inspector-field">
        <span className="inspector-label">主键字段</span>
        <Select
          value={model.primaryKey}
          onChange={(primaryKey: string) =>
            updateModel(model.key, { primaryKey })
          }
          options={model.fields.map((field) => ({
            value: field.key,
            label: `${field.label}（${field.key}）`,
          }))}
        />
      </label>

      <Descriptions
        className="inspector-meta"
        column={1}
        size="small"
        colon={false}
      >
        <Descriptions.Item label="key">
          <code>{model.key}</code>
        </Descriptions.Item>
        <Descriptions.Item label="字段数">
          {model.fields.length}
        </Descriptions.Item>
        <Descriptions.Item label="被菜单引用">{refs}</Descriptions.Item>
      </Descriptions>

      <Popconfirm
        title="删除该模型？"
        description={refs ? `${refs} 个菜单会变成未绑定` : '字段一并删除'}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => removeModel(model.key)}
      >
        <Button danger block icon={<DeleteOutlined />}>
          删除模型
        </Button>
      </Popconfirm>
    </div>
  );
};

const FieldInspector = ({
  modelKey,
  fieldKey,
}: {
  modelKey: string;
  fieldKey: string;
}) => {
  const models = useProjectStore((state) => state.project.models);
  const updateField = useProjectStore((state) => state.updateField);
  const removeField = useProjectStore((state) => state.removeField);

  const model = findModel(models, modelKey);
  const field = model?.fields.find((item) => item.key === fieldKey);
  const [keyDraft, setKeyDraft] = useState(fieldKey);

  if (!model || !field) {
    return (
      <Empty
        description="该字段已不存在"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const invalidKey =
    !isValidFieldKey(keyDraft.trim()) ||
    isFieldKeyTaken(model, keyDraft.trim(), field.key);

  const commitKey = () => {
    const next = keyDraft.trim();
    if (invalidKey) {
      setKeyDraft(field.key);
      return;
    }
    if (next !== field.key) updateField(model.key, field.key, { key: next });
  };

  const patch = (value: Parameters<typeof updateField>[2]) =>
    updateField(model.key, field.key, value);

  return (
    <div className="inspector-body">
      <Typography.Title level={5} className="inspector-title">
        字段 · {field.label}
      </Typography.Title>

      <label className="inspector-field">
        <span className="inspector-label">字段 key</span>
        <Input
          value={keyDraft}
          status={invalidKey ? 'error' : undefined}
          placeholder="英文标识符"
          onChange={(event) => setKeyDraft(event.target.value)}
          onBlur={commitKey}
          onPressEnter={commitKey}
        />
        {invalidKey ? (
          <Typography.Text type="danger" className="inspector-error">
            key 需为合法标识符且不与其它字段重复
          </Typography.Text>
        ) : null}
      </label>

      <label className="inspector-field">
        <span className="inspector-label">名称</span>
        <Input
          value={field.label}
          maxLength={12}
          onChange={(event) => patch({ label: event.target.value })}
        />
      </label>

      <label className="inspector-field">
        <span className="inspector-label">字段类型</span>
        <Select
          value={field.type}
          options={fieldTypeOptions}
          onChange={(type) => patch({ type })}
        />
      </label>

      <label className="inspector-field">
        <span className="inspector-label">表格列宽</span>
        <InputNumber
          min={60}
          max={480}
          value={field.width}
          placeholder="自适应"
          onChange={(width) => patch({ width: width ?? undefined })}
        />
      </label>

      <div className="inspector-switches">
        <label className="inspector-switch">
          <Checkbox
            checked={resolveShowInTable(field)}
            onChange={(event) => patch({ showInTable: event.target.checked })}
          />
          <span>作为表格列</span>
        </label>
        <label className="inspector-switch">
          <Checkbox
            checked={resolveShowInFilter(field)}
            onChange={(event) => patch({ filterable: event.target.checked })}
          />
          <span>作为筛选项</span>
        </label>
        <label className="inspector-switch">
          <Checkbox
            checked={resolveShowInForm(field, model.primaryKey)}
            onChange={(event) => patch({ editable: event.target.checked })}
          />
          <span>出现在新增/编辑</span>
        </label>
        <label className="inspector-switch">
          <Switch
            size="small"
            checked={field.required === true}
            onChange={(required) => patch({ required })}
          />
          <span>必填</span>
        </label>
      </div>

      {field.type === 'enum' ? (
        <div className="inspector-field">
          <span className="inspector-label">枚举选项</span>
          <EnumOptionsEditor
            options={field.options ?? []}
            onChange={(options) => patch({ options })}
          />
        </div>
      ) : null}

      {field.type === 'relation' ? (
        <>
          <label className="inspector-field">
            <span className="inspector-label">关联模型</span>
            <Select
              value={field.relation?.modelKey ?? ''}
              placeholder="选择模型"
              onChange={(target) =>
                patch({
                  relation: {
                    modelKey: target,
                    labelKey:
                      findModel(models, target)?.fields[0]?.key ??
                      field.relation?.labelKey ??
                      '',
                  },
                })
              }
              options={models
                .filter((item) => item.key !== model.key)
                .map((item) => ({
                  value: item.key,
                  label: `${item.name}（${item.key}）`,
                }))}
            />
          </label>
          <label className="inspector-field">
            <span className="inspector-label">展示字段</span>
            <Select
              value={field.relation?.labelKey ?? ''}
              placeholder="用哪个字段展示"
              onChange={(labelKey) =>
                patch({
                  relation: {
                    modelKey: field.relation?.modelKey ?? '',
                    labelKey,
                  },
                })
              }
              options={
                findModel(models, field.relation?.modelKey ?? '')?.fields.map(
                  (item) => ({
                    value: item.key,
                    label: `${item.label}（${item.key}）`,
                  }),
                ) ?? []
              }
            />
          </label>
        </>
      ) : null}

      <Popconfirm
        title="删除该字段？"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => removeField(model.key, field.key)}
      >
        <Button
          danger
          block
          icon={<DeleteOutlined />}
          disabled={field.key === model.primaryKey}
        >
          删除字段
        </Button>
      </Popconfirm>
    </div>
  );
};

const PageInspector = ({ modelKey }: { modelKey: string }) => {
  const models = useProjectStore((state) => state.project.models);
  const model = models.find((item) => item.key === modelKey);

  if (!model) {
    return (
      <Empty
        description="该页面尚未绑定模型"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const page = generateCrudPage(model);

  return (
    <div className="inspector-body">
      <Typography.Title level={5} className="inspector-title">
        页面 · {model.name}
      </Typography.Title>

      <Descriptions
        className="inspector-meta"
        column={1}
        size="small"
        colon={false}
      >
        <Descriptions.Item label="标题">{page.title}</Descriptions.Item>
        <Descriptions.Item label="模型">
          {model.name}（{model.key}）
        </Descriptions.Item>
        <Descriptions.Item label="表格列">
          {page.columns.length}
        </Descriptions.Item>
        <Descriptions.Item label="筛选项">
          {page.filters.length}
        </Descriptions.Item>
        <Descriptions.Item label="表单项">
          {page.formFields.length}
        </Descriptions.Item>
      </Descriptions>

      <Typography.Paragraph type="secondary" className="inspector-hint">
        页面由 <code>{model.key}</code>{' '}
        的字段元数据生成，改字段映射即可改变页面， 无需手写任何页面代码。
      </Typography.Paragraph>
    </div>
  );
};

/** 右侧属性面板：编辑态下选中什么就编辑什么 */
const ElementInspector = () => {
  const selected = useProjectStore((state) => state.selectedElement);

  return (
    <aside className="stage-inspector">
      <div className="stage-inspector-head">属性</div>
      {!selected ? (
        <Empty
          className="inspector-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="点击任意元素开始编辑"
        />
      ) : selected.kind === 'block' ? (
        <BlockInspector
          key={`block:${selected.owner}:${selected.key}`}
          menuKey={selected.owner ?? ''}
          blockId={selected.key}
        />
      ) : selected.kind === 'menu' ? (
        <MenuInspector key={`menu:${selected.key}`} menuKey={selected.key} />
      ) : selected.kind === 'model' ? (
        <ModelInspector key={`model:${selected.key}`} modelKey={selected.key} />
      ) : selected.kind === 'field' ? (
        <FieldInspector
          key={`field:${selected.owner}:${selected.key}`}
          modelKey={selected.owner ?? ''}
          fieldKey={selected.key}
        />
      ) : (
        <PageInspector key={`page:${selected.key}`} modelKey={selected.key} />
      )}
    </aside>
  );
};

export default ElementInspector;
