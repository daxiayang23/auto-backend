import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import ListItemsEditor from './ListItemsEditor';
import {
  COMPONENT_MAP,
  asArray,
  asBool,
  asLines,
  asNumber,
  asString,
} from '../registry/componentLibrary';
import type { PropDef } from '../registry/componentLibrary';
import { BLOCK_ICON_OPTIONS } from '../registry/blockIcons';
import { findMenuByKey, resolvePage } from '../registry/generatePage';
import { useProjectStore } from '../store/projectStore';

interface BlockInspectorProps {
  menuKey: string;
  blockId: string;
}

/** 属性面板完全由组件注册中心的 propDefs 生成，新增组件不用写新表单 */
const BlockInspector = ({ menuKey, blockId }: BlockInspectorProps) => {
  const project = useProjectStore((state) => state.project);
  const updateBlock = useProjectStore((state) => state.updateBlock);
  const removeBlock = useProjectStore((state) => state.removeBlock);
  const moveBlock = useProjectStore((state) => state.moveBlock);
  const toggleBlockVisible = useProjectStore(
    (state) => state.toggleBlockVisible,
  );

  const blocks = resolvePage(project, menuKey);
  const index = blocks.findIndex((item) => item.id === blockId);
  const block = blocks[index];
  const def = block ? COMPONENT_MAP[block.type] : undefined;

  if (!block || !def) {
    return (
      <Empty
        description="该组件已不存在"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const menu = findMenuByKey(project.menus, menuKey);
  const model = project.models.find((item) => item.key === menu?.modelKey);
  const valueOf = (key: string) => block.props[key] ?? def.defaults[key];
  const patch = (key: string, next: unknown) =>
    updateBlock(menuKey, blockId, { [key]: next });

  const dynamicOptions = (
    prop: PropDef,
  ): { value: string; label: string }[] => {
    if (prop.dynamic === 'models') {
      return [
        { value: '', label: '跟随当前页面模型' },
        ...project.models.map((item) => ({
          value: item.key,
          label: `${item.name}（${item.key}）`,
        })),
      ];
    }
    if (prop.dynamic === 'fields') {
      return (model?.fields ?? []).map((field) => ({
        value: field.key,
        label: `${field.label}（${field.key}）`,
      }));
    }
    return prop.options ?? [];
  };

  const renderProp = (prop: PropDef) => {
    if (prop.showWhen && valueOf(prop.showWhen.key) !== prop.showWhen.equals) {
      return null;
    }

    const current = valueOf(prop.key);
    let control;

    switch (prop.control) {
      case 'textarea':
        control = (
          <Input.TextArea
            rows={3}
            value={asString(current)}
            placeholder={prop.placeholder}
            onChange={(event) => patch(prop.key, event.target.value)}
          />
        );
        break;

      case 'lines':
        control = (
          <Input.TextArea
            rows={3}
            value={asLines(current).join('\n')}
            placeholder={prop.placeholder}
            onChange={(event) => patch(prop.key, event.target.value)}
          />
        );
        break;

      case 'number':
        control = (
          <InputNumber
            min={prop.min}
            max={prop.max}
            step={prop.step}
            value={asNumber(current, 0)}
            onChange={(next) =>
              patch(prop.key, next ?? def.defaults[prop.key] ?? 0)
            }
          />
        );
        break;

      case 'switch':
        control = (
          <Switch
            size="small"
            checked={asBool(current)}
            onChange={(next) => patch(prop.key, next)}
          />
        );
        break;

      case 'select':
      case 'color':
      case 'icon':
      case 'model':
      case 'field':
        control = (
          <Select
            value={asString(current)}
            options={
              prop.control === 'icon'
                ? BLOCK_ICON_OPTIONS
                : prop.control === 'model' || prop.control === 'field'
                  ? dynamicOptions(prop)
                  : (prop.options ?? [])
            }
            onChange={(next) => patch(prop.key, next)}
          />
        );
        break;

      case 'items':
        control = (
          <ListItemsEditor
            value={asArray(current)}
            fields={prop.itemFields ?? []}
            menuKey={menuKey}
            onChange={(next) => patch(prop.key, next)}
          />
        );
        break;

      case 'text':
      default:
        control = (
          <Input
            value={asString(current)}
            placeholder={prop.placeholder}
            onChange={(event) => patch(prop.key, event.target.value)}
          />
        );
    }

    return (
      <div className="inspector-field" key={prop.key}>
        <span className="inspector-label">{prop.label}</span>
        {control}
        {prop.hint ? (
          <Typography.Text type="secondary" className="inspector-hint">
            {prop.hint}
          </Typography.Text>
        ) : null}
      </div>
    );
  };

  return (
    <div className="inspector-body">
      <Typography.Title level={5} className="inspector-title">
        组件 · {def.label}
      </Typography.Title>

      <Typography.Paragraph type="secondary" className="inspector-hint">
        {def.description}
      </Typography.Paragraph>

      <Descriptions
        className="inspector-meta"
        column={1}
        size="small"
        colon={false}
      >
        <Descriptions.Item label="类型">
          <code>{block.type}</code>
        </Descriptions.Item>
        <Descriptions.Item label="所在页面">
          {menu?.label ?? menuKey}
        </Descriptions.Item>
        <Descriptions.Item label="位置">
          {index + 1} / {blocks.length}
        </Descriptions.Item>
      </Descriptions>

      {def.props.map(renderProp)}

      <div className="inspector-divider" />

      <div className="inspector-switches">
        <label className="inspector-switch">
          <Switch
            size="small"
            checked={block.visible !== false}
            onChange={() => toggleBlockVisible(menuKey, blockId)}
          />
          <span>{block.visible !== false ? '在页面中显示' : '已隐藏'}</span>
        </label>
      </div>

      <Space.Compact block>
        <Button
          block
          icon={<ArrowUpOutlined />}
          disabled={index <= 0}
          onClick={() => moveBlock(menuKey, blockId, -1)}
        >
          上移
        </Button>
        <Button
          block
          icon={<ArrowDownOutlined />}
          disabled={index >= blocks.length - 1}
          onClick={() => moveBlock(menuKey, blockId, 1)}
        >
          下移
        </Button>
      </Space.Compact>

      <Popconfirm
        title="删除该组件？"
        description="只会从当前页面移除，组件定义仍在组件库里"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => removeBlock(menuKey, blockId)}
      >
        <Button danger block icon={<DeleteOutlined />}>
          删除组件
        </Button>
      </Popconfirm>

      <Typography.Text type="secondary" className="inspector-hint">
        {block.visible === false ? <EyeInvisibleOutlined /> : <EyeOutlined />}{' '}
        隐藏的组件在预览中不显示，编辑画布里仍可编辑。
      </Typography.Text>
    </div>
  );
};

export default BlockInspector;
