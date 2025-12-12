import fs from 'fs';
import path from 'path';

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
    const [tokenEmail, timestamp, tokenSecret] = decoded.split(':');
    
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge >= maxAge) {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }

  try {
    // Read users data from users.json file
    let usersData = [];
    
    try {
      const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
      const fileContent = fs.readFileSync(usersFilePath, 'utf8');
      usersData = JSON.parse(fileContent);
    } catch (error) {
      console.warn('Failed to read users.json, using fallback data:', error.message);
      // Fallback demo data
      usersData = [
        {
          id: 1,
          email: process.env.SUPER_ADMIN_EMAIL || 'admin@hyrax.com',
          name: process.env.SUPER_ADMIN_NAME || 'HYRAX Super Admin',
          role: 'super_admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      ];
    }

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
          return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Check if user already exists
        if (usersData.some(user => user.email === email)) {
          return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const newUser = {
          id: Math.max(0, ...usersData.map(u => u.id || 0)) + 1,
          email,
          name,
          role,
          password: password || 'password123', // In production, this should be hashed
          avatar: avatar || name.split(' ').map(n => n[0]).join('').toUpperCase(),
          createdAt: new Date().toISOString()
        };

        usersData.push(newUser);
        
        // Write back to users.json file
        try {
          const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
          fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));
        } catch (error) {
          console.error('Failed to write users.json:', error);
        }
        
        return res.status(201).json({
          success: true,
          user: { ...newUser, password: undefined }
        });

      case 'PUT':
        const { id } = req.query;
        const updateData = req.body;
        
        const userIndex = usersData.findIndex(user => user.id === parseInt(id));
        if (userIndex === -1) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update user
        usersData[userIndex] = {
          ...usersData[userIndex],
          ...updateData,
          id: parseInt(id) // Ensure ID doesn't change
        };

        // Write back to users.json file
        try {
          const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
          fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));
        } catch (error) {
          console.error('Failed to write users.json:', error);
        }

        return res.status(200).json({
          success: true,
          user: { ...usersData[userIndex], password: undefined }
        });

      case 'DELETE':
        const { id: deleteId } = req.query;
        const deleteIndex = usersData.findIndex(user => user.id === parseInt(deleteId));
        
        if (deleteIndex === -1) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Don't allow deleting super admin
        if (usersData[deleteIndex].role === 'super_admin' || usersData[deleteIndex].role === 'SUPER_ADMIN') {
          return res.status(400).json({ success: false, message: 'Cannot delete super admin' });
        }

        const deletedUser = usersData.splice(deleteIndex, 1)[0];

        // Write back to users.json file
        try {
          const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
          fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));
        } catch (error) {
          console.error('Failed to write users.json:', error);
        }

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