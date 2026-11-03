import {
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  TableOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { MENU_ICONS } from '../schema/types';
import type { MenuIconKey } from '../schema/types';

/**
 * icon 在 Schema 里只存字符串，渲染时才映射成组件。
 * 这是菜单能落盘、能版本化、能 diff 的前提。
 */
export const MENU_ICON_MAP: Record<MenuIconKey, ReactNode> = {
  dashboard: <DashboardOutlined />,
  users: <TeamOutlined />,
  table: <TableOutlined />,
  chart: <BarChartOutlined />,
  setting: <SettingOutlined />,
  file: <FileTextOutlined />,
};

export const MENU_ICON_LABELS: Record<MenuIconKey, string> = {
  dashboard: '仪表盘',
  users: '用户 / 团队',
  table: '表格',
  chart: '图表',
  setting: '设置',
  file: '文件',
};

export const MENU_ICON_OPTIONS = MENU_ICONS.map((key) => ({
  value: key,
  label: MENU_ICON_LABELS[key],
}));
