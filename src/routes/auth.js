const router = require('express').Router();
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'changeme123';

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === PANEL_PASSWORD) {
    res.json({ success: true, token: PANEL_PASSWORD });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

module.exports = router;
