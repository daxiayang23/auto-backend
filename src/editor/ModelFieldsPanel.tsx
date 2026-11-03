import { useState } from 'react';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Input,
  Popconfirm,
  Select,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import EditableBox from './EditableBox';
import {
  fieldTypeOptions,
  canMoveField,
  isFieldKeyTaken,
  isValidFieldKey,
} from './modelOps';
import {
  resolveShowInFilter,
  resolveShowInForm,
  resolveShowInTable,
} from '../registry/generateCrud';
import { generateCrudPage } from '../registry/generateCrud';
import type { FieldSchema, ModelSchema } from '../schema/types';
import { useProjectStore } from '../store/projectStore';

/**
 * 字段的增删改查都在这张表里完成：
 * key / 名称 / 类型直接改，右侧三个开关决定字段长成表格列、筛选项还是表单项。
 * 页面本身不手写，全部由这张表派生。
 */
const ModelFieldsPanel = ({ model }: { model: ModelSchema }) => {
  const updateField = useProjectStore((state) => state.updateField);
  const removeField = useProjectStore((state) => state.removeField);
  const moveField = useProjectStore((state) => state.moveField);
  const addField = useProjectStore((state) => state.addField);
  const resetFields = useProjectStore((state) => state.resetFields);
  const selectField = useProjectStore((state) => state.selectField);
  const selectedFieldKey = useProjectStore((state) =>
    state.selectedElement?.kind === 'field' ? state.selectedElement.key : '',
  );

  const [keyword, setKeyword] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const page = generateCrudPage(model);
  const rows = model.fields.filter(
    (field) =>
      !keyword ||
      field.key.toLowerCase().includes(keyword.toLowerCase()) ||
      field.label.includes(keyword),
  );

  const keyInvalid = (field: FieldSchema): boolean => {
    const draft = drafts[field.key];
    if (draft === undefined) return false;
    const next = draft.trim();
    return !isValidFieldKey(next) || isFieldKeyTaken(model, next, field.key);
  };

  const commitKey = (field: FieldSchema) => {
    const draft = drafts[field.key];
    if (draft === undefined) return;

    const next = draft.trim();
    if (!keyInvalid(field) && next !== field.key) {
      updateField(model.key, field.key, { key: next });
    }

    setDrafts((prev) => {
      const rest = { ...prev };
      delete rest[field.key];
      return rest;
    });
  };

  const patch = (fieldKey: string, value: Partial<FieldSchema>) =>
    updateField(model.key, fieldKey, value);

  const columns: TableColumnsType<FieldSchema> = [
    {
      key: 'key',
      title: '字段 key',
      width: 150,
      render: (_, field) => (
        <Input
          size="small"
          className="field-key-input"
          value={drafts[field.key] ?? field.key}
          status={keyInvalid(field) ? 'error' : undefined}
          placeholder="英文标识符"
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [field.key]: event.target.value }))
          }
          onBlur={() => commitKey(field)}
          onPressEnter={() => commitKey(field)}
        />
      ),
    },
    {
      key: 'label',
      title: '名称',
      width: 140,
      render: (_, field) => (
        <Input
          size="small"
          value={field.label}
          maxLength={12}
          onChange={(event) => patch(field.key, { label: event.target.value })}
        />
      ),
    },
    {
      key: 'type',
      title: '类型',
      width: 120,
      render: (_, field) => (
        <Select
          size="small"
          className="field-type-select"
          value={field.type}
          options={fieldTypeOptions}
          onChange={(type) => patch(field.key, { type })}
        />
      ),
    },
    {
      key: 'table',
      title: '表格列',
      width: 74,
      align: 'center',
      render: (_, field) => (
        <Checkbox
          checked={resolveShowInTable(field)}
          onChange={(event) =>
            patch(field.key, { showInTable: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'filter',
      title: '筛选项',
      width: 74,
      align: 'center',
      render: (_, field) => (
        <Checkbox
          checked={resolveShowInFilter(field)}
          onChange={(event) =>
            patch(field.key, { filterable: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'form',
      title: '新增/编辑',
      width: 86,
      align: 'center',
      render: (_, field) => (
        <Tooltip
          title={field.key === model.primaryKey ? '主键由系统生成' : undefined}
        >
          <Checkbox
            checked={resolveShowInForm(field, model.primaryKey)}
            onChange={(event) =>
              patch(field.key, { editable: event.target.checked })
            }
          />
        </Tooltip>
      ),
    },
    {
      key: 'required',
      title: '必填',
      width: 64,
      align: 'center',
      render: (_, field) => (
        <Checkbox
          checked={field.required === true}
          onChange={(event) =>
            patch(field.key, { required: event.target.checked })
          }
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 96,
      align: 'right',
      render: (_, field) => (
        <div className="field-actions">
          <Tooltip title="上移">
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={!canMoveField(model, field.key, -1)}
              onClick={() => moveField(model.key, field.key, -1)}
            />
          </Tooltip>
          <Tooltip title="下移">
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={!canMoveField(model, field.key, 1)}
              onClick={() => moveField(model.key, field.key, 1)}
            />
          </Tooltip>
          <Popconfirm
            title="删除该字段？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeField(model.key, field.key)}
          >
            <Tooltip
              title={field.key === model.primaryKey ? '主键不可删除' : '删除'}
            >
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={field.key === model.primaryKey}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <EditableBox
      className="mapping-panel"
      label={`数据模型 · ${model.name}`}
      target={{ kind: 'model', key: model.key }}
    >
      <div className="mapping-panel-head">
        <div>
          <Typography.Title level={4} className="generated-page-title">
            {model.name} · 字段
          </Typography.Title>
          <Typography.Text type="secondary" className="generated-page-meta">
            {model.key} 共 {model.fields.length} 个字段 → {page.title} 的{' '}
            {page.columns.length} 列、{page.filters.length} 个筛选项、
            {page.formFields.length} 个表单项
          </Typography.Text>
        </div>

        <div className="mapping-panel-tools">
          <Input
            size="small"
            className="field-search"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索字段"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Tooltip title="恢复字段默认配置">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => resetFields(model.key)}
            >
              恢复默认
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 表格里的点击只用于选中字段，不冒泡到外层的模型包装器，否则选中会被覆盖 */}
      <div onClick={(event) => event.stopPropagation()}>
        <Table<FieldSchema>
          rowKey="key"
          size="middle"
          columns={columns}
          dataSource={rows}
          pagination={false}
          className="field-table"
          rowClassName={(field) =>
            field.key === selectedFieldKey ? 'field-row-selected' : ''
          }
          onRow={(field) => ({
            onClick: () => selectField(model.key, field.key),
          })}
        />
      </div>

      <Button
        className="field-add"
        block
        icon={<PlusOutlined />}
        onClick={() => addField(model.key)}
      >
        新增字段
      </Button>

      <Typography.Paragraph type="secondary" className="mapping-hint">
        字段就是页面的源头：改这里的 key、类型或三个开关，切到「预览」立刻生效，
        表格列、筛选项和表单都是派生出来的。
      </Typography.Paragraph>
    </EditableBox>
  );
};

export default ModelFieldsPanel;
