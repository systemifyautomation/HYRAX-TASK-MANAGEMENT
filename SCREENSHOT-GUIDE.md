# Screenshot Capture Guide

## Quick Screenshot Instructions

### 1. Ensure Application is Running
```bash
# Terminal 1: Start backend
cd server
node server.js

# Terminal 2: Start frontend  
npm run dev
```

### 2. Access Application
- URL: `http://localhost:5174`
- Login: `admin@hyrax.com` / `HyraxAdmin2024!SecurePass`

### 3. Screenshots to Capture

#### 📷 Login Screen (`screenshots/login.png`)
- Navigate to: `http://localhost:5174`
- Before logging in
- Show the gradient login interface

#### 📷 Super Admin Dashboard (`screenshots/dashboard-admin.png`)
- After login as admin
- Main dashboard view
- Show user counts, campaign stats

#### 📷 User Management (`screenshots/user-management.png`)
- Navigate to: User Management (sidebar)
- Show user list with Add User button
- Display user roles and actions

#### 📷 Add User Modal (`screenshots/add-user.png`)
- Click "Add User" button
- Show the modal form
- Display role selection dropdown

#### 📷 Campaigns List (`screenshots/campaigns-list.png`)
- Navigate to: Campaigns (sidebar)
- Show the campaigns grid
- Display campaign cards with details

#### 📷 Campaign Detail (`screenshots/campaign-detail.png`)
- Click on any campaign
- Show task breakdown view
- Display task status columns

#### 📷 Weekly View (`screenshots/weekly-view.png`)
- Navigate to: Weekly View (sidebar)
- Show calendar-style layout
- Display tasks organized by week

#### 📷 Mobile View (`screenshots/mobile-view.png`)
- Use browser dev tools (F12)
- Set responsive mode to mobile
- Capture mobile navigation

### 4. Screenshot Settings
- **Resolution**: 1200x800 (desktop), 400x800 (mobile)
- **Format**: PNG
- **Quality**: High resolution
- **Browser**: Chrome/Edge with clean interface

### 5. Windows Screenshot Tools
- **Snipping Tool**: Start > Snipping Tool
- **Windows Key + Shift + S**: Select area to capture
- **Alt + Print Screen**: Capture active window

### 6. Replace Placeholders
After capturing screenshots:

1. Save images to `/screenshots/` directory
2. Update README.md image paths:
   ```markdown
   ![Login Screen](screenshots/login.png)
   ![Admin Dashboard](screenshots/dashboard-admin.png)
   ![User Management](screenshots/user-management.png)
   # etc...
   ```

### 7. File Names
- `login.png`
- `dashboard-admin.png` 
- `user-management.png`
- `add-user.png`
- `campaigns-list.png`
- `campaign-detail.png`
- `weekly-view.png`
- `mobile-view.png`

---

*After capturing all screenshots, remove this guide file and update the README.md to use local image paths instead of placeholder URLs.*