const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readStore } = require('./lib/store');
const { AGENTS, calculateProfile, buildLocalReading, buildOverviewReadings, buildDailyReading, generateAiReading } = require('./lib/fortune');
const { FOCUS_OPTIONS, birthplaceLabel, normalizeBirthplaceDetail, sanitizeFocus } = require('./lib/profile');

const PORT = Number(process.argv[2] || process.env.PORT) || 4173;
const PUBLIC_DIR = path.join(__dirname, 'public');
const READING_LIMIT_WINDOW_MS = Number(process.env.READING_LIMIT_WINDOW_MS) || 10 * 60 * 1000;
const READING_LIMIT_MAX = Number(process.env.READING_LIMIT_MAX) || 8;
const readingAttempts = new Map();

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error('请求内容过大'));
    });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON 格式无效')); }
    });
    request.on('error', reject);
  });
}

function normalizeUser(body = {}) {
  if (!body.name || !body.birthDate || !body.birthTime) {
    throw Object.assign(new Error('请完整填写姓名、出生日期和时间'), { status: 400 });
  }
  const birthplaceDetail = normalizeBirthplaceDetail(body.birthplaceDetail, body.birthplace);
  if (!birthplaceDetail.country || !birthplaceDetail.province || !birthplaceDetail.city) {
    throw Object.assign(new Error('请至少填写出生国家、省份和城市'), { status: 400 });
  }
  const user = {
    id: String(body.id || `profile-${crypto.randomUUID().slice(0, 8)}`).slice(0, 80),
    name: String(body.name).trim().slice(0, 20),
    gender: String(body.gender || '未填写').slice(0, 10),
    birthDate: String(body.birthDate).slice(0, 10),
    birthTime: String(body.birthTime).slice(0, 5),
    birthplace: birthplaceLabel(birthplaceDetail),
    birthplaceDetail,
    focus: sanitizeFocus(body.focus),
    member: Boolean(body.member),
    createdAt: body.createdAt || new Date().toISOString()
  };
  calculateProfile(user);
  return user;
}

function publicUser(user) {
  const normalized = normalizeUser(user);
  return { ...normalized, profile: calculateProfile(normalized) };
}

function isLoopbackRequest(request) {
  const host = String(request.headers?.host || '').toLowerCase();
  return !process.env.PUBLIC_APP && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
}

function requestAddress(request) {
  return String(request.headers?.['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 80);
}

function consumeReadingQuota(request, now = Date.now()) {
  const key = requestAddress(request);
  const active = (readingAttempts.get(key) || []).filter((time) => now - time < READING_LIMIT_WINDOW_MS);
  if (active.length >= READING_LIMIT_MAX) return false;
  active.push(now);
  readingAttempts.set(key, active);
  if (readingAttempts.size > 1000) {
    for (const [address, attempts] of readingAttempts) {
      if (!attempts.some((time) => now - time < READING_LIMIT_WINDOW_MS)) readingAttempts.delete(address);
    }
  }
  return true;
}

async function apiHandler(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(response, 200, { ok: true, service: 'wendao', storageMode: 'device' });
  }

  if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
    return sendJson(response, 200, {
      agents: Object.values(AGENTS),
      focusOptions: FOCUS_OPTIONS,
      aiConnected: Boolean(process.env.AI_API_KEY && process.env.AI_API_URL && process.env.AI_MODEL),
      storageMode: 'device'
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/legacy-export') {
    if (!isLoopbackRequest(request)) return sendJson(response, 404, { error: '接口不存在' });
    const store = readStore();
    return sendJson(response, 200, {
      users: store.users.map(publicUser),
      conversations: store.conversations,
      dailyReadings: store.dailyReadings
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/profile') {
    const body = await parseBody(request);
    return sendJson(response, 200, { user: publicUser(body.user || body) });
  }

  if (request.method === 'POST' && url.pathname === '/api/overview') {
    const body = await parseBody(request);
    const user = normalizeUser(body.user);
    return sendJson(response, 200, { summaries: buildOverviewReadings(user, body.historyByAgent || {}) });
  }

  if (request.method === 'POST' && url.pathname === '/api/reading') {
    if (!consumeReadingQuota(request)) return sendJson(response, 429, { error: '测算请求过于频繁，请稍后再试' });
    const body = await parseBody(request);
    const user = normalizeUser(body.user);
    const agent = AGENTS[body.agentId];
    if (!agent || body.agentId === 'daily') return sendJson(response, 400, { error: 'Agent 类型无效' });
    const question = String(body.question || '').trim().slice(0, 500);
    if (!question) return sendJson(response, 400, { error: '请输入想测算的问题' });
    const history = Array.isArray(body.history) ? body.history.slice(-40) : [];
    const localReading = buildLocalReading(user, body.agentId, question, history);
    const reading = await generateAiReading({ user, agentId: body.agentId, question, history, fallback: localReading });
    const result = { ...reading, detailsLocked: !user.member };
    return sendJson(response, 200, { reading: result });
  }

  if (request.method === 'POST' && url.pathname === '/api/daily') {
    const body = await parseBody(request);
    const user = normalizeUser(body.user);
    const history = Array.isArray(body.history) ? body.history.slice(-30) : [];
    return sendJson(response, 200, { reading: buildDailyReading(user, history) });
  }

  if (request.method === 'POST' && url.pathname === '/api/unlock') {
    const body = await parseBody(request);
    const user = normalizeUser({ ...body.user, member: true });
    return sendJson(response, 200, { user: publicUser(user) });
  }

  return sendJson(response, 404, { error: '接口不存在' });
}

function staticHandler(response, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(response, 403, { error: '禁止访问' });
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (!path.extname(relative)) return staticHandler(response, '/');
      return sendJson(response, 404, { error: '文件不存在' });
    }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await apiHandler(request, response, url);
    return staticHandler(response, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(response, error.status || 500, { error: error.message || '服务暂时不可用' });
  }
});

if (require.main === module) {
  server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
    console.log(`问道已启动：http://localhost:${PORT}`);
  });
}

module.exports = server;
module.exports.server = server;
module.exports.apiHandler = apiHandler;
module.exports.consumeReadingQuota = consumeReadingQuota;
