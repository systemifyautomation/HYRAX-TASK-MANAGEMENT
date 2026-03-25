import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, MessageSquare, BarChart3, Plus } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import NewCampaignChatModal from '../components/NewCampaignChatModal';

const Campaigns = () => {
  const { campaigns, tasks, currentUser, users, loadUsers } = useApp();
  const navigate = useNavigate();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Get tasks for a specific campaign
  const getTasksByCampaign = (campaignId) => {
    return tasks.filter(task => task.campaignId === campaignId);
  };

  const getStatusColor = (taskCount) => {
    if (taskCount === 0) {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    } else if (taskCount < 5) {
      return 'bg-amber-100 dark:bg-amber-600 text-amber-700 dark:text-white';
    } else {
      return 'bg-green-100 dark:bg-green-600 text-green-700 dark:text-white';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all Facebook ad campaigns and their tasks</p>
        </div>
        <button
          onClick={() => setIsChatModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Campaign</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(campaign => {
          const campaignTasks = getTasksByCampaign(campaign.id);
          const completedTasks = campaignTasks.filter(task => 
            task.adStatus === 'Complete' && 
            task.postStatus === 'Complete'
          ).length;
          const progress = campaignTasks.length > 0 
            ? Math.round((completedTasks / campaignTasks.length) * 100)
            : 0;

          return (
            <div
              key={campaign.id}
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
              className="card hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-50 dark:bg-primary-600 rounded-lg flex items-center justify-center text-primary-600 dark:text-white">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{campaign.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ID: {campaign.id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaignTasks.length)}`}>
                  {campaignTasks.length === 0 ? 'No Tasks' : campaignTasks.length < 5 ? 'Active' : 'High Volume'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {campaign.slackId && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>Slack: {campaign.slackId}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <BarChart3 className="w-4 h-4" />
                  <span>{campaignTasks.length} total tasks</span>
                </div>
              </div>

              {campaignTasks.length > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{completedTasks}/{campaignTasks.length} completed</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">{campaignTasks.length} tasks</span>
                <span className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300">View Details →</span>
              </div>
            </div>
          );
        })}
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

export default Campaigns;
