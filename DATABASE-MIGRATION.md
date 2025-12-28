# Database Migration Guide

## Why Migrate from users.json?

The current file-based system works great for development and demos, but has limitations in production:

1. **Vercel Limitations:** Serverless functions have read-only filesystems (except `/tmp`)
2. **Concurrency:** File writes aren't atomic and can cause race conditions
3. **Scalability:** Not suitable for large user bases
4. **Backup/Recovery:** Manual process for backups
5. **Performance:** File I/O slower than database queries

## Migration Options

### Option 1: Vercel Postgres (Recommended for Vercel)

**Pros:**
- Native Vercel integration
- Automatic connection pooling
- Built-in dashboard
- Generous free tier

**Setup Steps:**
```bash
# 1. Install Vercel Postgres
npm install @vercel/postgres

# 2. Create storage in Vercel dashboard
# Projects > Your Project > Storage > Create Database > Postgres

# 3. Update api/users.js
import { sql } from '@vercel/postgres';

// Create users table (run once)
async function createUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      avatar VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `;
}

// Read users
async function getUsers() {
  const { rows } = await sql`SELECT * FROM users`;
  return rows;
}

// Add user
async function addUser(user) {
  const { rows } = await sql`
    INSERT INTO users (name, email, password, role, avatar)
    VALUES (${user.name}, ${user.email}, ${user.password}, ${user.role}, ${user.avatar})
    RETURNING *
  `;
  return rows[0];
}
```

### Option 2: MongoDB Atlas

**Pros:**
- NoSQL flexibility
- Free tier available
- Easy to use
- Great for document-based data

**Setup Steps:**
```bash
# 1. Install MongoDB driver
npm install mongodb

# 2. Create cluster at mongodb.com/atlas

# 3. Update api/users.js
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('hyrax');
const usersCollection = db.collection('users');

// Read users
async function getUsers() {
  await client.connect();
  const users = await usersCollection.find({}).toArray();
  return users;
}

// Add user
async function addUser(user) {
  await client.connect();
  const result = await usersCollection.insertOne(user);
  return { ...user, _id: result.insertedId };
}
```

### Option 3: Supabase (Recommended for Full Backend)

**Pros:**
- PostgreSQL database
- Built-in authentication
- Real-time subscriptions
- Storage for files
- Generous free tier

**Setup Steps:**
```bash
# 1. Install Supabase client
npm install @supabase/supabase-js

# 2. Create project at supabase.com

# 3. Use Supabase Auth (recommended)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Login with Supabase Auth
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return data;
}

// Get users (with Row Level Security)
async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  return data;
}
```

### Option 4: Vercel KV (Redis)

**Pros:**
- Simple key-value storage
- Fast read/write
- Native Vercel integration
- Good for session data

**Setup Steps:**
```bash
# 1. Install Vercel KV
npm install @vercel/kv

# 2. Create KV storage in Vercel dashboard

# 3. Update api/users.js
import { kv } from '@vercel/kv';

// Store users as JSON under a key
async function getUsers() {
  const users = await kv.get('users');
  return users || [];
}

async function addUser(user) {
  const users = await getUsers();
  users.push(user);
  await kv.set('users', users);
  return user;
}
```

## Migration Steps

### Phase 1: Export Existing Data
```javascript
// Create a migration script
import fs from 'fs';
import path from 'path';

