import React, { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isManager, isAdmin } from '../constants/roles';
import { useApp } from '../context/AuthContext';
import { BUYER_COLOR_OPTIONS } from '../pages/Settings';

const UserTaskCard = ({ 
  user, 
  userTasks, 
  campaigns, 
  users,
  onClick,
  onAddTaskClick,
  currentUser,
  updateTask,
  deleteTask,
  weekView,
  readOnly
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { buyerColors } = useApp();
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const canEditStatus = !readOnly && currentUser && isManager(currentUser.role);
  const canEditBuyer = !readOnly && currentUser && isManager(currentUser.role);
  const canManageTasks = !readOnly && currentUser && isManager(currentUser.role);
  const isAdminUser = !readOnly && currentUser && isAdmin(currentUser.role);
  
  const getUserSlug = (userId) => {
    const u = users.find(u => u.id === parseInt(userId));
    if (!u) return null;
    return slugify(u.slug || u.name || u.email || u.username || u.id);
  };

  const slugify = (value) => {
    if (!value) return '';
    return value
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Group tasks by campaign
  const tasksByCampaign = userTasks.reduce((acc, task) => {
    const campaignId = task.campaignId || 'unknown';
    if (!acc[campaignId]) {
      acc[campaignId] = [];
    }
    acc[campaignId].push(task);
    return acc;
  }, {});

  // Filter media buyers for the dropdown
  const mediaBuyers = users.filter(u => u.department === 'MEDIA BUYING');

  // Get color for a media buyer - uses saved color from settings, falls back to auto-assignment
  const getBuyerColor = (buyerId) => {
    const defaultColor = { bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', hover: 'hover:bg-gray-100 dark:hover:bg-gray-700', hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-500' };
    if (!buyerId) return defaultColor;
    
    // Check for admin-assigned color from settings
    const savedColorName = buyerColors?.[buyerId];
    if (savedColorName) {
      const found = BUYER_COLOR_OPTIONS.find(c => c.name === savedColorName);
      if (found) return { bg: found.bg, text: found.text, border: found.border, hover: found.hover, hoverBorder: found.hoverBorder };
    }
    
    // Fallback: auto-assign based on ID
    const fallbackColors = BUYER_COLOR_OPTIONS.slice(0, 12);
    const index = parseInt(buyerId) % fallbackColors.length;
    const c = fallbackColors[index];
    return { bg: c.bg, text: c.text, border: c.border, hover: c.hover, hoverBorder: c.hoverBorder };
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 lg:p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col" 
      onClick={() => onClick && onClick(user, userTasks)}
    >
      {/* User Avatar */}
      <div className="flex flex-col items-center mb-3 lg:mb-4">
        {user.profile_picture ? (
          <img src={user.profile_picture} alt={user.name} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full object-cover mb-2 lg:mb-3" />
        ) : (
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center mb-2 lg:mb-3">
            <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">{user.name}</h3>
        <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 text-center">{user.department}</p>
      </div>

      {/* Tasks by Campaign */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-3 lg:space-y-4">
          {Object.keys(tasksByCampaign).length > 0 ? (
            Object.entries(tasksByCampaign).map(([campaignId, tasks]) => {
              const campaign = campaigns.find(c => c.id === parseInt(campaignId));
              const campaignName = campaign?.name || 'Unknown Campaign';
              
              return (
                <div key={campaignId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                  {/* Campaign Header */}
                  <div 
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-3 lg:px-4 py-2 lg:py-2.5 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const userSlug = getUserSlug(user.id) || 'user';
                      const campaignSlug = slugify(campaign?.slug || campaign?.name || campaignId);
                      const isNextWeek = location.pathname.startsWith('/next-week');
                      const campaignPath = isNextWeek 
                        ? `/next-week/cards/${userSlug}/campaign/${campaignSlug}` 
                        : `/cards/${userSlug}/campaign/${campaignSlug}`;
                      navigate(campaignPath, { replace: true });
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs lg:text-sm truncate">{campaignName}</h5>
                        {/* Edit Campaign Button - Admin Only */}
                        {isAdminUser && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCampaignId(editingCampaignId === campaignId ? null : campaignId);
                            }}
                            className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all flex-shrink-0"
                            title="Edit campaign"
                          >
                            <Pencil className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                      {/* Delete Button */}
                      {canManageTasks && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const taskIds = tasks.map(t => t.id);
                            if (window.confirm(`Are you sure you want to delete all ${tasks.length} task(s) for ${campaignName}?`)) {
                              taskIds.forEach(id => deleteTask(id));
                            }
                          }}
                          className="p-1 lg:p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transition-all hover:scale-110 flex-shrink-0"
                          title="Delete all tasks for this campaign"
                        >
                          <Trash2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Campaign Edit Dropdown - Admin Only */}
                  {isAdminUser && editingCampaignId === campaignId && (
                    <div className="bg-blue-50 dark:bg-blue-900 px-3 lg:px-4 py-2 border-b border-blue-200 dark:border-blue-700">
                      <label className="block text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Change Campaign:</label>
                      <select
                        value={campaignId}
                        onChange={(e) => {
                          const newCampaignId = e.target.value;
                          const oldCampaignId = campaignId;
                          
                          // Close dropdown immediately
                          setEditingCampaignId(null);
                          
                          // Update all tasks immediately (optimistic update)
                          tasks.forEach(task => {
                            updateTask(task.id, { campaignId: parseInt(newCampaignId) });
                          });
                          
                          // Fire webhooks in background (don't await)
                          (async () => {
                            try {
                              const adminEmail = currentUser?.email || '';
                              const adminPassword = localStorage.getItem('admin_password') || '';
                              const loginDate = localStorage.getItem('login_date') || new Date().toLocaleDateString('en-GB');
                              const encoder = new TextEncoder();
                              const codeData = encoder.encode(adminEmail + adminPassword + loginDate);
                              const codeHash = await crypto.subtle.digest('SHA-256', codeData);
                              const codeArray = Array.from(new Uint8Array(codeHash));
                              const code = codeArray.map(b => b.toString(16).padStart(2, '0')).join('');
                              
                              const campaignsWebhookUrl = import.meta.env.VITE_GET_CAMPAIGNS_WEBHOOK_URL;
                              if (campaignsWebhookUrl) {
                                tasks.forEach(task => {
                                  const url = new URL(campaignsWebhookUrl);
                                  url.searchParams.set('code', code);
                                  url.searchParams.set('requested_by', adminEmail);
                                  url.searchParams.set('task_id', task.id);
                                  url.searchParams.set('old_campaign_id', oldCampaignId);
                                  url.searchParams.set('new_campaign_id', newCampaignId);
                                  
                                  fetch(url.toString(), { method: 'PATCH' }).catch(err => {
                                    console.error('Campaign webhook error:', err);
                                  });
                                });
                              }
                            } catch (error) {
                              console.error('Error sending campaign webhooks:', error);
                            }
                          })();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1.5 text-xs border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        {campaigns.map(camp => (
                          <option key={camp.id} value={camp.id}>
                            {camp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Campaign Content */}
                  <div className="bg-white dark:bg-gray-800">
                    {tasks.map((task, idx) => {
                      // Handle copy arrays
                      const copyLinks = Array.isArray(task.copyLink) ? task.copyLink : [task.copyLink || ''];
                      const scriptAssignments = Array.isArray(task.scriptAssigned) ? task.scriptAssigned : [task.scriptAssigned || ''];
                      const copyWrittenArray = Array.isArray(task.copyWritten) ? task.copyWritten : [task.copyWritten || false];
                      
                      // Get the maximum length to ensure all arrays are displayed
                      const maxCopies = Math.max(copyLinks.length, scriptAssignments.length, copyWrittenArray.length);
                      
                      // Use task.status for Task Status (not copyApproval)
                      let taskStatus = task.status || 'Not done';
                      if (taskStatus === 'Not Done') taskStatus = 'Not done';
                      if (taskStatus === 'In Progress') taskStatus = 'Not done';
                      if (taskStatus === 'Left feedback') taskStatus = 'Left Feedback';
                      
                      return (
                        <div key={task.id} className={idx > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}>
                          {/* Header Row - Display only once */}
                          <div 
                            className="grid gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 lg:py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
                            style={{ gridTemplateColumns: '20px auto auto auto' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const userSlug = getUserSlug(user.id) || 'user';
                              const campSlug = slugify(campaign?.slug || campaign?.name || campaignId);
                              const isNextWeek = location.pathname.startsWith('/next-week');
                              const taskPath = isNextWeek 
                                ? `/next-week/cards/${userSlug}/campaign/${campSlug}/task/${task.id}` 
                                : `/cards/${userSlug}/campaign/${campSlug}/task/${task.id}`;
                              navigate(taskPath, { replace: true });
                            }}
                          >
                            <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tight text-center">
                              
                            </p>
                            <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tight text-center">
                              Copy Assigned To
                            </p>
                            <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tight text-center">
                              Copy Complete
                            </p>
                            <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tight text-center">
                              Task Status
                            </p>
                          </div>
                          
                          {/* Data Rows - One for each copy */}
                          {Array.from({ length: maxCopies }).map((_, copyIndex) => {
                            const scriptAssignedId = scriptAssignments[copyIndex] || '';
                            const assignedBuyer = scriptAssignedId 
                              ? users.find(u => u.id === parseInt(scriptAssignedId))
                              : null;
                            const copyComplete = copyWrittenArray[copyIndex] === true;
                            
                            return (
                              <div 
                                key={copyIndex} 
                                className="grid gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 lg:py-2 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
                                style={{ gridTemplateColumns: '20px auto auto auto' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const userSlug = getUserSlug(user.id) || 'user';
                                  const campSlug = slugify(campaign?.slug || campaign?.name || campaignId);
                                  const isNextWeek = location.pathname.startsWith('/next-week');
                                  const taskPath = isNextWeek 
                                    ? `/next-week/cards/${userSlug}/campaign/${campSlug}/task/${task.id}` 
                                    : `/cards/${userSlug}/campaign/${campSlug}/task/${task.id}`;
                                  navigate(taskPath, { replace: true });
                                }}
                              >
                                {/* Copy Number - Use task index for sequential numbering across campaign */}
                                <div className="flex items-center justify-center">
                                  <span className="text-[9px] lg:text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                    #{idx + 1}
                                  </span>
                                </div>
                                
                                {/* Copy Assigned To */}
                                <div className="flex items-center justify-center">
                                  {canEditBuyer ? (
                                    <div className="relative w-full max-w-[140px]">
                                      {(() => {
                                        const buyerColor = getBuyerColor(scriptAssignedId);
                                        return (
                                          <>
                                            <select
                                              data-colored
                                              value={scriptAssignedId || ''}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                const newBuyerId = e.target.value ? parseInt(e.target.value) : null;
                                                const newScriptAssignments = [...scriptAssignments];
                                                newScriptAssignments[copyIndex] = newBuyerId;
                                                updateTask(task.id, { scriptAssigned: newScriptAssignments });
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className={`appearance-none w-full text-[10px] lg:text-xs font-medium px-2 lg:px-3 py-1 lg:py-1.5 pr-6 lg:pr-7 rounded-md cursor-pointer transition-all duration-200 border-2 ${buyerColor.border} ${buyerColor.bg} ${buyerColor.text} ${buyerColor.hover} ${buyerColor.hoverBorder} focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm hover:shadow text-center`}
                                            >
                                              <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Not assigned</option>
                                              {mediaBuyers.map(buyer => (
                                                <option key={buyer.id} value={buyer.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                                  {buyer.name}
                                                </option>
                                              ))}
                                            </select>
                                            <div className={`absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none ${buyerColor.text}`}>
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                              </svg>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  ) : (
                                    (() => {
                                      const buyerColor = getBuyerColor(scriptAssignedId);
                                      return (
                                        <p className={`text-xs lg:text-sm font-medium text-center ${assignedBuyer ? buyerColor.text : 'text-gray-900 dark:text-gray-100'}`}>
                                          {assignedBuyer ? assignedBuyer.name : (
                                            <span className="text-gray-400 italic">Not assigned</span>
                                          )}
                                        </p>
                                      );
                                    })()
                                  )}
                                </div>
                                
                                {/* Copy Complete */}
                                <div className="flex items-center justify-center">
                                  {canEditBuyer ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newCopyWritten = [...copyWrittenArray];
                                        newCopyWritten[copyIndex] = !newCopyWritten[copyIndex];
                                        updateTask(task.id, { copyWritten: newCopyWritten });
                                      }}
                                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer hover:scale-110 ${
                                        copyComplete 
                                          ? 'bg-green-600 border-green-600' 
                                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-green-400'
                                      }`}
                                    >
                                      {copyComplete && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  ) : (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                                      copyComplete 
                                        ? 'bg-green-600 border-green-600' 
                                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                    }`}>
                                      {copyComplete && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Task Status - Show on every copy row */}
                                <div className="flex items-center justify-center">
                                  {canEditStatus ? (
                                    <div className="relative">
                                      <select
                                        data-colored
                                        value={taskStatus}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          updateTask(task.id, { status: e.target.value });
                                          setEditingTaskId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`appearance-none text-[10px] lg:text-xs font-semibold px-1.5 lg:px-2 py-0.5 lg:py-1 pr-4 lg:pr-5 rounded-full cursor-pointer transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm hover:shadow-md text-center ${
                                          taskStatus === 'Approved' 
                                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 border-green-200 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-800' :
                                          taskStatus === 'Needs Review' 
                                            ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-100 border-orange-200 dark:border-orange-600 hover:bg-orange-200 dark:hover:bg-orange-800' :
                                          taskStatus === 'Left Feedback' 
                                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100 border-purple-200 dark:border-purple-600 hover:bg-purple-200 dark:hover:bg-purple-800' :
                                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                      >
                                        <option value="Not done" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Not done</option>
                                        <option value="Needs Review" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Needs Review</option>
                                        <option value="Left Feedback" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Left Feedback</option>
                                        <option value="Approved" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Approved</option>
                                      </select>
                                      <div className={`absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none ${
                                        taskStatus === 'Approved' 
                                          ? 'text-green-700 dark:text-green-100' :
                                        taskStatus === 'Needs Review' 
                                          ? 'text-orange-700 dark:text-orange-100' :
                                        taskStatus === 'Left Feedback' 
                                          ? 'text-purple-700 dark:text-purple-100' :
                                        'text-gray-600 dark:text-gray-300'
                                      }`}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className={`inline-block text-[10px] lg:text-xs font-semibold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full ${
                                      taskStatus === 'Approved' 
                                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100' :
                                      taskStatus === 'Needs Review' 
                                        ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-100' :
                                      taskStatus === 'Left Feedback' 
                                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100' :
                                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>
                                      {taskStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400 italic">No tasks</p>
          )}
        </div>
      </div>

      {/* Add Task Button */}
      <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-100 dark:border-gray-700">
        {canManageTasks && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTaskClick && onAddTaskClick();
            }}
            className="flex items-center gap-1.5 lg:gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium text-sm lg:text-base"
          >
            <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(UserTaskCard);
