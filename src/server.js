require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDB } = require('./services/db');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/proxies', require('./routes/proxies'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/auth', require('./routes/auth'));

// Serve panel
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function main() {
  initDB();
  startScheduler();
  app.listen(PORT, () => {
    console.log(`✅ NexusTraffic running on http://localhost:${PORT}`);
  });
}

main();
