import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, RefreshCw, Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { isAdmin } from '../constants/roles';

// Hash function for webhook auth
const hashThreeInputs = async (input1, input2, input3) => {
  const combined = input1.toString() + input2.toString() + input3.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getTodayUTC = () => {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const ACTION_COLORS = {
  ADD: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  EDIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  APPROVE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const ENTITY_COLORS = {
  TASK: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  SCHEDULED_TASK: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  AD_ACCOUNT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  CREATIVE: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
};

const MonitorLog = () => {
  const { currentUser } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const isAdminUser = currentUser ? isAdmin(currentUser.role) : false;

  const fetchLogs = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

      const webhookUrl = import.meta.env.VITE_USER_ACTIVITY_WEBHOOK_URL;
      if (!webhookUrl) {
        setError('Activity webhook URL is not configured.');
        return;
      }

      const params = new URLSearchParams({ code, requested_by: adminEmail });
      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const text = await response.text();
        if (!text || text.trim() === '' || text.trim() === '[]' || text.trim() === 'null' || text.trim() === '{}') {
          setLogs([]);
        } else {
          try {
            const data = JSON.parse(text);
            const logsArray = Array.isArray(data)
              ? data.filter(item => item && Object.keys(item).length > 0 && item.timestamp)
              : (data && typeof data === 'object' && data.timestamp ? [data] : []);
            logsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setLogs(logsArray);
          } catch {
            setLogs([]);
          }
        }
      } else {
        console.error('Failed to fetch activity logs:', response.status);
        setError('Failed to fetch activity logs.');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Error fetching activity logs. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdminUser) {
      fetchLogs();
    }
  }, [isAdminUser]);

  // Unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const names = [...new Set(logs.map(l => l.user_name || l.user_email).filter(Boolean))];
    return names.sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (actionFilter !== 'all') result = result.filter(l => l.action === actionFilter);
    if (entityFilter !== 'all') result = result.filter(l => l.entity_type === entityFilter);
    if (userFilter !== 'all') result = result.filter(l => (l.user_name || l.user_email) === userFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.entity_name || '').toLowerCase().includes(q) ||
        (l.user_name || '').toLowerCase().includes(q) ||
        (l.user_email || '').toLowerCase().includes(q) ||
        String(l.entity_id || '').includes(q) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, actionFilter, entityFilter, userFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [actionFilter, entityFilter, userFilter, searchQuery, itemsPerPage]);

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      });
    } catch {
      return ts;
    }
  };

  const formatDetails = (details) => {
    if (!details || typeof details !== 'object') return '-';
    const entries = Object.entries(details).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (entries.length === 0) return '-';
    return entries.map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
      const val = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${label}: ${val}`;
    }).join(' · ');
  };

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-950 via-gray-100 dark:via-gray-900 to-gray-50 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-950 via-gray-100 dark:via-gray-900 to-gray-50 dark:to-gray-950">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-primary-600" />
                Monitor Log
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Track user activity across Tasks &amp; Ad Accounts</p>
            </div>
            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Events', value: filteredLogs.length, color: 'text-gray-900 dark:text-gray-100' },
            { label: 'Adds', value: filteredLogs.filter(l => l.action === 'ADD').length, color: 'text-green-600 dark:text-green-400' },
            { label: 'Edits', value: filteredLogs.filter(l => l.action === 'EDIT').length, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Deletes / Approves', value: filteredLogs.filter(l => l.action === 'DELETE' || l.action === 'APPROVE').length, color: 'text-red-600 dark:text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            {/* Action filter */}
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Actions</option>
                <option value="ADD">Add</option>
                <option value="EDIT">Edit</option>
                <option value="DELETE">Delete</option>
                <option value="APPROVE">Approve</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Entity filter */}
            <div className="relative">
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Entities</option>
                <option value="TASK">Task</option>
                <option value="SCHEDULED_TASK">Scheduled Task</option>
                <option value="AD_ACCOUNT">Ad Account</option>
                <option value="CREATIVE">Creative</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* User filter */}
            <div className="relative">
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Items per page */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {[25, 50, 100, 200].map(n => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-400/30 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading activity logs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No activity logs found.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Activity will appear here once users start performing actions.</p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Timestamp</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Action</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Entity</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedLogs.map((log, idx) => (
                      <tr key={log.id || `${log.timestamp}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {(log.user_name || log.user_email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-gray-900 dark:text-gray-100 font-medium text-xs">{log.user_name || '-'}</div>
                              <div className="text-gray-500 dark:text-gray-400 text-xs">{log.user_role?.replace(/_/g, ' ') || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {log.action || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ENTITY_COLORS[log.entity_type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {(log.entity_type || '-').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300 font-mono text-xs">
                          {log.entity_id ?? '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300 text-xs max-w-[200px] truncate" title={log.entity_name || ''}>
                          {log.entity_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[400px] truncate" title={formatDetails(log.details)}>
                          {formatDetails(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} events
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonitorLog;
