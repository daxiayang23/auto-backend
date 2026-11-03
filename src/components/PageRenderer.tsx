import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { App, Form, Modal, Typography } from 'antd';
import dayjs from 'dayjs';
import { BlockView } from './Blocks';
import { PageRuntimeProvider } from './PageRuntime';
import type { PageRuntimeValue, SortState } from './PageRuntime';
import { buildRules, renderFormControl } from './FormControls';
import { asLines, asNumber } from '../registry/componentLibrary';
import { generateCrudPage } from '../registry/generateCrud';
import { findMenuByKey } from '../registry/generatePage';
import { createRow, listRows, removeRow, updateRow } from '../mock/db';
import type { Row } from '../mock/db';
import type { PageBlock, ProjectSchema } from '../schema/types';

interface PageRendererProps {
  project: ProjectSchema;
  menuKey: string;
  blocks: PageBlock[];
  /** 编辑画布需要看到被隐藏的组件，才能把它改回显示 */
  includeHidden?: boolean;
  /** 编辑态由画布传入，用 EditableBox 把每个组件包起来 */
  wrapBlock?: (block: PageBlock, content: ReactNode) => ReactNode;
}

interface EditorState {
  open: boolean;
  mode: 'create' | 'edit';
  record?: Row;
}

/** 一次拿全量再前端分页：mock 场景下比两次请求简单，图表/指标卡也能拿到完整数据 */
const FULL_PAGE_SIZE = 10000;

