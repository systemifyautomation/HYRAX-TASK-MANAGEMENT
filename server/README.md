# Campaign API Documentation

## Overview
RESTful API for managing campaigns with HTTP endpoints that can be accessed from external tools like n8n.

## Base URL
```
http://localhost:3001/api
```

## Endpoints

### Get All Campaigns
```http
GET /campaigns
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "001_CCW",
      "slackId": "C092ZBS0KEK"
    }
  ],
  "total": 54
}
```

### Get Single Campaign
```http
GET /campaigns/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "001_CCW",
    "slackId": "C092ZBS0KEK"
  }
}
```

### Create New Campaign
```http
POST /campaigns
Content-Type: application/json

{
  "name": "NEW_CAMPAIGN",
  "slackId": "C123456789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 55,
    "name": "NEW_CAMPAIGN",
    "slackId": "C123456789"
  },
  "message": "Campaign created successfully"
}
```

### Update Campaign
```http
PUT /campaigns/:id
Content-Type: application/json

{
  "name": "UPDATED_CAMPAIGN",
  "slackId": "C987654321"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "UPDATED_CAMPAIGN", 
    "slackId": "C987654321"
  },
  "message": "Campaign updated successfully"
}
```

### Delete Campaign
```http
DELETE /campaigns/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "DELETED_CAMPAIGN",
    "slackId": "C123456789"
  },
  "message": "Campaign deleted successfully"
}
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign API is running",
  "timestamp": "2025-12-12T10:30:00.000Z"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Campaign name is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Campaign not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create campaign",
  "message": "Detailed error message"
}
```

## Usage with n8n

### Example HTTP Request Node Configuration:

**Method:** POST
**URL:** `http://localhost:3001/api/campaigns`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "name": "{{ $json.campaignName }}",
  "slackId": "{{ $json.slackChannelId }}"
}
```

## Installation & Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
# or for development
npm run dev
```

The API will be available at `http://localhost:3001`