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
      
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('Password length:', password.length);
      
      // ALWAYS have hardcoded admin as fallback (for first-time deployment)
      const HARDCODED_ADMIN = {
        id: 1,
        name: 'HYRAX Super Admin',
        email: 'admin@wearehyrax.com',
        role: 'super_admin',
        password: 'HyraxAdmin2024!SecurePass',
        avatar: 'HSA'
      };
      
      let user = null;
      
      // First, try to find user in loaded users (from API or localStorage)
      if (users.length > 0) {
        user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
          console.log('✓ User found in loaded users:', user.email);
        }
      }
      
      // If not found and it's the admin email, use hardcoded admin
      if (!user && email.toLowerCase() === HARDCODED_ADMIN.email.toLowerCase()) {
        user = HARDCODED_ADMIN;
        console.log('✓ Using hardcoded admin user');
      }
      
      if (!user) {
        console.error('❌ User not found');
        return false;
      }
      
      console.log('Checking password...');
      console.log('Expected:', user.password);
      console.log('Received:', password);
      console.log('Match:', user.password === password);
      
      // Check password
      if (user.password !== password) {
        console.error('❌ Invalid password');
        return false;
      }
      
      console.log('✓ Password correct!');
      
      // Create authenticated user
      const authenticatedUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        permissions: user.role === 'super_admin' ? ['all'] : ['read', 'write']
      };
      
      const token = btoa(`${email}:${Date.now()}:token`);
      
      setAuthToken(token);
      setCurrentUser(authenticatedUser);
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', token);
      
      console.log('✓ Login successful!');
      
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