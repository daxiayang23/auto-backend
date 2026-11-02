import { RocketOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const LaunchView = () => {
  const navigate = useNavigate();

  return (
    <main className="launch-page">
      <div className="launch-content">
        <div className="launch-mark">AB</div>
        <Typography.Title level={1}>AutoBackend</Typography.Title>
        <Typography.Text type="secondary">一键进入后台管理系统</Typography.Text>
        <Button
          className="launch-button"
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          onClick={() => navigate('/layout')}
        >
          启动
        </Button>
      </div>

      <style>{`
        .launch-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          box-sizing: border-box;
          background:
            radial-gradient(circle at top, rgba(22, 119, 255, 0.12), transparent 42%),
            #f5f7fa;
        }
        .launch-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .launch-mark {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          margin-bottom: 24px;
          color: #fff;
          background: #1677ff;
          font-size: 24px;
          font-weight: 700;
          box-shadow: 0 16px 40px rgba(22, 119, 255, 0.28);
        }
        .launch-content h1 {
          margin: 0 0 8px;
          font-size: 40px;
        }
        .launch-button {
          min-width: 160px;
          height: 48px;
          margin-top: 32px;
          font-size: 16px;
        }
      `}</style>
    </main>
  );
};

export default LaunchView;
