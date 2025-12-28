# 🔐 Security Configuration for Vercel Deployment

## Authentication System

### 2-Step Slack Verification
The application uses a secure 2-step authentication process:

1. **User Login**: Email and password submitted
2. **Cryptographic Hashing**: Credentials hashed with time-based security token
3. **Webhook Verification**: Secure request to n8n webhook with validation headers
4. **Slack Notification**: Rocky bot sends Slack DM for verification
5. **Authentication**: Webhook responds with user data if credentials are valid

### Data Sources
- **Users**: Fetched from n8n hosted database via secure webhook
- **Campaigns**: Fetched from n8n hosted database via secure webhook
- **Tasks**: Local JSON with campaign references

## Environment Variables Setup

### For Vercel Dashboard:

1. **Go to your Vercel project dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Add the following variables:**

#### LOGIN_WEBHOOK_URL
```
[Your n8n workflow webhook URL for login verification]
```

#### GET_USERS_WEBHOOK_URL
```
[Your n8n workflow webhook URL for fetching users]
```

#### GET_CAMPAIGNS_WEBHOOK_URL
```
[Your n8n workflow webhook URL for fetching campaigns]
```

#### CAMPAIGNS_DATA (Legacy - for fallback)
```json
[{"id":1,"name":"001_CCW","slackId":"C092ZBS0KEK"},{"id":2,"name":"002-CASH4HOMES","slackId":""},{"id":3,"name":"003-MVA","slackId":""},{"id":4,"name":"004_TRAVEL_RESORTS","slackId":"C09EQBS2BB3"},{"id":5,"name":"05-ASSESSMENTS","slackId":""},{"id":6,"name":"005-GLP1TELE","slackId":""},{"id":7,"name":"006-HELOC","slackId":""},{"id":8,"name":"007-HEA","slackId":""},{"id":9,"name":"008-HEARINGAIDS","slackId":""},{"id":10,"name":"009-WINDOWS","slackId":""},{"id":11,"name":"010-PARAQUAT","slackId":""},{"id":12,"name":"011_ROUNDUP","slackId":"C09DWN18SHM"},{"id":13,"name":"012_RIDESHARE","slackId":""},{"id":14,"name":"013-TALCUM","slackId":""},{"id":15,"name":"014-AFFF","slackId":""},{"id":16,"name":"015-HAIR","slackId":""},{"id":17,"name":"016-SICKLE-CELL","slackId":""},{"id":18,"name":"017-TEPEZZA","slackId":""},{"id":19,"name":"018-MARYLAND","slackId":""},{"id":20,"name":"019-LDS","slackId":""},{"id":21,"name":"020-DR-BROCK","slackId":""},{"id":22,"name":"021-ILLINOIS-CLERGY","slackId":""},{"id":23,"name":"022-ILLINOIS-JUVIE","slackId":""},{"id":24,"name":"023_SAN_DIEGO","slackId":"C09E95TS3DG"},{"id":25,"name":"024-WTC","slackId":""},{"id":26,"name":"025-DEPO","slackId":"C09E8DB0H45"},{"id":27,"name":"026_DR_LEE","slackId":"C09EF7KPB1S"},{"id":28,"name":"027-PFAS","slackId":""},{"id":29,"name":"028-SOCIAL-MEDIA","slackId":""},{"id":30,"name":"029-TEXAS-STORMS","slackId":""},{"id":31,"name":"030-SCHOOLS","slackId":""},{"id":32,"name":"031-ASBESTOS","slackId":""},{"id":33,"name":"032-ROBLOX","slackId":""},{"id":34,"name":"033-ANTIPSYCHOTICS","slackId":"C09DWSR1U87"},{"id":35,"name":"034-SAN-BERNARDINO","slackId":"C09E70C5C2X"},{"id":36,"name":"035-LA-WILDFIRES","slackId":""},{"id":37,"name":"036-PARAGUARD","slackId":""},{"id":38,"name":"037-OZEMPIC","slackId":""},{"id":39,"name":"038-VAGINAL-MESH","slackId":""},{"id":40,"name":"039_HERNIA_MESH","slackId":"C096B2MSP3R"},{"id":41,"name":"040_PROSTATE","slackId":"C098ZFHFV9P"},{"id":42,"name":"041_Risperdal","slackId":""},{"id":43,"name":"042_LIZBUYSHOMES","slackId":"C09B2M9TUD8"},{"id":44,"name":"043_TESTNOW","slackId":"C09BJBQ0FAQ"},{"id":45,"name":"044_NEWTEST","slackId":"C09CHK288E7"},{"id":46,"name":"045_CAWOMENSPRISON","slackId":"C09CNMUNK6E"},{"id":47,"name":"046_CAJDC","slackId":"C09EN7P8LHX"},{"id":48,"name":"047_SANDIEGOJUVIE","slackId":"C09E95TS3DG"},{"id":49,"name":"055_UNFAIR_DEPO","slackId":"C09FCCM5Z4G"},{"id":50,"name":"056_LA_JUVIE","slackId":"C09PJNE2449"},{"id":51,"name":"057_UNFAIR_MVA_ES","slackId":"C09TKPC9LHM"},{"id":52,"name":"058_POWERPORT","slackId":"C0A0D1BDDHP"},{"id":53,"name":"059_DUPIXENT","slackId":"C0A0LKDPD4Z"},{"id":54,"name":"060_DRMCGRAW","slackId":"C0A0BTA923U"}]
```

