import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { isManager } from '../constants/roles';

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
  weekView
}) => {
  const [editingTaskId, setEditingTaskId] = useState(null);
  const canEditStatus = currentUser && isManager(currentUser.role);
  const canEditBuyer = currentUser && isManager(currentUser.role);

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

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col" 
      onClick={() => onClick && onClick(user, userTasks)}
    >
      {/* User Avatar */}
      <div className="flex flex-col items-center mb-3 lg:mb-4">
        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-300 rounded-full flex items-center justify-center mb-2 lg:mb-3">
          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 text-center">{user.name}</h3>
        <p className="text-xs lg:text-sm text-gray-500 text-center">{user.department}</p>
      </div>

      {/* Tasks by Campaign */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-3 lg:space-y-4">
          {Object.keys(tasksByCampaign).length > 0 ? (
            Object.entries(tasksByCampaign).map(([campaignId, tasks]) => {
              const campaign = campaigns.find(c => c.id === parseInt(campaignId));
              const campaignName = campaign?.name || 'Unknown Campaign';
              
              return (
                <div key={campaignId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {/* Campaign Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 lg:px-4 py-2 lg:py-2.5 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-semibold text-gray-900 text-xs lg:text-sm truncate">{campaignName}</h5>
                      {/* Delete Button */}
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
                    </div>
                  </div>
                  
                  {/* Campaign Content */}
                  <div className="bg-white">
                    {tasks.map((task, idx) => {
                      const assignedBuyer = task.scriptAssigned 
                        ? users.find(u => u.id === parseInt(task.scriptAssigned))
                        : null;
                      // Check for copyWritten field (handle both casing variations)
                      const copyComplete = task.copyWritten === true || task.CopyWritten === true;
                      
                      // Use task.status for Task Status (not copyApproval)
                      let taskStatus = task.status || 'Not done';
                      if (taskStatus === 'Not Done') taskStatus = 'Not done';
                      if (taskStatus === 'In Progress') taskStatus = 'Not done';
                      if (taskStatus === 'Left feedback') taskStatus = 'Left Feedback';
                      
                      return (
                        <div key={task.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                          {/* Task Info Row */}
                          <div className="grid grid-cols-3 gap-2 lg:gap-4 px-2 lg:px-4 py-1.5 lg:py-2 items-start">
                            {/* Copy Assigned To */}
                            <div className="flex flex-col items-center">
                              <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 uppercase tracking-tight mb-1.5 lg:mb-2">
                                Copy Assigned To
                              </p>
                              <div className="flex items-center justify-center h-[32px] lg:h-[36px]">
                                {canEditBuyer ? (
                                  <div className="relative">
                                    <select
                                      value={task.scriptAssigned || ''}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const newBuyerId = e.target.value ? parseInt(e.target.value) : null;
                                        updateTask(task.id, { scriptAssigned: newBuyerId });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="appearance-none text-[10px] lg:text-xs font-medium px-2 lg:px-3 py-1 lg:py-1.5 pr-6 lg:pr-7 rounded-md cursor-pointer transition-all duration-200 border-2 border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm hover:shadow text-center min-w-[100px] lg:min-w-[120px]"
                                    >
                                      <option value="" className="bg-white text-gray-900">Not assigned</option>
                                      {mediaBuyers.map(buyer => (
                                        <option key={buyer.id} value={buyer.id} className="bg-white text-gray-900">
                                          {buyer.name}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-blue-700">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs lg:text-sm font-medium text-gray-900 text-center">
                                    {assignedBuyer ? assignedBuyer.name : (
                                      <span className="text-gray-400 italic">Not assigned</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Copy Complete */}
                            <div className="flex flex-col items-center">
                              <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 uppercase tracking-tight mb-1.5 lg:mb-2">
                                Copy Complete
                              </p>
                              <div className="flex items-center justify-center h-[32px] lg:h-[36px]">
                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                                  copyComplete 
                                    ? 'bg-green-600 border-green-600' 
                                    : 'bg-white border-gray-300'
                                }`}>
                                  {copyComplete && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Task Status */}
                            <div className="flex flex-col items-center">
                              <p className="text-[8px] lg:text-[10px] font-medium text-gray-500 uppercase tracking-tight mb-1.5 lg:mb-2">
                                Task Status
                              </p>
                              <div className="flex items-center justify-center h-[32px] lg:h-[36px]">
                                {canEditStatus ? (
                                  <div className="relative">
                                    <select
                                      value={taskStatus}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        updateTask(task.id, { status: e.target.value });
                                        setEditingTaskId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`appearance-none text-[10px] lg:text-xs font-semibold px-1.5 lg:px-2 py-0.5 lg:py-1 pr-4 lg:pr-5 rounded-full cursor-pointer transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm hover:shadow-md text-center ${
                                        taskStatus === 'Approved' 
                                          ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' :
                                        taskStatus === 'Needs Review' 
                                          ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' :
                                        taskStatus === 'Left Feedback' 
                                          ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' :
                                        'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                      }`}
                                    >
                                      <option value="Not done" className="bg-white text-gray-900">Not done</option>
                                      <option value="Needs Review" className="bg-white text-gray-900">Needs Review</option>
                                      <option value="Left Feedback" className="bg-white text-gray-900">Left Feedback</option>
                                      <option value="Approved" className="bg-white text-gray-900">Approved</option>
                                    </select>
                                    <div className={`absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none ${
                                      taskStatus === 'Approved' 
                                        ? 'text-green-700' :
                                      taskStatus === 'Needs Review' 
                                        ? 'text-orange-700' :
                                      taskStatus === 'Left Feedback' 
                                        ? 'text-purple-700' :
                                      'text-gray-600'
                                    }`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                ) : (
                                  <span className={`inline-block text-[10px] lg:text-xs font-semibold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full ${
                                    taskStatus === 'Approved' 
                                      ? 'bg-green-100 text-green-700' :
                                    taskStatus === 'Needs Review' 
                                      ? 'bg-orange-100 text-orange-700' :
                                    taskStatus === 'Left Feedback' 
                                      ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {taskStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
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
      <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTaskClick && onAddTaskClick();
          }}
          className="flex items-center gap-1.5 lg:gap-2 text-red-600 hover:text-red-700 transition-colors font-medium text-sm lg:text-base"
        >
          <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
};

export default React.memo(UserTaskCard);
