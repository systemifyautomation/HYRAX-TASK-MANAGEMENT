import React, { useState, useEffect } from 'react';

const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch campaigns from API
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      // Use relative URL for production (Vercel) or localhost for development
      const apiUrl = import.meta.env.PROD ? '/api/campaigns' : 'http://localhost:3001/api/campaigns';
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success) {
        setCampaigns(data.data);
        setError(null);
      } else {
        setError('Failed to fetch campaigns');
      }
    } catch (err) {
      setError('API server not available. Showing static data.');
      console.error('Campaign fetch error:', err);
      // Fallback to static data if API is not available
      setCampaigns([
        { id: 1, name: '001_CCW', slackId: 'C092ZBS0KEK' },
        { id: 2, name: '002-CASH4HOMES', slackId: '' },
        { id: 3, name: '003-MVA', slackId: '' },
        { id: 4, name: '004_TRAVEL_RESORTS', slackId: 'C09EQBS2BB3' },
        { id: 5, name: '05-ASSESSMENTS', slackId: '' },
        { id: 6, name: '005-GLP1TELE', slackId: '' },
        { id: 7, name: '006-HELOC', slackId: '' },
        { id: 8, name: '007-HEA', slackId: '' },
        { id: 9, name: '008-HEARINGAIDS', slackId: '' },
        { id: 10, name: '009-WINDOWS', slackId: '' },
        { id: 11, name: '010-PARAQUAT', slackId: '' },
        { id: 12, name: '011_ROUNDUP', slackId: 'C09DWN18SHM' },
        { id: 13, name: '012_RIDESHARE', slackId: '' },
        { id: 14, name: '013-TALCUM', slackId: '' },
        { id: 15, name: '014-AFFF', slackId: '' },
        { id: 16, name: '015-HAIR', slackId: '' },
        { id: 17, name: '016-SICKLE-CELL', slackId: '' },
        { id: 18, name: '017-TEPEZZA', slackId: '' },
        { id: 19, name: '018-MARYLAND', slackId: '' },
        { id: 20, name: '019-LDS', slackId: '' },
        { id: 21, name: '020-DR-BROCK', slackId: '' },
        { id: 22, name: '021-ILLINOIS-CLERGY', slackId: '' },
        { id: 23, name: '022-ILLINOIS-JUVIE', slackId: '' },
        { id: 24, name: '023_SAN_DIEGO', slackId: 'C09E95TS3DG' },
        { id: 25, name: '024-WTC', slackId: '' },
        { id: 26, name: '025-DEPO', slackId: 'C09E8DB0H45' },
        { id: 27, name: '026_DR_LEE', slackId: 'C09EF7KPB1S' },
        { id: 28, name: '027-PFAS', slackId: '' },
        { id: 29, name: '028-SOCIAL-MEDIA', slackId: '' },
        { id: 30, name: '029-TEXAS-STORMS', slackId: '' },
        { id: 31, name: '030-SCHOOLS', slackId: '' },
        { id: 32, name: '031-ASBESTOS', slackId: '' },
        { id: 33, name: '032-ROBLOX', slackId: '' },
        { id: 34, name: '033-ANTIPSYCHOTICS', slackId: 'C09DWSR1U87' },
        { id: 35, name: '034-SAN-BERNARDINO', slackId: 'C09E70C5C2X' },
        { id: 36, name: '035-LA-WILDFIRES', slackId: '' },
        { id: 37, name: '036-PARAGUARD', slackId: '' },
        { id: 38, name: '037-OZEMPIC', slackId: '' },
        { id: 39, name: '038-VAGINAL-MESH', slackId: '' },
        { id: 40, name: '039_HERNIA_MESH', slackId: 'C096B2MSP3R' },
        { id: 41, name: '040_PROSTATE', slackId: 'C098ZFHFV9P' },
        { id: 42, name: '041_Risperdal', slackId: '' },
        { id: 43, name: '042_LIZBUYSHOMES', slackId: 'C09B2M9TUD8' },
        { id: 44, name: '043_TESTNOW', slackId: 'C09BJBQ0FAQ' },
        { id: 45, name: '044_NEWTEST', slackId: 'C09CHK288E7' },
        { id: 46, name: '045_CAWOMENSPRISON', slackId: 'C09CNMUNK6E' },
        { id: 47, name: '046_CAJDC', slackId: 'C09EN7P8LHX' },
        { id: 48, name: '047_SANDIEGOJUVIE', slackId: 'C09E95TS3DG' },
        { id: 49, name: '055_UNFAIR_DEPO', slackId: 'C09FCCM5Z4G' },
        { id: 50, name: '056_LA_JUVIE', slackId: 'C09PJNE2449' },
        { id: 51, name: '057_UNFAIR_MVA_ES', slackId: 'C09TKPC9LHM' },
        { id: 52, name: '058_POWERPORT', slackId: 'C0A0D1BDDHP' },
        { id: 53, name: '059_DUPIXENT', slackId: 'C0A0LKDPD4Z' },
        { id: 54, name: '060_DRMCGRAW', slackId: 'C0A0BTA923U' },
      ]);
    } finally {
      setLoading(false);
    }
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
                onClick={fetchCampaigns}
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
