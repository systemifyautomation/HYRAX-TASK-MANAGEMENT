import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Settings, Trash2, Check, X, Calendar, FolderOpen, Grid3X3, Copy, ChevronLeft, ChevronRight, Filter, AlertCircle, LayoutGrid, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, getWeek, addWeeks, subWeeks, isWithinInterval, startOfDay, endOfDay, subDays, parseISO, differenceInWeeks } from 'date-fns';
import { isAdmin } from '../constants/roles';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// Start date: Monday November 24, 2025
const WEEK_START_DATE = new Date(2025, 10, 24); // Month is 0-indexed, so 10 = November

// Helper function to get Monday of a given date
const getMondayOfWeek = (date) => {
  return startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
};

// Helper function to get Sunday of a given date
const getSundayOfWeek = (date) => {
  return endOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday (so end will be Sunday)
};

// Convert week offset to label (0 = This week, 1 = Next week, -1 = Last week, etc.)
const getWeekLabel = (weekOffset) => {
  if (weekOffset === 0) return 'This week';
  if (weekOffset === 1) return 'Next week';
  if (weekOffset === 2) return '2 weeks from now';
  if (weekOffset === -1) return 'Last week';
  if (weekOffset < -1) return `${Math.abs(weekOffset)} weeks ago`;
  if (weekOffset > 2) return `${weekOffset} weeks from now`;
};

// Format date to UTC dd/MM/yyyy
const formatDateUTC = (date) => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Get date range string for a week offset
const getWeekDateRange = (weekOffset) => {
  const thisMonday = getMondayOfWeek(new Date());
  const targetMonday = addWeeks(thisMonday, weekOffset);
  const targetSunday = getSundayOfWeek(targetMonday);
  
  // Convert to UTC
  const mondayUTC = new Date(Date.UTC(targetMonday.getFullYear(), targetMonday.getMonth(), targetMonday.getDate()));
  const sundayUTC = new Date(Date.UTC(targetSunday.getFullYear(), targetSunday.getMonth(), targetSunday.getDate()));
  
  return `${formatDateUTC(mondayUTC)} - ${formatDateUTC(sundayUTC)}`;
};

// Get current week offset (0 = this week)
const getCurrentWeekOffset = () => {
  const thisMonday = getMondayOfWeek(new Date());
  const startMonday = getMondayOfWeek(WEEK_START_DATE);
  return differenceInWeeks(thisMonday, startMonday);
};

// Get current week date range string
const getCurrentWeekDateRange = () => {
  return getWeekDateRange(0);
};

// Generate week options from start date to 2 weeks from now
const generateWeekOptions = () => {
  const options = [];
  const currentOffset = getCurrentWeekOffset();
  
  // From start date (most negative) to 2 weeks from now
  for (let offset = 0; offset <= currentOffset + 2; offset++) {
    const weekOffset = offset - currentOffset; // Convert to relative offset
    options.push({
      value: getWeekDateRange(weekOffset),
      label: getWeekLabel(weekOffset),
      weekOffset: weekOffset
    });
  }
  
  return options.reverse(); // Most recent first
};

