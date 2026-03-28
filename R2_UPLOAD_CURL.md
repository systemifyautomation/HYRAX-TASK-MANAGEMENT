# R2 Upload - AWS SDK Configuration

## ✅ SETUP COMPLETE

The app now uses **AWS SDK for JavaScript** to upload files to R2 with proper AWS Signature V4 authentication.

**Benefits:**
- ✅ No CORS configuration needed (AWS SDK handles auth properly)
- ✅ Secure - credentials properly signed
- ✅ Works directly from browser to R2
- ✅ Bypasses 100MB n8n webhook limit

---

## 📋 How Upload Flow Works

### Frontend → R2 → n8n (2-Step Process)

**STEP 1 (0-95%):** Browser uploads file to R2 using AWS SDK  
- AWS SDK creates properly signed requests
- No CORS issues - authentication handled by SDK
- File uploads directly to R2 storage

**STEP 2 (96-100%):** Browser sends metadata + `s3Url` to n8n  
- n8n receives S3 URL where file is stored
- n8n can download file if needed
- n8n returns final creative URL

---

## 🔧 Configuration Used

The app is configured with:

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: 'https://f6b6e09f4e45222766970824f44d1100.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '3fb61e180cc48bc49fe2c4be9181b07c',
    secretAccessKey: 'd93348bcca2c7884f903a4fff543daf2024cf8c056e7517deb0b2b17334f04e2',
  },
});
```

**Credentials from `.env`:**
- `VITE_S3_ENDPOINT` - R2 account endpoint
- `VITE_S3_REGION` - Region (us-east-1)
- `VITE_S3_BUCKET_NAME` - Bucket name (creatives)
- `VITE_S3_ACCESS_KEY_ID` - R2 access key
- `VITE_S3_SECRET_ACCESS_KEY` - R2 secret key
- `VITE_S3_PUBLIC_URL` - Public URL for accessing files

---

## 🎯 What Gets Sent to n8n

After R2 upload completes, n8n webhook receives:

```javascript
{
  s3Url: "https://storage.wearehyrax.com/leon/gold-ira/ad_1/preview/1774625089718_video.mp4",
  taskId: "123",
  adIndex: 0,
  path: "/leon/gold-ira/ad_1/preview",
  creative_width: "1080",
  creative_height: "1920",
  assignedUserId: "5",
  assignedUserName: "Leon",
  assignedUserDepartment: "VIDEO EDITING",
  campaignId: "1",
  campaignName: "001_GOLD_IRA",
  uploadedByUserId: "1",
  uploadedByUserName: "Admin",
  // ... other metadata
}
```

**Note:** n8n receives the `s3Url` field pointing to where the file is stored in R2. n8n can then:
1. Download the file from R2 if needed
2. Process it (resize, convert, etc.)
3. Return the final creative URL to the frontend

---

## 📁 S3 Credentials Reference

- **Endpoint:** `https://f6b6e09f4e45222766970824f44d1100.r2.cloudflarestorage.com`
- **Region:** `us-east-1`
- **Bucket:** `creatives`
- **Access Key ID:** `3fb61e180cc48bc49fe2c4be9181b07c`
- **Secret Access Key:** `d93348bcca2c7884f903a4fff543daf2024cf8c056e7517deb0b2b17334f04e2`
- **Public URL:** `https://storage.wearehyrax.com`

---

## 🔗 File URL Pattern

Uploaded files are accessible at:
```
https://storage.wearehyrax.com/{path}/{timestamp}_{filename}
```

**Example:**
```
https://storage.wearehyrax.com/leon/gold-ira/ad_1/preview/1774625089718_Facebook_Format__1_.mp4
```

---

## 🚀 Ready to Use

The app is now configured and ready to upload files to R2. Just upload a creative and it will:
1. Upload to R2 (with progress 0-95%)
2. Send metadata to n8n (96-100%)
3. Display the final URL from n8n

No additional configuration needed!
