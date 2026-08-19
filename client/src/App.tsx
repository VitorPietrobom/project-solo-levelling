import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import GamificationTab from './pages/GamificationTab';
import SkillsTab from './pages/SkillsTab';
import BodyTab from './pages/BodyTab';
import DietTab from './pages/DietTab';
import LearningTab from './pages/LearningTab';
import SummaryTab from './pages/SummaryTab';
import RecipesTab from './pages/RecipesTab';
import SettingsTab from './pages/SettingsTab';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<GamificationTab />} />
            <Route path="skills" element={<SkillsTab />} />
            <Route path="body" element={<BodyTab />} />
            <Route path="diet" element={<DietTab />} />
            <Route path="learning" element={<LearningTab />} />
            <Route path="summary" element={<SummaryTab />} />
            <Route path="recipes" element={<RecipesTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
        </Routes>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
