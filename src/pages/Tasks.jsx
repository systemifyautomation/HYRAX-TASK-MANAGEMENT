import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Settings, Trash2, Check, X, Calendar, FolderOpen, Grid3X3, Copy, ChevronLeft, ChevronRight, Filter, AlertCircle, LayoutGrid, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, getWeek, addWeeks, subWeeks, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { isAdmin } from '../constants/roles';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const Tasks = () => {
  const { currentUser, tasks, users, campaigns, addTask, addTasks, updateTask, deleteTask, columns, addColumn, updateColumn, deleteColumn, loadUsers } = useApp();
  const isAdminUser = isAdmin(currentUser.role);
  const filtersRef = useRef(null);
  
  // Debug: Log users on component mount
  useEffect(() => {
    console.log('Tasks Component - Users from context:', users);
    console.log('Tasks Component - Users length:', users?.length);
    console.log('Tasks Component - Current user:', currentUser);
  }, [users, currentUser]);
  
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newTask, setNewTask] = useState({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [currentView, setCurrentView] = useState('weekly'); // 'all', 'weekly' - time-based filter
  const [displayType, setDisplayType] = useState('list'); // 'list', 'cards' - display mode
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedUser, setSelectedUser] = useState(''); // Filter by user
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = last week, 1 = next week
  const [showFilters, setShowFilters] = useState(false); // Show filter dropdown
  const [feedbackModal, setFeedbackModal] = useState(null); // { taskId, type: 'copyApproval' | 'adApproval', currentFeedback }
  const [cardCampaignFilters, setCardCampaignFilters] = useState({}); // Campaign filters for each card
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards have expanded details {taskId: true/false}
  const [dateRangeStart, setDateRangeStart] = useState(''); // Start date for date range filter
  const [dateRangeEnd, setDateRangeEnd] = useState(''); // End date for date range filter
  const [showDatePicker, setShowDatePicker] = useState(false); // Show custom date picker
  const [dateRange, setDateRange] = useState([{
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  }]);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState('all');
  
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    dropdownOptions: [],
  });

  const handleCellEdit = (taskId, columnKey, value) => {
    // If admin/superadmin setting Copy Approval or Ad Approval to "Left feedback", open feedback modal
    if (isAdminUser && (columnKey === 'copyApproval' || columnKey === 'adApproval') && value === 'Left feedback') {
      const task = tasks.find(t => t.id === taskId);
      const feedbackKey = columnKey === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
      setFeedbackModal({
        taskId,
        type: columnKey,
        currentFeedback: task?.[feedbackKey] || ''
      });
    }
    updateTask(taskId, { [columnKey]: value });
  };

  const handleSaveFeedback = (feedback) => {
    if (feedbackModal) {
      let feedbackKey;
      
      // Handle array item feedback
      if (feedbackModal.columnKey && feedbackModal.itemIndex !== undefined) {
        feedbackKey = `${feedbackModal.columnKey}Feedback`;
        const task = tasks.find(t => t.id === feedbackModal.taskId);
        const feedbackArray = task?.[feedbackKey] || [];
        const newFeedbackArray = [...feedbackArray];
        newFeedbackArray[feedbackModal.itemIndex] = feedback;
        updateTask(feedbackModal.taskId, { [feedbackKey]: newFeedbackArray });
      } else {
        // Handle approval column feedback
        feedbackKey = feedbackModal.type === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
        updateTask(feedbackModal.taskId, { [feedbackKey]: feedback });
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

  // Date picker helper functions
  const handleQuickFilter = (filter) => {
    setSelectedQuickFilter(filter);
    const today = new Date();
    
    switch(filter) {
      case 'all':
        setDateRangeStart('');
        setDateRangeEnd('');
        setShowDatePicker(false);
        break;
      case 'today':
        setDateRange([{ startDate: today, endDate: today, key: 'selection' }]);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateRange([{ startDate: yesterday, endDate: yesterday, key: 'selection' }]);
        break;
      case 'last7':
        setDateRange([{ startDate: subDays(today, 7), endDate: today, key: 'selection' }]);
        break;
      case 'last30':
        setDateRange([{ startDate: subDays(today, 30), endDate: today, key: 'selection' }]);
        break;
    }
  };

  const applyDateFilter = () => {
    setDateRangeStart(format(dateRange[0].startDate, 'yyyy-MM-dd'));
    setDateRangeEnd(format(dateRange[0].endDate, 'yyyy-MM-dd'));
    setShowDatePicker(false);
  };

  const cancelDateFilter = () => {
    setShowDatePicker(false);
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
      title: newTask.title?.trim() || 'New Task',
      status: newTask.status || 'approved',
      priority: newTask.priority || 'normal',
      createdAt: new Date().toISOString()
    };
    addTask(taskToAdd);
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
      id: undefined, // Will be assigned by addTask
      title: `${task.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addTask(duplicatedTask);
  };

  const handleDuplicateSelectedTasks = () => {
    const tasksToDuplicate = tasks.filter(task => selectedTasks.has(task.id));
    const duplicatedTasksData = tasksToDuplicate.map(task => ({
      ...task,
      id: undefined, // Will be assigned by addTasks
      title: `${task.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    addTasks(duplicatedTasksData);
    setSelectedTasks(new Set());
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
    let filtered = tasks;

    // Apply view-based filtering (weekly or all)
    if (currentView === 'weekly') {
      // Show all tasks for the selected week based on createdAt
      const targetDate = addWeeks(new Date(), currentWeekOffset);
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 }); // Saturday
      
      filtered = filtered.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
      });
    }

    // Apply date range filter (works across all views)
    if (dateRangeStart || dateRangeEnd) {
      filtered = filtered.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = startOfDay(new Date(task.createdAt));
        
        if (dateRangeStart && dateRangeEnd) {
          const start = startOfDay(new Date(dateRangeStart));
          const end = endOfDay(new Date(dateRangeEnd));
          return isWithinInterval(taskDate, { start, end });
        } else if (dateRangeStart) {
          const start = startOfDay(new Date(dateRangeStart));
          return taskDate >= start;
        } else if (dateRangeEnd) {
          const end = endOfDay(new Date(dateRangeEnd));
          return taskDate <= end;
        }
        return true;
      });
    }

    // Apply campaign filter (works across all views)
    if (selectedCampaign) {
      filtered = filtered.filter(task => task.campaignId === parseInt(selectedCampaign));
    }

    // Apply user filter (works across all views)
    if (selectedUser) {
      filtered = filtered.filter(task => task.assignedTo === parseInt(selectedUser));
    }

    return filtered;
  }, [tasks, currentView, selectedCampaign, currentWeekOffset, selectedUser, dateRangeStart, dateRangeEnd]);

  // Handle view changes with smart defaults
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'weekly') {
      // Reset to current week when switching to weekly view
      setCurrentWeekOffset(0);
    }
  };

  // Week navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  // Get current week date range for display
  const getCurrentWeekRange = () => {
    const targetDate = addWeeks(new Date(), currentWeekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });
    return {
      start: weekStart,
      end: weekEnd,
      weekNumber: getWeek(targetDate)
    };
  };

  const renderCell = (task, column, isEditing) => {
    const value = task[column.key];
    const isNewTask = task.id === 'new';

    const handleChange = isNewTask 
      ? (newValue) => handleNewTaskFieldChange(column.key, newValue)
      : (newValue) => handleCellEdit(task.id, column.key, newValue);

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
          updateTask(task.id, { [approvalKey]: newApprovals });
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
                  type="text"
                  value={item || ''}
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
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300"
            placeholder={column.name}
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
      
      default:
        return <span className="text-sm text-gray-700">{value || '-'}</span>;
    }
  };

  const formatCellValue = (value, column) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title">
            Tasks
          </h1>
          <p className="text-gray-600 mt-2">Manage all tasks in a powerful spreadsheet view</p>
          
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
          {/* Time Filter Toggle - Weekly / All */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => handleViewChange('weekly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                currentView === 'weekly' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Weekly</span>
            </button>
            <button
              onClick={() => handleViewChange('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                currentView === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>View All</span>
            </button>
          </div>

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
                (selectedCampaign || selectedUser || dateRangeStart || dateRangeEnd) ? 'border-primary-500 bg-primary-50' : ''
              }`}
              title="Filters"
            >
              <Filter className="w-4 h-4 text-gray-700" />
            </button>
            
            {/* Filter Dropdown */}
            {showFilters && (
              <div ref={filtersRef} className="absolute top-full left-0 mt-2 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl shadow-2xl border-2 border-red-500/30 p-5 z-20 min-w-[320px] backdrop-blur-sm shadow-red-500/20">
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
                  
                  {/* Date Range Filter */}
                  <div className="border-t-2 border-red-500/20 pt-4 mt-2">
                    <button
                      onClick={() => {
                        setShowDatePicker(!showDatePicker);
                      }}
                      className="w-full text-left block text-sm font-bold text-red-500 mb-3 uppercase tracking-wider flex items-center justify-between gap-2 hover:text-red-400 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date Range
                      </span>
                      {(dateRangeStart || dateRangeEnd) && (
                        <span className="text-xs text-red-300 normal-case font-normal">
                          {dateRangeStart && dateRangeEnd ? `${format(new Date(dateRangeStart), 'MMM d')} - ${format(new Date(dateRangeEnd), 'MMM d')}` : 
                           dateRangeStart ? `From ${format(new Date(dateRangeStart), 'MMM d')}` :
                           `Until ${format(new Date(dateRangeEnd), 'MMM d')}`}
                        </span>
                      )}
                    </button>
                    
                    {showDatePicker && (
                      <div className="mt-3 bg-gradient-to-br from-gray-950 to-black border-2 border-red-500/40 rounded-xl overflow-hidden shadow-2xl shadow-red-500/20">
                        <div className="flex">
                          {/* Quick Filters */}
                          <div className="w-32 bg-black/50 border-r border-red-500/30 p-3">
                            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Quick</div>
                            {[
                              { label: 'All Dates', value: 'all' },
                              { label: 'Today', value: 'today' },
                              { label: 'Yesterday', value: 'yesterday' },
                              { label: 'Last 7 Days', value: 'last7' },
                              { label: 'Last 30 Days', value: 'last30' }
                            ].map(option => (
                              <button
                                key={option.value}
                                onClick={() => handleQuickFilter(option.value)}
                                className={`w-full text-left px-2 py-1.5 text-xs rounded mb-1 transition-all ${
                                  selectedQuickFilter === option.value 
                                    ? 'bg-red-600 text-white font-semibold' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Date Range Picker */}
                          <div className="flex-1 date-range-picker-custom">
                            <DateRangePicker
                              ranges={dateRange}
                              onChange={item => setDateRange([item.selection])}
                              months={1}
                              direction="horizontal"
                              showSelectionPreview={true}
                              moveRangeOnFirstSelection={false}
                              rangeColors={['#dc2626']}
                            />
                          </div>
                        </div>
                        
                        {/* Apply/Cancel Buttons */}
                        <div className="flex gap-2 p-3 bg-black/30 border-t border-red-500/30">
                          <button
                            onClick={cancelDateFilter}
                            className="flex-1 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={applyDateFilter}
                            className="flex-1 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all shadow-lg shadow-red-500/30"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Clear Filters Button */}
                  {(selectedCampaign || selectedUser || dateRangeStart || dateRangeEnd) && (
                    <button
                      onClick={() => {
                        setSelectedCampaign('');
                        setSelectedUser('');
                        setDateRangeStart('');
                        setDateRangeEnd('');
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
        {isAdminUser && (
          <div className="flex items-center space-x-3">
            {selectedTasks.size > 0 && (
              <button
                onClick={handleDuplicateSelectedTasks}
                className="px-4 py-2 bg-white border border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
              >
                <Copy className="w-4 h-4" />
                <span>Duplicate ({selectedTasks.size})</span>
              </button>
            )}
            <button
              onClick={() => setShowAddRow(!showAddRow)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Columns</span>
            </button>
          </div>
        )}
      </div>

      {/* Cards View */}
      {displayType === 'cards' ? (
        <div className="space-y-8">
          {['MEDIA BUYING', 'VIDEO EDITING', 'GRAPHIC DESIGN'].map(department => {
            const departmentUsers = users.filter(u => u.department === department);
            
            if (departmentUsers.length === 0) return null;

            return (
              <div key={department}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{department}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departmentUsers.map(user => {
                    // Filter tasks based on department
                    let userTasks = filteredTasks.filter(task => {
                      if (department === 'MEDIA BUYING') {
                        // Media Buyers: show tasks where they are assigned to script or generally assigned
                        return task.scriptAssigned === user.id || (!task.scriptAssigned && task.assignedTo === user.id);
                      } else if (department === 'VIDEO EDITING') {
                        // Video Editors: show tasks where they are assigned and media type is VIDEO
                        const mediaType = task.mediaType || task.type;
                        return task.assignedTo === user.id && (mediaType === 'VIDEO' || mediaType === 'video');
                      } else if (department === 'GRAPHIC DESIGN') {
                        // Designers: show tasks where they are assigned and media type is IMAGE
                        const mediaType = task.mediaType || task.type;
                        return task.assignedTo === user.id && (mediaType === 'IMAGE' || mediaType === 'image');
                      }
                      return false;
                    });

                    // Apply card-level campaign filter
                    const cardCampaignFilter = cardCampaignFilters[user.id] || '';
                    if (cardCampaignFilter) {
                      userTasks = userTasks.filter(task => task.campaignId === parseInt(cardCampaignFilter));
                    }

                    return (
                      <div key={user.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                        {/* User Header */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                          <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3">
                              {user.name.charAt(0)}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center">{user.name}</h3>
                          </div>
                        </div>

                        {/* Campaign Filter */}
                        <div className="px-4 pt-4 pb-3 bg-gray-50 border-b border-gray-200">
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Campaign</label>
                          <select
                            value={cardCampaignFilter}
                            onChange={(e) => setCardCampaignFilters({ ...cardCampaignFilters, [user.id]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
                          >
                            <option value="">All Campaigns</option>
                            {campaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Tasks List */}
                        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                          {userTasks.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-sm text-gray-400 italic">No tasks</p>
                            </div>
                          ) : (
                            userTasks.map(task => {
                              const campaign = campaigns.find(c => c.id === task.campaignId);
                              
                              const getApprovalColor = (approval) => {
                                switch(approval) {
                                  case 'Approved': return 'text-green-600';
                                  case 'Needs Review': return 'text-orange-600';
                                  case 'Left feedback': return 'text-blue-600';
                                  case 'Unchecked': return 'text-gray-500';
                                  case 'Revisit Later': return 'text-purple-600';
                                  default: return 'text-gray-500';
                                }
                              };

                              const getPriorityColor = (priority) => {
                                switch(priority?.toLowerCase()) {
                                  case 'critical': return 'text-red-600';
                                  case 'high': return 'text-orange-600';
                                  case 'normal': return 'text-blue-600';
                                  case 'low': return 'text-gray-500';
                                  case 'paused': return 'text-purple-600';
                                  default: return 'text-gray-500';
                                }
                              };

                              const taskTitle = task.title || campaign?.name || `${task.mediaType || task.type || 'Task'} #${task.id}`;
                              const scriptAssignedUser = users.find(u => u.id === task.scriptAssigned);

                              return (
                                <div key={task.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                  <div className="space-y-2">
                                    {/* Task Title */}
                                    <div className="text-sm font-semibold text-gray-800">{taskTitle}</div>
                                    
                                    {/* Priority Badge */}
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className={`px-2 py-1 rounded font-medium ${getPriorityColor(task.priority)} bg-gray-50`}>
                                        {task.priority || 'Normal'}
                                      </span>
                                    </div>

                                    {/* Department-Specific Details */}
                                    {department === 'Media Buyers' && (
                                      <div className="space-y-2 text-xs mt-2">
                                        {/* Script Assigned */}
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Script Assigned:</span>
                                          <select
                                            value={task.scriptAssigned || ''}
                                            onChange={(e) => updateTask(task.id, { scriptAssigned: parseInt(e.target.value) })}
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                                          >
                                            <option value="">Select user...</option>
                                            {users.filter(u => u.department === 'Media Buyers').map((user) => (
                                              <option key={user.id} value={user.id}>{user.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        
                                        {/* Copy Written */}
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Copy Written:</span>
                                          <input
                                            type="checkbox"
                                            checked={task.copyWritten || false}
                                            onChange={(e) => updateTask(task.id, { copyWritten: e.target.checked })}
                                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500 cursor-pointer"
                                          />
                                          <span className={task.copyWritten ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                            {task.copyWritten ? 'Yes' : 'No'}
                                          </span>
                                        </div>
                                        
                                        {/* Copy Link */}
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Copy Link:</span>
                                          <input
                                            type="text"
                                            value={task.copyLink || ''}
                                            onChange={(e) => updateTask(task.id, { copyLink: e.target.value })}
                                            className="flex-1 px-2 py-1 text-xs bg-white text-black border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder="Enter copy link..."
                                          />
                                          {task.copyLink && (
                                            <a href={task.copyLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          )}
                                        </div>
                                        
                                        {/* Copy Approval */}
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Copy Approval:</span>
                                          <select
                                            value={task.copyApproval || ''}
                                            onChange={(e) => updateTask(task.id, { copyApproval: e.target.value })}
                                            className={`flex-1 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium ${
                                              task.copyApproval === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                              task.copyApproval === 'Needs Review' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              task.copyApproval === 'Left feedback' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              task.copyApproval === 'Revisit Later' ? 'bg-purple-50 text-purple-700 border-purple-200' :
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
                                          {task.copyApproval === 'Left feedback' && (
                                            <div className="relative group">
                                              <div 
                                                className={`w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-200 ${
                                                  isAdminUser ? 'cursor-pointer hover:bg-red-50 hover:border-red-300' : 'cursor-help'
                                                }`}
                                                onClick={() => isAdminUser && setFeedbackModal({
                                                  taskId: task.id,
                                                  type: 'copyApproval',
                                                  columnKey: 'copyApproval',
                                                  currentFeedback: task.copyApprovalFeedback || '',
                                                  readOnly: !isAdminUser
                                                })}
                                              >
                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                              </div>
                                              {task.copyApprovalFeedback && (
                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                                                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs whitespace-pre-wrap border border-gray-700">
                                                    <div className="font-semibold mb-1 text-red-400">Feedback:</div>
                                                    {task.copyApprovalFeedback}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                                      <div className="border-4 border-transparent border-t-gray-900"></div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Show More Button */}
                                        <button
                                          onClick={() => setExpandedCards(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                          className="mt-2 text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
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
                                                        updateTask(task.id, { viewerLink: newLinks });
                                                      }}
                                                      className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                      placeholder={`Viewer link ${idx + 1}`}
                                                    />
                                                    {link && (
                                                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                        <ExternalLink className="w-4 h-4" />
                                                      </a>
                                                    )}
                                                    <button
                                                      onClick={() => {
                                                        const newLinks = task.viewerLink.filter((_, i) => i !== idx);
                                                        updateTask(task.id, { viewerLink: newLinks });
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
                                                  updateTask(task.id, { viewerLink: newLinks });
                                                }}
                                                className="text-xs text-red-600 hover:text-red-700 font-medium"
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
                                                        updateTask(task.id, { caliVariation: newVariations });
                                                      }}
                                                      className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                      placeholder={`Variation ${idx + 1}`}
                                                    />
                                                    <button
                                                      onClick={() => {
                                                        const newVariations = task.caliVariation.filter((_, i) => i !== idx);
                                                        updateTask(task.id, { caliVariation: newVariations });
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
                                                  updateTask(task.id, { caliVariation: newVariations });
                                                }}
                                                className="text-xs text-red-600 hover:text-red-700 font-medium"
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
                                                        updateTask(task.id, { slackPermalink: newLinks });
                                                      }}
                                                      className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                      placeholder={`Slack link ${idx + 1}`}
                                                    />
                                                    {link && (
                                                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                        <ExternalLink className="w-4 h-4" />
                                                      </a>
                                                    )}
                                                    <button
                                                      onClick={() => {
                                                        const newLinks = task.slackPermalink.filter((_, i) => i !== idx);
                                                        updateTask(task.id, { slackPermalink: newLinks });
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
                                                  updateTask(task.id, { slackPermalink: newLinks });
                                                }}
                                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                                              >
                                                + Add Slack Link
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {department === 'Video Editors' && (
                                      <div className="space-y-1.5 text-xs mt-2">
                                        {task.viewerLink && task.viewerLink.length > 0 && (
                                          <div className="flex items-start">
                                            <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Viewer Links:</span>
                                            <div className="flex flex-col gap-1">
                                              {task.viewerLink.map((link, idx) => (
                                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline truncate">
                                                  Link {idx + 1}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {task.caliVariation && task.caliVariation.length > 0 && (
                                          <div className="flex items-start">
                                            <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Cali Variation:</span>
                                            <span className="text-gray-800">{task.caliVariation.join(', ')}</span>
                                          </div>
                                        )}
                                        {task.slackPermalink && task.slackPermalink.length > 0 && (
                                          <div className="flex items-start">
                                            <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Slack Links:</span>
                                            <div className="flex flex-col gap-1">
                                              {task.slackPermalink.map((link, idx) => (
                                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline truncate">
                                                  Thread {idx + 1}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {department === 'Designers' && (
                                      <div className="space-y-1.5 text-xs mt-2">
                                        {task.viewerLink && task.viewerLink.length > 0 && (
                                          <div className="flex items-start">
                                            <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Viewer Links:</span>
                                            <div className="flex flex-col gap-1">
                                              {task.viewerLink.map((link, idx) => (
                                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline truncate">
                                                  Link {idx + 1}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {task.caliVariation && task.caliVariation.length > 0 && (
                                          <div className="flex items-start">
                                            <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Cali Variation:</span>
                                            <span className="text-gray-800">{task.caliVariation.join(', ')}</span>
                                          </div>
                                        )}
                                        {task.slackPermalink && task.slackPermalink.length > 0 && (
                                          <div className="flex items-start">
                                            <span className="font-semibold text-gray-600 w-28 flex-shrink-0">Slack Links:</span>
                                            <div className="flex flex-col gap-1">
                                              {task.slackPermalink.map((link, idx) => (
                                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline truncate">
                                                  Thread {idx + 1}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
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
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                  <input
                    type="checkbox"
                    checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                    onChange={handleSelectAllTasks}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                {columns.filter(col => col.visible !== false).map((column) => (
                  <th 
                    key={column.id} 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap min-w-[180px]"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column.name}</span>
                    </div>
                  </th>
                ))}
                {isAdminUser && (
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Add New Task Row */}
              {showAddRow && isAdminUser && (
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 animate-in fade-in duration-200">
                  <td className="px-6 py-4 sticky left-0 bg-gradient-to-r from-blue-50 to-indigo-50 z-10">
                    {/* Empty checkbox cell for add row */}
                  </td>
                  {columns.filter(col => col.visible !== false).map((column) => (
                    <td key={column.id} className="px-6 py-4 min-w-[180px]">
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
              {filteredTasks.map((task) => (
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
                  {columns.filter(col => col.visible !== false).map((column) => (
                    <td 
                      key={column.id} 
                      className="px-6 py-4 min-w-[180px]"
                    >
                      {renderCell(task, column, false)}
                    </td>
                  ))}
                  {isAdminUser && (
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
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
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
            
            {/* Simple Week Navigation - Only show in weekly view */}
            {currentView === 'weekly' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousWeek}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-xs font-medium text-gray-700 min-w-[100px] text-center">
                  Week {getCurrentWeekRange().weekNumber}
                </span>
                <button
                  onClick={handleNextWeek}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
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

export default Tasks;