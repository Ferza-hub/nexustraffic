const { db } = require('./db');

// ─── USER AGENTS ───
const USER_AGENTS = {
  desktop: [
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', os: 'windows', browser: 'chrome', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', os: 'windows', browser: 'chrome', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', os: 'mac', browser: 'chrome', platform: '"macOS"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', os: 'windows', browser: 'firefox', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15', os: 'mac', browser: 'safari', platform: '"macOS"' },
    { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', os: 'linux', browser: 'chrome', platform: '"Linux"' },
  ],
  mobile: [
    { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1', os: 'ios', browser: 'safari', platform: '"iOS"' },
    { ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36', os: 'android', browser: 'chrome', platform: '"Android"' },
    { ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36', os: 'android', browser: 'chrome', platform: '"Android"' },
    { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1', os: 'ios', browser: 'chrome', platform: '"iOS"' },
  ],
};

// ─── GEO CONFIG ───
// Language & timezone per geo — sync dengan IP proxy
const GEO_CONFIG = {
  'ID': { lang: 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7', tz: 'Asia/Jakarta' },
  'US': { lang: 'en-US,en;q=0.9', tz: 'America/New_York' },
  'UK': { lang: 'en-GB,en;q=0.9', tz: 'Europe/London' },
  'GB': { lang: 'en-GB,en;q=0.9', tz: 'Europe/London' },
  'SG': { lang: 'en-SG,en;q=0.9', tz: 'Asia/Singapore' },
  'MY': { lang: 'ms-MY,ms;q=0.9,en-US;q=0.8', tz: 'Asia/Kuala_Lumpur' },
  'AU': { lang: 'en-AU,en;q=0.9', tz: 'Australia/Sydney' },
  'DEFAULT': { lang: 'en-US,en;q=0.9', tz: 'UTC' },
};

const TRAFFIC_SOURCES = {
  organic: [
    { referer: 'https://www.google.com/', source: 'google', medium: 'organic' },
    { referer: 'https://www.google.co.id/', source: 'google', medium: 'organic' },
    { referer: 'https://www.google.co.uk/', source: 'google', medium: 'organic' },
    { referer: 'https://www.bing.com/', source: 'bing', medium: 'organic' },
    { referer: 'https://duckduckgo.com/', source: 'duckduckgo', medium: 'organic' },
    { referer: 'https://search.yahoo.com/', source: 'yahoo', medium: 'organic' },
  ],
  social: [
    { referer: 'https://www.facebook.com/', source: 'facebook', medium: 'social' },
    { referer: 'https://l.instagram.com/', source: 'instagram', medium: 'social' },
    { referer: 'https://t.co/', source: 'twitter', medium: 'social' },
    { referer: 'https://www.tiktok.com/', source: 'tiktok', medium: 'social' },
  ],
  referral: [
    { referer: 'https://www.reddit.com/', source: 'reddit', medium: 'referral' },
    { referer: 'https://medium.com/', source: 'medium', medium: 'referral' },
    { referer: 'https://news.ycombinator.com/', source: 'hackernews', medium: 'referral' },
    { referer: 'https://www.quora.com/', source: 'quora', medium: 'referral' },
  ],
  direct: [
    { referer: '', source: 'direct', medium: 'none' },
  ],
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDevice(pref) {
  if (pref === 'desktop') return 'desktop';
  if (pref === 'mobile') return 'mobile';
  return Math.random() < 0.58 ? 'desktop' : 'mobile';
}

// ─── PERSISTENT CLIENT ID PER PROXY ───
function getOrCreateClientId(proxyId) {
  const key = `_clientid_proxy_${proxyId}`;
  try {
    const existing = db.prepare('SELECT pages FROM crawl_cache WHERE base_url = ?').get(key);
    if (existing) return existing.pages;
  } catch {}
  const clientId = `${rand(100000000, 999999999)}.${rand(1000000000, 9999999999)}`;
  try {
    db.prepare('INSERT OR REPLACE INTO crawl_cache (base_url, pages, crawled_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(key, clientId);
  } catch {}
  return clientId;
}

// ─── GA COOKIE PER PROXY ───
// _ga cookie injection — GA4 lihat ini sebagai browser yang sudah punya history
function getGaCookie(clientId) {
  return `_ga=GA1.1.${clientId}; _gid=GA1.2.${rand(100000000, 999999999)}.${Math.floor(Date.now() / 1000)}`;
}

// ─── CONSISTENT HEADERS ───
function buildHeaders(uaObj, referer, geoConfig, pageIndex) {
  const { ua, os, browser, platform } = uaObj;
  const isMobile = ['ios', 'android'].includes(os);

  const accepts = {
    chrome: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    firefox: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    safari: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const secChUa = browser === 'chrome'
    ? isMobile
      ? '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"'
      : '"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"'
    : null;

  return {
    'User-Agent': ua,
    'Accept': accepts[browser] || accepts.chrome,
    'Accept-Language': geoConfig.lang,
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': pageIndex === 0 && referer ? 'cross-site' : pageIndex === 0 ? 'none' : 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': pageIndex === 0 ? 'max-age=0' : 'no-cache',
    ...(referer && { 'Referer': referer }),
    ...(secChUa && {
      'Sec-CH-UA': secChUa,
      'Sec-CH-UA-Mobile': isMobile ? '?1' : '?0',
      'Sec-CH-UA-Platform': platform,
    }),
  };
}

// ─── CRAWLER ───
async function crawlWebsite(baseUrl, maxPages = 15) {
  try {
    const cached = db.prepare(
      'SELECT pages FROM crawl_cache WHERE base_url = ? AND crawled_at > datetime("now", "-24 hours")'
    ).get(baseUrl);
    if (cached) {
      const pages = JSON.parse(cached.pages);
      console.log(`  🕷️ Cache: ${pages.length} pages`);
      return pages;
    }
  } catch {}

  const found = new Set([baseUrl]);
  const toVisit = [baseUrl];
  const base = new URL(baseUrl);
  console.log(`  🕷️ Crawling ${baseUrl}...`);

  while (toVisit.length > 0 && found.size < maxPages) {
    const url = toVisit.shift();
    try {
      const uaObj = pick(USER_AGENTS.desktop);
      const res = await fetch(url, {
        headers: { 'User-Agent': uaObj.ua, 'Accept': 'text/html,*/*;q=0.8' },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const hrefs = [...html.matchAll(/href=["']([^"'#?]+)["']/g)].map(m => m[1]);
      for (const href of hrefs) {
        try {
          const full = new URL(href, baseUrl);
          if (
            full.hostname === base.hostname &&
            !found.has(full.href) &&
            !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|zip|woff|ttf)$/i) &&
            !href.includes('wp-admin') && !href.includes('wp-login')
          ) {
            found.add(full.href);
            toVisit.push(full.href);
          }
        } catch {}
      }
    } catch {}
    await sleep(rand(300, 800));
  }

  const pages = [...found].slice(0, maxPages);
  console.log(`  🕷️ Found ${pages.length} pages`);
  try {
    db.prepare('INSERT OR REPLACE INTO crawl_cache (base_url, pages, crawled_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(baseUrl, JSON.stringify(pages));
  } catch {}
  return pages;
}

// ─── BEHAVIOR ───
function estimatePageDuration(pageUrl) {
  const url = pageUrl.toLowerCase();
  const isArticle  = /blog|article|post|news|read|tutorial|guide|review/i.test(url);
  const isProduct  = /product|item|shop|store|buy|price/i.test(url);
  const isCategory = /category|tag|archive|search/i.test(url);
  let base;
  if (isArticle)       base = rand(120, 360);
  else if (isProduct)  base = rand(40, 120);
  else if (isCategory) base = rand(20, 55);
  else                 base = rand(30, 90);
  return base + rand(-Math.floor(base * 0.2), Math.floor(base * 0.2));
}

function buildBrowsingPath(pages, entryUrl, maxPages, bounceRate) {
  if (Math.random() * 100 < bounceRate) return [entryUrl];
  const path = [entryUrl];
  const pool = pages.filter(p => p !== entryUrl);
  for (let i = 1; i < maxPages && pool.length > 0; i++) {
    let section = '';
    try {
      const parts = new URL(path[path.length - 1]).pathname.split('/').filter(Boolean);
      if (parts.length > 1) section = '/' + parts[0];
    } catch {}
    const nearby = section ? pool.filter(p => { try { return new URL(p).pathname.startsWith(section); } catch { return false; } }) : [];
    const next = nearby.length > 0 && Math.random() < 0.6 ? pick(nearby) : pick(pool);
    path.push(next);
    pool.splice(pool.indexOf(next), 1);
    if (i > 1 && Math.random() < 0.2) break;
  }
  return path;
}

// ─── GOOGLE PRIMING ───
// Hit google.com/gen_204 — check-in ke ekosistem Google sebelum masuk target
async function doGooglePriming(agent, uaObj, geoConfig) {
  try {
    await fetch('https://www.google.com/gen_204', {
      agent,
      headers: {
        'User-Agent': uaObj.ua,
        'Accept-Language': geoConfig.lang,
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(5000),
    });
    console.log(`  🔥 Google priming OK`);
    await sleep(rand(1000, 3000));
  } catch {
    console.log(`  🔥 Google priming skipped`);
  }
}

// ─── GA4 MEASUREMENT PROTOCOL ───
async function sendGA4Hit(campaign, pageUrl, sessionData, proxy) {
  if (!campaign.ga4_measurement_id || !campaign.ga4_api_secret) return false;
  try {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    const proxyUrl = proxy.username
      ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
      : `http://${proxy.host}:${proxy.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    const payload = {
      client_id: sessionData.clientId,
      timestamp_micros: Date.now() * 1000,
      ip_override: proxy.host,
      events: [{
        name: 'page_view',
        params: {
          page_location: pageUrl,
          page_referrer: sessionData.referer || '',
          session_id: sessionData.sessionId,
          engagement_time_msec: sessionData.duration * 1000,
          session_source: sessionData.source.source,
          session_medium: sessionData.source.medium,
        },
      }],
    };

    const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${campaign.ga4_measurement_id}&api_secret=${campaign.ga4_api_secret}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      agent,
      signal: AbortSignal.timeout(10000),
    });

    const ok = res.status === 204;
    console.log(`  GA4: ${ok ? '✓' : `✗ HTTP ${res.status}`}`);
    return ok;
  } catch (err) {
    console.log(`  GA4: ✗ ${err.message}`);
    return false;
  }
}

// ─── CORE VISIT SENDER ───
async function sendVisit(campaign, proxy, sitePages) {
  const { HttpsProxyAgent } = await import('https-proxy-agent');

  const device    = getDevice(campaign.device);
  const uaObj     = pick(USER_AGENTS[device]);
  const sources   = TRAFFIC_SOURCES[campaign.traffic_source] || TRAFFIC_SOURCES.organic;
  const source    = pick(sources);
  const geoConfig = GEO_CONFIG[proxy.geo] || GEO_CONFIG.DEFAULT;

  const proxyUrl = proxy.username
    ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
    : `http://${proxy.host}:${proxy.port}`;
  const agent = new HttpsProxyAgent(proxyUrl);

  // Persistent identity per proxy
  const clientId  = getOrCreateClientId(proxy.id);
  const sessionId = String(Date.now());
  const gaCookie  = getGaCookie(clientId);
  const sessionData = { clientId, sessionId, source, referer: source.referer, duration: 0 };

  // Google priming — 50% chance
  if (Math.random() < 0.5) {
    await doGooglePriming(agent, uaObj, geoConfig);
  }

  const path = buildBrowsingPath(
    sitePages,
    campaign.target_url,
    campaign.pages_per_session,
    campaign.bounce_rate
  );

  let totalDuration = 0, pagesVisited = 0, ga4Hits = 0;

  for (let i = 0; i < path.length; i++) {
    const pageUrl = path[i];
    const pageDur = estimatePageDuration(pageUrl);
    const referer = i === 0 ? source.referer : path[i - 1];

    const headers = {
      ...buildHeaders(uaObj, referer, geoConfig, i),
      'Cookie': gaCookie,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(pageUrl, {
        headers, agent,
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (!res.ok && res.status !== 304) break;
      await res.text();

      pagesVisited++;
      totalDuration += pageDur;

      sessionData.duration = pageDur;
      const ga4ok = await sendGA4Hit(campaign, pageUrl, sessionData, proxy);
      if (ga4ok) ga4Hits++;

      const chunks = rand(3, 6);
      for (let c = 0; c < chunks; c++) {
        await sleep(Math.floor((pageDur * 1000) / chunks) + rand(-200, 200));
      }
      if (i < path.length - 1) await sleep(rand(600, 2200));
    } catch { break; }
  }

  if (pagesVisited === 0) return { success: false, reason: 'All pages failed' };
  return { success: true, duration: totalDuration, pages: pagesVisited, device, source: source.source, ua: uaObj.ua, ga4Hits };
}

// ─── CAMPAIGN RUNNER ───
async function runCampaign(campaignId) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign || campaign.status !== 'running') return;

  const proxies = db.prepare("SELECT * FROM proxies WHERE status = 'active'").all();
  if (!proxies.length) {
    db.prepare("UPDATE campaigns SET status = 'failed' WHERE id = ?").run(campaignId);
    console.log(`❌ No active proxies`);
    return;
  }

  console.log(`\n🚀 "${campaign.name}"`);
  console.log(`   Target  : ${campaign.target_url}`);
  console.log(`   Proxies : ${proxies.length} active`);
  console.log(`   GA4     : ${campaign.ga4_measurement_id || 'not configured'}`);

  const sitePages = await crawlWebsite(campaign.target_url, 15);
  const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '4');
  const remaining = campaign.visits_total - campaign.visits_sent;
  let i = 0;

  while (i < remaining) {
    const current = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaignId);
    if (current.status !== 'running') { console.log(`  ⏸ ${current.status}`); break; }

    const batchSize = Math.min(MAX_CONCURRENT, remaining - i);
    const batch = [];
    for (let j = 0; j < batchSize; j++) {
      const proxy = proxies[(i + j) % proxies.length];
      batch.push(sendVisit(campaign, proxy, sitePages).then(r => ({ r, proxy })));
    }

    const settled = await Promise.allSettled(batch);
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      const { r, proxy } = s.value;
      if (r.success) {
        db.prepare('UPDATE campaigns SET visits_sent = visits_sent + 1 WHERE id = ?').run(campaignId);
        db.prepare(`INSERT INTO visits (campaign_id, proxy_id, status, duration, pages, user_agent) VALUES (?, ?, 'sent', ?, ?, ?)`)
          .run(campaignId, proxy.id, r.duration, r.pages, r.ua);
        console.log(`  ✓ ${r.device} | ${r.source} | ${r.pages}p | ${r.duration}s | GA4:${r.ga4Hits > 0 ? '✓' : '—'} | proxy#${proxy.id} [${proxy.geo}]`);
      } else {
        db.prepare(`INSERT INTO visits (campaign_id, proxy_id, status) VALUES (?, ?, 'failed')`).run(campaignId, proxy.id);
        console.log(`  ✗ ${r.reason}`);
      }
    }

    i += batchSize;
    await sleep(rand(3000, 10000));
  }

  const final = db.prepare('SELECT visits_sent, visits_total FROM campaigns WHERE id = ?').get(campaignId);
  const newStatus = final.visits_sent >= final.visits_total ? 'completed' : 'failed';
  db.prepare("UPDATE campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, campaignId);
  console.log(`\n✅ "${campaign.name}" ${newStatus} — ${final.visits_sent}/${final.visits_total}\n`);
}

module.exports = { runCampaign, crawlWebsite };
    { referer: 'https://medium.com/', source: 'medium', medium: 'referral' },
    { referer: 'https://news.ycombinator.com/', source: 'hackernews', medium: 'referral' },
    { referer: 'https://www.quora.com/', source: 'quora', medium: 'referral' },
  ],
  direct: [
    { referer: '', source: 'direct', medium: 'none' },
  ],
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDevice(pref) {
  if (pref === 'desktop') return 'desktop';
  if (pref === 'mobile') return 'mobile';
  return Math.random() < 0.58 ? 'desktop' : 'mobile';
}

// ─── 1. WEBSITE CRAWLER ───
// Finds all internal pages for natural multi-page browsing simulation
async function crawlWebsite(baseUrl, maxPages = 20) {
  // Check cache first (valid for 24h)
  try {
    const cached = db.prepare(
      'SELECT pages FROM crawl_cache WHERE base_url = ? AND crawled_at > datetime("now", "-24 hours")'
    ).get(baseUrl);
    if (cached) {
      const pages = JSON.parse(cached.pages);
      console.log(`  🕷️ Using cached ${pages.length} pages`);
      return pages;
    }
  } catch {}

  const found = new Set([baseUrl]);
  const toVisit = [baseUrl];
  const base = new URL(baseUrl);

  console.log(`  🕷️ Crawling ${baseUrl}...`);

  while (toVisit.length > 0 && found.size < maxPages) {
    const url = toVisit.shift();
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': pick(USER_AGENTS.desktop),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });

      if (!res.ok) continue;
      const html = await res.text();

      // Extract internal links
      const hrefs = [...html.matchAll(/href=["']([^"'#?]+)["']/g)].map(m => m[1]);
      for (const href of hrefs) {
        try {
          const full = new URL(href, baseUrl);
          if (
            full.hostname === base.hostname &&
            !found.has(full.href) &&
            !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|zip|woff|ttf)$/i) &&
            !href.includes('wp-admin') &&
            !href.includes('wp-login') &&
            !href.includes('feed') &&
            !href.includes('xmlrpc')
          ) {
            found.add(full.href);
            toVisit.push(full.href);
          }
        } catch {}
      }
    } catch {}

    await sleep(rand(300, 800)); // polite crawl delay
  }

  const pages = [...found].slice(0, maxPages);
  console.log(`  🕷️ Found ${pages.length} pages`);

  // Save to cache
  try {
    db.prepare(
      'INSERT OR REPLACE INTO crawl_cache (base_url, pages, crawled_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).run(baseUrl, JSON.stringify(pages));
  } catch {}

  return pages;
}

// ─── 2. BEHAVIOR SIMULATION ───
// Estimate realistic time-on-page based on URL type
function estimatePageDuration(pageUrl) {
  const url = pageUrl.toLowerCase();
  const isArticle  = /blog|article|post|news|read|tutorial|guide|review/i.test(url);
  const isProduct  = /product|item|shop|store|buy|price|detail/i.test(url);
  const isCategory = /category|tag|archive|collection|search/i.test(url);
  const isContact  = /contact|about|faq|help|support/i.test(url);
  const isHome     = url.split('/').filter(Boolean).length <= 1;

  let base;
  if (isArticle)       base = rand(90, 280);   // Articles: 1.5–4.5 min read
  else if (isProduct)  base = rand(40, 120);   // Products: browsing + reading
  else if (isCategory) base = rand(20, 55);    // Category: quick scan
  else if (isContact)  base = rand(15, 40);    // Contact/About: quick look
  else if (isHome)     base = rand(25, 70);    // Homepage: exploring
  else                 base = rand(20, 80);    // Default

  // Natural variance ±25%
  const jitter = Math.floor(base * 0.25);
  return base + rand(-jitter, jitter);
}

// Build a natural browsing path through the website
function buildBrowsingPath(pages, entryUrl, maxPages, bounceRate) {
  // Bounce — user leaves after 1 page
  if (Math.random() * 100 < bounceRate) return [entryUrl];

  const path = [entryUrl];
  const pool = pages.filter(p => p !== entryUrl);

  for (let i = 1; i < maxPages && pool.length > 0; i++) {
    const current = path[path.length - 1];

    // Prefer pages in same section (same path prefix)
    let currentSection = '';
    try {
      const parts = new URL(current).pathname.split('/').filter(Boolean);
      if (parts.length > 1) currentSection = '/' + parts[0];
    } catch {}

    const nearby = currentSection
      ? pool.filter(p => { try { return new URL(p).pathname.startsWith(currentSection); } catch { return false; } })
      : [];

    // 60% chance to stay in same section if pages available
    const next = nearby.length > 0 && Math.random() < 0.6 ? pick(nearby) : pick(pool);

    path.push(next);
    pool.splice(pool.indexOf(next), 1);

    // Random early exit (user gets bored)
    if (i > 1 && Math.random() < 0.2) break;
  }

  return path;
}

// ─── 3. CORE VISIT SENDER ───
async function sendVisit(campaign, proxy, sitePages) {
  const { HttpsProxyAgent } = await import('https-proxy-agent');

  const device  = getDevice(campaign.device);
  const ua      = pick(USER_AGENTS[device]);
  const sources = TRAFFIC_SOURCES[campaign.traffic_source] || TRAFFIC_SOURCES.organic;
  const source  = pick(sources);

  const proxyUrl = proxy.username
    ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
    : `http://${proxy.host}:${proxy.port}`;
  const agent = new HttpsProxyAgent(proxyUrl);

  // Build natural browsing path
  const path = buildBrowsingPath(
    sitePages,
    campaign.target_url,
    campaign.pages_per_session,
    campaign.bounce_rate
  );

  let totalDuration = 0;
  let pagesVisited  = 0;

  for (let i = 0; i < path.length; i++) {
    const pageUrl     = path[i];
    const pageDur     = estimatePageDuration(pageUrl);
    const referer     = i === 0 ? source.referer : path[i - 1];
    const isCrossSite = i === 0 && !!referer;

    const headers = {
      'User-Agent'               : ua,
      'Accept'                   : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language'          : 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding'          : 'gzip, deflate, br',
      'Connection'               : 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest'           : 'document',
      'Sec-Fetch-Mode'           : 'navigate',
      'Sec-Fetch-Site'           : isCrossSite ? 'cross-site' : i === 0 ? 'none' : 'same-origin',
      'Sec-Fetch-User'           : '?1',
      'Cache-Control'            : i === 0 ? 'max-age=0' : 'no-cache',
      ...(referer && { 'Referer': referer }),
    };

    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(pageUrl, {
        headers,
        agent,
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok && res.status !== 304) break;
      await res.text(); // consume body fully

      pagesVisited++;
      totalDuration += pageDur;

      // Simulate time reading/scrolling the page
      // Split into micro-sleeps so it feels more natural
      const chunks = rand(3, 6);
      for (let c = 0; c < chunks; c++) {
        await sleep(Math.floor((pageDur * 1000) / chunks) + rand(-200, 200));
      }

      // Between-page pause (clicking a link)
      if (i < path.length - 1) await sleep(rand(600, 2200));

    } catch (err) {
      // Page failed, stop this session
      break;
    }
  }

  if (pagesVisited === 0) return { success: false, reason: 'All pages failed' };

  return {
    success : true,
    duration: totalDuration,
    pages   : pagesVisited,
    device,
    source  : source.source,
    ua,
  };
}

// ─── 4. CAMPAIGN RUNNER ───
async function runCampaign(campaignId) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign || campaign.status !== 'running') return;

  const proxies = db.prepare("SELECT * FROM proxies WHERE status = 'active'").all();
  if (!proxies.length) {
    db.prepare("UPDATE campaigns SET status = 'failed' WHERE id = ?").run(campaignId);
    console.log(`❌ Campaign ${campaignId} — no active proxies`);
    return;
  }

  console.log(`\n🚀 Campaign "${campaign.name}"`);
  console.log(`   Target  : ${campaign.target_url}`);
  console.log(`   Proxies : ${proxies.length} active`);

  // Crawl website pages for natural browsing simulation
  const sitePages = await crawlWebsite(campaign.target_url, 15);

  const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '3');
  const remaining      = campaign.visits_total - campaign.visits_sent;
  let i = 0;

  while (i < remaining) {
    // Re-check campaign status (might have been paused/cancelled)
    const current = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaignId);
    if (current.status !== 'running') {
      console.log(`  ⏸ Campaign ${current.status}, stopping worker`);
      break;
    }

    const batchSize = Math.min(MAX_CONCURRENT, remaining - i);
    const batch = [];

    for (let j = 0; j < batchSize; j++) {
      const proxy = proxies[(i + j) % proxies.length];
      batch.push(sendVisit(campaign, proxy, sitePages).then(r => ({ r, proxy })));
    }

    const settled = await Promise.allSettled(batch);

    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      const { r, proxy } = s.value;

      if (r.success) {
        db.prepare('UPDATE campaigns SET visits_sent = visits_sent + 1 WHERE id = ?').run(campaignId);
        db.prepare(`
          INSERT INTO visits (campaign_id, proxy_id, status, duration, pages, user_agent)
          VALUES (?, ?, 'sent', ?, ?, ?)
        `).run(campaignId, proxy.id, r.duration, r.pages, r.ua);
        console.log(`  ✓ ${r.device} | ${r.source} | ${r.pages}p | ${r.duration}s | proxy#${proxy.id}`);
      } else {
        db.prepare(`INSERT INTO visits (campaign_id, proxy_id, status) VALUES (?, ?, 'failed')`).run(campaignId, proxy.id);
        console.log(`  ✗ ${r.reason}`);
      }
    }

    i += batchSize;

    // Human-like batch delay: 3–12 seconds
    const delay = rand(3000, 12000);
    await sleep(delay);
  }

  const final     = db.prepare('SELECT visits_sent, visits_total FROM campaigns WHERE id = ?').get(campaignId);
  const newStatus = final.visits_sent >= final.visits_total ? 'completed' : 'failed';
  db.prepare("UPDATE campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, campaignId);
  console.log(`\n✅ "${campaign.name}" ${newStatus} — ${final.visits_sent}/${final.visits_total} visits\n`);
}

module.exports = { runCampaign, crawlWebsite };
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
  if (!campaign || campaign.status !== 'running') return;

  const proxies = db.prepare("SELECT * FROM proxies WHERE status = 'active'").all();
  if (!proxies.length) {
    db.prepare("UPDATE campaigns SET status = 'failed' WHERE id = ?").run(campaignId);
    console.log(`❌ Campaign ${campaignId} — no active proxies`);
    return;
  }

  const remaining = campaign.visits_total - campaign.visits_sent;
  console.log(`🚀 Campaign ${campaignId} — sending ${remaining} visits`);

  const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '3');

  let i = 0;
  while (i < remaining) {
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
          console.log(`  ✓ Visit sent — ${result.device} | ${result.source} | ${result.duration}s`);
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
    await sleep(randomInt(2000, 8000));
  }

  const final = db.prepare('SELECT visits_sent, visits_total FROM campaigns WHERE id = ?').get(campaignId);
  const newStatus = final.visits_sent >= final.visits_total ? 'completed' : 'failed';
  db.prepare("UPDATE campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, campaignId);
  console.log(`✅ Campaign ${campaignId} ${newStatus}`);
}

module.exports = { runCampaign };
