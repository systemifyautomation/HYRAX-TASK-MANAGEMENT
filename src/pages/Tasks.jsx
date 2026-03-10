import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Settings, Trash2, Check, X, Calendar, FolderOpen, Copy, ChevronLeft, ChevronRight, Filter, AlertCircle, ExternalLink, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, getWeek, addWeeks, subWeeks, isWithinInterval, startOfDay, endOfDay, subDays, parseISO, differenceInWeeks } from 'date-fns';
import { isAdmin, isSuperAdmin, isManager, USER_ROLES } from '../constants/roles';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import UserTaskCard from '../components/UserTaskCard';
import FeedbackModal from '../components/FeedbackModal';
import CopyLinkPreviewModal from '../components/CopyLinkPreviewModal';
import UserTasksModal from '../components/UserTasksModal';
import ColumnManagerModal from '../components/ColumnManagerModal';
import AddTaskModal from '../components/AddTaskModal';

// Global storage for active uploads - survives component re-renders
if (!window.HYRAX_ACTIVE_UPLOADS) {
  window.HYRAX_ACTIVE_UPLOADS = {};
}

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

// Generate week options from start date to this week + Next week option
const generateWeekOptions = () => {
  const options = [];
  const currentOffset = getCurrentWeekOffset();
  
  // From start date (most negative) to this week
  for (let offset = 0; offset <= currentOffset; offset++) {
    const weekOffset = offset - currentOffset; // Convert to relative offset
    options.push({
      value: getWeekDateRange(weekOffset),
      label: getWeekLabel(weekOffset),
      weekOffset: weekOffset
    });
  }
  
  // Add "Next week" option
  options.push({
    value: getWeekDateRange(1),
    label: 'Next week',
    weekOffset: 1
  });
  
  return options.reverse(); // Most recent first
};

/**
 * CRITICAL: Creative Array Synchronization
 * ======================================
 * The following arrays MUST always have the same length because they describe
 * individual ad creatives at the same index:
 * 
 * - viewerLink: The URL to the creative
 * - viewerLinkApproval: The approval status ('Not Done', 'Needs Review', 'Left Feedback', 'Approved', 'Uploaded')
 * - viewerLinkFeedback: The feedback text for this creative
 * - slackPermalink: The Slack permalink for this creative
 * 
 * When adding, removing, or modifying any of these arrays, ensure ALL arrays
 * are updated to maintain the same length and indices.
 * 
 * Use this helper function to ensure synchronization:
 */
const synchronizeCreativeArrays = (task, targetIndex) => {
  const arrays = {
    viewerLink: Array.isArray(task.viewerLink) ? [...task.viewerLink] : [],
    viewerLinkApproval: Array.isArray(task.viewerLinkApproval) ? [...task.viewerLinkApproval] : [],
    viewerLinkFeedback: Array.isArray(task.viewerLinkFeedback) ? [...task.viewerLinkFeedback] : [],
    slackPermalink: Array.isArray(task.slackPermalink) ? [...task.slackPermalink] : [],
    viewerLinkApprovalAt: Array.isArray(task.viewerLinkApprovalAt) ? [...task.viewerLinkApprovalAt] : [],
    viewerLinkAt: Array.isArray(task.viewerLinkAt) ? [...task.viewerLinkAt] : []
  };
  
  // Find the maximum required length
  const maxLength = Math.max(
    targetIndex + 1,
    arrays.viewerLink.length,
    arrays.viewerLinkApproval.length,
    arrays.viewerLinkFeedback.length,
    arrays.slackPermalink.length,
    arrays.viewerLinkApprovalAt.length,
    arrays.viewerLinkAt.length
  );
  
  // Pad all arrays to the same length with appropriate default values
  while (arrays.viewerLink.length < maxLength) arrays.viewerLink.push('');
  while (arrays.viewerLinkApproval.length < maxLength) arrays.viewerLinkApproval.push('Not Done');
  while (arrays.viewerLinkFeedback.length < maxLength) arrays.viewerLinkFeedback.push('');
  while (arrays.slackPermalink.length < maxLength) arrays.slackPermalink.push('');
  while (arrays.viewerLinkApprovalAt.length < maxLength) arrays.viewerLinkApprovalAt.push(null);
  while (arrays.viewerLinkAt.length < maxLength) arrays.viewerLinkAt.push(null);
  
  return arrays;
};