const usersPath = path.join(process.cwd(), 'server/data/users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

console.log('Users to migrate:', users.length);
// Save to CSV or JSON for import
```

### Phase 2: Update API Endpoints

1. **Create database helper file** (`lib/db.js`)
```javascript
// Example for Vercel Postgres
import { sql } from '@vercel/postgres';

export const db = {
  users: {
    async getAll() {
      const { rows } = await sql`SELECT * FROM users`;
      return rows;
    },
    async getById(id) {
      const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
      return rows[0];
    },
    async getByEmail(email) {
      const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
      return rows[0];
    },
    async create(user) {
      const { rows } = await sql`
        INSERT INTO users (name, email, password, role, avatar)
        VALUES (${user.name}, ${user.email}, ${user.password}, ${user.role}, ${user.avatar})
        RETURNING *
      `;
      return rows[0];
    },
    async update(id, user) {
      const { rows } = await sql`
        UPDATE users 
        SET name = ${user.name}, 
            email = ${user.email}, 
            role = ${user.role},
            avatar = ${user.avatar}
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0];
    },
    async delete(id) {
      const { rows } = await sql`DELETE FROM users WHERE id = ${id} RETURNING *`;
      return rows[0];
    }
  }
};
```

2. **Update auth.js**
```javascript
import { db } from '../lib/db.js';

export default async function handler(req, res) {
  // ... existing CORS setup ...
  
  if (action === 'login') {
    // Replace file read with database query
    const user = await db.users.getByEmail(email);
    
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // ... rest of login logic ...
  }
}
```

3. **Update users.js**
```javascript
import { db } from '../lib/db.js';

export default async function handler(req, res) {
  // ... existing auth middleware ...
  
  switch (req.method) {
    case 'GET':
      const users = await db.users.getAll();
      return res.json({ success: true, users });
    
    case 'POST':
      const newUser = await db.users.create(req.body);
      return res.json({ success: true, user: newUser });
    
    case 'PUT':
      const updatedUser = await db.users.update(req.query.id, req.body);
      return res.json({ success: true, user: updatedUser });
    
    case 'DELETE':
      const deletedUser = await db.users.delete(req.query.id);
      return res.json({ success: true, user: deletedUser });
  }
}
```

### Phase 3: Import Data to Database

```javascript
// migration-script.js
import { db } from './lib/db.js';
import users from './server/data/users.json' assert { type: 'json' };

async function migrate() {
  console.log('Starting migration...');
  
  for (const user of users) {
    try {
      await db.users.create(user);
      console.log(`✓ Migrated: ${user.email}`);
    } catch (error) {
      console.error(`✗ Failed: ${user.email}`, error.message);
    }
  }
  
  console.log('Migration complete!');
}

migrate();
```

### Phase 4: Test Thoroughly

1. Test login with existing users
2. Test creating new users
3. Test updating users
4. Test deleting users
5. Test token verification
6. Load test with multiple concurrent requests

### Phase 5: Deploy

1. Update environment variables in Vercel
2. Deploy to production
3. Monitor logs for any issues
4. Keep `users.json` as backup

## Password Hashing Migration

When migrating to a database, also implement proper password hashing:

```bash
npm install bcrypt
```

```javascript
import bcrypt from 'bcrypt';

// When creating/updating users
const hashedPassword = await bcrypt.hash(password, 10);

// When verifying login
const isValid = await bcrypt.compare(password, user.password);
```

## Rollback Plan

Keep the current file-based system as a fallback:

```javascript
// In api/users.js
const USE_DATABASE = process.env.USE_DATABASE === 'true';

async function getUsers() {
  if (USE_DATABASE) {
    return await db.users.getAll();
  } else {
    // Fall back to file system
    return readUsersFromFile();
  }
}
```

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **Vercel Postgres** | 256 MB, 60 hours compute | $20/mo for 512 MB |
| **MongoDB Atlas** | 512 MB | $9/mo for 2GB |
| **Supabase** | 500 MB, 50k monthly active users | $25/mo for 8GB |
| **Vercel KV** | 256 MB, 100k requests | $25/mo for 1GB |

## Recommended Approach

For HYRAX Task Management, I recommend:

### For MVP/Demo
✅ **Current file-based system** - Perfect for what you need

### For Production (< 1000 users)
✅ **Vercel Postgres** - Best integration with Vercel, easy to use

### For Production (> 1000 users or need auth features)
✅ **Supabase** - Full backend with auth, storage, and real-time features

### For High-Performance Requirements
✅ **Vercel KV + Vercel Postgres** - KV for sessions/cache, Postgres for data

## Need Help?

- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/
- Supabase: https://supabase.com/docs
- Vercel KV: https://vercel.com/docs/storage/vercel-kv
