import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AuthContext';

const CampaignsList = () => {
  const { campaigns, tasks } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use campaigns from context instead of fetching from API
  useEffect(() => {
    // Simulate loading for better UX
    setTimeout(() => {
      setLoading(false);
      if (campaigns.length === 0) {
        setError('No campaigns available');
      } else {
        setError(null);
      }
    }, 100);
  }, [campaigns]);

  // Get tasks for a specific campaign
  const getTasksByCampaign = (campaignId) => {
    return tasks.filter(task => task.campaignId === campaignId);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                Campaigns
              </h1>
              <p className="text-gray-500 mt-2">All campaign information and Slack channel IDs</p>
              {error && (
                <div className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg inline-block">
                  ⚠️ {error}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Total Campaigns</div>
            <div className="text-2xl font-bold text-gray-900">{campaigns.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">With Slack ID</div>
            <div className="text-2xl font-bold text-green-600">
              {campaigns.filter(c => c.slackId).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Without Slack ID</div>
            <div className="text-2xl font-bold text-amber-600">
              {campaigns.filter(c => !c.slackId).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Coverage</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((campaigns.filter(c => c.slackId).length / campaigns.length) * 100)}%
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden backdrop-blur-sm mt-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Slack ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Loading campaigns...</span>
                      </div>
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                      No campaigns found
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr 
                      key={campaign.id} 
                      className="group hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-150"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {campaign.slackId ? (
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                            {campaign.slackId}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No Slack ID</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="font-medium">Total: {campaigns.length} campaigns</span>
                <span className="text-gray-400">•</span>
                <span>
                  {campaigns.filter(c => c.slackId).length} with Slack integration
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignsList;
