const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to campaigns data file
const campaignsFilePath = path.join(__dirname, 'data', 'campaigns.json');

// Helper function to read campaigns data
async function readCampaigns() {
  try {
    const data = await fs.readFile(campaignsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading campaigns:', error);
    return [];
  }
}

// Helper function to write campaigns data
async function writeCampaigns(campaigns) {
  try {
    await fs.writeFile(campaignsFilePath, JSON.stringify(campaigns, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing campaigns:', error);
    return false;
  }
}

// GET /api/campaigns - Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await readCampaigns();
    res.json({
      success: true,
      data: campaigns,
      total: campaigns.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
});

// GET /api/campaigns/:id - Get single campaign by ID
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaigns = await readCampaigns();
    const campaign = campaigns.find(c => c.id === parseInt(req.params.id));
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      message: error.message
    });
  }
});

// POST /api/campaigns - Add new campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, slackId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    const campaigns = await readCampaigns();
    
    // Check if campaign name already exists
    const existingCampaign = campaigns.find(c => c.name === name);
    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name already exists'
      });
    }

    // Generate new ID
    const newId = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1;
    
    const newCampaign = {
      id: newId,
      name,
      slackId: slackId || ''
    };

    campaigns.push(newCampaign);
    
    const writeSuccess = await writeCampaigns(campaigns);
    if (!writeSuccess) {
      throw new Error('Failed to save campaign');
    }

    res.status(201).json({
      success: true,
      data: newCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

// PUT /api/campaigns/:id - Update existing campaign
app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { name, slackId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    const campaigns = await readCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Check if new name conflicts with existing campaigns (except current one)
    const nameConflict = campaigns.find(c => c.name === name && c.id !== campaignId);
    if (nameConflict) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name already exists'
      });
    }

    // Update campaign
    campaigns[campaignIndex] = {
      ...campaigns[campaignIndex],
      name,
      slackId: slackId || ''
    };

    const writeSuccess = await writeCampaigns(campaigns);
    if (!writeSuccess) {
      throw new Error('Failed to save campaign');
    }

    res.json({
      success: true,
      data: campaigns[campaignIndex],
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaigns = await readCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const deletedCampaign = campaigns.splice(campaignIndex, 1)[0];
    
    const writeSuccess = await writeCampaigns(campaigns);
    if (!writeSuccess) {
      throw new Error('Failed to save changes');
    }

    res.json({
      success: true,
      data: deletedCampaign,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Campaign API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`Campaign API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Campaigns endpoint: http://localhost:${PORT}/api/campaigns`);
});

module.exports = app;