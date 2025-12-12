# User Management System

## Overview

This application uses a file-based user management system with `server/data/users.json` as the central database for all users.

## Authentication

### Hardcoded Admin Login

For initial access, use these credentials:
- **Email:** `admin@wearehyrax.com`
- **Password:** `HyraxAdmin2024!SecurePass`

This admin account is stored in `server/data/users.json` and can be modified there if needed.

## How It Works

### Authentication Flow (`api/auth.js`)
1. Login requests validate credentials against `server/data/users.json`
2. Passwords are compared in plain text (note: in production, use bcrypt or similar)
3. Upon successful login, a token is generated and last login timestamp is updated
4. Token verification checks against user data in `users.json`

### User Management (`api/users.js`)
- **GET** - Retrieves all users (passwords are never returned)
- **POST** - Creates new users and saves to `users.json`
- **PUT** - Updates existing users and persists changes
- **DELETE** - Removes users (except super admin) and updates the file

All operations read from and write to `server/data/users.json`.

## Important Notes for Vercel Deployment

### ⚠️ Filesystem Limitations

**Vercel's serverless functions have a READ-ONLY filesystem** except for the `/tmp` directory. This means:

1. **Development vs Production:**
   - In local development, changes to `users.json` persist between requests
   - On Vercel, the filesystem is ephemeral and resets between cold starts

2. **Current Implementation:**
   - The code writes to `users.json` which works locally
   - On Vercel, writes may succeed during a function's lifetime but won't persist across invocations
   - After a cold start, the file reverts to the version deployed from Git

3. **Recommended Solutions for Production:**

   **Option A: Database Integration (Recommended)**
   - Use a real database (PostgreSQL, MongoDB, etc.)
   - Vercel offers integrations with various database providers
   - User data will truly persist

   **Option B: Vercel KV or Edge Config**
   - Use Vercel's KV storage (Redis-based)
   - Suitable for this use case with minimal code changes

   **Option C: Environment Variables (Limited)**
   - For very small user lists, store in environment variables
   - Not scalable beyond a few users

4. **For MVP/Demo Purposes:**
   - The current file-based approach works for demos
   - Users created will persist during the serverless function's lifetime
   - After cold starts, only users in the deployed `users.json` will exist

## Files Structure

```
server/data/
├── users.json      # Central user database
├── tasks.json      # Tasks data
└── campaigns.json  # Campaigns data

api/
├── auth.js         # Authentication endpoints
└── users.js        # User management CRUD
```

## Security Considerations

⚠️ **Current Implementation Notes:**
1. Passwords stored in plain text (use hashing in production)
2. Simple token-based auth (use JWT library in production)
3. No rate limiting on login attempts
4. CORS set to allow all origins (restrict in production)

## Future Enhancements

- [ ] Implement password hashing (bcrypt)
- [ ] Add proper JWT library
- [ ] Implement rate limiting
- [ ] Add password reset functionality
- [ ] Integrate with a persistent database
- [ ] Add user roles and permissions system
- [ ] Implement session management
