# Data Directory

This directory contains the JSON files that serve as the application's data store.

## Files

- `users.json` - User accounts and authentication data
- `tasks.json` - Task data
- `campaigns.json` - Campaign data

## Important Notes

⚠️ **These files are NOT tracked by Git** to prevent overwriting production data.

### For New Setup

If the `.json` files don't exist, run:

```bash
# On Windows (PowerShell)
Copy-Item server/data/*.json.template server/data/ -Force
Get-ChildItem server/data/*.json.template | ForEach-Object { Rename-Item $_.FullName $_.Name.Replace('.template', '') -Force }

# On Linux/Mac
cp server/data/*.json.template server/data/
rename 's/.json.template/.json/' server/data/*.json.template
```

Or use the setup script:
```bash
npm run setup-data
```

### Template Files

The `.template` files are tracked by Git and serve as starting points:
- `users.json.template` - Contains only the admin user
- `tasks.json.template` - Empty array
- `campaigns.json.template` - Empty array

### Deployment

On first deployment to Vercel, the API functions will:
1. Try to read from the `.json` files
2. If they don't exist, fall back to the `.template` files
3. Create the `.json` files automatically

### Backup

**Always backup your data files before major changes:**

```bash
# Create backups
Copy-Item server/data/users.json server/data/users.json.backup
Copy-Item server/data/tasks.json server/data/tasks.json.backup
Copy-Item server/data/campaigns.json server/data/campaigns.json.backup
```

### Updating the App

When you update the app code:

```bash
# 1. Stage all changes EXCEPT data files (they're already ignored)
git add .

# 2. Commit your changes
git commit -m "Your update message"

# 3. Deploy to Vercel
vercel deploy --prod
```

Your data files will remain untouched both locally and on Vercel (until cold start).

### Version Control

- ✅ `.template` files ARE tracked
- ❌ `.json` files are NOT tracked
- ✅ `.gitignore` excludes `server/data/*.json`
- ✅ Template files are included in deployments

This ensures:
- Code updates won't overwrite data
- New deployments start with clean templates
- Production data is protected
