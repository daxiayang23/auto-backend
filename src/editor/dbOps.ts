import { nanoid } from 'nanoid';
import type {
  DatabaseSchema,
  DbColumn,
  DbColumnType,
  DbRelation,
  DbTable,
} from '../schema/types';

/** 列类型的展示元数据（与 modelOps 的 fieldTypeOptions 同一套思路） */
export const DB_TYPE_LABELS: Record<DbColumnType, string> = {
  int: 'INT 整数',
  bigint: 'BIGINT 长整数',
  decimal: 'DECIMAL 定点小数',
  varchar: 'VARCHAR 短文本',
  text: 'TEXT 长文本',
  boolean: 'BOOLEAN 布尔',
  date: 'DATE 日期',
  datetime: 'DATETIME 日期时间',
  json: 'JSON 文档',
  uuid: 'UUID 标识',
};

export const dbTypeOptions = (
  Object.keys(DB_TYPE_LABELS) as DbColumnType[]
).map((type) => ({ value: type, label: DB_TYPE_LABELS[type] }));

/** 该类型是否有长度配置 */
export const typeHasLength = (type: DbColumnType): boolean =>
  type === 'varchar' || type === 'decimal';

/** 该类型是否支持自增 */
export const typeSupportsAutoIncrement = (type: DbColumnType): boolean =>
  type === 'int' || type === 'bigint';

/**
 * 数据库表编排的不可变操作。与 modelOps 同一套套路：
 * 全是纯函数，改列名 / 删表时把关系引用一并维护好，保证 Schema 永远自洽。
 */

export const DB_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const isValidDbKey = (key: string): boolean => DB_KEY_PATTERN.test(key);

export const EMPTY_DATABASE: DatabaseSchema = { tables: [], relations: [] };

/** 旧版本 Schema 没有 database 字段时的兜底 */
export const ensureDatabase = (
  database: DatabaseSchema | undefined,
): DatabaseSchema => database ?? EMPTY_DATABASE;

export const findDbTable = (
  database: DatabaseSchema,
  key: string,
): DbTable | undefined => database.tables.find((table) => table.key === key);

export const createDbTable = (
  existing: DbTable[],
  name = 'new_table',
): DbTable => {
  // 重名自动追加序号，物理表名必须唯一
  const taken = new Set(existing.map((table) => table.name));
  let finalName = name;
  let seq = 2;
  while (taken.has(finalName)) finalName = `${name}_${seq++}`;

  // 新表错开摆放，避免盖住已有卡片
  const offset = existing.length * 36;

  return {
    key: `tbl_${nanoid(6)}`,
    name: finalName,
    comment: '',
    x: 60 + offset,
    y: 60 + offset,
    columns: [
      {
        key: 'id',
        label: '主键',
        dbType: 'bigint',
        primary: true,
        autoIncrement: true,
      },
    ],
  };
};

export const createDbColumn = (table: DbTable): DbColumn => {
  const taken = new Set(table.columns.map((column) => column.key));
  let key = 'new_column';
  let seq = 2;
  while (taken.has(key)) key = `new_column_${seq++}`;

  return { key, label: '', dbType: 'varchar', length: 128 };
};

export const isColumnKeyTaken = (
  table: DbTable,
  key: string,
  except?: string,
): boolean =>
  table.columns.some((column) => column.key === key && column.key !== except);

/** 外键列命名建议：users → user_id */
export const suggestForeignKeyName = (targetTable: DbTable): string => {
  const base = targetTable.name.replace(/ies$/, 'y').replace(/s$/, '');
  return `${base || targetTable.name}_id`;
};

/** 外键列拷贝被引用列的类型（去掉主键 / 自增语义） */
export const mirrorColumn = (target: DbColumn): DbColumn => ({
  key: '',
  dbType: target.dbType === 'uuid' ? 'uuid' : target.dbType,
  length: target.length,
  scale: target.scale,
  nullable: false,
});

/* -------------------- 表 -------------------- */

export const addDbTable = (
  database: DatabaseSchema,
  table: DbTable,
): DatabaseSchema => ({
  ...database,
  tables: [...database.tables, table],
});

export const updateDbTable = (
  database: DatabaseSchema,
  key: string,
  patch: Partial<DbTable>,
): DatabaseSchema => ({
  ...database,
  tables: database.tables.map((table) =>
    table.key === key ? { ...table, ...patch } : table,
  ),
});

export const moveDbTable = (
  database: DatabaseSchema,
  key: string,
  x: number,
  y: number,
): DatabaseSchema => ({
  ...database,
  tables: database.tables.map((table) =>
    table.key === key ? { ...table, x, y } : table,
  ),
});

/** 删除表时清掉两端挂着的所有关系，否则校验不过 */
export const removeDbTable = (
  database: DatabaseSchema,
  key: string,
): DatabaseSchema => ({
  tables: database.tables.filter((table) => table.key !== key),
  relations: database.relations.filter(
    (relation) => relation.fromTable !== key && relation.toTable !== key,
  ),
});

