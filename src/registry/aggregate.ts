import type { Row } from '../mock/db';

/**
 * 指标卡 / 图表的数值聚合。
 *
 * 全部是纯函数：输入行数据与配置，输出数字或「算不出来」。
 * 算不出来返回 null，由渲染层回退到手填值——这样没绑模型的页面也能正常显示。
 */

export const AGG_SOURCES = [
  'static',
  'count',
  'sum',
  'avg',
  'max',
  'min',
  'distinct',
] as const;

export type AggSource = (typeof AGG_SOURCES)[number];

export const METRICS = ['count', 'sum', 'avg'] as const;
export type Metric = (typeof METRICS)[number];

export const AGG_SOURCE_OPTIONS: { value: AggSource; label: string }[] = [
  { value: 'static', label: '手填数值' },
  { value: 'count', label: '记录总数' },
  { value: 'sum', label: '字段求和' },
  { value: 'avg', label: '字段平均' },
  { value: 'max', label: '字段最大' },
  { value: 'min', label: '字段最小' },
  { value: 'distinct', label: '字段去重数' },
];

export const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'count', label: '记录数' },
  { value: 'sum', label: '字段求和' },
  { value: 'avg', label: '字段平均' },
];

export const asSource = (
  value: unknown,
  fallback: AggSource = 'static',
): AggSource =>
  AGG_SOURCES.includes(value as AggSource) ? (value as AggSource) : fallback;

export const asMetric = (value: unknown, fallback: Metric = 'count'): Metric =>
  METRICS.includes(value as Metric) ? (value as Metric) : fallback;

/** 单值聚合：不需要字段的 source（static / count）忽略 fieldKey */
export const aggregate = (
  rows: Row[],
  source: AggSource,
  fieldKey?: string,
): number | null => {
  if (source === 'static') return null;
  if (source === 'count') return rows.length;
  if (!fieldKey) return null;

  if (source === 'distinct') {
    const seen = new Set<string>();
    rows.forEach((row) => {
      const raw = row[fieldKey];
      if (raw === undefined || raw === null || raw === '') return;
      seen.add(String(raw));
    });
    return seen.size;
  }

  const values = rows
    .map((row) => Number(row[fieldKey]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;

  switch (source) {
    case 'sum':
      return values.reduce((total, value) => total + value, 0);
    case 'avg':
      return values.reduce((total, value) => total + value, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    default:
      return null;
  }
};

const round = (value: number): number => Math.round(value * 100) / 100;

export const formatAgg = (value: number | null): string =>
  value === null ? '-' : String(round(value));

/** 分组聚合：图表按 groupBy 分组后，每组算一个指标值 */
export const groupAggregate = (
  rows: Row[],
  groupKey: string,
  metric: Metric,
  valueField?: string,
): [string, number][] => {
  const groups = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = String(row[groupKey] ?? '未知');
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  });

  return [...groups.entries()].map(([label, bucket]) => [
    label,
    metric === 'count'
      ? bucket.length
      : round(
          aggregate(bucket, metric === 'sum' ? 'sum' : 'avg', valueField) ?? 0,
        ),
  ]);
};
