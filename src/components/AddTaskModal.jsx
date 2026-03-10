import React, { useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

const AddTaskModal = ({ isOpen, onClose, user, campaigns, users, weekView, onAddTask, canManageTasks = false, existingTasks = [] }) => {
  const [formData, setFormData] = useState({
    campaignId: '',
    scriptAssigned: '',
    quantity: '1'
  });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Get campaigns already assigned to this user
  const userCampaigns = existingTasks
    .filter(task => task.assignedTo === user?.id)
    .map(task => parseInt(task.campaignId));

  // Filter out campaigns that already have tasks for this user
  const availableCampaigns = campaigns.filter(campaign => 
    !userCampaigns.includes(campaign.id)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!canManageTasks) {
      onClose();
      return;
    }

    // Check if campaign already exists for this user
    const campaignId = parseInt(formData.campaignId);
    const hasDuplicate = existingTasks.some(
      task => task.assignedTo === user.id && parseInt(task.campaignId) === campaignId
    );

    if (hasDuplicate) {
      const campaign = campaigns.find(c => c.id === campaignId);
      setError(`This user already has a task for "${campaign?.name}". Please select a different campaign.`);
      return;
    }
    
    // Determine mediaType based on user department
    let taskType = 'VIDEO';
    if (user.department === 'GRAPHIC DESIGN') {
      taskType = 'IMAGE';
    } else if (user.department === 'VIDEO EDITING') {
      taskType = 'VIDEO';
    }

    // Get week range based on current view (this-week or next-week)
    const now = new Date();
    const currentDay = now.getDay();
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Calculate days to this week's Monday
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday);
    
    // If viewing next week, add 7 days
    if (weekView === 'next-week') {
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekRange = `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;

    const taskData = {
      campaignId: parseInt(formData.campaignId),
      assignedTo: user.id,
      scriptAssigned: formData.scriptAssigned ? [parseInt(formData.scriptAssigned)] : [],
      quantity: formData.quantity,
      mediaType: taskType,
      status: 'Not done',
      week: weekRange,
      copyWritten: [false],
      copyApproval: [],
      copyApprovalFeedback: [],
      copyLink: [],
      copyLinkAt: [],
      copyWrittenAt: [],
      copyApprovalAt: [],
      priority: 'Normal'
    };

    // Reset form and close immediately (don't wait for backend)
    setFormData({
      campaignId: '',
      scriptAssigned: '',
      quantity: '1'
    });
    onClose();
    
    // Add task in background
    onAddTask(taskData);
  };

  const mediaBuyers = users.filter(u => u.department === 'MEDIA BUYING');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Assigning to:</p>
          <p className="font-semibold text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.department}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign *
            </label>
            <select
              required
              value={formData.campaignId}
              onChange={(e) => {
                setFormData({ ...formData, campaignId: e.target.value });
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Select a campaign...</option>
              {availableCampaigns.length === 0 ? (
                <option value="" disabled>All campaigns already assigned</option>
              ) : (
                availableCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))
              )}
            </select>
            {availableCampaigns.length === 0 && (
              <p className="mt-1 text-xs text-orange-600">This user already has tasks for all available campaigns.</p>
            )}
          </div>

          {/* Copy Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Copy Assigned To
            </label>
            <select
              value={formData.scriptAssigned}
              onChange={(e) => setFormData({ ...formData, scriptAssigned: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Not assigned</option>
              {mediaBuyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="text"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="e.g., x5 or 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">Enter quantity (e.g., "5" or "x5")</p>
          </div>

          {/* Type Display */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Task Type:</p>
            <p className="font-semibold text-gray-900">
              {user.department === 'GRAPHIC DESIGN' ? 'Image' : 
               user.department === 'VIDEO EDITING' ? 'Video' : 'Task'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canManageTasks}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
