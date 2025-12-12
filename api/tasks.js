// Task data from environment variables (secure)
let tasks = [];

// Initialize tasks from environment variable
try {
  tasks = JSON.parse(process.env.TASKS_DATA || '[]');
} catch (error) {
  console.error('Error parsing TASKS_DATA:', error);
  tasks = [
    {
      "id": 1,
      "title": "Demo Task",
      "description": "This is a demo task",
      "status": "pending",
      "priority": "medium",
      "assigneeId": 1,
      "campaignId": 1,
      "dueDate": "2025-01-15",
      "createdAt": "2025-01-01",
      "updatedAt": "2025-01-01"
    }
  ];
}

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authentication middleware (skip for GET requests in demo)
  if (req.method !== 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No valid authorization token' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@hyrax.com';
    
    // Verify token
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [tokenEmail, timestamp, tokenSecret] = decoded.split(':');
      
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenEmail !== superAdminEmail || tokenSecret !== jwtSecret || tokenAge >= maxAge) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }
  }

  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        if (id) {
          // Get single task
          const task = tasks.find(t => t.id === parseInt(id));
          if (!task) {
            return res.status(404).json({
              success: false,
              error: 'Task not found'
            });
          }
          return res.json({
            success: true,
            data: task
          });
        } else {
          // Get all tasks
          return res.json({
            success: true,
            data: tasks,
            total: tasks.length
          });
        }

      case 'POST':
        const { title, description, status, priority, assigneeId, campaignId, dueDate } = req.body;
        
        if (!title) {
          return res.status(400).json({
            success: false,
            error: 'Task title is required'
          });
        }

        // Generate new ID
        const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        
        const newTask = {
          id: newId,
          title,
          description: description || '',
          status: status || 'pending',
          priority: priority || 'medium',
          assigneeId: assigneeId || null,
          campaignId: campaignId || null,
          dueDate: dueDate || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        tasks.push(newTask);
        
        return res.status(201).json({
          success: true,
          data: newTask,
          message: 'Task created successfully'
        });

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Task ID is required'
          });
        }

        const taskId = parseInt(id);
        const updateData = req.body;
        
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Task not found'
          });
        }

        // Update task
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          ...updateData,
          id: taskId, // Ensure ID doesn't change
          updatedAt: new Date().toISOString()
        };

        return res.json({
          success: true,
          data: tasks[taskIndex],
          message: 'Task updated successfully'
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Task ID is required'
          });
        }

        const deleteId = parseInt(id);
        const deleteIndex = tasks.findIndex(t => t.id === deleteId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Task not found'
          });
        }

        const deletedTask = tasks.splice(deleteIndex, 1)[0];
        
        return res.json({
          success: true,
          data: deletedTask,
          message: 'Task deleted successfully'
        });

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}