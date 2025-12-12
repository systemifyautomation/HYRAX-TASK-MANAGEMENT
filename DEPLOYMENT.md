# Deployment Instructions

## Vercel Deployment

This app is configured for easy deployment on Vercel with serverless API functions.

### Prerequisites
- Git repository pushed to GitHub/GitLab/Bitbucket
- Vercel account

### Deployment Steps

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### What Happens During Deployment

1. **Frontend Build**
   - Vite builds the React app to `dist/` directory
   - Static files are served from Vercel's CDN

2. **API Functions**
   - `/api/campaigns.js` becomes `/api/campaigns` endpoint
   - `/api/health.js` becomes `/api/health` endpoint
   - Functions run as serverless Node.js functions

3. **Routing**
   - API calls are routed to serverless functions
   - Frontend routes are handled by React Router
   - 404s fallback to `index.html` for SPA behavior

### Environment Variables

No environment variables are required for basic deployment. The app automatically detects production vs development environment.

### API Endpoints (Production)

Once deployed, your API will be available at:
- `https://your-app.vercel.app/api/campaigns`
- `https://your-app.vercel.app/api/health`

### Local Development vs Production

- **Development**: API calls go to `http://localhost:3001/api/*`
- **Production**: API calls go to `/api/*` (same domain)

### Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click on "Domains" tab
3. Add your custom domain
4. Update DNS records as instructed

### Monitoring

- View deployment logs in Vercel dashboard
- Monitor function performance and errors
- Set up alerts for failed deployments

## Alternative Deployment Options

### Netlify
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Add `_redirects` file for API proxying

### Railway
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm run preview`

### DigitalOcean App Platform
1. Import from GitHub
2. Configure build settings
3. Deploy with automatic scaling

## Production Considerations

### Data Persistence
- Current setup uses in-memory storage
- Consider adding database for production:
  - **Vercel KV** (Redis)
  - **PlanetScale** (MySQL)
  - **Supabase** (PostgreSQL)
  - **MongoDB Atlas**

### Security
- Add API authentication
- Implement rate limiting
- Validate input data
- Add HTTPS enforcement

### Performance
- Enable caching headers
- Optimize bundle size
- Add service worker for offline support
- Implement lazy loading

### Monitoring
- Add error tracking (Sentry)
- Implement analytics
- Set up uptime monitoring
- Configure alerts