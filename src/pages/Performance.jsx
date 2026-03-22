import React, { useState, useEffect } from 'react';
import { BarChart3, Filter, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { isManager } from '../constants/roles';

// Helper function to get Monday of a given date
const getMondayOfWeek = (date) => {
  return startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
};

// Helper function to get Sunday of a given date
const getSundayOfWeek = (date) => {
  return endOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday (so end will be Sunday)
};

// Format date to UTC dd/MM/yyyy
const formatDateUTC = (date) => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Get date range string for a week offset
const getWeekDateRange = (weekOffset) => {
  const thisMonday = getMondayOfWeek(new Date());
  const targetMonday = addWeeks(thisMonday, weekOffset);
  const targetSunday = getSundayOfWeek(targetMonday);
  
  // Convert to UTC
  const mondayUTC = new Date(Date.UTC(targetMonday.getFullYear(), targetMonday.getMonth(), targetMonday.getDate()));
  const sundayUTC = new Date(Date.UTC(targetSunday.getFullYear(), targetSunday.getMonth(), targetSunday.getDate()));
  
  return `${formatDateUTC(mondayUTC)} - ${formatDateUTC(sundayUTC)}`;
};

const Performance = () => {
  const { currentUser } = useApp();
  const [selectedWeek, setSelectedWeek] = useState(getWeekDateRange(-1)); // Default to last week
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weekOptions, setWeekOptions] = useState([]);
  const [cachedData, setCachedData] = useState({}); // Cache data by week

  // Generate week options (past 8 weeks)
  useEffect(() => {
    const options = [];
    
    for (let i = 1; i <= 8; i++) {
      const dateRange = getWeekDateRange(-i);
      options.push({
        value: dateRange,
        label: i === 1 ? 'Last Week' : `${i} Weeks Ago`,
        dateRange: dateRange
      });
    }
    
    setWeekOptions(options);
  }, []);

  // Fetch and calculate performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      // Check cache first - only fetch if we don't have data for this week
      if (cachedData[selectedWeek]) {
        console.log('Using cached performance data for:', selectedWeek);
        setPerformanceData(cachedData[selectedWeek]);
        return;
      }

      setLoading(true);
      try {
        // Parse the selectedWeek to get start_date and end_date
        // Format: "dd/MM/yyyy - dd/MM/yyyy"
        const [startDateStr, endDateStr] = selectedWeek.split(' - ');
        
        // Convert from dd/MM/yyyy to yyyy-MM-dd
        const convertToYYYYMMDD = (dateStr) => {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month}-${day}`;
        };
        
        const startDate = convertToYYYYMMDD(startDateStr);
        const endDate = convertToYYYYMMDD(endDateStr);

        // Fetch performance data
        const performanceWebhookUrl = 'https://workflows.wearehyrax.com/webhook/performance-webhook';
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate
        });

        const response = await fetch(`${performanceWebhookUrl}?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const performanceMetrics = await response.json();
          console.log('Performance metrics from webhook:', performanceMetrics);
          
          // Ensure we have valid data
          if (!Array.isArray(performanceMetrics) || performanceMetrics.length === 0) {
            console.log('No performance data available');
            setPerformanceData([]);
            setLoading(false);
            return;
          }
          
          // Parse performance data (webhook includes user_name and user_department)
          const metrics = performanceMetrics.map((metric, index) => {
            // Parse values with proper fallbacks and handling for string formats
            // spend is a string with commas: "1,855.02"
            const spendStr = (metric.spend || '0').replace(/,/g, '');
            const spend = parseFloat(spendStr);
            
            // ctr is a string: "4.303"
            const ctr = parseFloat(metric.ctr || '0');
            
            // impressions is a number: 30822
            const impressions = parseInt(metric.impressions || 0);
            
            // clicks is a string: "642"
            const clicks = parseInt(metric.clicks || '0');
            
            // count_ads is a string: "33"
            const numberOfAds = parseInt(metric.count_ads || '0');
            
            return {
              id: index, // Use index as ID since webhook doesn't provide user_id
              name: metric.user_name || 'Unknown User',
              initials: metric.user_name === 'Not assigned' 
                ? 'NA' 
                : metric.user_name 
                  ? metric.user_name.split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : '??',
              department: metric.user_department || 'N/A',
              spend: isNaN(spend) ? 0 : spend,
              ctr: isNaN(ctr) ? 0 : ctr,
              impressions: isNaN(impressions) ? 0 : impressions,
              clicks: isNaN(clicks) ? 0 : clicks,
              numberOfAds: isNaN(numberOfAds) ? 0 : numberOfAds
            };
          }).sort((a, b) => {
            // Always move "Not assigned" to the end
            if (a.name === 'Not assigned') return 1;
            if (b.name === 'Not assigned') return -1;
            return 0; // Keep original order for all other entries
          });

          // Filter by role if not manager/admin
          let filteredMetrics = metrics;
          if (!isManager(currentUser?.role)) {
            // Filter by matching user name since webhook doesn't provide user_id
            filteredMetrics = metrics.filter(m => m.name === currentUser?.name);
          }

          // Sort by spend (descending)
          filteredMetrics.sort((a, b) => (b.spend || 0) - (a.spend || 0));
          setPerformanceData(filteredMetrics);
          
          // Cache the data for this week
          setCachedData(prev => ({ ...prev, [selectedWeek]: filteredMetrics }));
        } else {
          console.error('Failed to fetch performance data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && selectedWeek) {
      fetchPerformanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]); // Only re-fetch when selectedWeek changes

  // Calculate totals
  const totals = performanceData.reduce((acc, row) => ({
    spend: acc.spend + (row.spend || 0),
    impressions: acc.impressions + (row.impressions || 0),
    clicks: acc.clicks + (row.clicks || 0),
    numberOfAds: acc.numberOfAds + (row.numberOfAds || 0)
  }), { spend: 0, impressions: 0, clicks: 0, numberOfAds: 0 });

  // Calculate average CTR
  const avgCTR = performanceData.length > 0
    ? (performanceData.reduce((sum, row) => sum + (row.ctr || 0), 0) / performanceData.length).toFixed(2)
    : 0;

  return (
    <div className="p-8 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">
              Performance Analytics
            </h1>
            <p className="text-gray-600 mt-2">
              Track creative team performance and productivity
            </p>
          </div>

          {/* Week Filter */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-lg px-4 py-2.5 shadow-sm hover:border-red-300 hover:shadow-md transition-all">
              <Filter className="w-4 h-4 text-red-600" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-transparent text-gray-900 font-semibold focus:outline-none cursor-pointer appearance-none pr-8 text-sm min-w-[180px] pl-1"
                style={{
                  colorScheme: 'light'
                }}
              >
                {weekOptions.map(option => (
                  <option 
                    key={option.value} 
                    value={option.value} 
                    className="!py-3 !px-4 font-medium"
                    style={{
                      padding: '12px 20px',
                      paddingLeft: '20px',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      fontWeight: option.value === selectedWeek ? '600' : '500',
                      backgroundColor: option.value === selectedWeek ? '#fee2e2' : '#ffffff',
                      color: option.value === selectedWeek ? '#dc2626' : '#111827',
                      borderRadius: '4px',
                      margin: '2px 4px'
                    }}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-red-600 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Spend</div>
          <div className="text-2xl font-bold text-gray-900">${(totals.spend || 0).toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Avg CTR</div>
          <div className="text-2xl font-bold text-blue-600">{avgCTR || 0}%</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Impressions</div>
          <div className="text-2xl font-bold text-purple-600">{(totals.impressions || 0).toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Clicks</div>
          <div className="text-2xl font-bold text-green-600">{(totals.clicks || 0).toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Ads</div>
          <div className="text-2xl font-bold text-amber-600">{totals.numberOfAds || 0}</div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Individual Performance</h2>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown by team member</p>
        </div>

        {loading ? (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance data...</p>
          </div>
        ) : performanceData.length === 0 ? (
          <div className="text-center py-12 px-6">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No performance data available for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Member</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Spend</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">CTR</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Impressions</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Clicks</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider"># of Ads</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {row.initials}
                        </div>
                        <span className="font-medium text-gray-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                        {row.department}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-gray-900">
                        ${(row.spend || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`text-base font-semibold ${
                        (row.ctr || 0) >= 2 ? 'text-green-600' :
                        (row.ctr || 0) >= 1 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {(row.ctr || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-purple-600">
                        {(row.impressions || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-green-600">
                        {(row.clicks || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-amber-600">
                        {row.numberOfAds || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Performance;
