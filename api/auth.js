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

      // Get credentials from environment variables
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@hyrax.com';
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'HyraxAdmin2024!SecurePass';
      const superAdminName = process.env.SUPER_ADMIN_NAME || 'HYRAX Super Admin';
      const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret';

      if (action === 'login') {
        // Authenticate user
        if (email === superAdminEmail && password === superAdminPassword) {
          // Create simple token (in production, use proper JWT library)
          const token = Buffer.from(`${email}:${Date.now()}:${jwtSecret}`).toString('base64');
          
          return res.status(200).json({
            success: true,
            user: {
              email: superAdminEmail,
              name: superAdminName,
              role: 'SUPER_ADMIN',
              permissions: ['all']
            },
            token
          });
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }
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