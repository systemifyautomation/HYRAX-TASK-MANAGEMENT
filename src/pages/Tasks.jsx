import React, { useState, useMemo } from 'react';
import { Plus, Settings, Trash2, Check, X, Calendar, FolderOpen, Grid3X3, Copy } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { isAdmin } from '../constants/roles';

const Tasks = () => {
  const { currentUser, tasks, users, campaigns, addTask, updateTask, deleteTask, columns, addColumn, updateColumn, deleteColumn } = useApp();
  const isAdminUser = isAdmin(currentUser.role);
  
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newTask, setNewTask] = useState({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [currentView, setCurrentView] = useState('all'); // 'all', 'campaigns', 'weekly'
  const [selectedCampaign, setSelectedCampaign] = useState('');
  
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    options: '',
  });

  const handleCellEdit = (taskId, columnKey, value) => {
    updateTask(taskId, { [columnKey]: value });
  };

  const handleAddTask = () => {
    if (Object.keys(newTask).length > 0) {
      addTask(newTask);
      setNewTask({});
      setShowAddRow(false);
    }
  };

  const handleAddColumn = () => {
    if (newColumn.name.trim()) {
      const options = newColumn.type === 'dropdown' 
        ? newColumn.options.split(',').map(o => o.trim()).filter(Boolean)
        : null;
      
      addColumn({
        id: `custom_${Date.now()}`,
        name: newColumn.name,
        type: newColumn.type,
        options,
      });
      
      setNewColumn({ name: '', type: 'text', options: '' });
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
    const tasksToduplicate = tasks.filter(task => selectedTasks.has(task.id));
    tasksToduplicate.forEach(task => {
      handleDuplicateTask(task);
    });
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
    if (currentView === 'campaigns') {
      if (selectedCampaign) {
        // Show all tasks for the selected campaign
        return tasks.filter(task => task.campaignId === parseInt(selectedCampaign));
      } else {
        // Show all tasks grouped by campaigns
        return tasks.filter(task => task.campaignId);
      }
    }
    if (currentView === 'weekly') {
      // Show all tasks for the current week
      const currentWeek = getWeek(new Date());
      return tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskWeek = getWeek(new Date(task.dueDate));
        return taskWeek === currentWeek;
      });
    }
    return tasks; // 'all' view
  }, [tasks, currentView, selectedCampaign]);

  // Handle view changes with smart defaults
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'campaigns' && !selectedCampaign && campaigns.length > 0) {
      // Auto-select first campaign if none selected
      setSelectedCampaign(campaigns[0].id.toString());
    }
  };

  const renderCell = (task, column, isEditing) => {
    const value = task[column.key];
    
    if (!isEditing && !isAdminUser && column.key !== 'title' && column.key !== 'description') {
      return <span className="text-sm text-gray-700">{formatCellValue(value, column)}</span>;
    }

    switch (column.type) {
      case 'text':
      case 'url':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleCellEdit(task.id, column.key, e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300"
            placeholder={column.name}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleCellEdit(task.id, column.key, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300"
            placeholder={column.name}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleCellEdit(task.id, column.key, e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-2 focus:ring-primary-500 cursor-pointer transition-all"
            />
          </div>
        );
      
      case 'dropdown':
        return (
          <div className="relative">
            <select
              value={value || ''}
              onChange={(e) => handleCellEdit(task.id, column.key, e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-opacity-80 cursor-pointer border font-medium shadow-sm ${
                getCurrentValueColors(column.key, value)
              }`}
            >
              <option value="" className="bg-white text-gray-500">Select...</option>
              {column.options?.map((option) => (
                <option 
                  key={option} 
                  value={option}
                  className="bg-white text-gray-800 hover:bg-gray-50 py-2 px-3 font-medium"
                >
                  {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleCellEdit(task.id, column.key, e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300 cursor-pointer"
          />
        );
      
      case 'user':
        return (
          <div className="relative">
            <select
              value={value || ''}
              onChange={(e) => handleCellEdit(task.id, column.key, parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-blue-300 cursor-pointer font-medium text-blue-800 shadow-sm"
            >
              <option value="" className="bg-white text-gray-500">Select user...</option>
              {users.map((user) => (
                <option 
                  key={user.id} 
                  value={user.id}
                  className="bg-white text-gray-800 hover:bg-blue-50 py-2 px-3 font-medium"
                >
                  {user.avatar} {user.name}
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
              onChange={(e) => handleCellEdit(task.id, column.key, parseInt(e.target.value))}
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
      case 'user':
        const user = users.find(u => u.id === value);
        return user ? (
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm">
              {user.avatar}
            </div>
            <span className="text-sm font-medium text-gray-900">{user.name}</span>
          </div>
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
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                Tasks
              </h1>
              <p className="text-gray-500 mt-2">Manage all tasks in a powerful spreadsheet view</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Selector */}
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => handleViewChange('all')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                    currentView === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>All Tasks</span>
                </button>
                <button
                  onClick={() => handleViewChange('campaigns')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                    currentView === 'campaigns' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>By Campaign</span>
                </button>
                <button
                  onClick={() => handleViewChange('weekly')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                    currentView === 'weekly' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Weekly</span>
                </button>
              </div>

              {/* Campaign/Week Selector */}
              {currentView === 'campaigns' && (
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              )}
            </div>
            
            {isAdminUser && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddRow(!showAddRow)}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium rounded-lg shadow-lg shadow-primary-500/30 transition-all duration-200 flex items-center space-x-2 hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
                <button
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  className="px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-primary-300 text-gray-700 hover:text-primary-700 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 hover:shadow-md"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage Columns</span>
                </button>
                {selectedTasks.size > 0 && (
                  <button
                    onClick={handleDuplicateSelectedTasks}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center space-x-2 hover:scale-105"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Duplicate Selected ({selectedTasks.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Manage Columns</h3>
              <button onClick={() => setShowColumnManager(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add New Column */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Add New Column</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  placeholder="Column name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <select
                  value={newColumn.type}
                  onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                {newColumn.type === 'dropdown' && (
                  <input
                    type="text"
                    value={newColumn.options}
                    onChange={(e) => setNewColumn({ ...newColumn, options: e.target.value })}
                    placeholder="Options (comma-separated)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                )}
                <button onClick={handleAddColumn} className="btn-primary w-full">
                  Add Column
                </button>
              </div>
            </div>

            {/* Existing Columns */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Existing Columns</h4>
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                    {editingColumn?.id === column.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingColumn.name}
                          onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Column name"
                        />
                        <select
                          value={editingColumn.type}
                          onChange={(e) => setEditingColumn({ ...editingColumn, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                        {editingColumn.type === 'dropdown' && (
                          <input
                            type="text"
                            value={editingColumn.options}
                            onChange={(e) => setEditingColumn({ ...editingColumn, options: e.target.value })}
                            placeholder="Options (comma-separated)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveColumn}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingColumn(null)}
                            className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-1"
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
                          <p className="font-medium text-gray-900">{column.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{column.type}</p>
                          {column.type === 'dropdown' && column.options && (
                            <p className="text-xs text-gray-400 mt-1">Options: {column.options.join(', ')}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {column.canDelete && (
                            <>
                              <button
                                onClick={() => handleEditColumn(column)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
                                title="Edit column"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteColumn(column.id)}
                                className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
                                title="Delete column"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Spreadsheet Table */}
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
                {columns.map((column) => (
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
                  {columns.map((column) => (
                    <td key={column.id} className="px-6 py-4 min-w-[180px]">
                      {renderCell({ id: 'new', ...newTask }, column, true)}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button 
                        onClick={handleAddTask} 
                        className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm"
                        title="Save"
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
                  className="group hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-150 cursor-pointer"
                >
                  <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-gradient-to-r group-hover:from-gray-50 group-hover:to-blue-50/30 z-10">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => handleSelectTask(task.id)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                  </td>
                  {columns.map((column) => (
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
              <span className="text-gray-400">•</span>
              <span>
                {currentView === 'all' && 'Showing all tasks'}
                {currentView === 'campaigns' && selectedCampaign && `Showing all tasks for ${campaigns.find(c => c.id === parseInt(selectedCampaign))?.name}`}
                {currentView === 'campaigns' && !selectedCampaign && 'Showing all campaign tasks'}
                {currentView === 'weekly' && `Showing tasks for Week ${getWeek(new Date())} (${format(startOfWeek(new Date()), 'MMM dd')} - ${format(endOfWeek(new Date()), 'MMM dd')})`}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Tasks;