import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

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
  
  // Track optimistically added tasks (not yet in database)
  const [optimisticTaskIds, setOptimisticTaskIds] = useState(new Set());
  const [optimisticScheduledTaskIds, setOptimisticScheduledTaskIds] = useState(new Set());
  
  // Loading states for each data type
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [scheduledTasksLoading, setScheduledTasksLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Data caching to prevent unnecessary reloads
  const [tasksCache, setTasksCache] = useState({ data: null, timestamp: 0, week: null });
  const [scheduledTasksCache, setScheduledTasksCache] = useState({ data: null, timestamp: 0, week: null });
  const CACHE_DURATION = 2000; // 2 seconds cache
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
      type: 'array-checkbox',
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

  // Frontend-only mode: backend API is disabled
  const API_BASE = '';
  const USE_API = false;
  
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
              const loginDate = localStorage.getItem('login_date') || getTodayUTC();
              const code = await hashThreeInputs(userEmail, adminPassword, loginDate);
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
                const text = await response.text();
                if (text) {
                  try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                      const validTasks = data.filter(task => task && Object.keys(task).length > 0 && task.id);
                      
                      // Preserve optimistically added tasks that aren't in the webhook response yet
                      const webhookTaskIds = new Set(validTasks.map(t => t.id));
                      const currentOptimisticTasks = tasks.filter(t => optimisticTaskIds.has(t.id) && !webhookTaskIds.has(t.id));
                      
                      // Merge webhook data with optimistic tasks
                      const mergedTasks = [...validTasks, ...currentOptimisticTasks];
                      
                      // Clean up tracking for tasks that now appear in webhook
                      setOptimisticTaskIds(prev => {
                        const updated = new Set(prev);
                        validTasks.forEach(t => updated.delete(t.id));
                        return updated;
                      });
                      
                      setTasks(mergedTasks);
                      localStorage.setItem('hyrax_tasks', JSON.stringify(mergedTasks));
                    }
                  } catch (jsonError) {
                    console.error('Failed to parse tasks JSON:', jsonError);
                  }
                } else {
                  console.log('Empty response from tasks webhook');
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
              const loginDate = localStorage.getItem('login_date') || getTodayUTC();
              const code = await hashThreeInputs(userEmail, adminPassword, loginDate);
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
                const text = await response.text();
                if (text) {
                  try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                      const validTasks = data.filter(task => task && Object.keys(task).length > 0 && task.id);
                      
                      // Preserve optimistically added scheduled tasks that aren't in the webhook response yet
                      const webhookTaskIds = new Set(validTasks.map(t => t.id));
                      const currentOptimisticTasks = scheduledTasks.filter(t => optimisticScheduledTaskIds.has(t.id) && !webhookTaskIds.has(t.id));
                      
                      // Merge webhook data with optimistic tasks
                      const mergedTasks = [...validTasks, ...currentOptimisticTasks];
                      
                      // Clean up tracking for tasks that now appear in webhook
                      setOptimisticScheduledTaskIds(prev => {
                        const updated = new Set(prev);
                        validTasks.forEach(t => updated.delete(t.id));
                        return updated;
                      });
                      
                      setScheduledTasks(mergedTasks);
                      localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(mergedTasks));
                    }
                  } catch (jsonError) {
                    console.error('Failed to parse scheduled tasks JSON:', jsonError);
                  }
                } else {
                  console.log('Empty response from scheduled tasks webhook');
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
  }, [isAuthenticated, currentUser, tasks, scheduledTasks, optimisticTaskIds, optimisticScheduledTaskIds]);

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
      
      const loginWebhookUrl = import.meta.env.VITE_LOGIN_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/new-tasks-login';
      
      // Call login webhook directly in frontend-only mode
      const response = await fetch(loginWebhookUrl, {
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
    localStorage.removeItem('login_date');
    localStorage.removeItem('admin_password');
  };

  const verifyToken = async (token) => {
    try {
      // Check if we have a stored user
      const storedUser = localStorage.getItem('current_user');
      const loginDate = localStorage.getItem('login_date');
      const todayUTC = getTodayUTC();
      
      // Check if the date has changed since login
      if (loginDate && loginDate !== todayUTC) {
        console.log('⚠️ Date has changed since login. Clearing authentication.');
        console.log(`Login date: ${loginDate}, Current date: ${todayUTC}`);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        localStorage.removeItem('login_date');
        // Don't remove admin_password so user can log back in
        alert('Your session has expired due to date change. Please log in again.');
        setLoading(false);
        return;
      }
      
      if (token && storedUser) {
        const authenticatedUser = JSON.parse(storedUser);
        
        setAuthToken(token);
        setCurrentUser(authenticatedUser);
        setIsAuthenticated(true);
        // Data will be loaded on-demand by each page
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        localStorage.removeItem('login_date');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      localStorage.removeItem('login_date');
    } finally {
      setLoading(false);
    }
  };

  // Data is now loaded on-demand by each page

  // Load tasks from n8n webhook
  const loadTasksFromWebhook = async (user = null, week = null) => {
    // Check cache first
    const now = Date.now();
    const cacheKey = week || 'default';
    if (tasksCache.data && 
        tasksCache.week === cacheKey && 
        (now - tasksCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached tasks data');
      setTasks(tasksCache.data);
      return;
    }
    
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
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(userEmail, adminPassword, loginDate);

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
        const text = await response.text();
        let data = [];
        
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (error) {
            console.error('Failed to parse tasks JSON:', error);
            data = [];
          }
        } else {
          console.info('Empty response from tasks webhook');
        }
        
        // Filter out empty objects (happens when a week has no tasks)
        const validTasks = Array.isArray(data) ? data.filter(task => task && Object.keys(task).length > 0 && task.id) : [];
        console.log('Tasks loaded from webhook:', validTasks.length || 0);
        setTasks(validTasks);
        localStorage.setItem('hyrax_tasks', JSON.stringify(validTasks));
        
        // Update cache
        setTasksCache({ data: validTasks, timestamp: Date.now(), week: cacheKey });
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

  const slugify = (value) => {
    if (!value) return '';
    return value
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const sendCreativeApprovedWebhook = async (creativeData = [], taskData = null) => {
    const webhookUrl = import.meta.env.VITE_TASKS_CREATIVE_APPROVED_WEBHOOK_URL;
    const taskId = taskData?.id ?? null;
    const campaignId = taskData?.campaignId ?? null;
    const userId = taskData?.assignedTo ?? null;
    const campaignName = taskData?.campaignName || campaigns.find(c => c.id === parseInt(campaignId))?.name || '';
    
    // Find user and campaign for path construction
    const user = users.find(u => String(u.id) === String(userId));
    const campaign = campaigns.find(c => String(c.id) === String(campaignId));
    const userSlug = user ? slugify(user.slug || user.name || user.email || user.username || user.id) : '';
    const campaignSlug = campaign ? slugify(campaign.slug || campaign.name || campaign.id) : '';
    
    // Calculate ad number helper
    const calculateAdNumber = (linkIndex, userDepartment) => {
      const isVideoEditor = userDepartment === 'VIDEO EDITING';
      return Math.floor(linkIndex / (isVideoEditor ? 2 : 1)) + 1;
    };

    if (!Array.isArray(creativeData) || creativeData.length === 0) {
      return;
    }

    if (!webhookUrl) {
      console.error('VITE_TASKS_CREATIVE_APPROVED_WEBHOOK_URL not configured');
      return;
    }

    await Promise.all(creativeData.map(async (item) => {
      const creativeUrl = item.url;
      const adIndex = item.index;
      const slackPermalink = item.permalink || '';
      const adNumber = calculateAdNumber(adIndex, user?.department);
      
      // Construct path: /userSlug/campaignSlug/ad_N/preview
      const path = `/${userSlug}/${campaignSlug}/ad_${adNumber}/preview`;
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            creative_url: creativeUrl,
            task_id: taskId,
            campaign_id: campaignId,
            campaign_name: campaignName,
            path: path,
            creative_index: adIndex,
            slack_permalink: slackPermalink
          })
        });

        if (!response.ok) {
          console.error('Failed to send creative approved webhook:', response.status, creativeUrl);
        }
      } catch (error) {
        console.error('Failed to send creative approved webhook:', error);
      }
    }));
  };

  const applyCreativeApprovalGuardsAndCleanup = (existingTask, incomingUpdates = {}) => {
    const sanitizedUpdates = { ...incomingUpdates };
    const newlyApprovedCreativeUrls = [];
    const newlyApprovedCreativeData = []; // Store URL and index

    if (!existingTask) {
      return { sanitizedUpdates, newlyApprovedCreativeUrls, newlyApprovedCreativeData };
    }

    const existingApprovals = Array.isArray(existingTask.viewerLinkApproval) ? existingTask.viewerLinkApproval : [];
    const existingLinks = Array.isArray(existingTask.viewerLink) ? existingTask.viewerLink : [];
    const existingFeedback = Array.isArray(existingTask.viewerLinkFeedback) ? existingTask.viewerLinkFeedback : [];
    const existingSlackPermalinks = Array.isArray(existingTask.slackPermalink) ? existingTask.slackPermalink : [];

    const isLockedCreative = (index) => existingApprovals[index] === 'Approved' || existingApprovals[index] === 'Uploaded';

    if (Array.isArray(sanitizedUpdates.viewerLink)) {
      sanitizedUpdates.viewerLink = [...sanitizedUpdates.viewerLink];
      sanitizedUpdates.viewerLink.forEach((_, index) => {
        if (isLockedCreative(index)) {
          sanitizedUpdates.viewerLink[index] = existingLinks[index] || '';
        }
      });
    }

    if (Array.isArray(sanitizedUpdates.viewerLinkFeedback)) {
      sanitizedUpdates.viewerLinkFeedback = [...sanitizedUpdates.viewerLinkFeedback];
      sanitizedUpdates.viewerLinkFeedback.forEach((_, index) => {
        if (isLockedCreative(index)) {
          sanitizedUpdates.viewerLinkFeedback[index] = existingFeedback[index] || '';
        }
      });
    }

    if (Array.isArray(sanitizedUpdates.viewerLinkApproval)) {
      sanitizedUpdates.viewerLinkApproval = [...sanitizedUpdates.viewerLinkApproval];

      sanitizedUpdates.viewerLinkApproval.forEach((approval, index) => {
        if (isLockedCreative(index)) {
          sanitizedUpdates.viewerLinkApproval[index] = existingApprovals[index];
          return;
        }

        if (approval === 'Approved') {
          const sourceLinks = Array.isArray(sanitizedUpdates.viewerLink) ? sanitizedUpdates.viewerLink : existingLinks;
          const creativeUrl = sourceLinks[index];
          const slackPermalink = existingSlackPermalinks[index] || '';

          if (typeof creativeUrl === 'string' && creativeUrl.trim()) {
            newlyApprovedCreativeUrls.push(creativeUrl.trim());
            newlyApprovedCreativeData.push({
              url: creativeUrl.trim(),
              index: index,
              permalink: slackPermalink
            });
          }

          // Mark as uploaded (keep viewerLink intact for preview access)
          sanitizedUpdates.viewerLinkApproval[index] = 'Uploaded';
        }
      });
    }

    return {
      sanitizedUpdates,
      newlyApprovedCreativeUrls: [...new Set(newlyApprovedCreativeUrls)],
      newlyApprovedCreativeData
    };
  };

  // Task operations with localStorage and API persistence
  const addTask = async (taskData) => {
    const currentTimestamp = new Date().toISOString();
    const newTask = {
      ...taskData,
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      // Ensure array fields for copy-related data
      copyLink: Array.isArray(taskData.copyLink) ? taskData.copyLink : (taskData.copyLink ? [taskData.copyLink] : [""]),
      copyWritten: Array.isArray(taskData.copyWritten) ? taskData.copyWritten : (taskData.copyWritten ? [taskData.copyWritten === true] : [false]),
      copyApproval: Array.isArray(taskData.copyApproval) ? taskData.copyApproval : (taskData.copyApproval ? [taskData.copyApproval] : [""]),
      copyApprovalFeedback: Array.isArray(taskData.copyApprovalFeedback) ? taskData.copyApprovalFeedback : (taskData.copyApprovalFeedback ? [taskData.copyApprovalFeedback] : [""]),
      scriptAssigned: Array.isArray(taskData.scriptAssigned) ? taskData.scriptAssigned : (taskData.scriptAssigned ? [taskData.scriptAssigned] : [""]),
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
      copyLinkAt: Array.isArray(taskData.copyLink) ? taskData.copyLink.map(() => currentTimestamp) : (taskData.copyLink ? [currentTimestamp] : [""]),
      copyWrittenAt: Array.isArray(taskData.copyWritten) ? taskData.copyWritten.map(() => currentTimestamp) : (taskData.copyWritten ? [currentTimestamp] : [""]),
      copyApprovalAt: Array.isArray(taskData.copyApproval) ? taskData.copyApproval.map(() => currentTimestamp) : (taskData.copyApproval ? [currentTimestamp] : [""]),
      viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
      viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };
    
    // Update local state and localStorage immediately
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Track this task as optimistically added
    setOptimisticTaskIds(prev => new Set(prev).add(newTask.id));
    
    // Send to webhook
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
        // Ensure array fields for copy-related data
        copyLink: Array.isArray(taskData.copyLink) ? taskData.copyLink : (taskData.copyLink ? [taskData.copyLink] : [""]),
        copyWritten: Array.isArray(taskData.copyWritten) ? taskData.copyWritten : (taskData.copyWritten ? [taskData.copyWritten === true] : [false]),
        copyApproval: Array.isArray(taskData.copyApproval) ? taskData.copyApproval : (taskData.copyApproval ? [taskData.copyApproval] : [""]),
        copyApprovalFeedback: Array.isArray(taskData.copyApprovalFeedback) ? taskData.copyApprovalFeedback : (taskData.copyApprovalFeedback ? [taskData.copyApprovalFeedback] : [""]),
        scriptAssigned: Array.isArray(taskData.scriptAssigned) ? taskData.scriptAssigned : (taskData.scriptAssigned ? [taskData.scriptAssigned] : [""]),
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
        copyLinkAt: Array.isArray(taskData.copyLink) ? taskData.copyLink.map(() => currentTimestamp) : (taskData.copyLink ? [currentTimestamp] : [""]),
        copyWrittenAt: Array.isArray(taskData.copyWritten) ? taskData.copyWritten.map(() => currentTimestamp) : (taskData.copyWritten ? [currentTimestamp] : [""]),
        copyApprovalAt: Array.isArray(taskData.copyApproval) ? taskData.copyApproval.map(() => currentTimestamp) : (taskData.copyApproval ? [currentTimestamp] : [""]),
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
    
    // Track these tasks as optimistically added
    setOptimisticTaskIds(prev => {
      const updated = new Set(prev);
      newTasks.forEach(t => updated.add(t.id));
      return updated;
    });
    
    // Send all tasks to webhook in a single request
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
    console.log('🔵 updateTask called - taskId:', taskId);
    console.log('🔵 updateTask - updates:', updates);
    console.log('🔵 updateTask - additionalQueryParams:', additionalQueryParams);
    
    // Find the existing task and enforce immutable approved/uploaded creatives
    const existingTask = tasks.find(t => t.id === taskId);
    console.log('🔵 updateTask - existingTask found:', existingTask ? 'YES' : 'NO');
    
    const { sanitizedUpdates, newlyApprovedCreativeUrls, newlyApprovedCreativeData } = applyCreativeApprovalGuardsAndCleanup(existingTask, updates);

    // Track timestamps for specific field changes
    const currentTimestamp = new Date().toISOString();
    const taskUpdates = {
      ...sanitizedUpdates,
      updatedAt: currentTimestamp
    };
    
    // Add timestamps for specific field updates
    if (existingTask) {
      // copyLinkAt - array of timestamps matching copyLink array
      if ('copyLink' in sanitizedUpdates && Array.isArray(sanitizedUpdates.copyLink)) {
        const existingCopyLink = Array.isArray(existingTask.copyLink) ? existingTask.copyLink : [];
        const existingTimestamps = Array.isArray(existingTask.copyLinkAt) ? existingTask.copyLinkAt : [];
        
        const newTimestamps = sanitizedUpdates.copyLink.map((link, index) => {
          if (link !== existingCopyLink[index]) {
            return currentTimestamp;
          }
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.copyLinkAt = newTimestamps;
      }
      
      // copyWrittenAt - array of timestamps matching copyWritten array
      if ('copyWritten' in sanitizedUpdates && Array.isArray(sanitizedUpdates.copyWritten)) {
        const existingCopyWritten = Array.isArray(existingTask.copyWritten) ? existingTask.copyWritten : [];
        const existingTimestamps = Array.isArray(existingTask.copyWrittenAt) ? existingTask.copyWrittenAt : [];
        
        const newTimestamps = sanitizedUpdates.copyWritten.map((written, index) => {
          if (written !== existingCopyWritten[index]) {
            return currentTimestamp;
          }
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.copyWrittenAt = newTimestamps;
      }
      
      // copyApprovalAt - array of timestamps matching copyApproval array
      if ('copyApproval' in sanitizedUpdates && Array.isArray(sanitizedUpdates.copyApproval)) {
        const existingCopyApproval = Array.isArray(existingTask.copyApproval) ? existingTask.copyApproval : [];
        const existingTimestamps = Array.isArray(existingTask.copyApprovalAt) ? existingTask.copyApprovalAt : [];
        
        const newTimestamps = sanitizedUpdates.copyApproval.map((approval, index) => {
          if (approval !== existingCopyApproval[index]) {
            return currentTimestamp;
          }
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.copyApprovalAt = newTimestamps;
      }
      
      // viewerLinkAt - array of timestamps matching viewerLink array
      if ('viewerLink' in sanitizedUpdates && Array.isArray(sanitizedUpdates.viewerLink)) {
        const existingViewerLink = Array.isArray(existingTask.viewerLink) ? existingTask.viewerLink : [];
        const existingTimestamps = Array.isArray(existingTask.viewerLinkAt) ? existingTask.viewerLinkAt : [];
        
        // Create new timestamps array matching the updated viewerLink array
        const newTimestamps = sanitizedUpdates.viewerLink.map((link, index) => {
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
      // Only auto-generate timestamps if not explicitly provided in updates
      if ('viewerLinkApproval' in sanitizedUpdates && Array.isArray(sanitizedUpdates.viewerLinkApproval)) {
        // Check if timestamps were explicitly provided in updates
        if (!('viewerLinkApprovalAt' in sanitizedUpdates)) {
          const existingApproval = Array.isArray(existingTask.viewerLinkApproval) ? existingTask.viewerLinkApproval : [];
          const existingTimestamps = Array.isArray(existingTask.viewerLinkApprovalAt) ? existingTask.viewerLinkApprovalAt : [];
          
          // Create new timestamps array matching the updated viewerLinkApproval array
          const newTimestamps = sanitizedUpdates.viewerLinkApproval.map((approval, index) => {
            // If approval changed or is new, use current timestamp
            if (approval !== existingApproval[index]) {
              return currentTimestamp;
            }
            // Otherwise keep existing timestamp or use current if not available
            return existingTimestamps[index] || currentTimestamp;
          });
          
          taskUpdates.viewerLinkApprovalAt = newTimestamps;
        }
        // If timestamps were explicitly provided, they'll be included via sanitizedUpdates
      }
    }
    
    // Find the complete updated task
    const updatedTask = tasks.find(t => t.id === taskId);
    const completeUpdatedTask = { ...updatedTask, ...taskUpdates };
    
    console.log('🔵 updateTask - sending PATCH request to webhook (NOT updating local state)');
    
    // Send to webhook - database is source of truth
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

      const webhookUrl = import.meta.env.VITE_TASKS_WEBHOOK_URL;
      console.log('🔵 updateTask - webhookUrl:', webhookUrl);
      
      if (!webhookUrl) {
        console.error('VITE_TASKS_WEBHOOK_URL not configured');
      } else {
        // Prepare query parameters with updated_tasks and any additional params
        const params = new URLSearchParams({
          updated_tasks: JSON.stringify([completeUpdatedTask]),
          ...additionalQueryParams // Add any additional parameters (e.g., previous_url, new_url)
        });

        console.log('🔵 updateTask - sending PATCH request to webhook');
        console.log('🔵 updateTask - URL:', webhookUrl);
        console.log('🔵 updateTask - query params:', Array.from(params.keys()));
        
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

        console.log('🔵 updateTask - webhook response status:', response.status);
        if (!response.ok) {
          const responseText = await response.text();
          console.error('Failed to send task update to webhook:', response.status);
          console.error('Response body:', responseText);
        } else {
          console.log('✅ updateTask - webhook PATCH request successful - background refresh will update UI');
        }
      }
    } catch (error) {
      console.error('❌ updateTask - Failed to send task update to webhook:', error);
      console.error('❌ updateTask - Error message:', error.message);
      console.error('❌ updateTask - Error stack:', error.stack);
    }

    await sendCreativeApprovedWebhook(newlyApprovedCreativeData, completeUpdatedTask);
    
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
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
  const loadScheduledTasksFromWebhook = async (user = null, week = null) => {
    // Check cache first
    const now = Date.now();
    const cacheKey = week || 'default';
    if (scheduledTasksCache.data && 
        scheduledTasksCache.week === cacheKey &&
        (now - scheduledTasksCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached scheduled tasks data');
      setScheduledTasks(scheduledTasksCache.data);
      return;
    }
    
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
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(userEmail, adminPassword, loginDate);

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
        const text = await response.text();
        let data = [];
        
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (error) {
            console.error('Failed to parse scheduled tasks JSON:', error);
            data = [];
          }
        } else {
          console.info('Empty response from scheduled tasks webhook');
        }
        
        // Filter out empty objects (happens when a week has no tasks)
        const validTasks = Array.isArray(data) ? data.filter(task => task && Object.keys(task).length > 0 && task.id) : [];
        console.log('Scheduled tasks loaded from webhook:', validTasks.length || 0);
        setScheduledTasks(validTasks);
        localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(validTasks));
        
        // Update cache
        setScheduledTasksCache({ data: validTasks, timestamp: Date.now(), week: cacheKey });
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
      // Ensure array fields for copy-related data
      copyLink: Array.isArray(taskData.copyLink) ? taskData.copyLink : (taskData.copyLink ? [taskData.copyLink] : [""]),
      copyWritten: Array.isArray(taskData.copyWritten) ? taskData.copyWritten : (taskData.copyWritten ? [taskData.copyWritten === true] : [false]),
      copyApproval: Array.isArray(taskData.copyApproval) ? taskData.copyApproval : (taskData.copyApproval ? [taskData.copyApproval] : [""]),
      copyApprovalFeedback: Array.isArray(taskData.copyApprovalFeedback) ? taskData.copyApprovalFeedback : (taskData.copyApprovalFeedback ? [taskData.copyApprovalFeedback] : [""]),
      scriptAssigned: Array.isArray(taskData.scriptAssigned) ? taskData.scriptAssigned : (taskData.scriptAssigned ? [taskData.scriptAssigned] : [""]),
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
      copyLinkAt: Array.isArray(taskData.copyLink) ? taskData.copyLink.map(() => currentTimestamp) : (taskData.copyLink ? [currentTimestamp] : [""]),
      copyWrittenAt: Array.isArray(taskData.copyWritten) ? taskData.copyWritten.map(() => currentTimestamp) : (taskData.copyWritten ? [currentTimestamp] : [""]),
      copyApprovalAt: Array.isArray(taskData.copyApproval) ? taskData.copyApproval.map(() => currentTimestamp) : (taskData.copyApproval ? [currentTimestamp] : [""]),
      viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
      viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };
    
    const updatedTasks = [...scheduledTasks, newTask];
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));
    
    // Track this scheduled task as optimistically added
    setOptimisticScheduledTaskIds(prev => new Set(prev).add(newTask.id));
    
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
        // Ensure array fields for copy-related data
        copyLink: Array.isArray(taskData.copyLink) ? taskData.copyLink : (taskData.copyLink ? [taskData.copyLink] : [""]),
        copyWritten: Array.isArray(taskData.copyWritten) ? taskData.copyWritten : (taskData.copyWritten ? [taskData.copyWritten === true] : [false]),
        copyApproval: Array.isArray(taskData.copyApproval) ? taskData.copyApproval : (taskData.copyApproval ? [taskData.copyApproval] : [""]),
        copyApprovalFeedback: Array.isArray(taskData.copyApprovalFeedback) ? taskData.copyApprovalFeedback : (taskData.copyApprovalFeedback ? [taskData.copyApprovalFeedback] : [""]),
        scriptAssigned: Array.isArray(taskData.scriptAssigned) ? taskData.scriptAssigned : (taskData.scriptAssigned ? [taskData.scriptAssigned] : [""]),
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
        copyLinkAt: Array.isArray(taskData.copyLink) ? taskData.copyLink.map(() => currentTimestamp) : (taskData.copyLink ? [currentTimestamp] : [""]),
        copyWrittenAt: Array.isArray(taskData.copyWritten) ? taskData.copyWritten.map(() => currentTimestamp) : (taskData.copyWritten ? [currentTimestamp] : [""]),
        copyApprovalAt: Array.isArray(taskData.copyApproval) ? taskData.copyApproval.map(() => currentTimestamp) : (taskData.copyApproval ? [currentTimestamp] : [""]),
        viewerLinkAt: Array.isArray(taskData.viewerLink) ? taskData.viewerLink.map(() => currentTimestamp) : [],
        viewerLinkApprovalAt: Array.isArray(taskData.viewerLinkApproval) ? taskData.viewerLinkApproval.map(() => currentTimestamp) : [],
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      };
    });

    const updatedTasks = [...scheduledTasks, ...newTasks];
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));

    // Track these scheduled tasks as optimistically added
    setOptimisticScheduledTaskIds(prev => {
      const updated = new Set(prev);
      newTasks.forEach(t => updated.add(t.id));
      return updated;
    });

    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
    // Find the existing task and enforce immutable approved/uploaded creatives
    const existingTask = scheduledTasks.find(t => t.id === taskId);
    const { sanitizedUpdates, newlyApprovedCreativeUrls, newlyApprovedCreativeData } = applyCreativeApprovalGuardsAndCleanup(existingTask, updates);

    // Track timestamps for specific field changes
    const currentTimestamp = new Date().toISOString();
    const taskUpdates = {
      ...sanitizedUpdates,
      updatedAt: currentTimestamp
    };
    
    // Add timestamps for specific field updates
    if (existingTask) {
      // copyLinkAt - array of timestamps matching copyLink array
      if ('copyLink' in sanitizedUpdates && Array.isArray(sanitizedUpdates.copyLink)) {
        const existingCopyLink = Array.isArray(existingTask.copyLink) ? existingTask.copyLink : [];
        const existingTimestamps = Array.isArray(existingTask.copyLinkAt) ? existingTask.copyLinkAt : [];
        
        const newTimestamps = sanitizedUpdates.copyLink.map((link, index) => {
          if (link !== existingCopyLink[index]) {
            return currentTimestamp;
          }
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.copyLinkAt = newTimestamps;
      }
      
      // copyWrittenAt - array of timestamps matching copyWritten array
      if ('copyWritten' in sanitizedUpdates && Array.isArray(sanitizedUpdates.copyWritten)) {
        const existingCopyWritten = Array.isArray(existingTask.copyWritten) ? existingTask.copyWritten : [];
        const existingTimestamps = Array.isArray(existingTask.copyWrittenAt) ? existingTask.copyWrittenAt : [];
        
        const newTimestamps = sanitizedUpdates.copyWritten.map((written, index) => {
          if (written !== existingCopyWritten[index]) {
            return currentTimestamp;
          }
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.copyWrittenAt = newTimestamps;
      }
      
      // copyApprovalAt - array of timestamps matching copyApproval array
      if ('copyApproval' in sanitizedUpdates && Array.isArray(sanitizedUpdates.copyApproval)) {
        const existingCopyApproval = Array.isArray(existingTask.copyApproval) ? existingTask.copyApproval : [];
        const existingTimestamps = Array.isArray(existingTask.copyApprovalAt) ? existingTask.copyApprovalAt : [];
        
        const newTimestamps = sanitizedUpdates.copyApproval.map((approval, index) => {
          if (approval !== existingCopyApproval[index]) {
            return currentTimestamp;
          }
          return existingTimestamps[index] || currentTimestamp;
        });
        
        taskUpdates.copyApprovalAt = newTimestamps;
      }
      
      // viewerLinkAt - array of timestamps matching viewerLink array
      if ('viewerLink' in sanitizedUpdates && Array.isArray(sanitizedUpdates.viewerLink)) {
        const existingViewerLink = Array.isArray(existingTask.viewerLink) ? existingTask.viewerLink : [];
        const existingTimestamps = Array.isArray(existingTask.viewerLinkAt) ? existingTask.viewerLinkAt : [];
        
        // Create new timestamps array matching the updated viewerLink array
        const newTimestamps = sanitizedUpdates.viewerLink.map((link, index) => {
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
      // Only auto-generate timestamps if not explicitly provided in updates
      if ('viewerLinkApproval' in sanitizedUpdates && Array.isArray(sanitizedUpdates.viewerLinkApproval)) {
        // Check if timestamps were explicitly provided in updates
        if (!('viewerLinkApprovalAt' in sanitizedUpdates)) {
          const existingApproval = Array.isArray(existingTask.viewerLinkApproval) ? existingTask.viewerLinkApproval : [];
          const existingTimestamps = Array.isArray(existingTask.viewerLinkApprovalAt) ? existingTask.viewerLinkApprovalAt : [];
          
          // Create new timestamps array matching the updated viewerLinkApproval array
          const newTimestamps = sanitizedUpdates.viewerLinkApproval.map((approval, index) => {
            // If approval changed or is new, use current timestamp
            if (approval !== existingApproval[index]) {
              return currentTimestamp;
            }
            // Otherwise keep existing timestamp or use current if not available
            return existingTimestamps[index] || currentTimestamp;
          });
          
          taskUpdates.viewerLinkApprovalAt = newTimestamps;
        }
        // If timestamps were explicitly provided, they'll be included via sanitizedUpdates
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
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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

    await sendCreativeApprovedWebhook(newlyApprovedCreativeData, completeUpdatedTask);
  };

  const deleteScheduledTask = async (taskId) => {
    const updatedTasks = scheduledTasks.filter(task => task.id !== taskId);
    setScheduledTasks(updatedTasks);
    localStorage.setItem('hyrax_scheduled_tasks', JSON.stringify(updatedTasks));
    
    try {
      const adminEmail = currentUser?.email || '';
      const adminPassword = localStorage.getItem('admin_password') || '';
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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