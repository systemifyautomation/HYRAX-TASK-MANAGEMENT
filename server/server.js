const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];
const DATA_DIR = process.env.DATA_DIR || './data';

// Configure multer for file uploads - store in memory for immediate forwarding
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024, // 3GB max file size
    fieldSize: 3 * 1024 * 1024 * 1024, // 3GB max field size
  }
});

// For chunked uploads - store chunks temporarily
const uploadDir = path.join(__dirname, 'uploads', 'chunks');
const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = path.join(uploadDir, req.body.uploadId || 'temp');
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const chunkIndex = req.body.chunkIndex || 0;
      cb(null, `chunk-${chunkIndex}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max chunk size
  }
});

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
// Increase limits for JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Client build (for SPA routing)
const clientBuildPath = path.join(__dirname, '..', 'dist');
const clientIndexPath = path.join(clientBuildPath, 'index.html');

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

// Authentication API endpoints

// POST /api/auth/login - Authenticate user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Read users from JSON file
    const users = await readUsers();
    
    // Find user by email (case insensitive)
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password (plain text for now - in production, use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    await writeUsers(users);
    
    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
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

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await readUsers();
    res.json({ 
      success: true, 
      users: users,
      message: `Retrieved ${users.length} users`
    });
  } catch (error) {
    console.error('Error reading users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read users',
      message: error.message 
    });
  }
});

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

// POST /api/upload-chunk - Handle chunked uploads
app.post('/api/upload-chunk', uploadDisk.single('chunk'), async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, fileName, ...metadata } = req.body;
    
    console.log(`Received chunk ${parseInt(chunkIndex) + 1}/${totalChunks} for upload ${uploadId}`);
    
    if (!uploadId || chunkIndex === undefined || !totalChunks) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: uploadId, chunkIndex, totalChunks'
      });
    }
    
    const chunkDir = path.join(uploadDir, uploadId);
    const currentChunk = parseInt(chunkIndex);
    const total = parseInt(totalChunks);
    
    // Check if this is the last chunk
    if (currentChunk === total - 1) {
      console.log('Last chunk received, assembling file...');
      
      // Assemble all chunks
      const chunks = [];
      for (let i = 0; i < total; i++) {
        const chunkPath = path.join(chunkDir, `chunk-${i}`);
        try {
          const chunkData = await fs.readFile(chunkPath);
          chunks.push(chunkData);
        } catch (error) {
          console.error(`Missing chunk ${i}:`, error.message);
          return res.status(400).json({
            success: false,
            error: `Missing chunk ${i}. Please retry upload.`
          });
        }
      }
      
      // Combine chunks into single buffer
      const completeFile = Buffer.concat(chunks);
      console.log(`Assembled file: ${(completeFile.length / 1024 / 1024).toFixed(2)}MB`);
      
      // Create FormData to forward to webhook
      const formData = new FormData();
      formData.append('file', completeFile, {
        filename: fileName || 'upload',
        contentType: metadata.fileType || 'application/octet-stream',
      });
      
      // Forward all metadata
      Object.keys(metadata).forEach(key => {
        if (metadata[key] !== undefined) {
          formData.append(key, metadata[key]);
        }
      });
      
      console.log('📤 Forwarding assembled file to webhook...');
      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/new-creative-from-tasks';
      
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
          timeout: 900000, // 15 minutes
        });
        
        const responseText = await webhookResponse.text();
        console.log('Webhook response:', webhookResponse.status);
        
        // Clean up chunks
        await fs.rm(chunkDir, { recursive: true, force: true }).catch(e => 
          console.warn('Failed to clean up chunks:', e.message)
        );
        
        if (webhookResponse.ok) {
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            responseData = { message: responseText };
          }
          
          res.json({
            success: true,
            data: responseData,
            message: 'File uploaded successfully',
            complete: true
          });
        } else {
          res.status(webhookResponse.status).json({
            success: false,
            error: 'Webhook rejected the upload',
            message: responseText,
            complete: true
          });
        }
      } catch (error) {
        console.error('Webhook error:', error);
        
        // Clean up on error
        await fs.rm(chunkDir, { recursive: true, force: true }).catch(() => {});
        
        res.status(503).json({
          success: false,
          error: 'Failed to forward to webhook',
          message: error.message,
          complete: true
        });
      }
    } else {
      // Not the last chunk, just acknowledge receipt
      res.json({
        success: true,
        message: `Chunk ${currentChunk + 1}/${total} received`,
        complete: false
      });
    }
    
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chunk',
      message: error.message
    });
  }
});

// POST /api/upload-creative - Handle file uploads and forward to webhook
app.post('/api/upload-creative', upload.single('file'), async (req, res) => {
  try {
    console.log('=== UPLOAD REQUEST RECEIVED ===');
    console.log('File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: (req.file.size / 1024 / 1024).toFixed(2) + 'MB'
    } : 'No file');
    console.log('Body fields:', Object.keys(req.body).join(', '));
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file size (3GB max)
    const maxSize = 3 * 1024 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024 / 1024}GB`
      });
    }

    // Create FormData to forward to webhook
    const formData = new FormData();
    
    // Add the file as a Buffer stream
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    
    // Forward all other fields from the request
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });

    console.log('📤 Forwarding to webhook...');
    const webhookUrl = 'https://workflows.wearehyrax.com/webhook/new-creative-from-tasks';
    
    // Forward to the webhook with generous timeout
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: 900000, // 15 minutes timeout
    });

    console.log('Webhook response status:', webhookResponse.status);
    
    // Get response body
    const responseText = await webhookResponse.text();
    console.log('Webhook response:', responseText.substring(0, 500));

    if (webhookResponse.ok) {
      // Try to parse as JSON, otherwise return as text
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }

      res.json({
        success: true,
        data: responseData,
        message: 'File uploaded successfully'
      });
    } else {
      console.error('Webhook error:', webhookResponse.status, responseText);
      res.status(webhookResponse.status).json({
        success: false,
        error: 'Webhook rejected the upload',
        message: responseText,
        webhookStatus: webhookResponse.status
      });
    }

  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Determine error type
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorMessage = 'File too large';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      statusCode = 503;
      errorMessage = 'Webhook server unavailable';
    }
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to upload file',
      message: errorMessage,
      details: error.message
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

// Serve client for non-API routes (SPA routing)
if (fsSync.existsSync(clientIndexPath)) {
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(clientIndexPath);
  });
}

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

// Set server timeout to 15 minutes for large file uploads
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Hyrax Campaign API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`📁 Campaigns endpoint: http://localhost:${PORT}/api/campaigns`);
  console.log(`👥 Users endpoint: http://localhost:${PORT}/api/users`);
  console.log(`✅ Tasks endpoint: http://localhost:${PORT}/api/tasks`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload-creative`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Max file size: 3GB`);
  console.log(`⏱️  Request timeout: 15 minutes`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`⚠️  Production mode: Ensure JWT_SECRET is properly configured`);
  } else {
    console.log(`⚠️  Development mode: Using default secrets (change for production)`);
  }
  console.log(``);
});

server.timeout = 900000; // 15 minutes
server.keepAliveTimeout = 920000; // Slightly longer than timeout
server.headersTimeout = 930000; // Slightly longer than keepAliveTimeout

module.exports = app;