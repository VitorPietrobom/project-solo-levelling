import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import GamificationTab from './pages/GamificationTab';
import BodyTab from './pages/BodyTab';
import DietTab from './pages/DietTab';
import LearningTab from './pages/LearningTab';
import SummaryTab from './pages/SummaryTab';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<GamificationTab />} />
            <Route path="body" element={<BodyTab />} />
            <Route path="diet" element={<DietTab />} />
            <Route path="learning" element={<LearningTab />} />
            <Route path="summary" element={<SummaryTab />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
