# Vercel Deployment Guide

## ✅ Quick Deploy to Vercel

Your app is now configured for Vercel deployment with working API endpoints!

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Configure Vercel serverless API deployment"
git push
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### Step 3: Set Environment Variables (Optional)

Add these in Vercel dashboard under **Settings → Environment Variables**:

```env
VITE_USE_API=true
NODE_ENV=production
```

### Step 4: Deploy!

Click **"Deploy"** and Vercel will:
- Build your React frontend
- Deploy API serverless functions
- Serve everything from one domain

## 🎯 What's Deployed

### Frontend
- React app built with Vite
- Static files served from Vercel CDN
- SPA routing handled automatically

### API Endpoints (Serverless Functions)
All endpoints available at your domain:

- `https://your-app.vercel.app/api/health` - Health check
- `https://your-app.vercel.app/api/auth/login` - User authentication
- `https://your-app.vercel.app/api/campaigns` - Campaign CRUD
- `https://your-app.vercel.app/api/users` - User management
- `https://your-app.vercel.app/api/tasks` - Task management

### Data Storage
- **Initial deployment**: In-memory storage (resets on each cold start)
- **Upgrade path**: Easy to add Vercel KV for persistence

## 🔐 Login Credentials

Default admin account:
- **Email**: admin@hyrax.com
- **Password**: HyraxAdmin2024!SecurePass

## 🚀 Features Enabled

✅ Full task management (create, edit, delete, duplicate)  
✅ User management with roles  
✅ Campaign integration  
✅ Authentication with JWT  
✅ Weekly/custom date filtering  
✅ Card and list views  
✅ Copy/Ad approval workflows  
✅ Responsive design  

## 📊 Monitoring

After deployment:
- View logs in Vercel dashboard
- Monitor function performance
- Check error tracking
- Set up deployment notifications

## ⚡ Performance

- API functions: 10s max duration
- 1024MB memory allocated
- Auto-scaling based on traffic
- Global CDN distribution

## 🔄 Continuous Deployment

Every push to your main branch triggers automatic deployment:
1. Vercel detects changes
2. Runs build
3. Deploys to production
4. Previous deployment stays live until new one succeeds

## 🔧 Troubleshooting

### API Returns 404
- Check Vercel function logs
- Ensure `/api` folder deployed
- Verify `vercel.json` configuration

### CORS Errors
- Headers configured in API functions
- Check browser console for details

### Data Not Persisting
- Expected behavior (in-memory storage)
- Upgrade to Vercel KV for persistence

## 📈 Upgrade to Persistent Storage (Later)

When ready for production persistence:

1. Enable Vercel KV in dashboard
2. Update `api/lib/storage.js`:
   ```javascript
   import { kv } from '@vercel/kv';
   
   export async function getCampaigns() {
     return await kv.get('campaigns') || [];
   }
   ```
3. Redeploy

## 🎨 Custom Domain (Optional)

1. Go to project **Settings → Domains**
2. Add your domain
3. Update DNS records
4. SSL automatically configured

---

**Ready to deploy!** Just push to GitHub and deploy on Vercel. 🚀
