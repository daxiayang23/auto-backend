import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import type { EnumOption } from '../schema/types';

const COLOR_OPTIONS = [
  'blue',
  'green',
  'red',
  'gold',
  'purple',
  'cyan',
  'magenta',
  'default',
].map((color) => ({ value: color, label: color }));

interface EnumOptionsEditorProps {
  options: EnumOption[];
  onChange: (next: EnumOption[]) => void;
}

/** 枚举选项也是 Schema 的纯数据，编辑它就是在编辑页面的下拉与 Tag 配色 */
const EnumOptionsEditor = ({ options, onChange }: EnumOptionsEditorProps) => {
  const patch = (index: number, value: Partial<EnumOption>) =>
    onChange(
      options.map((option, i) =>
        i === index ? { ...option, ...value } : option,
      ),
    );

  return (
    <div className="enum-editor">
      {options.map((option, index) => (
        <div key={`${option.value}-${index}`} className="enum-row">
          <Input
            size="small"
            value={option.value}
            placeholder="存储值"
            onChange={(event) => patch(index, { value: event.target.value })}
          />
          <Input
            size="small"
            value={option.label}
            placeholder="显示名"
            onChange={(event) => patch(index, { label: event.target.value })}
          />
          <Select
            size="small"
            className="enum-color"
            value={option.color ?? 'default'}
            options={COLOR_OPTIONS}
            onChange={(color) => patch(index, { color })}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={options.length <= 1}
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          />
        </div>
      ))}

      <Button
        size="small"
        block
        icon={<PlusOutlined />}
        onClick={() =>
          onChange([
            ...options,
            {
              value: `option_${options.length + 1}`,
              label: `选项${options.length + 1}`,
              color: 'default',
            },
          ])
        }
      >
        新增选项
      </Button>
    </div>
  );
};

export default EnumOptionsEditor;
