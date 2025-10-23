import React from 'react';
import AppLayout from './layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { CoursesProvider } from './context/CoursesContext';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (!user) {
    return <AuthPage />;
  }
  return (
    <AppLayout>
      <CoursesProvider uid={user.uid}>
        <Dashboard />
      </CoursesProvider>
    </AppLayout>
  );
}

export default App;
