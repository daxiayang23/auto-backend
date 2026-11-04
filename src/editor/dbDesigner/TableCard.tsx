import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { KeyOutlined, LinkOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { DatabaseSchema, DbTable } from '../../schema/types';
import { DB_TYPE_LABELS, isForeignKeyColumn } from '../dbOps';
import { CARD_WIDTH, cardHeight } from './geometry';

interface TableCardProps {
  table: DbTable;
  database: DatabaseSchema;
  selected: boolean;
  onSelect: (key: string) => void;
  onMove: (key: string, x: number, y: number) => void;
}

/**
 * ER 画布上的表卡片：拖动标题栏改坐标（松手才提交），
 * 点卡片本体打开结构编辑抽屉。
 */
const TableCard = ({
  table,
  database,
  selected,
  onSelect,
  onMove,
}: TableCardProps) => {
  const [drag, setDrag] = useState<{
    dx: number;
    dy: number;
    originX: number;
    originY: number;
  } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!drag) return;

    const startX = table.x;
    const startY = table.y;

    const onMoveWindow = (event: globalThis.MouseEvent) => {
      movedRef.current = true;
      setDrag({
        dx: event.clientX - drag.originX,
        dy: event.clientY - drag.originY,
        originX: drag.originX,
        originY: drag.originY,
      });
    };

    const onUpWindow = (event: globalThis.MouseEvent) => {
      const nextX = Math.max(0, startX + event.clientX - drag.originX);
      const nextY = Math.max(0, startY + event.clientY - drag.originY);
      onMove(table.key, nextX, nextY);
      setDrag(null);
    };

    window.addEventListener('mousemove', onMoveWindow);
    window.addEventListener('mouseup', onUpWindow);
    return () => {
      window.removeEventListener('mousemove', onMoveWindow);
      window.removeEventListener('mouseup', onUpWindow);
    };
    // 拖拽期间 table.x / y 不变（松手才提交），无需依赖其更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.originX, drag?.originY]);

  const startDrag = (event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    movedRef.current = false;
    setDrag({ dx: 0, dy: 0, originX: event.clientX, originY: event.clientY });
  };

  const handleClick = () => {
    if (movedRef.current) return; // 拖完不当作点击
    onSelect(table.key);
  };

  const x = table.x + (drag?.dx ?? 0);
  const y = table.y + (drag?.dy ?? 0);

  return (
    <div
      className={`db-card${selected ? ' is-selected' : ''}${drag ? ' is-dragging' : ''}`}
      style={{ left: x, top: y, width: CARD_WIDTH, height: cardHeight(table) }}
      onClick={handleClick}
      data-table-key={table.key}
    >
      <div className="db-card-header" onMouseDown={startDrag}>
        <span className="db-card-name" title={table.comment || table.name}>
          {table.name}
        </span>
        <span className="db-card-count">{table.columns.length} 列</span>
      </div>

      <div className="db-card-body">
        {table.columns.map((column) => {
          const isFk = isForeignKeyColumn(database, table.key, column.key);

          return (
            <div className="db-card-row" key={column.key}>
              <span className="db-card-col-key">
                {column.primary ? (
                  <Tooltip title="主键">
                    <KeyOutlined className="db-icon-pk" />
                  </Tooltip>
                ) : isFk ? (
                  <Tooltip title="外键">
                    <LinkOutlined className="db-icon-fk" />
                  </Tooltip>
                ) : (
                  <span className="db-icon-plain" />
                )}
                {column.key}
              </span>
              <span className="db-card-col-type">
                {column.dbType === 'varchar' || column.dbType === 'decimal'
                  ? `${DB_TYPE_LABELS[column.dbType].split(' ')[0]}(${column.length ?? ''}${
                      column.dbType === 'decimal' ? `,${column.scale ?? 0}` : ''
                    })`
                  : DB_TYPE_LABELS[column.dbType].split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TableCard;
