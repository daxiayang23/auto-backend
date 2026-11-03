import { useMemo } from 'react';
import { Menu, Segmented } from 'antd';
import type { MenuProps } from 'antd';
import MenuTreeEditor from '../editor/MenuTreeEditor';
import ModelListEditor from '../editor/ModelListEditor';
import ComponentLibrary from '../editor/ComponentLibrary';
import type { MenuSchema } from '../schema/types';
import { MENU_ICON_MAP } from '../registry/menuIcons';
import { useProjectStore } from '../store/projectStore';
import type { EditorTab } from '../store/projectStore';

const toMenuItems = (menus: MenuSchema[]): NonNullable<MenuProps['items']> =>
  menus.map((menu) => ({
    key: menu.key,
    icon: menu.icon ? MENU_ICON_MAP[menu.icon] : undefined,
    label: menu.label,
    children: menu.children ? toMenuItems(menu.children) : undefined,
  }));

const collectGroupKeys = (menus: MenuSchema[]): string[] =>
  menus.filter((menu) => menu.children?.length).map((menu) => menu.key);

const Sidebar = () => {
  const menus = useProjectStore((state) => state.project.menus);
  const deskMode = useProjectStore((state) => state.deskMode);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const setActiveMenuKey = useProjectStore((state) => state.setActiveMenuKey);
  const editorTab = useProjectStore((state) => state.editorTab);
  const setEditorTab = useProjectStore((state) => state.setEditorTab);

  const items = useMemo(() => toMenuItems(menus), [menus]);
  const openKeys = useMemo(() => collectGroupKeys(menus), [menus]);

  return (
    <aside className="stage-sidebar">
      <div className="stage-logo">
        <span className="stage-logo-mark">A</span>
        <div className="stage-logo-text">
          <div className="stage-logo-title">AutoBackend</div>
          <div className="stage-logo-sub">
            {deskMode === 'edit' ? '编辑模式' : '模型驱动后台'}
          </div>
        </div>
      </div>

      {deskMode === 'edit' ? (
        <>
          <Segmented<EditorTab>
            className="stage-sidebar-tabs"
            size="small"
            block
            value={editorTab}
            onChange={setEditorTab}
            options={[
              { label: '菜单', value: 'menu' },
              { label: '模型', value: 'model' },
              { label: '组件', value: 'library' },
            ]}
          />
          {editorTab === 'menu' ? (
            <MenuTreeEditor />
          ) : editorTab === 'model' ? (
            <ModelListEditor />
          ) : (
            <ComponentLibrary />
          )}
        </>
      ) : (
        <Menu
          className="stage-menu"
          mode="inline"
          items={items}
          selectedKeys={[activeMenuKey]}
          defaultOpenKeys={openKeys}
          onClick={({ key }) => setActiveMenuKey(key)}
        />
      )}
    </aside>
  );
};

export default Sidebar;
