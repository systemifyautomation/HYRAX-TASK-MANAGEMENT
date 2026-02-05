# ✅ Large File Upload Solution - COMPLETED

## Problem Solved
Large video files (100MB+) were getting aborted during upload.

## Final Solution: Direct YouTube Upload

### Videos (any size)
- ✅ Upload directly to YouTube (up to 256GB!)
- ✅ No server needed
- ✅ No timeouts
- ✅ Uploaded as **unlisted** videos
- ✅ Title format: `{Month}-{Campaign}-{FileName}`
- ✅ Example: `February-BrandX-final-video.mp4`

### Non-Video Files
- Small (< 50MB): Direct to n8n webhook
- Large (≥ 50MB): Through local server proxy

## Quick Start

### 1. Get YouTube API Credentials
1. Go to https://console.cloud.google.com
2. Enable "YouTube Data API v3"
3. Create OAuth 2.0 credentials
4. Add to `.env`:
   ```
   VITE_YOUTUBE_API_KEY=your_key
   VITE_YOUTUBE_CLIENT_ID=your_client_id
   ```

### 2. Run the App
```bash
npm run dev:all
```

This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 3. Upload Videos
1. Upload any video file
2. First time: Sign in to YouTube
3. Video uploads with progress bar
4. Appears as unlisted on your YouTube channel
5. YouTube URL sent to n8n workflow

## n8n Webhook Changes

Your webhook will receive different data for videos:

**For videos:**
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=xxxxx",
  "youtubeVideoId": "xxxxx",
  "videoTitle": "February-Campaign-video",
  "fileName": "original-file.mp4",
  "taskId": "123",
  "adIndex": "0",
  "assignedUserId": "1",
  "assignedUserName": "John Doe",
  "campaignId": "5",
  "campaignName": "BrandX"
}
```

**For non-video files** (unchanged):
```json
{
  "file": <binary file data>,
  "taskId": "123",
  "adIndex": "0",
  ...other metadata
}
```

## Production Deployment

### Vercel (Frontend Only)
1. Add environment variables in Vercel:
   - `VITE_YOUTUBE_API_KEY`
   - `VITE_YOUTUBE_CLIENT_ID`
2. Update Google OAuth redirect URIs with production URL
3. Deploy: `vercel --prod`

**No backend deployment needed** for video uploads!

## File Size Limits
- Videos: **256GB** (YouTube limit)
- Other files: **3GB**

## Documentation
- Full setup: `YOUTUBE_UPLOAD_SETUP.md`
- .env example: `.env.example`
