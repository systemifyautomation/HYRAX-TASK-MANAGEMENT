# Campaign API Endpoints

This document contains the complete API specification for the Campaign Management system.

## Base URL
```
http://localhost:3001/api
```

## Authentication
Currently no authentication is required. All endpoints are publicly accessible.

## Response Format
All responses follow this standard format:

```json
{
  "success": boolean,
  "data": object | array,
  "message": string (optional),
  "error": string (optional)
}
```

---

## Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the API server is running

**Request:** No parameters required

**Response:**
```json
{
  "success": true,
  "message": "Campaign API is running",
  "timestamp": "2025-12-12T10:30:00.000Z"
}
```

---

### 2. Get All Campaigns

**Endpoint:** `GET /campaigns`

**Description:** Retrieve all campaigns

**Request:** No parameters required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "001_CCW",
      "slackId": "C092ZBS0KEK"
    },
    {
      "id": 2,
      "name": "002-CASH4HOMES",
      "slackId": ""
    }
  ],
  "total": 54
}
```

---

### 3. Get Single Campaign

**Endpoint:** `GET /campaigns/:id`

**Description:** Retrieve a specific campaign by ID

**Parameters:**
- `id` (number) - Campaign ID in URL path

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

**Error Response (404):**
```json
{
  "success": false,
  "error": "Campaign not found"
}
```

---

### 4. Create New Campaign

**Endpoint:** `POST /campaigns`

**Description:** Create a new campaign

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "NEW_CAMPAIGN_NAME",
  "slackId": "C123456789"
}
```

**Required Fields:**
- `name` (string) - Campaign name (must be unique)

**Optional Fields:**
- `slackId` (string) - Slack channel ID

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 55,
    "name": "NEW_CAMPAIGN_NAME",
    "slackId": "C123456789"
  },
  "message": "Campaign created successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Campaign name is required"
}
```

**Error Response (400 - Duplicate):**
```json
{
  "success": false,
  "error": "Campaign name already exists"
}
```

---

### 5. Update Campaign

**Endpoint:** `PUT /campaigns/:id`

**Description:** Update an existing campaign

**Parameters:**
- `id` (number) - Campaign ID in URL path

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "UPDATED_CAMPAIGN_NAME",
  "slackId": "C987654321"
}
```

**Required Fields:**
- `name` (string) - Campaign name (must be unique)

**Optional Fields:**
- `slackId` (string) - Slack channel ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "UPDATED_CAMPAIGN_NAME",
    "slackId": "C987654321"
  },
  "message": "Campaign updated successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Campaign not found"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Campaign name already exists"
}
```

---

### 6. Delete Campaign

**Endpoint:** `DELETE /campaigns/:id`

**Description:** Delete a campaign

**Parameters:**
- `id` (number) - Campaign ID in URL path

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

**Error Response (404):**
```json
{
  "success": false,
  "error": "Campaign not found"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Example Usage

### cURL Examples

**Get all campaigns:**
```bash
curl -X GET http://localhost:3001/api/campaigns
```

**Create a campaign:**
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name": "TEST_CAMPAIGN", "slackId": "C123456789"}'
```

**Update a campaign:**
```bash
curl -X PUT http://localhost:3001/api/campaigns/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "UPDATED_CAMPAIGN", "slackId": "C987654321"}'
```

**Delete a campaign:**
```bash
curl -X DELETE http://localhost:3001/api/campaigns/1
```

---

## Integration Examples

### n8n HTTP Request Node

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

### JavaScript/Fetch

```javascript
// Create campaign
const response = await fetch('http://localhost:3001/api/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'NEW_CAMPAIGN',
    slackId: 'C123456789'
  })
});

const result = await response.json();
console.log(result);
```

### Python/Requests

```python
import requests

# Create campaign
response = requests.post('http://localhost:3001/api/campaigns', 
  json={
    'name': 'NEW_CAMPAIGN',
    'slackId': 'C123456789'
  }
)

result = response.json()
print(result)
```

---

## Data Persistence

Campaign data is stored in `server/data/campaigns.json`. The file is automatically updated when campaigns are created, updated, or deleted through the API.

## Server Configuration

The API server runs on port 3001 by default. This can be changed by setting the `PORT` environment variable:

```bash
PORT=8000 npm start
```