#### TASKS_DATA
```json
[{"id":1,"title":"Review Q1 Campaign Creative","description":"Review and approve creative assets for Q1 campaign","status":"pending","priority":"high","assigneeId":2,"campaignId":1,"dueDate":"2025-01-15","createdAt":"2025-01-01","updatedAt":"2025-01-01"},{"id":2,"title":"Update Landing Page Copy","description":"Revise landing page copy based on feedback","status":"in_progress","priority":"medium","assigneeId":3,"campaignId":2,"dueDate":"2025-01-20","createdAt":"2025-01-02","updatedAt":"2025-01-10"},{"id":3,"title":"Finalize Video Script","description":"Complete final version of promotional video script","status":"completed","priority":"high","assigneeId":1,"campaignId":1,"dueDate":"2025-01-10","createdAt":"2025-01-01","updatedAt":"2025-01-08"}]
```

### Environment Variable Configuration

1. **Variable Name:** `CAMPAIGNS_DATA`
   - **Value:** [Copy the JSON above]
   - **Environment:** Production, Preview, Development

2. **Variable Name:** `TASKS_DATA`
   - **Value:** [Copy the JSON above]  
   - **Environment:** Production, Preview, Development

3. **Variable Name:** `API_SECRET_KEY` (Optional)
   - **Value:** `your-secret-api-key-here`
   - **Environment:** Production, Preview

## Security Features

### ✅ What's Protected:
- ✅ Campaign data (names, Slack IDs)
- ✅ Task information
- ✅ Sensitive configuration data
- ✅ API keys and secrets

### ✅ How It's Protected:
- ✅ Data stored in Vercel environment variables (encrypted)
- ✅ `.env` file added to `.gitignore` 
- ✅ Server data directory excluded from Git
- ✅ No sensitive data in source code
- ✅ Environment-based data loading

### ✅ GitHub Security:
- ✅ No campaign data visible in repository
- ✅ No task data visible in repository  
- ✅ No API keys in source code
- ✅ Clean deployment without sensitive data exposure

## Local Development Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Add your data to `.env`:**
   - Copy campaign and task data from this file
   - Never commit `.env` to Git

3. **Start development:**
   ```bash
   npm run dev
   ```

## Deployment Checklist

### Before Deployment:
- [ ] Add `CAMPAIGNS_DATA` to Vercel environment variables
- [ ] Add `TASKS_DATA` to Vercel environment variables  
- [ ] Verify `.env` is in `.gitignore`
- [ ] Confirm no sensitive data in Git history

### After Deployment:
- [ ] Test `/api/campaigns` endpoint
- [ ] Test `/api/tasks` endpoint
- [ ] Verify data loading correctly
- [ ] Confirm no sensitive data visible in public repo

## Adding New Data

### To Add New Campaigns:
1. **Update Vercel environment variable `CAMPAIGNS_DATA`**
2. **Redeploy** (Vercel will use new data)

### To Add New Tasks:
1. **Update Vercel environment variable `TASKS_DATA`**
2. **Redeploy** (Vercel will use new data)

## Backup Strategy

### Regular Backups:
- Export data via API endpoints
- Store backups securely (encrypted)
- Document backup and restore procedures

### API Export Commands:
```bash
# Export campaigns
curl https://your-app.vercel.app/api/campaigns > campaigns-backup.json

# Export tasks  
curl https://your-app.vercel.app/api/tasks > tasks-backup.json
```

## Emergency Procedures

### If Data is Accidentally Exposed:
1. **Immediately rotate all Slack IDs**
2. **Update environment variables**
3. **Redeploy application**
4. **Review Git history for sensitive data**
5. **Consider repository cleanup if needed**

### If Environment Variables are Lost:
1. **Restore from backup files**
2. **Re-add to Vercel environment variables**
3. **Redeploy application**
4. **Verify data integrity**