const PageRenderer = ({
  project,
  menuKey,
  blocks,
  includeHidden = false,
  wrapBlock,
}: PageRendererProps) => {
  const { message, modal } = App.useApp();
  const [editForm] = Form.useForm();

  const model = project.models.find(
    (item) => item.key === findMenuByKey(project.menus, menuKey)?.modelKey,
  );
  const crudPage = useMemo(
    () => (model ? generateCrudPage(model) : undefined),
    [model],
  );

  const pageSize = useMemo(() => {
    const table = blocks.find(
      (block) => block.type === 'dataTable' && block.visible !== false,
    );
    return asNumber(table?.props.pageSize, 10);
  }, [blocks]);

  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeywordState] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [filters, setFiltersState] = useState<Record<string, unknown>>({});
  const [pageNumber, setPageNumberState] = useState(1);
  const [sort, setSortState] = useState<SortState | undefined>();
  const [refreshToken, setRefreshToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    mode: 'create',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!model || !crudPage) return;

    let cancelled = false;
    const searchBlock = blocks.find(
      (block) => block.type === 'searchBox' && block.visible !== false,
    );
    const keywordFields = asLines(searchBlock?.props.fields);

    // 日期筛选等独立组件可能写了一个模型筛选列表里没有的 key，
    // 补一条 dateRange 规则让它照样参与过滤
    const effectiveFilters = [...crudPage.filters];
    Object.keys(filters).forEach((key) => {
      if (!effectiveFilters.some((filter) => filter.key === key)) {
        effectiveFilters.push({ key, label: key, control: 'dateRange' });
      }
    });

    listRows(model.key, {
      page: 1,
      pageSize: FULL_PAGE_SIZE,
      values: filters,
      filters: effectiveFilters,
      sortField: sort?.field,
      sortOrder: sort?.order,
      keyword,
      keywordFields,
    })
      .then((result) => {
        if (!cancelled) setAllRows(result.records);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          message.error(
            error instanceof Error ? error.message : '加载数据失败',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [model, crudPage, filters, sort, keyword, blocks, refreshToken, message]);

  useEffect(() => {
    if (!editor.open || !crudPage) return;

    editForm.resetFields();
    if (editor.mode === 'edit' && editor.record) {
      const values: Record<string, unknown> = {};
      crudPage.formFields.forEach((field) => {
        const raw = editor.record?.[field.key];
        const isDate = field.control === 'date' || field.control === 'datetime';
        values[field.key] = isDate && raw ? dayjs(String(raw)) : raw;
      });
      editForm.setFieldsValue(values);
    }
  }, [editor, editForm, crudPage]);

  const rows = useMemo(
    () => allRows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [allRows, pageNumber, pageSize],
  );

  const setKeyword = (value: string) => {
    setKeywordState(value);
    setKeywordDraft(value);
    setPageNumberState(1);
    setLoading(true);
  };

  const setFilters = (values: Record<string, unknown>) => {
    setFiltersState((prev) => ({ ...prev, ...values }));
    setPageNumberState(1);
    setLoading(true);
  };

  const patchFilter = (key: string, value: unknown) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPageNumberState(1);
    setLoading(true);
  };

  const resetFilters = () => {
    setFiltersState({});
    setKeywordState('');
    setKeywordDraft('');
    setPageNumberState(1);
    setResetToken((token) => token + 1);
    setLoading(true);
  };

  const refresh = () => {
    setLoading(true);
    setRefreshToken((token) => token + 1);
  };

  const exportCsv = () => {
    if (!crudPage) {
      message.warning('该页面没有绑定模型，暂无数据可导出');
      return;
    }
    const escape = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = crudPage.columns
      .map((column) => escape(column.title))
      .join(',');
    const lines = allRows.map((row) =>
      crudPage.columns.map((column) => escape(row[column.key])).join(','),
    );
    const blob = new Blob(['\uFEFF' + [header, ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${crudPage.title}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${allRows.length} 条记录`);
  };

  const remove = (record: Row) => {
    if (!model || !crudPage) return;
    modal.confirm({
      title: '确认删除这条记录？',
      content: '删除后数据不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await removeRow(
            model.key,
            String(record[crudPage.primaryKey]),
            crudPage.primaryKey,
          );
          message.success('已删除');
          refresh();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    if (!model || !crudPage) return;

    let raw: Record<string, unknown>;
    try {
      raw = (await editForm.validateFields()) as Record<string, unknown>;
    } catch {
      return;
    }

    const payload: Row = { ...raw };
    crudPage.formFields.forEach((field) => {
      const value = payload[field.key];
      if (field.control === 'date' && dayjs.isDayjs(value)) {
        payload[field.key] = value.format('YYYY-MM-DD');
      }
      if (field.control === 'datetime' && dayjs.isDayjs(value)) {
        payload[field.key] = value.format('YYYY-MM-DDTHH:mm:ssZ');
      }
    });
    if (
      editor.mode === 'create' &&
      !payload.createdAt &&
      crudPage.columns.some((column) => column.key === 'createdAt')
    ) {
      payload.createdAt = new Date().toISOString();
    }

    setSubmitting(true);
    try {
      if (editor.mode === 'create') {
        await createRow(model.key, payload, crudPage.primaryKey);
        message.success('新增成功');
      } else {
        await updateRow(
          model.key,
          String(editor.record?.[crudPage.primaryKey]),
          payload,
          crudPage.primaryKey,
        );
        message.success('保存成功');
      }
      setEditor({ open: false, mode: 'create' });
      refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const runtime: PageRuntimeValue = {
    model,
    page: crudPage,
    rows,
    allRows,
    total: allRows.length,
    loading,
    keyword,
    keywordDraft,
    setKeyword,
    setKeywordDraft,
    commitKeyword: () => setKeyword(keywordDraft),
    filters,
    setFilters,
    patchFilter,
    resetFilters,
    resetToken,
    pageNumber,
    setPageNumber: (value) => setPageNumberState(value),
    pageSize,
    sort,
    setSort: (value) => {
      setSortState(value);
      setPageNumberState(1);
      setLoading(true);
    },
    refresh,
    openCreate: () => setEditor({ open: true, mode: 'create' }),
    openEdit: (record) => setEditor({ open: true, mode: 'edit', record }),
    remove,
    exportCsv,
    notify: (text) => message.info(text),
  };

  const visibleBlocks = includeHidden
    ? blocks
    : blocks.filter((block) => block.visible !== false);

  return (
    <PageRuntimeProvider value={runtime}>
      <div className="page-renderer">
        {visibleBlocks.length ? (
          <div className="page-blocks">
            {visibleBlocks.map((block) =>
              wrapBlock ? (
                wrapBlock(block, <BlockView block={block} />)
              ) : (
                <div key={block.id} className="page-block">
                  <BlockView block={block} />
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="page-blocks-empty">
            <Typography.Text type="secondary">
              页面还没有组件，从左侧「组件库」添加第一个吧
            </Typography.Text>
          </div>
        )}
      </div>

      <Modal
        open={editor.open}
        title={
          editor.mode === 'create'
            ? `新增${crudPage?.title.replace('管理', '') ?? '记录'}`
            : '编辑记录'
        }
        okText={editor.mode === 'create' ? '创建' : '保存'}
        cancelText="取消"
        confirmLoading={submitting}
        onOk={handleSubmit}
        onCancel={() => setEditor({ open: false, mode: 'create' })}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" className="generated-page-form">
          {crudPage?.formFields.map((field) => (
            <Form.Item
              key={field.key}
              label={field.label}
              name={field.key}
              rules={buildRules(field)}
              valuePropName={field.control === 'switch' ? 'checked' : 'value'}
            >
              {renderFormControl(field)}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </PageRuntimeProvider>
  );
};

export default PageRenderer;
