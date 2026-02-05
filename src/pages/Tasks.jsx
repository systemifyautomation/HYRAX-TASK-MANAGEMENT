import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Settings, Trash2, Check, X, Calendar, FolderOpen, Grid3X3, Copy, ChevronLeft, ChevronRight, Filter, AlertCircle, LayoutGrid, ExternalLink, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, getWeek, addWeeks, subWeeks, isWithinInterval, startOfDay, endOfDay, subDays, parseISO, differenceInWeeks } from 'date-fns';
import { isAdmin, isSuperAdmin, USER_ROLES } from '../constants/roles';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import UserTaskCard from '../components/UserTaskCard';

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

const Tasks = () => {
  const { currentUser, tasks, setTasks, users, campaigns, tasksLoading, campaignsLoading, loadTasksFromWebhook, loadCampaignsData, addTask, addTasks, updateTask, deleteTask, deleteTasks, addScheduledTask, columns, addColumn, updateColumn, deleteColumn, loadUsers } = useApp();
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
  const [displayType, setDisplayType] = useState('list'); // 'list', 'cards' - display mode
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedUser, setSelectedUser] = useState(''); // Filter by user
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekDateRange()); // Default to 'This week'
  
  // Load tasks and campaigns data when component mounts
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      // CRITICAL: Do not reload if uploads are in progress
      if (Object.keys(window.HYRAX_ACTIVE_UPLOADS).length > 0) {
        console.warn('⚠️ Skipping data reload - uploads in progress');
        return;
      }
      
      if (mounted) {
        // Store current page and week for background refresh
        localStorage.setItem('hyrax_current_page', 'tasks');
        localStorage.setItem('hyrax_current_week', selectedWeek);
        
        await loadTasksFromWebhook(null, selectedWeek !== 'all' ? selectedWeek : null);
        await loadCampaignsData();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
      // Clear page marker when leaving
      if (localStorage.getItem('hyrax_current_page') === 'tasks') {
        localStorage.removeItem('hyrax_current_page');
        localStorage.removeItem('hyrax_current_week');
      }
    };
  }, [selectedWeek]);
  
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
  const [cardCampaignFilters, setCardCampaignFilters] = useState({}); // Campaign filters for each card
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards have expanded details {taskId: true/false}
  const [userTasksModal, setUserTasksModal] = useState(null); // { user, tasks } for managing user's tasks
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
  
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text',
    dropdownOptions: [],
  });
  
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
        
        // If it's viewerLink feedback, also update the approval status to "Needs Review"
        if (feedbackModal.columnKey === 'viewerLink') {
          const approvalArray = task?.viewerLinkApproval || [];
          const newApprovalArray = [...approvalArray];
          while (newApprovalArray.length <= feedbackModal.itemIndex) {
            newApprovalArray.push('Not Done');
          }
          newApprovalArray[feedbackModal.itemIndex] = 'Needs Review';
          
          updateTask(feedbackModal.taskId, { 
            [feedbackKey]: newFeedbackArray,
            viewerLinkApproval: newApprovalArray
          });
          
          // Update modal state if it's open
          if (userTasksModal) {
            const updatedTasks = userTasksModal.tasks.map(t => 
              t.id === feedbackModal.taskId ? { 
                ...t, 
                [feedbackKey]: newFeedbackArray,
                viewerLinkApproval: newApprovalArray
              } : t
            );
            setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
          }
        } else {
          updateTask(feedbackModal.taskId, { [feedbackKey]: newFeedbackArray });
        }
      } else {
        // Handle approval column feedback
        feedbackKey = feedbackModal.type === 'copyApproval' ? 'copyApprovalFeedback' : 'adApprovalFeedback';
        updateTask(feedbackModal.taskId, { [feedbackKey]: feedback });
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
      updateTask(taskId, { copyApproval: 'Approved' });
    }
  };

  const handleCopyLinkFeedback = async () => {
    if (copyLinkModal) {
      const taskId = copyLinkModal.taskId;
      const feedback = copyLinkModal.currentFeedback;
      setCopyLinkModal(null);
      updateTask(taskId, {
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

  const handleCreativeUpload = async (taskId, adIndex, file, taskData, assignedUser, campaign) => {
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
    const uploadUrl = 'https://workflows.wearehyrax.com/webhook/new-creative-from-tasks';
    console.log(`📊 Uploading directly to n8n (file: ${fileSizeMB.toFixed(2)}MB)`);

    try {
      // Mark that an upload is in progress - use global flag
      setHasActiveUpload(true);
      setUploadingCreatives(prev => ({ ...prev, [uploadKey]: 0 }));
      
      // Warn about HMR during development
      if (import.meta.env.DEV) {
        console.warn('⚠️ DEV MODE: DO NOT save/edit code files during upload!');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);
      formData.append('adIndex', adIndex);
      
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
      formData.append('uploadedByUserId', currentUser.id);
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
        
        xhr.open('POST', uploadUrl, true);
        console.log('✅ XHR.open() called to:', uploadUrl, '| ready state:', xhr.readyState);
        
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
      
      // Extract URL from n8n response
      // n8n returns JSON body with "url" field containing the video/image URL
      const uploadedUrl = result.url || result.data?.url || result.viewerLink || result.data?.viewerLink;
      
      if (uploadedUrl) {
        console.log('✅ Received URL from n8n:', uploadedUrl);
        
        const task = tasks.find(t => t.id === taskId);
        const updatedViewerLinks = Array.isArray(task.viewerLink) ? [...task.viewerLink] : [];
        const updatedApprovals = Array.isArray(task.viewerLinkApproval) ? [...task.viewerLinkApproval] : [];
        
        while (updatedViewerLinks.length <= adIndex) {
          updatedViewerLinks.push('');
        }
        
        while (updatedApprovals.length <= adIndex) {
          updatedApprovals.push('Not Done');
        }
        
        updatedViewerLinks[adIndex] = uploadedUrl;
        updatedApprovals[adIndex] = 'Needs Review'; // Auto-set to Needs Review after upload
        
        updateTask(taskId, { 
          viewerLink: updatedViewerLinks,
          viewerLinkApproval: updatedApprovals
        });
        
        // Update modal state if it's open
        if (userTasksModal) {
          const updatedTasks = userTasksModal.tasks.map(t => 
            t.id === taskId ? { 
              ...t, 
              viewerLink: updatedViewerLinks,
              viewerLinkApproval: updatedApprovals
            } : t
          );
          setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
        }
        
        console.log('✅ Task updated with viewer link at index', adIndex, 'and status set to Needs Review');
      } else {
        console.warn('⚠️ No URL found in n8n response:', result);
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
        if (window.location.pathname !== '/tasks') {
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

    // Apply campaign filter (works across all views)
    if (selectedCampaign) {
      filtered = filtered.filter(task => task.campaignId === parseInt(selectedCampaign));
    }

    // Apply user filter (works across all views)
    if (selectedUser) {
      filtered = filtered.filter(task => task.assignedTo === parseInt(selectedUser));
    }

    return filtered;
  }, [tasks, selectedCampaign, selectedUser, dateRangeStart, dateRangeEnd]);

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
        </div>
      {/* Column Manager Modal */}
      {showColumnManager && isAdminUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-md border border-red-600 rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
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
      <div className="mb-4 px-8 flex items-center justify-between">
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
                (selectedCampaign || selectedUser || selectedWeek !== 'all' || dateRangeStart || dateRangeEnd) ? 'border-primary-500 bg-primary-50' : ''
              }`}
              title="Filters"
            >
              <Filter className="w-4 h-4 text-gray-700" />
            </button>
            
            {/* Filter Dropdown */}
            {showFilters && (
              <div ref={filtersRef} className="absolute top-full left-0 mt-2 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl shadow-2xl border-2 border-red-500/30 p-5 z-40 min-w-[320px] backdrop-blur-sm shadow-red-500/20">
                <div className="space-y-4">
                  {/* Week Filter */}
                  <div>
                    <label className="block text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">Week</label>
                    <div className="relative">
                      <select
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border-2 border-red-500/40 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-black/50 text-white font-medium transition-all hover:border-red-500/60 appearance-none cursor-pointer shadow-inner backdrop-blur-sm"
                      >
                        <option value="all" className="bg-gray-900 text-gray-300">All Weeks</option>
                        {weekOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-gray-900 text-white">{option.label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-red-400 rotate-90" />
                      </div>
                    </div>
                  </div>

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
        <div className="space-y-8 p-6">
          {/* VIDEO EDITING AND GRAPHIC DESIGN */}
          {['VIDEO EDITING', 'GRAPHIC DESIGN'].map(department => {
            const departmentUsers = users.filter(u => u.department === department);
            
            if (departmentUsers.length === 0) return null;

            return (
              <div key={department} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{department}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departmentUsers.map(user => {
                    // Get current week range
                    const now = new Date();
                    const currentWeekMonday = getMondayOfWeek(now);
                    const currentWeekSunday = getSundayOfWeek(now);
                    const currentWeekRange = getWeekDateRange(0);

                    // Get all tasks for this user based on department
                    let userTasks = filteredTasks.filter(task => {
                      // Filter by current week first
                      if (task.week !== currentWeekRange) return false;

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

                    // Don't render card if user has no tasks
                    if (userTasks.length === 0) return null;

                    return (
                      <UserTaskCard
                        key={user.id}
                        user={user}
                        userTasks={userTasks}
                        campaigns={campaigns}
                        users={users}
                        cardCampaignFilter={cardCampaignFilter}
                        onCampaignFilterChange={(e) => setCardCampaignFilters({ ...cardCampaignFilters, [user.id]: e.target.value })}
                        onClick={(user, tasks) => setUserTasksModal({ user, tasks })}
                      />
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
                {columns.filter(col => col.visible !== false).map((column) => (
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
                  {columns.filter(col => col.visible !== false).map((column) => (
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
                  {columns.filter(col => col.visible !== false).map((column) => (
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
                        onClick={() => deleteTask(task.id)}
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

      {/* Copy Link Preview Modal */}
      {copyLinkModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col" style={{ boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Copy Link Preview</h3>
              <button onClick={() => setCopyLinkModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Main Preview Area */}
              <div className="flex-1 p-6 overflow-hidden">
                <iframe
                  src={copyLinkModal.url}
                  className="w-full h-full border border-gray-300 rounded-lg"
                  title="Copy Link Preview"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>

              {/* Right Sidebar - Feedback Section */}
              <div className="w-96 border-l border-gray-200 bg-gray-50 p-6 flex flex-col">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Feedback & Approval</h4>
                
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {copyLinkModal.showFeedbackInput && canGiveFeedback && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                      <textarea
                        value={copyLinkModal.currentFeedback}
                        onChange={(e) => setCopyLinkModal({ ...copyLinkModal, currentFeedback: e.target.value })}
                        placeholder="Enter feedback details here..."
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        autoFocus
                      />
                    </div>
                  )}
                  
                  {!canGiveFeedback && copyLinkModal.currentFeedback && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Feedback (Read-only)</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 whitespace-pre-wrap">
                        {copyLinkModal.currentFeedback}
                      </div>
                    </div>
                  )}
                </div>

                {canGiveFeedback && (
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={handleCopyLinkApprove}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-green-600/30 flex items-center justify-center space-x-2"
                    >
                      <Check className="w-5 h-5" />
                      <span>Approve</span>
                    </button>
                    {!copyLinkModal.showFeedbackInput ? (
                      <button
                        onClick={() => setCopyLinkModal({ ...copyLinkModal, showFeedbackInput: true })}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>Leave Feedback</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCopyLinkFeedback}
                        disabled={!copyLinkModal.currentFeedback.trim()}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>Submit Feedback</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900/95 backdrop-blur-md border border-red-600 rounded-xl shadow-2xl max-w-2xl w-full p-6" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
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

      {/* User Tasks Management Modal */}
      {userTasksModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex">
          {/* Left Side - Video Previews (65%) */}
          <div className="w-[65%] bg-gray-900 p-6 overflow-hidden flex flex-col">
            {(() => {
              // Collect all viewer links from all tasks with proper ad numbering
              const allLinks = [];
              
              // Group tasks by campaign to calculate proper ad offset
              const tasksByCampaign = userTasksModal.tasks.reduce((groups, task) => {
                const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                const campaignName = campaign?.name || 'No Campaign';
                if (!groups[campaignName]) {
                  groups[campaignName] = [];
                }
                groups[campaignName].push(task);
                return groups;
              }, {});
              
              // Build links with correct ad numbers
              Object.entries(tasksByCampaign).forEach(([campaignName, campaignTasks]) => {
                campaignTasks.forEach((task, taskIndex) => {
                  // Calculate ad offset: sum of all previous tasks' quantities in this campaign
                  const adOffset = campaignTasks.slice(0, taskIndex).reduce((sum, prevTask) => {
                    let qty = 1;
                    if (prevTask.quantity) {
                      if (typeof prevTask.quantity === 'string') {
                        const match = prevTask.quantity.match(/x?(\d+)/i);
                        if (match) qty = parseInt(match[1]);
                      } else if (typeof prevTask.quantity === 'number') {
                        qty = prevTask.quantity;
                      }
                    }
                    return sum + qty;
                  }, 0);
                  
                  if (task.viewerLink && task.viewerLink.length > 0) {
                    const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                    task.viewerLink.forEach((link, index) => {
                      if (link) {
                        allLinks.push({
                          link,
                          taskId: task.id,
                          linkIndex: index,
                          taskTitle: task.title,
                          campaignName: campaign?.name || 'No Campaign',
                          adIndex: adOffset + index + 1
                        });
                      }
                    });
                  }
                });
              });

              if (allLinks.length === 0) {
                return (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400 text-lg">No previews available</p>
                  </div>
                );
              }

              const currentAd = allLinks[currentPreviewIndex] || allLinks[0];

              return (
                <>
                  {/* Preview Header with Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">
                      {currentAd.campaignName} / Ad {currentAd.adIndex}
                    </h3>
                    {allLinks.length > 1 && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
                          disabled={currentPreviewIndex === 0}
                          className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-white text-sm font-medium">
                          {currentPreviewIndex + 1} / {allLinks.length}
                        </span>
                        <button
                          onClick={() => setCurrentPreviewIndex(Math.min(allLinks.length - 1, currentPreviewIndex + 1))}
                          disabled={currentPreviewIndex === allLinks.length - 1}
                          className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 bg-gray-800 rounded-lg p-4 min-h-0 flex items-center justify-center">
                    {(() => {
                      let embedUrl = currentAd.link;
                      
                      // Convert Google Drive links to embeddable format
                      if (currentAd.link.includes('drive.google.com')) {
                        const fileIdMatch = currentAd.link.match(/\/d\/([a-zA-Z0-9_-]+)/);
                        if (fileIdMatch) {
                          embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
                        }
                      }
                      
                      // Convert YouTube links to embeddable format
                      if (currentAd.link.includes('youtube.com') || currentAd.link.includes('youtu.be')) {
                        let videoId = null;
                        
                        // Extract video ID from various YouTube URL formats
                        if (currentAd.link.includes('youtube.com/watch')) {
                          const urlParams = new URLSearchParams(new URL(currentAd.link).search);
                          videoId = urlParams.get('v');
                        } else if (currentAd.link.includes('youtu.be/')) {
                          videoId = currentAd.link.split('youtu.be/')[1]?.split('?')[0];
                        } else if (currentAd.link.includes('youtube.com/embed/')) {
                          // Already in embed format
                          videoId = currentAd.link.split('youtube.com/embed/')[1]?.split('?')[0];
                        }
                        
                        if (videoId) {
                          embedUrl = `https://www.youtube.com/embed/${videoId}`;
                        }
                      }
                      
                      return (
                        <iframe
                          key={embedUrl}
                          src={embedUrl}
                          className="w-full h-full border border-gray-600 rounded-lg bg-white"
                          title={`Ad ${currentAd.adIndex} - ${currentAd.taskTitle}`}
                          allow="autoplay"
                        />
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Right Side - User Information (35%) */}
          <div className="w-[35%] bg-white overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{userTasksModal.user.name}</h1>
                  <p className="text-sm text-gray-500">{userTasksModal.user.department}</p>
                </div>
                <button onClick={() => setUserTasksModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tasks grouped by campaign */}
              <div className="space-y-8">
                {Object.entries(
                  userTasksModal.tasks.reduce((groups, task) => {
                    const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                    const campaignName = campaign?.name || 'No Campaign';
                    if (!groups[campaignName]) {
                      groups[campaignName] = [];
                    }
                    groups[campaignName].push(task);
                    return groups;
                  }, {})
                ).map(([campaignName, campaignTasks]) => {
                  // Find campaign object for this group
                  const campaignObj = campaigns.find(c => c.name === campaignName);
                  
                  return (
                  <div key={campaignName}>
                    {/* Campaign Header */}
                    <div className="mb-4 pb-2 border-b-2 border-gray-300">
                      <h2 className="text-xl font-bold text-gray-900">{campaignName}</h2>
                    </div>

                    {/* Tasks in this campaign */}
                    <div className="space-y-6">
                      {campaignTasks.map((task, taskIndex) => {
                        const actualTaskIndex = userTasksModal.tasks.findIndex(t => t.id === task.id);
                        const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                        
                        // Calculate ad offset: sum of all previous tasks' quantities in this campaign
                        const adOffset = campaignTasks.slice(0, taskIndex).reduce((sum, prevTask) => {
                          let qty = 1;
                          if (prevTask.quantity) {
                            if (typeof prevTask.quantity === 'string') {
                              const match = prevTask.quantity.match(/x?(\d+)/i);
                              if (match) qty = parseInt(match[1]);
                            } else if (typeof prevTask.quantity === 'number') {
                              qty = prevTask.quantity;
                            }
                          }
                          return sum + qty;
                        }, 0);
                        
                        // Parse quantity
                        let requiredQuantity = 1;
                        if (task.quantity) {
                          if (typeof task.quantity === 'string') {
                            const match = task.quantity.match(/x?(\d+)/i);
                            if (match) requiredQuantity = parseInt(match[1]);
                          } else if (typeof task.quantity === 'number') {
                            requiredQuantity = task.quantity;
                          }
                        }

                        return (
                          <div key={task.id} className="pb-6">
                            {/* Task Title */}
                            <div className="mb-4">
                              <h3 className="text-base font-semibold text-gray-700">{task.title}</h3>
                            </div>

                            {/* Media Buyer - Copy Content Section */}
                            {userTasksModal.user.department === 'MEDIA BUYING' && (
                        <div className="space-y-6">
                          {/* Copy Content Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-lg font-semibold text-gray-900">Copy Content</h2>
                              <select
                                value={task.copyApproval || 'Not Done'}
                                onChange={(e) => {
                                  const updatedTasks = [...userTasksModal.tasks];
                                  updatedTasks[actualTaskIndex] = { ...task, copyApproval: e.target.value };
                                  setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                  updateTask(task.id, { copyApproval: e.target.value });
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="Not Done">Not Done</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Needs Review">Needs Review</option>
                                <option value="Left feedback">Left feedback</option>
                                <option value="Approved">Approved</option>
                              </select>
                            </div>

                            <div className="space-y-4">
                              {/* Assigned To */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                                <select
                                  value={task.scriptAssigned || ''}
                                  onChange={(e) => {
                                    const updatedTasks = [...userTasksModal.tasks];
                                    updatedTasks[actualTaskIndex] = { ...task, scriptAssigned: e.target.value };
                                    setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                    updateTask(task.id, { scriptAssigned: e.target.value });
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Scriptwriter</option>
                                  {users.filter(u => u.department === 'SCRIPTWRITING').map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Copy Link */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Copy Link</label>
                                <input
                                  type="url"
                                  value={task.copyLink || ''}
                                  onChange={(e) => {
                                    const updatedTasks = [...userTasksModal.tasks];
                                    updatedTasks[actualTaskIndex] = { ...task, copyLink: e.target.value };
                                    setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                    updateTask(task.id, { copyLink: e.target.value });
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="https://..."
                                />
                              </div>

                              {/* Feedback Display */}
                              {task.copyApprovalFeedback && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                                  <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                                    {task.copyApprovalFeedback}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                            {/* Video/Graphic Designer - Ad Creatives Section */}
                            {(userTasksModal.user.department === 'VIDEO EDITING' || userTasksModal.user.department === 'GRAPHIC DESIGN') && (
                        <div className="space-y-6">
                          <div>
                            <div className="space-y-4">
                              {Array.from({ length: requiredQuantity }, (_, i) => {
                                // For VIDEO EDITING: Each video has 2 formats (Facebook and Reel)
                                // For GRAPHIC DESIGN: Each image is just one creative
                                const isVideoEditor = userTasksModal.user.department === 'VIDEO EDITING';
                                const formatsPerCreative = isVideoEditor ? 2 : 1;
                                const formats = isVideoEditor ? ['Facebook Format', 'Reel'] : [''];
                                
                                return (
                                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                                    <div className="mb-3">
                                      <h3 className="text-sm font-semibold text-gray-900">
                                        {isVideoEditor ? `Video ${adOffset + i + 1}` : `Ad ${adOffset + i + 1}`}
                                      </h3>
                                    </div>
                                    
                                    {formats.map((format, formatIndex) => {
                                      const slotIndex = isVideoEditor ? (i * 2 + formatIndex) : i;
                                      const currentApproval = Array.isArray(task.viewerLinkApproval) && task.viewerLinkApproval[slotIndex] 
                                        ? (task.viewerLinkApproval[slotIndex] === true ? 'Approved' : task.viewerLinkApproval[slotIndex])
                                        : 'Not Done';
                                      const currentLink = task.viewerLink && task.viewerLink[slotIndex] ? task.viewerLink[slotIndex] : '';
                                      
                                      return (
                                        <div key={formatIndex} className={formatIndex > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}>
                                          {isVideoEditor && (
                                            <div className="mb-2">
                                              <span className="text-sm font-medium text-gray-700">{format}</span>
                                            </div>
                                          )}
                                          
                                          <div className="flex items-center justify-end mb-3">
                                            <select
                                              value={currentApproval}
                                              onChange={(e) => {
                                                const updatedApprovals = Array.isArray(task.viewerLinkApproval) 
                                                  ? [...task.viewerLinkApproval] 
                                                  : [];
                                                
                                                while (updatedApprovals.length <= slotIndex) {
                                                  updatedApprovals.push('Not Done');
                                                }
                                                
                                                updatedApprovals[slotIndex] = e.target.value;
                                                
                                                const updatedTasks = [...userTasksModal.tasks];
                                                updatedTasks[actualTaskIndex] = { ...task, viewerLinkApproval: updatedApprovals };
                                                setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                                updateTask(task.id, { viewerLinkApproval: updatedApprovals });
                                              }}
                                              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="Not Done">Not Done</option>
                                              <option value="In Progress">In Progress</option>
                                              <option value="Needs Review">Needs Review</option>
                                              <option value="Approved">Approved</option>
                                            </select>
                                          </div>
                                          
                                          {currentLink ? (
                                            <div className="space-y-3">
                                              <div className="text-xs text-blue-600 break-all">
                                                <a href={currentLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                  {currentLink}
                                                </a>
                                              </div>
                                              
                                              {/* Action Buttons Row */}
                                              <div className="space-y-2">
                                                {/* Preview and Replace */}
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => {
                                                      // Find the index of this creative in the preview list
                                                      const allLinks = [];
                                                      userTasksModal.tasks.forEach((t) => {
                                                        if (t.viewerLink && t.viewerLink.length > 0) {
                                                          t.viewerLink.forEach((link, idx) => {
                                                            if (link) {
                                                              allLinks.push({ taskId: t.id, linkIndex: idx });
                                                            }
                                                          });
                                                        }
                                                      });
                                                      
                                                      const previewIndex = allLinks.findIndex(
                                                        item => item.taskId === task.id && item.linkIndex === slotIndex
                                                      );
                                                      
                                                      if (previewIndex !== -1) {
                                                        setCurrentPreviewIndex(previewIndex);
                                                      }
                                                    }}
                                                    className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                                  >
                                                    Preview
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      if (confirm('Are you sure you want to delete this creative?')) {
                                                        // Remove the link from the array
                                                        const updatedViewerLinks = Array.isArray(task.viewerLink) ? [...task.viewerLink] : [];
                                                        const updatedApprovals = Array.isArray(task.viewerLinkApproval) ? [...task.viewerLinkApproval] : [];
                                                        const updatedFeedback = Array.isArray(task.viewerLinkFeedback) ? [...task.viewerLinkFeedback] : [];
                                                        
                                                        // Set to empty string instead of removing to preserve indices
                                                        updatedViewerLinks[slotIndex] = '';
                                                        updatedApprovals[slotIndex] = 'Not Done';
                                                        updatedFeedback[slotIndex] = '';
                                                        
                                                        // Update backend
                                                        updateTask(task.id, { 
                                                          viewerLink: updatedViewerLinks,
                                                          viewerLinkApproval: updatedApprovals,
                                                          viewerLinkFeedback: updatedFeedback
                                                        });
                                                        
                                                        // Update modal state
                                                        const updatedTasks = [...userTasksModal.tasks];
                                                        updatedTasks[actualTaskIndex] = { 
                                                          ...task, 
                                                          viewerLink: updatedViewerLinks,
                                                          viewerLinkApproval: updatedApprovals,
                                                          viewerLinkFeedback: updatedFeedback
                                                        };
                                                        setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                                      }
                                                    }}
                                                    className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                                
                                                {/* Manager Actions - Feedback and Approval */}
                                                {(currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN) && (
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => {
                                                        // Get existing feedback if any
                                                        const existingFeedback = task.viewerLinkFeedback && task.viewerLinkFeedback[slotIndex] 
                                                          ? task.viewerLinkFeedback[slotIndex] 
                                                          : '';
                                                        
                                                        setFeedbackModal({
                                                          taskId: task.id,
                                                          columnKey: 'viewerLink',
                                                          itemIndex: slotIndex,
                                                          currentFeedback: existingFeedback,
                                                          readOnly: false
                                                        });
                                                      }}
                                                      className="flex-1 px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                                                    >
                                                      Leave Feedback
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        if (confirm('Approve this creative?')) {
                                                          const updatedApprovals = Array.isArray(task.viewerLinkApproval) 
                                                            ? [...task.viewerLinkApproval] 
                                                            : [];
                                                          
                                                          while (updatedApprovals.length <= slotIndex) {
                                                            updatedApprovals.push('Not Done');
                                                          }
                                                          
                                                          updatedApprovals[slotIndex] = 'Approved';
                                                          
                                                          const updatedTasks = [...userTasksModal.tasks];
                                                          updatedTasks[actualTaskIndex] = { 
                                                            ...task, 
                                                            viewerLinkApproval: updatedApprovals
                                                          };
                                                          setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                                          updateTask(task.id, { 
                                                            viewerLinkApproval: updatedApprovals
                                                          });
                                                        }
                                                      }}
                                                      className="flex-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                                                    >
                                                      Approve
                                                    </button>
                                                  </div>
                                                )}
                                                
                                                {/* Display existing feedback */}
                                                {task.viewerLinkFeedback && task.viewerLinkFeedback[slotIndex] && (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                    <p className="text-xs font-semibold text-gray-700 mb-1">Manager Feedback:</p>
                                                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{task.viewerLinkFeedback[slotIndex]}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              {uploadingCreatives[`${task.id}-${slotIndex}`] !== undefined ? (
                                                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                                                  <div className="text-blue-600 mb-2">
                                                    <svg className="w-8 h-8 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                  </div>
                                                  <p className="text-sm text-blue-600 font-medium mb-3">Uploading... {uploadingCreatives[`${task.id}-${slotIndex}`]}%</p>
                                                  <button
                                                    onClick={() => handleCancelUpload(`${task.id}-${slotIndex}`)}
                                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                                  >
                                                    Cancel Upload
                                                  </button>
                                                  {import.meta.env.DEV && (
                                                    <p className="text-xs text-orange-600 font-semibold mt-3 px-4 py-2 bg-orange-100 rounded border border-orange-300">
                                                      ⚠️ DEV MODE: Don't save/edit files until upload completes!
                                                    </p>
                                                  )}
                                                </div>
                                              ) : (
                                                <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                                                  <input
                                                    key={`upload-${task.id}-${slotIndex}-${uploadingCreatives[`${task.id}-${slotIndex}`] || 'ready'}`}
                                                    type="file"
                                                    accept={isVideoEditor ? ".mp4,video/mp4" : ".jpg,.jpeg,.png,image/jpeg,image/png"}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                      const file = e.target.files[0];
                                                      if (file) {
                                                        handleCreativeUpload(
                                                          task.id, 
                                                          slotIndex, 
                                                          file, 
                                                          task, 
                                                          userTasksModal.user, 
                                                          campaign
                                                        );
                                                      }
                                                    }}
                                                  />
                                                  <div className="text-gray-400 mb-2">
                                                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                  </div>
                                                  <p className="text-sm text-gray-600 font-medium text-center mb-1">
                                                    Click to upload {isVideoEditor ? format.toLowerCase() : 'creative'}
                                                  </p>
                                                  <p className="text-xs text-gray-500 text-center">
                                                    {isVideoEditor ? 'MP4 files • Up to 99 MB' : 'JPG/PNG files • Up to 99 MB'}
                                                  </p>
                                                </label>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;