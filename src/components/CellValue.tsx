import { Tag, Tooltip, Typography } from 'antd';
import type { ColumnRenderer, EnumOption } from '../schema/types';
import { formatDate, formatDateTime, formatNumber } from '../utils/format';

interface CellValueProps {
  renderer: ColumnRenderer;
  value: unknown;
  options?: EnumOption[];
}

const CellValue = ({ renderer, value, options }: CellValueProps) => {
  if (value === undefined || value === null || value === '') {
    return <span className="cell-empty">—</span>;
  }

  switch (renderer) {
    case 'tag': {
      const option = options?.find((item) => item.value === String(value));
      return (
        <Tag color={option?.color ?? 'default'}>
          {option?.label ?? String(value)}
        </Tag>
      );
    }

    case 'boolean':
      return value ? <Tag color="green">是</Tag> : <Tag>否</Tag>;

    case 'number':
      return <span className="cell-number">{formatNumber(value)}</span>;

    case 'date':
      return <span>{formatDate(value)}</span>;

    case 'datetime':
      return <span>{formatDateTime(value)}</span>;

    case 'longText':
      return (
        <Tooltip title={String(value)}>
          <Typography.Text className="cell-long-text" ellipsis>
            {String(value)}
          </Typography.Text>
        </Tooltip>
      );

    case 'relation':
    case 'text':
    default:
      return <span>{String(value)}</span>;
  }
};

export default CellValue;
