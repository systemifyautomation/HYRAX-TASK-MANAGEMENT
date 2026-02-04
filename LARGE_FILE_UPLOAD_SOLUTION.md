# Large File Upload Solution

## Problem Solved
Large files (100MB+) were being rejected by the n8n webhook due to body size limits.

## Solution Implemented
**Two-tier upload system:**

1. **Small files (< 50MB)**: Upload directly to n8n webhook
   - Fast, no intermediate server needed
   
2. **Large files (≥ 50MB)**: Upload through server proxy
   - Server accepts the large file
   - Server forwards it to n8n webhook with proper handling
   - Supports files up to 3GB

## How to Run

### Start both servers:
```bash
npm run dev:all
```

This starts:
- Frontend (Vite): http://localhost:5173
- Backend (Express): http://localhost:3001

### Alternative (manual):
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend  
npm run dev:server
```

## What Changed

### Frontend (`src/pages/Tasks.jsx`)
- Detects file size automatically
- Files ≥ 50MB route to: `http://localhost:3001/api/upload-creative`
- Files < 50MB route to: `https://workflows.wearehyrax.com/webhook/new-creative-from-tasks`
- Timeout calculation fixed to support large files

### Backend (`server/server.js`)
- `/api/upload-creative` endpoint handles files up to 3GB
- 15-minute timeout for large uploads
- Forwards files to n8n webhook after receiving them completely

## File Size Limits
- Maximum: **3GB per file**
- Server proxy triggers at: **≥ 50MB**
- Timeout: **15 minutes minimum** (scales with file size)

## Notes
- The server MUST be running for files ≥ 50MB
- Files < 50MB work without the server (direct upload)
- Check browser console (F12) for detailed upload progress
- Don't edit code during uploads (HMR can interrupt)

## Production Deployment
For production, update the upload URL in `Tasks.jsx`:
```javascript
const uploadUrl = USE_SERVER_PROXY 
  ? 'https://your-production-domain.com/api/upload-creative'
  : 'https://workflows.wearehyrax.com/webhook/new-creative-from-tasks';
```
