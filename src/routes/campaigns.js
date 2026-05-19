const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../services/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET all campaigns
router.get('/', (req, res) => {
  const campaigns = db.prepare(`
    SELECT c.*, 
      ROUND(CAST(c.visits_sent AS FLOAT) / c.visits_total * 100, 1) as progress
    FROM campaigns c
    ORDER BY c.created_at DESC
  `).all();
  res.json(campaigns);
});

// GET single campaign
router.get('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  const visits = db.prepare('SELECT * FROM visits WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
  res.json({ ...campaign, recent_visits: visits });
});

// POST create campaign
router.post('/', (req, res) => {
  const {
    name, target_url, visits_total, geo = 'ID',
    device = 'mixed', traffic_source = 'organic',
    min_duration = 30, max_duration = 180,
    bounce_rate = 30, pages_per_session = 3
  } = req.body;

  if (!name || !target_url || !visits_total) {
    return res.status(400).json({ error: 'name, target_url, visits_total required' });
  }

  try { new URL(target_url); } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO campaigns (id, user_id, name, target_url, visits_total, geo, device, 
      traffic_source, min_duration, max_duration, bounce_rate, pages_per_session, status)
    VALUES (?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, name, target_url, visits_total, geo, device, traffic_source,
    min_duration, max_duration, bounce_rate, pages_per_session);

  res.json({ id, message: 'Campaign created' });
});

// PATCH start/pause/stop
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['running', 'paused', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// DELETE campaign
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM visits WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
