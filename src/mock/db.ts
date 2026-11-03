import { nanoid } from 'nanoid';
import type { FilterSchema } from '../schema/types';
import { ordersSeed, usersSeed } from './data';
import type { Row } from './data';

export type { Row } from './data';

const SEEDS: Record<string, Row[]> = {
  users: usersSeed,
  orders: ordersSeed,
};

const tables = new Map<string, Row[]>(
  Object.entries(SEEDS).map(([key, rows]) => [
    key,
    rows.map((row) => ({ ...row })),
  ]),
);

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** 编辑器里新建的模型没有种子数据，这里按需建一张空表，预览时照样能跑通增删改 */
const getTable = (modelKey: string): Row[] => {
  const table = tables.get(modelKey);
  if (table) return table;

  const created: Row[] = [];
  tables.set(modelKey, created);
  return created;
};

const isEmptyValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) &&
    value.every((item) => item === undefined || item === null || item === ''));

const matchFilter = (
  row: Row,
  filter: FilterSchema,
  value: unknown,
): boolean => {
  if (isEmptyValue(value)) return true;

  const cell = row[filter.key];

  switch (filter.control) {
    case 'input':
      return String(cell ?? '')
        .toLowerCase()
        .includes(String(value).toLowerCase());

    case 'select':
      return String(cell) === String(value);

    case 'numberRange': {
      const [min, max] = value as [number?, number?];
      const num = Number(cell);
      if (Number.isNaN(num)) return true;
      if (min !== undefined && num < min) return false;
      if (max !== undefined && num > max) return false;
      return true;
    }

    case 'dateRange': {
      const [start, end] = value as [string?, string?];
      const time = new Date(String(cell)).getTime();
      if (Number.isNaN(time)) return true;
      if (start && time < new Date(start).getTime()) return false;
      // 结束日按当天 23:59:59 处理，避免把当天数据排除掉
      if (end && time > new Date(`${end}T23:59:59`).getTime()) return false;
      return true;
    }

    default:
      return true;
  }
};

const compareValues = (a: unknown, b: unknown): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  // ISO 日期字符串可以直接按字典序比较
  return String(a ?? '').localeCompare(String(b ?? ''), 'zh-CN');
};

export interface QueryParams {
  page: number;
  pageSize: number;
  values?: Record<string, unknown>;
  filters?: FilterSchema[];
  sortField?: string;
  sortOrder?: 'ascend' | 'descend';
  /** 搜索框组件的全局关键字；keywordFields 为空时匹配所有标量字段 */
  keyword?: string;
  keywordFields?: string[];
}

export interface QueryResult {
  records: Row[];
  total: number;
}

/** 关键字搜索的字段范围：取所有行出现过的 key 的并集，避免稀疏数据漏字段 */
const collectScalarKeys = (rows: Row[]): string[] => {
  const keys = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
  return [...keys];
};

export const listRows = async (
  modelKey: string,
  params: QueryParams,
): Promise<QueryResult> => {
  await delay(220);

  const {
    page,
    pageSize,
    values = {},
    filters = [],
    sortField,
    sortOrder,
    keyword,
    keywordFields,
  } = params;

  let rows = getTable(modelKey).filter((row) =>
    filters.every((filter) => matchFilter(row, filter, values[filter.key])),
  );

  // 搜索框走独立通道：不占用字段筛选的 key，可与筛选框叠加生效
  const term = keyword?.trim().toLowerCase();
  if (term) {
    const fields = keywordFields?.length
      ? keywordFields
      : collectScalarKeys(rows);
    rows = rows.filter((row) =>
      fields.some((field) =>
        String(row[field] ?? '')
          .toLowerCase()
          .includes(term),
      ),
    );
  }

  if (sortField && sortOrder) {
    const direction = sortOrder === 'ascend' ? 1 : -1;
    rows = [...rows].sort(
      (a, b) => compareValues(a[sortField], b[sortField]) * direction,
    );
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;

  return {
    records: rows.slice(start, start + pageSize).map((row) => ({ ...row })),
    total,
  };
};

export const createRow = async (
  modelKey: string,
  values: Row,
  primaryKey: string,
): Promise<Row> => {
  await delay(160);

  const table = getTable(modelKey);
  const prefix = modelKey.slice(0, 2);
  const row: Row = {
    ...values,
    [primaryKey]: values[primaryKey] ?? `${prefix}_${nanoid(8)}`,
  };

  table.unshift(row);
  return { ...row };
};

export const updateRow = async (
  modelKey: string,
  id: string,
  values: Row,
  primaryKey: string,
): Promise<Row> => {
  await delay(160);

  const table = getTable(modelKey);
  const index = table.findIndex(
    (row) => String(row[primaryKey]) === String(id),
  );

  if (index === -1) {
    throw new Error('记录不存在或已被删除');
  }

  const next: Row = {
    ...table[index],
    ...values,
    [primaryKey]: table[index][primaryKey],
  };
  table[index] = next;

  return { ...next };
};

export const removeRow = async (
  modelKey: string,
  id: string,
  primaryKey: string,
): Promise<void> => {
  await delay(160);

  const table = getTable(modelKey);
  const index = table.findIndex(
    (row) => String(row[primaryKey]) === String(id),
  );

  if (index === -1) {
    throw new Error('记录不存在或已被删除');
  }

  table.splice(index, 1);
};
