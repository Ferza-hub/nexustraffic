const cron = require('node-cron');
const { db } = require('./db');
const { runCampaign } = require('./traffic');

const activeCampaigns = new Set();

async function processPending() {
  const pending = db.prepare(`
    SELECT * FROM campaigns 
    WHERE status = 'running' 
    LIMIT 3
  `).all();

  for (const campaign of pending) {
    if (activeCampaigns.has(campaign.id)) continue;
    activeCampaigns.add(campaign.id);
    runCampaign(campaign.id).finally(() => {
      activeCampaigns.delete(campaign.id);
    });
  }
}

function startScheduler() {
  // Check every 30 seconds
  cron.schedule('*/30 * * * * *', processPending);
  console.log('✅ Scheduler started');
}

module.exports = { startScheduler };
