import fs from 'fs';
import path from 'path';

// Helper function to read users from users.json
function readUsersFromFile() {
  try {
    const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
    const fileContent = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(fileContent);
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
      createdAt: '2025-01-01T00:00:00.000Z',
      lastLogin: null
    }];
  }
}

// Helper function to write users to users.json
function writeUsersToFile(users) {
  try {
    const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to users.json:', error);
    throw new Error('Failed to persist user data');
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

  // Authentication middleware
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No valid authorization token' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret';
  
  // Verify token
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, tokenEmail, timestamp, tokenSecret] = decoded.split(':');
    
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge >= maxAge || tokenSecret !== jwtSecret) {
      return res.status(401).json({ success: false, message: 'Token expired or invalid' });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }

  try {
    // Read users data from users.json file
    let usersData = readUsersFromFile();

    switch (req.method) {
      case 'GET':
        return res.status(200).json({
          success: true,
          users: usersData.map(user => ({
            ...user,
            password: undefined // Never return passwords
          }))
        });

      case 'POST':
        const { email, name, role, password, avatar } = req.body;
        
        if (!email || !name || !role) {
          return res.status(400).json({ success: false, message: 'Missing required fields: email, name, and role are required' });
        }

        // Check if user already exists
        if (usersData.some(user => user.email.toLowerCase() === email.toLowerCase())) {
          return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const newUser = {
          id: Math.max(0, ...usersData.map(u => u.id || 0)) + 1,
          email,
          name,
          role,
          password: password || 'DefaultPassword123!', // Default password if not provided
          avatar: avatar || name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3),
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: null
        };

        usersData.push(newUser);
        
        // Write back to users.json file
        writeUsersToFile(usersData);
        
        return res.status(201).json({
          success: true,
          user: { ...newUser, password: undefined },
          message: 'User created successfully'
        });

      case 'PUT':
        const { id } = req.query;
        const updateData = req.body;
        
        if (!id) {
          return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const userIndex = usersData.findIndex(user => user.id === parseInt(id));
        if (userIndex === -1) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent changing email to one that already exists
        if (updateData.email && updateData.email !== usersData[userIndex].email) {
          if (usersData.some(user => user.email.toLowerCase() === updateData.email.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
          }
        }

        // Update user (preserve certain fields)
        usersData[userIndex] = {
          ...usersData[userIndex],
          ...updateData,
          id: parseInt(id), // Ensure ID doesn't change
          createdAt: usersData[userIndex].createdAt // Preserve creation date
        };

        // Write back to users.json file
        writeUsersToFile(usersData);

        return res.status(200).json({
          success: true,
          user: { ...usersData[userIndex], password: undefined },
          message: 'User updated successfully'
        });

      case 'DELETE':
        const { id: deleteId } = req.query;
        
        if (!deleteId) {
          return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const deleteIndex = usersData.findIndex(user => user.id === parseInt(deleteId));
        
        if (deleteIndex === -1) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Don't allow deleting super admin
        if (usersData[deleteIndex].role === 'super_admin' || usersData[deleteIndex].role === 'SUPER_ADMIN') {
          return res.status(400).json({ success: false, message: 'Cannot delete super admin user' });
        }

        const deletedUser = usersData.splice(deleteIndex, 1)[0];

        // Write back to users.json file
        writeUsersToFile(usersData);

        return res.status(200).json({ 
          success: true, 
          message: 'User deleted successfully',
          user: { ...deletedUser, password: undefined }
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}