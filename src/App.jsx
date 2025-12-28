import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Tasks from './pages/Tasks';
import ScheduledTasks from './pages/ScheduledTasks';
import CampaignsList from './pages/CampaignsList';
import UserManagement from './pages/UserManagement';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading HYRAX...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main App Layout
const AppLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
      <main className={`overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
};

// App Router Component  
const AppRouter = () => {
  const { isAuthenticated, loading } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading HYRAX...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Tasks />} />
                <Route path="/scheduled-tasks" element={<ScheduledTasks />} />
                <Route path="/campaigns" element={<CampaignsList />} />
                <Route path="/users" element={<UserManagement />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppRouter />
      </Router>
    </AppProvider>
  );
}

export default App;