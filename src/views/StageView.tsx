import type { ChangeEvent } from 'react';
import { useMemo, useRef } from 'react';
import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Empty,
  Segmented,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import ElementInspector from '../editor/ElementInspector';
import ModelFieldsPanel from '../editor/ModelFieldsPanel';
import PageCanvas from '../editor/PageCanvas';
import PageRenderer from '../components/PageRenderer';
import Sidebar from '../components/Sidebar';
import { findMenu } from '../editor/menuOps';
import { resolvePage } from '../registry/generatePage';
import { validateProject } from '../schema/validate';
import type { DeskMode } from '../store/projectStore';
import { useProjectStore } from '../store/projectStore';

const StageView = () => {
  const project = useProjectStore((state) => state.project);
  const deskMode = useProjectStore((state) => state.deskMode);
  const setDeskMode = useProjectStore((state) => state.setDeskMode);
  const editorTab = useProjectStore((state) => state.editorTab);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const selected = useProjectStore((state) => state.selectedElement);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const { message } = App.useApp();
  const fileInput = useRef<HTMLInputElement>(null);

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
  const previewModel = project.models.find(
    (item) => item.key === activeMenu?.modelKey,
  );
  const previewBlocks = useMemo(
    () => resolvePage(project, activeMenuKey),
    [project, activeMenuKey],
  );

  /** 导出整份项目 Schema：可版本化、可分享、可再导入 */
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name || 'project'}-schema.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('已导出项目 Schema');
  };

  /** 导入前必须过同一套 zod 校验，避免脏数据把渲染器打挂 */
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const result = validateProject(JSON.parse(await file.text()) as unknown);
      if ('issues' in result) {
        const detail = result.issues
          .slice(0, 2)
          .map((issue) => `${issue.path} ${issue.message}`)
          .join('；');
        message.error(
          `导入失败，Schema 校验未通过：${detail}${result.issues.length > 2 ? '…' : ''}`,
        );
        return;
      }

      replaceProject(result.data);
      message.success(`已导入「${result.data.name}」`);
    } catch (error) {
      message.error(
        error instanceof SyntaxError ? '文件不是合法的 JSON' : '读取文件失败',
      );
    }
  };

  return (
    <div className={isEdit ? 'stage-shell is-edit' : 'stage-shell'}>
      <Sidebar />

      <main className="stage-main">
        <header className="stage-header">
          <div className="stage-header-left">
            <Typography.Text className="stage-header-path">
              {project.name}
            </Typography.Text>
            <span className="stage-header-sep">/</span>
            <Typography.Text strong>
              {activeMenu?.label ?? '未选择'}
            </Typography.Text>
            {previewModel ? <Tag color="blue">{previewModel.key}</Tag> : null}
            {isEdit ? (
              <Tag color="default">{previewBlocks.length} 个组件</Tag>
            ) : null}
          </div>

          <div className="stage-header-right">
            {isEdit ? (
              <Space size={6}>
                <Tooltip title="导出项目 Schema（JSON）">
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                  />
                </Tooltip>
                <Tooltip title="导入项目 Schema（JSON）">
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={() => fileInput.current?.click()}
                  />
                </Tooltip>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={handleImport}
                />
              </Space>
            ) : null}
            {isEdit ? (
              <Tag color="processing" className="stage-mode-tag">
                编辑模式 · 元素可点选
              </Tag>
            ) : null}
            <Avatar
              className="stage-header-avatar"
              size={32}
              style={{ backgroundColor: '#1677ff' }}
              icon={<UserOutlined />}
            />
          </div>
        </header>

        <div className="stage-workspace">
          <div className="stage-body">
            {isEdit ? (
              editorTab === 'model' ? (
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

          {isEdit ? <ElementInspector /> : null}
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
    </div>
  );
};

export default StageView;
