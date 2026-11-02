import { Menu } from 'antd';
import { useDeskStore } from '../store/deskStore';

const PreviewMenu = () => {
  const items = useDeskStore((state) => state.previewMenuItems);

  return (
    <Menu
      mode="inline"
      selectedKeys={['dashboard']}
      items={items}
      style={{ borderInlineEnd: 0 }}
    />
  );
};

export default PreviewMenu;
