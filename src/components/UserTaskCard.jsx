import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const UserTaskCard = ({ 
  user, 
  userTasks, 
  campaigns, 
  users,
  cardCampaignFilter,
  onCampaignFilterChange,
  onClick 
}) => {
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  const toggleCampaign = (e, campaignId) => {
    e.stopPropagation(); // Prevent card click when toggling campaign
    setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
  };
  // Helper functions for this user's card
  const getCopyStatuses = () => {
    return userTasks.map((task, idx) => {
      // Use the actual copyApproval value from the database
      let status = task.copyApproval || 'Not Done';
      let assignee = task.scriptAssigned ? users.find(u => u.id === parseInt(task.scriptAssigned)) : null;
      
      return { id: task.id, title: task.title, number: idx + 1, status, assignee };
    });
  };

  const getWeeklyProgress = () => {
    // For Video Editors and Graphic Designers: count approved viewer links vs total required creatives
    if (user.department === 'VIDEO EDITING' || user.department === 'GRAPHIC DESIGN') {
      let totalApproved = 0;
      let totalRequired = 0;

      userTasks.forEach(task => {
        // Parse quantity from task (e.g., "x5" -> 5, null -> 1)
        let requiredQuantity = 1;
        if (task.quantity) {
          if (typeof task.quantity === 'string') {
            const match = task.quantity.match(/x?(\d+)/i);
            if (match) {
              requiredQuantity = parseInt(match[1]);
            }
          } else if (typeof task.quantity === 'number') {
            requiredQuantity = task.quantity;
          }
        }

        totalRequired += requiredQuantity;

        // Count approved viewer links for this task (capped at required quantity)
        if (Array.isArray(task.viewerLinkApproval) && task.viewerLinkApproval.length > 0) {
          // Handle both boolean true and string "Approved"
          const approvedCount = task.viewerLinkApproval.filter(approval => 
            approval === 'Approved' || approval === 'Uploaded' || approval === true
          ).length;
          const cappedCount = Math.min(approvedCount, requiredQuantity);
          totalApproved += cappedCount;
        }
      });

      return { completed: totalApproved, total: totalRequired };
    }

    // For Media Buyers: count tasks with Approved copy
    const approvedCopies = userTasks.filter(t => t.copyApproval === 'Approved').length;
    return { completed: approvedCopies, total: userTasks.length };
  };

  const getAdStatuses = () => {
    const allAds = [];
    
    userTasks.forEach((task, taskIdx) => {
      // Parse quantity from task (e.g., "x5" -> 5, null -> 1)
      let requiredQuantity = 1;
      if (task.quantity) {
        if (typeof task.quantity === 'string') {
          const match = task.quantity.match(/x?(\d+)/i);
          if (match) {
            requiredQuantity = parseInt(match[1]);
          }
        } else if (typeof task.quantity === 'number') {
          requiredQuantity = task.quantity;
        }
      }

      // Determine the maximum number of ads to show (either required quantity or actual uploads)
      const maxAds = Math.max(
        requiredQuantity,
        Array.isArray(task.viewerLink) ? task.viewerLink.length : 0
      );

      // Create individual ad entries for each creative (required + extra)
      for (let i = 0; i < maxAds; i++) {
        let status = 'Not Done';
        
        // Get status from viewerLinkApproval array
        if (Array.isArray(task.viewerLinkApproval) && task.viewerLinkApproval[i]) {
          const approval = task.viewerLinkApproval[i];
          if (approval === 'Approved' || approval === 'Uploaded' || approval === true) {
            status = 'Approved';
          } else if (approval === 'Left Feedback') {
            status = 'Left Feedback';
          } else if (approval === 'Needs Review') {
            status = 'Needs Review';
          } else if (task.viewerLink && task.viewerLink[i] && task.viewerLink[i].trim()) {
            status = 'In Progress';
          }
        } else if (task.viewerLink && task.viewerLink[i] && task.viewerLink[i].trim()) {
          status = 'In Progress';
        }
        
        allAds.push({
          id: `${task.id}-${i}`,
          taskId: task.id,
          title: task.title,
          number: i + 1,
          status
        });
      }
    });
    
    return allAds;
  };

  // Filter tasks for media buyers to only show copies approved today
  const getFilteredCopyStatuses = () => {
    if (user.department === 'MEDIA BUYING') {
      // Get today's date in UTC
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

      // Filter tasks to only those with CopyWrittenAt today
      const tasksWrittenToday = userTasks.filter(task => {
        if (!task.CopyWrittenAt) return false;
        const writtenDate = new Date(task.CopyWrittenAt);
        return writtenDate >= todayUTC && writtenDate < tomorrowUTC;
      });

      // Get copy statuses for filtered tasks
      return tasksWrittenToday.map((task, idx) => {
        // Use the actual copyApproval value from the database
        let status = task.copyApproval || 'Not Done';
        let assignee = task.scriptAssigned ? users.find(u => u.id === parseInt(task.scriptAssigned)) : null;
        
        return { id: task.id, title: task.title, number: idx + 1, status, assignee };
      });
    }

    // For Video Editors and Graphic Designers: show copies approved today OR approved earlier but ads not completed
    if (user.department === 'VIDEO EDITING' || user.department === 'GRAPHIC DESIGN') {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

      const filteredTasks = userTasks.filter(task => {
        // Must have copy approval
        if (!task.copyApprovalAt || task.copyApproval !== 'Approved') return false;

        const approvalDate = new Date(task.copyApprovalAt);
        
        // Check if approved today
        const isApprovedToday = approvalDate >= todayUTC && approvalDate < tomorrowUTC;
        if (isApprovedToday) return true;

        // Check if approved earlier but ads not completed
        const isApprovedEarlier = approvalDate < todayUTC;
        if (isApprovedEarlier) {
          // Check if all viewer links are approved (ad completed)
          const requiredQuantity = task.quantity ? (typeof task.quantity === 'string' ? parseInt(task.quantity.match(/x?(\d+)/i)?.[1] || 1) : task.quantity) : 1;
          
          if (!Array.isArray(task.viewerLinkApproval) || task.viewerLinkApproval.length === 0) {
            return true; // No viewer links approved yet, so not completed
          }

          const approvedCount = task.viewerLinkApproval.filter(approval => approval === 'Approved' || approval === 'Uploaded' || approval === true).length;
          return approvedCount < requiredQuantity; // Not all required viewer links are approved
        }

        return false;
      });

      return filteredTasks.map((task, idx) => {
        let status = task.copyApproval || 'Not Done';
        let assignee = task.scriptAssigned ? users.find(u => u.id === parseInt(task.scriptAssigned)) : null;
        
        return { id: task.id, title: task.title, number: idx + 1, status, assignee };
      });
    }

    return getCopyStatuses();
  };

  const copyStatuses = getFilteredCopyStatuses();
  const progress = getWeeklyProgress();
  
  // Get all ad statuses from userTasks (already campaign-filtered by parent)
  const adStatuses = getAdStatuses();

  // Calculate "Done today" based on viewerLinkApprovalAt for all users
  const getDoneToday = () => {
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

    let count = 0;
    userTasks.forEach(task => {
      // Check both lowercase and capital case field names from webhook
      const approvalTimestamps = task.viewerLinkApprovalAt || task.ViewerLinkApprovalAt;
      
      if (Array.isArray(approvalTimestamps) && approvalTimestamps.length > 0) {
        approvalTimestamps.forEach(approvalAt => {
          if (approvalAt) {
            const approvalDate = new Date(approvalAt);
            if (approvalDate >= todayUTC && approvalDate < tomorrowUTC) {
              count++;
            }
          }
        });
      }
    });
    
    // Debug logging
    if (userTasks.length > 0) {
      console.log('Done Today Debug for', user.name, {
        count,
        todayUTC: todayUTC.toISOString(),
        tomorrowUTC: tomorrowUTC.toISOString(),
        sampleTask: {
          id: userTasks[0].id,
          title: userTasks[0].title,
          viewerLinkApprovalAt: userTasks[0].viewerLinkApprovalAt,
          ViewerLinkApprovalAt: userTasks[0].ViewerLinkApprovalAt
        }
      });
    }
    
    return count;
  };

  const doneToday = getDoneToday();

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow" 
      onClick={() => onClick && onClick(user, userTasks)}
    >
      {/* User Avatar */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
        <p className="text-sm text-gray-500">{user.department}</p>
      </div>

      {/* Campaign Dropdown */}
      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
        <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
        <select
          value={cardCampaignFilter}
          onChange={onCampaignFilterChange}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
          ))}
        </select>
      </div>

      {/* Weekly Progress - Show before Copy Status for Media Buyers */}
      {user.department === 'MEDIA BUYING' && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900">
            Weekly Progress: {progress.completed}/{progress.total}
          </p>
          <p className="text-xs text-gray-600">{progress.total - progress.completed} ads remaining</p>
          <p className="text-sm font-medium text-gray-900 mt-2">
            Done today: {doneToday}
          </p>
        </div>
      )}

      {/* Copy Status */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3 tracking-wide">
          COPY STATUS
        </h4>
        {user.department === 'MEDIA BUYING' ? (
          // For Media Buyers: Show campaign name in parenthesis
          <div className="space-y-2">
            {copyStatuses.length > 0 ? (
              (() => {
                // Group copies by campaign to restart numbering
                const copiesByCampaign = copyStatuses.reduce((acc, copy) => {
                  const task = userTasks.find(t => t.id === copy.id);
                  const campaignId = task?.campaignId || 'unknown';
                  if (!acc[campaignId]) {
                    acc[campaignId] = [];
                  }
                  acc[campaignId].push(copy);
                  return acc;
                }, {});

                // Flatten all copies with campaign names
                return Object.entries(copiesByCampaign).flatMap(([campaignId, copies]) => {
                  const campaign = campaigns.find(c => c.id === parseInt(campaignId));
                  const campaignName = campaign?.name || 'Unknown Campaign';
                  
                  return copies.map((copy, idx) => (
                    <div key={copy.id} className="text-sm">
                      <span className="font-bold text-gray-900">
                        {copy.title || `Copy ${idx + 1}`} ({campaignName}):
                      </span>{' '}
                      <span className={
                        copy.status === 'Approved' ? 'text-green-600' :
                        copy.status === 'In Progress' ? 'text-blue-600' :
                        copy.status === 'Needs Review' ? 'text-orange-600' :
                        copy.status === 'Left feedback' ? 'text-blue-600' :
                        'text-gray-600'
                      }>
                        {copy.status}
                      </span>
                    </div>
                  ));
                });
              })()
            ) : (
              <p className="text-sm text-gray-400 italic">No copies</p>
            )}
          </div>
        ) : (
          // For Video Editors and Graphic Designers: Group by campaign with accordion
          <div className="space-y-2">
            {copyStatuses.length > 0 ? (
              (() => {
                // Group copies by campaign
                const copiesByCampaign = copyStatuses.reduce((acc, copy) => {
                  const task = userTasks.find(t => t.id === copy.id);
                  const campaignId = task?.campaignId || 'unknown';
                  if (!acc[campaignId]) {
                    acc[campaignId] = [];
                  }
                  acc[campaignId].push(copy);
                  return acc;
                }, {});

                // Display campaigns with accordion
                return Object.entries(copiesByCampaign).map(([campaignId, copies]) => {
                  const campaign = campaigns.find(c => c.id === parseInt(campaignId));
                  const campaignName = campaign?.name || 'Unknown Campaign';
                  const isExpanded = expandedCampaign === campaignId;
                  
                  return (
                    <div key={campaignId} className="border border-gray-200 rounded-md overflow-hidden">
                      {/* Campaign Header - Clickable */}
                      <div 
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={(e) => toggleCampaign(e, campaignId)}
                      >
                        <span className="font-semibold text-gray-900 text-sm">
                          {campaignName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {copies.length} {copies.length === 1 ? 'copy' : 'copies'}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                      
                      {/* Campaign Content - Collapsible */}
                      {isExpanded && (
                        <div className="px-3 py-2 space-y-1 bg-white">
                          {copies.map((copy, idx) => (
                            <div key={copy.id} className="text-sm">
                              <span className="font-bold text-gray-900">
                                {copy.title || `Copy ${idx + 1}`}:
                              </span>{' '}
                              <span className={
                                copy.status === 'Approved' ? 'text-green-600' :
                                copy.status === 'In Progress' ? 'text-blue-600' :
                                copy.status === 'Needs Review' ? 'text-orange-600' :
                                copy.status === 'Left feedback' ? 'text-blue-600' :
                                'text-gray-600'
                              }>
                                {copy.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            ) : (
              <p className="text-sm text-gray-400 italic">No copies</p>
            )}
          </div>
        )}
      </div>

      {/* Weekly Progress - Show after Copy Status for Video/Graphic Design */}
      {user.department !== 'MEDIA BUYING' && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-900">
            Weekly Progress: {progress.completed}/{progress.total}
          </p>
          <p className="text-xs text-gray-600">{progress.total - progress.completed} ads remaining</p>
          <p className="text-sm font-medium text-gray-900 mt-2">
            Done today: {doneToday}
          </p>
        </div>
      )}

      {/* Today's Ad Progress - Only for Video Editing and Graphic Design */}
      {user.department !== 'MEDIA BUYING' && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3 tracking-wide">
            TODAY'S AD PROGRESS
          </h4>
          <div className="space-y-2">
            {userTasks.length > 0 ? (
              (() => {
                // Group ads by campaign first
                const adsByCampaign = {};
                
                userTasks.forEach(task => {
                  const campaignId = task.campaignId || 'unknown';
                  
                  if (!adsByCampaign[campaignId]) {
                    adsByCampaign[campaignId] = {};
                  }
                  
                  // Get ads for this task
                  const taskAds = adStatuses.filter(ad => ad.taskId === task.id);
                  if (taskAds.length > 0) {
                    adsByCampaign[campaignId][task.id] = {
                      task,
                      ads: taskAds
                    };
                  }
                });

                // Display campaigns with accordion
                return Object.entries(adsByCampaign).map(([campaignId, tasksData]) => {
                  const campaign = campaigns.find(c => c.id === parseInt(campaignId));
                  const campaignName = campaign?.name || 'Unknown Campaign';
                  const isExpanded = expandedCampaign === campaignId;
                  const tasksArray = Object.values(tasksData);
                  
                  // Skip campaigns with no ads
                  if (tasksArray.length === 0) return null;
                  
                  return (
                    <div key={campaignId} className="border border-gray-200 rounded-md overflow-hidden">
                      {/* Campaign Header - Clickable */}
                      <div 
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={(e) => toggleCampaign(e, campaignId)}
                      >
                        <span className="font-semibold text-gray-900 text-sm">
                          {campaignName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {tasksArray.length} {tasksArray.length === 1 ? 'task' : 'tasks'}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                      
                      {/* Campaign Content - Collapsible */}
                      {isExpanded && (
                        <div className="px-3 py-2 space-y-3 bg-white">
                          {tasksArray.map(({ task, ads }) => (
                            <div key={task.id} className="border-l-2 border-gray-200 pl-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">
                                {task.title || `Task ${task.id}`}
                              </p>
                              <div className="space-y-1">
                                {ads.length > 0 ? (
                                  ads.map((ad) => (
                                    <div key={ad.id} className="text-sm">
                                      <span className="font-bold text-gray-900">Ad {ad.number}:</span>{' '}
                                      <span className={
                                        ad.status === 'Approved' ? 'text-green-600 font-semibold' :
                                        ad.status === 'Left Feedback' ? 'text-orange-600 font-semibold' :
                                        ad.status === 'Needs Review' ? 'text-yellow-600 font-semibold' :
                                        ad.status === 'In Progress' ? 'text-blue-600' :
                                        'text-gray-600'
                                      }>
                                        {ad.status}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-gray-400 italic">No ads</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }).filter(Boolean); // Remove null entries
              })()
            ) : (
              <p className="text-sm text-gray-400 italic">No tasks</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTaskCard;
