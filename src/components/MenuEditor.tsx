import { Form, Input } from 'antd';
import { useDeskStore } from '../store/deskStore';

const MenuEditor = () => {
  const previewMenuItems = useDeskStore((state) => state.previewMenuItems);
  const setPreviewMenuItemLabel = useDeskStore(
    (state) => state.setPreviewMenuItemLabel,
  );
  const dashboardLabel =
    previewMenuItems?.[0] &&
    'children' in previewMenuItems[0] &&
    previewMenuItems[0].children?.[0] &&
    'label' in previewMenuItems[0].children[0]
      ? String(previewMenuItems[0].children[0].label)
      : '仪表板';

  return (
    <div className="menu-editor">
      {/** 使用antd对于组件实现，不要自定义 */}
      <h2>菜单编辑区</h2>
      <Form layout="vertical" className="menu-editor-form">
        <Form.Item label="仪表板名称">
          <Input
            value={dashboardLabel}
            maxLength={20}
            allowClear
            onChange={(event) =>
              setPreviewMenuItemLabel('dashboard', event.target.value)
            }
          />
        </Form.Item>
      </Form>
      <h2>组件编排区</h2>
    </div>
  );
};

export default MenuEditor;