const Tasks = () => {
  const { currentUser, tasks, setTasks, users, campaigns, tasksLoading, campaignsLoading, loadTasksFromWebhook, loadCampaignsData, addTask, addTasks, updateTask, deleteTask, deleteTasks, addScheduledTask, scheduledTasks, setScheduledTasks, loadScheduledTasksFromWebhook, updateScheduledTask, deleteScheduledTask, columns, addColumn, updateColumn, deleteColumn, loadUsers } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminUser = isAdmin(currentUser.role);
  const canGiveFeedback = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  const filtersRef = useRef(null);
  
  // Store active upload requests to prevent HMR from interrupting them
  const activeUploads = useRef({});
  
  // Debounce timer for background updates
  const updateTimersRef = useRef({});
  
  // Debounced update function - updates state immediately, syncs to backend after delay
  const debouncedUpdate = useCallback((taskId, updates, delay = 1000) => {
    // Clear existing timer for this task
    if (updateTimersRef.current[taskId]) {
      clearTimeout(updateTimersRef.current[taskId]);
    }
    
    // Set new timer
    updateTimersRef.current[taskId] = setTimeout(() => {
      updateTask(taskId, updates);
      delete updateTimersRef.current[taskId];
    }, delay);
  }, [updateTask]);
  
  // State declarations
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newTask, setNewTask] = useState({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedUser, setSelectedUser] = useState(''); // Filter by user
  
  // Optimistic updates state - shared across cards and modals
  const [optimisticBuyers, setOptimisticBuyers] = useState({});
  const [optimisticStatuses, setOptimisticStatuses] = useState({});
  const [optimisticCopyLinks, setOptimisticCopyLinks] = useState({});
  const [optimisticCopyWritten, setOptimisticCopyWritten] = useState({});
  
  // Initialize weekView based on current URL path
  const [weekView, setWeekView] = useState(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    return segments[0] === 'next-week' ? 'next-week' : 'this-week';
  });
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekDateRange()); // Default to 'This week'
  
  // Load campaigns data once on mount (campaigns don't change between weeks)
  useEffect(() => {
    loadCampaignsData();
  }, []);

  // Pre-load both datasets on mount for instant switching
  useEffect(() => {
    // Load both tasks and scheduled tasks from cache immediately
    const cachedTasks = localStorage.getItem('hyrax_tasks');
    const cachedScheduled = localStorage.getItem('hyrax_scheduled_tasks');
    
    if (cachedTasks) {
      try {
        setTasks(JSON.parse(cachedTasks));
      } catch (e) {
        console.error('Failed to parse cached tasks:', e);
      }
    }
    
    if (cachedScheduled) {
      try {
        setScheduledTasks(JSON.parse(cachedScheduled));
      } catch (e) {
        console.error('Failed to parse cached scheduled tasks:', e);
      }
    }
  }, []);

  // Refresh data from webhook when week view changes
  useEffect(() => {
    let mounted = true;
    
    const refreshData = async () => {
      // CRITICAL: Do not reload if uploads are in progress
      if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length > 0) {
        console.warn('⚠️ Skipping data reload - uploads in progress');
        return;
      }
      
      if (!mounted) return;
      
      // Store current page and week for background refresh
      localStorage.setItem('hyrax_current_page', 'tasks');
      
      // Refresh from webhook in background (non-blocking)
      if (weekView === 'this-week') {
        localStorage.setItem('hyrax_current_week', selectedWeek);
        loadTasksFromWebhook(null, selectedWeek !== 'all' ? selectedWeek : null);
      } else {
        // For next week, pass the next week's date range
        const nextWeekRange = getWeekDateRange(1);
        localStorage.setItem('hyrax_current_week', nextWeekRange);
        loadScheduledTasksFromWebhook(null, nextWeekRange);
      }
    };
    
    // Use setTimeout to defer webhook refresh, making switch instant
    const timer = setTimeout(refreshData, 0);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
      // Clear page marker when leaving
      if (localStorage.getItem('hyrax_current_page') === 'tasks') {
        localStorage.removeItem('hyrax_current_page');
        localStorage.removeItem('hyrax_current_week');
      }
    };
  }, [selectedWeek, weekView]);
  
  // Wrapper functions with optimistic updates
  const updateTaskOptimistic = useCallback(async (taskId, updates) => {
    // Apply optimistic updates immediately
    if (updates.scriptAssigned !== undefined) {
      setOptimisticBuyers(prev => ({
        ...prev,
        [taskId]: updates.scriptAssigned
      }));
    }
    if (updates.status !== undefined) {
      setOptimisticStatuses(prev => ({
        ...prev,
        [taskId]: updates.status
      }));
    }
    if (updates.copyLink !== undefined) {
      setOptimisticCopyLinks(prev => ({
        ...prev,
        [taskId]: updates.copyLink
      }));
    }
    if (updates.copyWritten !== undefined) {
      setOptimisticCopyWritten(prev => ({
        ...prev,
        [taskId]: updates.copyWritten
      }));
    }
    
    try {
      // Call actual update
      await updateTask(taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert optimistic updates on error
      if (updates.scriptAssigned !== undefined) {
        setOptimisticBuyers(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      if (updates.status !== undefined) {
        setOptimisticStatuses(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      if (updates.copyLink !== undefined) {
        setOptimisticCopyLinks(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      if (updates.copyWritten !== undefined) {
        setOptimisticCopyWritten(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      throw error;
    }
  }, [updateTask]);

  const updateScheduledTaskOptimistic = useCallback(async (taskId, updates) => {
    // Apply optimistic updates immediately
    if (updates.scriptAssigned !== undefined) {
      setOptimisticBuyers(prev => ({
        ...prev,
        [taskId]: updates.scriptAssigned
      }));
    }
    if (updates.status !== undefined) {
      setOptimisticStatuses(prev => ({
        ...prev,
        [taskId]: updates.status
      }));
    }
    if (updates.copyLink !== undefined) {
      setOptimisticCopyLinks(prev => ({
        ...prev,
        [taskId]: updates.copyLink
      }));
    }
    if (updates.copyWritten !== undefined) {
      setOptimisticCopyWritten(prev => ({
        ...prev,
        [taskId]: updates.copyWritten
      }));
    }
    
    try {
      // Call actual update
      await updateScheduledTask(taskId, updates);
    } catch (error) {
      console.error('Error updating scheduled task:', error);
      // Revert optimistic updates on error
      if (updates.scriptAssigned !== undefined) {
        setOptimisticBuyers(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      if (updates.status !== undefined) {
        setOptimisticStatuses(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      if (updates.copyLink !== undefined) {
        setOptimisticCopyLinks(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      if (updates.copyWritten !== undefined) {
        setOptimisticCopyWritten(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }
      throw error;
    }
  }, [updateScheduledTask]);
  
  // Apply optimistic updates to tasks
  const applyOptimisticUpdates = useCallback((tasksList) => {
    return tasksList.map(task => {
      const updates = {};
      if (optimisticStatuses[task.id] !== undefined) {
        updates.status = optimisticStatuses[task.id];
      }
      if (optimisticBuyers[task.id] !== undefined) {
        updates.scriptAssigned = optimisticBuyers[task.id];
      }
      if (optimisticCopyLinks[task.id] !== undefined) {
        updates.copyLink = optimisticCopyLinks[task.id];
      }
      if (optimisticCopyWritten[task.id] !== undefined) {
        updates.copyWritten = optimisticCopyWritten[task.id];
      }
      return Object.keys(updates).length > 0 ? { ...task, ...updates } : task;
    });
  }, [optimisticBuyers, optimisticStatuses, optimisticCopyLinks, optimisticCopyWritten]);
  
  // Update userTasksModal when optimistic state changes
  useEffect(() => {
    setUserTasksModal(prevModal => {
      if (!prevModal || !prevModal.tasks) return prevModal;
      
      const updatedTasks = prevModal.tasks.map(task => {
        const updates = {};
        if (optimisticStatuses[task.id] !== undefined) {
          updates.status = optimisticStatuses[task.id];
        }
        if (optimisticBuyers[task.id] !== undefined) {
          updates.scriptAssigned = optimisticBuyers[task.id];
        }
        if (optimisticCopyLinks[task.id] !== undefined) {
          updates.copyLink = optimisticCopyLinks[task.id];
        }
        if (optimisticCopyWritten[task.id] !== undefined) {
          updates.copyWritten = optimisticCopyWritten[task.id];
        }
        return Object.keys(updates).length > 0 ? { ...task, ...updates } : task;
      });
      
      // Only update if there are actual changes
      const hasChanges = updatedTasks.some((task, index) => {
        const original = prevModal.tasks[index];
        return task.status !== original.status || 
               task.scriptAssigned !== original.scriptAssigned ||
               task.copyLink !== original.copyLink ||
               task.copyWritten !== original.copyWritten;
      });
      
      return hasChanges ? { ...prevModal, tasks: updatedTasks } : prevModal;
    });
  }, [optimisticBuyers, optimisticStatuses, optimisticCopyLinks, optimisticCopyWritten]);
  
  // Debug: Log users and columns on component mount
  useEffect(() => {
    console.log('Tasks Component - Users from context:', users);
    console.log('Tasks Component - Users length:', users?.length);
    console.log('Tasks Component - Current user:', currentUser);
    console.log('Tasks Component - Columns:', columns);
    console.log('Tasks Component - Week column:', columns.find(c => c.key === 'week'));
  }, [users, currentUser, columns]);
  const [showFilters, setShowFilters] = useState(false); // Show filter dropdown
  const [feedbackModal, setFeedbackModal] = useState(null); // { taskId, type: 'copyApproval' | 'adApproval', currentFeedback }
  const [copyLinkModal, setCopyLinkModal] = useState(null); // { taskId, url, currentFeedback, currentApproval }
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards have expanded details {taskId: true/false}
  const [userTasksModal, setUserTasksModal] = useState(null); // { user, tasks } for managing user's tasks
  const [addTaskModal, setAddTaskModal] = useState(null); // { user } for adding new task
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0); // Current ad preview index
  const [uploadingCreatives, setUploadingCreatives] = useState({}); // Track upload progress {taskId-adIndex: progress}
  const [hasActiveUpload, setHasActiveUpload] = useState(false); // Prevent re-renders during upload
  const [dateRangeStart, setDateRangeStart] = useState(''); // Start date for date range filter
  const [dateRangeEnd, setDateRangeEnd] = useState(''); // End date for date range filter
  const [showDatePicker, setShowDatePicker] = useState(false); // Show custom date picker
  const [dateRange, setDateRange] = useState([{
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  }]);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState('all');
  const syncingFromUrlRef = useRef(false);
  const closingModalRef = useRef(false);
  const restoredModalPathRef = useRef('');
  
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    dropdownOptions: [],
  });

  const slugify = (value) => {
    if (!value) return '';
    return value
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getUserSlug = (userId) => {
    const user = users?.find(u => parseInt(u.id) === parseInt(userId));
    return user ? slugify(user.slug || user.name || user.email || user.username || user.id) : '';
  };

  const getCampaignSlug = (campaignId) => {
    const campaign = campaigns?.find(c => parseInt(c.id) === parseInt(campaignId));
    return campaign ? slugify(campaign.slug || campaign.name || campaign.id) : '';
  };

  const getUserIdFromSlug = (slug) => {
    if (!slug) return '';
    const match = users?.find(u => slugify(u.slug || u.name || u.email || u.username || u.id) === slug);
    return match ? String(match.id) : '';
  };

  const getCampaignIdFromSlug = (slug) => {
    if (!slug) return '';
    const match = campaigns?.find(c => slugify(c.slug || c.name || c.id) === slug);
    return match ? String(match.id) : '';
  };

  const buildPreviewLinksForModal = useCallback((modalTasks, user) => {
    if (!Array.isArray(modalTasks) || !modalTasks.length || !user) return [];

    const isVideoEditor = user.department === 'VIDEO EDITING';
    const links = [];

    modalTasks.forEach((task, taskIndex) => {
      const adOffset = modalTasks.slice(0, taskIndex).reduce((sum, prevTask) => {
        const quantity = parseInt(prevTask.quantity?.replace('x', '') || '1', 10);
        return sum + quantity;
      }, 0);

      if (Array.isArray(task.viewerLink)) {
        task.viewerLink.forEach((link, linkIndex) => {
          if (link) {
            const adNumber = adOffset + Math.floor(linkIndex / (isVideoEditor ? 2 : 1)) + 1;
            links.push({
              adNumber,
              linkIndex,
              taskId: task.id,
              campaignId: task.campaignId,
              campaignName: task.campaignName
            });
          }
        });
      }
    });

    return links;
  }, []);

  const applyQuickFilterDates = (filter) => {
    const today = new Date();
    let startDate = null;
    let endDate = null;

    switch (filter) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'yesterday':
        startDate = subDays(today, 1);
        endDate = subDays(today, 1);
        break;
      case 'last7':
        startDate = subDays(today, 7);
        endDate = today;
        break;
      case 'last30':
        startDate = subDays(today, 30);
        endDate = today;
        break;
      default:
        startDate = null;
        endDate = null;
    }

    if (startDate && endDate) {
      setDateRange([{ startDate, endDate, key: 'selection' }]);
      setDateRangeStart(format(startDate, 'yyyy-MM-dd'));
      setDateRangeEnd(format(endDate, 'yyyy-MM-dd'));
    } else {
      setDateRangeStart('');
      setDateRangeEnd('');
    }
  };

  const isModalRoutePath = useCallback((pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    
    // Check for simple /cards/{user_slug} format (2 segments)
    if (segments.length === 2 && segments[0] === 'cards') {
      return true;
    }
    
    // Check for /next-week/cards/{user_slug} format (3 segments)
    if (segments.length === 3 && segments[0] === 'next-week' && segments[1] === 'cards') {
      return true;
    }
    
    return segments.some(segment => segment.startsWith('ad_')) ||
      segments.includes('preview') ||
      segments.includes('versions') ||
      segments.includes('comments') ||
      segments.includes('feedback');
  }, []);

  const parseFiltersFromPath = useCallback(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (!segments.length) return;

    const baseView = segments[0];
    if (baseView === 'this-week') {
      setWeekView('this-week');
    } else if (baseView === 'next-week') {
      setWeekView('next-week');
    } else if (baseView === 'cards') {
      // Legacy support for old URLs
      setWeekView('this-week');
    } else {
      return;
    }

    const isModalPath = isModalRoutePath(location.pathname);
    if (isModalPath) {
      // On deep-link/modal paths, clear campaign and user filters so background shows all
      syncingFromUrlRef.current = true;
      setSelectedCampaign('');
      setSelectedUser('');
      return;
    }

    let nextSelectedUser = '';
    let nextSelectedCampaign = '';
    let nextDateStart = '';
    let nextDateEnd = '';
    let nextQuickFilter = 'all';

    for (let i = 1; i < segments.length; i++) {
      const key = segments[i];
      if (key === 'user' && segments[i + 1]) {
        nextSelectedUser = getUserIdFromSlug(decodeURIComponent(segments[i + 1]));
        i++;
        continue;
      }
      if (key === 'campaign' && segments[i + 1]) {
        nextSelectedCampaign = getCampaignIdFromSlug(decodeURIComponent(segments[i + 1]));
        i++;
        continue;
      }
      if (key === 'date' && segments[i + 1] && segments[i + 2]) {
        nextDateStart = decodeURIComponent(segments[i + 1]);
        nextDateEnd = decodeURIComponent(segments[i + 2]);
        i += 2;
        continue;
      }
      if (key === 'quick' && segments[i + 1]) {
        nextQuickFilter = decodeURIComponent(segments[i + 1]);
        i++;
      }
    }

    syncingFromUrlRef.current = true;
    setSelectedUser(nextSelectedUser || '');
    setSelectedCampaign(nextSelectedCampaign || '');
    setSelectedQuickFilter(nextQuickFilter || 'all');
    if (nextQuickFilter && nextQuickFilter !== 'all') {
      applyQuickFilterDates(nextQuickFilter);
    } else {
      setDateRangeStart(nextDateStart || '');
      setDateRangeEnd(nextDateEnd || '');
    }
  }, [location.pathname, users, campaigns, isModalRoutePath]);

  useEffect(() => {
    parseFiltersFromPath();
  }, [parseFiltersFromPath, location.pathname]);

  // Redirect from root to /this-week
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/this-week', { replace: true });
    }
  }, [location.pathname, navigate]);

  const buildFilterPath = useCallback(() => {
    const basePath = weekView === 'this-week' ? '/this-week' : '/next-week';
    const segments = [];

    if (selectedUser) {
      const slug = getUserSlug(selectedUser);
      if (slug) segments.push('user', encodeURIComponent(slug));
    }

    if (selectedCampaign) {
      const slug = getCampaignSlug(selectedCampaign);
      if (slug) segments.push('campaign', encodeURIComponent(slug));
    }

    if (dateRangeStart && dateRangeEnd) {
      segments.push('date', encodeURIComponent(dateRangeStart), encodeURIComponent(dateRangeEnd));
    }

    if (selectedQuickFilter && selectedQuickFilter !== 'all') {
      segments.push('quick', encodeURIComponent(selectedQuickFilter));
    }

    return segments.length ? `${basePath}/${segments.join('/')}` : basePath;
  }, [weekView, selectedUser, selectedCampaign, dateRangeStart, dateRangeEnd, selectedQuickFilter, users, campaigns]);

  const handleCloseUserTasksModal = useCallback(() => {
    closingModalRef.current = true;
    setUserTasksModal(null);
    const nextPath = buildFilterPath();
    if (location.pathname !== nextPath) {
      navigate(nextPath, { replace: true });
    }
    // Reset the flag after a brief delay to allow navigation to complete
    setTimeout(() => {
      closingModalRef.current = false;
    }, 100);
  }, [buildFilterPath, location.pathname, navigate]);

  useEffect(() => {
    if (syncingFromUrlRef.current) {
      syncingFromUrlRef.current = false;
      return;
    }

    // Keep ad/modal deep-link URLs stable on refresh.
    if (isModalRoutePath(location.pathname)) {
      return;
    }

    if (userTasksModal) {
      return;
    }

    const nextPath = buildFilterPath();
    if (location.pathname !== nextPath) {
      navigate(nextPath, { replace: true });
    }
  }, [buildFilterPath, location.pathname, navigate, userTasksModal, isModalRoutePath]);

  useEffect(() => {
    if (closingModalRef.current) {
      return;
    }
    
    if (userTasksModal) {
      return;
    }

    if (!isModalRoutePath(location.pathname)) {
      restoredModalPathRef.current = '';
      return;
    }

    if (restoredModalPathRef.current === location.pathname) {
      return;
    }

    const segments = location.pathname.split('/').filter(Boolean);
    
    // Determine which data source to use based on URL structure
    let targetWeekView = 'this-week';
    let userSlug, campaignSlug;
    
    if (segments[0] === 'next-week' && segments[1] === 'cards') {
      // Pattern: /next-week/cards/{user_slug}/{campaignSlug}/ad_X/tab (6 segments minimum)
      if (segments.length < 6) return;
      targetWeekView = 'next-week';
      userSlug = decodeURIComponent(segments[2] || '');
      campaignSlug = decodeURIComponent(segments[3] || '');
    } else if (segments[0] === 'cards') {
      // Pattern: /cards/{user_slug}/{campaignSlug}/ad_X/tab (5 segments minimum)
      if (segments.length < 5) return;
      targetWeekView = 'this-week';
      userSlug = decodeURIComponent(segments[1] || '');
      campaignSlug = decodeURIComponent(segments[2] || '');
    } else {
      return;
    }

    const baseView = segments[0];
    if (baseView !== 'this-week' && baseView !== 'next-week' && baseView !== 'cards') {
      return;
    }

    const requestedTab = decodeURIComponent(segments[segments.length - 1] || 'preview').toLowerCase();
    const adSegment = segments.find(segment => segment.startsWith('ad_'));

    if (!userSlug || !campaignSlug || !adSegment) {
      return;
    }

    const adNumber = parseInt(adSegment.replace('ad_', ''), 10);
    if (Number.isNaN(adNumber)) {
      return;
    }

    const userId = getUserIdFromSlug(userSlug);
    const campaignId = getCampaignIdFromSlug(campaignSlug);
    if (!userId || !campaignId) {
      return;
    }

    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
      return;
    }

    // Get appropriate week range based on detected view
    const targetWeekOffset = targetWeekView === 'next-week' ? 1 : 0;
    const targetWeekRange = getWeekDateRange(targetWeekOffset);
    const normalizedDepartment = (user.department || '').trim().toUpperCase();

    // Use correct data source based on week view and apply optimistic updates
    const rawSourceData = targetWeekView === 'this-week' ? tasks : scheduledTasks;
    const sourceData = applyOptimisticUpdates(rawSourceData);
    const modalTasks = sourceData.filter(task => {
      if (String(task.campaignId) !== String(campaignId)) return false;
      if (String(task.assignedTo) !== String(user.id)) return false;
      if (task.week !== targetWeekRange) return false;

      const mediaType = (task.mediaType || task.type || '').toString().toUpperCase();
      if (normalizedDepartment === 'VIDEO EDITING') {
        return mediaType === 'VIDEO';
      }
      if (normalizedDepartment === 'GRAPHIC DESIGN') {
        return mediaType === 'IMAGE';
      }
      return true;
    });

    if (!modalTasks.length) {
      return;
    }

    const previewLinks = buildPreviewLinksForModal(modalTasks, user);
    const previewIndex = Math.max(0, previewLinks.findIndex(link => link.adNumber === adNumber));
    const selectedPreview = previewLinks[previewIndex];

    if (requestedTab === 'feedback' && selectedPreview) {
      const feedbackTask = modalTasks.find(task => String(task.id) === String(selectedPreview.taskId));
      const campaignForFeedback = campaigns.find(c => String(c.id) === String(selectedPreview.campaignId));
      if (feedbackTask) {
        setFeedbackModal({
          taskId: feedbackTask.id,
          columnKey: 'viewerLink',
          itemIndex: selectedPreview.linkIndex,
          currentFeedback: feedbackTask?.viewerLinkFeedback?.[selectedPreview.linkIndex] || '',
          readOnly: false,
          adNumber,
          campaignId: selectedPreview.campaignId,
          campaignName: campaignForFeedback?.name || selectedPreview.campaignName || 'No Campaign',
          userId: user.id
        });
      }
    }

    restoredModalPathRef.current = location.pathname;
    setCurrentPreviewIndex(previewIndex);
    setUserTasksModal({ user, tasks: modalTasks });
  }, [
    userTasksModal,
    location.pathname,
    isModalRoutePath,
    users,
    campaigns,
    tasks,
    scheduledTasks,
    getUserIdFromSlug,
    getCampaignIdFromSlug,
    buildPreviewLinksForModal,
    setFeedbackModal,
    setCurrentPreviewIndex,
    setUserTasksModal,
    applyOptimisticUpdates
  ]);

  // Handle simple /cards/{user_slug} and /next-week/cards/{user_slug} path formats
  useEffect(() => {
    if (closingModalRef.current) {
      return;
    }
    
    if (userTasksModal) {
      return;
    }

    const segments = location.pathname.split('/').filter(Boolean);
    
    let userSlug = null;
    let targetWeekView = 'this-week';
    
    // Check if path is /cards/{user_slug} (exactly 2 segments)
    if (segments.length === 2 && segments[0] === 'cards') {
      userSlug = decodeURIComponent(segments[1]);
      targetWeekView = 'this-week';
    }
    // Check if path is /next-week/cards/{user_slug} (exactly 3 segments)
    else if (segments.length === 3 && segments[0] === 'next-week' && segments[1] === 'cards') {
      userSlug = decodeURIComponent(segments[2]);
      targetWeekView = 'next-week';
    } else {
      return;
    }

    const userId = getUserIdFromSlug(userSlug);
    
    if (!userId) {
      return;
    }

    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
      return;
    }

    // Get current week range based on detected weekView from path
    const targetWeekOffset = targetWeekView === 'next-week' ? 1 : 0;
    const targetWeekRange = getWeekDateRange(targetWeekOffset);
    const normalizedDepartment = (user.department || '').trim().toUpperCase();

    // Get all tasks for this user based on week view and apply optimistic updates
    const rawSourceData = targetWeekView === 'this-week' ? tasks : scheduledTasks;
    const sourceData = applyOptimisticUpdates(rawSourceData);
    const modalTasks = sourceData.filter(task => {
      if (String(task.assignedTo) !== String(user.id)) return false;
      if (task.week !== targetWeekRange) return false;

      const mediaType = (task.mediaType || task.type || '').toString().toUpperCase();
      if (normalizedDepartment === 'VIDEO EDITING') {
        return mediaType === 'VIDEO';
      }
      if (normalizedDepartment === 'GRAPHIC DESIGN') {
        return mediaType === 'IMAGE';
      }
      return true;
    });

    if (!modalTasks.length) {
      return;
    }

    setCurrentPreviewIndex(0);
    setUserTasksModal({ user, tasks: modalTasks });
  }, [location.pathname, userTasksModal, closingModalRef, users, tasks, scheduledTasks, getUserIdFromSlug, setCurrentPreviewIndex, setUserTasksModal, applyOptimisticUpdates]);
  
  // Debounce timer ref for text inputs
  const debounceTimers = useRef({});
  
  // Debounced update function for text inputs - only debounces the webhook call
  const debouncedUpdateTask = useCallback((taskId, columnKey, value) => {
    // Clear existing timer for this field
    const timerKey = `${taskId}-${columnKey}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    
    // Debounce the webhook PATCH request
    debounceTimers.current[timerKey] = setTimeout(() => {
      updateTask(taskId, { [columnKey]: value });
      delete debounceTimers.current[timerKey];
    }, 1000);
  }, [updateTask]);

  // Generate week options
  const weekOptions = useMemo(() => generateWeekOptions(), []);

  const handleCellEdit = async (taskId, columnKey, value, columnType) => {
    // If week is changed to "Next week", move task to scheduled tasks
    if (columnKey === 'week' && value === getWeekDateRange(1)) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Delete from tasks
        await deleteTask(taskId);
        
        // Add to scheduled tasks
        const scheduledTask = {
          ...task,
          week: value,
          updatedAt: new Date().toISOString()
        };
        await addScheduledTask(scheduledTask);
      }
      return;
    }
    
    // If admin/superadmin setting Copy Approval or Ad Approval to "Left feedback", open feedback modal
    if (isAdminUser && (columnKey === 'copyApproval' || columnKey === 'adApproval') && value === 'Left feedback') {
      const task = tasks.find(t => t.id === taskId);
      
      if (columnKey === 'copyApproval') {
        // For copy approval, open the preview modal with feedback sidebar
        setCopyLinkModal({
          taskId,
          url: task?.copyLink || '',
          currentFeedback: task?.copyApprovalFeedback || '',
          currentApproval: value,
          showFeedbackInput: true
        });
      } else {
        // For other approvals (like adApproval), use the regular feedback modal
        const feedbackKey = 'adApprovalFeedback';
        setFeedbackModal({
          taskId,
          type: columnKey,
          currentFeedback: task?.[feedbackKey] || ''
        });
      }
    }
    
    // For text, url, and array fields: debounce the entire update (state + webhook)
    if (columnType === 'text' || columnType === 'url' || columnType === 'array') {
      debouncedUpdateTask(taskId, columnKey, value);
    } else {
      // Immediate update for other field types (dropdowns, checkboxes, etc.)
      updateTask(taskId, { [columnKey]: value });
    }
  };

  const handleSaveFeedback = async (feedback) => {
    if (feedbackModal) {
      let feedbackKey;
      
      // Handle array item feedback
      if (feedbackModal.columnKey && feedbackModal.itemIndex !== undefined) {
        feedbackKey = `${feedbackModal.columnKey}Feedback`;
        const taskSource = weekView === 'this-week' ? tasks : scheduledTasks;
        const task = taskSource.find(t => t.id === feedbackModal.taskId);
        const feedbackArray = task?.[feedbackKey] || [];
        const newFeedbackArray = [...feedbackArray];
        newFeedbackArray[feedbackModal.itemIndex] = feedback;
        
        // If it's viewerLink feedback, also update the approval status
        if (feedbackModal.columnKey === 'viewerLink') {
          // Use helper function to ensure all creative arrays are synchronized
          const syncedArrays = synchronizeCreativeArrays(task, feedbackModal.itemIndex);
          
          // Update the feedback array (already modified above)
          syncedArrays.viewerLinkFeedback = newFeedbackArray;
          
          // Set status based on whether feedback is empty or not
          syncedArrays.viewerLinkApproval[feedbackModal.itemIndex] = feedback.trim() ? 'Left Feedback' : 'Needs Review';
          
          const updateFn = weekView === 'this-week' ? updateTask : updateScheduledTask;
          updateFn(feedbackModal.taskId, { 
            viewerLink: syncedArrays.viewerLink,
            viewerLinkApproval: syncedArrays.viewerLinkApproval,
            viewerLinkFeedback: syncedArrays.viewerLinkFeedback,
            slackPermalink: syncedArrays.slackPermalink,
            viewerLinkApprovalAt: syncedArrays.viewerLinkApprovalAt,
            viewerLinkAt: syncedArrays.viewerLinkAt
          });
          
          // Update modal state if it's open
          if (userTasksModal) {
            const updatedTasks = userTasksModal.tasks.map(t => 
              t.id === feedbackModal.taskId ? { 
                ...t, 
                viewerLink: syncedArrays.viewerLink,
                viewerLinkApproval: syncedArrays.viewerLinkApproval,
                viewerLinkFeedback: syncedArrays.viewerLinkFeedback,
                slackPermalink: syncedArrays.slackPermalink,
                viewerLinkApprovalAt: syncedArrays.viewerLinkApprovalAt,
                viewerLinkAt: syncedArrays.viewerLinkAt
              } : t
            );
            setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
          }

          // Send feedback to n8n webhook
          try {
            const creativeUrl = task?.viewerLink?.[feedbackModal.itemIndex];
            if (creativeUrl) {
              const password = localStorage.getItem('admin_password') || '';
              const today = new Date().toISOString().split('T')[0];
              const hashInput = `${password}${currentUser.email}${today}`;
              const encoder = new TextEncoder();
              const data = encoder.encode(hashInput);
              const hashBuffer = await crypto.subtle.digest('SHA-256', data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const code = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

              await fetch('https://workflows.wearehyrax.com/webhook/add-feedback-to-history', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  code: code,
                  requested_by: currentUser.email,
                  creative_url: creativeUrl,
                  feedback: feedback
                })
              });
            }
          } catch (error) {
            console.error('Error sending feedback to webhook:', error);
          }
        } else {
          const updateFn = weekView === 'this-week' ? updateTask : updateScheduledTask;
          updateFn(feedbackModal.taskId, { [feedbackKey]: newFeedbackArray });
          
          // Update modal state if it's open
          if (userTasksModal) {
            const updatedTasks = userTasksModal.tasks.map(t => 
              t.id === feedbackModal.taskId ? { 
                ...t, 
                [feedbackKey]: newFeedbackArray
              } : t
            );
            setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
          }
        }
      } else {
        // Handle approval column feedback
        feedbackKey = feedbackModal.type === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
        const updateFn = weekView === 'this-week' ? updateTask : updateScheduledTask;
        updateFn(feedbackModal.taskId, { [feedbackKey]: feedback });
        
        // Update modal state if it's open
        if (userTasksModal) {
          const updatedTasks = userTasksModal.tasks.map(t => 
            t.id === feedbackModal.taskId ? { 
              ...t, 
              [feedbackKey]: feedback
            } : t
          );
          setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
        }
      }
      
      setFeedbackModal(null);
    }
  };

  const handleShowFeedback = (task, type) => {
    if (type === 'copyApproval') {
      // For copy approval, show the preview modal with feedback sidebar
      setCopyLinkModal({
        taskId: task.id,
        url: task.copyLink || '',
        currentFeedback: task.copyApprovalFeedback || '',
        currentApproval: task.copyApproval || '',
        showFeedbackInput: canGiveFeedback
      });
    } else {
      // For other types (like adApproval), use the regular feedback modal
      const feedbackKey = type === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
      setFeedbackModal({
        taskId: task.id,
        type,
        currentFeedback: task[feedbackKey] || '',
        readOnly: !canGiveFeedback
      });
    }
  };

  const handleCopyLinkApprove = async () => {
    if (copyLinkModal) {
      const taskId = copyLinkModal.taskId;
      setCopyLinkModal(null);
      const updateFn = weekView === 'this-week' ? updateTask : updateScheduledTask;
      updateFn(taskId, { copyApproval: 'Approved' });
    }
  };

  const handleCopyLinkFeedback = async () => {
    if (copyLinkModal) {
      const taskId = copyLinkModal.taskId;
      const feedback = copyLinkModal.currentFeedback;
      setCopyLinkModal(null);
      const updateFn = weekView === 'this-week' ? updateTask : updateScheduledTask;
      updateFn(taskId, {
        copyApproval: 'Left feedback',
        copyApprovalFeedback: feedback
      });
    }
  };

  const handleCancelUpload = (uploadKey) => {
    // Get the XHR object from global storage
    const xhr = window.HYRAX_ACTIVE_UPLOADS[uploadKey];
    
    if (xhr) {
      console.log('🛑 Canceling upload:', uploadKey);
      xhr.abort();
      
      // Clean up
      delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
      if (activeUploads.current[uploadKey]) {
        delete activeUploads.current[uploadKey];
      }
      
      // Remove from uploading state
      setUploadingCreatives(prev => {
        const newState = { ...prev };
        delete newState[uploadKey];
        return newState;
      });
      
      // Check if there are any remaining active uploads
      if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length === 0) {
        setHasActiveUpload(false);
      }
      
      console.log('✅ Upload canceled successfully');
    } else {
      console.warn('⚠️ No active upload found for:', uploadKey);
    }
  };

  const getMediaDimensions = (file) => {
    return new Promise((resolve) => {
      if (!file || !file.type) {
        resolve({ width: null, height: null });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      let settled = false;

      const finish = (width = null, height = null) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(objectUrl);
        resolve({ width, height });
      };

      const timeout = setTimeout(() => finish(null, null), 10000);

      if (file.type.startsWith('image/')) {
        const image = new Image();
        image.onload = () => {
          clearTimeout(timeout);
          finish(image.naturalWidth || null, image.naturalHeight || null);
        };
        image.onerror = () => {
          clearTimeout(timeout);
          finish(null, null);
        };
        image.src = objectUrl;
        return;
      }

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          finish(video.videoWidth || null, video.videoHeight || null);
        };
        video.onerror = () => {
          clearTimeout(timeout);
          finish(null, null);
        };
        video.src = objectUrl;
        return;
      }

      clearTimeout(timeout);
      finish(null, null);
    });
  };

  const handleCreativeUpload = async (taskId, adIndex, file, taskData, assignedUser, campaign, previousUrl = null) => {
    // Check file size first - must be under 99MB
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 99) {
      alert(`⚠️ File size limit exceeded!\n\nFile: ${file.name}\nSize: ${fileSizeMB.toFixed(2)} MB\n\nMaximum allowed: 99 MB\n\nPlease compress your video and try again.`);
      return;
    }
    
    const uploadKey = `${taskId}-${adIndex}`;
    let lastProgressTime = Date.now();
    let lastProgressBytes = 0;
    
    // Check if upload already in progress
    if (window.HYRAX_ACTIVE_UPLOADS[uploadKey]) {
      console.warn('Upload already in progress for', uploadKey);
      return;
    }
    
    console.log('=== UPLOAD START ===');
    console.log('File:', file.name);
    console.log('Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Type:', file.type);
    console.log('Last Modified:', new Date(file.lastModified).toLocaleString());
    
    // CRITICAL: Browser/System Diagnostics
    console.log('=== SYSTEM DIAGNOSTICS ===');
    console.log('Browser:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    console.log('Memory (if available):', performance.memory ? {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB'
    } : 'Not available');
    console.log('Connection:', navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink + 'Mbps',
      rtt: navigator.connection.rtt + 'ms'
    } : 'Not available');
    console.log('Active uploads count:', Object.keys(window.HYRAX_ACTIVE_UPLOADS).length);
    console.log('======================');
    
    // Check for known browser limitations
    if (fileSizeMB > 3072) {
      alert('⚠️ File exceeds 3GB limit. Maximum supported file size is 3GB.');
      return;
    }

    // All files upload directly to n8n webhook
    const uploadUrl = import.meta.env.VITE_NEW_CREATIVE_FROM_TASKS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/new-creative-from-tasks';
    console.log(`📊 Uploading directly to n8n (file: ${fileSizeMB.toFixed(2)}MB)`);

    try {
      // Mark that an upload is in progress - use global flag
      setHasActiveUpload(true);
      setUploadingCreatives(prev => ({ ...prev, [uploadKey]: 0 }));
      
      // Warn about HMR during development
      if (import.meta.env.DEV) {
        console.warn('⚠️ DEV MODE: DO NOT save/edit code files during upload!');
      }

      const { width: creativeWidth, height: creativeHeight } = await getMediaDimensions(file);
      console.log('Creative dimensions:', {
        width: creativeWidth,
        height: creativeHeight
      });

      // Validate dimensions for video editors
      const uploaderIsVideoEditor = assignedUser?.department === 'VIDEO EDITING';
      if (uploaderIsVideoEditor && creativeWidth && creativeHeight) {
        const aspectRatio = creativeWidth / creativeHeight;
        const formatType = adIndex % 2 === 0 ? 'Facebook' : 'Reel';
        
        // Define acceptable aspect ratios with tolerance
        const tolerance = 0.02; // 2% tolerance for rounding
        const isSquare = Math.abs(aspectRatio - 1.0) < tolerance; // 1:1
        const is4by5 = Math.abs(aspectRatio - 0.8) < tolerance; // 4:5
        const is9by16 = Math.abs(aspectRatio - 0.5625) < tolerance; // 9:16
        
        if (formatType === 'Facebook') {
          // Facebook format: only 1:1 or 4:5
          if (!isSquare && !is4by5) {
            // Clean up upload state
            setUploadingCreatives(prev => {
              const newState = { ...prev };
              delete newState[uploadKey];
              return newState;
            });
            delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
            // Clear active upload flag if no more uploads
            if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length === 0) {
              setHasActiveUpload(false);
            }
            
            alert(`❌ Invalid Aspect Ratio for Facebook Format\n\nFile: ${file.name}\nDimensions: ${creativeWidth}x${creativeHeight}\nAspect Ratio: ${aspectRatio.toFixed(3)}\n\nFacebook format requires:\n• 1:1 (Square)\n• 4:5\n\nPlease re-export your video in the correct aspect ratio.`);
            return;
          }
        } else {
          // Reel format: only 9:16
          if (!is9by16) {
            // Clean up upload state
            setUploadingCreatives(prev => {
              const newState = { ...prev };
              delete newState[uploadKey];
              return newState;
            });
            delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
            // Clear active upload flag if no more uploads
            if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length === 0) {
              setHasActiveUpload(false);
            }
            
            alert(`❌ Invalid Aspect Ratio for Reel Format\n\nFile: ${file.name}\nDimensions: ${creativeWidth}x${creativeHeight}\nAspect Ratio: ${aspectRatio.toFixed(3)}\n\nReel format requires:\n• 9:16 (Vertical)\n\nPlease re-export your video in the correct aspect ratio.`);
            return;
          }
        }
        
        console.log(`✅ Aspect ratio validation passed for ${formatType} format`);
      }

      const resolveUploaderUserId = () => {
        const email = `${currentUser?.email || ''}`.toLowerCase();

        try {
          const cachedUsers = JSON.parse(localStorage.getItem('hyrax_users') || '[]');
          if (Array.isArray(cachedUsers) && email) {
            const matchedUser = cachedUsers.find(user =>
              `${user?.email || ''}`.toLowerCase() === email
            );
            if (matchedUser?.id !== undefined && matchedUser?.id !== null && `${matchedUser.id}`.trim() !== '') {
              return `${matchedUser.id}`;
            }
          }
        } catch (error) {
          console.warn('Failed to resolve uploader ID from cached users:', error);
        }

        if (currentUser?.id !== undefined && currentUser?.id !== null && `${currentUser.id}`.trim() !== '') {
          return `${currentUser.id}`;
        }

        return '';
      };

      const uploaderUserId = resolveUploaderUserId();
      
      // Construct path for webhook
      const userSlug = assignedUser ? slugify(assignedUser.name || assignedUser.id) : '';
      const campaignSlug = campaign ? slugify(campaign.name || campaign.id) : '';
      const isVideoEditor = assignedUser?.department === 'VIDEO EDITING';
      const adNumber = Math.floor(adIndex / (isVideoEditor ? 2 : 1)) + 1;
      const path = `/${userSlug}/${campaignSlug}/ad_${adNumber}/preview`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);
      formData.append('adIndex', adIndex);
      formData.append('path', path);
      if (creativeWidth && creativeHeight) {
        formData.append('creative_width', String(creativeWidth));
        formData.append('creative_height', String(creativeHeight));
      }
      
      // Add assigned user details (person on the card)
      if (assignedUser) {
        formData.append('assignedUserId', assignedUser.id);
        formData.append('assignedUserName', assignedUser.name);
        formData.append('assignedUserDepartment', assignedUser.department || '');
      }
      
      // Add campaign details
      if (campaign) {
        formData.append('campaignId', campaign.id);
        formData.append('campaignName', campaign.name);
      }
      
      // Add current user details (person who uploaded)
      formData.append('uploadedByUserId', uploaderUserId);
      formData.append('uploadedByUserName', currentUser.name);
      formData.append('uploadedByUserRole', currentUser.role || '');
      
      // Add task details
      if (taskData) {
        formData.append('taskTitle', taskData.title || '');
        formData.append('taskDueDate', taskData.dueDate || '');
        formData.append('taskQuantity', taskData.quantity || '');
      }
      
      console.log('FormData prepared with', Array.from(formData.keys()).length, 'fields');
      
      // Use fetch with keepalive for better reliability with large files
      const startTime = Date.now();
      
      // Create abort controller for timeout management
      const controller = new AbortController();
      // Calculate timeout based on file size: 1MB/sec upload speed + 5min buffer, minimum 15 minutes
      const estimatedUploadSeconds = (file.size / 1024 / 1024); // Assume 1MB/sec
      const timeoutSeconds = Math.max(900, estimatedUploadSeconds + 300); // 15 min minimum, or estimated time + 5 min buffer
      console.log('Timeout set to:', Math.round(timeoutSeconds / 60), 'minutes', `(file: ${(file.size / 1024 / 1024).toFixed(0)}MB)`);
      
      const timeoutId = setTimeout(() => {
        console.error('Upload timeout reached');
        controller.abort();
      }, timeoutSeconds * 1000);
      
      // Track progress using XHR wrapped in fetch-like API
      const uploadPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        console.log('🔧 Creating XHR object...');
        console.log('XHR created, ready state:', xhr.readyState);
        
        // Store xhr reference GLOBALLY to prevent HMR/re-render from destroying it
        window.HYRAX_ACTIVE_UPLOADS[uploadKey] = xhr;
        activeUploads.current[uploadKey] = xhr;
        
        console.log('📝 XHR stored in global window object');
        
        // Monitor ALL state changes
        xhr.addEventListener('readystatechange', () => {
          console.log('🔄 Ready state changed:', xhr.readyState, [
            'UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'
          ][xhr.readyState]);
        });
        
        // Progress tracking
        let lastLogTime = Date.now();
        let progressEventCount = 0;
        
        xhr.upload.addEventListener('loadstart', (e) => {
          console.log('🚀 UPLOAD.loadstart event fired!');
          console.log('Upload started at:', new Date().toLocaleTimeString());
          setUploadingCreatives(prev => ({ ...prev, [uploadKey]: 1 }));
        });
        
        xhr.upload.addEventListener('progress', (e) => {
          progressEventCount++;
          const now = Date.now();
          
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            const uploadedMB = (e.loaded / 1024 / 1024).toFixed(2);
            const totalMB = (e.total / 1024 / 1024).toFixed(2);
            
            // Calculate speed
            const timeDiff = (now - lastProgressTime) / 1000; // seconds
            const bytesDiff = e.loaded - lastProgressBytes;
            const speedMBps = timeDiff > 0 ? (bytesDiff / 1024 / 1024 / timeDiff).toFixed(2) : 0;
            
            // Log every 5% or every 3 seconds
            if (percentComplete % 5 === 0 || now - lastLogTime > 3000) {
              console.log(`📤 ${percentComplete}% (${uploadedMB}/${totalMB}MB) | Speed: ${speedMBps}MB/s`);
              lastLogTime = now;
            }
            
            setUploadingCreatives(prev => ({ ...prev, [uploadKey]: Math.min(percentComplete, 99) }));
            
            lastProgressTime = now;
            lastProgressBytes = e.loaded;
          } else {
            console.warn('⚠️ Progress event but length not computable');
          }
        });
        
        xhr.upload.addEventListener('load', () => {
          console.log('✅ UPLOAD.load - Upload data sent completely, waiting for server response...');
          setUploadingCreatives(prev => ({ ...prev, [uploadKey]: 99 }));
        });
        
        xhr.upload.addEventListener('error', (e) => {
          console.error('❌ UPLOAD.error event:', e);
        });
        
        xhr.upload.addEventListener('abort', (e) => {
          console.error('❌ UPLOAD.abort event:', e);
          console.error('Abort triggered at progress:', progressEventCount, 'events');
          console.error('Last bytes uploaded:', lastProgressBytes);
        });
        
        xhr.addEventListener('loadstart', () => {
          console.log('🚀 XHR.loadstart event fired');
        });
        
        xhr.addEventListener('load', () => {
          clearTimeout(timeoutId);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ Server responded in ${elapsed}s with status: ${xhr.status}`);
          console.log('Response headers:', xhr.getAllResponseHeaders());
          
          // Clean up global reference
          delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
          
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Response:', xhr.responseText.substring(0, 500));
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (e) {
              console.warn('Response is not JSON, treating as success');
              resolve({});
            }
          } else if (xhr.status === 413) {
            // 413 Payload Too Large
            console.error('❌ Upload failed: File too large for server');
            console.error('Response:', xhr.responseText);
            console.error('File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
            reject(new Error(`File too large for webhook server. The n8n webhook has a size limit. File: ${(file.size / 1024 / 1024).toFixed(2)}MB. Contact admin to increase webhook body size limit.`));
          } else {
            console.error('❌ Upload failed with status:', xhr.status);
            console.error('Response:', xhr.responseText);
            console.error('Response headers:', xhr.getAllResponseHeaders());
            reject(new Error(`Server returned status ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
          console.error('❌ XHR.error event');
          console.error('Event details:', e);
          console.error('Ready state:', xhr.readyState);
          console.error('Status:', xhr.status);
          console.error('Status text:', xhr.statusText);
          reject(new Error('Network error - connection lost or server unreachable'));
        });
        
        xhr.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
          console.error('❌ XHR.abort event');
          console.error('⚠️ ABORT DETAILS:');
          console.error('  - Ready state:', xhr.readyState);
          console.error('  - Status:', xhr.status);
          console.error('  - Progress events received:', progressEventCount);
          console.error('  - Bytes uploaded:', lastProgressBytes, '/', file.size);
          console.error('  - Time elapsed:', ((Date.now() - startTime) / 1000).toFixed(1), 'seconds');
          console.error('  - Active uploads before abort:', Object.keys(window.HYRAX_ACTIVE_UPLOADS).length);
          
          // Try to detect what triggered the abort
          console.error('🔍 ABORT CAUSE DETECTION:');
          if (progressEventCount === 0) {
            console.error('  ❌ NO progress events - upload never started');
            console.error('  Possible causes: CORS preflight failed, network blocked, or browser canceled');
          } else if (lastProgressBytes < file.size * 0.1) {
            console.error('  ❌ Aborted early (< 10% uploaded)');
            console.error('  Possible causes: Connection dropped, server rejected, or browser memory issue');
          } else {
            console.error('  ❌ Aborted mid-upload');
            console.error('  Possible causes: Component re-render, HMR, or user action');
          }
          
          // Check if any other code might have aborted it
          console.trace('Abort stack trace');
          
          reject(new Error(`Upload aborted after ${((Date.now() - startTime) / 1000).toFixed(1)}s (${progressEventCount} progress events, ${(lastProgressBytes / 1024 / 1024).toFixed(2)}MB uploaded)`));
        });
        
        xhr.addEventListener('timeout', () => {
          clearTimeout(timeoutId);
          delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
          console.error('❌ XHR timeout');
          reject(new Error(`Upload timeout after ${Math.round(timeoutSeconds / 60)} minutes`));
        });
        
        // Build URL with query parameters for replace operation
        let finalUploadUrl = uploadUrl;
        if (previousUrl) {
          const urlParams = new URLSearchParams();
          urlParams.append('previous_url', previousUrl);
          // new_url will be set by the webhook after upload completes
          finalUploadUrl = `${uploadUrl}?${urlParams.toString()}`;
          console.log('🔄 Replace mode - previous_url:', previousUrl);
        }
        
        xhr.open('POST', finalUploadUrl, true);
        console.log('✅ XHR.open() called to:', finalUploadUrl, '| ready state:', xhr.readyState);
        
        xhr.timeout = timeoutSeconds * 1000;
        console.log('⏱️ Timeout set to:', timeoutSeconds, 'seconds');
        
        console.log('📡 About to call xhr.send()...');
        console.log('FormData size estimate:', file.size + 1000, 'bytes'); // file + metadata
        console.log('Browser:', navigator.userAgent);
        
        try {
          xhr.send(formData);
          console.log('✅ xhr.send() called successfully, ready state:', xhr.readyState);
        } catch (e) {
          console.error('❌ xhr.send() threw an error:', e);
          reject(e);
        }
        
        console.log('⏳ Waiting for upload to start...');
        
        // Safety check - if no progress after 10 seconds, something is wrong
        setTimeout(() => {
          if (progressEventCount === 0) {
            console.error('❌ NO PROGRESS EVENTS after 10 seconds!');
            console.error('Ready state:', xhr.readyState);
            console.error('Status:', xhr.status);
            console.error('This might indicate:');
            console.error('  - Browser is buffering large file');
            console.error('  - CORS preflight blocking');
            console.error('  - Network issue');
            console.error('  - File too large for browser');
            console.error('  - Server not responding to POST');
            
            // Try to get network info
            if (performance.getEntriesByType) {
              const resources = performance.getEntriesByType('resource');
              const recentRequests = resources.slice(-5);
              console.log('Recent network requests:', recentRequests.map(r => ({
                name: r.name,
                duration: r.duration,
                transferSize: r.transferSize
              })));
            }
          }
        }, 10000);
        
        // Monitor for unexpected re-renders during upload
        const renderCheckInterval = setInterval(() => {
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            console.log('⏱️ Upload still active - Progress events:', progressEventCount, 
                       '| Bytes:', (lastProgressBytes / 1024 / 1024).toFixed(2), 'MB',
                       '| State:', xhr.readyState);
            
            // Check if the XHR is still in global storage
            if (!window.HYRAX_ACTIVE_UPLOADS[uploadKey]) {
              console.error('⚠️ WARNING: XHR removed from global storage during upload!');
            }
          } else {
            clearInterval(renderCheckInterval);
          }
        }, 5000); // Check every 5 seconds
      });
      
      const result = await uploadPromise;
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgSpeed = ((file.size / 1024 / 1024) / totalTime).toFixed(2);
      console.log(`✅ UPLOAD SUCCESS in ${totalTime}s (avg ${avgSpeed}MB/s)`);
      
      // Update upload progress to 100%
      setUploadingCreatives(prev => ({ ...prev, [uploadKey]: 100 }));
      
      // Clear upload state after a short delay
      setTimeout(() => {
        setUploadingCreatives(prev => {
          const newState = { ...prev };
          delete newState[uploadKey];
          return newState;
        });
        // Remove from active uploads
        delete activeUploads.current[uploadKey];
        delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
        // Clear active upload flag if no more uploads
        if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length === 0) {
          setHasActiveUpload(false);
        }
      }, 2000);
      
      // Extract URL and slack permalink from n8n response
      // n8n returns JSON body with "url" field containing the video/image URL
      // and "slackPermalink" field containing the Slack message permalink
      const uploadedUrl = result.url || result.data?.url || result.viewerLink || result.data?.viewerLink;
      const slackPermalink = result.slackPermalink || result.data?.slackPermalink || '';
      
      if (uploadedUrl) {
        console.log('✅ Received URL from n8n:', uploadedUrl);
        if (slackPermalink) {
          console.log('✅ Received Slack permalink:', slackPermalink);
        }
        
        const task = tasks.find(t => t.id === taskId);
        
        // Use helper function to ensure all creative arrays are synchronized
        const syncedArrays = synchronizeCreativeArrays(task, adIndex);
        
        // Update the specific index with new values
        syncedArrays.viewerLink[adIndex] = uploadedUrl;
        syncedArrays.viewerLinkApproval[adIndex] = 'Needs Review'; // Auto-set to Needs Review after upload
        syncedArrays.viewerLinkFeedback[adIndex] = ''; // Clear feedback on new/replacement upload
        syncedArrays.slackPermalink[adIndex] = slackPermalink; // Store Slack permalink
        syncedArrays.viewerLinkApprovalAt[adIndex] = null; // Clear approval timestamp on new upload
        // Note: viewerLinkAt is set by the webhook, so we don't modify it here
        
        // Prepare additional query parameters
        const queryParams = {
          new_url: uploadedUrl
        };
        if (previousUrl) {
          queryParams.previous_url = previousUrl;
        }
        
        // Update task with all synchronized arrays
        const updateFn = weekView === 'this-week' ? updateTask : updateScheduledTask;
        updateFn(taskId, { 
          viewerLink: syncedArrays.viewerLink,
          viewerLinkApproval: syncedArrays.viewerLinkApproval,
          viewerLinkFeedback: syncedArrays.viewerLinkFeedback,
          slackPermalink: syncedArrays.slackPermalink,
          viewerLinkApprovalAt: syncedArrays.viewerLinkApprovalAt,
          viewerLinkAt: syncedArrays.viewerLinkAt,
          status: 'Needs Review' // Auto-update task status when creative is uploaded
        }, queryParams);
        
        // Update modal state if it's open
        if (userTasksModal) {
          const updatedTasks = userTasksModal.tasks.map(t => 
            t.id === taskId ? { 
              ...t, 
              viewerLink: syncedArrays.viewerLink,
              viewerLinkApproval: syncedArrays.viewerLinkApproval,
              viewerLinkFeedback: syncedArrays.viewerLinkFeedback,
              slackPermalink: syncedArrays.slackPermalink,
              viewerLinkApprovalAt: syncedArrays.viewerLinkApprovalAt,
              viewerLinkAt: syncedArrays.viewerLinkAt,
              status: 'Needs Review' // Auto-update task status when creative is uploaded
            } : t
          );
          setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
        }
        
        console.log('✅ Task updated with viewer link at index', adIndex, 'creative status and task status set to Needs Review');
      } else {
        // Empty response from n8n - workflow issue
        console.error('❌ Empty response from n8n workflow');
        
        const errorMessage = `❌ Backend Processing Error

The upload completed but the workflow failed to process it correctly.

File: ${file?.name}
Size: ${(file?.size / 1024 / 1024).toFixed(2)}MB

📝 What to do:
1. Please re-upload the creative
2. If this happens repeatedly, contact Max

This usually indicates a temporary workflow issue.`;
        
        alert(errorMessage);
        
        // Clean up upload state
        setUploadingCreatives(prev => {
          const newState = { ...prev };
          delete newState[uploadKey];
          return newState;
        });
        
        // Remove from active uploads
        delete activeUploads.current[uploadKey];
        delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
        
        // Clear active upload flag if no more uploads
        if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length === 0) {
          setHasActiveUpload(false);
        }
        
        return; // Exit early, don't continue to catch block
      }
      
    } catch (error) {
      console.error('=== UPLOAD FAILED ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('File:', file?.name, '|', (file?.size / 1024 / 1024).toFixed(2), 'MB');
      console.error('Type:', file?.type);
      console.error('==================');
      
      // Determine if it's a server issue
      const isServerIssue = error.message.includes('status 5') || 
                           error.message.includes('timeout') || 
                           error.message.includes('Server');
      
      let userMessage = `❌ Upload Failed\n\n${error.message}\n\nFile: ${file?.name}\nSize: ${(file?.size / 1024 / 1024).toFixed(2)}MB`;
      
      if (isServerIssue && file.size > 100 * 1024 * 1024) { // > 100MB
        userMessage += '\n\n⚠️ LARGE FILE DETECTED\nThe webhook server may not support files this large.\n\nSolutions:\n1. Compress the video\n2. Use a lower resolution/bitrate\n3. Contact the webhook administrator';
      }
      
      userMessage += '\n\nCheck console (F12) for technical details.';
      
      alert(userMessage);
      
      setUploadingCreatives(prev => {
        const newState = { ...prev };
        delete newState[uploadKey];
        return newState;
      });
      // Remove from active uploads
      delete activeUploads.current[uploadKey];
      delete window.HYRAX_ACTIVE_UPLOADS[uploadKey];
      // Clear active upload flag if no more uploads
      if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length === 0) {
        setHasActiveUpload(false);
      }
    }
  };
  
  // Cleanup active uploads on component unmount (NOT on re-render)
  useEffect(() => {
    return () => {
      // Only abort if component is actually unmounting (navigating away)
      console.log('Cleanup effect - checking global uploads:', Object.keys(window.HYRAX_ACTIVE_UPLOADS).length);
      
      // Only abort if the component is truly unmounting, not just re-rendering
      setTimeout(() => {
        const path = window.location.pathname;
        const isTasksRoute = path === '/' || path.startsWith('/this-week') || path.startsWith('/next-week') || path.startsWith('/cards');
        if (!isTasksRoute) {
          console.log('User navigated away - aborting uploads');
          Object.entries(window.HYRAX_ACTIVE_UPLOADS).forEach(([key, xhr]) => {
            if (xhr && xhr.readyState !== XMLHttpRequest.DONE) {
              console.log('Aborting upload:', key);
              xhr.abort();
            }
          });
          // Clear all global uploads
          window.HYRAX_ACTIVE_UPLOADS = {};
        } else {
          console.log('Still on tasks page - keeping uploads alive');
        }
      }, 100);
    };
  }, []); // Empty deps - only run on true mount/unmount

  // Date picker helper functions
  const handleQuickFilter = (filter) => {
    setSelectedQuickFilter(filter);
    applyQuickFilterDates(filter);
    if (filter === 'all') {
      setShowDatePicker(false);
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
      status: newTask.status || 'approved',
      priority: newTask.priority || 'normal',
      createdAt: new Date().toISOString(),
      week: newTask.week || getCurrentWeekDateRange() // Default to current week date range
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      week: task.week || getCurrentWeekDateRange() // Keep same week or default to current
    };
    addTask(duplicatedTask);
  };

  const handleDuplicateSelectedTasks = () => {
    const tasksToDuplicate = tasks.filter(task => selectedTasks.has(task.id));
    const duplicatedTasksData = tasksToDuplicate.map(task => ({
      ...task,
      id: undefined, // Will be assigned by addTasks
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      week: task.week || getCurrentWeekDateRange() // Keep same week or default to current
    }));
    addTasks(duplicatedTasksData);
    setSelectedTasks(new Set());
  };

  const handleDeleteSelectedTasks = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''}?`)) {
      const taskIdsArray = Array.from(selectedTasks);
      deleteTasks(taskIdsArray);
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
        left_feedback: 'bg-orange-100 text-orange-700 border-orange-200',
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
    // Select data source based on week view and apply optimistic updates
    const rawSourceData = weekView === 'this-week' ? tasks : scheduledTasks;
    const sourceData = applyOptimisticUpdates(rawSourceData);
    
    // When on a modal/deep-link path, show ALL tasks in background (no filtering)
    const isDeepLink = isModalRoutePath(location.pathname);
    if (isDeepLink) {
      return sourceData;
    }

    let filtered = sourceData;

    // Week filter is now handled by the backend via query parameter
    // No need to filter by week on the frontend

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

    // Apply campaign filter
    if (selectedCampaign) {
      filtered = filtered.filter(task => task.campaignId === parseInt(selectedCampaign));
    }

    // Apply user filter
    if (selectedUser) {
      filtered = filtered.filter(task => task.assignedTo === parseInt(selectedUser));
    }

    return filtered;
  }, [tasks, scheduledTasks, weekView, selectedCampaign, selectedUser, dateRangeStart, dateRangeEnd, location.pathname, isModalRoutePath, applyOptimisticUpdates]);

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
          <div className="flex items-center space-x-2">
            <input
              key={`${task.id}-${column.key}`}
              type="text"
              defaultValue={value || (column.key === 'quantity' ? 'x1' : '')}
              onChange={(e) => handleChange(e.target.value)}
              className={`${column.key === 'quantity' ? 'max-w-[60px]' : 'w-full'} px-3 py-2 text-sm bg-white text-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300`}
              placeholder={column.key === 'quantity' ? 'x1' : column.name}
            />
            {column.key === 'copyLink' && value && !isNewTask && (
              <button
                onClick={() => setCopyLinkModal({
                  taskId: task.id,
                  url: value,
                  currentFeedback: task.copyApprovalFeedback || '',
                  currentApproval: task.copyApproval || '',
                  showFeedbackInput: true
                })}
                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                title="Open and review"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
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
            left_feedback: 'bg-orange-100 text-orange-700',
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
  if (tasksLoading || campaignsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="p-8 flex-shrink-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">
                Tasks
              </h1>
              <p className="text-gray-600 mt-2">Manage all tasks in a powerful spreadsheet view</p>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
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
        </div>
      
      {/* Column Manager Modal */}
      <ColumnManagerModal
        showColumnManager={showColumnManager && isAdminUser}
        setShowColumnManager={setShowColumnManager}
        columns={columns}
        onAddColumn={addColumn}
        onUpdateColumn={updateColumn}
        onDeleteColumn={deleteColumn}
      />

      {/* Toolbar - Buttons above table */}
      <div className="mb-4 px-8 flex items-center justify-between">
        {/* Left side - View Toggles */}
        <div className="flex items-center space-x-3">
          {/* Week View Toggle - This Week / Next Week */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => navigate('/this-week', { replace: true })}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                weekView === 'this-week' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>This Week</span>
            </button>
            <button
              onClick={() => navigate('/next-week', { replace: true })}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                weekView === 'next-week' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Next Week</span>
            </button>
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
      <div className="space-y-8 p-6">
          {/* ALL DEPARTMENTS */}
          {(() => {
            const usersWithWebhookTasks = users.filter(user =>
              filteredTasks.some(task => String(task.assignedTo) === String(user.id))
            );

            let visibleUsers;
            if (isManager(currentUser?.role)) {
              visibleUsers = usersWithWebhookTasks;
            } else {
              const currentUserFromWebhook = users.filter(
                user => String(user.id) === String(currentUser?.id)
              );

              if (currentUserFromWebhook.length > 0) {
                visibleUsers = currentUserFromWebhook;
              } else if (currentUser?.id !== undefined && currentUser?.id !== null) {
                visibleUsers = [
                  {
                    id: currentUser.id,
                    name: currentUser.name || 'My Tasks',
                    department: currentUser.department || 'UNASSIGNED'
                  }
                ];
              } else {
                visibleUsers = [];
              }
            }

            const usersByDepartment = visibleUsers.reduce((acc, user) => {
              const department = (user.department || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED';
              if (!acc[department]) {
                acc[department] = [];
              }
              acc[department].push(user);
              return acc;
            }, {});

            return Object.entries(usersByDepartment).map(([department, departmentUsers]) => {
              if (!departmentUsers.length) return null;

              return (
                <div key={department} className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">{department}</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {departmentUsers.map(user => {
                      const userTasks = filteredTasks.filter(
                        task => String(task.assignedTo) === String(user.id)
                      );

                    return (
                      <UserTaskCard
                        key={user.id}
                        user={user}
                        userTasks={userTasks}
                        campaigns={campaigns}
                        users={users}
                        currentUser={currentUser}
                        updateTask={weekView === 'this-week' ? updateTaskOptimistic : updateScheduledTaskOptimistic}
                        deleteTask={weekView === 'this-week' ? deleteTask : deleteScheduledTask}
                        weekView={weekView}
                        onAddTaskClick={() => setAddTaskModal({ user })}
                        onClick={(user, tasks) => {
                          // Don't set modal here - let the useEffect handle it based on URL
                          // This ensures the correct data source (tasks vs scheduledTasks) is used
                          const userSlug = getUserSlug(user.id) || 'user';
                          const isNextWeek = location.pathname.startsWith('/next-week');
                          const cardsPath = isNextWeek ? `/next-week/cards/${userSlug}` : `/cards/${userSlug}`;
                          navigate(cardsPath, { replace: true });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Copy Link Preview Modal */}
      <CopyLinkPreviewModal
        copyLinkModal={copyLinkModal}
        setCopyLinkModal={setCopyLinkModal}
        canGiveFeedback={canGiveFeedback}
        onApprove={handleCopyLinkApprove}
        onFeedback={handleCopyLinkFeedback}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        feedbackModal={feedbackModal}
        setFeedbackModal={setFeedbackModal}
        onSaveFeedback={handleSaveFeedback}
      />

      {/* User Tasks Management Modal */}
      <UserTasksModal
        userTasksModal={userTasksModal}
        setUserTasksModal={setUserTasksModal}
        currentUser={currentUser}
        campaigns={campaigns}
        users={users}
        currentPreviewIndex={currentPreviewIndex}
        setCurrentPreviewIndex={setCurrentPreviewIndex}
        uploadingCreatives={uploadingCreatives}
        setFeedbackModal={setFeedbackModal}
        updateTask={weekView === 'this-week' ? updateTaskOptimistic : updateScheduledTaskOptimistic}
        deleteTask={weekView === 'this-week' ? deleteTask : deleteScheduledTask}
        handleCreativeUpload={handleCreativeUpload}
        handleCancelUpload={handleCancelUpload}
        onClose={handleCloseUserTasksModal}
        isFeedbackModalOpen={Boolean(feedbackModal && feedbackModal.columnKey === 'viewerLink')}
        onAddTaskClick={() => {
          if (userTasksModal) {
            setAddTaskModal({ user: userTasksModal.user });
          }
        }}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={Boolean(addTaskModal)}
        onClose={() => setAddTaskModal(null)}
        user={addTaskModal?.user}
        campaigns={campaigns}
        users={users}
        weekView={weekView}
        onAddTask={async (taskData) => {
          // Call appropriate function based on current view
          if (weekView === 'this-week') {
            await addTask(taskData);
          } else {
            await addScheduledTask(taskData);
          }
          // No reload needed - add functions already update local state
        }}
      />
    </div>
  );
};

export default Tasks;
