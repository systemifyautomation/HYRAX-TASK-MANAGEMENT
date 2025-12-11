import React, { createContext, useContext, useState } from 'react';
import { USER_ROLES } from '../constants/roles';
import {
  users as initialUsers,
  campaigns as initialCampaigns,
  tasks as initialTasks,
  columns as initialColumns,
  getCurrentUser,
  getUserById,
  getCampaignById,
  getTasksByCampaign,
  getTasksByWeek,
  taskStatus,
} from '../data/mockData';

const AppContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [tasks, setTasks] = useState(initialTasks);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [users, setUsers] = useState(initialUsers);
  const [columns, setColumns] = useState(initialColumns);
  const [selectedView, setSelectedView] = useState('tasks');

  // Update task status
  const updateTaskStatus = (taskId, newStatus, feedback = null) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus,
              feedback,
              reviewedAt: newStatus === taskStatus.NEEDS_REVISION || newStatus === taskStatus.APPROVED ? new Date().toISOString() : task.reviewedAt,
              reviewedBy: newStatus === taskStatus.NEEDS_REVISION || newStatus === taskStatus.APPROVED ? currentUser.id : task.reviewedBy,
              approvedAt: newStatus === taskStatus.APPROVED ? new Date().toISOString() : task.approvedAt,
              approvedBy: newStatus === taskStatus.APPROVED ? currentUser.id : task.approvedBy,
            }
          : task
      )
    );
  };

  // Submit task
  const submitTask = (taskId, content) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: taskStatus.SUBMITTED,
              submittedContent: content,
              submittedAt: new Date().toISOString(),
            }
          : task
      )
    );
  };

  // Get tasks that need review (for managers)
  const getTasksNeedingReview = () => {
    return tasks.filter(task => task.status === taskStatus.SUBMITTED);
  };

  // Get my tasks (for team members)
  const getMyTasks = () => {
    return tasks.filter(task => task.assignedTo === currentUser.id);
  };

  // Add comment to task
  const addComment = (taskId, commentText) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              comments: [
                ...task.comments,
                {
                  id: task.comments.length + 1,
                  userId: currentUser.id,
                  text: commentText,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : task
      )
    );
  };

  // Toggle checklist item
  const toggleChecklistItem = (taskId, checklistItemId) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist.map(item =>
                item.id === checklistItemId
                  ? { ...item, completed: !item.completed }
                  : item
              ),
            }
          : task
      )
    );
  };

  // Update time spent on task
  const updateTimeSpent = (taskId, hours) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, timeSpent: hours }
          : task
      )
    );
  };

  // Task CRUD operations
  const addTask = (taskData) => {
    const newTask = {
      id: Math.max(...tasks.map(t => t.id), 0) + 1,
      ...taskData,
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (taskId, updates) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  };

  const deleteTask = (taskId) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  // Campaign CRUD operations
  const addCampaign = (campaignData) => {
    const newCampaign = {
      id: Math.max(...campaigns.map(c => c.id), 0) + 1,
      ...campaignData,
    };
    setCampaigns(prev => [...prev, newCampaign]);
  };

  const updateCampaign = (campaignId, updates) => {
    setCampaigns(prevCampaigns =>
      prevCampaigns.map(campaign =>
        campaign.id === campaignId ? { ...campaign, ...updates } : campaign
      )
    );
  };

  const deleteCampaign = (campaignId) => {
    setCampaigns(prevCampaigns => prevCampaigns.filter(campaign => campaign.id !== campaignId));
  };

  // User CRUD operations
  const addUser = (userData) => {
    const newUser = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      ...userData,
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (userId, updates) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      )
    );
  };

  const deleteUser = (userId) => {
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
  };

  // Column management
  const addColumn = (columnData) => {
    setColumns(prev => [...prev, { ...columnData, canDelete: true }]);
  };

  const updateColumn = (columnId, updates) => {
    setColumns(prevColumns =>
      prevColumns.map(column =>
        column.id === columnId ? { ...column, ...updates } : column
      )
    );
  };

  const deleteColumn = (columnId) => {
    setColumns(prevColumns => prevColumns.filter(column => column.id !== columnId));
  };

  const value = {
    currentUser,
    setCurrentUser,
    users,
    campaigns,
    tasks,
    columns,
    selectedView,
    setSelectedView,
    updateTaskStatus,
    submitTask,
    getTasksNeedingReview,
    getMyTasks,
    getUserById,
    getCampaignById,
    getTasksByCampaign,
    getTasksByWeek,
    addComment,
    toggleChecklistItem,
    updateTimeSpent,
    addTask,
    updateTask,
    deleteTask,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addUser,
    updateUser,
    deleteUser,
    addColumn,
    updateColumn,
    deleteColumn,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
