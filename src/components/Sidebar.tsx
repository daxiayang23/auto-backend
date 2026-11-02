import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import MenuEditor from './MenuEditor';
import PreviewMenu from './Menu';
import { useDeskStore } from '../store/deskStore';

const Sidebar = () => {
  const deskMode = useDeskStore((state) => state.deskMode);
  const setDeskMode = useDeskStore((state) => state.setDeskMode);
  const menuItems: MenuProps['items'] = [
    { key: 'edit', label: '编辑', icon: <EditOutlined /> },
    { key: 'preview', label: '预览', icon: <EyeOutlined /> },
  ];

  return (
    <aside className="stage-sidebar" aria-label="组件库">
      <div className="stage-sidebar-logo" aria-label="AutoBackend">
        <span className="stage-sidebar-logo-mark">A</span>
        <span>AutoBackend</span>
      </div>

      <Menu
        className="stage-sidebar-menu"
        mode="horizontal"
        aria-label="编辑器菜单"
        selectedKeys={[deskMode]}
        items={menuItems}
        onClick={({ key }) => {
          if (key === 'edit' || key === 'preview') {
            setDeskMode(key);
          }
        }}
      />

      {deskMode === 'edit' ? <MenuEditor /> : <PreviewMenu />}
    </aside>
  );
};

export default Sidebar;
