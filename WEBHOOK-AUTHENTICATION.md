# Webhook Authentication Implementation

## Overview
This document describes the webhook-based authentication system implemented for the Hyrax Task Management application.

## Webhook Configuration

**Webhook URL:** `https://workflows.wearehyrax.com/webhook/new-tasks-login`

The webhook URL is stored in environment variables:
- `.env.example` - Example configuration
- `server/.env.production` - Production configuration
- Can be overridden with `LOGIN_WEBHOOK_URL` environment variable

## Authentication Flow

### Login Process

1. **User submits credentials** (email and password)
2. **System generates hash code:**
   - Combines: email + password + today's UTC date (format: "dd/MM/yyyy")
   - Creates SHA-256 hash using `hashThreeInputsJS()` function
3. **GET request sent to webhook:**
   - Query parameters: `email`, `password`
   - Header: `code` (the generated hash)
4. **Webhook responds with:**
   ```json
   {
     "allowed": "yes" | "no",
     "role": "admin" | "super-admin" | "user" | null,
     "department": "DEV" | "MEDIA BUYING" | "VIDEO EDITING" | "GRAPHIC DESIGN" | null
   }
   ```
5. **Access granted if:**
   - `allowed` = "yes"
   - User data updated with role and department from webhook response

### User Creation Process

When creating a new user:
1. **System generates hash code** (same as login)
2. **POST request sent to webhook:**
   - Header: `code` (the generated hash)
   - Body:
     ```json
     {
       "email": "user@example.com",
       "name": "User Name",
       "role": "user",
       "password": "password",
       "department": "MEDIA BUYING",
       "action": "create_user"
     }
     ```
3. **User creation proceeds if webhook approves**

## Files Modified

### Backend
- **[api/lib/hashUtils.cjs](api/lib/hashUtils.cjs)** - Hash generation function
- **[api/auth.js](api/auth.js)** - Login webhook integration
- **[api/users.js](api/users.js)** - User creation webhook integration

### Frontend
- **[src/context/AuthContext.jsx](src/context/AuthContext.jsx)** - Updated to use API authentication
- **[src/pages/UserManagement.jsx](src/pages/UserManagement.jsx)** - Updated department options

### Data
- **[server/data/users.json](server/data/users.json)** - Added department field

### Configuration
- **[.env.example](.env.example)** - Added webhook URL configuration
- **[server/.env.production](server/.env.production)** - Added webhook URL configuration

## Department Values

Valid department values returned by webhook:
- `DEV`
- `MEDIA BUYING`
- `VIDEO EDITING`
- `GRAPHIC DESIGN`
- `null` (if not allowed)

## Role Values

Valid role values returned by webhook:
- `admin`
- `super-admin`
- `user`
- `null` (if not allowed)

## Security Notes

1. **Hash Function:** SHA-256 hash of email + password + UTC date
2. **Environment Variables:** Webhook URL hidden from GitHub via `.gitignore`
3. **Daily Rotation:** Hash changes daily based on UTC date
4. **Webhook Validation:** All authentication decisions made by webhook service

## Testing

To test the hash function:
```bash
node api/lib/hashUtils.cjs
```

## Environment Setup

For production deployment, set the following environment variable:
```
LOGIN_WEBHOOK_URL=https://workflows.wearehyrax.com/webhook/new-tasks-login
```

For Vercel deployment, add this in the Vercel dashboard under Settings > Environment Variables.
