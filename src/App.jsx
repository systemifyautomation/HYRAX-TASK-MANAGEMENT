import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AuthContext';
import { isManager } from './constants/roles';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Tasks from './pages/Tasks';
import CampaignsList from './pages/CampaignsList';
import UserManagement from './pages/UserManagement';
import AdAccounts from './pages/AdAccounts';
import Performance from './pages/Performance';
import Settings from './pages/Settings';
import About from './pages/About';
import MonitorLog from './pages/MonitorLog';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-400/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 text-lg">Loading HYRAX...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Manager Route Component - Only managers and above can access
const ManagerRoute = ({ children }) => {
  const { currentUser } = useApp();
  return isManager(currentUser?.role) ? children : <Navigate to="/" replace />;
};

// Main App Layout
const AppLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-400/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 text-lg">Loading HYRAX...</p>
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
        path="/about" 
        element={<About />} 
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Tasks />} />
                <Route path="/this-week/*" element={<Tasks />} />
                <Route path="/next-week/*" element={<Tasks />} />
                <Route path="/last-week/*" element={<Tasks />} />
                <Route path="/cards/*" element={<Tasks />} />
                <Route path="/campaigns" element={<CampaignsList />} />
                <Route path="/users" element={<ManagerRoute><UserManagement /></ManagerRoute>} />
                <Route path="/ad-accounts" element={<ManagerRoute><AdAccounts /></ManagerRoute>} />
                <Route path="/performance" element={<ManagerRoute><Performance /></ManagerRoute>} />
                <Route path="/monitor-log" element={<ManagerRoute><MonitorLog /></ManagerRoute>} />
                <Route path="/settings" element={<ManagerRoute><Settings /></ManagerRoute>} />
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