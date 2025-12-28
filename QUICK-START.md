# 🔐 HYRAX Task Management - Quick Login Reference

## Initial Admin Login Credentials

```
Email:    admin@wearehyrax.com
Password: HyraxAdmin2024!SecurePass
```

## Quick Start Guide

### 1️⃣ First Time Login
1. Open the application
2. Use the admin credentials above
3. You'll be logged in as Super Admin

### 2️⃣ Add New Users
1. Navigate to **User Management** page
2. Click **"Add User"** button
3. Fill in user details:
   - Name
   - Email
   - Role (Team Member, Manager, Admin, Super Admin)
   - Password
4. Click **"Save"**
5. ✅ User is saved to `server/data/users.json`

### 3️⃣ Manage Existing Users
- **Edit:** Click pencil icon next to user
- **Delete:** Click trash icon (cannot delete super admin)
- **View:** All users listed in the table

## User Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access to everything |
| **Admin** | Can manage users and campaigns |
| **Manager** | Can manage tasks within campaigns |
| **Team Member** | Can view and update their tasks |

## Important Notes

### ✅ Local Development
- Users are saved to `server/data/users.json`
- Changes persist immediately
- File is version controlled

### ⚠️ Vercel Production
- Users saved during function lifetime
- File resets on cold starts to deployed version
- Consider database for production use

### 🔒 Security Tips
1. **Change default password** after first login
2. **Create individual accounts** for each team member
3. **Use strong passwords** (8+ characters, mixed case, numbers, symbols)
4. **Limit super admin access** to trusted users only

## File Location

User data is stored in:
```
server/data/users.json
```

You can manually edit this file if needed, but make sure JSON format is valid.

## Troubleshooting

### Cannot Login
- ✅ Check email is exactly: `admin@wearehyrax.com`
- ✅ Check password is exactly: `HyraxAdmin2024!SecurePass`
- ✅ Check browser console for errors (F12)

### Users Not Saving
- ✅ Check `server/data/users.json` exists
- ✅ Check file permissions (should be readable/writable)
- ✅ Check browser console for API errors

### Lost Admin Access
- ✅ Restore `users.json` from backup
- ✅ Or manually add admin user to `users.json`:
```json
[
  {
    "id": 1,
    "name": "HYRAX Super Admin",
    "email": "admin@wearehyrax.com",
    "role": "super_admin",
    "password": "HyraxAdmin2024!SecurePass",
    "avatar": "HSA",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "lastLogin": null
  }
]
```

## API Endpoints

If you need to interact with the API directly:

```bash
# Login
POST /api/auth
{
  "action": "login",
  "email": "admin@wearehyrax.com",
  "password": "HyraxAdmin2024!SecurePass"
}

# Get Users (requires auth token)
GET /api/users
Headers: { "Authorization": "Bearer {token}" }

# Create User (requires auth token)
POST /api/users
Headers: { "Authorization": "Bearer {token}" }
Body: { "name": "...", "email": "...", "role": "...", "password": "..." }
```

## Support

For detailed information:
- 📖 **USER-MANAGEMENT.md** - Full user system documentation
- 📖 **IMPLEMENTATION-SUMMARY.md** - Technical implementation details
- 📖 **README.md** - General project information
