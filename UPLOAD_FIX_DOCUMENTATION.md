# Large File Upload Fix Documentation

## Problem Summary
Large file uploads were being aborted unexpectedly. The issue was caused by:

1. **Direct webhook uploads**: Files were uploaded directly from browser to external webhook, bypassing the server
2. **No upload middleware**: Server lacked proper multipart/form-data handling
3. **Size limits**: Default Express JSON body parser limited to 10MB
4. **Timeout issues**: No proper timeout configuration for large file transfers
5. **Vercel limitations**: Serverless functions have strict payload and execution limits

## Solution Implemented

### 1. Server-Side Upload Handling

#### Added Dependencies
```bash
npm install multer form-data node-fetch@2
```

#### New Upload Endpoints

##### `/api/upload-creative` (Standard Upload)
- Handles files up to **500MB**
- Uses in-memory buffering with `multer.memoryStorage()`
- Forwards files to external webhook
- Timeout: **10 minutes**
- Provides progress tracking

##### `/api/upload-chunk` (Chunked Upload)
- For files larger than 500MB
- Splits upload into **50MB chunks**
- Assembles chunks server-side
- No browser memory limitations
- Automatic cleanup after upload

### 2. Frontend Updates

#### Upload Flow Changes
**Before:**
```javascript
xhr.open('POST', 'https://workflows.wearehyrax.com/webhook/...', true);
```

**After:**
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
xhr.open('POST', `${API_BASE}/upload-creative`, true);
```

#### Benefits
- Server validates and preprocesses files
- Better error handling and logging
- Server acts as intermediary to webhook
- Consistent CORS handling
- Progress tracking through proxy

### 3. Configuration Changes

#### Server Configuration
```javascript
// Increased body size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Extended timeouts for large uploads
server.timeout = 600000; // 10 minutes
server.keepAliveTimeout = 620000;
server.headersTimeout = 630000;
```

#### Multer Configuration
```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    fieldSize: 500 * 1024 * 1024,
  }
});
```

#### Vercel Configuration (`server/vercel.json`)
```json
{
  "functions": {
    "server.js": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

### 4. Upload Limits

| Configuration | Development | Production (Vercel) |
|--------------|-------------|---------------------|
| Max file size | 500MB | Limited by Vercel* |
| Timeout | 10 minutes | 60 seconds (Pro) |
| Memory | System RAM | 3GB |
| Chunk size | N/A | 50MB |

*Note: Vercel serverless functions have a 4.5MB payload limit on Hobby plan. For files > 4.5MB, use chunked uploads or host server elsewhere.

## Vercel Deployment Considerations

### Important Limitations
1. **Hobby Plan**: 4.5MB request body limit
2. **Pro Plan**: Still has payload limits
3. **Function Timeout**: Max 60 seconds (Pro), 10 seconds (Hobby)

### Recommended Approaches

#### Option 1: Use Chunked Uploads (Recommended for Vercel)
For files > 4.5MB on Vercel, implement chunked upload on frontend:
```javascript
// Split file into 4MB chunks
const chunkSize = 4 * 1024 * 1024;
// Upload each chunk separately
// Server assembles chunks and forwards to webhook
```

#### Option 2: Deploy Server Separately
- Host Node.js server on platforms without strict limits:
  - Railway
  - Render
  - DigitalOcean App Platform
  - AWS EC2/ECS
  - Google Cloud Run

#### Option 3: Direct S3/Cloud Storage Upload
- Upload directly to S3/GCS with pre-signed URLs
- Trigger webhook after upload completes
- Bypasses serverless function limits entirely

## Testing the Fix

### Local Development
1. Start the server:
```bash
cd server
npm start
```

2. Test with different file sizes:
```bash
# Small file (< 10MB) - should work immediately
# Medium file (10MB - 500MB) - uses standard upload
# Large file (> 500MB) - requires chunked upload
```

### Monitoring Upload Progress
Check browser console for detailed logs:
- Upload start diagnostics
- Progress percentage
- Upload speed
- Server response
- Error details with root cause analysis

### Common Issues

#### Upload Still Aborts
**Possible Causes:**
1. Vercel payload limit exceeded → Use chunked uploads
2. Webhook timeout → Increase webhook timeout
3. Network interruption → Check connection stability
4. Browser memory limit → Use chunked uploads

#### Slow Upload Speed
**Solutions:**
1. Check network connection quality
2. Reduce concurrent uploads
3. Use compression before upload
4. Consider CDN for static assets

## Environment Variables

Add to `.env` file:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api  # Development
VITE_API_BASE_URL=https://your-domain.com/api  # Production

# Server Configuration
PORT=3001
NODE_ENV=production
```

## Migration Guide

### For Existing Deployments

1. **Update server dependencies:**
```bash
cd server
npm install multer form-data node-fetch@2
```

2. **Deploy updated server:**
```bash
npm run deploy  # or your deployment command
```

3. **Update frontend environment variables:**
```bash
VITE_API_BASE_URL=https://your-api-domain.com/api
```

4. **Test uploads with various file sizes**

### Rollback Plan

If issues occur, revert to direct webhook uploads:
1. Comment out API_BASE configuration in Tasks.jsx
2. Restore direct webhook URL in xhr.open()
3. This falls back to original behavior

## Future Improvements

1. **Resumable Uploads**: Add ability to resume interrupted uploads
2. **Compression**: Automatically compress videos before upload
3. **CDN Integration**: Upload directly to CDN with pre-signed URLs
4. **Queue System**: Background job processing for large files
5. **WebSockets**: Real-time upload progress for all users
6. **Multiple Chunks**: Parallel chunk uploads for faster transfer

## Support

For issues or questions:
1. Check browser console for detailed error logs
2. Check server logs for backend errors
3. Verify network tab in DevTools
4. Review this documentation
5. Contact development team

## Version History

- **v1.0.0** - Initial implementation (February 2026)
  - Added server-side upload handling
  - Implemented chunked upload support
  - Updated Vercel configuration
  - Extended timeouts and limits
