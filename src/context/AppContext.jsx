import React, { createContext, useContext, useState } from 'react';
import {
  users,
  campaigns,
  tasks as initialTasks,
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
  const [selectedView, setSelectedView] = useState('campaigns'); // campaigns, weekly

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

  const value = {
    currentUser,
    setCurrentUser,
    users,
    campaigns,
    tasks,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
