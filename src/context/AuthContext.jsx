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

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
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
  };

  // Authentication functions
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Mock authentication - check against environment credentials
      const validEmail = 'admin@hyrax.com';
      const validPassword = 'HyraxAdmin2024!SecurePass';
      
      if (email === validEmail && password === validPassword) {
        // Create mock user and token
        const user = {
          id: 1,
          email: validEmail,
          name: 'HYRAX Super Admin',
          role: 'super_admin',
          permissions: ['all']
        };
        
        const token = btoa(`${email}:${Date.now()}:mock_token`);
        
        setAuthToken(token);
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('auth_token', token);
        
        // Load mock data
        await loadInitialData();
        return true;
      } else {
        setError('Invalid email or password');
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
        const user = {
          id: 1,
          email: 'admin@hyrax.com',
          name: 'HYRAX Super Admin', 
          role: 'super_admin',
          permissions: ['all']
        };
        
        setAuthToken(token);
        setCurrentUser(user);
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
      // Load campaigns from server/data/campaigns.json
      const campaignsData = [
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
        { "id": 18, "name": "017-TEPEZZA", "slackId": "" },
        { "id": 19, "name": "018-MARYLAND", "slackId": "" },
        { "id": 20, "name": "019-LDS", "slackId": "" },
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
      
      setCampaigns(campaignsData);
      
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
            avatar: 'HSA',
            createdAt: '2025-01-01T00:00:00.000Z'
          },
          {
            id: 2,
            name: 'John Doe',
            email: 'john@hyrax.com',
            role: 'manager',
            avatar: 'JD',
            createdAt: '2025-01-02T10:30:00.000Z'
          },
          {
            id: 3,
            name: 'Jane Smith',
            email: 'jane@hyrax.com',
            role: 'team_member',
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
    try {
      const response = await apiCall('/campaigns');
      setCampaigns(response.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const addCampaign = async (campaignData) => {
    try {
      const response = await apiCall('/campaigns', {
        method: 'POST',
        body: campaignData,
      });
      
      if (response.success) {
        setCampaigns(prev => [...prev, response.campaign]);
      }
      return response;
    } catch (error) {
      console.error('Failed to add campaign:', error);
      throw error;
    }
  };

  const updateCampaign = async (id, campaignData) => {
    try {
      const response = await apiCall(`/campaigns/${id}`, {
        method: 'PUT',
        body: campaignData,
      });
      
      if (response.success) {
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === id ? response.campaign : campaign
        ));
      }
      return response;
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  };

  const deleteCampaign = async (id) => {
    try {
      const response = await apiCall(`/campaigns/${id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      }
      return response;
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};