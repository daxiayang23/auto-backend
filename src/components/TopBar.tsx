import type { ChangeEvent, ReactNode } from 'react';
import { useRef } from 'react';
import {
  ApiOutlined,
  AppstoreAddOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  DownloadOutlined,
  MenuUnfoldOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Space, Tag, Tooltip, Typography } from 'antd';
import { findMenu } from '../editor/menuOps';
import { validateProject } from '../schema/validate';
import type { DeskMode, EditorTab } from '../store/projectStore';
import { useProjectStore } from '../store/projectStore';

interface TabDef {
  value: EditorTab;
  label: string;
  icon: ReactNode;
}

const TABS: TabDef[] = [
  { value: 'menu', label: '菜单', icon: <MenuUnfoldOutlined /> },
  { value: 'model', label: '模型', icon: <DeploymentUnitOutlined /> },
  { value: 'api', label: '接口', icon: <ApiOutlined /> },
  { value: 'library', label: '组件', icon: <AppstoreAddOutlined /> },
  { value: 'database', label: '数据库', icon: <DatabaseOutlined /> },
];

const MODE_LABEL: Record<DeskMode, string> = {
  edit: '编辑模式',
  preview: '预览模式',
};

/**
 * 顶部工具栏：品牌 + 编辑面板切换 + 项目导入导出。
 * 面板切换从左侧栏搬到这里，左栏只留当前面板的内容。
 */
const TopBar = () => {
  const project = useProjectStore((state) => state.project);
  const deskMode = useProjectStore((state) => state.deskMode);
  const editorTab = useProjectStore((state) => state.editorTab);
  const setEditorTab = useProjectStore((state) => state.setEditorTab);
  const activeMenuKey = useProjectStore((state) => state.activeMenuKey);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const { message } = App.useApp();
  const fileInput = useRef<HTMLInputElement>(null);

  const isEdit = deskMode === 'edit';
  const activeMenu = findMenu(project.menus, activeMenuKey);
  const modelKey = activeMenu?.modelKey;

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
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-mark">A</span>
        <span className="topbar-name">AutoBackend</span>
      </div>

      <span className={isEdit ? 'topbar-mode is-edit' : 'topbar-mode'}>
        <i />
        {MODE_LABEL[deskMode]}
      </span>

      <span className="topbar-divider" />

      {isEdit ? (
        <nav className="topbar-tabs" aria-label="编辑面板">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={
                tab.value === editorTab ? 'topbar-tab is-active' : 'topbar-tab'
              }
              onClick={() => setEditorTab(tab.value)}
            >
              <span className="topbar-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      ) : (
        <div className="topbar-loc">
          <Typography.Text strong>
            {activeMenu?.label ?? '未选择页面'}
          </Typography.Text>
          {modelKey ? <Tag color="blue">{modelKey}</Tag> : null}
        </div>
      )}

      <div className="topbar-right">
        {isEdit ? (
          <Space size={4}>
            <Tooltip title="导出项目 Schema（JSON）">
              <Button
                size="small"
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleExport}
              />
            </Tooltip>
            <Tooltip title="导入项目 Schema（JSON）">
              <Button
                size="small"
                type="text"
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
        <Avatar
          className="topbar-avatar"
          size={30}
          style={{ backgroundColor: '#1677ff' }}
          icon={<UserOutlined />}
        />
      </div>
    </header>
  );
};

export default TopBar;
