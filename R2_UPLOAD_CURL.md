# R2 Upload - n8n Workflow Configuration

## ✅ FINAL SOLUTION: n8n Handles R2 Upload

Due to persistent CORS issues with browser → R2 uploads, the app now sends files **directly to n8n**, and **n8n uploads to R2**.

**Benefits:**
- ✅ No CORS configuration needed
- ✅ Works immediately without setup
- ✅ n8n has full control over file processing
- ✅ More secure - credentials only on server

---

## 📋 Upload Flow

### Frontend → n8n → R2

**Single Step:** Browser sends file + metadata to n8n (0-100%)
- n8n receives the binary file
- n8n uploads to R2 using AWS S3 node
- n8n returns the final creative URL

---

## 🔧 n8n Workflow Setup

### Node 1: Webhook (Trigger)
**Path:** `/webhook/new-creative-from-tasks`
**Method:** POST
**Binary Property:** `creative`

### Node 2: AWS S3 - Upload File

**Credentials:**
- **Access Key ID:** `3fb61e180cc48bc49fe2c4be9181b07c`
- **Secret Access Key:** `d93348bcca2c7884f903a4fff543daf2024cf8c056e7517deb0b2b17334f04e2`
- **Region:** `us-east-1`
- **Custom S3 Endpoint:** `https://f6b6e09f4e45222766970824f44d1100.r2.cloudflarestorage.com`

**Parameters:**
- **Bucket Name:** `creatives`
- **File Name:**
  ```javascript
  {{ $json.body.campaignName }}_{{ $binary.creative.fileName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,' ').trim().slice(0,30) }}_{{ $now.toMillis() }}
  ```
- **Binary Property:** `creative`
- **Additional Options:**
  - Force path style: `true`
  - Content-Type: `{{ $binary.creative.mimeType }}`

**Example filename output:**
```
042_LIZBUYSHOMES_Artboard_3jpg_1743012345678.mp4
```

### Node 3: Set Creative URL

Create variable for the uploaded file URL:

```javascript 
{
  "url": "https://storage.wearehyrax.com/{{ $node["AWS S3"].json.key }}"
}
```

### Node 4: Respond to Webhook

Return the URL to the frontend:

```javascript
{
  "url": "{{ $json.url }}",
  "slackPermalink": "{{ $json.slackPermalink }}" // if you have Slack integration
}
```

---

## 📁 FormData Sent from Frontend

The frontend sends this data to n8n:

```javascript
{
  creative: <Binary File>,
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
  uploadedByUserRole: "SUPER_ADMIN",
  taskTitle: "Create video ad",
  taskDueDate: "2026-04-15",
  taskQuantity: "2"
}
```

---

## 📁 S3 Credentials Reference

- **Endpoint:** `https://f6b6e09f4e45222766970824f44d1100.r2.cloudflarestorage.com`
- **Region:** `us-east-1`
- **Bucket:** `creatives`
- **Access Key ID:** `3fb61e180cc48bc49fe2c4be9181b07c`
- **Secret Access Key:** `d93348bcca2c7884f903a4fff543daf2024cf8c056e7517deb0b2b17334f04e2`
- **Public URL:** `https://storage.wearehyrax.com`

---

## 🚀 Ready to Use

The app is now configured to send files directly to n8n. Just:
1. Configure the n8n workflow as described above
2. Upload a creative in the app
3. n8n will upload it to R2 and return the URL

No CORS configuration needed!
