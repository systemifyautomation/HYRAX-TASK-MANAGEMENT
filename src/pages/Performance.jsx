import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Upload, CheckCircle, Filter, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
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
  const { currentUser, users } = useApp();
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
        const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
        if (!webhookUrl) {
          console.error('VITE_TASKS_WEBHOOK_URL not configured');
          return;
        }

        const userEmail = currentUser?.email || '';
        const adminPassword = localStorage.getItem('admin_password') || '';
        
        // Helper function to get today's date in UTC format dd/MM/yyyy
        const getTodayUTC = () => {
          const now = new Date();
          const day = String(now.getUTCDate()).padStart(2, '0');
          const month = String(now.getUTCMonth() + 1).padStart(2, '0');
          const year = now.getUTCFullYear();
          return `${day}/${month}/${year}`;
        };
        
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        
        // Hash function (same as in AuthContext)
        const hashThreeInputs = async (input1, input2, input3) => {
          const combined = input1.toString() + input2.toString() + input3.toString();
          const encoder = new TextEncoder();
          const data = encoder.encode(combined);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          return hashHex;
        };

        const code = await hashThreeInputs(userEmail, adminPassword, loginDate);

        const params = new URLSearchParams({
          requested_by: userEmail,
          code: code
        });

        // Add week parameter (date range string like "24/11/2025 - 30/11/2025")
        if (selectedWeek) {
          params.append('week', selectedWeek);
        }

        const response = await fetch(`${webhookUrl}?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const tasks = await response.json();
          const validTasks = Array.isArray(tasks) ? tasks.filter(task => task && Object.keys(task).length > 0 && task.id) : [];
          
          // Filter users who are video editors or graphic designers
          let creativeUsers = users.filter(user => 
            user.department === 'VIDEO EDITING' || user.department === 'GRAPHIC DESIGN'
          );
          
          // If not manager/admin, only show current user's performance
          if (!isManager(currentUser?.role)) {
            creativeUsers = creativeUsers.filter(user => user.id === currentUser?.id);
          }

          // Calculate performance metrics for each user
          const metrics = creativeUsers.map(user => {
            // Filter tasks assigned to this user
            const userTasks = validTasks.filter(task => 
              task.assignedTo && parseInt(task.assignedTo) === user.id
            );

            // Calculate assigned creatives (sum of quantity)
            const assigned = userTasks.reduce((sum, task) => {
              const quantity = parseInt(task.quantity) || 0;
              const isVideoEditor = user.department === 'VIDEO EDITING';
              // Video editors create 2 formats per ad (Facebook + Reel)
              return sum + (isVideoEditor ? quantity * 2 : quantity);
            }, 0);

            // Calculate uploaded creatives
            const uploaded = userTasks.reduce((sum, task) => {
              if (!task.viewerLink) return sum;
              const links = Array.isArray(task.viewerLink) ? task.viewerLink : [];
              // Count non-empty links
              return sum + links.filter(link => link && link.trim()).length;
            }, 0);

            // Calculate approved creatives
            const approved = userTasks.reduce((sum, task) => {
              if (!task.viewerLink || task.status !== 'Approved') return sum;
              const links = Array.isArray(task.viewerLink) ? task.viewerLink : [];
              // Count approved non-empty links
              return sum + links.filter(link => link && link.trim()).length;
            }, 0);

            // Calculate completion rate
            const completionRate = assigned > 0 ? Math.round((uploaded / assigned) * 100) : 0;
            const approvalRate = uploaded > 0 ? Math.round((approved / uploaded) * 100) : 0;

            return {
              id: user.id,
              name: user.name,
              department: user.department,
              assigned,
              uploaded,
              approved,
              completionRate,
              approvalRate
            };
          });

          // Sort by assigned count (descending)
          metrics.sort((a, b) => b.assigned - a.assigned);
          setPerformanceData(metrics);
          
          // Cache the data for this week
          setCachedData(prev => ({ ...prev, [selectedWeek]: metrics }));
        } else {
          console.error('Failed to fetch performance data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && users.length > 0 && selectedWeek) {
      fetchPerformanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]); // Only re-fetch when selectedWeek changes

  // Calculate totals
  const totals = performanceData.reduce((acc, row) => ({
    assigned: acc.assigned + row.assigned,
    uploaded: acc.uploaded + row.uploaded,
    approved: acc.approved + row.approved
  }), { assigned: 0, uploaded: 0, approved: 0 });

  const totalCompletionRate = totals.assigned > 0 
    ? Math.round((totals.uploaded / totals.assigned) * 100) 
    : 0;
  const totalApprovalRate = totals.uploaded > 0 
    ? Math.round((totals.approved / totals.uploaded) * 100) 
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Assigned</div>
          <div className="text-2xl font-bold text-gray-900">{totals.assigned}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Uploaded</div>
          <div className="text-2xl font-bold text-blue-600">{totals.uploaded}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total Approved</div>
          <div className="text-2xl font-bold text-green-600">{totals.approved}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Completion Rate</div>
          <div className="text-2xl font-bold text-amber-600">{totalCompletionRate}%</div>
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
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Uploaded</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Approved</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Completion</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Approval Rate</th>
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
                          {row.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                        row.department === 'VIDEO EDITING' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {row.department === 'VIDEO EDITING' ? '🎬 Video Editor' : '🎨 Graphic Designer'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-gray-900">
                        {row.assigned}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-blue-600">
                        {row.uploaded}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-base font-semibold text-green-600">
                        {row.approved}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`text-sm font-semibold ${
                          row.completionRate >= 80 ? 'text-green-600' :
                          row.completionRate >= 50 ? 'text-amber-600' :
                          row.completionRate >= 30 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {row.completionRate}%
                        </span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              row.completionRate >= 80 ? 'bg-green-500' :
                              row.completionRate >= 50 ? 'bg-amber-500' :
                              row.completionRate >= 30 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${row.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`text-sm font-semibold ${
                          row.approvalRate >= 80 ? 'text-green-600' :
                          row.approvalRate >= 50 ? 'text-amber-600' :
                          row.approvalRate >= 30 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {row.approvalRate}%
                        </span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              row.approvalRate >= 80 ? 'bg-green-500' :
                              row.approvalRate >= 50 ? 'bg-amber-500' :
                              row.approvalRate >= 30 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${row.approvalRate}%` }}
                          />
                        </div>
                      </div>
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
