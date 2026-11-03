import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Select } from 'antd';
import type { ItemFieldDef } from '../registry/componentLibrary';
import { findMenuByKey } from '../registry/generatePage';
import { useProjectStore } from '../store/projectStore';

interface ListItemsEditorProps {
  value: Record<string, unknown>[];
  fields: ItemFieldDef[];
  onChange: (next: Record<string, unknown>[]) => void;
  /** 用于解析「当前页面模型的字段」下拉；缺省用当前激活菜单 */
  menuKey?: string;
}

const defaultValue = (field: ItemFieldDef): string | number =>
  field.defaultValue ?? (field.control === 'number' ? 0 : '');

/** 组件属性里的结构化列表（指标卡、标签、Tab 项…）共用的行编辑器 */
const ListItemsEditor = ({
  value,
  fields,
  onChange,
  menuKey,
}: ListItemsEditorProps) => {
  const project = useProjectStore((state) => state.project);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const model = project.models.find(
    (item) =>
      item.key ===
      findMenuByKey(project.menus, menuKey ?? activeMenuKey)?.modelKey,
  );
  const fieldOptions = (model?.fields ?? []).map((field) => ({
    value: field.key,
    label: `${field.label}（${field.key}）`,
  }));

  const patch = (index: number, key: string, next: string | number | boolean) =>
    onChange(
      value.map((item, i) => (i === index ? { ...item, [key]: next } : item)),
    );

  const renderControl = (
    field: ItemFieldDef,
    item: Record<string, unknown>,
    index: number,
  ) => {
    const current = item[field.key];
    switch (field.control) {
      case 'number':
        return (
          <InputNumber
            size="small"
            value={Number(current ?? 0)}
            onChange={(next) => patch(index, field.key, next ?? 0)}
          />
        );
      case 'field':
        return (
          <Select
            size="small"
            allowClear
            placeholder="选择字段"
            value={String(current ?? '')}
            options={fieldOptions}
            onChange={(next) => patch(index, field.key, next ?? '')}
          />
        );
      case 'select':
      case 'color':
        return (
          <Select
            size="small"
            value={String(current ?? '')}
            options={field.options ?? []}
            onChange={(next) => patch(index, field.key, next)}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            size="small"
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={String(current ?? '')}
            onChange={(event) => patch(index, field.key, event.target.value)}
          />
        );
      case 'text':
      default:
        return (
          <Input
            size="small"
            value={String(current ?? '')}
            placeholder={field.label}
            onChange={(event) => patch(index, field.key, event.target.value)}
          />
        );
    }
  };

  return (
    <div className="list-items-editor">
      {value.map((item, index) => (
        <div className="list-item-card" key={index}>
          <div className="list-item-head">
            <span>第 {index + 1} 项</span>
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            />
          </div>
          <div className="list-item-fields">
            {fields.map((field) => (
              <label className="list-item-field" key={field.key}>
                <span>{field.label}</span>
                {renderControl(field, item, index)}
              </label>
            ))}
          </div>
        </div>
      ))}

      <Button
        size="small"
        block
        icon={<PlusOutlined />}
        onClick={() =>
          onChange([
            ...value,
            Object.fromEntries(
              fields.map((field) => [field.key, defaultValue(field)]),
            ),
          ])
        }
      >
        新增一行
      </Button>
    </div>
  );
};

export default ListItemsEditor;