/** 拓扑序自动布局：被引用的表排前面，三列网格 */
export const autoLayoutTables = (database: DatabaseSchema): DatabaseSchema => {
  const depth = new Map<string, number>();
  const compute = (key: string, visited: Set<string>): number => {
    if (depth.has(key)) return depth.get(key)!;
    if (visited.has(key)) return 0; // 环保护
    visited.add(key);
    const parents = database.relations
      .filter((relation) => relation.fromTable === key)
      .map((relation) => compute(relation.toTable, visited));
    const value = parents.length ? Math.max(...parents) + 1 : 0;
    depth.set(key, value);
    return value;
  };
  database.tables.forEach((table) => compute(table.key, new Set()));

  const sorted = [...database.tables].sort(
    (a, b) => (depth.get(a.key) ?? 0) - (depth.get(b.key) ?? 0),
  );

  return {
    ...database,
    tables: sorted.map((table, index) => ({
      ...table,
      x: 48 + (index % 3) * 320,
      y: 48 + Math.floor(index / 3) * 300,
    })),
  };
};

/* -------------------- 列 -------------------- */

const mapTableColumns = (
  database: DatabaseSchema,
  tableKey: string,
  updater: (columns: DbColumn[], table: DbTable) => DbColumn[],
): DatabaseSchema => ({
  ...database,
  tables: database.tables.map((table) =>
    table.key !== tableKey
      ? table
      : { ...table, columns: updater(table.columns, table) },
  ),
});

/** 改列名时把关系上的引用同步改掉 */
const renameColumnRefs = (
  database: DatabaseSchema,
  tableKey: string,
  from: string,
  to: string,
): DatabaseSchema => ({
  ...database,
  relations: database.relations.map((relation) => {
    if (relation.fromTable === tableKey && relation.fromColumn === from) {
      return { ...relation, fromColumn: to };
    }
    if (relation.toTable === tableKey && relation.toColumn === from) {
      return { ...relation, toColumn: to };
    }
    return relation;
  }),
});

export const addDbColumn = (
  database: DatabaseSchema,
  tableKey: string,
  column: DbColumn,
): DatabaseSchema =>
  mapTableColumns(database, tableKey, (columns) => [...columns, column]);

export const updateDbColumn = (
  database: DatabaseSchema,
  tableKey: string,
  columnKey: string,
  patch: Partial<DbColumn>,
): DatabaseSchema => {
  let next = mapTableColumns(database, tableKey, (columns) =>
    columns.map((column) =>
      column.key === columnKey ? { ...column, ...patch } : column,
    ),
  );

  if (patch.key && patch.key !== columnKey) {
    next = renameColumnRefs(next, tableKey, columnKey, patch.key);
  }

  return next;
};

/** 删列时挂在该列上的关系一起删 */
export const removeDbColumn = (
  database: DatabaseSchema,
  tableKey: string,
  columnKey: string,
): DatabaseSchema => ({
  ...mapTableColumns(database, tableKey, (columns) =>
    columns.filter((column) => column.key !== columnKey),
  ),
  relations: database.relations.filter(
    (relation) =>
      !(
        (relation.fromTable === tableKey &&
          relation.fromColumn === columnKey) ||
        (relation.toTable === tableKey && relation.toColumn === columnKey)
      ),
  ),
});

/** 切换列类型时清掉不再有意义的长度配置 */
export const withDbTypeApplied = (
  column: DbColumn,
  dbType: DbColumnType,
): DbColumn => {
  if (dbType === column.dbType) return column;

  const next: DbColumn = { ...column, dbType };

  if (dbType === 'varchar') {
    next.length = column.length ?? 128;
  } else if (dbType !== 'decimal') {
    delete next.length;
    delete next.scale;
  }

  if (dbType !== 'boolean' && next.defaultValue === 'false') {
    delete next.defaultValue;
  }

  if (dbType !== 'int' && dbType !== 'bigint') {
    delete next.autoIncrement;
  }

  return next;
};

/* -------------------- 关系 -------------------- */

export const createDbRelation = (
  kind: DbRelation['kind'],
  fromTable: string,
  fromColumn: string,
  toTable: string,
  toColumn: string,
): DbRelation => ({
  id: `rel_${nanoid(6)}`,
  kind,
  fromTable,
  fromColumn,
  toTable,
  toColumn,
});

export const addDbRelation = (
  database: DatabaseSchema,
  relation: DbRelation,
): DatabaseSchema => ({
  ...database,
  relations: [...database.relations, relation],
});

export const updateDbRelation = (
  database: DatabaseSchema,
  id: string,
  patch: Partial<DbRelation>,
): DatabaseSchema => ({
  ...database,
  relations: database.relations.map((relation) =>
    relation.id === id ? { ...relation, ...patch } : relation,
  ),
});

export const removeDbRelation = (
  database: DatabaseSchema,
  id: string,
): DatabaseSchema => ({
  ...database,
  relations: database.relations.filter((relation) => relation.id !== id),
});

/** 该列是否作为某条关系的外键端点（画卡片时打 FK 标） */
export const isForeignKeyColumn = (
  database: DatabaseSchema,
  tableKey: string,
  columnKey: string,
): boolean =>
  database.relations.some(
    (relation) =>
      relation.fromTable === tableKey && relation.fromColumn === columnKey,
  );

export const getTableRelations = (
  database: DatabaseSchema,
  tableKey: string,
): DbRelation[] =>
  database.relations.filter(
    (relation) =>
      relation.fromTable === tableKey || relation.toTable === tableKey,
  );
