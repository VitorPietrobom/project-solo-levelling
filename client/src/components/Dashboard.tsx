import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TabNavigation from './TabNavigation';

export default function Dashboard() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-primary">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-text-primary">Project Arise</h1>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Logout
        </button>
      </header>
      <TabNavigation />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
