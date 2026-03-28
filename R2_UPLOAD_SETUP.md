# Cloudflare R2 Upload Integration - Setup Guide

## Overview
This document explains the new upload flow that uses Cloudflare R2 for file storage instead of sending large files directly to n8n webhooks.

## Problem Solved
- **Previous issue**: n8n has a 100MB limit for webhook payloads
- **Solution**: Upload files to Cloudflare R2 first, then send only metadata to n8n

## New Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Upload Process                          │
└─────────────────────────────────────────────────────────────┘

   User selects file
        │
        ▼
   [1] Upload to Cloudflare R2 (0-95% progress)
        │
        ├─ Progress tracking
        ├─ Large file support (no 100MB limit!)
        ├─ Returns public URL
        │
        ▼
   [2] Send metadata to n8n (96-100% progress)
        │
        ├─ File URL from R2
        ├─ Task information
        ├─ User details
        ├─ Campaign data
        └─ No actual file data!
        │
        ▼
   n8n processes metadata & creates Slack message
        │
        ▼
   ✅ Complete!
```

## Configuration

### Step 1: Set Up Cloudflare R2 Bucket

1. **Create a Cloudflare account** (if you don't have one)
   - Go to https://dash.cloudflare.com/sign-up

2. **Create an R2 bucket**
   - Navigate to R2 in your Cloudflare dashboard
   - Click "Create bucket"
   - Choose a name (e.g., `hyrax-creatives`)
   - Select a location

3. **Configure public access** (optional but recommended)
   - Go to Settings → Public Access
   - Enable "Allow Access"
   - Configure custom domain if desired
   - Note the public URL format

4. **Create API tokens**
   - Go to R2 → Manage R2 API Tokens
   - Click "Create API Token"
   - Give it a name (e.g., "HYRAX Upload Token")
   - Permissions: Object Read & Write
   - Copy the credentials (you'll need these for .env)

### Step 2: Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Cloudflare R2 Storage Configuration
VITE_R2_ACCOUNT_ID=your-cloudflare-account-id
VITE_R2_BUCKET_NAME=hyrax-creatives
VITE_R2_ACCESS_KEY_ID=your-r2-access-key-id
VITE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Optional: Presigned URL endpoint (HIGHLY RECOMMENDED for production)
VITE_R2_PRESIGNED_URL_ENDPOINT=https://your-backend.com/api/r2/presigned-url
```

#### Environment Variables Explained:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_R2_ACCOUNT_ID` | Your Cloudflare account ID | `abc123def456` |
| `VITE_R2_BUCKET_NAME` | Name of your R2 bucket | `hyrax-creatives` |
| `VITE_R2_ACCESS_KEY_ID` | R2 API token access key | `1234567890abcdef` |
| `VITE_R2_SECRET_ACCESS_KEY` | R2 API token secret | `abc...xyz` |
| `VITE_R2_PUBLIC_URL` | Public URL for accessing files | `https://pub-xxxxx.r2.dev` |
| `VITE_R2_PRESIGNED_URL_ENDPOINT` | (Optional) Backend endpoint for presigned URLs | `https://api.example.com/r2/presigned` |

### Step 3: Update n8n Webhook

Your n8n webhook will now receive **different data**:

#### Before (old format with file):
```json
{
  "file": <binary data>,
  "taskId": "123",
  "adIndex": "0",
  "path": "/john-doe/campaign-name/ad_1/preview",
  "assignedUserId": "5",
  ...
}
```

#### After (new format with R2 URL):
```json
{
  "creativeUrl": "https://pub-xxxxx.r2.dev/john-doe/campaign-name/ad_1/preview/1234567890_video.mp4",
  "fileName": "video.mp4",
  "fileSize": 150000000,
  "fileType": "video/mp4",
  "taskId": "123",
  "adIndex": "0",
  "path": "/john-doe/campaign-name/ad_1/preview",
  "assignedUserId": "5",
  ...
}
```

**Action Required**: Update your n8n workflow to:
1. Read `creativeUrl` instead of processing binary file data
2. Use the R2 URL in Slack messages
3. Optionally download the file from R2 if needed for processing

### Step 4: Security Considerations

