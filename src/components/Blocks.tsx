import type { ChangeEvent } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Progress,
  Space,
  Statistic,
  Steps,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { HomeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import CellValue from './CellValue';
import { usePageRuntime } from './PageRuntime';
import { normalizeFilterValues, renderFilterControl } from './FormControls';
import { BLOCK_ICON_MAP } from '../registry/blockIcons';
import type { BlockIconKey } from '../registry/blockIcons';
import {
  asArray,
  asBool,
  asLines,
  asNumber,
  asString,
} from '../registry/componentLibrary';
import {
  aggregate,
  asMetric,
  asSource,
  formatAgg,
  groupAggregate,
} from '../registry/aggregate';
import type { PageBlock } from '../schema/types';
import type { Row } from '../mock/db';

const PALETTE: Record<string, string> = {
  blue: '#1677ff',
  green: '#52c41a',
  red: '#ff4d4f',
  gold: '#faad14',
  purple: '#722ed1',
  cyan: '#13c2c2',
  magenta: '#eb2f96',
  orange: '#fa8c16',
  default: '#8c8c8c',
  gray: '#bfbfbf',
};

const colorHex = (color: string): string => PALETTE[color] ?? PALETTE.blue;

interface BlockProps {
  block: PageBlock;
}

/* ---------------- 导航 ---------------- */

const BreadcrumbBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const raw = asLines(block.props.items);
  const items = raw.length ? raw : ['首页', rt?.page?.title ?? '当前页面'];
  const separator = asString(block.props.separator, '/');
  const showHome = asBool(block.props.showHome, true);

  return (
    <Breadcrumb
      className="block-breadcrumb"
      separator={separator}
      items={items.map((label, index) => ({
        key: `${label}-${index}`,
        title: (
          <Space size={4}>
            {showHome && index === 0 ? <HomeOutlined /> : null}
            <span>{label}</span>
          </Space>
        ),
      }))}
    />
  );
};

const PageHeaderBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const level = asNumber(block.props.level, 3);
  const title = asString(block.props.title) || rt?.page?.title || '页面标题';
  const subtitle =
    asString(block.props.subtitle) || `由模型 ${rt?.model?.key ?? ''} 自动生成`;
  const extra = asString(block.props.extra);

  return (
    <div className="block-page-header">
      <div>
        <Typography.Title
          level={level > 5 || level < 1 ? 3 : (level as 1 | 2 | 3 | 4 | 5)}
          className="block-page-title"
        >
          {title}
        </Typography.Title>
        <Typography.Text type="secondary">{subtitle}</Typography.Text>
      </div>
      {extra ? <span className="block-page-extra">{extra}</span> : null}
    </div>
  );
};

const TabsBlock = ({ block }: BlockProps) => {
  const rows = asArray(block.props.items);
  const type = asString(block.props.type, 'line') as
    'line' | 'card' | 'editable-card';
  const active = asNumber(block.props.defaultActive, 0);

  return (
    <Tabs
      type={type}
      defaultActiveKey={
        rows[active] ? asString(rows[active].key, String(active)) : undefined
      }
      items={rows.map((item, index) => ({
        key: asString(item.key, String(index)),
        label: asString(item.label, `标签${index + 1}`),
        children: (
          <div className="block-tab-content">{asString(item.content)}</div>
        ),
      }))}
    />
  );
};

const StepsBlock = ({ block }: BlockProps) => {
  const rows = asArray(block.props.items);
  const status = asString(block.props.status, 'process') as
    'wait' | 'process' | 'finish' | 'error';

  return (
    <Steps
      current={asNumber(block.props.current, 0)}
      status={status}
      items={rows.map((item, index) => ({
        key: index,
        title: asString(item.title, `步骤${index + 1}`),
        content: asString(item.description),
      }))}
    />
  );
};

/* ---------------- 布局 ---------------- */

const DividerBlock = ({ block }: BlockProps) => (
  <Divider
    dashed={asBool(block.props.dashed, true)}
    titlePlacement={
      asString(block.props.orientation, 'center') as 'left' | 'center' | 'right'
    }
  >
    {asString(block.props.text) || null}
  </Divider>
);

const CardBlock = ({ block }: BlockProps) => (
  <Card
    title={asString(block.props.title, '卡片标题')}
    extra={asString(block.props.extra) || undefined}
    bordered={asBool(block.props.bordered, true)}
    className="block-card"
  >
    <Typography.Paragraph className="block-card-content">
      {asString(block.props.content)}
    </Typography.Paragraph>
  </Card>
);

