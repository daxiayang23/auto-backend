import type { ReactNode } from 'react';
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { FilterSchema, FormFieldSchema } from '../schema/types';

const YES_NO = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' },
];

/** 筛选项 → antd 表单控件。筛选框组件与日期筛选共用这一套映射 */
export const renderFilterControl = (filter: FilterSchema): ReactNode => {
  switch (filter.control) {
    case 'input':
      return (
        <Form.Item key={filter.key} label={filter.label} name={filter.key}>
          <Input
            allowClear
            placeholder={`搜索${filter.label}`}
            style={{ width: 160 }}
          />
        </Form.Item>
      );

    case 'select':
      return (
        <Form.Item key={filter.key} label={filter.label} name={filter.key}>
          <Select
            allowClear
            placeholder="全部"
            style={{ width: 150 }}
            options={filter.options?.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </Form.Item>
      );

    case 'switch':
      return (
        <Form.Item key={filter.key} label={filter.label} name={filter.key}>
          <Select
            allowClear
            placeholder="全部"
            style={{ width: 120 }}
            options={YES_NO}
          />
        </Form.Item>
      );

    case 'numberRange':
      return (
        <Form.Item key={filter.key} label={filter.label}>
          <Space size={4}>
            <Form.Item name={`${filter.key}__min`} noStyle>
              <InputNumber placeholder="最小" style={{ width: 88 }} />
            </Form.Item>
            <span className="range-separator">~</span>
            <Form.Item name={`${filter.key}__max`} noStyle>
              <InputNumber placeholder="最大" style={{ width: 88 }} />
            </Form.Item>
          </Space>
        </Form.Item>
      );

    case 'dateRange':
      return (
        <Form.Item
          key={filter.key}
          label={filter.label}
          name={`${filter.key}__range`}
        >
          <DatePicker.RangePicker style={{ width: 240 }} />
        </Form.Item>
      );

    default:
      return null;
  }
};

/** 新增 / 编辑表单字段 → 控件 */
export const renderFormControl = (field: FormFieldSchema): ReactNode => {
  switch (field.control) {
    case 'textarea':
      return (
        <Input.TextArea
          rows={3}
          placeholder={field.placeholder}
          maxLength={200}
          showCount
        />
      );

    case 'inputNumber':
      return (
        <InputNumber
          style={{ width: '100%' }}
          placeholder={field.placeholder}
        />
      );

    case 'select':
      return (
        <Select
          allowClear
          placeholder={field.placeholder}
          options={field.options?.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      );

    case 'switch':
      return <Switch />;

    case 'date':
      return <DatePicker style={{ width: '100%' }} />;

    case 'datetime':
      return <DatePicker showTime style={{ width: '100%' }} />;

    case 'input':
    default:
      return <Input placeholder={field.placeholder} allowClear />;
  }
};

export const buildRules = (field: FormFieldSchema) =>
  field.required
    ? [{ required: true, message: field.placeholder || `请填写${field.label}` }]
    : undefined;

/** 把表单原始值归一化成查询条件（区间控件拆成两个 key） */
export const normalizeFilterValues = (
  raw: Record<string, unknown>,
  filters: FilterSchema[],
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};

  filters.forEach((filter) => {
    if (filter.control === 'numberRange') {
      next[filter.key] = [
        raw[`${filter.key}__min`] ?? undefined,
        raw[`${filter.key}__max`] ?? undefined,
      ];
      return;
    }

    if (filter.control === 'dateRange') {
      const range = raw[`${filter.key}__range`] as
        [Dayjs | null, Dayjs | null] | null | undefined;
      next[filter.key] =
        range?.[0] && range?.[1]
          ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')]
          : undefined;
      return;
    }

    next[filter.key] = raw[filter.key];
  });

  return next;
};
