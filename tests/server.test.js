const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { apiHandler, consumeReadingQuota } = require('../server');

function jsonRequest(method, body) {
  const request = new EventEmitter();
  request.method = method;
  request.headers = { host: 'example.com' };
  process.nextTick(() => {
    request.emit('data', JSON.stringify(body));
    request.emit('end');
  });
  return request;
}

function jsonResponse() {
  return {
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }
  };
}

test('bootstrap endpoint exposes agents but no server-side user archive', async () => {
  const request = { method: 'GET' };
  const response = {
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }
  };
  await apiHandler(request, response, new URL('http://localhost/api/bootstrap'));
  assert.equal(response.status, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.agents.length, 6);
  assert.deepEqual(payload.focusOptions, ['事业', '爱情', '健康', '社交', '官运', '考运', '财富', '情绪']);
  assert.equal(payload.storageMode, 'device');
  assert.equal(payload.users, undefined);
});

test('profile and reading endpoints calculate without a server-side user id', async () => {
  const user = {
    id: 'device-profile', name: '本机档案', gender: '未填写', birthDate: '1992-08-17', birthTime: '09:30',
    birthplaceDetail: { country: '中国', province: '浙江省', city: '杭州市', county: '', town: '', village: '' },
    focus: ['事业'], member: false
  };
  const profileResponse = jsonResponse();
  await apiHandler(jsonRequest('POST', { user }), profileResponse, new URL('http://example.com/api/profile'));
  assert.equal(profileResponse.status, 200);
  assert.equal(JSON.parse(profileResponse.body).user.profile.bazi.length, 4);

  const readingResponse = jsonResponse();
  await apiHandler(
    jsonRequest('POST', { user, agentId: 'career', question: '最近适合争取晋升吗？', history: [] }),
    readingResponse,
    new URL('http://example.com/api/reading')
  );
  const reading = JSON.parse(readingResponse.body).reading;
  assert.equal(reading.analysisPath.length, 3);
  assert.equal(reading.details.length, 4);
  assert.equal(reading.detailsLocked, true);
});

test('public reading endpoint applies a per-address request limit', () => {
  const address = `test-${Date.now()}`;
  const request = { headers: { 'x-forwarded-for': address } };
  for (let index = 0; index < 8; index += 1) assert.equal(consumeReadingQuota(request, index), true);
  assert.equal(consumeReadingQuota(request, 9), false);
  assert.equal(consumeReadingQuota(request, 600001), true);
});
