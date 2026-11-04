import { useMemo, useState } from 'react';
import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { App, Button, Modal, Segmented, Space, Tag } from 'antd';
import type { DatabaseSchema, SqlDialect } from '../../schema/types';
import { SQL_DIALECTS } from '../../schema/types';
import { SQL_DIALECT_LABELS, generateSql } from '../../registry/generateSql';

interface SqlPreviewModalProps {
  open: boolean;
  database: DatabaseSchema;
  onCancel: () => void;
}

/**
 * SQL 预览：方言一键切换，复制 / 下载生成的 DDL。
 * 语句顺序按外键依赖拓扑排好，拿到 MySQL / PG 客户端里可以直接整段执行。
 */
const SqlPreviewModal = ({
  open,
  database,
  onCancel,
}: SqlPreviewModalProps) => {
  const { message } = App.useApp();
  const [dialect, setDialect] = useState<SqlDialect>('mysql');

  const sql = useMemo(
    () => generateSql(database, dialect),
    [database, dialect],
  );

  const joinTableCount = database.relations.filter(
    (relation) => relation.kind === 'manyToMany',
  ).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择文本复制');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([sql], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `autobackend-${dialect}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('已下载 SQL 文件');
  };

  return (
    <Modal
      open={open}
      title="生成 SQL"
      onCancel={onCancel}
      width={880}
      footer={
        <Space>
          <Button onClick={onCancel}>关闭</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载 .sql
          </Button>
          <Button type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
            复制全部
          </Button>
        </Space>
      }
    >
      <div className="db-sql-toolbar">
        <Segmented<SqlDialect>
          value={dialect}
          onChange={setDialect}
          options={SQL_DIALECTS.map((item) => ({
            label: SQL_DIALECT_LABELS[item],
            value: item,
          }))}
        />
        <Space size={6}>
          <Tag>{database.tables.length} 张表</Tag>
          <Tag>{database.relations.length} 条关系</Tag>
          {joinTableCount ? (
            <Tag color="purple">{joinTableCount} 张中间表自动派生</Tag>
          ) : null}
        </Space>
      </div>

      <pre className="db-sql-preview">
        <code>{sql}</code>
      </pre>

      <div className="db-sql-hint">
        <CheckOutlined />
        <span>
          建表语句已按外键依赖排序，可直接在 {SQL_DIALECT_LABELS[dialect]}{' '}
          客户端整段执行；执行前请确认目标库为空或表名不冲突。
        </span>
      </div>
    </Modal>
  );
};

export default SqlPreviewModal;
