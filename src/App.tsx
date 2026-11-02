import { Navigate, Route, Routes } from 'react-router-dom';
import StageView from './views/StageView';
import LaunchView from './views/LaunchView';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LaunchView />} />
      <Route path="/layout" element={<StageView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
