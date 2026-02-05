# ✅ YouTube Direct Upload - Vercel-Only Deployment

## Solution Overview

**Videos**: Upload directly to YouTube (up to 256GB)
**Other files**: Upload directly to n8n webhook (up to 3GB per n8n limits)
**No backend server needed!**

## Setup Instructions

### 1. Get YouTube API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or use existing
3. Enable **YouTube Data API v3**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs:
   - Development: `http://localhost:5173`
   - Production: `https://your-vercel-app.vercel.app`

### 2. Configure Environment Variables

Add to your `.env` file:
```bash
VITE_YOUTUBE_API_KEY=your_api_key_here
VITE_YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 3. Run Development Server

```bash
npm run dev
```

App runs at: http://localhost:5173

## How It Works

### Video Files (.mp4, .mov, .avi, etc.)
1. User uploads video
2. Signs in to YouTube (OAuth - one time)
3. Video uploads directly to YouTube as **unlisted**
4. Video title format: `{Month}-{Campaign}-{FileName}`
5. YouTube URL + metadata sent to n8n webhook

### Non-Video Files (images, documents, etc.)
1. User uploads file
2. File sent directly to n8n webhook
3. n8n processes the file

## File Size Limits

- **Videos**: Up to **256GB** (YouTube's limit)
- **Other files**: Up to **3GB** (n8n webhook limit)

If you need larger non-video files, you'll need to increase n8n's payload limit:
```bash
# In n8n environment:
N8N_PAYLOAD_SIZE_MAX=3000
```

## Production Deployment (Vercel)

### 1. Push to GitHub
```bash
git add .
git commit -m "Add YouTube direct upload"
git push
```

### 2. Deploy to Vercel
```bash
vercel --prod
```

### 3. Add Environment Variables in Vercel

In Vercel Dashboard → Settings → Environment Variables:
```
VITE_YOUTUBE_API_KEY = your_key
VITE_YOUTUBE_CLIENT_ID = your_client_id
```

### 4. Update Google OAuth Redirect URI

Add your production URL to Google Console:
- `https://your-app.vercel.app`

### 5. Redeploy
```bash
vercel --prod
```

## n8n Webhook Updates

Your webhook will receive different data based on file type:

### For Videos:
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=xxxxx",
  "youtubeVideoId": "xxxxx",
  "videoTitle": "February-BrandX-final-video",
  "fileName": "final-video.mp4",
  "taskId": "123",
  "adIndex": "0",
  "campaignId": "5",
  "campaignName": "BrandX",
  "assignedUserId": "1",
  "assignedUserName": "John Doe"
}
```

### For Non-Video Files (unchanged):
```json
{
  "file": <binary>,
  "taskId": "123",
  "adIndex": "0",
  "campaignId": "5",
  "campaignName": "BrandX",
  ...
}
```

## Benefits

✅ **No backend server** - pure frontend deployment
✅ **No server costs** - just Vercel (free tier works)
✅ **Huge video support** - up to 256GB
✅ **No timeouts** - YouTube handles long uploads
✅ **Auto-organized** - videos in your YouTube channel with structured naming
✅ **Unlisted videos** - not public, only accessible via link

## User Experience

1. User uploads video file in Tasks page
2. First time only: OAuth popup to sign in to YouTube
3. Progress bar shows upload status
4. Video appears as unlisted on agency YouTube channel
5. YouTube URL is sent to workflow for processing

## Troubleshooting

**"YouTube API not loaded"**
- Check `.env` file has correct keys
- Verify keys are prefixed with `VITE_`
- Restart dev server after adding keys

**"Sign in failed"**
- Check Client ID in `.env`
- Verify redirect URI in Google Console matches your URL
- Clear browser cache and try again

**"Upload failed - 413 Payload Too Large"**
- For non-video files: Increase n8n payload limit
- For videos: Should never happen (goes to YouTube)
