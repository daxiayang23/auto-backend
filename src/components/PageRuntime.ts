import { createContext, useContext } from 'react';
import type { CrudPageSchema, ModelSchema } from '../schema/types';
import type { Row } from '../mock/db';

export interface SortState {
  field: string;
  order: 'ascend' | 'descend';
}

/**
 * 页面运行时：一次页面渲染只有一个实例，所有组件块共享它。
 * 这是搜索框 / 筛选框 / 表格 / 指标卡 / 图表能真实联动的关键，
 * 组件本身不直接读 store，也不自己发请求。
 */
export interface PageRuntimeValue {
  model?: ModelSchema;
  page?: CrudPageSchema;
  /** 当前页切片，表格直接展示 */
  rows: Row[];
  /** 过滤排序后的全量，指标卡与图表用它统计 */
  allRows: Row[];
  total: number;
  loading: boolean;

  keyword: string;
  keywordDraft: string;
  setKeyword: (value: string) => void;
  setKeywordDraft: (value: string) => void;
  commitKeyword: () => void;
  filters: Record<string, unknown>;
  /** 筛选框整体提交（与已有条件合并，不清掉其它组件写入的条件） */
  setFilters: (values: Record<string, unknown>) => void;
  /** 单个条件即时生效（日期筛选等） */
  patchFilter: (key: string, value: unknown) => void;
  resetFilters: () => void;
  /** 重置时自增，用于让持有本地草稿的组件重挂载 */
  resetToken: number;

  pageNumber: number;
  setPageNumber: (value: number) => void;
  pageSize: number;
  sort?: SortState;
  setSort: (value?: SortState) => void;

  refresh: () => void;
  openCreate: () => void;
  openEdit: (record: Row) => void;
  remove: (record: Row) => void;
  exportCsv: () => void;
  notify: (text: string) => void;
}

const PageRuntimeContext = createContext<PageRuntimeValue | null>(null);

export const PageRuntimeProvider = PageRuntimeContext.Provider;

export const usePageRuntime = (): PageRuntimeValue | null =>
  useContext(PageRuntimeContext);
