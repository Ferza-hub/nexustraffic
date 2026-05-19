const router = require('express').Router();
const { db } = require('../services/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET all proxies
router.get('/', (req, res) => {
  const proxies = db.prepare('SELECT * FROM proxies ORDER BY id ASC').all();
  res.json(proxies);
});

// POST add proxy — format: host:port:user:pass atau host:port
router.post('/', (req, res) => {
  const { raw, geo = 'ID', isp = '' } = req.body;
  if (!raw) return res.status(400).json({ error: 'raw proxy string required' });

  const parts = raw.trim().split(':');
  if (parts.length < 2) return res.status(400).json({ error: 'Invalid format. Use host:port or host:port:user:pass' });

  const [host, port, username = null, password = null] = parts;

  db.prepare(`
    INSERT INTO proxies (host, port, username, password, geo, isp, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(host, parseInt(port), username, password, geo, isp);

  res.json({ success: true, message: 'Proxy added' });
});

// POST bulk add proxies
router.post('/bulk', (req, res) => {
  const { proxies, geo = 'ID' } = req.body;
  if (!Array.isArray(proxies)) return res.status(400).json({ error: 'proxies must be array' });

  const insert = db.prepare(`
    INSERT INTO proxies (host, port, username, password, geo, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  const insertMany = db.transaction((list) => {
    for (const raw of list) {
      const parts = raw.trim().split(':');
      if (parts.length < 2) continue;
      const [host, port, username = null, password = null] = parts;
      insert.run(host, parseInt(port), username, password, geo);
    }
  });

  insertMany(proxies);
  res.json({ success: true, added: proxies.length });
});

// POST test proxy
router.post('/:id/test', async (req, res) => {
  const proxy = db.prepare('SELECT * FROM proxies WHERE id = ?').get(req.params.id);
  if (!proxy) return res.status(404).json({ error: 'Not found' });

  try {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    const proxyUrl = proxy.username
      ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
      : `http://${proxy.host}:${proxy.port}`;

    const agent = new HttpsProxyAgent(proxyUrl);
    const start = Date.now();

    const r = await fetch('https://httpbin.org/ip', {
      agent,
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - start;
    const data = await r.json();

    db.prepare('UPDATE proxies SET status = ?, latency = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?')
      .run('active', latency, proxy.id);

    res.json({ success: true, ip: data.origin, latency });
  } catch (err) {
    db.prepare('UPDATE proxies SET status = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?')
      .run('error', proxy.id);
    res.json({ success: false, error: err.message });
  }
});

// DELETE proxy
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM proxies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PATCH toggle status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE proxies SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
