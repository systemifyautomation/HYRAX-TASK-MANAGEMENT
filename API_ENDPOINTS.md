# Campaign API Endpoints

This document contains the complete API specification for the Campaign Management system.

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints require authentication using Bearer tokens. You must first obtain a token by logging in with valid credentials.

**Authentication Header:**
```
Authorization: Bearer <your-jwt-token>
```

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

## Authentication Endpoints

### Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and obtain access token

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@hyrax.com",
  "password": "HyraxAdmin2024!SecurePass"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@hyrax.com",
      "name": "HYRAX Super Admin",
      "role": "super_admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Logout

**Endpoint:** `POST /auth/logout`

**Description:** Invalidate current session token

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Campaign Endpoints

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

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

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

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

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
Authorization: Bearer <your-jwt-token>
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
Authorization: Bearer <your-jwt-token>
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
|-------------|-----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Example Usage

### cURL Examples

**Login to get token:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hyrax.com", "password": "HyraxAdmin2024!SecurePass"}'
```

**Get all campaigns:**
```bash
curl -X GET http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Create a campaign:**
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "TEST_CAMPAIGN", "slackId": "C123456789"}'
```

**Update a campaign:**
```bash
curl -X PUT http://localhost:3001/api/campaigns/1 \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "UPDATED_CAMPAIGN", "slackId": "C987654321"}'
```

**Delete a campaign:**
```bash
curl -X DELETE http://localhost:3001/api/campaigns/1 \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Logout:**
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## Integration Examples

### n8n HTTP Request Node

**Step 1 - Login Node:**
**Method:** POST
**URL:** `http://localhost:3001/api/auth/login`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "email": "admin@hyrax.com",
  "password": "HyraxAdmin2024!SecurePass"
}
```

**Step 2 - Create Campaign Node:**
**Method:** POST
**URL:** `http://localhost:3001/api/campaigns`
**Headers:**
```json
{
  "Authorization": "Bearer {{ $('Login').first().json.data.token }}",
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
// Login first to get token
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@hyrax.com',
    password: 'HyraxAdmin2024!SecurePass'
  })
});

const loginResult = await loginResponse.json();
const token = loginResult.data.token;

// Create campaign with token
const response = await fetch('http://localhost:3001/api/campaigns', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
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

# Login first to get token
login_response = requests.post('http://localhost:3001/api/auth/login', 
  json={
    'email': 'admin@hyrax.com',
    'password': 'HyraxAdmin2024!SecurePass'
  }
)

login_result = login_response.json()
token = login_result['data']['token']

# Create campaign with token
headers = {
  'Authorization': f'Bearer {token}',
  'Content-Type': 'application/json'
}

response = requests.post('http://localhost:3001/api/campaigns', 
  headers=headers,
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

User data is stored in `server/data/users.json` and task data is stored in `server/data/tasks.json`. These files are automatically updated through the respective API endpoints.

---

## Task Management

### Create Task
- **POST** `/api/tasks`
- **Authentication**: Required (Bearer token)
- **Body**: Task object with title, description, status, etc.

Example:
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "New Marketing Campaign",
    "description": "Create promotional content for product launch",
    "status": "not_started",
    "priority": "high",
    "assignedTo": 2,
    "campaignId": 1,
    "dueDate": "2025-12-25",
    "mediaType": "VIDEO"
  }'
```

### Update Task
- **PUT** `/api/tasks/:id`
- **Authentication**: Required (Bearer token)
- **Body**: Updated task fields

Example:
```bash
curl -X PUT http://localhost:3001/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "in_progress",
    "assignedTo": 3,
    "copyWritten": true
  }'
```

### Delete Task
- **DELETE** `/api/tasks/:id`
- **Authentication**: Required (Bearer token)

Example:
```bash
curl -X DELETE http://localhost:3001/api/tasks/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## User Management

### Create User
- **POST** `/api/users`
- **Authentication**: Required (Bearer token)
- **Body**: User object with name, email, role, etc.

Example:
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@hyrax.com", 
    "role": 3,
    "avatar": "🔥",
    "password": "SecurePassword123!"
  }'
```

### Update User
- **PUT** `/api/users/:id`
- **Authentication**: Required (Bearer token)
- **Body**: Updated user fields

Example:
```bash
curl -X PUT http://localhost:3001/api/users/5 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Jane Smith",
    "role": 4
  }'
```

### Delete User
- **DELETE** `/api/users/:id`
- **Authentication**: Required (Bearer token)

Example:
```bash
curl -X DELETE http://localhost:3001/api/users/5 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Server Configuration

The API server runs on port 3001 by default. This can be changed by setting the `PORT` environment variable:

```bash
PORT=8000 npm start
```