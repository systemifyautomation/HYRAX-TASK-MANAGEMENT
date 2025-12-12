const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];
const DATA_DIR = process.env.DATA_DIR || './data';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API endpoints
const campaignsFilePath = path.join(__dirname, DATA_DIR, 'campaigns.json');
const usersFilePath = path.join(__dirname, DATA_DIR, 'users.json');
const tasksFilePath = path.join(__dirname, DATA_DIR, 'tasks.json');

// Helper function to read campaigns data
async function readCampaigns() {
  try {
    const data = await fs.readFile(campaignsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading campaigns:', error);
    return [];
  }
}

// Helper function to write campaigns data
async function writeCampaigns(campaigns) {
  try {
    await fs.writeFile(campaignsFilePath, JSON.stringify(campaigns, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing campaigns:', error);
    return false;
  }
}

// GET /api/campaigns - Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await readCampaigns();
    res.json({
      success: true,
      data: campaigns,
      total: campaigns.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
});

// GET /api/campaigns/:id - Get single campaign by ID
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaigns = await readCampaigns();
    const campaign = campaigns.find(c => c.id === parseInt(req.params.id));
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      message: error.message
    });
  }
});

// POST /api/campaigns - Add new campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, slackId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    const campaigns = await readCampaigns();
    
    // Check if campaign name already exists
    const existingCampaign = campaigns.find(c => c.name === name);
    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name already exists'
      });
    }

    // Generate new ID
    const newId = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1;
    
    const newCampaign = {
      id: newId,
      name,
      slackId: slackId || ''
    };

    campaigns.push(newCampaign);
    
    const writeSuccess = await writeCampaigns(campaigns);
    if (!writeSuccess) {
      throw new Error('Failed to save campaign');
    }

    res.status(201).json({
      success: true,
      data: newCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

// PUT /api/campaigns/:id - Update existing campaign
app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { name, slackId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    const campaigns = await readCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Check if new name conflicts with existing campaigns (except current one)
    const nameConflict = campaigns.find(c => c.name === name && c.id !== campaignId);
    if (nameConflict) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name already exists'
      });
    }

    // Update campaign
    campaigns[campaignIndex] = {
      ...campaigns[campaignIndex],
      name,
      slackId: slackId || ''
    };

    const writeSuccess = await writeCampaigns(campaigns);
    if (!writeSuccess) {
      throw new Error('Failed to save campaign');
    }

    res.json({
      success: true,
      data: campaigns[campaignIndex],
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaigns = await readCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const deletedCampaign = campaigns.splice(campaignIndex, 1)[0];
    
    const writeSuccess = await writeCampaigns(campaigns);
    if (!writeSuccess) {
      throw new Error('Failed to save changes');
    }

    res.json({
      success: true,
      data: deletedCampaign,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
});

// Users API endpoints

// Helper function to read users data
async function readUsers() {
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

// Helper function to write users data
async function writeUsers(users) {
  try {
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing users:', error);
    return false;
  }
}

// POST /api/users - Create new user
app.post('/api/users', async (req, res) => {
  try {
    const users = await readUsers();
    const newUser = req.body;
    
    // Add to users array
    users.push(newUser);
    
    // Write back to file
    const writeSuccess = await writeUsers(users);
    
    if (writeSuccess) {
      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save user'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

// PUT /api/users/:id - Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const users = await readUsers();
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    // Find user index
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update user
    users[userIndex] = { ...users[userIndex], ...updates };
    
    // Write back to file
    const writeSuccess = await writeUsers(users);
    
    if (writeSuccess) {
      res.json({
        success: true,
        data: users[userIndex],
        message: 'User updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save user changes'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// DELETE /api/users/:id - Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await readUsers();
    const userId = parseInt(req.params.id);
    
    // Find user
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Remove user
    const deletedUser = users.splice(userIndex, 1)[0];
    
    // Write back to file
    const writeSuccess = await writeUsers(users);
    
    if (writeSuccess) {
      res.json({
        success: true,
        data: deletedUser,
        message: 'User deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save user deletion'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// Tasks API endpoints

// Helper function to read tasks data
async function readTasks() {
  try {
    const data = await fs.readFile(tasksFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return [];
  }
}

// Helper function to write tasks data
async function writeTasks(tasks) {
  try {
    await fs.writeFile(tasksFilePath, JSON.stringify(tasks, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing tasks:', error);
    return false;
  }
}

// POST /api/tasks - Create new task
app.post('/api/tasks', async (req, res) => {
  try {
    const tasks = await readTasks();
    const newTask = req.body;
    
    // Add to tasks array
    tasks.push(newTask);
    
    // Write back to file
    const writeSuccess = await writeTasks(tasks);
    
    if (writeSuccess) {
      res.status(201).json({
        success: true,
        data: newTask,
        message: 'Task created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save task'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      message: error.message
    });
  }
});

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const taskId = parseInt(req.params.id);
    const updates = req.body;
    
    // Find task index
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Update task
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    
    // Write back to file
    const writeSuccess = await writeTasks(tasks);
    
    if (writeSuccess) {
      res.json({
        success: true,
        data: tasks[taskIndex],
        message: 'Task updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save task changes'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      message: error.message
    });
  }
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const taskId = parseInt(req.params.id);
    
    // Find task
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Remove task
    const deletedTask = tasks.splice(taskIndex, 1)[0];
    
    // Write back to file
    const writeSuccess = await writeTasks(tasks);
    
    if (writeSuccess) {
      res.json({
        success: true,
        data: deletedTask,
        message: 'Task deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save task deletion'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Campaign API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Hyrax Campaign API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Campaigns endpoint: http://localhost:${PORT}/api/campaigns`);
  console.log(`👥 Users endpoint: http://localhost:${PORT}/api/users`);
  console.log(`✅ Tasks endpoint: http://localhost:${PORT}/api/tasks`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`⚠️  Production mode: Ensure JWT_SECRET is properly configured`);
  } else {
    console.log(`⚠️  Development mode: Using default secrets (change for production)`);
  }
  console.log(``);
});

module.exports = app;