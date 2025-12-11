import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import WeeklyView from './pages/WeeklyView';

function App() {
  return (
    <Router>
      <AppProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/weekly" element={<WeeklyView />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </Router>
  );
}

export default App;
