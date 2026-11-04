import type { DatabaseSchema, DbRelation } from '../../schema/types';
import { cardCenter } from './geometry';

const KIND_LABELS: Record<DbRelation['kind'], string> = {
  oneToOne: '1 : 1',
  oneToMany: '1 : N',
  manyToMany: 'M : N',
};

interface RelationEdgesProps {
  database: DatabaseSchema;
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 关系连线层：压在卡片下层的 SVG，从表中心连到表中心，
 * 露出来的部分就是连线。点线可以选中编辑关系。
 */
const RelationEdges = ({
  database,
  width,
  height,
  selectedId,
  onSelect,
}: RelationEdgesProps) => {
  const byKey = new Map(database.tables.map((table) => [table.key, table]));

  return (
    <svg
      className="db-edges"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {database.relations.map((relation) => {
        const from = byKey.get(relation.fromTable);
        const to = byKey.get(relation.toTable);
        if (!from || !to) return null;

        const a = cardCenter(from);
        const b = cardCenter(to);
        const selected = relation.id === selectedId;

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;

        return (
          <g
            key={relation.id}
            className={`db-edge${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(relation.id)}
          >
            {/* 加粗的透明线做点击热区 */}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="db-edge-hit" />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="db-edge-line"
            />
            <rect
              x={midX - 26}
              y={midY - 10}
              width={52}
              height={20}
              rx={10}
              className="db-edge-label-bg"
            />
            <text
              x={midX}
              y={midY + 4}
              textAnchor="middle"
              className="db-edge-label"
            >
              {KIND_LABELS[relation.kind]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default RelationEdges;