#### ⚠️ IMPORTANT: Production Security

**Current Implementation (Development Only)**:
- Credentials are in frontend environment variables
- Direct upload from browser to R2

**Recommended for Production**:
- Set up a backend endpoint to generate presigned URLs
- Browser requests presigned URL from your backend
- Backend generates time-limited upload URL
- Browser uploads directly to R2 using presigned URL
- **No credentials exposed in frontend!**

#### Setting up Presigned URL Backend (Recommended)

Create a backend endpoint that generates presigned URLs:

```javascript
// Example Node.js/Express endpoint
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

app.post('/api/r2/presigned-url', async (req, res) => {
  const { key, contentType, fileSize } = req.body;
  
  // Validate request (check auth, file size limits, etc.)
  
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  
  res.json({ uploadUrl, publicUrl });
});
```

Then set `VITE_R2_PRESIGNED_URL_ENDPOINT` in your `.env`:
```bash
VITE_R2_PRESIGNED_URL_ENDPOINT=https://your-backend.com/api/r2/presigned-url
```

## Testing

### 1. Test Upload
1. Start your development server: `npm run dev`
2. Navigate to Tasks page
3. Upload a creative file (any size)
4. Watch console logs:
   - `[STEP 1/2] Uploading file to Cloudflare R2...`
   - Progress: 0-95%
   - `[STEP 2/2] Sending metadata to n8n webhook...`
   - Progress: 96-100%
   - `✅ COMPLETE: File in R2 + metadata sent to n8n`

### 2. Verify in R2
- Go to your Cloudflare R2 dashboard
- Open your bucket
- Files should appear with path structure: `username/campaign/ad_X/preview/timestamp_filename.ext`

### 3. Check n8n Webhook
- Your n8n workflow should receive the metadata
- `creativeUrl` field should contain the R2 URL
- Use this URL to access the file or display in Slack

## File Size Limits

| Storage | Limit |
|---------|-------|
| **n8n (old method)** | 100MB |
| **Cloudflare R2** | 5TB per object |
| **Browser memory** | ~3GB practical limit |

## Troubleshooting

### Issue: "Missing Cloudflare R2 credentials"
**Solution**: Make sure all required environment variables are set in `.env`

### Issue: Upload fails at R2 step
**Causes**:
- Invalid R2 credentials
- Bucket doesn't exist
- Insufficient permissions on API token
- CORS issues (check R2 bucket CORS settings)

**Check console logs for details**

### Issue: Upload succeeds to R2 but fails at n8n
**This is OK!** The file is safely stored in R2. Check:
- n8n webhook URL is correct
- n8n webhook is running
- Network connectivity to n8n

The console will show: "File is safe in R2: [URL]"

### Issue: "Direct R2 upload from browser" warning
**Not an error**, but:
- For development: This is fine
- For production: Set up presigned URL backend (see Security section)

## Developer Notes

### File Locations
- **R2 Upload Utility**: `src/utils/r2Upload.js`
- **Upload Function**: `src/pages/Tasks.jsx` → `handleCreativeUpload()`
- **Environment Config**: `.env` and `.env.example`

### Progress Tracking
- **0-95%**: R2 upload progress
- **96-99%**: Sending metadata to n8n
- **100%**: Complete

### Error Handling
- R2 failures: Clean up immediately, show error, file is NOT stored
- n8n failures: File IS stored in R2, show URL in error message

## Migration Notes

### For Existing Installations
1. Add R2 environment variables
2. Update n8n workflow to handle new JSON format
3. Test with small file first
4. Deploy frontend with new code
5. Files uploaded after deployment will use R2
6. Old files remain at their original locations

### Backward Compatibility
- The code still sends `path`, `taskId`, and other metadata
- n8n can process both old and new formats if configured properly
- Consider maintaining two webhook endpoints during transition

## Support

If you encounter issues:
1. Check console logs (press F12 in browser)
2. Verify all environment variables are set
3. Test R2 bucket access directly
4. Check n8n webhook logs
5. Review this documentation

## Additional Resources
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript (used for R2)](https://docs.aws.amazon.com/sdk-for-javascript/)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
