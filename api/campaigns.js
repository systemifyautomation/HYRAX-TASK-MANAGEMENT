// Campaign data - this would typically be in a database in production
let campaigns = [
  { "id": 1, "name": "001_CCW", "slackId": "C092ZBS0KEK" },
  { "id": 2, "name": "002-CASH4HOMES", "slackId": "" },
  { "id": 3, "name": "003-MVA", "slackId": "" },
  { "id": 4, "name": "004_TRAVEL_RESORTS", "slackId": "C09EQBS2BB3" },
  { "id": 5, "name": "05-ASSESSMENTS", "slackId": "" },
  { "id": 6, "name": "005-GLP1TELE", "slackId": "" },
  { "id": 7, "name": "006-HELOC", "slackId": "" },
  { "id": 8, "name": "007-HEA", "slackId": "" },
  { "id": 9, "name": "008-HEARINGAIDS", "slackId": "" },
  { "id": 10, "name": "009-WINDOWS", "slackId": "" },
  { "id": 11, "name": "010-PARAQUAT", "slackId": "" },
  { "id": 12, "name": "011_ROUNDUP", "slackId": "C09DWN18SHM" },
  { "id": 13, "name": "012_RIDESHARE", "slackId": "" },
  { "id": 14, "name": "013-TALCUM", "slackId": "" },
  { "id": 15, "name": "014-AFFF", "slackId": "" },
  { "id": 16, "name": "015-HAIR", "slackId": "" },
  { "id": 17, "name": "016-SICKLE-CELL", "slackId": "" },
  { "id": 18, "name": "017-TEPEZZA", "slackId": "" },
  { "id": 19, "name": "018-MARYLAND", "slackId": "" },
  { "id": 20, "name": "019-LDS", "slackId": "" },
  { "id": 21, "name": "020-DR-BROCK", "slackId": "" },
  { "id": 22, "name": "021-ILLINOIS-CLERGY", "slackId": "" },
  { "id": 23, "name": "022-ILLINOIS-JUVIE", "slackId": "" },
  { "id": 24, "name": "023_SAN_DIEGO", "slackId": "C09E95TS3DG" },
  { "id": 25, "name": "024-WTC", "slackId": "" },
  { "id": 26, "name": "025-DEPO", "slackId": "C09E8DB0H45" },
  { "id": 27, "name": "026_DR_LEE", "slackId": "C09EF7KPB1S" },
  { "id": 28, "name": "027-PFAS", "slackId": "" },
  { "id": 29, "name": "028-SOCIAL-MEDIA", "slackId": "" },
  { "id": 30, "name": "029-TEXAS-STORMS", "slackId": "" },
  { "id": 31, "name": "030-SCHOOLS", "slackId": "" },
  { "id": 32, "name": "031-ASBESTOS", "slackId": "" },
  { "id": 33, "name": "032-ROBLOX", "slackId": "" },
  { "id": 34, "name": "033-ANTIPSYCHOTICS", "slackId": "C09DWSR1U87" },
  { "id": 35, "name": "034-SAN-BERNARDINO", "slackId": "C09E70C5C2X" },
  { "id": 36, "name": "035-LA-WILDFIRES", "slackId": "" },
  { "id": 37, "name": "036-PARAGUARD", "slackId": "" },
  { "id": 38, "name": "037-OZEMPIC", "slackId": "" },
  { "id": 39, "name": "038-VAGINAL-MESH", "slackId": "" },
  { "id": 40, "name": "039_HERNIA_MESH", "slackId": "C096B2MSP3R" },
  { "id": 41, "name": "040_PROSTATE", "slackId": "C098ZFHFV9P" },
  { "id": 42, "name": "041_Risperdal", "slackId": "" },
  { "id": 43, "name": "042_LIZBUYSHOMES", "slackId": "C09B2M9TUD8" },
  { "id": 44, "name": "043_TESTNOW", "slackId": "C09BJBQ0FAQ" },
  { "id": 45, "name": "044_NEWTEST", "slackId": "C09CHK288E7" },
  { "id": 46, "name": "045_CAWOMENSPRISON", "slackId": "C09CNMUNK6E" },
  { "id": 47, "name": "046_CAJDC", "slackId": "C09EN7P8LHX" },
  { "id": 48, "name": "047_SANDIEGOJUVIE", "slackId": "C09E95TS3DG" },
  { "id": 49, "name": "055_UNFAIR_DEPO", "slackId": "C09FCCM5Z4G" },
  { "id": 50, "name": "056_LA_JUVIE", "slackId": "C09PJNE2449" },
  { "id": 51, "name": "057_UNFAIR_MVA_ES", "slackId": "C09TKPC9LHM" },
  { "id": 52, "name": "058_POWERPORT", "slackId": "C0A0D1BDDHP" },
  { "id": 53, "name": "059_DUPIXENT", "slackId": "C0A0LKDPD4Z" },
  { "id": 54, "name": "060_DRMCGRAW", "slackId": "C0A0BTA923U" }
];

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        if (id) {
          // Get single campaign
          const campaign = campaigns.find(c => c.id === parseInt(id));
          if (!campaign) {
            return res.status(404).json({
              success: false,
              error: 'Campaign not found'
            });
          }
          return res.json({
            success: true,
            data: campaign
          });
        } else {
          // Get all campaigns
          return res.json({
            success: true,
            data: campaigns,
            total: campaigns.length
          });
        }

      case 'POST':
        const { name, slackId } = req.body;
        
        if (!name) {
          return res.status(400).json({
            success: false,
            error: 'Campaign name is required'
          });
        }

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
        
        return res.status(201).json({
          success: true,
          data: newCampaign,
          message: 'Campaign created successfully'
        });

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Campaign ID is required'
          });
        }

        const campaignId = parseInt(id);
        const { name: updateName, slackId: updateSlackId } = req.body;
        
        if (!updateName) {
          return res.status(400).json({
            success: false,
            error: 'Campaign name is required'
          });
        }

        const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
        
        if (campaignIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Campaign not found'
          });
        }

        // Check if new name conflicts with existing campaigns (except current one)
        const nameConflict = campaigns.find(c => c.name === updateName && c.id !== campaignId);
        if (nameConflict) {
          return res.status(400).json({
            success: false,
            error: 'Campaign name already exists'
          });
        }

        // Update campaign
        campaigns[campaignIndex] = {
          ...campaigns[campaignIndex],
          name: updateName,
          slackId: updateSlackId || ''
        };

        return res.json({
          success: true,
          data: campaigns[campaignIndex],
          message: 'Campaign updated successfully'
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Campaign ID is required'
          });
        }

        const deleteId = parseInt(id);
        const deleteIndex = campaigns.findIndex(c => c.id === deleteId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Campaign not found'
          });
        }

        const deletedCampaign = campaigns.splice(deleteIndex, 1)[0];
        
        return res.json({
          success: true,
          data: deletedCampaign,
          message: 'Campaign deleted successfully'
        });

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Campaign API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}