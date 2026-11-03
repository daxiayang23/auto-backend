import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Popconfirm, Tooltip, Typography } from 'antd';
import { BLOCK_ICON_MAP } from '../registry/blockIcons';
import {
  BLOCK_CATEGORIES,
  COMPONENT_LIBRARY,
} from '../registry/componentLibrary';
import { findMenuByKey, resolvePage } from '../registry/generatePage';
import { useProjectStore } from '../store/projectStore';

/** 编辑态侧边栏的组件库：按分类陈列内置组件，点击即加到当前页面 */
const ComponentLibrary = () => {
  const project = useProjectStore((state) => state.project);
  const menuKey = useProjectStore((state) => state.activeMenuKey);
  const addBlock = useProjectStore((state) => state.addBlock);
  const resetPage = useProjectStore((state) => state.resetPage);
  const setEditorTab = useProjectStore((state) => state.setEditorTab);
  const [keyword, setKeyword] = useState('');

  const blocks = resolvePage(project, menuKey);
  const menu = findMenuByKey(project.menus, menuKey);
  const term = keyword.trim().toLowerCase();
  const matched = COMPONENT_LIBRARY.filter(
    (def) =>
      !term ||
      def.label.toLowerCase().includes(term) ||
      def.type.toLowerCase().includes(term) ||
      def.description.toLowerCase().includes(term),
  );

  return (
    <div className="component-library">
      <div className="library-head">
        <span>内置组件</span>
        <Typography.Text type="secondary" className="library-page-name">
          当前：{menu?.label ?? '未选择页面'}
        </Typography.Text>
      </div>

      <Input
        size="small"
        allowClear
        placeholder="搜索组件"
        className="library-search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />

      <div className="library-body">
        {BLOCK_CATEGORIES.map((category) => {
          const items = matched.filter((def) => def.category === category);
          if (!items.length) return null;

          return (
            <div className="library-group" key={category}>
              <div className="library-group-title">
                {category} <span>{items.length}</span>
              </div>
              {items.map((def) => {
                const used = def.singleton
                  ? blocks.some((block) => block.type === def.type)
                  : false;

                return (
                  <Tooltip
                    key={def.type}
                    title={used ? '该组件每页只能添加一个' : def.description}
                    placement="right"
                  >
                    <button
                      type="button"
                      className={
                        used ? 'library-item is-disabled' : 'library-item'
                      }
                      disabled={used}
                      onClick={() => {
                        addBlock(menuKey, def.type);
                        setEditorTab('library');
                      }}
                    >
                      <span className="library-item-icon">
                        {BLOCK_ICON_MAP[def.icon]}
                      </span>
                      <span className="library-item-text">
                        <b>{def.label}</b>
                        <small>{def.description}</small>
                      </span>
                      <PlusOutlined className="library-item-add" />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          );
        })}

        {!matched.length ? (
          <Typography.Text type="secondary" className="library-empty">
            没有匹配的组件
          </Typography.Text>
        ) : null}
      </div>

      <div className="library-footer">
        <Popconfirm
          title="恢复默认页面？"
          description="当前页面手工添加与修改的组件都会丢失"
          okText="恢复"
          cancelText="取消"
          onConfirm={() => resetPage(menuKey)}
        >
          <Button block size="small">
            恢复默认页面
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};

export default ComponentLibrary;
