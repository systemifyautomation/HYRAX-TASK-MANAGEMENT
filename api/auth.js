import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { hashThreeInputsJS } = require('./lib/hashUtils.cjs');

// Helper function to get today's date in UTC format dd/MM/yyyy
function getTodayUTC() {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to read users from users.json
function readUsersFromFile() {
  try {
    const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(usersData);
  } catch (error) {
    console.error('Error reading users.json:', error);
    // Fallback to hardcoded admin if file read fails
    return [{
      id: 1,
      email: 'admin@wearehyrax.com',
      name: 'HYRAX Super Admin',
      role: 'super_admin',
      password: 'HyraxAdmin2024!SecurePass',
      avatar: 'HSA',
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z'
    }];
  }
}

// Helper function to update last login
function updateUserLastLogin(userId) {
  try {
    const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
    const users = readUsersFromFile();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString();
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    }
  } catch (error) {
    console.error('Error updating last login:', error);
    // Non-critical error, don't fail the login
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { email, password, action } = req.body;
      const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret';

      if (action === 'login') {
        // Read users from users.json file
        const users = readUsersFromFile();

        // Find user by email (case insensitive)
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        // Check if user is active
        if (user.status && user.status !== 'active') {
          return res.status(401).json({
            success: false,
            message: 'Account is not active'
          });
        }

        // Check password (plain text comparison - in production use hashing)
        if (user.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        // Generate hash code for webhook
        const todayUTC = getTodayUTC();
        const code = hashThreeInputsJS(email, password, todayUTC);

        // Trigger webhook with GET request
        let webhookData = null;
        try {
          const webhookUrl = process.env.LOGIN_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/new-tasks-login';
          const webhookParams = new URLSearchParams({
            email: email,
            password: password
          });
          
          const webhookResponse = await fetch(`${webhookUrl}?${webhookParams}`, {
            method: 'GET',
            headers: {
              'code': code,
              'Content-Type': 'application/json'
            }
          });

          if (webhookResponse.ok) {
            webhookData = await webhookResponse.json();
            console.log('Webhook response:', webhookData);

            // Check if login is allowed
            if (!webhookData || webhookData.allowed !== 'yes') {
              return res.status(401).json({
                success: false,
                message: 'Access denied by authentication service'
              });
            }
          } else {
            console.error('Webhook returned non-OK status:', webhookResponse.status);
            return res.status(401).json({
              success: false,
              message: 'Authentication service unavailable'
            });
          }
        } catch (webhookError) {
          console.error('Webhook error:', webhookError.message);
          return res.status(500).json({
            success: false,
            message: 'Authentication service error'
          });
        }

        // Update user with webhook data
        const userRole = webhookData.role || user.role;
        const userDepartment = webhookData.department || null;

        // Update user in database with department if provided
        if (webhookData.department) {
          const users = readUsersFromFile();
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex].department = webhookData.department;
            users[userIndex].role = userRole;
            try {
              const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
              fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
            } catch (error) {
              console.error('Error updating user department:', error);
            }
          }
        }

        // Update last login timestamp
        updateUserLastLogin(user.id);

        // Create simple token (in production, use proper JWT library)
        const token = Buffer.from(`${user.id}:${email}:${Date.now()}:${jwtSecret}`).toString('base64');
        
        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: userRole.toUpperCase(),
            department: userDepartment,
            avatar: user.avatar,
            permissions: userRole === 'super_admin' || userRole === 'super-admin' ? ['all'] : ['read', 'write']
          },
          token
        });
      }

      if (action === 'verify') {
        // Verify token
        const { token } = req.body;
        if (!token) {
          return res.status(401).json({ success: false, message: 'No token provided' });
        }

        try {
          const decoded = Buffer.from(token, 'base64').toString('utf-8');
          const [userId, tokenEmail, timestamp, tokenSecret] = decoded.split(':');
          
          // Check if token is valid and not too old (24 hours)
          const tokenAge = Date.now() - parseInt(timestamp);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (tokenSecret !== jwtSecret || tokenAge >= maxAge) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
          }

          // Verify user still exists and is active
          const users = readUsersFromFile();
          const user = users.find(u => u.id === parseInt(userId) && u.email.toLowerCase() === tokenEmail.toLowerCase());
          
          if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
          }

          if (user.status && user.status !== 'active') {
            return res.status(401).json({ success: false, message: 'Account is not active' });
          }

          return res.status(200).json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role.toUpperCase(),
              avatar: user.avatar,
              permissions: user.role === 'super_admin' ? ['all'] : ['read', 'write']
            }
          });
        } catch (error) {
          console.error('Token verification error:', error);
          return res.status(401).json({ success: false, message: 'Invalid token format' });
        }
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });

    } catch (error) {
      console.error('Auth error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}