import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import NewCampaignChatModal from '../components/NewCampaignChatModal';

const CampaignsList = () => {
  const { campaigns, campaignsLoading, loadCampaignsData, currentUser, users, loadUsers } = useApp();
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortField, setSortField] = useState('id'); // 'id', 'name', or 'tasks'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Load campaigns when component mounts
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await loadCampaignsData();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Check for errors when campaigns are loaded
  useEffect(() => {
    if (!campaignsLoading) {
      if (campaigns.length === 0) {
        setError('No campaigns available');
      } else {
        setError(null);
      }
    }
  }, [campaigns, campaignsLoading]);

  // Get this week's tasks count for a specific campaign
  const getThisWeekTasksCount = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.tasksCount || 0;
  };

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => {
      let compareA, compareB;
      
      if (sortField === 'id') {
        compareA = parseInt(a.id) || 0;
        compareB = parseInt(b.id) || 0;
      } else if (sortField === 'name') {
        compareA = (a.name || '').toLowerCase();
        compareB = (b.name || '').toLowerCase();
      } else if (sortField === 'tasks') {
        compareA = getThisWeekTasksCount(a.id);
        compareB = getThisWeekTasksCount(b.id);
      }
      
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [campaigns, sortField, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = sortedCampaigns.slice(startIndex, endIndex);

  // Handle page change
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Get sort icon for column header
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-primary-600" />
      : <ChevronDown className="w-4 h-4 text-primary-600" />;
  };

  const handleRefresh = () => {
    setCurrentPage(1); // Reset to first page on refresh
    loadCampaignsData();
  };

  // Show loading state while data is being fetched
  if (campaignsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-950 via-gray-100 dark:via-gray-900 to-gray-50 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-950 via-gray-100 dark:via-gray-900 to-gray-50 dark:to-gray-950">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="page-title">
                Campaigns
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">All campaign information and Slack channel IDs</p>
              {error && (
                <div className="mt-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-600 dark:text-white px-3 py-1 rounded-lg inline-block">
                  ⚠️ {error}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsChatModalOpen(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Campaign</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={campaignsLoading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className={`w-4 h-4 ${campaignsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{campaignsLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Campaigns</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{campaigns.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">With Slack ID</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {campaigns.filter(c => c.slackId).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Without Slack ID</div>
            <div className="text-2xl font-bold text-amber-600">
              {campaigns.filter(c => !c.slackId).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Coverage</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((campaigns.filter(c => c.slackId).length / campaigns.length) * 100)}%
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mt-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Campaign Name</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>ID</span>
                      {getSortIcon('id')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('tasks')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Tasks</span>
                      {getSortIcon('tasks')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Slack ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {campaignsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No campaigns found
                    </td>
                  </tr>
                ) : (
                  currentCampaigns.map((campaign) => {
                    const thisWeekTasksCount = getThisWeekTasksCount(campaign.id);
                    return (
                    <tr 
                      key={campaign.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {campaign.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          thisWeekTasksCount === 0 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
                            : thisWeekTasksCount < 5 
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-100' 
                            : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-100'
                        }`}>
                          {thisWeekTasksCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {campaign.slackId ? (
                          <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                            {campaign.slackId}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No Slack ID</span>
                        )}
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer with Pagination */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* Left side - Info and Items per page selector */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">per page</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="font-medium">
                  Showing {sortedCampaigns.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, sortedCampaigns.length)} of {sortedCampaigns.length} campaigns
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  {sortedCampaigns.filter(c => c.slackId).length} with Slack integration
                </span>
              </div>

              {/* Right side - Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        pageNumber === 1 || 
                        pageNumber === totalPages || 
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1);
                      
                      const showEllipsis = 
                        (pageNumber === 2 && currentPage > 3) ||
                        (pageNumber === totalPages - 1 && currentPage < totalPages - 2);

                      if (showEllipsis) {
                        return <span key={pageNumber} className="px-2 text-gray-400">...</span>;
                      }
                      
                      if (!showPage) {
                        return null;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => goToPage(pageNumber)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NewCampaignChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        currentUser={currentUser}
        users={users}
        loadUsers={loadUsers}
      />
    </div>
  );
};

export default CampaignsList;
