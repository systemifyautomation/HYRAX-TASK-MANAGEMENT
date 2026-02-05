# YouTube Direct Upload Setup

## ✅ Solution Implemented

Videos now upload **directly to YouTube** (unlisted), bypassing n8n file size limits entirely.

### Video Upload Flow
1. **User uploads video file** (detects .mp4, .mov, .avi, etc.)
2. **Signs in to YouTube** (OAuth consent - every time to allow channel selection)
3. **Selects channel** (shows ALL channels you have access to, including Brand Accounts)
4. **Uploads to YouTube** as unlisted video
5. **Video title format**: `{month}-{campaign}-{fileName}`
   - Example: `February-BrandX-final-edit.mp4`
6. **Webhook receives** YouTube URL + metadata (no file transfer)

### Non-Video Files
- Small files (< 50MB): Direct to n8n webhook
- Large files (≥ 50MB): Through server proxy

## Setup Instructions

### 1. Get YouTube API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **YouTube Data API v3**:
   - APIs & Services → Enable APIs and Services
   - Search for "YouTube Data API v3"
   - Click Enable
4. Create OAuth 2.0 Credentials:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `https://your-production-domain.com` (add your Vercel URL)
5. Copy the **Client ID** and **API Key**

### 2. Configure Environment Variables

Create `.env` file in the root directory:

```bash
VITE_YOUTUBE_API_KEY=your_api_key_here
VITE_YOUTUBE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

### 3. Run the App

```bash
npm run dev:all
```

## How It Works

### For Users
1. Upload a video file in the Tasks page
2. First time: Sign in to YouTube (OAuth popup)
3. Video uploads with progress bar
4. Video appears as **unlisted** on your YouTube channel
5. YouTube URL is sent to your n8n workflow

### Video Naming
- Format: `{Month}-{Campaign}-{FileName}`
- Example: `February-Nike-Campaign-final-video`
- All videos are **unlisted** (not public, not private)

### File Size Limits
- **Videos**: Up to **256GB** (YouTube's limit)
- **Images/Other**: Up to **3GB**

## Production Deployment

### Frontend (Vercel)
1. Add environment variables in Vercel dashboard:
   ```
   VITE_YOUTUBE_API_KEY=your_key
   VITE_YOUTUBE_CLIENT_ID=your_client_id
   ```
2. Add production URL to Google OAuth redirect URIs
3. Deploy normally: `vercel --prod`

### No Backend Needed!
Videos upload directly from browser to YouTube - no server required for video handling.

## Benefits

✅ **No file size limits** (supports up to 256GB)
✅ **No server costs** for video storage
✅ **No timeout issues** (YouTube handles large uploads)
✅ **Access ALL your channels** (including Brand Accounts you manage)
✅ **Videos organized** in your YouTube channel
✅ **Automatic unlisted** privacy setting
✅ **Structured naming** for easy management

## Webhook Changes

Your n8n workflow will now receive:
- For videos:
  - `youtubeUrl`: Full YouTube URL
  - `youtubeVideoId`: Video ID
  - `videoTitle`: Video title
  - `fileName`: Original file name
  - (all other task metadata)
  
- For non-video files:
  - `file`: The actual file (as before)
  - (all task metadata)

## Troubleshooting

**"Sign in failed"**
- Check your Client ID in `.env`
- Verify redirect URI in Google Console matches your localhost/production URL

**"Not seeing all my channels"**
- Clear browser cache and `localStorage`
- Sign in again - consent screen should show all accessible channels
- Ensure you have proper permissions on Brand Accounts

**"Upload failed"**
- Ensure YouTube Data API v3 is enabled
- Check quota limits in Google Console (default is generous)
- Verify file is a valid video format

**"Not signed in"**
- OAuth consent required on each sign-in to allow channel selection
- Access token stored in browser, persists until sign-out
