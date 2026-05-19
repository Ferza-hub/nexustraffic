const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'changeme123';

function authMiddleware(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;
  if (!token || token !== PANEL_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { authMiddleware };
