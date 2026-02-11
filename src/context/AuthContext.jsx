import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // App state
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Loading states for each data type
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [scheduledTasksLoading, setScheduledTasksLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [columns, setColumns] = useState([
    {
      id: 'priority',
      name: 'Priority',
      key: 'priority',
      type: 'dropdown',
      width: 120,
      visible: true,
      options: ['Critical', 'High', 'Normal', 'Low', 'Paused']
    },
    {
      id: 'mediaType',
      name: 'Media Type',
      key: 'mediaType',
      type: 'dropdown',
      width: 140,
      visible: true,
      options: ['IMAGE', 'VIDEO']
    },
    {
      id: 'scriptAssigned',
      name: 'Script Assigned',
      key: 'scriptAssigned',
      type: 'user',
      width: 150,
      visible: true
    },
    {
      id: 'copyWritten',
      name: 'Copy Written',
      key: 'copyWritten',
      type: 'checkbox',
      width: 120,
      visible: true
    },
    {
      id: 'copyLink',
      name: 'Copy Link',
      key: 'copyLink',
      type: 'url',
      width: 150,
      visible: true
    },
    {
      id: 'copyApproval',
      name: 'Copy Approval',
      key: 'copyApproval',
      type: 'dropdown',
      width: 140,
      visible: true,
      options: ['Approved', 'Needs Review', 'Left feedback', 'Unchecked', 'Revisit Later']
    },
    {
      id: 'assignedTo',
      name: 'Assigned To',
      key: 'assignedTo',
      type: 'user',
      width: 140,
      visible: true
    },
    {
      id: 'quantity',
      name: 'Quantity',
      key: 'quantity',
      type: 'text',
      width: 90,
      visible: true
    },
    {
      id: 'campaignName',
      name: 'Campaign Name',
      key: 'campaignId',
      type: 'campaign',
      width: 180,
      visible: true
    },
    {
      id: 'week',
      name: 'Week',
      key: 'week',
      type: 'weekdropdown',
      width: 200,
      visible: true
    },
    {
      id: 'viewerLink',
      name: 'Viewer Link',
      key: 'viewerLink',
      type: 'array',
      arrayType: 'url',
      width: 180,
      visible: true
    },
    {
      id: 'caliVariation',
      name: 'Cali Variation',
      key: 'caliVariation',
      type: 'array',
      arrayType: 'text',
      width: 180,
      visible: true
    },
    {
      id: 'slackPermalink',
      name: 'Slack Permalink',
      key: 'slackPermalink',
      type: 'array',
      arrayType: 'url',
      width: 180,
      visible: true
    },
    {
      id: 'adStatus',
      name: 'Ad Status',
      key: 'adStatus',
      type: 'dropdown',
      width: 120,
      visible: false,
      options: ['Incomplete', 'Complete', 'Uploaded', 'Posted']
    },
    {
      id: 'adApproval',
      name: 'Ad Approval',
      key: 'adApproval',
      type: 'dropdown',
      width: 130,
      visible: false,
      options: ['Approved', 'Needs Review', 'Left feedback', 'Unchecked', 'Revisit Later']
    },
    {
      id: 'qcSignOff',
      name: 'QC Sign-Off',
      key: 'qcSignOff',
      type: 'text',
      width: 130,
      visible: false
    },
    {
      id: 'postStatus',
      name: 'Post Status',
      key: 'postStatus',
      type: 'dropdown',
      width: 130,
      visible: false,
      options: ['Incomplete', 'Complete', 'Uploaded', 'Posted']
    },
    {
      id: 'driveUpload',
      name: 'Drive Upload',
      key: 'driveUpload',
      type: 'dropdown',
      width: 130,
      visible: false,
      options: ['Incomplete', 'Complete', 'Uploaded', 'Posted']
    }
  ]);

  // API base URL with environment variable support
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD 
      ? `${window.location.origin}/api` 
      : 'http://localhost:3001/api');

  // Check if we should use API or localStorage only - disable API in production unless explicitly enabled
  const USE_API = (import.meta.env.VITE_USE_API === 'true') || (!import.meta.env.PROD && import.meta.env.VITE_USE_API !== 'false');
  
  // Debug logging
  console.log('Environment check:', {
    VITE_USE_API: import.meta.env.VITE_USE_API,
    PROD: import.meta.env.PROD,
    USE_API: USE_API
  });

  // Helper function to normalize role names
  const normalizeRole = (role) => {
    if (!role) return 'user';
    const normalized = role.toLowerCase().replace(/[\s-]+/g, '_');
    return normalized;
  };

  // Load users from webhook
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    
    // Always load from n8n webhook - this is the source of truth
    try {
      const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Normalize roles from webhook format to internal format
        const normalizedUsers = data.map(user => ({
          ...user,
          role: normalizeRole(user.role)
        }));
        
        // Update both state and localStorage with fresh webhook data
        setUsers(normalizedUsers);
        localStorage.setItem('hyrax_users', JSON.stringify(normalizedUsers));
        localStorage.setItem('hyrax_users_last_updated', new Date().toISOString());
        return;
      } else {
        console.error('Webhook failed with status:', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users from webhook:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Background refresh function - silently updates data without showing loading states
  const backgroundRefresh = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;

    console.log('🔄 Background refresh started...');
    try {
      // Silently refresh all data without setting loading states
      const promises = [];

      // Refresh users
      promises.push((async () => {
        try {
          const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
          const response = await fetch(webhookUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              const normalizedUsers = data.map(user => ({
                ...user,
                role: normalizeRole(user.role)
              }));
              setUsers(normalizedUsers);
              localStorage.setItem('hyrax_users', JSON.stringify(normalizedUsers));
            }
          }
        } catch (error) {
          console.error('Background users refresh failed:', error);
        }
      })());

      // Refresh campaigns
      promises.push((async () => {
        try {
          const webhookUrl = import.meta.env.VITE_GET_CAMPAIGNS_WEBHOOK_URL;
          if (webhookUrl) {
            const response = await fetch(webhookUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                const mappedCampaigns = data.map(campaign => ({
                  id: campaign.id,
                  name: campaign.campaign_name,
                  slackId: campaign.slack_channel_ID
                }));
                setCampaigns(mappedCampaigns);
                localStorage.setItem('hyrax_campaigns', JSON.stringify(mappedCampaigns));
              }
            }
          }
        } catch (error) {
          console.error('Background campaigns refresh failed:', error);
        }
      })());

      // Refresh tasks - get current page context from localStorage to know what to refresh
      const currentPage = localStorage.getItem('hyrax_current_page');
      const currentWeek = localStorage.getItem('hyrax_current_week');
      
      if (currentPage === 'tasks' || tasks.length > 0) {
        promises.push((async () => {
          try {
            const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
            if (webhookUrl) {
              const userEmail = currentUser?.email || '';
              const adminPassword = localStorage.getItem('admin_password') || '';
              const todayUTC = getTodayUTC();
              const code = await hashThreeInputs(userEmail, adminPassword, todayUTC);
              const params = new URLSearchParams({
                requested_by: userEmail,
                code: code
              });
              
              // Add week parameter if we have it stored
              if (currentWeek && currentWeek !== 'all') {
                params.append('week', currentWeek);
              }
              
              const response = await fetch(`${webhookUrl}?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });
              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                  const validTasks = data.filter(task => task && Object.keys(task).length > 0 && task.id);
                  setTasks(validTasks);
                  localStorage.setItem('hyrax_tasks', JSON.stringify(validTasks));
                }
              }
            }
          } catch (error) {
            console.error('Background tasks refresh failed:', error);
          }
        })());
      }

      // Refresh scheduled tasks
      if (currentPage === 'scheduledTasks' || scheduledTasks.length > 0) {
        promises.push((async () => {
          try {
            const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
            if (webhookUrl) {
              const userEmail = currentUser?.email || '';
              const adminPassword = localStorage.getItem('admin_password') || '';
              const todayUTC = getTodayUTC();
              const code = await hashThreeInputs(userEmail, adminPassword, todayUTC);
              const params = new URLSearchParams({
                requested_by: userEmail,
                code: code
              });
              const response = await fetch(`${webhookUrl}?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });
              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                  setScheduledTasks(data);
                  localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(data));
                }
              }
            }
          } catch (error) {
            console.error('Background scheduled tasks refresh failed:', error);
          }
        })());
      }

      // Execute all refreshes in parallel
      await Promise.all(promises);
      console.log('✅ Background refresh completed');
    } catch (error) {
      console.error('Background refresh error:', error);
    }
  }, [isAuthenticated, currentUser, tasks.length, scheduledTasks.length]);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await verifyToken(token);
      } else {
        setLoading(false);
      }
      
      // Load users data after authentication check
      loadUsers();
    };
    
    initAuth();

    // Refresh users from webhook every 5 minutes to keep data in sync
    const usersRefreshInterval = setInterval(() => {
      loadUsers();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(usersRefreshInterval);
    };
  }, []);

  // Background data refresh every 5 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    // Start background refresh
    const refreshInterval = setInterval(() => {
      backgroundRefresh();
    }, 5000); // 5 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, currentUser, backgroundRefresh]);

  // Load campaigns data from webhook
  const loadCampaignsData = async () => {
    setCampaignsLoading(true);
    
    try {
      const webhookUrl = import.meta.env.VITE_GET_CAMPAIGNS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_GET_CAMPAIGNS_WEBHOOK_URL not configured');
        setCampaigns([]);
        return;
      }
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Map webhook structure to app structure
        const mappedCampaigns = data.map(campaign => ({
          id: campaign.id,
          name: campaign.campaign_name,
          slackId: campaign.slack_channel_ID
        }));
        setCampaigns(mappedCampaigns);
        localStorage.setItem('hyrax_campaigns', JSON.stringify(mappedCampaigns));
        localStorage.setItem('hyrax_campaigns_last_updated', new Date().toISOString());
      } else {
        console.error('Failed to fetch campaigns from webhook');
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  };

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    // If API is disabled, skip API calls completely
    if (!USE_API) {
      console.log('API calls disabled in production mode');
      return { success: true, data: null };
    }

    try {
      const url = `${API_BASE}${endpoint}`;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
        ...options,
      };

      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          logout();
        }
        throw new Error(data.message || 'API call failed');
      }

      return data;
    } catch (error) {
      console.warn('API call failed, using localStorage only:', error.message);
      return { success: true, data: null };
    }
  };

  // Authentication functions
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      
      // Call the API login endpoint which handles webhook authentication
      const response = await fetch(`${apiBaseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          action: 'login'
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('❌ Login failed:', data.message);
        return false;
      }

      console.log('✓ Login successful via API!');
      console.log('User data:', data.user);
      
      // Create authenticated user from API response
      const authenticatedUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        department: data.user.department,
        avatar: data.user.avatar,
        permissions: data.user.permissions
      };
      
      const token = data.token;
      
      setAuthToken(token);
      setCurrentUser(authenticatedUser);
      setIsAuthenticated(true);
      
      // Store both token and user data in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(authenticatedUser));
      
      console.log('✓ Login complete!');
      
      return true;
      
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCampaigns([]);
    setTasks([]);
    setScheduledTasks([]);
    setUsers([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  };

  const verifyToken = async (token) => {
    try {
      // Check if we have a stored user
      const storedUser = localStorage.getItem('current_user');
      
      if (token && storedUser) {
        const authenticatedUser = JSON.parse(storedUser);
        
        setAuthToken(token);
        setCurrentUser(authenticatedUser);
        setIsAuthenticated(true);
        // Data will be loaded on-demand by each page
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    } finally {
      setLoading(false);
    }
  };

  // Data is now loaded on-demand by each page

  // Load tasks from n8n webhook
  const loadTasksFromWebhook = async (user = null, week = null) => {
    setTasksLoading(true);
    try {
      const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_TASKS_WEBHOOK_URL not configured');
        setTasks([]);
        return;
      }

      const userEmail = user?.email || currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(userEmail, adminPassword, todayUTC);

      // Use query parameters for GET request
      const params = new URLSearchParams({
        requested_by: userEmail,
        code: code
      });
      
      // Add week parameter if provided
      if (week) {
        params.append('week', week);
      }

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out empty objects (happens when a week has no tasks)
        const validTasks = Array.isArray(data) ? data.filter(task => task && Object.keys(task).length > 0 && task.id) : [];
        console.log('Tasks loaded from webhook:', validTasks.length || 0);
        setTasks(validTasks);
        localStorage.setItem('hyrax_tasks', JSON.stringify(validTasks));
      } else {
        console.error('Failed to fetch tasks from webhook:', response.status);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks from webhook:', error);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  // Campaign CRUD operations
  const loadCampaigns = async () => {
    // In production without API, campaigns are already loaded in loadCampaignsData
    if (!USE_API) {
      return;
    }
    
    try {
      const response = await apiCall('/campaigns');
      if (response && response.campaigns) {
        setCampaigns(response.campaigns);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const addCampaign = async (campaignData) => {
    const newCampaign = {
      ...campaignData,
      id: campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1,
    };
    
    // Update local state immediately
    setCampaigns(prev => [...prev, newCampaign]);
    
    // Try to persist via API if available
    if (USE_API) {
      try {
        const response = await apiCall('/campaigns', {
          method: 'POST',
          body: newCampaign,
        });
        return response;
      } catch (error) {
        console.error('Failed to save campaign via API:', error);
      }
    }
    
    return { success: true, campaign: newCampaign };
  };

  const updateCampaign = async (id, campaignData) => {
    const updatedCampaign = { ...campaignData, id };
    
    // Update local state immediately
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === id ? updatedCampaign : campaign
    ));
    
    // Try to persist via API if available
    if (USE_API) {
      try {
        const response = await apiCall(`/campaigns/${id}`, {
          method: 'PUT',
          body: campaignData,
        });
        return response;
      } catch (error) {
        console.error('Failed to update campaign via API:', error);
      }
    }
    
    return { success: true, campaign: updatedCampaign };
  };

  const deleteCampaign = async (id) => {
    // Update local state immediately
    setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
    
    // Try to persist via API if available
    if (USE_API) {
      try {
        const response = await apiCall(`/campaigns/${id}`, {
          method: 'DELETE',
        });
        return response;
      } catch (error) {
        console.error('Failed to delete campaign via API:', error);
      }
    }
    
    return { success: true };
  };

  // Hash function for webhook authentication
  const hashThreeInputs = async (input1, input2, input3) => {
    const combined = input1.toString() + input2.toString() + input3.toString();
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Helper function to get today's date in UTC format dd/MM/yyyy
  const getTodayUTC = () => {
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const year = now.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  // Task operations with localStorage and API persistence
  const addTask = async (taskData) => {
    const currentTimestamp = new Date().toISOString();
    const newTask = {
      ...taskData,
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      // Ensure boolean fields are actual booleans, not null
      copyWritten: taskData.copyWritten === true,
      // Initialize array fields if not provided
      viewerLink: Array.isArray(taskData.viewerLink) ? taskData.viewerLink : [],
      viewerLinkApproval: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval : [],
      viewerLinkFeedback: Array.isArray(taskData.viewerLinkFeedback) ? taskData.viewerLinkFeedback : [],
      caliVariation: Array.isArray(taskData.caliVariation) ? taskData.caliVariation : [],
      caliVariationApproval: Array.isArray(taskData.caliVariationApproval) ? taskData.caliVariationApproval : [],
      caliVariationFeedback: Array.isArray(taskData.caliVariationFeedback) ? taskData.caliVariationFeedback : [],
      slackPermalink: Array.isArray(taskData.slackPermalink) ? taskData.slackPermalink : [],
      slackPermalinkApproval: Array.isArray(taskData.slackPermalinkApproval) ? taskData.slackPermalinkApproval : [],
      slackPermalinkFeedback: Array.isArray(taskData.slackPermalinkFeedback) ? taskData.slackPermalinkFeedback : [],
      // Initialize timestamp fields
      copyLinkAt: taskData.copyLink ? currentTimestamp : null,
      copyWrittenAt: taskData.copyWritten === true ? currentTimestamp : null,
      copyApprovalAt: taskData.copyApproval ? currentTimestamp : null,
      viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
      viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };
    
    // Update local state and localStorage immediately
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Send to webhook
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_TASKS_WEBHOOK_URL not configured');
        return;
      }

      // Prepare URL with new_tasks in query parameters
      const params = new URLSearchParams({
        new_tasks: JSON.stringify([newTask])
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          added_by: adminEmail,
          code: code
        })
      });

      if (!response.ok) {
        console.error('Failed to send task to webhook:', response.status);
      }
    } catch (error) {
      console.error('Failed to send task to webhook:', error);
    }
    
    // Persist to JSON file via API
    try {
      await apiCall('/tasks', {
        method: 'POST',
        body: newTask,
      });
    } catch (error) {
      console.error('Failed to save task to file:', error);
    }
  };

  // Batch add multiple tasks at once (for duplicate operations)
  const addTasks = async (tasksData) => {
    if (!Array.isArray(tasksData) || tasksData.length === 0) {
      return;
    }

    // Generate new tasks with proper sequential IDs
    let currentMaxId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0;
    const currentTimestamp = new Date().toISOString();
    const newTasks = tasksData.map((taskData) => {
      currentMaxId += 1;
      return {
        ...taskData,
        id: currentMaxId,
        // Ensure boolean fields are actual booleans, not null
        copyWritten: taskData.copyWritten === true,
        // Initialize array fields if not provided
        viewerLink: Array.isArray(taskData.viewerLink) ? taskData.viewerLink : [],
        viewerLinkApproval: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval : [],
        viewerLinkFeedback: Array.isArray(taskData.viewerLinkFeedback) ? taskData.viewerLinkFeedback : [],
        caliVariation: Array.isArray(taskData.caliVariation) ? taskData.caliVariation : [],
        caliVariationApproval: Array.isArray(taskData.caliVariationApproval) ? taskData.caliVariationApproval : [],
        caliVariationFeedback: Array.isArray(taskData.caliVariationFeedback) ? taskData.caliVariationFeedback : [],
        slackPermalink: Array.isArray(taskData.slackPermalink) ? taskData.slackPermalink : [],
        slackPermalinkApproval: Array.isArray(taskData.slackPermalinkApproval) ? taskData.slackPermalinkApproval : [],
        slackPermalinkFeedback: Array.isArray(taskData.slackPermalinkFeedback) ? taskData.slackPermalinkFeedback : [],
        // Initialize timestamp fields
        copyLinkAt: taskData.copyLink ? currentTimestamp : null,
        copyWrittenAt: taskData.copyWritten === true ? currentTimestamp : null,
        copyApprovalAt: taskData.copyApproval ? currentTimestamp : null,
        viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
        viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      };
    });
    
    // Update local state and localStorage immediately
    const updatedTasks = [...tasks, ...newTasks];
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Send all tasks to webhook in a single request
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_TASKS_WEBHOOK_URL not configured');
        return;
      }

      // Prepare URL with new_tasks in query parameters (all tasks at once)
      const params = new URLSearchParams({
        new_tasks: JSON.stringify(newTasks)
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          added_by: adminEmail,
          code: code
        })
      });

      if (!response.ok) {
        console.error('Failed to send tasks to webhook:', response.status);
      }
    } catch (error) {
      console.error('Failed to send tasks to webhook:', error);
    }
    
    // Persist each task to JSON file via API
    for (const newTask of newTasks) {
      try {
        await apiCall('/tasks', {
          method: 'POST',
          body: newTask,
        });
      } catch (error) {
        console.error('Failed to save task to file:', error);
      }
    }
  };

  const updateTask = async (taskId, updates, additionalQueryParams = {}) => {
    // Track timestamps for specific field changes
    const currentTimestamp = new Date().toISOString();
    const taskUpdates = {
      ...updates,
      updatedAt: currentTimestamp
    };
    
    // Find the existing task to check for field changes
    const existingTask = tasks.find(t => t.id === taskId);
    
    // Add timestamps for specific field updates
    if (existingTask) {
      // copyLinkAt - when copyLink is added or changed
      if ('copyLink' in updates && updates.copyLink !== existingTask.copyLink) {
        taskUpdates.copyLinkAt = currentTimestamp;
      }
      
      // copyWrittenAt - when copyWritten status changes
      if ('copyWritten' in updates && updates.copyWritten !== existingTask.copyWritten) {
        taskUpdates.copyWrittenAt = currentTimestamp;
      }
      
      // copyApprovalAt - when copyApproval status changes
      if ('copyApproval' in updates && updates.copyApproval !== existingTask.copyApproval) {
        taskUpdates.copyApprovalAt = currentTimestamp;
      }
      
      // viewerLinkAt - array of timestamps matching viewerLink array
      if ('viewerLink' in updates && Array.isArray(updates.viewerLink)) {
        const existingViewerLink = Array.isArray(existingTask.viewerLink) ? existingTask.viewerLink : [];
        const existingTimestamps = Array.isArray(existingTask.viewerLinkAt) ? existingTask.viewerLinkAt : [];
        
        // Create new timestamps array matching the updated viewerLink array
        const newTimestamps = updates.viewerLink.map((link, index) => {
          // If link changed or is new, use current timestamp
          if (link !== existingViewerLink[index]) {
            return currentTimestamp;
          }
          // Otherwise keep existing timestamp or use current if not available
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.viewerLinkAt = newTimestamps;
      }
      
      // viewerLinkApprovalAt - array of timestamps matching viewerLinkApproval array
      if ('viewerLinkApproval' in updates && Array.isArray(updates.viewerLinkApproval)) {
        const existingApproval = Array.isArray(existingTask.viewerLinkApproval) ? existingTask.viewerLinkApproval : [];
        const existingTimestamps = Array.isArray(existingTask.viewerLinkApprovalAt) ? existingTask.viewerLinkApprovalAt : [];
        
        // Create new timestamps array matching the updated viewerLinkApproval array
        const newTimestamps = updates.viewerLinkApproval.map((approval, index) => {
          // If approval changed or is new, use current timestamp
          if (approval !== existingApproval[index]) {
            return currentTimestamp;
          }
          // Otherwise keep existing timestamp or use current if not available
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.viewerLinkApprovalAt = newTimestamps;
      }
    }
    
    // Find the complete updated task
    const updatedTask = tasks.find(t => t.id === taskId);
    const completeUpdatedTask = { ...updatedTask, ...taskUpdates };
    
    // Update local state and localStorage immediately
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? completeUpdatedTask
        : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Send to webhook
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_TASKS_WEBHOOK_URL not configured');
      } else {
        // Prepare URL with updated_tasks in query parameters
        const params = new URLSearchParams({
          updated_tasks: JSON.stringify([completeUpdatedTask]),
          ...additionalQueryParams // Add any additional query parameters (e.g., previous_url, new_url)
        });

        const response = await fetch(`${webhookUrl}?${params}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            updated_by: adminEmail,
            code: code
          })
        });

        if (!response.ok) {
          console.error('Failed to send task update to webhook:', response.status);
        }
      }
    } catch (error) {
      console.error('Failed to send task update to webhook:', error);
    }
    
    // Persist to JSON file via API
    try {
      await apiCall(`/tasks/${taskId}`, {
        method: 'PUT',
        body: completeUpdatedTask,
      });
    } catch (error) {
      console.error('Failed to update task in file:', error);
    }
  };

  const deleteTask = async (taskId) => {
    // Find the task before deleting
    const taskToDelete = tasks.find(task => task.id === taskId);
    
    // Update local state and localStorage immediately
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Send to webhook
    if (taskToDelete) {
      try {
        const adminEmail = currentUser?.email || '';
        const adminPassword = localStorage.getItem('admin_password') || '';
        const todayUTC = getTodayUTC();
        const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

        const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
        if (!webhookUrl) {
          console.error('VITE_TASKS_WEBHOOK_URL not configured');
        } else {
          // Prepare URL with deleted_tasks in query parameters
          const params = new URLSearchParams({
            deleted_tasks: JSON.stringify([taskToDelete])
          });

          const response = await fetch(`${webhookUrl}?${params}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              deleted_by: adminEmail,
              code: code
            })
          });

          if (!response.ok) {
            console.error('Failed to send task deletion to webhook:', response.status);
          }
        }
      } catch (error) {
        console.error('Failed to send task deletion to webhook:', error);
      }
    }
    
    // Persist to JSON file via API
    try {
      await apiCall(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete task from file:', error);
    }
  };

  // Batch delete tasks
  const deleteTasks = async (taskIds) => {
    // Find all tasks before deleting
    const tasksToDelete = tasks.filter(task => taskIds.includes(task.id));
    
    // Update local state and localStorage immediately
    const updatedTasks = tasks.filter(task => !taskIds.includes(task.id));
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Send to webhook (single request with all tasks)
    if (tasksToDelete.length > 0) {
      try {
        const adminEmail = currentUser?.email || '';
        const adminPassword = localStorage.getItem('admin_password') || '';
        const todayUTC = getTodayUTC();
        const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

        const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
        if (!webhookUrl) {
          console.error('VITE_TASKS_WEBHOOK_URL not configured');
        } else {
          // Prepare URL with deleted_tasks in query parameters
          const params = new URLSearchParams({
            deleted_tasks: JSON.stringify(tasksToDelete)
          });

          const response = await fetch(`${webhookUrl}?${params}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              deleted_by: adminEmail,
              code: code
            })
          });

          if (!response.ok) {
            console.error('Failed to send tasks deletion to webhook:', response.status);
          }
        }
      } catch (error) {
        console.error('Failed to send tasks deletion to webhook:', error);
      }
    }
  };

  // Column operations
  const addColumn = (columnData) => {
    const newColumn = {
      ...columnData,
      id: Date.now().toString(),
    };
    setColumns(prev => [...prev, newColumn]);
  };

  const updateColumn = (columnId, updates) => {
    setColumns(prev => prev.map(column => 
      column.id === columnId 
        ? { ...column, ...updates }
        : column
    ));
  };

  const deleteColumn = (columnId) => {
    setColumns(prev => prev.filter(column => column.id !== columnId));
  };

  // Scheduled Tasks operations (same logic as tasks but different webhook)
  const loadScheduledTasksFromWebhook = async (user = null) => {
    setScheduledTasksLoading(true);
    try {
      const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_SCHEDULED_TASKS_WEBHOOK_URL not configured');
        setScheduledTasks([]);
        return;
      }

      const userEmail = user?.email || currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(userEmail, adminPassword, todayUTC);

      const params = new URLSearchParams({
        requested_by: userEmail,
        code: code
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Scheduled tasks loaded from webhook:', data.length || 0);
        setScheduledTasks(data);
        localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(data));
      } else {
        console.error('Failed to fetch scheduled tasks from webhook:', response.status);
        setScheduledTasks([]);
      }
    } catch (error) {
      console.error('Error loading scheduled tasks from webhook:', error);
      setScheduledTasks([]);
    } finally {
      setScheduledTasksLoading(false);
    }
  };

  const addScheduledTask = async (taskData) => {
    const currentTimestamp = new Date().toISOString();
    const newTask = {
      ...taskData,
      id: scheduledTasks.length > 0 ? Math.max(...scheduledTasks.map(t => t.id)) + 1 : 1,
      copyWritten: taskData.copyWritten === true,
      viewerLink: Array.isArray(taskData.viewerLink) ? taskData.viewerLink : [],
      viewerLinkApproval: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval : [],
      viewerLinkFeedback: Array.isArray(taskData.viewerLinkFeedback) ? taskData.viewerLinkFeedback : [],
      caliVariation: Array.isArray(taskData.caliVariation) ? taskData.caliVariation : [],
      caliVariationApproval: Array.isArray(taskData.caliVariationApproval) ? taskData.caliVariationApproval : [],
      caliVariationFeedback: Array.isArray(taskData.caliVariationFeedback) ? taskData.caliVariationFeedback : [],
      slackPermalink: Array.isArray(taskData.slackPermalink) ? taskData.slackPermalink : [],
      slackPermalinkApproval: Array.isArray(taskData.slackPermalinkApproval) ? taskData.slackPermalinkApproval : [],
      slackPermalinkFeedback: Array.isArray(taskData.slackPermalinkFeedback) ? taskData.slackPermalinkFeedback : [],
      // Initialize timestamp fields
      copyLinkAt: taskData.copyLink ? currentTimestamp : null,
      copyWrittenAt: taskData.copyWritten === true ? currentTimestamp : null,
      copyApprovalAt: taskData.copyApproval ? currentTimestamp : null,
      viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
      viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };
    
    const updatedTasks = [...scheduledTasks, newTask];
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));
    
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_SCHEDULED_TASKS_WEBHOOK_URL not configured');
        return;
      }

      const params = new URLSearchParams({
        new_tasks: JSON.stringify([newTask])
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          added_by: adminEmail,
          code: code
        })
      });

      if (!response.ok) {
        console.error('Failed to send scheduled task to webhook:', response.status);
      }
    } catch (error) {
      console.error('Failed to send scheduled task to webhook:', error);
    }
  };

  const addScheduledTasks = async (tasksData) => {
    if (!Array.isArray(tasksData) || tasksData.length === 0) {
      return;
    }

    let currentMaxId = scheduledTasks.length > 0 ? Math.max(...scheduledTasks.map(t => t.id)) : 0;
    const currentTimestamp = new Date().toISOString();
    const newTasks = tasksData.map((taskData) => {
      currentMaxId += 1;
      return {
        ...taskData,
        id: currentMaxId,
        copyWritten: taskData.copyWritten === true,
        viewerLink: Array.isArray(taskData.viewerLink) ? taskData.viewerLink : [],
        viewerLinkApproval: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval : [],
        viewerLinkFeedback: Array.isArray(taskData.viewerLinkFeedback) ? taskData.viewerLinkFeedback : [],
        caliVariation: Array.isArray(taskData.caliVariation) ? taskData.caliVariation : [],
        caliVariationApproval: Array.isArray(taskData.caliVariationApproval) ? taskData.caliVariationApproval : [],
        caliVariationFeedback: Array.isArray(taskData.caliVariationFeedback) ? taskData.caliVariationFeedback : [],
        slackPermalink: Array.isArray(taskData.slackPermalink) ? taskData.slackPermalink : [],
        slackPermalinkApproval: Array.isArray(taskData.slackPermalinkApproval) ? taskData.slackPermalinkApproval : [],
        slackPermalinkFeedback: Array.isArray(taskData.slackPermalinkFeedback) ? taskData.slackPermalinkFeedback : [],
        // Initialize timestamp fields
        copyLinkAt: taskData.copyLink ? currentTimestamp : null,
        copyWrittenAt: taskData.copyWritten === true ? currentTimestamp : null,
        copyApprovalAt: taskData.copyApproval ? currentTimestamp : null,
        viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
        viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      };
    });

    const updatedTasks = [...scheduledTasks, ...newTasks];
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));

    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_SCHEDULED_TASKS_WEBHOOK_URL not configured');
        return;
      }

      const params = new URLSearchParams({
        new_tasks: JSON.stringify(newTasks)
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          added_by: adminEmail,
          code: code
        })
      });

      if (!response.ok) {
        console.error('Failed to send scheduled tasks to webhook:', response.status);
      }
    } catch (error) {
      console.error('Failed to send scheduled tasks to webhook:', error);
    }
  };

  const updateScheduledTask = async (taskId, updates) => {
    // Track timestamps for specific field changes
    const currentTimestamp = new Date().toISOString();
    const taskUpdates = {
      ...updates,
      updatedAt: currentTimestamp
    };
    
    // Find the existing task to check for field changes
    const existingTask = scheduledTasks.find(t => t.id === taskId);
    
    // Add timestamps for specific field updates
    if (existingTask) {
      // copyLinkAt - when copyLink is added or changed
      if ('copyLink' in updates && updates.copyLink !== existingTask.copyLink) {
        taskUpdates.copyLinkAt = currentTimestamp;
      }
      
      // copyWrittenAt - when copyWritten status changes
      if ('copyWritten' in updates && updates.copyWritten !== existingTask.copyWritten) {
        taskUpdates.copyWrittenAt = currentTimestamp;
      }
      
      // copyApprovalAt - when copyApproval status changes
      if ('copyApproval' in updates && updates.copyApproval !== existingTask.copyApproval) {
        taskUpdates.copyApprovalAt = currentTimestamp;
      }
      
      // viewerLinkAt - array of timestamps matching viewerLink array
      if ('viewerLink' in updates && Array.isArray(updates.viewerLink)) {
        const existingViewerLink = Array.isArray(existingTask.viewerLink) ? existingTask.viewerLink : [];
        const existingTimestamps = Array.isArray(existingTask.viewerLinkAt) ? existingTask.viewerLinkAt : [];
        
        // Create new timestamps array matching the updated viewerLink array
        const newTimestamps = updates.viewerLink.map((link, index) => {
          // If link changed or is new, use current timestamp
          if (link !== existingViewerLink[index]) {
            return currentTimestamp;
          }
          // Otherwise keep existing timestamp or use current if not available
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.viewerLinkAt = newTimestamps;
      }
      
      // viewerLinkApprovalAt - array of timestamps matching viewerLinkApproval array
      if ('viewerLinkApproval' in updates && Array.isArray(updates.viewerLinkApproval)) {
        const existingApproval = Array.isArray(existingTask.viewerLinkApproval) ? existingTask.viewerLinkApproval : [];
        const existingTimestamps = Array.isArray(existingTask.viewerLinkApprovalAt) ? existingTask.viewerLinkApprovalAt : [];
        
        // Create new timestamps array matching the updated viewerLinkApproval array
        const newTimestamps = updates.viewerLinkApproval.map((approval, index) => {
          // If approval changed or is new, use current timestamp
          if (approval !== existingApproval[index]) {
            return currentTimestamp;
          }
          // Otherwise keep existing timestamp or use current if not available
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.viewerLinkApprovalAt = newTimestamps;
      }
    }
    
    // Find the complete updated task
    const updatedTask = scheduledTasks.find(t => t.id === taskId);
    const completeUpdatedTask = { ...updatedTask, ...taskUpdates };
    
    // Update local state and localStorage immediately
    const updatedTasks = scheduledTasks.map(task =>
      task.id === taskId ? completeUpdatedTask : task
    );
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));
    
    // Send to webhook
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('VITE_SCHEDULED_TASKS_WEBHOOK_URL not configured');
      } else {
        // Prepare URL with updated_tasks in query parameters
        const params = new URLSearchParams({
          updated_tasks: JSON.stringify([completeUpdatedTask])
        });

        const response = await fetch(`${webhookUrl}?${params}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            updated_by: adminEmail,
            code: code
          })
        });

        if (!response.ok) {
          console.error('Failed to send scheduled task update to webhook:', response.status);
        }
      }
    } catch (error) {
      console.error('Failed to send scheduled task update to webhook:', error);
    }
  };

  const deleteScheduledTask = async (taskId) => {
    const updatedTasks = scheduledTasks.filter(task => task.id !== taskId);
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));
    
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
      if (webhookUrl) {
        const params = new URLSearchParams({
          deleted_task_ids: JSON.stringify([taskId])
        });

        const response = await fetch(`${webhookUrl}?${params}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            deleted_by: adminEmail,
            code: code
          })
        });

        if (!response.ok) {
          console.error('Failed to send scheduled task deletion to webhook:', response.status);
        }
      }
    } catch (error) {
      console.error('Failed to send scheduled task deletion to webhook:', error);
    }
  };

  // Batch delete scheduled tasks
  const deleteScheduledTasks = async (taskIds) => {
    const updatedTasks = scheduledTasks.filter(task => !taskIds.includes(task.id));
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));
    
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const todayUTC = getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = import.meta.env.VITE_SCHEDULED_TASKS_WEBHOOK_URL;
      if (webhookUrl) {
        const params = new URLSearchParams({
          deleted_task_ids: JSON.stringify(taskIds)
        });

        const response = await fetch(`${webhookUrl}?${params}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            deleted_by: adminEmail,
            code: code
          })
        });

        if (!response.ok) {
          console.error('Failed to send scheduled tasks deletion to webhook:', response.status);
        }
      }
    } catch (error) {
      console.error('Failed to send scheduled tasks deletion to webhook:', error);
    }
  };

  // User CRUD operations  
  // loadUsers moved above to be available in useEffect

  // Force refresh users from server (clears cache)
  const refreshUsersFromServer = async () => {
    try {
      // Clear localStorage cache
      localStorage.removeItem('hyrax_users');
      console.log('Cleared users cache');
      
      // Force load from API
      const response = await apiCall('/users');
      if (response && response.users) {
        setUsers(response.users);
        localStorage.setItem('hyrax_users', JSON.stringify(response.users));
        console.log('Users refreshed from server:', response.users.length);
        return response.users;
      }
    } catch (error) {
      console.error('Failed to refresh users from server:', error);
      throw error;
    }
  };

  // User management functions with localStorage persistence
  const addUser = async (userData) => {
    const newUser = {
      ...userData,
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 2, // Start from 2 (admin is 1)
      password: userData.password || 'password123', // Default password if not provided
      avatar: userData.avatar || userData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    
    // Update local state and localStorage immediately
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('hyrax_users', JSON.stringify(updatedUsers));
    
    console.log('Adding user:', newUser.email);
    
    // Persist to JSON file via API when available
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(newUser)
        });
        
        if (response.ok) {
          console.log('✓ User saved to users.json');
        } else {
          console.warn('⚠ Failed to save to users.json, saved locally only');
        }
      } catch (error) {
        console.warn('⚠ API not available, user saved locally only:', error.message);
      }
    } else {
      console.log('✓ User saved locally (API disabled)');
    }
  };

  const updateUser = async (userId, userData) => {
    const updatedData = {
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    // Update local state and localStorage immediately
    const updatedUsers = users.map(user =>
      user.id === userId
        ? { ...user, ...updatedData }
        : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('hyrax_users', JSON.stringify(updatedUsers));
    
    console.log('Updating user:', userId);
    
    // Persist to JSON file via API when available
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/users?id=${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(updatedData)
        });
        
        if (response.ok) {
          console.log('✓ User updated in users.json');
        } else {
          console.warn('⚠ Failed to update in users.json');
        }
      } catch (error) {
        console.warn('⚠ API not available, user updated locally only:', error.message);
      }
    }
  };

  const deleteUser = async (userId) => {
    // Update local state and localStorage immediately
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('hyrax_users', JSON.stringify(updatedUsers));
    
    console.log('Deleting user:', userId);
    
    // Persist to JSON file via API when available
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/users?id=${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          console.log('✓ User deleted from users.json');
        } else {
          console.warn('⚠ Failed to delete from users.json');
        }
      } catch (error) {
        console.warn('⚠ API not available, user deleted locally only:', error.message);
      }
    }
  };

  // Helper function for old deleteUser calls
  const oldDeleteUser = async (userId) => {
    // Persist to JSON file via API
    try {
      await apiCall(`/users/${userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete user from file:', error);
    }
  };

  // Helper function to get tasks by campaign
  const getTasksByCampaign = (campaignId) => {
    return tasks.filter(task => task.campaignId === campaignId);
  };

  const value = {
    // Authentication
    isAuthenticated,
    currentUser,
    authToken,
    loading,
    login,
    logout,
    
    // Data
    campaigns,
    tasks,
    setTasks,
    scheduledTasks,
    setScheduledTasks,
    users,
    columns,
    
    // Loading states
    campaignsLoading,
    tasksLoading,
    scheduledTasksLoading,
    usersLoading,
    
    // Operations
    loadCampaigns,
    loadCampaignsData,
    loadTasksFromWebhook,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addTask,
    addTasks,
    updateTask,
    deleteTask,
    deleteTasks,
    addScheduledTask,
    addScheduledTasks,
    updateScheduledTask,
    deleteScheduledTask,
    deleteScheduledTasks,
    loadScheduledTasksFromWebhook,
    addColumn,
    updateColumn,
    deleteColumn,
    loadUsers,
    refreshUsersFromServer,
    addUser,
    updateUser,
    deleteUser,
    getTasksByCampaign,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};