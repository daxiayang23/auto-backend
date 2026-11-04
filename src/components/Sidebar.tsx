import { useMemo } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import MenuTreeEditor from '../editor/MenuTreeEditor';
import ModelListEditor from '../editor/ModelListEditor';
import ApiListEditor from '../editor/ApiListEditor';
import ComponentLibrary from '../editor/ComponentLibrary';
import DbTableListEditor from '../editor/DbTableListEditor';
import type { MenuSchema } from '../schema/types';
import { MENU_ICON_MAP } from '../registry/menuIcons';
import { useProjectStore } from '../store/projectStore';

const toMenuItems = (menus: MenuSchema[]): NonNullable<MenuProps['items']> =>
  menus.map((menu) => ({
    key: menu.key,
    icon: menu.icon ? MENU_ICON_MAP[menu.icon] : undefined,
    label: menu.label,
    children: menu.children ? toMenuItems(menu.children) : undefined,
  }));

const collectGroupKeys = (menus: MenuSchema[]): string[] =>
  menus.filter((menu) => menu.children?.length).map((menu) => menu.key);

/**
 * 左侧面板：编辑态跟着顶部 tab 切换内容（菜单树 / 模型 / 接口 / 组件 / 表），
 * 预览态就是普通的后台导航。
 */
const Sidebar = () => {
  const menus = useProjectStore((state) => state.project.menus);
  const deskMode = useProjectStore((state) => state.deskMode);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const setActiveMenuKey = useProjectStore((state) => state.setActiveMenuKey);
  const editorTab = useProjectStore((state) => state.editorTab);

  const items = useMemo(() => toMenuItems(menus), [menus]);
  const openKeys = useMemo(() => collectGroupKeys(menus), [menus]);

  if (deskMode !== 'edit') {
    return (
      <aside className="stage-sidebar">
        <div className="sidebar-head">
          <span>页面导航</span>
        </div>
        <Menu
          className="stage-menu"
          mode="inline"
          items={items}
          selectedKeys={[activeMenuKey]}
          defaultOpenKeys={openKeys}
          onClick={({ key }) => setActiveMenuKey(key)}
        />
      </aside>
    );
  }

  return (
    <aside className="stage-sidebar">
      {editorTab === 'menu' ? (
        <MenuTreeEditor />
      ) : editorTab === 'model' ? (
        <ModelListEditor />
      ) : editorTab === 'api' ? (
        <ApiListEditor />
      ) : editorTab === 'database' ? (
        <DbTableListEditor />
      ) : (
        <ComponentLibrary />
      )}
    </aside>
  );
};

export default Sidebar;
