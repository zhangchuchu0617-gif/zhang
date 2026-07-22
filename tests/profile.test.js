const test = require('node:test');
const assert = require('node:assert/strict');
const { birthplaceLabel, inferLegacyBirthplace, normalizeBirthplaceDetail, sanitizeFocus } = require('../lib/profile');

test('migrates a known legacy birthplace into six structured levels', () => {
  const detail = inferLegacyBirthplace('绍兴新昌儒岙');
  assert.deepEqual(detail, {
    country: '中国', province: '浙江省', city: '绍兴市', county: '新昌县', town: '儒岙镇', village: ''
  });
  assert.equal(birthplaceLabel(detail), '中国 · 浙江省 · 绍兴市 · 新昌县 · 儒岙镇');
});

test('normalizes structured birthplace values without losing optional village data', () => {
  const detail = normalizeBirthplaceDetail({
    country: ' 中国 ', province: '浙江省', city: '绍兴市', county: '新昌县', town: '儒岙镇', village: '南山村'
  });
  assert.equal(detail.country, '中国');
  assert.equal(detail.village, '南山村');
});

test('maps legacy focus labels and keeps unique custom tags', () => {
  assert.deepEqual(
    sanitizeFocus(['事业成长', '爱情', '个人选择', '爱情', '自我探索']),
    ['事业', '爱情', '个人选择', '自我探索']
  );
});
