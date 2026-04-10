import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import NewCampaignChatModal from '../components/NewCampaignChatModal';

const Campaigns = () => {
  const { campaigns, tasks, currentUser, users, loadUsers, updateCampaign } = useApp();
  const navigate = useNavigate();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [editedSlackId, setEditedSlackId] = useState('');

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

  // Handle editing Slack ID
  const handleStartEdit = (campaign, e) => {
    e.stopPropagation();
    setEditingCampaignId(campaign.id);
    setEditedSlackId(campaign.slackId || '');
  };

  const handleSaveEdit = async (campaign, e) => {
    e.stopPropagation();
    const newSlackId = editedSlackId.trim();
    
    // Update the campaign with the new Slack ID (can be empty string)
    if (newSlackId !== campaign.slackId) {
      await updateCampaign(campaign.id, { ...campaign, slackId: newSlackId });
    }
    
    setEditingCampaignId(null);
    setEditedSlackId('');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingCampaignId(null);
    setEditedSlackId('');
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

      <div className="card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Campaign Name</th>
              <th className="px-4 py-3 font-semibold">Slack ID</th>
              <th className="px-4 py-3 font-semibold text-center">Tasks</th>
              <th className="px-4 py-3 font-semibold text-center">Images</th>
              <th className="px-4 py-3 font-semibold text-center">Videos</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(campaign => {
              const campaignTasks = getTasksByCampaign(campaign.id);

              return (
                <tr
                  key={campaign.id}
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{campaign.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{campaign.name}</td>
                  <td className="px-4 py-3">
                    {editingCampaignId === campaign.id ? (
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editedSlackId}
                          onChange={(e) => setEditedSlackId(e.target.value)}
                          placeholder="Enter Slack ID"
                          className="w-40 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveEdit(campaign, e)}
                          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className={campaign.slackId ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}>
                          {campaign.slackId || '—'}
                        </span>
                        <button
                          onClick={(e) => handleStartEdit(campaign, e)}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all opacity-0 group-hover:opacity-100"
                          title={campaign.slackId ? 'Edit Slack ID' : 'Add Slack ID'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{campaign.tasksCount || campaignTasks.length}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{campaign.images || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{campaign.videos || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
