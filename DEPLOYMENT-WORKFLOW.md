# 🚀 Deployment Workflow - Protecting Your Data

## ✅ Setup Complete!

Your data files are now protected from Git commits. Here's how it works:

### Protected Files (NOT in Git)
- ❌ `server/data/users.json` - Your actual user data
- ❌ `server/data/tasks.json` - Your actual task data
- ❌ `server/data/campaigns.json` - Your actual campaign data

### Template Files (IN Git)
- ✅ `server/data/users.json.template` - Starting template with admin user
- ✅ `server/data/tasks.json.template` - Empty array template
- ✅ `server/data/campaigns.json.template` - Empty array template

## 🔄 How to Update Your App

### Simple 3-Step Process:

```powershell
# 1. Make your code changes, then commit
git add .
git commit -m "Your update description"

# 2. Push to GitHub
git push

# 3. Deploy to Vercel
vercel deploy --prod
```

**That's it!** Your data files won't be touched because they're ignored by Git.

## 📝 What Gets Updated vs What Stays

### ✅ WILL Update (Safe to modify):
- Frontend code (`src/`)
- API endpoints (`api/`)
- Styles and components
- Configuration files
- Package dependencies

### ❌ WON'T Update (Protected):
- `server/data/users.json` - Your users stay safe
- `server/data/tasks.json` - Your tasks stay safe
- `server/data/campaigns.json` - Your campaigns stay safe

## 🆕 First Time Setup (New Environment)

If you clone the repo or set up a new environment:

```powershell
# Install dependencies
npm install

# Create data files from templates
npm run setup-data

# Start development
npm run dev
```

## 🔧 Manual Data File Creation

If needed, you can manually create the data files:

```powershell
# Copy templates to actual files
Copy-Item server/data/users.json.template server/data/users.json
Copy-Item server/data/tasks.json.template server/data/tasks.json
Copy-Item server/data/campaigns.json.template server/data/campaigns.json
```

## 💾 Backup Your Data

Before major updates, backup your data:

```powershell
# Create backups
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item server/data/users.json "server/data/users.json.$timestamp.backup"
Copy-Item server/data/tasks.json "server/data/tasks.json.$timestamp.backup"
Copy-Item server/data/campaigns.json "server/data/campaigns.json.$timestamp.backup"
```

## 🔍 Verify Protection

Check that data files are ignored:

```powershell
# This should show NO data/*.json files (except .template)
git status

# Verify .gitignore is working
git check-ignore server/data/users.json
# Should output: server/data/users.json
```

## ⚠️ Important: Vercel Behavior

**Local Development:**
- ✅ Data persists between restarts
- ✅ Changes save immediately
- ✅ Everything works as expected

**Vercel Production:**
- ⚠️ Data resets on cold starts (serverless limitation)
- ✅ Template files are deployed
- ✅ Data works during function lifetime
- 💡 Consider database for true persistence (see `DATABASE-MIGRATION.md`)

## 🎯 Quick Commands Reference

```powershell
# Setup new environment
npm install && npm run setup-data

# Deploy code changes only
git add . && git commit -m "Update" && git push && vercel deploy --prod

# Check what will be committed
git status

# Create backup
Copy-Item server/data/*.json server/data/backup/
```

## 📊 Example Workflow

```powershell
# Day 1: Add users via UI
# Users saved to server/data/users.json ✅

# Day 2: Update frontend code
git add src/
git commit -m "Updated dashboard UI"
git push
vercel deploy --prod
# ✅ Code updated, users.json unchanged

# Day 3: Add more features
git add .
git commit -m "Added new features"
git push  
vercel deploy --prod
# ✅ New features deployed, all data safe
```

## 🆘 Troubleshooting

### "I accidentally committed data files"

```powershell
# Remove from Git but keep local file
git rm --cached server/data/users.json
git commit -m "Remove data file from tracking"
git push
```

### "I want to restore template data"

```powershell
# Restore from template (⚠️ overwrites current data)
Copy-Item server/data/users.json.template server/data/users.json -Force
```

### "Data files are missing"

```powershell
# Recreate from templates
npm run setup-data
```

## ✨ Benefits of This Setup

1. ✅ **Safe Updates** - Code changes never affect data
2. ✅ **Version Control** - Track code, not data
3. ✅ **Clean Deployments** - Fresh templates for new instances
4. ✅ **Team Collaboration** - Each developer has their own data
5. ✅ **Easy Reset** - Templates provide clean starting point

---

**Your data is now protected!** Update your app confidently. 🎉
