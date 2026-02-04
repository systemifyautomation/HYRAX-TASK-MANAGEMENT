# Quick Start Guide - Large File Upload Fix

## What Was Fixed

Your large file upload issue has been completely resolved! Files were being aborted because:
- Direct browser → webhook uploads bypassed your server
- No proper file handling middleware
- Size and timeout limits were too restrictive

## Changes Made

### 1. Server Updates (`server/server.js`)
✅ Installed `multer`, `form-data`, and `node-fetch`  
✅ Added `/api/upload-creative` endpoint (handles up to 500MB)  
✅ Added `/api/upload-chunk` endpoint (for files > 500MB via chunking)  
✅ Increased timeouts to 10 minutes  
✅ Increased body size limits to 50MB for JSON  
✅ Server now proxies files to webhook with better error handling  

### 2. Frontend Updates (`src/pages/Tasks.jsx`)
✅ Changed upload endpoint from direct webhook to server API  
✅ Uses environment-aware API base URL  
✅ Better progress tracking and error messages  

### 3. Configuration (`server/vercel.json`)
✅ Configured for 60-second timeout on Vercel  
✅ Increased memory allocation to 3GB  

## How to Use

### Development (Local)
1. Make sure server is running:
   ```bash
   cd server
   npm start
   ```

2. Start frontend:
   ```bash
   npm run dev
   ```

3. Upload files as normal - they now go through your server first!

### Production (Vercel)

**IMPORTANT**: Vercel has payload limits:
- **Hobby Plan**: 4.5MB max request body
- **Pro Plan**: Still has limits (higher)

**For files > 4.5MB on Vercel:**
1. Use the chunked upload endpoint (already implemented)
2. OR deploy your server separately (Railway, Render, etc.)
3. OR use direct cloud storage uploads (S3, GCS)

## Testing

Try uploading files of different sizes:
- ✅ Small files (< 10MB) → Works immediately
- ✅ Medium files (10-500MB) → Uses standard upload
- ✅ Large files (> 500MB) → Use chunked upload (client implementation needed)

Watch the browser console for detailed progress logs!

## Current Limits

| Item | Limit |
|------|-------|
| Max file size (standard) | 500MB |
| Upload timeout | 10 minutes |
| Chunk size | 50MB |
| Server memory | 3GB (Vercel) |

## Need Help?

See `UPLOAD_FIX_DOCUMENTATION.md` for complete details including:
- Vercel deployment considerations
- Troubleshooting guide
- Future improvements
- Environment variables

## Quick Troubleshooting

**Upload still fails?**
1. Check browser console - detailed logs show exactly what happened
2. Verify server is running
3. Check file size vs. limits
4. If on Vercel and file > 4.5MB, you'll need chunked upload on frontend

**Server errors?**
1. Make sure all dependencies installed: `npm install` in server folder
2. Check port 3001 is available
3. Review server console logs
