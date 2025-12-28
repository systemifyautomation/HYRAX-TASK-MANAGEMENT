import React, { createContext, useContext, useState, useEffect } from 'react';

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
  const [users, setUsers] = useState([]);
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
      id: 'campaignName',
      name: 'Campaign Name',
      key: 'campaignId',
      type: 'campaign',
      width: 180,
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

  // Check authentication on mount
  useEffect(() => {
    // Always load initial campaigns data, regardless of auth state
    loadCampaignsData();
    
    // Load users data immediately
    loadUsers();
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Load campaigns data from webhook
  const loadCampaignsData = async () => {
    try {
      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/get-all-campaigns';
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Campaigns loaded from webhook:', data);
        // Map webhook structure to app structure
        const mappedCampaigns = data.map(campaign => ({
          id: campaign.id,
          name: campaign.campaign_name,
          slackId: campaign.slack_channel_ID
        }));
        setCampaigns(mappedCampaigns);
      } else {
        console.error('Failed to fetch campaigns from webhook');
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
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
      
      // Load app data
      await loadInitialData();
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
        await loadInitialData();
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

  const loadInitialData = async () => {
    try {
      // Load tasks from localStorage or use default data
      const storedTasks = localStorage.getItem('hyrax_tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        // Default tasks data
        const defaultTasks = [
          {
            id: 1,
            priority: "high",
            mediaType: "IMAGE",
            scriptAssigned: 1,
            copyWritten: true,
            copyLink: "https://docs.google.com/document/d/1abc123",
            copyApproval: "Approved",
            assignedTo: 2,
            campaignId: 1,
            viewerLink: ["https://viewer.example.com/task1"],
            caliVariation: ["CA-001"],
            slackPermalink: ["https://hyraxhq.slack.com/archives/C123/p1234567890"],
            adStatus: "Complete",
            adApproval: "Approved",
            qcSignOff: "Complete",
            postStatus: "Complete",
            driveUpload: "Complete",
            createdAt: "2025-01-15T10:00:00.000Z",
            updatedAt: "2025-01-15T14:30:00.000Z"
          },
          {
            id: 2,
            priority: "normal",
            mediaType: "VIDEO",
            scriptAssigned: 1,
            copyWritten: false,
            copyLink: "",
            copyApproval: "Needs Review",
            assignedTo: 3,
            campaignId: 2,
            viewerLink: [],
            caliVariation: ["CA-002"],
            slackPermalink: [],
            adStatus: "In Progress",
            adApproval: "Needs Review",
            qcSignOff: "Pending",
            postStatus: "Incomplete",
            driveUpload: "Incomplete",
            createdAt: "2025-01-20T09:00:00.000Z",
            updatedAt: "2025-01-20T16:45:00.000Z"
          }
        ];
        setTasks(defaultTasks);
        localStorage.setItem('hyrax_tasks', JSON.stringify(defaultTasks));
      }

      // Load users from API first, then localStorage, then default data
      try {
        if (USE_API) {
          const usersResponse = await apiCall('/users');
          if (usersResponse && usersResponse.users && usersResponse.users.length > 0) {
            setUsers(usersResponse.users);
            localStorage.setItem('hyrax_users', JSON.stringify(usersResponse.users));
          } else {
            throw new Error('No users from API');
          }
        } else {
          throw new Error('API disabled');
        }
      } catch (error) {
        // Fallback to localStorage
        const storedUsers = localStorage.getItem('hyrax_users');
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        } else {
          // Default users data as final fallback - matches users.json
          const defaultUsers = [
            {
              id: 1,
              name: 'HYRAX Super Admin',
              email: 'admin@hyrax.com',
              role: 'super_admin',
              password: 'HyraxAdmin2024!SecurePass',
              avatar: 'HSA',
              createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: 2,
              name: 'Test User',
              email: 'test@hyrax.com',
              role: 'team_member',
              password: 'password123',
              avatar: 'TU',
              createdAt: '2025-01-02T10:00:00.000Z'
            }
          ];
          setUsers(defaultUsers);
          localStorage.setItem('hyrax_users', JSON.stringify(defaultUsers));
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
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

  // Task operations with localStorage and API persistence
  const addTask = async (taskData) => {
    const newTask = {
      ...taskData,
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Update local state and localStorage immediately
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
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

  const updateTask = async (taskId, updates) => {
    const taskUpdates = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Update local state and localStorage immediately
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...taskUpdates }
        : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Persist to JSON file via API
    try {
      await apiCall(`/tasks/${taskId}`, {
        method: 'PUT',
        body: taskUpdates,
      });
    } catch (error) {
      console.error('Failed to update task in file:', error);
    }
  };

  const deleteTask = async (taskId) => {
    // Update local state and localStorage immediately
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem('hyrax_tasks', JSON.stringify(updatedTasks));
    
    // Persist to JSON file via API
    try {
      await apiCall(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete task from file:', error);
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

  // User CRUD operations  
  const loadUsers = async () => {
    try {
      // First try to load from API (users.json file)
      const response = await apiCall('/users');
      if (response && response.users) {
        setUsers(response.users);
        localStorage.setItem('hyrax_users', JSON.stringify(response.users));
        console.log('Users loaded from API (users.json):', response.users.length);
        return;
      }
    } catch (error) {
      console.error('Failed to load users from API:', error);
    }
    
    // Fallback to localStorage if API fails
    try {
      const storedUsers = localStorage.getItem('hyrax_users');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        setUsers(parsedUsers);
        console.log('Users loaded from localStorage:', parsedUsers.length);
        return;
      }
    } catch (error) {
      console.error('Failed to parse stored users:', error);
    }
    
    // Final fallback to default admin user only
    const defaultAdminUser = {
      id: 1,
      name: 'HYRAX Super Admin',
      email: 'admin@wearehyrax.com',
      role: 'super_admin',
      password: 'HyraxAdmin2024!SecurePass',
      avatar: 'HSA',
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
      lastLogin: null
    };
    
    setUsers([defaultAdminUser]);
    localStorage.setItem('hyrax_users', JSON.stringify([defaultAdminUser]));
    console.log('Users loaded from fallback (admin only)');
  };

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
    users,
    columns,
    
    // Operations
    loadCampaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addTask,
    updateTask,
    deleteTask,
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