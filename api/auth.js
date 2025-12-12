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

  if (req.method === 'POST') {
    try {
      const { email, password, action } = req.body;
      const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret';

      if (action === 'login') {
        // Read users from users.json file
        let users = [];
        try {
          const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
          const usersData = fs.readFileSync(usersFilePath, 'utf8');
          users = JSON.parse(usersData);
        } catch (error) {
          console.error('Error reading users.json:', error);
          // Fallback to environment variables if file read fails
          const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@hyrax.com';
          const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'HyraxAdmin2024!SecurePass';
          const superAdminName = process.env.SUPER_ADMIN_NAME || 'HYRAX Super Admin';
          
          users = [{
            id: 1,
            email: superAdminEmail,
            name: superAdminName,
            role: 'super_admin',
            password: superAdminPassword,
            avatar: 'HSA'
          }];
        }

        // Find user by email (case insensitive)
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        // Check password
        if (user.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        // Create simple token (in production, use proper JWT library)
        const token = Buffer.from(`${email}:${Date.now()}:${jwtSecret}`).toString('base64');
        
        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.toUpperCase(),
            avatar: user.avatar,
            permissions: user.role === 'super_admin' ? ['all'] : ['read', 'write']
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
          const [tokenEmail, timestamp, tokenSecret] = decoded.split(':');
          
          // Check if token is valid and not too old (24 hours)
          const tokenAge = Date.now() - parseInt(timestamp);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (tokenEmail === superAdminEmail && tokenSecret === jwtSecret && tokenAge < maxAge) {
            return res.status(200).json({
              success: true,
              user: {
                email: superAdminEmail,
                name: superAdminName,
                role: 'SUPER_ADMIN',
                permissions: ['all']
              }
            });
          } else {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
          }
        } catch (error) {
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