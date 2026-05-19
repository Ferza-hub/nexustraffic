const { db } = require('./db');

// Real browser user agents
const USER_AGENTS = {
  desktop: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ],
  mobile: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  ],
  tablet: [
    'Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36',
  ]
};

// Traffic sources with realistic referers
const TRAFFIC_SOURCES = {
  organic: [
    { referer: 'https://www.google.com/', name: 'google' },
    { referer: 'https://www.google.co.id/', name: 'google_id' },
    { referer: 'https://www.bing.com/', name: 'bing' },
    { referer: 'https://search.yahoo.com/', name: 'yahoo' },
    { referer: 'https://duckduckgo.com/', name: 'duckduckgo' },
  ],
  social: [
    { referer: 'https://www.facebook.com/', name: 'facebook' },
    { referer: 'https://instagram.com/', name: 'instagram' },
    { referer: 'https://t.co/', name: 'twitter' },
    { referer: 'https://www.tiktok.com/', name: 'tiktok' },
    { referer: 'https://www.linkedin.com/', name: 'linkedin' },
  ],
  referral: [
    { referer: 'https://www.reddit.com/', name: 'reddit' },
    { referer: 'https://news.ycombinator.com/', name: 'hackernews' },
    { referer: 'https://medium.com/', name: 'medium' },
    { referer: 'https://www.quora.com/', name: 'quora' },
  ],
  direct: [
    { referer: '', name: 'direct' },
  ]
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getDevice(devicePref) {
  if (devicePref === 'desktop') return 'desktop';
  if (devicePref === 'mobile') return 'mobile';
  if (devicePref === 'tablet') return 'tablet';
  // mixed
  const r = Math.random();
  if (r < 0.55) return 'desktop';
  if (r < 0.85) return 'mobile';
  return 'tablet';
}

function buildHeaders(ua, referer, targetUrl) {
  const url = new URL(targetUrl);
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'cross-site' : 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    ...(referer && { 'Referer': referer }),
    'Host': url.hostname,
  };
}

async function sendVisit(campaign, proxy) {
  const { HttpsProxyAgent } = await import('https-proxy-agent');

  const device = getDevice(campaign.device);
  const ua = randomItem(USER_AGENTS[device]);
  const sources = TRAFFIC_SOURCES[campaign.traffic_source] || TRAFFIC_SOURCES.organic;
  const source = randomItem(sources);

  const proxyUrl = proxy.username
    ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
    : `http://${proxy.host}:${proxy.port}`;

  const agent = new HttpsProxyAgent(proxyUrl);
  const headers = buildHeaders(ua, source.referer, campaign.target_url);

  const duration = randomInt(campaign.min_duration, campaign.max_duration);
  const willBounce = Math.random() * 100 < campaign.bounce_rate;
  const pages = willBounce ? 1 : randomInt(1, campaign.pages_per_session);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(campaign.target_url, {
      method: 'GET',
      headers,
      agent,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok && res.status !== 304) {
      return { success: false, reason: `HTTP ${res.status}` };
    }

    // Simulate time on page
    await sleep(randomInt(duration * 400, duration * 600));

    return {
      success: true,
      duration,
      pages,
      device,
      source: source.name,
      ua,
      status: res.status,
    };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

async function runCampaign(campaignId) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) return;
  if (campaign.status !== 'running') return;

  const proxies = db.prepare("SELECT * FROM proxies WHERE status = 'active'").all();
  if (!proxies.length) {
    db.prepare("UPDATE campaigns SET status = 'failed' WHERE id = ?").run(campaignId);
    console.log(`❌ Campaign ${campaignId} — no active proxies`);
    return;
  }

  const remaining = campaign.visits_total - campaign.visits_sent;
  console.log(`🚀 Campaign ${campaignId} — sending ${remaining} visits`);

  // Concurrency limit to protect RAM (max 5 at once)
  const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '3');

  let i = 0;
  while (i < remaining) {
    // Check campaign still running
    const current = db.prepare('SELECT status, visits_sent FROM campaigns WHERE id = ?').get(campaignId);
    if (current.status !== 'running') break;

    const batch = [];
    const batchSize = Math.min(MAX_CONCURRENT, remaining - i);

    for (let j = 0; j < batchSize; j++) {
      const proxy = proxies[(i + j) % proxies.length];
      batch.push(sendVisit(campaign, proxy).then(result => ({ result, proxy })));
    }

    const results = await Promise.allSettled(batch);

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { result, proxy } = r.value;
        if (result.success) {
          db.prepare('UPDATE campaigns SET visits_sent = visits_sent + 1 WHERE id = ?').run(campaignId);
          db.prepare(`
            INSERT INTO visits (campaign_id, proxy_id, status, duration, pages, user_agent)
            VALUES (?, ?, 'sent', ?, ?, ?)
          `).run(campaignId, proxy.id, result.duration, result.pages, result.ua);
          console.log(`  ✓ Visit sent — ${result.device} | ${result.source} | ${result.duration}s | proxy ${proxy.id}`);
        } else {
          db.prepare(`
            INSERT INTO visits (campaign_id, proxy_id, status)
            VALUES (?, ?, 'failed')
          `).run(campaignId, proxy.id);
          console.log(`  ✗ Visit failed — ${result.reason}`);
        }
      }
    }

    i += batchSize;

    // Human-like delay between batches (2-8 seconds)
    await sleep(randomInt(2000, 8000));
  }

  // Mark complete
  const final = db.prepare('SELECT visits_sent, visits_total FROM campaigns WHERE id = ?').get(campaignId);
  const newStatus = final.visits_sent >= final.visits_total ? 'completed' : 'failed';
  db.prepare("UPDATE campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, campaignId);
  console.log(`✅ Campaign ${campaignId} ${newStatus} — ${final.visits_sent}/${final.visits_total} visits`);
}

module.exports = { runCampaign };
