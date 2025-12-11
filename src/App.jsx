import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Tasks from './pages/Tasks';
import CampaignsList from './pages/CampaignsList';
import UserManagement from './pages/UserManagement';

function App() {
  return (
    <Router>
      <AppProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Tasks />} />
              <Route path="/campaigns" element={<CampaignsList />} />
              <Route path="/users" element={<UserManagement />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </Router>
  );
}

export default App;