const ScheduledTasks = () => {
  const { currentUser, scheduledTasks, setScheduledTasks, users, campaigns, scheduledTasksLoading, campaignsLoading, loadScheduledTasksFromWebhook, loadCampaignsData, addScheduledTask, addScheduledTasks, updateScheduledTask, deleteScheduledTask, deleteScheduledTasks, columns, addColumn, updateColumn, deleteColumn, loadUsers } = useApp();
  const isAdminUser = isAdmin(currentUser.role);
  const filtersRef = useRef(null);
  
  // Load scheduled tasks and campaigns data when component mounts
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        // Store current page for background refresh
        localStorage.setItem('hyrax_current_page', 'scheduledTasks');
        
        await loadScheduledTasksFromWebhook();
        await loadCampaignsData();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
      // Clear page marker when leaving
      if (localStorage.getItem('hyrax_current_page') === 'scheduledTasks') {
        localStorage.removeItem('hyrax_current_page');
      }
    };
  }, []);
  
  // Debug: Log users and columns on component mount
  useEffect(() => {
    console.log('Tasks Component - Users from context:', users);
    console.log('Tasks Component - Users length:', users?.length);
    console.log('Tasks Component - Current user:', currentUser);
    console.log('Tasks Component - Columns:', columns);
    console.log('Tasks Component - Week column:', columns.find(c => c.key === 'week'));
  }, [users, currentUser, columns]);
  
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newTask, setNewTask] = useState({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [displayType, setDisplayType] = useState('list'); // 'list', 'cards' - display mode
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedUser, setSelectedUser] = useState(''); // Filter by user
  const [showFilters, setShowFilters] = useState(false); // Show filter dropdown
  const [feedbackModal, setFeedbackModal] = useState(null); // { taskId, type: 'copyApproval' | 'adApproval', currentFeedback }
  const [cardCampaignFilters, setCardCampaignFilters] = useState({}); // Campaign filters for each card
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards have expanded details {taskId: true/false}
  
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    dropdownOptions: [],
  });

  // Generate week options (filter out "Next week" and "2 weeks from now" for scheduled tasks)
  const weekOptions = useMemo(() => generateWeekOptions().filter(option => option.weekOffset !== 1 && option.weekOffset !== 2), []);
  
  // Debounce timer ref for text inputs
  const debounceTimers = useRef({});
  
  // Debounced update function for text inputs - only debounces the webhook call
  const debouncedUpdateScheduledTask = useCallback((taskId, columnKey, value) => {
    // Clear existing timer for this field
    const timerKey = `${taskId}-${columnKey}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    
    // Debounce the webhook PATCH request
    debounceTimers.current[timerKey] = setTimeout(() => {
      updateScheduledTask(taskId, { [columnKey]: value });
      delete debounceTimers.current[timerKey];
    }, 1000);
  }, [updateScheduledTask]);

  const handleCellEdit = (taskId, columnKey, value, columnType) => {
    // If admin/superadmin setting Copy Approval or Ad Approval to "Left feedback", open feedback modal
    if (isAdminUser && (columnKey === 'copyApproval' || columnKey === 'adApproval') && value === 'Left feedback') {
      const task = scheduledTasks.find(t => t.id === taskId);
      const feedbackKey = columnKey === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
      setFeedbackModal({
        taskId,
        type: columnKey,
        currentFeedback: task?.[feedbackKey] || ''
      });
    }
    
    // For text, url, and array fields: debounce the entire update (state + webhook)
    if (columnType === 'text' || columnType === 'url' || columnType === 'array') {
      debouncedUpdateScheduledTask(taskId, columnKey, value);
    } else {
      // Immediate update for other field types (dropdowns, checkboxes, etc.)
      updateScheduledTask(taskId, { [columnKey]: value });
    }
  };

  const handleSaveFeedback = (feedback) => {
    if (feedbackModal) {
      let feedbackKey;
      
      // Handle array item feedback
      if (feedbackModal.columnKey && feedbackModal.itemIndex !== undefined) {
        feedbackKey = `${feedbackModal.columnKey}Feedback`;
        const task = scheduledTasks.find(t => t.id === feedbackModal.taskId);
        const feedbackArray = task?.[feedbackKey] || [];
        const newFeedbackArray = [...feedbackArray];
        newFeedbackArray[feedbackModal.itemIndex] = feedback;
        updateScheduledTask(feedbackModal.taskId, { [feedbackKey]: newFeedbackArray });
      } else {
        // Handle approval column feedback
        feedbackKey = feedbackModal.type === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
        updateScheduledTask(feedbackModal.taskId, { [feedbackKey]: feedback });
      }
      
      setFeedbackModal(null);
    }
  };

  const handleShowFeedback = (task, type) => {
    const feedbackKey = type === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
    setFeedbackModal({
      taskId: task.id,
      type,
      currentFeedback: task[feedbackKey] || '',
      readOnly: true
    });
  };

  // Click outside handler to close filters dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  const handleAddTask = () => {
    const taskToAdd = {
      ...newTask,
      status: newTask.status || 'approved',
      priority: newTask.priority || 'normal',
      createdAt: new Date().toISOString(),
      week: newTask.week || getCurrentWeekDateRange() // Default to current week date range
    };
    addScheduledTask(taskToAdd);
    setNewTask({});
    setShowAddRow(false);
  };

  const handleNewTaskFieldChange = (columnKey, value) => {
    setNewTask(prev => ({
      ...prev,
      [columnKey]: value
    }));
  };

  const handleAddColumn = () => {
    if (newColumn.name.trim()) {
      const options = newColumn.type === 'dropdown' 
        ? newColumn.dropdownOptions.filter(Boolean)
        : null;
      
      addColumn({
        id: `custom_${Date.now()}`,
        name: newColumn.name,
        type: newColumn.type,
        options,
      });
      
      setNewColumn({ name: '', type: 'text', dropdownOptions: [] });
    }
  };

  // Task duplication functions
  const handleDuplicateTask = (task) => {
    const duplicatedTask = {
      ...task,
      id: undefined, // Will be assigned by addScheduledTask
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      week: task.week || getCurrentWeekDateRange() // Keep same week or default to current
    };
    addScheduledTask(duplicatedTask);
  };

  const handleDuplicateSelectedTasks = () => {
    const tasksToDuplicate = scheduledTasks.filter(task => selectedTasks.has(task.id));
    const duplicatedTasksData = tasksToDuplicate.map(task => ({
      ...task,
      id: undefined, // Will be assigned by addScheduledTasks
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      week: task.week || getCurrentWeekDateRange() // Keep same week or default to current
    }));
    addScheduledTasks(duplicatedTasksData);
    setSelectedTasks(new Set());
  };

  const handleDeleteSelectedTasks = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''}?`)) {
      const taskIdsArray = Array.from(selectedTasks);
      deleteScheduledTasks(taskIdsArray);
      setSelectedTasks(new Set());
    }
  };

  const handleEditColumn = (column) => {
    setEditingColumn({
      ...column,
      options: column.options ? column.options.join(', ') : '',
    });
  };

  const handleSaveColumn = () => {
    if (editingColumn) {
      const options = editingColumn.type === 'dropdown'
        ? editingColumn.options.split(',').map(o => o.trim()).filter(Boolean)
        : editingColumn.options;
      
      updateColumn(editingColumn.id, {
        name: editingColumn.name,
        type: editingColumn.type,
        options,
      });
      
      setEditingColumn(null);
    }
  };

  // Helper function to get dropdown option colors
  const getDropdownOptionColors = (columnKey, optionValue) => {
    if (columnKey === 'status') {
      const statusColors = {
        not_started: 'bg-gray-100 text-gray-700 border-gray-200',
        in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
        submitted: 'bg-purple-100 text-purple-700 border-purple-200',
        needs_revision: 'bg-amber-100 text-amber-700 border-amber-200',
        approved: 'bg-green-100 text-green-700 border-green-200',
      };
      return statusColors[optionValue] || 'bg-gray-100 text-gray-700 border-gray-200';
    }
    if (columnKey === 'priority') {
      const priorityColors = {
        urgent: 'bg-red-100 text-red-700 border-red-200',
        high: 'bg-orange-100 text-orange-700 border-orange-200',
        normal: 'bg-blue-100 text-blue-700 border-blue-200',
        low: 'bg-gray-100 text-gray-700 border-gray-200',
      };
      return priorityColors[optionValue] || 'bg-blue-100 text-blue-700 border-blue-200';
    }
    // Default colors for custom dropdowns
    const defaultColors = ['bg-indigo-100 text-indigo-700 border-indigo-200', 'bg-emerald-100 text-emerald-700 border-emerald-200', 'bg-pink-100 text-pink-700 border-pink-200', 'bg-cyan-100 text-cyan-700 border-cyan-200', 'bg-violet-100 text-violet-700 border-violet-200'];
    const hash = optionValue.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return defaultColors[Math.abs(hash) % defaultColors.length];
  };

  // Helper function to get current value colors for dropdowns
  const getCurrentValueColors = (columnKey, value) => {
    if (!value) return 'bg-gray-50 text-gray-500 border-gray-200';
    return getDropdownOptionColors(columnKey, value);
  };

  // Task selection handlers
  const handleSelectTask = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)));
    }
  };

  // Filter tasks based on current view
  const filteredTasks = useMemo(() => {
    let filtered = scheduledTasks;

    // Apply campaign filter
    if (selectedCampaign) {
      filtered = filtered.filter(task => task.campaignId === parseInt(selectedCampaign));
    }

    // Apply user filter
    if (selectedUser) {
      filtered = filtered.filter(task => task.assignedTo === parseInt(selectedUser));
    }

    return filtered;
  }, [scheduledTasks, selectedCampaign, selectedUser]);

  const renderCell = (task, column, isEditing) => {
    const value = task[column.key];
    const isNewTask = task.id === 'new';

    const handleChange = isNewTask 
      ? (newValue) => handleNewTaskFieldChange(column.key, newValue)
      : (newValue) => handleCellEdit(task.id, column.key, newValue, column.type);

    switch (column.type) {
      case 'array':
        // Handle array of URLs with approval checkboxes and feedback
        const arrayValue = Array.isArray(value) ? value : [];
        const approvalKey = `${column.key}Approval`;
        const feedbackKey = `${column.key}Feedback`;
        const approvalArray = task?.[approvalKey] || [];
        const feedbackArray = task?.[feedbackKey] || [];
        
        const handleApprovalChange = (index, checked) => {
          const newApprovals = [...approvalArray];
          newApprovals[index] = checked;
          updateScheduledTask(task.id, { [approvalKey]: newApprovals });
        };
        
        const handleArrayFeedback = (index) => {
          setFeedbackModal({
            taskId: task.id,
            type: `${column.key}_${index}`,
            columnKey: column.key,
            itemIndex: index,
            currentFeedback: feedbackArray[index] || ''
          });
        };
        
        return (
          <div className="space-y-1">
            {arrayValue.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  key={`${task.id}-${column.key}-${index}`}
                  type="text"
                  defaultValue={item || ''}
                  onChange={(e) => {
                    const newArray = [...arrayValue];
                    newArray[index] = e.target.value;
                    handleChange(newArray);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-white text-black border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`${column.name} ${index + 1}`}
                />
                {!isNewTask && (
                  <>
                    <input
                      type="checkbox"
                      checked={approvalArray[index] || false}
                      onChange={(e) => handleApprovalChange(index, e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-2 focus:ring-green-500 cursor-pointer"
                      title="Manager approval"
                    />
                    <div className="relative">
                      <div 
                        className={`peer w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-200 ${
                          isAdminUser ? 'cursor-pointer hover:bg-red-50 hover:border-red-300' : feedbackArray[index] ? 'cursor-help' : 'opacity-30 cursor-not-allowed'
                        }`}
                        onClick={() => isAdminUser && handleArrayFeedback(index)}
                      >
                        <AlertCircle className={`w-3.5 h-3.5 ${feedbackArray[index] ? 'text-red-600' : 'text-gray-400'}`} />
                      </div>
                      {feedbackArray[index] && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden peer-hover:block z-50 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs whitespace-pre-wrap border border-gray-700">
                            <div className="font-semibold mb-1 text-red-400">Feedback:</div>
                            {feedbackArray[index]}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    const newArray = arrayValue.filter((_, i) => i !== index);
                    handleChange(newArray);
                  }}
                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => handleChange([...arrayValue, ''])}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>+ Add {column.name}</span>
            </button>
          </div>
        );
      
      case 'text':
      case 'url':
        return (
          <input
            key={`${task.id}-${column.key}`}
            type="text"
            defaultValue={value || (column.key === 'quantity' ? 'x1' : '')}
            onChange={(e) => handleChange(e.target.value)}
            className={`${column.key === 'quantity' ? 'max-w-[60px]' : 'w-full'} px-3 py-2 text-sm bg-white text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300`}
            placeholder={column.key === 'quantity' ? 'x1' : column.name}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm bg-white text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300"
            placeholder={column.name}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleChange(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-2 focus:ring-primary-500 cursor-pointer transition-all"
            />
          </div>
        );
      
      case 'dropdown':
        const isApprovalColumn = column.key === 'copyApproval' || column.key === 'adApproval';
        const hasFeedback = isApprovalColumn && value === 'Left feedback' && !isNewTask;
        const dropdownFeedbackKey = column.key === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
        const feedbackText = task?.[dropdownFeedbackKey] || 'No feedback provided';
        
        return (
          <div className="flex items-center space-x-2">
            <select
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-opacity-80 cursor-pointer border font-medium shadow-sm ${
                getCurrentValueColors(column.key, value)
              }`}
            >
              <option value="" className="bg-white text-gray-500">Select...</option>
              {column.options?.map((option) => (
                <option key={option} value={option} className="bg-white text-gray-800">{option}</option>
              ))}
            </select>
            {hasFeedback && (
              <div className="relative">
                <div 
                  className={`peer w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200 ${
                    isAdminUser ? 'cursor-pointer hover:bg-red-50 hover:border-red-300' : 'cursor-help'
                  }`}
                  onClick={() => isAdminUser && handleShowFeedback(task, column.key)}
                >
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden peer-hover:block z-50 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs whitespace-pre-wrap border border-gray-700">
                    <div className="font-semibold mb-1 text-red-400">Feedback:</div>
                    {feedbackText}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300 cursor-pointer"
          />
        );
      
      case 'user':
        // Filter users based on column key
        let filteredUsers;
        if (column.key === 'scriptAssigned') {
          filteredUsers = users.filter(u => u.department?.trim().toUpperCase() === 'MEDIA BUYING');
        } else if (column.key === 'assignedTo') {
          // Filter based on media type
          const mediaType = task.mediaType?.toUpperCase();
          if (mediaType === 'IMAGE') {
            filteredUsers = users.filter(u => u.department?.trim().toUpperCase() === 'GRAPHIC DESIGN');
          } else if (mediaType === 'VIDEO') {
            filteredUsers = users.filter(u => u.department?.trim().toUpperCase() === 'VIDEO EDITING');
          } else {
            // If no media type selected, show both video editors and graphic designers
            filteredUsers = users.filter(u => {
              const dept = u.department?.trim().toUpperCase();
              return dept === 'VIDEO EDITING' || dept === 'GRAPHIC DESIGN';
            });
          }
        } else {
          filteredUsers = users;
        }
        
        // Debug logging
        if (column.key === 'scriptAssigned') {
          console.log('Script Assigned Column Debug:');
          console.log('Column key:', column.key);
          console.log('All users:', users);
          console.log('Users with departments:', users.map(u => ({ name: u.name, department: u.department })));
          console.log('Filtered users:', filteredUsers);
        }
        
        return (
          <div className="relative">
            <select
              value={value || ''}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-blue-300 cursor-pointer font-medium text-blue-800 shadow-sm"
            >
              <option value="" className="bg-white text-gray-500">Select user...</option>
              {filteredUsers.map((user) => (
                <option 
                  key={user.id} 
                  value={user.id}
                  className="bg-white text-gray-800 hover:bg-blue-50 py-2 px-3 font-medium"
                >
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        );
      
      case 'campaign':
        return (
          <div className="relative">
            <select
              value={value || ''}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-emerald-300 cursor-pointer font-medium text-emerald-800 shadow-sm"
            >
              <option value="" className="bg-white text-gray-500">Select campaign...</option>
              {campaigns.map((campaign) => (
                <option 
                  key={campaign.id} 
                  value={campaign.id}
                  className="bg-white text-gray-800 hover:bg-emerald-50 py-2 px-3 font-medium"
                >
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        );
      
      case 'weekdropdown':
        const weekValue = value || getCurrentWeekDateRange(); // Default to this week
        return (
          <select
            value={weekValue}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-purple-300 cursor-pointer font-medium text-purple-800 shadow-sm"
          >
            {weekOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-white text-gray-800">
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return <span className="text-sm text-gray-700">{value || '-'}</span>;
    }
  };

  const formatCellValue = (value, column) => {
    // Special handling for quantity field - default to "x1" if no value
    if (!value && column.key === 'quantity') {
      return <span className="text-sm text-gray-700">x1</span>;
    }
    
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (column.type) {
      case 'array':
        // Handle array of URLs
        const arrayValue = Array.isArray(value) ? value.filter(item => item) : [];
        if (arrayValue.length === 0) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {arrayValue.map((item, index) => (
              <a
                key={index}
                href={item}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-black hover:bg-gray-200 rounded-md font-medium hover:underline"
                title={item}
              >
                Link {index + 1} →
              </a>
            ))}
          </div>
        );
      
      case 'user':
        const user = users.find(u => u.id === value);
        return user ? (
          <span className="text-sm font-medium text-gray-900">{user.name}</span>
        ) : <span className="text-gray-400">-</span>;
      
      case 'campaign':
        const campaign = campaigns.find(c => c.id === value);
        return campaign ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
            {campaign.name}
          </span>
        ) : <span className="text-gray-400">-</span>;
      
      case 'date':
        return <span className="text-sm text-gray-900">{format(new Date(value), 'MMM d, yyyy')}</span>;
      
      case 'checkbox':
        return value ? (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-600">✓</span>
        ) : (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-400">✗</span>
        );
      
      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm hover:underline">
            Link →
          </a>
        );
      
      case 'dropdown':
        if (column.key === 'status') {
          const statusColors = {
            not_started: 'bg-gray-100 text-gray-700',
            in_progress: 'bg-blue-100 text-blue-700',
            submitted: 'bg-purple-100 text-purple-700',
            needs_revision: 'bg-amber-100 text-amber-700',
            approved: 'bg-green-100 text-green-700',
          };
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[value] || 'bg-gray-100 text-gray-700'}`}>
              {value?.replace(/_/g, ' ').toUpperCase() || '-'}
            </span>
          );
        }
        if (column.key === 'priority') {
          const priorityColors = {
            urgent: 'bg-red-100 text-red-700 border-red-200',
            high: 'bg-orange-100 text-orange-700 border-orange-200',
            normal: 'bg-blue-100 text-blue-700 border-blue-200',
            low: 'bg-gray-100 text-gray-700 border-gray-200',
          };
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${priorityColors[value] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              {value?.toUpperCase() || '-'}
            </span>
          );
        }
        return <span className="text-sm text-gray-700 capitalize">{value?.replace(/_/g, ' ') || '-'}</span>;
      
      default:
        return <span className="text-sm text-gray-700">{value || '-'}</span>;
    }
  };

  // Show loading state while data is being fetched
  if (scheduledTasksLoading || campaignsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading scheduled tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="p-8 flex-shrink-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title">
            Scheduled Tasks
          </h1>
          <p className="text-gray-600 mt-2">Manage scheduled future tasks in a powerful spreadsheet view</p>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Total Tasks</div>
              <div className="text-2xl font-bold text-gray-900">{filteredTasks.length}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">In Progress</div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredTasks.filter(t => t.status === 'in_progress').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-600">
                {filteredTasks.filter(t => t.status === 'approved').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Needs Review</div>
              <div className="text-2xl font-bold text-amber-600">
                {filteredTasks.filter(t => t.status === 'submitted').length}
              </div>
            </div>
          </div>
        </div>

      {/* Column Manager Modal */}
      {showColumnManager && isAdminUser && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-red-600 rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-red-600">Manage Columns</h3>
              <button onClick={() => setShowColumnManager(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add New Column */}
            <div className="mb-6 p-6 bg-gray-900 border border-red-600/30 rounded-lg">
              <h4 className="font-semibold text-white mb-4 text-lg">Add New Column</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Column Name</label>
                  <input
                    type="text"
                    value={newColumn.name}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    placeholder="e.g., Status, Priority, Notes"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Column Type</label>
                  <select
                    value={newColumn.type}
                    onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value, dropdownOptions: e.target.value === 'dropdown' ? [''] : [] })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="url">URL</option>
                    <option value="array">Array (Multiple URLs)</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="user">User</option>
                    <option value="campaign">Campaign</option>
                  </select>
                </div>
                {newColumn.type === 'dropdown' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Dropdown Options</label>
                    <div className="space-y-2">
                      {newColumn.dropdownOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newColumn.dropdownOptions];
                              newOptions[index] = e.target.value;
                              setNewColumn({ ...newColumn, dropdownOptions: newOptions });
                            }}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                          />
                          <button
                            onClick={() => {
                              const newOptions = newColumn.dropdownOptions.filter((_, i) => i !== index);
                              setNewColumn({ ...newColumn, dropdownOptions: newOptions });
                            }}
                            className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Remove option"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setNewColumn({ ...newColumn, dropdownOptions: [...newColumn.dropdownOptions, ''] })}
                        className="w-full px-4 py-2 bg-gray-800 border border-red-600/30 hover:border-red-600/50 text-red-500 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  </div>
                )}
                <button onClick={handleAddColumn} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/50">
                  Add Column
                </button>
              </div>
            </div>

            {/* Existing Columns */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-lg">Existing Columns</h4>
              <div className="space-y-3">
                {columns.map((column) => (
                  <div key={column.id} className="p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                    {editingColumn?.id === column.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Column Name</label>
                          <input
                            type="text"
                            value={editingColumn.name}
                            onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                            placeholder="Column name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Column Type</label>
                          <select
                            value={editingColumn.type}
                            onChange={(e) => setEditingColumn({ ...editingColumn, type: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="url">URL</option>
                            <option value="date">Date</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="user">User</option>
                            <option value="campaign">Campaign</option>
                          </select>
                        </div>
                        {editingColumn.type === 'dropdown' && (
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Dropdown Options</label>
                            <div className="space-y-2">
                              {(Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || []).map((option, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const optionsArray = Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || [];
                                      const newOptions = [...optionsArray];
                                      newOptions[index] = e.target.value;
                                      setEditingColumn({ ...editingColumn, options: newOptions });
                                    }}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 px-4 py-2 bg-gray-800 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                                  />
                                  <button
                                    onClick={() => {
                                      const optionsArray = Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || [];
                                      const newOptions = optionsArray.filter((_, i) => i !== index);
                                      setEditingColumn({ ...editingColumn, options: newOptions });
                                    }}
                                    className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Remove option"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const optionsArray = Array.isArray(editingColumn.options) ? editingColumn.options : editingColumn.options?.split(',') || [];
                                  setEditingColumn({ ...editingColumn, options: [...optionsArray, ''] });
                                }}
                                className="w-full px-4 py-2 bg-gray-800 border border-red-600/30 hover:border-red-600/50 text-red-500 rounded-lg transition-colors flex items-center justify-center space-x-2"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add Option</span>
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveColumn}
                            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingColumn(null)}
                            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{column.name}</p>
                          <p className="text-sm text-gray-400 capitalize mt-1">{column.type}</p>
                          {column.type === 'dropdown' && column.options && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {column.options.map((opt, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-red-900/30 text-red-400 border border-red-600/30 rounded">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditColumn(column)}
                            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                            title="Edit column"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteColumn(column.id)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                              column.canDelete 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                            title={column.canDelete ? "Delete column" : "Built-in column cannot be deleted"}
                            disabled={!column.canDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - Buttons above table */}
      <div className="mb-4 flex items-center justify-between">
        {/* Left side - View Toggles */}
        <div className="flex items-center space-x-3">
          {/* Display Type Toggle - List / Cards */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setDisplayType('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                displayType === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setDisplayType('cards')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                displayType === 'cards' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Cards</span>
            </button>
          </div>

          {/* Filter Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm ${
                (selectedCampaign || selectedUser) ? 'border-primary-500 bg-primary-50' : ''
              }`}
              title="Filters"
            >
              <Filter className="w-4 h-4 text-gray-700" />
            </button>
            
            {/* Filter Dropdown */}
            {showFilters && (
              <div ref={filtersRef} className="absolute top-full left-0 mt-2 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl shadow-2xl border-2 border-red-500/30 p-5 z-40 min-w-[320px] backdrop-blur-sm shadow-red-500/20">
                <div className="space-y-4">
                  {/* Campaign Filter */}
                  <div>
                    <label className="block text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">Campaign</label>
                    <div className="relative">
                      <select
                        value={selectedCampaign}
                        onChange={(e) => setSelectedCampaign(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border-2 border-red-500/40 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-black/50 text-white font-medium transition-all hover:border-red-500/60 appearance-none cursor-pointer shadow-inner backdrop-blur-sm"
                      >
                        <option value="" className="bg-gray-900 text-gray-300">All Campaigns</option>
                        {campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id} className="bg-gray-900 text-white">{campaign.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-red-400 rotate-90" />
                      </div>
                    </div>
                  </div>
                  
                  {/* User Filter */}
                  <div>
                    <label className="block text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">User</label>
                    <div className="relative">
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border-2 border-red-500/40 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-black/50 text-white font-medium transition-all hover:border-red-500/60 appearance-none cursor-pointer shadow-inner backdrop-blur-sm"
                      >
                        <option value="" className="bg-gray-900 text-gray-300">All Users</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id} className="bg-gray-900 text-white">{user.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-red-400 rotate-90" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Clear Filters Button */}
                  {(selectedCampaign || selectedUser) && (
                    <button
                      onClick={() => {
                        setSelectedCampaign('');
                        setSelectedUser('');
                      }}
                      className="w-full px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-2 border-red-500/50 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 uppercase tracking-wide"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center space-x-3">
          {selectedTasks.size > 0 && (
            <>
              <button
                onClick={handleDuplicateSelectedTasks}
                className="px-4 py-2 bg-white border border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
              >
                <Copy className="w-4 h-4" />
                <span>Duplicate ({selectedTasks.size})</span>
              </button>
              <button
                onClick={handleDeleteSelectedTasks}
                className="px-4 py-2 bg-white border border-red-200 hover:border-red-300 text-red-700 hover:text-red-800 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedTasks.size})</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddRow(!showAddRow)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
          {false && isAdminUser && (
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Columns</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards View */}
      {displayType === 'cards' ? (
        <div className="space-y-8">
          {/* MEDIA BUYING - Grouped by Users, then Campaigns */}
          {users.filter(u => u.department === 'MEDIA BUYING').length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">MEDIA BUYING</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.filter(u => u.department === 'MEDIA BUYING').map(user => {
                  // Get all tasks for this user - convert scriptAssigned to number for comparison
                  let userTasks = filteredTasks.filter(task => parseInt(task.scriptAssigned) === user.id);
                  
                  // Apply card-level campaign filter
                  const cardCampaignFilter = cardCampaignFilters[user.id] || '';
                  if (cardCampaignFilter) {
                    userTasks = userTasks.filter(task => String(task.campaignId) === String(cardCampaignFilter));
                  }
                  
                  // Group tasks by campaign
                  const tasksByCampaign = userTasks.reduce((acc, task) => {
                    const campaignId = task.campaignId;
                    if (!acc[campaignId]) {
                      acc[campaignId] = [];
                    }
                    acc[campaignId].push(task);
                    return acc;
                  }, {});

                  return (
                    <div key={user.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                      {/* User Header */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3">
                            {user.name.charAt(0)}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 text-center">{user.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{userTasks.length} task{userTasks.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {/* Campaign Filter */}
                      <div className="px-4 pt-4 pb-3 bg-gray-50 border-b border-gray-200">
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Filter by Campaign</label>
                        <select
                          value={cardCampaignFilter}
                          onChange={(e) => setCardCampaignFilters({ ...cardCampaignFilters, [user.id]: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        >
                          <option value="">All Campaigns</option>
                          {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Campaigns List */}
                      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                        {Object.keys(tasksByCampaign).length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-gray-400 italic">No tasks</p>
                          </div>
                        ) : (
                          Object.entries(tasksByCampaign).map(([campaignId, tasks]) => {
                            const campaign = campaigns.find(c => c.id === parseInt(campaignId));
                            
                            return (
                              <div key={campaignId} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <h4 className="font-semibold text-sm text-gray-800 mb-2">{campaign?.name || 'Unknown Campaign'}</h4>
                                
                                <div className="space-y-2">
                                  {scheduledTasks.map(task => {
                                    const getPriorityColor = (priority) => {
                                      switch(priority?.toLowerCase()) {
                                        case 'critical': return 'bg-red-100 text-red-700';
                                        case 'high': return 'bg-orange-100 text-orange-700';
                                        case 'normal': return 'bg-blue-100 text-blue-700';
                                        case 'low': return 'bg-gray-100 text-gray-700';
                                        case 'paused': return 'bg-purple-100 text-purple-700';
                                        default: return 'bg-gray-100 text-gray-700';
                                      }
                                    };

                                    return (
                                      <div key={task.id} className="text-xs bg-white p-3 rounded border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                          <select
                                            value={task.priority || 'Normal'}
                                            onChange={(e) => updateScheduledTask(task.id, { priority: e.target.value })}
                                            className={`px-2 py-1 rounded font-medium text-xs border-0 cursor-pointer ${getPriorityColor(task.priority)}`}
                                          >
                                            <option value="Critical">Critical</option>
                                            <option value="High">High</option>
                                            <option value="Normal">Normal</option>
                                            <option value="Low">Low</option>
                                            <option value="Paused">Paused</option>
                                          </select>
                                          <select
                                            value={task.mediaType || ''}
                                            onChange={(e) => updateScheduledTask(task.id, { mediaType: e.target.value })}
                                            className="px-2 py-1 text-xs bg-white text-gray-900 border border-gray-200 rounded cursor-pointer"
                                          >
                                            <option value="">Select...</option>
                                            <option value="IMAGE">IMAGE</option>
                                            <option value="VIDEO">VIDEO</option>
                                          </select>
                                        </div>
                                        
                                        <div className="space-y-2 mt-2">
                                          {/* Copy Written */}
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-600 w-24">Copy Written:</span>
                                            <input
                                              type="checkbox"
                                              checked={task.copyWritten || false}
                                              onChange={(e) => updateScheduledTask(task.id, { copyWritten: e.target.checked })}
                                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className={task.copyWritten ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                              {task.copyWritten ? 'Yes' : 'No'}
                                            </span>
                                          </div>
                                          
                                          {/* Copy Link */}
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-600 w-24">Copy Link:</span>
                                            <input
                                              type="text"
                                              value={task.copyLink || ''}
                                              onChange={(e) => updateScheduledTask(task.id, { copyLink: e.target.value })}
                                              className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                              placeholder="Enter link..."
                                            />
                                            {task.copyLink && (
                                              <a href={task.copyLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            )}
                                          </div>
                                          
                                          {/* Copy Approval */}
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-600 w-24">Approval:</span>
                                            <select
                                              value={task.copyApproval || ''}
                                              onChange={(e) => updateScheduledTask(task.id, { copyApproval: e.target.value })}
                                              className={`flex-1 px-2 py-1 text-xs border rounded cursor-pointer ${
                                                task.copyApproval === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                                task.copyApproval === 'Needs Review' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                task.copyApproval === 'Left feedback' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                'bg-white text-gray-700 border-gray-200'
                                              }`}
                                            >
                                              <option value="">Select...</option>
                                              <option value="Approved">Approved</option>
                                              <option value="Needs Review">Needs Review</option>
                                              <option value="Left feedback">Left feedback</option>
                                              <option value="Unchecked">Unchecked</option>
                                              <option value="Revisit Later">Revisit Later</option>
                                            </select>
                                          </div>
                                          
                                          {/* Show More Button */}
                                          <button
                                            onClick={() => setExpandedCards(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                                          >
                                            {expandedCards[task.id] ? (
                                              <>
                                                <ChevronLeft className="w-3 h-3 rotate-90" />
                                                Show Less
                                              </>
                                            ) : (
                                              <>
                                                <ChevronRight className="w-3 h-3 rotate-90" />
                                                Show More
                                              </>
                                            )}
                                          </button>
                                          
                                          {/* Expandable Additional Info */}
                                          {expandedCards[task.id] && (
                                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                              {/* Assigned To */}
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-600 w-24">Assigned To:</span>
                                                <select
                                                  value={task.assignedTo || ''}
                                                  onChange={(e) => updateScheduledTask(task.id, { assignedTo: parseInt(e.target.value) })}
                                                  className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                                >
                                                  <option value="">Select user...</option>
                                                  {users.filter(u => {
                                                    const dept = u.department?.trim().toUpperCase();
                                                    return dept === 'VIDEO EDITING' || dept === 'GRAPHIC DESIGN';
                                                  }).map((user) => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              
                                              {/* Campaign Name */}
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-600 w-24">Campaign:</span>
                                                <span className="text-gray-800">{campaign?.name || 'Unknown'}</span>
                                              </div>
                                              
                                              {/* Viewer Link */}
                                              <div className="space-y-1">
                                                <span className="font-semibold text-gray-600 block">Viewer Links:</span>
                                                {task.viewerLink && task.viewerLink.length > 0 ? (
                                                  task.viewerLink.map((link, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                      <input
                                                        type="text"
                                                        value={link || ''}
                                                        onChange={(e) => {
                                                          const newLinks = [...(task.viewerLink || [])];
                                                          newLinks[idx] = e.target.value;
                                                          updateScheduledTask(task.id, { viewerLink: newLinks });
                                                        }}
                                                        className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                                        placeholder={`Viewer link ${idx + 1}`}
                                                      />
                                                      {link && (
                                                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                          <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                      )}
                                                      <button
                                                        onClick={() => {
                                                          const newLinks = task.viewerLink.filter((_, i) => i !== idx);
                                                          updateScheduledTask(task.id, { viewerLink: newLinks });
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <p className="text-xs text-gray-400 italic">No viewer links</p>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    const newLinks = [...(task.viewerLink || []), ''];
                                                    updateScheduledTask(task.id, { viewerLink: newLinks });
                                                  }}
                                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                  + Add Viewer Link
                                                </button>
                                              </div>
                                              
                                              {/* Cali Variation */}
                                              <div className="space-y-1">
                                                <span className="font-semibold text-gray-600 block">Cali Variation:</span>
                                                {task.caliVariation && task.caliVariation.length > 0 ? (
                                                  task.caliVariation.map((variation, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                      <input
                                                        type="text"
                                                        value={variation || ''}
                                                        onChange={(e) => {
                                                          const newVariations = [...(task.caliVariation || [])];
                                                          newVariations[idx] = e.target.value;
                                                          updateScheduledTask(task.id, { caliVariation: newVariations });
                                                        }}
                                                        className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                                        placeholder={`Variation ${idx + 1}`}
                                                      />
                                                      <button
                                                        onClick={() => {
                                                          const newVariations = task.caliVariation.filter((_, i) => i !== idx);
                                                          updateScheduledTask(task.id, { caliVariation: newVariations });
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <p className="text-xs text-gray-400 italic">No variations</p>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    const newVariations = [...(task.caliVariation || []), ''];
                                                    updateScheduledTask(task.id, { caliVariation: newVariations });
                                                  }}
                                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                  + Add Variation
                                                </button>
                                              </div>
                                              
                                              {/* Slack Permalink */}
                                              <div className="space-y-1">
                                                <span className="font-semibold text-gray-600 block">Slack Links:</span>
                                                {task.slackPermalink && task.slackPermalink.length > 0 ? (
                                                  task.slackPermalink.map((link, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                      <input
                                                        type="text"
                                                        value={link || ''}
                                                        onChange={(e) => {
                                                          const newLinks = [...(task.slackPermalink || [])];
                                                          newLinks[idx] = e.target.value;
                                                          updateScheduledTask(task.id, { slackPermalink: newLinks });
                                                        }}
                                                        className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                                        placeholder={`Slack link ${idx + 1}`}
                                                      />
                                                      {link && (
                                                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                          <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                      )}
                                                      <button
                                                        onClick={() => {
                                                          const newLinks = task.slackPermalink.filter((_, i) => i !== idx);
                                                          updateScheduledTask(task.id, { slackPermalink: newLinks });
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <p className="text-xs text-gray-400 italic">No slack links</p>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    const newLinks = [...(task.slackPermalink || []), ''];
                                                    updateScheduledTask(task.id, { slackPermalink: newLinks });
                                                  }}
                                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                  + Add Slack Link
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIDEO EDITING & GRAPHIC DESIGN - Grouped by Users with Campaigns */}
          {['VIDEO EDITING', 'GRAPHIC DESIGN'].map(department => {
            const departmentUsers = users.filter(u => u.department === department);
            
            if (departmentUsers.length === 0) return null;

            return (
              <div key={department} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{department}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departmentUsers.map(user => {
                    // Get all tasks for this user based on department
                    let userTasks = filteredTasks.filter(task => {
                      if (department === 'VIDEO EDITING') {
                        const mediaType = task.mediaType || task.type;
                        return parseInt(task.assignedTo) === user.id && (mediaType === 'VIDEO' || mediaType === 'video');
                      } else if (department === 'GRAPHIC DESIGN') {
                        const mediaType = task.mediaType || task.type;
                        return parseInt(task.assignedTo) === user.id && (mediaType === 'IMAGE' || mediaType === 'image');
                      }
                      return false;
                    });

                    // Apply card-level campaign filter
                    const cardCampaignFilter = cardCampaignFilters[user.id] || '';
                    if (cardCampaignFilter) {
                      userTasks = userTasks.filter(task => String(task.campaignId) === String(cardCampaignFilter));
                    }

                    // Group tasks by campaign
                    const tasksByCampaign = userTasks.reduce((acc, task) => {
                      const campaignId = task.campaignId || 'uncategorized';
                      if (!acc[campaignId]) {
                        acc[campaignId] = [];
                      }
                      acc[campaignId].push(task);
                      return acc;
                    }, {});

                    return (
                      <div key={user.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                        {/* User Header */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 border-b border-purple-700">
                          <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3 border-2 border-white/30">
                              {user.name.charAt(0)}
                            </div>
                            <h3 className="text-lg font-bold text-white text-center">{user.name}</h3>
                            <p className="text-xs text-purple-100 mt-1">{userTasks.length} task{userTasks.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>

                        {/* Campaign Filter */}
                        <div className="px-4 pt-4 pb-3 bg-gray-50 border-b border-gray-200">
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Filter by Campaign</label>
                          <select
                            value={cardCampaignFilter}
                            onChange={(e) => setCardCampaignFilters({ ...cardCampaignFilters, [user.id]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                          >
                            <option value="">All Campaigns</option>
                            {campaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Campaigns List */}
                        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                          {Object.keys(tasksByCampaign).length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-sm text-gray-400 italic">No tasks assigned</p>
                            </div>
                          ) : (
                            Object.entries(tasksByCampaign).map(([campaignId, tasks]) => {
                              const campaign = campaigns.find(c => c.id === parseInt(campaignId));
                              
                              return (
                                <div key={campaignId} className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 overflow-hidden">
                                  {/* Campaign Header */}
                                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-2 border-b border-purple-200">
                                    <h4 className="text-sm font-bold text-purple-900">
                                      {campaign?.name || 'Uncategorized'}
                                    </h4>
                                    <p className="text-xs text-purple-600 mt-0.5">
                                      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  
                                  {/* Tasks for this campaign */}
                                  <div className="p-3 space-y-3">
                                    {scheduledTasks.map(task => {
                                      const getPriorityColor = (priority) => {
                                        switch(priority?.toLowerCase()) {
                                          case 'critical': return 'bg-red-100 text-red-700';
                                          case 'high': return 'bg-orange-100 text-orange-700';
                                          case 'normal': return 'bg-blue-100 text-blue-700';
                                          case 'low': return 'bg-gray-100 text-gray-700';
                                          case 'paused': return 'bg-purple-100 text-purple-700';
                                          default: return 'bg-gray-100 text-gray-700';
                                        }
                                      };

                                      const assignedUser = users.find(u => u.id === parseInt(task.assignedTo));

                                      return (
                                        <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-2.5 hover:shadow-md transition-shadow">
                                          <div className="space-y-1.5">
                                            {/* Assigned To */}
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-gray-700 text-xs w-24">Assigned To:</span>
                                              <select
                                                value={task.assignedTo || ''}
                                                onChange={(e) => updateScheduledTask(task.id, { assignedTo: parseInt(e.target.value) })}
                                                className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                              >
                                                <option value="">Select user...</option>
                                                {users.filter(u => {
                                                  const dept = u.department?.trim().toUpperCase();
                                                  return dept === 'VIDEO EDITING' || dept === 'GRAPHIC DESIGN';
                                                }).map((user) => (
                                                  <option key={user.id} value={user.id}>{user.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                            
                                            {/* Campaign Name */}
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-gray-700 text-xs w-24">Campaign:</span>
                                              <span className="text-gray-900 text-xs truncate">{campaign?.name || 'Unknown'}</span>
                                            </div>
                                            
                                            {/* Viewer Links */}
                                            <div className="space-y-1">
                                              <span className="font-semibold text-gray-700 text-xs block">Viewer Links:</span>
                                              {task.viewerLink && task.viewerLink.length > 0 ? (
                                                task.viewerLink.map((link, idx) => (
                                                  <div key={idx} className="flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      value={link || ''}
                                                      onChange={(e) => {
                                                        const newLinks = [...(task.viewerLink || [])];
                                                        newLinks[idx] = e.target.value;
                                                        updateScheduledTask(task.id, { viewerLink: newLinks });
                                                      }}
                                                      className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                      placeholder={`Viewer link ${idx + 1}`}
                                                    />
                                                    {link && (
                                                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                      </a>
                                                    )}
                                                    <button
                                                      onClick={() => {
                                                        const newLinks = task.viewerLink.filter((_, i) => i !== idx);
                                                        updateScheduledTask(task.id, { viewerLink: newLinks });
                                                      }}
                                                      className="text-red-500 hover:text-red-700"
                                                    >
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-xs text-gray-400 italic">No viewer links</p>
                                              )}
                                              <button
                                                onClick={() => {
                                                  const newLinks = [...(task.viewerLink || []), ''];
                                                  updateScheduledTask(task.id, { viewerLink: newLinks });
                                                }}
                                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                              >
                                                + Add Viewer Link
                                              </button>
                                            </div>
                                            
                                            {/* Cali Variation */}
                                            <div className="space-y-1">
                                              <span className="font-semibold text-gray-700 text-xs block">Cali Variation:</span>
                                              {task.caliVariation && task.caliVariation.length > 0 ? (
                                                task.caliVariation.map((variation, idx) => (
                                                  <div key={idx} className="flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      value={variation || ''}
                                                      onChange={(e) => {
                                                        const newVariations = [...(task.caliVariation || [])];
                                                        newVariations[idx] = e.target.value;
                                                        updateScheduledTask(task.id, { caliVariation: newVariations });
                                                      }}
                                                      className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                      placeholder={`Variation ${idx + 1}`}
                                                    />
                                                    <button
                                                      onClick={() => {
                                                        const newVariations = task.caliVariation.filter((_, i) => i !== idx);
                                                        updateScheduledTask(task.id, { caliVariation: newVariations });
                                                      }}
                                                      className="text-red-500 hover:text-red-700"
                                                    >
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-xs text-gray-400 italic">No variations</p>
                                              )}
                                              <button
                                                onClick={() => {
                                                  const newVariations = [...(task.caliVariation || []), ''];
                                                  updateScheduledTask(task.id, { caliVariation: newVariations });
                                                }}
                                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                              >
                                                + Add Variation
                                              </button>
                                            </div>
                                            
                                            {/* Slack Links */}
                                            <div className="space-y-1">
                                              <span className="font-semibold text-gray-700 text-xs block">Slack Links:</span>
                                              {task.slackPermalink && task.slackPermalink.length > 0 ? (
                                                task.slackPermalink.map((link, idx) => (
                                                  <div key={idx} className="flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      value={link || ''}
                                                      onChange={(e) => {
                                                        const newLinks = [...(task.slackPermalink || [])];
                                                        newLinks[idx] = e.target.value;
                                                        updateScheduledTask(task.id, { slackPermalink: newLinks });
                                                      }}
                                                      className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                      placeholder={`Slack link ${idx + 1}`}
                                                    />
                                                    {link && (
                                                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                      </a>
                                                    )}
                                                    <button
                                                      onClick={() => {
                                                        const newLinks = task.slackPermalink.filter((_, i) => i !== idx);
                                                        updateScheduledTask(task.id, { slackPermalink: newLinks });
                                                      }}
                                                      className="text-red-500 hover:text-red-700"
                                                    >
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-xs text-gray-400 italic">No slack links</p>
                                              )}
                                              <button
                                                onClick={() => {
                                                  const newLinks = [...(task.slackPermalink || []), ''];
                                                  updateScheduledTask(task.id, { slackPermalink: newLinks });
                                                }}
                                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                              >
                                                + Add Slack Link
                                              </button>
                                            </div>
                                            
                                            {/* Show More Button */}
                                            <button
                                              onClick={() => setExpandedCards(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                              className="mt-1 text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                                            >
                                              {expandedCards[task.id] ? (
                                                <>
                                                  <ChevronLeft className="w-3 h-3 rotate-90" />
                                                  Show Less
                                                </>
                                              ) : (
                                                <>
                                                  <ChevronRight className="w-3 h-3 rotate-90" />
                                                  Show More
                                                </>
                                              )}
                                            </button>
                                            
                                            {/* Expandable Additional Info */}
                                            {expandedCards[task.id] && (
                                              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
                                                {/* Priority */}
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-gray-700 text-xs w-24">Priority:</span>
                                                  <select
                                                    value={task.priority || 'Normal'}
                                                    onChange={(e) => updateScheduledTask(task.id, { priority: e.target.value })}
                                                    className={`flex-1 px-2 py-1 text-xs rounded font-medium focus:ring-2 focus:ring-purple-500 ${getPriorityColor(task.priority)}`}
                                                  >
                                                    <option value="Critical">Critical</option>
                                                    <option value="High">High</option>
                                                    <option value="Normal">Normal</option>
                                                    <option value="Low">Low</option>
                                                    <option value="Paused">Paused</option>
                                                  </select>
                                                </div>

                                                {/* Media Type */}
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-gray-700 text-xs w-24">Media Type:</span>
                                                  <select
                                                    value={task.mediaType || task.type || ''}
                                                    onChange={(e) => updateScheduledTask(task.id, { mediaType: e.target.value })}
                                                    className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                  >
                                                    <option value="">Select...</option>
                                                    <option value="IMAGE">Image</option>
                                                    <option value="VIDEO">Video</option>
                                                  </select>
                                                </div>

                                                {/* Copy Link */}
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-gray-700 text-xs w-24">Copy Link:</span>
                                                  <input
                                                    type="text"
                                                    value={task.copyLink || ''}
                                                    onChange={(e) => updateScheduledTask(task.id, { copyLink: e.target.value })}
                                                    className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                    placeholder="Enter copy link..."
                                                  />
                                                </div>

                                                {/* Copy Status */}
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-gray-700 text-xs w-24">Copy Status:</span>
                                                  <select
                                                    value={task.copyApproval || ''}
                                                    onChange={(e) => updateScheduledTask(task.id, { copyApproval: e.target.value })}
                                                    className={`flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 ${
                                                      task.copyApproval === 'Approved' ? 'text-green-700' :
                                                      task.copyApproval === 'Needs Review' ? 'text-orange-700' :
                                                      task.copyApproval === 'Left feedback' ? 'text-blue-700' :
                                                      'text-gray-700'
                                                    }`}
                                                  >
                                                    <option value="">Select...</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Needs Review">Needs Review</option>
                                                    <option value="Left feedback">Left feedback</option>
                                                    <option value="Unchecked">Unchecked</option>
                                                    <option value="Revisit Later">Revisit Later</option>
                                                  </select>
                                                </div>
                                                
                                                {/* Script Writer */}
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-gray-700 text-xs w-24">Script Writer:</span>
                                                  <select
                                                    value={task.scriptAssigned || ''}
                                                    onChange={(e) => updateScheduledTask(task.id, { scriptAssigned: parseInt(e.target.value) })}
                                                    className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                  >
                                                    <option value="">Select user...</option>
                                                    {users.filter(u => {
                                                      const dept = u.department?.trim().toUpperCase();
                                                      return dept === 'MEDIA BUYING';
                                                    }).map((user) => (
                                                      <option key={user.id} value={user.id}>{user.name}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Spreadsheet Table */
        <div className="flex-1 overflow-hidden pb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-max">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-30">
                  <input
                    type="checkbox"
                    checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                    onChange={handleSelectAllTasks}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-20">
                  Index
                </th>
                {columns.filter(col => col.visible !== false && col.key !== 'week').map((column) => (
                  <th 
                    key={column.id} 
                    className={`px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap ${column.key === 'quantity' ? 'min-w-[90px]' : 'min-w-[180px]'}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column.name}</span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Add New Task Row */}
              {showAddRow && (
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 animate-in fade-in duration-200">
                  <td className="px-6 py-4 sticky left-0 bg-gradient-to-r from-blue-50 to-indigo-50 z-10">
                    {/* Empty checkbox cell for add row */}
                  </td>
                  <td className="px-4 py-4">
                    {/* Empty index cell for add row */}
                  </td>
                  {columns.filter(col => col.visible !== false && col.key !== 'week').map((column) => (
                    <td key={column.id} className={`px-6 py-4 ${column.key === 'quantity' ? 'min-w-[90px]' : 'min-w-[180px]'}`}>
                      {renderCell({ id: 'new', ...newTask }, column, true)}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button 
                        onClick={handleAddTask} 
                        className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm cursor-pointer"
                        title="Save Task"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setShowAddRow(false); setNewTask({}); }} 
                        className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Task Rows */}
              {filteredTasks.map((task, index) => (
                <tr 
                  key={task.id} 
                  className="group hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-150"
                >
                  <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-gradient-to-r group-hover:from-gray-50 group-hover:to-blue-50/30 z-10">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => handleSelectTask(task.id)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-500">
                    {index + 1}
                  </td>
                  {columns.filter(col => col.visible !== false && col.key !== 'week').map((column) => (
                    <td 
                      key={column.id} 
                      className={`px-6 py-4 ${column.key === 'quantity' ? 'min-w-[90px]' : 'min-w-[180px]'}`}
                    >
                      {renderCell(task, column, false)}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDuplicateTask(task)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
                        title="Duplicate task"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteScheduledTask(task.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="font-medium">Total: {filteredTasks.length} tasks</span>
              {(selectedCampaign || selectedUser) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs">
                    {selectedCampaign && `Campaign: ${campaigns.find(c => c.id === parseInt(selectedCampaign))?.name}`}
                    {selectedCampaign && selectedUser && ' | '}
                    {selectedUser && `User: ${users.find(u => u.id === parseInt(selectedUser))?.name}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-red-600 rounded-xl shadow-2xl max-w-2xl w-full p-6" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-red-600">
                {feedbackModal.type === 'copyApproval' 
                  ? 'Copy Approval Feedback' 
                  : feedbackModal.type === 'adApproval'
                  ? 'Ad Approval Feedback'
                  : `${feedbackModal.columnKey} Feedback`}
              </h3>
              <button onClick={() => setFeedbackModal(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Feedback Details</label>
                <textarea
                  value={feedbackModal.currentFeedback}
                  onChange={(e) => setFeedbackModal({ ...feedbackModal, currentFeedback: e.target.value })}
                  readOnly={feedbackModal.readOnly}
                  placeholder="Enter feedback details here..."
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600 resize-none"
                />
              </div>

              <div className="flex space-x-3">
                {!feedbackModal.readOnly ? (
                  <>
                    <button
                      onClick={() => handleSaveFeedback(feedbackModal.currentFeedback)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/50"
                    >
                      Save Feedback
                    </button>
                    <button
                      onClick={() => setFeedbackModal(null)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setFeedbackModal(null)}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default ScheduledTasks;
