import React, { useState } from 'react';
import { useApp } from '../context/AuthContext';
import { isMediaBuyer } from '../constants/roles';

const TaskCard = ({ user }) => {
  const { tasks, scheduledTasks, campaigns, getUserById } = useApp();
  const [selectedCampaign, setSelectedCampaign] = useState('');

  // Get all tasks for this user
  const getUserTasks = () => {
    const allTasks = [...(tasks || []), ...(scheduledTasks || [])];
    return allTasks.filter(t => {
      const matchesUser = t.assignedTo === user?.id;
      const matchesCampaign = !selectedCampaign || t.campaignId === parseInt(selectedCampaign);
      return matchesUser && matchesCampaign;
    });
  };

  const userTasks = getUserTasks();

  // Get copy status and assignee
  const getCopyStatus = () => {
    const taskWithCopy = userTasks.find(t => t.copyLink || t.copyWritten);
    
    if (!taskWithCopy) {
      return { status: 'Not Done', assignee: null };
    }
    
    if (taskWithCopy.copyApproval === 'Approved') {
      const assignee = taskWithCopy.scriptAssigned ? getUserById(taskWithCopy.scriptAssigned) : null;
      return { status: 'Approved', assignee };
    } else if (taskWithCopy.copyWritten || taskWithCopy.copyLink) {
      const assignee = taskWithCopy.scriptAssigned ? getUserById(taskWithCopy.scriptAssigned) : null;
      return { status: 'In Progress', assignee };
    }
    
    return { status: 'Not Done', assignee: null };
  };

  // Get weekly progress
  const getWeeklyProgress = () => {
    if (isMediaBuyer(user?.department)) {
      const copiesWritten = userTasks.filter(t => t.copyWritten === true).length;
      return { completed: copiesWritten, total: userTasks.length };
    } else {
      // For creatives: count tasks with all viewer links approved
      const completedTasks = userTasks.filter(t => {
        const viewerLinks = t.viewerLink;
        const approvals = t.viewerLinkApproval;
        
        if (!Array.isArray(viewerLinks) || viewerLinks.length === 0) return false;
        
        const validLinks = viewerLinks.filter(link => link && link.trim());
        if (validLinks.length === 0) return false;
        
        return validLinks.every((link, idx) => approvals?.[idx] === 'Approved');
      }).length;
      
      return { completed: completedTasks, total: userTasks.length };
    }
  };

  // Get ad statuses
  const getAdStatuses = () => {
    return userTasks.map((task, idx) => {
      let status = 'Not Started';
      
      if (task.viewerLink && task.viewerLink.length > 0) {
        const validLinks = task.viewerLink.filter(link => link && link.trim());
        if (validLinks.length > 0) {
          const allApproved = validLinks.every((link, i) => 
            task.viewerLinkApproval?.[i] === 'Approved'
          );
          status = allApproved ? 'Approved' : 'In Progress';
        }
      } else if (task.copyWritten || task.copyLink) {
        status = 'In Progress';
      }
      
      return { id: task.id, number: idx + 1, status };
    });
  };

  const copyStatus = getCopyStatus();
  const progress = getWeeklyProgress();
  const adStatuses = getAdStatuses();
  const selectedCampaignData = campaigns?.find(c => c.id === parseInt(selectedCampaign));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Campaign Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select campaign...</option>
          {campaigns?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Copy Status */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Copy:</span>{' '}
          <span className={
            copyStatus.status === 'Approved' ? 'text-green-600' :
            copyStatus.status === 'In Progress' ? 'text-blue-600' :
            'text-gray-600'
          }>
            {copyStatus.status}
          </span>
          {copyStatus.assignee && (
            <span className="text-gray-600"> ({copyStatus.assignee.name})</span>
          )}
        </p>
      </div>

      {/* Weekly Progress */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-1">
          Weekly Progress: {progress.completed}/{progress.total}
        </p>
        <p className="text-xs text-gray-600">{progress.total - progress.completed} ads remaining</p>
      </div>

      {/* Today's Ad Progress */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3 tracking-wide">
          TODAY'S AD PROGRESS
        </h4>
        <div className="space-y-2">
          {adStatuses.length > 0 ? (
            adStatuses.map((ad) => (
              <div key={ad.id} className="text-sm">
                <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                  Ad {ad.number}
                </a>
                <span>: </span>
                <span className={
                  ad.status === 'Approved' ? 'text-green-600' :
                  ad.status === 'In Progress' ? 'text-blue-600' :
                  'text-gray-600'
                }>
                  {ad.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">No ads for this campaign</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
