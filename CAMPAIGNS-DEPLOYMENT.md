# 🔐 ADD CAMPAIGNS DATA TO VERCEL (WITHOUT GITHUB)

## ✅ **BEST SOLUTION: Environment Variables**

### Step 1: Copy Your campaigns.json Content
```bash
# From your local file
cat server/data/campaigns.json
```

### Step 2: Set Environment Variable in Vercel
1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `VITE_CAMPAIGNS_DATA`
   - **Value**: Paste your entire campaigns.json content as one line
   - **Environment**: Production

### Step 3: Deploy
```bash
git add .
git commit -m "Add environment data support"
git push
```

## 🔄 **ALTERNATIVE: Vercel Secrets (CLI)**

```bash
# Install Vercel CLI
npm i -g vercel

# Set secret from file
vercel env add VITE_CAMPAIGNS_DATA < server/data/campaigns.json

# Deploy
vercel --prod
```

## 📝 **WHAT HAPPENS:**

1. ✅ **Local Development**: Uses campaigns.json file
2. ✅ **Vercel Production**: Uses environment variable
3. ✅ **Fallback**: Uses embedded default data
4. ✅ **GitHub**: campaigns.json stays ignored

## 🎯 **YOUR DATA IS NOW:**

- ✅ **Hidden from GitHub** (via .gitignore)
- ✅ **Available in Vercel** (via environment)
- ✅ **Secure** (only in deployment environment)
- ✅ **Flexible** (can be updated without code changes)

Your campaigns data will be available in production without being exposed in your repository! 🎉