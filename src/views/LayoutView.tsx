import {
  AppstoreOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Dropdown,
  Layout,
  Menu,
  theme,
  Typography,
} from 'antd';
import { useState } from 'react';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: 'users', icon: <TeamOutlined />, label: '用户管理' },
  { key: 'apps', icon: <AppstoreOutlined />, label: '应用管理' },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: 'profile', label: '账号设置' },
      { key: 'security', label: '安全设置' },
    ],
  },
];

const userMenuItems = [
  { key: 'profile', label: '个人中心' },
  { key: 'settings', label: '账户设置' },
  { type: 'divider' as const },
  { key: 'logout', label: '退出登录' },
];

const LayoutView = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  return (
    <Layout className="admin-layout">
      <Sider
        width={220}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="dark"
      >
        <div className="admin-logo">{collapsed ? 'AB' : 'AutoBackend'}</div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header className="admin-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
            className="collapse-button"
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <button className="user-menu" type="button">
              <Avatar icon={<UserOutlined />} />
              <span>管理员</span>
            </button>
          </Dropdown>
        </Header>

        <Content className="admin-content">
          <Breadcrumb items={[{ title: '首页' }, { title: '工作台' }]} />

          <Card className="welcome-card">
            <Typography.Title level={4}>欢迎回来</Typography.Title>
            <Text type="secondary">这里是后台管理系统的工作台骨架。</Text>
          </Card>

          <div className="dashboard-grid">
            {[
              ['用户总数', '1,024'],
              ['今日访问', '286'],
              ['待处理事项', '12'],
              ['系统状态', '正常'],
            ].map(([label, value]) => (
              <Card key={label}>
                <Text type="secondary">{label}</Text>
                <Typography.Title level={3} style={{ margin: '8px 0 0' }}>
                  {value}
                </Typography.Title>
              </Card>
            ))}
          </div>

          <Card title="最近动态">
            <div className="empty-content">
              <Text type="secondary">暂无动态</Text>
            </div>
          </Card>
        </Content>
      </Layout>
      <style>{`
        .admin-layout { min-height: 100vh; }
        .admin-logo {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .admin-header {
          height: 64px;
          padding: 0 24px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          z-index: 1;
        }
        .collapse-button { color: ${token.colorText}; }
        .user-menu {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: ${token.colorText};
        }
        .admin-content {
          min-height: 0;
          padding: 24px;
          background: ${token.colorBgLayout};
          text-align: left;
          overflow: auto;
        }
        .welcome-card { margin: 16px 0; }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        .empty-content {
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .admin-content { padding: 16px; }
          .dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
};

export default LayoutView;
