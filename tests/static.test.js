const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('static bundle exposes the same profile and reading capabilities', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/local-engine.js'), 'utf8');
  const context = vm.createContext({ console, Date, Intl, setTimeout, clearTimeout });
  context.window = context;
  vm.runInContext(source, context, { filename: 'local-engine.js' });

  const user = {
    id: 'static-profile', name: '静态档案', gender: '女', birthDate: '1992-08-17', birthTime: '09:30',
    birthplaceDetail: { country: '中国', province: '浙江省', city: '杭州市', county: '', town: '', village: '' },
    focus: ['事业', '财富'], member: false
  };

  const bootstrap = await context.WendaoLocalApi.request('/api/bootstrap');
  assert.equal(bootstrap.storageMode, 'device');
  assert.equal(bootstrap.agents.length, 6);

  const profile = await context.WendaoLocalApi.request('/api/profile', {
    method: 'POST', body: JSON.stringify({ user })
  });
  assert.equal(profile.user.profile.bazi.length, 4);

  const result = await context.WendaoLocalApi.request('/api/reading', {
    method: 'POST', body: JSON.stringify({ user, agentId: 'career', question: '今年适合争取晋升吗？', history: [] })
  });
  assert.equal(result.reading.analysisPath.length, 3);
  assert.equal(result.reading.report.timeline.length, 4);
  assert.equal(result.reading.detailsLocked, true);
});
