import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, MessageSquare, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AuthContext';

const Campaigns = () => {
  const { campaigns, tasks } = useApp();
  const navigate = useNavigate();

  // Get tasks for a specific campaign
  const getTasksByCampaign = (campaignId) => {
    return tasks.filter(task => task.campaignId === campaignId);
  };

  const getStatusColor = (taskCount) => {
    if (taskCount === 0) {
      return 'bg-gray-100 text-gray-700';
    } else if (taskCount < 5) {
      return 'bg-amber-100 text-amber-700';
    } else {
      return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h1>
        <p className="text-gray-600">Manage all Facebook ad campaigns and their tasks</p>
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
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{campaign.name}</h3>
                    <p className="text-sm text-gray-600">ID: {campaign.id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaignTasks.length)}`}>
                  {campaignTasks.length === 0 ? 'No Tasks' : campaignTasks.length < 5 ? 'Active' : 'High Volume'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {campaign.slackId && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MessageSquare className="w-4 h-4" />
                    <span>Slack: {campaign.slackId}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>{campaignTasks.length} total tasks</span>
                </div>
              </div>

              {campaignTasks.length > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">{completedTasks}/{campaignTasks.length} completed</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                <span className="text-gray-600">{campaignTasks.length} tasks</span>
                <span className="text-primary-600 font-medium hover:text-primary-700">View Details →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Campaigns;
