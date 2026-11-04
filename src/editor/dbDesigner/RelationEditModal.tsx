import { useEffect, useMemo } from 'react';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from 'antd';
import type {
  DatabaseSchema,
  DbRelation,
  RelationKind,
} from '../../schema/types';
import {
  createDbRelation,
  findDbTable,
  isColumnKeyTaken,
  mirrorColumn,
  suggestForeignKeyName,
} from '../dbOps';
import { useProjectStore } from '../../store/projectStore';

const KIND_OPTIONS = [
  { value: 'oneToOne', label: '一对一（1:1）' },
  { value: 'oneToMany', label: '一对多（1:N）' },
  { value: 'manyToMany', label: '多对多（M:N，自动生成中间表）' },
];

interface RelationFormValues {
  kind: RelationKind;
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  autoCreateFk: boolean;
}

interface RelationEditModalProps {
  open: boolean;
  /** edit 模式传入现有关系；create 模式不传 */
  relation?: DbRelation;
  database: DatabaseSchema;
  onCancel: () => void;
}

/**
 * 新建 / 编辑关系。方向约定：源表持外键，目标表被引用；
 * 多对多不需要列配置，中间表由 SQL 生成器派生。
 */
const RelationEditModal = ({
  open,
  relation,
  database,
  onCancel,
}: RelationEditModalProps) => {
  const [form] = Form.useForm<RelationFormValues>();
  const addDbRelation = useProjectStore((state) => state.addDbRelation);
  const updateDbRelation = useProjectStore((state) => state.updateDbRelation);
  const removeDbRelation = useProjectStore((state) => state.removeDbRelation);
  const addDbColumn = useProjectStore((state) => state.addDbColumn);

  const isEdit = Boolean(relation);

  const tableOptions = useMemo(
    () =>
      database.tables.map((table) => ({
        value: table.key,
        label: table.name,
      })),
    [database.tables],
  );

  useEffect(() => {
    if (!open) return;

    if (relation) {
      form.setFieldsValue({
        kind: relation.kind,
        fromTable: relation.fromTable,
        toTable: relation.toTable,
        fromColumn: relation.fromColumn,
        toColumn: relation.toColumn,
        autoCreateFk: false,
      });
    } else {
      const first = database.tables[0];
      const second = database.tables[1] ?? database.tables[0];
      form.setFieldsValue({
        kind: 'oneToMany',
        fromTable: second?.key,
        toTable: first?.key,
        fromColumn: '',
        toColumn: '',
        autoCreateFk: true,
      });
    }
    // 只在打开时初始化，编辑过程中不覆盖表单
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, relation?.id]);

  const kind = Form.useWatch('kind', form);
  const fromTableKey = Form.useWatch('fromTable', form);
  const toTableKey = Form.useWatch('toTable', form);
  const autoCreateFk = Form.useWatch('autoCreateFk', form);

  const fromTable = fromTableKey
    ? findDbTable(database, fromTableKey)
    : undefined;
  const toTable = toTableKey ? findDbTable(database, toTableKey) : undefined;

  const toPk = toTable?.columns.find((column) => column.primary);

  /** 自动创建外键时的列名预览（含重名去重） */
  const suggestedFkName = useMemo(() => {
    if (!fromTable || !toTable) return '';
    let name = suggestForeignKeyName(toTable);
    let seq = 2;
    while (isColumnKeyTaken(fromTable, name)) {
      name = `${suggestForeignKeyName(toTable)}_${seq++}`;
    }
    return name;
  }, [fromTable, toTable]);

  const columnOptions = (tableKey?: string) => {
    const table = tableKey ? findDbTable(database, tableKey) : undefined;
    return (
      table?.columns.map((column) => ({
        value: column.key,
        label: `${column.key}（${column.dbType}）`,
      })) ?? []
    );
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    if (isEdit && relation) {
      updateDbRelation(relation.id, {
        kind: values.kind,
        fromTable: values.fromTable,
        toTable: values.toTable,
        fromColumn: values.fromColumn,
        toColumn: values.toColumn,
      });
      onCancel();
      return;
    }

    const fromPk = fromTable?.columns.find((column) => column.primary);
    const finalToColumn =
      values.kind === 'manyToMany'
        ? (toPk?.key ?? values.toColumn)
        : values.toColumn;
    const finalFromColumn =
      values.kind === 'manyToMany'
        ? (fromPk?.key ?? values.fromColumn)
        : values.fromColumn;

    // 自动创建外键列：类型镜像被引用列，非空 + 索引
    if (
      values.kind !== 'manyToMany' &&
      values.autoCreateFk &&
      fromTable &&
      toPk &&
      suggestedFkName
    ) {
      addDbColumn(fromTable.key, {
        ...mirrorColumn(toPk),
        key: suggestedFkName,
        label: `关联 ${toTable?.name ?? ''}`,
        indexed: true,
      });
    }

    addDbRelation(
      createDbRelation(
        values.kind,
        values.fromTable,
        finalFromColumn,
        values.toTable,
        finalToColumn,
      ),
    );
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑关系' : '新建关系'}
      onCancel={onCancel}
      footer={
        <div className="db-modal-footer">
          {isEdit ? (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                removeDbRelation(relation!.id);
                onCancel();
              }}
            >
              删除关系
            </Button>
          ) : null}
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              {isEdit ? '保存' : '创建'}
            </Button>
          </Space>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="db-relation-form">
        <Form.Item name="kind" label="关系类型" rules={[{ required: true }]}>
          <Select options={KIND_OPTIONS} />
        </Form.Item>

        <div className="db-relation-tables">
          <Form.Item
            name="fromTable"
            label="源表（多的一侧 / 持外键）"
            rules={[{ required: true, message: '请选择源表' }]}
          >
            <Select
              options={tableOptions}
              showSearch
              optionFilterProp="label"
              onChange={() => form.setFieldValue('fromColumn', undefined)}
            />
          </Form.Item>

          <Form.Item
            name="toTable"
            label="目标表（一的一侧 / 被引用）"
            rules={[
              { required: true, message: '请选择目标表' },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || value !== getFieldValue('fromTable')
                    ? Promise.resolve()
                    : Promise.reject(new Error('暂不支持同一张表自关联')),
              }),
            ]}
          >
            <Select
              options={tableOptions}
              showSearch
              optionFilterProp="label"
              onChange={(value) => {
                // 目标表换了，被引用列重置为新表主键
                const pk = findDbTable(database, value)?.columns.find(
                  (column) => column.primary,
                );
                form.setFieldValue('toColumn', pk?.key ?? undefined);
              }}
            />
          </Form.Item>
        </div>

        {kind !== 'manyToMany' ? (
          <>
            {fromTable && !isEdit ? (
              <Form.Item name="autoCreateFk" valuePropName="checked">
                <Checkbox>自动在源表创建外键列</Checkbox>
              </Form.Item>
            ) : null}

            {autoCreateFk && !isEdit && fromTable && toTable ? (
              <div className="db-fk-preview">
                <Typography.Text type="secondary">将创建列：</Typography.Text>
                <Input
                  size="small"
                  className="field-key-input"
                  value={suggestedFkName}
                  readOnly
                  style={{ width: 160 }}
                />
                <Typography.Text type="secondary">
                  {toPk
                    ? `（类型 ${toPk.dbType}，非空，自动建索引）`
                    : '（目标表没有主键，无法推断类型）'}
                </Typography.Text>
              </div>
            ) : null}

            <div className="db-relation-tables">
              <Form.Item
                name="fromColumn"
                label="外键列（源表）"
                dependencies={['fromTable', 'autoCreateFk']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      getFieldValue('autoCreateFk') && !isEdit
                        ? Promise.resolve()
                        : value
                          ? Promise.resolve()
                          : Promise.reject(new Error('请选择外键列')),
                  }),
                ]}
              >
                <Select
                  options={columnOptions(fromTableKey)}
                  placeholder={
                    autoCreateFk && !isEdit
                      ? `自动创建（${suggestedFkName || '待选表'}）`
                      : '选择已有列'
                  }
                  disabled={autoCreateFk && !isEdit}
                  allowClear
                  showSearch
                />
              </Form.Item>

              <Form.Item
                name="toColumn"
                label="被引用列（目标表）"
                rules={[{ required: true, message: '请选择被引用列' }]}
              >
                <Select
                  options={columnOptions(toTableKey)}
                  placeholder="通常选主键"
                  showSearch
                />
              </Form.Item>
            </div>
          </>
        ) : (
          <div className="db-join-hint">
            <InfoCircleOutlined />
            <span>
              中间表将在生成 SQL 时自动派生（含联合主键与双向外键），
              无需手动建表。
            </span>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default RelationEditModal;
