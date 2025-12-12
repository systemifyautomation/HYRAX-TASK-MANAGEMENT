# HYRAX Task Management

A premium SaaS application for managing approval workflows for HYRAX's Facebook ad campaigns. This application helps project managers review and approve copy, scripts, creatives, and videos uploaded by team members.

## 🚀 Features

- **Campaign Management**: Manage multiple Facebook ad campaigns with detailed information including budget, platform, and timeline
- **Task Organization**: Tasks are organized by campaign and type (copy, image, video, script)
- **Weekly View**: Focus on weekly tasks to better manage workload
- **Approval Workflow**: Managers can review submissions, approve them, or request revisions with feedback
- **Team Collaboration**: Team members can submit their work and track approval status
- **Premium UI**: Modern, clean interface designed to look like a premium SaaS product

## 📸 Screenshots

### Manager Dashboard
![Manager Dashboard](https://github.com/user-attachments/assets/ca09fac1-6a8e-433a-ad60-5befd8b6e21c)

### Campaigns List
![Campaigns List](https://github.com/user-attachments/assets/0339a604-2817-49f1-88c0-124b090b20d6)

### Campaign Detail View
![Campaign Detail](https://github.com/user-attachments/assets/9a2ab97b-3057-4437-93c8-ab4aecdde1a3)

### Weekly View
![Weekly View](https://github.com/user-attachments/assets/730fcead-661c-4ffd-9063-64b19f6cf761)

### Review Modal
![Review Modal](https://github.com/user-attachments/assets/c4590a20-f243-47ba-8e03-ffc044bde392)

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS v4** - Utility-first CSS framework
- **Lucide React** - Icon library
- **date-fns** - Date utility library

### Backend API
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **JSON File Storage** - Campaign data persistence

## 📦 Installation

### Frontend Setup

1. Clone the repository:
```bash
git clone https://github.com/systemifyautomation/HYRAX-TASK-MANAGEMENT.git
cd HYRAX-TASK-MANAGEMENT
```

2. Install frontend dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5175`

### Campaign API Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install server dependencies:
```bash
npm install
```

3. Start the API server:
```bash
npm start
```

The API will be available at `http://localhost:3001`

### Full System

To run both frontend and API:

**Terminal 1 (API Server):**
```bash
cd server
npm start
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

## 🚀 Deployment

### Vercel (Recommended)

This app is pre-configured for Vercel deployment:

1. **Push to Git repository**
2. **Import to Vercel** from your Git provider
3. **Deploy** - Vercel will automatically:
   - Build the React app
   - Deploy API as serverless functions
   - Configure routing and CDN

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed instructions.

### Live API Endpoints

Once deployed, API endpoints will be available at:
- `https://your-app.vercel.app/api/campaigns`
- `https://your-app.vercel.app/api/health`

## 🏗️ Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

To preview the production build:

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Sidebar.jsx     # Navigation sidebar
│   └── TaskCard.jsx    # Task display and interaction component
├── pages/              # Page components
│   ├── Dashboard.jsx   # Main dashboard view
│   ├── Campaigns.jsx   # Campaigns list view
│   ├── CampaignDetail.jsx  # Individual campaign details
│   └── WeeklyView.jsx  # Weekly task view
├── context/            # React Context for state management
│   └── AppContext.jsx  # Global app state
├── data/               # Mock data and helpers
│   └── mockData.js     # Sample campaigns and tasks
├── App.jsx             # Main app component with routing
├── main.jsx            # Application entry point
└── index.css           # Global styles and Tailwind setup

api/
├── campaigns.js        # Campaign API (serverless)
├── tasks.js           # Tasks API (serverless)
└── health.js          # Health check endpoint

# Security Files (NOT in repository)
.env                   # Environment variables
SECURITY.md           # Security configuration guide
```

## 👥 User Roles

### Manager
- View all campaigns and tasks
- Review submitted work
- Approve or request revisions with feedback
- Dashboard shows pending reviews and campaign overview

### Team Member
- View assigned tasks
- Submit work for review
- Track task status (not started, in progress, submitted, needs revision, approved)
- Dashboard shows personal tasks and progress

## 🎯 Key Workflows

### For Team Members
1. Navigate to Dashboard or Campaigns to see assigned tasks
2. Click on a task to view details
3. Submit work using the "Submit Work" button
4. View feedback and resubmit if revisions are requested

### For Managers
1. Dashboard shows all tasks needing review
2. Click "Review Submission" on any submitted task
3. View the submitted content
4. Either approve or request revisions with specific feedback
5. Track campaign progress and team performance

## 🗓️ Weekly Planning

The Weekly View allows teams to:
- Focus on current week's tasks
- See tasks organized by status
- Navigate between weeks
- Get a quick overview of weekly workload

## 🎨 Design Philosophy

The application follows modern SaaS design principles:
- Clean, minimalist interface
- Consistent color scheme with primary blue tones
- Card-based layouts for easy scanning
- Clear visual hierarchy
- Responsive design (mobile-friendly)
- Smooth transitions and interactions

## 🔌 Campaign API Integration

The application includes a RESTful API for campaign management that can be integrated with external tools like n8n:

### API Endpoints
- **GET** `/api/campaigns` - Retrieve all campaigns
- **GET** `/api/campaigns/:id` - Get single campaign
- **POST** `/api/campaigns` - Create new campaign
- **PUT** `/api/campaigns/:id` - Update existing campaign
- **DELETE** `/api/campaigns/:id` - Delete campaign
- **GET** `/api/health` - Health check

### n8n Integration

You can send HTTP requests from n8n to manage campaigns:

**Create Campaign:**
```json
POST https://your-app.vercel.app/api/campaigns
{
  "name": "NEW_CAMPAIGN_NAME",
  "slackId": "C123456789"
}
```

**Update Campaign:**
```json
PUT https://your-app.vercel.app/api/campaigns/1
{
  "name": "UPDATED_NAME", 
  "slackId": "C987654321"
}
```

**Local Development:**
```json
POST http://localhost:3001/api/campaigns
```

See [`API_ENDPOINTS.md`](API_ENDPOINTS.md) for complete API documentation.

## 🔄 Future Enhancements

- User authentication and authorization
- Real-time updates using WebSockets
- File upload functionality for images and videos
- Comments and discussion threads on tasks
- Email notifications for status changes
- Analytics and reporting dashboard
- Calendar integration
- Task filtering and search

## 📝 License

This project is custom-built for HYRAX (wearehyrax.com).

## 🤝 Contributing

This is a private project for HYRAX. For questions or support, please contact the development team.
