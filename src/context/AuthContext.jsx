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
      options: ['urgent', 'high', 'normal', 'low']
    },
    {
      id: 'mediaType',
      name: 'Media Type',
      key: 'mediaType',
      type: 'dropdown',
      width: 140,
      visible: true,
      options: ['IMAGE', 'VIDEO', 'COPY', 'SCRIPT']
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
      options: ['Needs Review', 'Approved', 'Rejected']
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
      type: 'url',
      width: 140,
      visible: true
    },
    {
      id: 'caliVariation',
      name: 'Cali Variation',
      key: 'caliVariation',
      type: 'text',
      width: 140,
      visible: true
    },
    {
      id: 'slackPermalink',
      name: 'Slack Permalink',
      key: 'slackPermalink',
      type: 'url',
      width: 150,
      visible: true
    },
    {
      id: 'adStatus',
      name: 'Ad Status',
      key: 'adStatus',
      type: 'dropdown',
      width: 120,
      visible: true,
      options: ['Complete', 'Incomplete', 'In Progress']
    },
    {
      id: 'adApproval',
      name: 'Ad Approval',
      key: 'adApproval',
      type: 'dropdown',
      width: 130,
      visible: true,
      options: ['Needs Review', 'Approved', 'Rejected']
    },
    {
      id: 'qcSignOff',
      name: 'QC Sign-Off',
      key: 'qcSignOff',
      type: 'dropdown',
      width: 130,
      visible: true,
      options: ['Incomplete', 'Complete', 'Pending']
    },
    {
      id: 'postStatus',
      name: 'Post Status',
      key: 'postStatus',
      type: 'dropdown',
      width: 130,
      visible: true,
      options: ['Incomplete', 'Complete', 'Scheduled']
    },
    {
      id: 'driveUpload',
      name: 'Drive Upload',
      key: 'driveUpload',
      type: 'dropdown',
      width: 130,
      visible: true,
      options: ['Incomplete', 'Complete', 'Pending']
    }
  ]);

  // API base URL with environment variable support
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD 
      ? `${window.location.origin}/api` 
      : 'http://localhost:3001/api');

  // Check if we should use API or localStorage only - disable API in production unless explicitly enabled
  const USE_API = import.meta.env.VITE_USE_API === 'true' && !import.meta.env.PROD;
  
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
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Load campaigns data independently
  const loadCampaignsData = () => {
    // Get campaigns data from environment or use embedded fallback
    let campaignsData = [];
    
    if (import.meta.env.VITE_CAMPAIGNS_DATA) {
      try {
        campaignsData = JSON.parse(import.meta.env.VITE_CAMPAIGNS_DATA);
      } catch (e) {
        console.warn('Failed to parse campaigns data from environment');
      }
    }
    
    // Fallback to embedded campaigns data if environment data not available
    if (campaignsData.length === 0) {
      campaignsData = [
        { "id": 1, "name": "001_CCW", "slackId": "C092ZBS0KEK" },
        { "id": 2, "name": "002-CASH4HOMES", "slackId": "" },
        { "id": 3, "name": "003-MVA", "slackId": "" },
        { "id": 4, "name": "004_TRAVEL_RESORTS", "slackId": "C09EQBS2BB3" },
        { "id": 5, "name": "05-ASSESSMENTS", "slackId": "" },
        { "id": 6, "name": "005-GLP1TELE", "slackId": "" },
        { "id": 7, "name": "006-HELOC", "slackId": "" },
        { "id": 8, "name": "007-HEA", "slackId": "" },
        { "id": 9, "name": "008-HEARINGAIDS", "slackId": "" },
        { "id": 10, "name": "009-WINDOWS", "slackId": "" },
        { "id": 11, "name": "010-PARAQUAT", "slackId": "" },
        { "id": 12, "name": "011_ROUNDUP", "slackId": "C09DWN18SHM" },
        { "id": 13, "name": "012_RIDESHARE", "slackId": "" },
        { "id": 14, "name": "013-TALCUM", "slackId": "" },
        { "id": 15, "name": "014-AFFF", "slackId": "" },
        { "id": 16, "name": "015-HAIR", "slackId": "" },
        { "id": 17, "name": "016-SICKLE-CELL", "slackId": "" },
        { "id": 18, "name": "017-CHEMICAL-HAIR", "slackId": "" },
        { "id": 19, "name": "018_WRONGFUL_DEATH", "slackId": "C09KWGM5U9S" },
        { "id": 20, "name": "019-3M EARPLUGS", "slackId": "" },
        { "id": 21, "name": "020-DR-BROCK", "slackId": "" },
        { "id": 22, "name": "021-ILLINOIS-CLERGY", "slackId": "" },
        { "id": 23, "name": "022-ILLINOIS-JUVIE", "slackId": "" },
        { "id": 24, "name": "023_SAN_DIEGO", "slackId": "C09E95TS3DG" },
        { "id": 25, "name": "024-WTC", "slackId": "" },
        { "id": 26, "name": "025-DEPO", "slackId": "C09E8DB0H45" },
        { "id": 27, "name": "026_DR_LEE", "slackId": "C09EF7KPB1S" },
        { "id": 28, "name": "027-PFAS", "slackId": "" },
        { "id": 29, "name": "028-SOCIAL-MEDIA", "slackId": "" },
        { "id": 30, "name": "029-TEXAS-STORMS", "slackId": "" },
        { "id": 31, "name": "030-SCHOOLS", "slackId": "" },
        { "id": 32, "name": "031-ASBESTOS", "slackId": "" },
        { "id": 33, "name": "032-ROBLOX", "slackId": "" },
        { "id": 34, "name": "033-ANTIPSYCHOTICS", "slackId": "C09DWSR1U87" },
        { "id": 35, "name": "034-SAN-BERNARDINO", "slackId": "C09E70C5C2X" },
        { "id": 36, "name": "035-LA-WILDFIRES", "slackId": "" },
        { "id": 37, "name": "036-PARAGUARD", "slackId": "" },
        { "id": 38, "name": "037-OZEMPIC", "slackId": "" },
        { "id": 39, "name": "038-VAGINAL-MESH", "slackId": "" },
        { "id": 40, "name": "039_HERNIA_MESH", "slackId": "C096B2MSP3R" },
        { "id": 41, "name": "040_PROSTATE", "slackId": "C098ZFHFV9P" },
        { "id": 42, "name": "041_Risperdal", "slackId": "" },
        { "id": 43, "name": "042_LIZBUYSHOMES", "slackId": "C09B2M9TUD8" },
        { "id": 44, "name": "043_TESTNOW", "slackId": "C09BJBQ0FAQ" },
        { "id": 45, "name": "044_NEWTEST", "slackId": "C09CHK288E7" },
        { "id": 46, "name": "045_CAWOMENSPRISON", "slackId": "C09CNMUNK6E" },
        { "id": 47, "name": "046_CAJDC", "slackId": "C09EN7P8LHX" },
        { "id": 48, "name": "047_SANDIEGOJUVIE", "slackId": "C09E95TS3DG" },
        { "id": 49, "name": "055_UNFAIR_DEPO", "slackId": "C09FCCM5Z4G" }
      ];
    }
    
    setCampaigns(campaignsData);
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
      
      // Check against users in the system
      let foundUser = null;
      
      // Try to find user from current users state first
      if (users.length > 0) {
        foundUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
      }
      
      // If users not loaded yet, check default users directly
      if (!foundUser) {
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
            name: 'John Doe',
            email: 'john@hyrax.com',
            role: 'manager',
            password: 'password123',
            avatar: 'JD',
            createdAt: '2025-01-02T10:30:00.000Z'
          },
          {
            id: 3,
            name: 'Jane Smith',
            email: 'jane@hyrax.com',
            role: 'team_member',
            password: 'password123',
            avatar: 'JS',
            createdAt: '2025-01-03T14:15:00.000Z'
          }
        ];
        foundUser = defaultUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
      }
      
      if (foundUser) {
        // Check password (default to 'password123' if no password field exists)
        const userPassword = foundUser.password || 'password123';
        
        if (password === userPassword) {
          // Create authenticated user object
          const authenticatedUser = {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
            avatar: foundUser.avatar,
            permissions: foundUser.role === 'super_admin' ? ['all'] : ['read', 'write']
          };
          
          const token = btoa(`${email}:${Date.now()}:mock_token`);
          
          setAuthToken(token);
          setCurrentUser(authenticatedUser);
          setIsAuthenticated(true);
          localStorage.setItem('auth_token', token);
          
          // Load app data
          await loadInitialData();
          return true;
        } else {
          setError('Invalid email or password');
          return false;
        }
      } else {
        setError('User not found');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
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
  };

  const verifyToken = async (token) => {
    try {
      // Mock token verification
      if (token && token.includes('mock_token')) {
        // Extract email from token to find the user
        const tokenParts = atob(token).split(':');
        const userEmail = tokenParts[0];
        
        // Find the user from stored data or defaults
        let foundUser = null;
        const storedUsers = localStorage.getItem('hyrax_users');
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          foundUser = parsedUsers.find(user => user.email === userEmail);
        }
        
        // Fallback to default admin if not found
        if (!foundUser) {
          foundUser = {
            id: 1,
            email: 'admin@hyrax.com',
            name: 'HYRAX Super Admin', 
            role: 'super_admin',
            avatar: 'HSA'
          };
        }
        
        const authenticatedUser = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          avatar: foundUser.avatar,
          permissions: foundUser.role === 'super_admin' ? ['all'] : ['read', 'write']
        };
        
        setAuthToken(token);
        setCurrentUser(authenticatedUser);
        setIsAuthenticated(true);
        await loadInitialData();
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('auth_token');
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
            viewerLink: "https://viewer.example.com/task1",
            caliVariation: "CA-001",
            slackPermalink: "https://hyraxhq.slack.com/archives/C123/p1234567890",
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
            viewerLink: "",
            caliVariation: "CA-002",
            slackPermalink: "",
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

      // Load users from localStorage or use default data
      const storedUsers = localStorage.getItem('hyrax_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        // Default users data
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
            name: 'John Doe',
            email: 'john@hyrax.com',
            role: 'manager',
            password: 'password123',
            avatar: 'JD',
            createdAt: '2025-01-02T10:30:00.000Z'
          },
          {
            id: 3,
            name: 'Jane Smith',
            email: 'jane@hyrax.com',
            role: 'team_member',
            password: 'password123',
            avatar: 'JS',
            createdAt: '2025-01-03T14:15:00.000Z'
          }
        ];
        setUsers(defaultUsers);
        localStorage.setItem('hyrax_users', JSON.stringify(defaultUsers));
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

  // User management functions with localStorage persistence
  const addUser = (userData) => {
    const newUser = {
      ...userData,
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      password: userData.password || 'password123', // Default password if not provided
      avatar: userData.avatar || userData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('hyrax_users', JSON.stringify(updatedUsers));
  };

  const updateUser = (userId, userData) => {
    const updatedData = {
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    const updatedUsers = users.map(user =>
      user.id === userId
        ? { ...user, ...updatedData }
        : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('hyrax_users', JSON.stringify(updatedUsers));
  };

  const deleteUser = (userId) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('hyrax_users', JSON.stringify(updatedUsers));
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
    addUser,
    updateUser,
    deleteUser,
    getTasksByCampaign,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};