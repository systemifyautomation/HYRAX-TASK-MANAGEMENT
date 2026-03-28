# Quick Start - S3 Upload Integration

## What Changed?
✅ Files now upload to S3-compatible storage (no 100MB limit!)  
✅ Only metadata sent to n8n (much faster)  
✅ Progress tracking: 0-95% S3 upload, 96-100% n8n metadata

## Setup (5 minutes)

### 1. Add to your `.env` file:
```bash
# S3-Compatible Storage (Cloudflare R2, AWS S3, etc.)
VITE_S3_ENDPOINT=https://your-endpoint.r2.cloudflarestorage.com
VITE_S3_REGION=auto
VITE_S3_ACCESS_KEY_ID=your-access-key-id
VITE_S3_SECRET_ACCESS_KEY=your-secret-access-key
VITE_S3_BUCKET_NAME=creatives
VITE_S3_PUBLIC_URL=https://your-endpoint.r2.cloudflarestorage.com

# Optional but HIGHLY recommended for production:
VITE_S3_PRESIGNED_URL_ENDPOINT=https://your-backend.com/api/s3/presigned-url
```

### 2. Get S3 Credentials:
**For Cloudflare R2 (S3-compatible):**
1. Login to Cloudflare dashboard
2. Go to R2 → Create bucket (name it `creatives`)
3. Go to Manage R2 API Tokens → Create API Token
4. Copy:
   - **S3 Endpoint**: Your account-specific R2 endpoint
   - **Region**: `auto` (for R2)
   - **Access Key ID**: From API token
   - **Secret Access Key**: From API token
5. Bucket public URL for accessing files

**For AWS S3:**
1. Go to AWS Console → S3
2. Create bucket
3. Go to IAM → Create access key
4. Copy endpoint (e.g., `s3.us-east-1.amazonaws.com`), region, and credentials

### 3. Update your n8n webhook:
Your n8n workflow needs to match these exact fields used in the S3 node:
- **S3 Endpoint**
- **Region** 
- **Access Key ID**
- **Secret Access Key**

Your webhook now receives **JSON with file URL** instead of binary file data:

**New webhook payload:**
```json
{
  "creativeUrl": "https://your-endpoint.r2.cloudflarestorage.com/creatives/path/to/file.mp4",
  "fileName": "video.mp4",
  "fileSize": 150000000,
  "fileType": "video/mp4",
  "taskId": "123",
  "adIndex": "0",
  ... (all other metadata as before)
}
```

**Update your n8n workflow to:**
- Read the `creativeUrl` field
- Use the S3 URL in Slack messages
- Download from S3 if you need to process the file

### 4. Test it:
```bash
npm run dev
```
Upload a creative and watch the console for:
- `[STEP 1/2] Uploading file to S3 storage...`
- `[STEP 2/2] Sending metadata to n8n webhook...`
- `✅ COMPLETE: File in S3 + metadata sent to n8n`

## Files Changed:
- ✅ `src/utils/r2Upload.js` - S3 upload utility (works with any S3-compatible storage)
- ✅ `src/pages/Tasks.jsx` - Modified upload function
- ✅ `.env` - S3 credentials configured
- ✅ `.env.example` - S3 credentials template
- ✅ `R2_UPLOAD_SETUP.md` - Full documentation
- ✅ `QUICK_START_R2.md` - This file

## Security Note ⚠️
**Current setup (development):** S3 credentials in frontend .env

**Production recommendation:** Set up a backend endpoint to generate presigned URLs, then set:
```bash
VITE_S3_PRESIGNED_URL_ENDPOINT=https://your-backend.com/api/s3/presigned-url
```

See `R2_UPLOAD_SETUP.md` for presigned URL implementation.

## File Size Limits:
- ❌ Old (n8n): **100MB max**
- ✅ New (S3): **5TB max** (practical limit ~3GB browser memory)

## Troubleshooting:
- **"Missing S3 storage credentials"**: Check all env vars are set
- **S3 upload fails**: Verify credentials, bucket exists, CORS configured
- **n8n webhook fails**: File is safe in S3! Check n8n webhook URL and logs

For detailed setup & troubleshooting: See `R2_UPLOAD_SETUP.md`