const GridBlock = ({ block }: BlockProps) => {
  const columns = asNumber(block.props.columns, 2);
  const rows = asArray(block.props.items);

  return (
    <div
      className="block-grid"
      style={{
        gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, columns))}, minmax(0, 1fr))`,
      }}
    >
      {rows.map((item, index) => (
        <Card
          key={index}
          size="small"
          title={asString(item.title, `模块 ${index + 1}`)}
        >
          <Typography.Text type="secondary">
            {asString(item.content)}
          </Typography.Text>
        </Card>
      ))}
    </div>
  );
};

const SpacerBlock = ({ block }: BlockProps) => (
  <div style={{ height: asNumber(block.props.height, 24) }} aria-hidden />
);

/* ---------------- 数据展示 ---------------- */

const StatCardsBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const rows = asArray(block.props.items);
  const columns = asNumber(block.props.columns, 3);
  // 老配置兼容：以前用 bindTotal 让第一张卡显示总条数
  const bindTotal = asBool(block.props.bindTotal, true);
  const dataRows = rt?.allRows ?? [];

  return (
    <div
      className="block-stat-grid"
      style={{
        gridTemplateColumns: `repeat(${Math.min(6, Math.max(1, columns))}, minmax(0, 1fr))`,
      }}
    >
      {rows.map((item, index) => {
        const iconKey = asString(item.icon, 'database') as BlockIconKey;
        const color = asString(item.color, 'blue');
        const source = asSource(
          item.source,
          index === 0 && bindTotal ? 'count' : 'static',
        );
        const computed =
          rt?.page && source !== 'static'
            ? aggregate(dataRows, source, asString(item.field))
            : null;
        const value =
          computed === null ? asString(item.value, '0') : formatAgg(computed);

        return (
          <Card key={index} size="small" className="block-stat-card">
            <Statistic
              title={asString(item.label, `指标 ${index + 1}`)}
              value={value}
              suffix={asString(item.suffix)}
              prefix={
                <span style={{ color: colorHex(color), marginRight: 6 }}>
                  {BLOCK_ICON_MAP[iconKey] ?? BLOCK_ICON_MAP.database}
                </span>
              }
              styles={{ content: { color: colorHex(color), fontSize: 24 } }}
            />
          </Card>
        );
      })}
    </div>
  );
};

const DataTableBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  if (!rt) return null;

  const title = asString(block.props.title);
  const size = asString(block.props.size, 'middle') as
    'small' | 'middle' | 'large';
  const bordered = asBool(block.props.bordered, false);
  const striped = asBool(block.props.striped, false);
  const showIndex = asBool(block.props.showIndex, false);
  const showActions = asBool(block.props.showActions, true);

  const columns: TableColumnsType<Row> = (rt.page?.columns ?? []).map(
    (column) => ({
      key: column.key,
      dataIndex: column.key,
      title: column.title,
      width: column.width,
      align: column.align,
      sorter: column.sortable === true,
      sortOrder: rt.sort?.field === column.key ? rt.sort.order : null,
      ellipsis: column.renderer === 'longText',
      render: (value: unknown) => (
        <CellValue
          renderer={column.renderer}
          value={value}
          options={column.options}
        />
      ),
    }),
  );

  if (showIndex) {
    columns.unshift({
      key: '__index',
      title: '#',
      width: 60,
      align: 'center',
      render: (_value, _record, index) =>
        (rt.pageNumber - 1) * rt.pageSize + index + 1,
    });
  }

  if (showActions) {
    columns.push({
      key: '__actions',
      title: '操作',
      width: 120,
      align: 'center',
      fixed: 'right',
      render: (_value, record) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => rt.openEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => rt.remove(record)}
          >
            删除
          </Button>
        </Space>
      ),
    });
  }

  return (
    <div className="block-table">
      {title || showActions ? (
        <div className="block-table-head">
          <Typography.Text strong>{title || rt.page?.title}</Typography.Text>
          {showActions ? (
            <Space>
              <Button icon={<ReloadOutlined />} onClick={rt.refresh}>
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={rt.openCreate}
              >
                新增
              </Button>
            </Space>
          ) : null}
        </div>
      ) : null}

      <Table<Row>
        rowKey={rt.page?.primaryKey ?? 'id'}
        columns={columns}
        dataSource={rt.rows}
        loading={rt.loading}
        size={size}
        bordered={bordered}
        scroll={{ x: 'max-content' }}
        rowClassName={(_record, index) =>
          striped && index % 2 ? 'block-table-striped' : ''
        }
        pagination={{
          current: rt.pageNumber,
          pageSize: rt.pageSize,
          total: rt.total,
          showTotal: (count) => `共 ${count} 条`,
        }}
        onChange={(pagination, _filters, sorter) => {
          rt.setPageNumber(pagination.current ?? 1);
          const active = Array.isArray(sorter) ? sorter[0] : sorter;
          rt.setSort(
            active?.order && active.field
              ? { field: String(active.field), order: active.order }
              : undefined,
          );
        }}
      />
    </div>
  );
};

const DescriptionsBlock = ({ block }: BlockProps) => {
  const rows = asArray(block.props.items);
  return (
    <Descriptions
      title={asString(block.props.title) || undefined}
      column={asNumber(block.props.column, 2)}
      bordered={asBool(block.props.bordered, true)}
      size="small"
      className="block-descriptions"
      items={rows.map((item, index) => ({
        key: index,
        label: asString(item.label, `项 ${index + 1}`),
        children: asString(item.value),
      }))}
    />
  );
};

/**
 * 自己画列表而不用 antd List：v6 起 List 已标记弃用（推荐 Listy 是虚拟滚动组件，
 * 这里只是几条静态条目，没必要引入它）。
 */
const ListBlock = ({ block }: BlockProps) => {
  const rows = asArray(block.props.items);
  const size = asString(block.props.size, 'default');
  const title = asString(block.props.title);
  const padding =
    size === 'large' ? '12px 14px' : size === 'small' ? '6px 14px' : '9px 14px';

  return (
    <div className="block-list">
      {title ? <div className="block-list-header">{title}</div> : null}
      {rows.length ? (
        rows.map((item, index) => (
          <div key={index} className="block-list-item" style={{ padding }}>
            <div className="block-list-main">
              <span className="block-list-title">
                {asString(item.title, '条目')}
              </span>
              {item.description ? (
                <span className="block-list-desc">
                  {asString(item.description)}
                </span>
              ) : null}
            </div>
            {item.extra ? (
              <span className="block-list-extra">{asString(item.extra)}</span>
            ) : null}
          </div>
        ))
      ) : (
        <Empty description="暂无条目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
};

const TimelineBlock = ({ block }: BlockProps) => {
  const rows = asArray(block.props.items);
  return (
    <Timeline
      className="block-timeline"
      items={rows.map((item, index) => ({
        key: index,
        title: asString(item.label),
        content: asString(item.content),
        color: asString(item.color, 'blue') as
          'blue' | 'green' | 'red' | 'gray',
      }))}
    />
  );
};

const TagGroupBlock = ({ block }: BlockProps) => (
  <Space wrap size={[4, 8]} className="block-tags">
    {asArray(block.props.items).map((item, index) => (
      <Tag key={index} color={asString(item.color, 'default')}>
        {asString(item.text, '标签')}
      </Tag>
    ))}
  </Space>
);

const ProgressListBlock = ({ block }: BlockProps) => (
  <div className="block-progress-list">
    {asArray(block.props.items).map((item, index) => (
      <div key={index} className="block-progress-item">
        <span>{asString(item.label, `进度 ${index + 1}`)}</span>
        <Progress
          percent={Math.min(100, Math.max(0, asNumber(item.percent, 0)))}
          strokeColor={colorHex(asString(item.color, 'blue'))}
        />
      </div>
    ))}
  </div>
);

const EmptyStateBlock = ({ block }: BlockProps) => (
  <Empty description={asString(block.props.description, '暂无数据')} />
);

/* ---------------- 数据录入 / 操作 ---------------- */

const SearchBoxBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  if (!rt) return null;

  const showButton = asBool(block.props.showButton, true);
  const common = {
    value: rt.keywordDraft,
    placeholder: asString(block.props.placeholder, '搜索关键字'),
    allowClear: asBool(block.props.allowClear, true),
    style: { width: asNumber(block.props.width, 280) },
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      rt.setKeywordDraft(value);
      if (!showButton) rt.setKeyword(value);
    },
  };

  return (
    <div className="block-search">
      {showButton ? (
        <Input.Search
          {...common}
          enterButton="搜索"
          onSearch={(value) => rt.setKeyword(value)}
        />
      ) : (
        <Input {...common} />
      )}
    </div>
  );
};

const FilterFormBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const [form] = Form.useForm();
  if (!rt) return null;

  const fields = asLines(block.props.fields);
  const vertical = asString(block.props.layout, 'inline') === 'vertical';
  const activeFilters = (rt.page?.filters ?? []).filter(
    (filter) => fields.length === 0 || fields.includes(filter.key),
  );

  const submit = () => {
    const raw = form.getFieldsValue() as Record<string, unknown>;
    rt.setFilters(normalizeFilterValues(raw, activeFilters));
  };

  return (
    <Form
      form={form}
      layout={vertical ? 'vertical' : 'inline'}
      className="block-filter-form"
      onFinish={submit}
    >
      {activeFilters.map(renderFilterControl)}
      <Form.Item className="block-filter-actions">
        <Space>
          {asBool(block.props.showSearchButton, true) ? (
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          ) : null}
          {asBool(block.props.showReset, true) ? (
            <Button
              onClick={() => {
                form.resetFields();
                rt.resetFilters();
              }}
            >
              重置
            </Button>
          ) : null}
        </Space>
      </Form.Item>
    </Form>
  );
};

const ButtonGroupBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const rows = asArray(block.props.items);
  const align = asString(block.props.align, 'left');

  const run = (action: string, text: string) => {
    if (!rt) return;
    switch (action) {
      case 'create':
        rt.openCreate();
        break;
      case 'refresh':
        rt.refresh();
        break;
      case 'export':
        rt.exportCsv();
        break;
      case 'reset':
        rt.resetFilters();
        break;
      default:
        rt.notify(`${text}：可在属性面板里更换动作`);
    }
  };

  return (
    <div className="block-buttons" style={{ justifyContent: align }}>
      {rows.map((item, index) => (
        <Button
          key={index}
          type={
            asString(item.type, 'default') as
              'primary' | 'default' | 'dashed' | 'link'
          }
          onClick={() =>
            run(asString(item.action, 'none'), asString(item.text, '按钮'))
          }
        >
          {asString(item.text, '按钮')}
        </Button>
      ))}
    </div>
  );
};

const DateRangeFilterBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  if (!rt) return null;
  const fieldKey = asString(block.props.fieldKey, 'createdAt');

  return (
    <Space className="block-date-filter" align="center">
      <span>{asString(block.props.label, '日期范围')}</span>
      <DatePicker.RangePicker
        onChange={(range) => {
          rt.patchFilter(
            fieldKey,
            range?.[0] && range?.[1]
              ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')]
              : undefined,
          );
        }}
      />
    </Space>
  );
};

/* ---------------- 反馈 ---------------- */

const AlertNoticeBlock = ({ block }: BlockProps) => (
  <Alert
    className="block-alert"
    title={asString(block.props.message, '提示')}
    description={asString(block.props.description) || undefined}
    type={
      asString(block.props.type, 'info') as
        'success' | 'info' | 'warning' | 'error'
    }
    showIcon={asBool(block.props.showIcon, true)}
    closable={asBool(block.props.closable, false)}
  />
);

/* ---------------- 图表 ---------------- */

const ChartBlock = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const chartType = asString(block.props.chartType, 'bar');
  const title = asString(block.props.title, '数据分布');
  const groupBy = asString(block.props.groupBy, 'status');
  const metric = asMetric(block.props.metric, 'count');
  const valueField = asString(block.props.valueField);
  const height = asNumber(block.props.height, 220);
  const mainColor = colorHex(asString(block.props.color, 'blue'));

  // 静态模式 / 页面没绑模型时用手填数据，保证图表在空白页上也画得出来
  const staticEntries = asArray(block.props.series).map(
    (item) =>
      [asString(item.label, '类目'), asNumber(item.value, 0)] as [
        string,
        number,
      ],
  );
  const useStatic =
    asString(block.props.dataMode, 'model') === 'static' || !rt?.page;

  const counts = groupAggregate(rt?.allRows ?? [], groupBy, metric, valueField);
  const entries = (useStatic ? staticEntries : counts).slice(0, 12);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  const palette = Object.values(PALETTE).filter(
    (color) => color !== PALETTE.gray,
  );

  const renderPlot = () => {
    if (!entries.length) {
      return (
        <Empty
          description="暂无可统计的数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (chartType === 'pie') {
      const total = entries.reduce((sum, [, value]) => sum + value, 0);
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      let offset = 0;
      return (
        <div className="block-chart-pie">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="22"
            />
            {entries.map(([label, value], index) => {
              const length = (value / total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const circle = (
                <circle
                  key={label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={
                    index === 0 ? mainColor : palette[index % palette.length]
                  }
                  strokeWidth="22"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="block-chart-legend">
            {entries.map(([label, value], index) => (
              <div key={label}>
                <span
                  className="block-chart-dot"
                  style={{
                    background:
                      index === 0 ? mainColor : palette[index % palette.length],
                  }}
                />
                {label} · {value}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (chartType === 'line') {
      const width = Math.max(320, entries.length * 70);
      const plotHeight = Math.max(80, height - 50);
      const points = entries
        .map(([, value], index) => {
          const x =
            (index / Math.max(1, entries.length - 1)) * (width - 40) + 20;
          const y = plotHeight - (value / max) * (plotHeight - 20) + 10;
          return `${x},${y}`;
        })
        .join(' ');
      return (
        <div className="block-chart-line" style={{ overflowX: 'auto' }}>
          <svg width={width} height={plotHeight + 30}>
            <polyline
              points={points}
              fill="none"
              stroke={mainColor}
              strokeWidth="2"
            />
            {points.split(' ').map((point, index) => {
              const [x, y] = point.split(',');
              return (
                <circle key={index} cx={x} cy={y} r="3.5" fill={mainColor} />
              );
            })}
            {entries.map(([label], index) => (
              <text
                key={label}
                x={
                  (index / Math.max(1, entries.length - 1)) * (width - 40) + 20
                }
                y={plotHeight + 24}
                textAnchor="middle"
                fontSize="11"
                fill="#8b8794"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      );
    }

    return (
      <div className="block-chart-bars" style={{ height }}>
        {entries.map(([label, value], index) => (
          <div key={label} className="block-chart-bar">
            <span className="block-chart-bar-value">{value}</span>
            <div className="block-chart-bar-track">
              <div
                className="block-chart-bar-fill"
                style={{
                  height: `${(value / max) * 100}%`,
                  background:
                    index === 0 ? mainColor : palette[index % palette.length],
                }}
              />
            </div>
            <span className="block-chart-bar-label" title={label}>
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card size="small" title={title} className="block-chart">
      <Typography.Text type="secondary" className="block-chart-hint">
        {useStatic
          ? `静态数据 · ${entries.length} 个类目`
          : metric === 'count'
            ? `按 ${groupBy} 分组计数 · 共 ${(rt?.allRows ?? []).length} 条`
            : `按 ${groupBy} 分组对 ${valueField || '数值字段'} ${metric === 'sum' ? '求和' : '求平均'}`}
      </Typography.Text>
      {renderPlot()}
    </Card>
  );
};

/* ---------------- 分发 ---------------- */

/** 单个组件块渲染：编辑画布与预览共用，编辑态只是在外面套一层 EditableBox */
export const BlockView = ({ block }: BlockProps) => {
  const rt = usePageRuntime();
  const resetToken = rt?.resetToken ?? 0;

  switch (block.type) {
    case 'breadcrumb':
      return <BreadcrumbBlock block={block} />;
    case 'pageHeader':
      return <PageHeaderBlock block={block} />;
    case 'tabs':
      return <TabsBlock block={block} />;
    case 'stepsBar':
      return <StepsBlock block={block} />;
    case 'divider':
      return <DividerBlock block={block} />;
    case 'card':
      return <CardBlock block={block} />;
    case 'grid':
      return <GridBlock block={block} />;
    case 'spacer':
      return <SpacerBlock block={block} />;
    case 'statCards':
      return <StatCardsBlock block={block} />;
    case 'dataTable':
      return <DataTableBlock block={block} />;
    case 'descriptions':
      return <DescriptionsBlock block={block} />;
    case 'listBlock':
      return <ListBlock block={block} />;
    case 'timeline':
      return <TimelineBlock block={block} />;
    case 'tagGroup':
      return <TagGroupBlock block={block} />;
    case 'progressList':
      return <ProgressListBlock block={block} />;
    case 'emptyState':
      return <EmptyStateBlock block={block} />;
    case 'searchBox':
      return <SearchBoxBlock key={`${block.id}:${resetToken}`} block={block} />;
    case 'filterForm':
      return (
        <FilterFormBlock key={`${block.id}:${resetToken}`} block={block} />
      );
    case 'buttonGroup':
      return <ButtonGroupBlock block={block} />;
    case 'dateRangeFilter':
      return <DateRangeFilterBlock block={block} />;
    case 'alertNotice':
      return <AlertNoticeBlock block={block} />;
    case 'chart':
      return <ChartBlock block={block} />;
    default:
      return null;
  }
};
