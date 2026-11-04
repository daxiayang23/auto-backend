import { useMemo } from 'react';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Empty, Segmented } from 'antd';
import ElementInspector from '../editor/ElementInspector';
import ModelFieldsPanel from '../editor/ModelFieldsPanel';
import PageCanvas from '../editor/PageCanvas';
import DatabaseDesigner from '../editor/DatabaseDesigner';
import ApiOverview from '../editor/ApiOverview';
import PageRenderer from '../components/PageRenderer';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { findMenu } from '../editor/menuOps';
import { resolvePage } from '../registry/generatePage';
import type { DeskMode } from '../store/projectStore';
import { useProjectStore } from '../store/projectStore';

const StageView = () => {
  const project = useProjectStore((state) => state.project);
  const deskMode = useProjectStore((state) => state.deskMode);
  const setDeskMode = useProjectStore((state) => state.setDeskMode);
  const editorTab = useProjectStore((state) => state.editorTab);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const selected = useProjectStore((state) => state.selectedElement);

  const isEdit = deskMode === 'edit';
  const activeMenu = findMenu(project.menus, activeMenuKey);

  // 编辑态「模型」面板：选中模型/字段就编辑那个模型，否则用当前菜单绑定的模型
  const targetModelKey =
    selected?.kind === 'model'
      ? selected.key
      : selected?.kind === 'field'
        ? selected.owner
        : selected?.kind === 'page'
          ? selected.key
          : activeMenu?.modelKey;

  const editModel = project.models.find((item) => item.key === targetModelKey);
  const previewBlocks = useMemo(
    () => resolvePage(project, activeMenuKey),
    [project, activeMenuKey],
  );

  return (
    <div className={isEdit ? 'stage-shell is-edit' : 'stage-shell'}>
      <TopBar />

      <div className="stage-workspace">
        <Sidebar />

        <main className="stage-main">
          <div className="stage-body">
            {isEdit ? (
              editorTab === 'database' ? (
                <DatabaseDesigner />
              ) : editorTab === 'api' ? (
                <ApiOverview />
              ) : editorTab === 'model' ? (
                editModel ? (
                  <ModelFieldsPanel key={editModel.key} model={editModel} />
                ) : (
                  <div className="stage-placeholder">
                    <Empty
                      description={
                        <span>
                          未选中模型：在左侧「模型」里新增，或给菜单绑定一个模型
                        </span>
                      }
                    />
                  </div>
                )
              ) : (
                <PageCanvas />
              )
            ) : (
              <PageRenderer
                key={activeMenuKey}
                project={project}
                menuKey={activeMenuKey}
                blocks={previewBlocks}
              />
            )}
          </div>

          <Segmented
            className="stage-dock"
            value={deskMode}
            onChange={(value) => setDeskMode(value as DeskMode)}
            options={[
              { label: '编辑', value: 'edit', icon: <EditOutlined /> },
              { label: '预览', value: 'preview', icon: <EyeOutlined /> },
            ]}
          />
        </main>

        {/* 表编排自带编辑面板，不再叠右侧属性区 */}
        {isEdit && editorTab !== 'database' ? <ElementInspector /> : null}
      </div>
    </div>
  );
};

export default StageView;
