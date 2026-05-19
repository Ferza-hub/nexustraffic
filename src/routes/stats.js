const router = require('express').Router();
const { db } = require('../services/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const totalCampaigns = db.prepare('SELECT COUNT(*) as c FROM campaigns').get().c;
  const activeCampaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE status = 'running'").get().c;
  const totalVisits = db.prepare("SELECT SUM(visits_sent) as c FROM campaigns").get().c || 0;
  const successVisits = db.prepare("SELECT COUNT(*) as c FROM visits WHERE status = 'sent'").get().c;
  const failedVisits = db.prepare("SELECT COUNT(*) as c FROM visits WHERE status = 'failed'").get().c;
  const activeProxies = db.prepare("SELECT COUNT(*) as c FROM proxies WHERE status = 'active'").get().c;

  const recentVisits = db.prepare(`
    SELECT v.*, c.name as campaign_name, p.host as proxy_host, p.geo
    FROM visits v
    LEFT JOIN campaigns c ON v.campaign_id = c.id
    LEFT JOIN proxies p ON v.proxy_id = p.id
    ORDER BY v.created_at DESC LIMIT 20
  `).all();

  const visitsByDay = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM visits
    WHERE created_at >= DATE('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `).all();

  const campaignStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM campaigns GROUP BY status
  `).all();

  res.json({
    overview: { totalCampaigns, activeCampaigns, totalVisits, successVisits, failedVisits, activeProxies },
    successRate: totalVisits > 0 ? ((successVisits / (successVisits + failedVisits)) * 100).toFixed(1) : 0,
    recentVisits,
    visitsByDay,
    campaignStats,
  });
});

module.exports = router;
