// Environment-based data injection for Vercel deployment
// This script runs before build to inject sensitive data

const fs = require('fs');
const path = require('path');

// Read campaigns data from local file if exists
const campaignsPath = path.join(__dirname, '../server/data/campaigns.json');
let campaignsData = [];

try {
  if (fs.existsSync(campaignsPath)) {
    campaignsData = JSON.parse(fs.readFileSync(campaignsPath, 'utf8'));
  }
} catch (error) {
  console.log('No campaigns.json found, using embedded data');
}

// Create environment variable for Vite
const envContent = `VITE_CAMPAIGNS_DATA=${JSON.stringify(campaignsData)}
VITE_USE_API=false
VITE_APP_TITLE=Hyrax Task Management
`;

// Write to .env.local for build
fs.writeFileSync(path.join(__dirname, '../.env.local'), envContent);

console.log('✅ Data injected for build');