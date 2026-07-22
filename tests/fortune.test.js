const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateProfile, buildLocalReading, buildOverviewReadings, buildDailyReading } = require('../lib/fortune');

const user = {
  id: 'test-user',
  name: '林默',
  gender: '女',
  birthDate: '1992-08-17',
  birthTime: '09:30',
  birthplace: '杭州'
};

const fixedDate = new Date('2026-07-22T04:00:00.000Z');

test('calculates a reproducible BaZi profile from birth data', () => {
  const profile = calculateProfile(user, fixedDate);
  assert.equal(profile.baziText, '壬申 戊申 乙丑 辛巳');
  assert.equal(profile.zodiac, '狮子座');
  assert.equal(profile.animal, '猴');
  assert.equal(profile.dayMaster, '乙');
  assert.deepEqual(profile.wuXing, { 木: 1, 火: 1, 土: 2, 金: 3, 水: 1 });
  assert.ok(profile.today.relation.name);
  assert.ok(profile.dominantElement);
  assert.equal(profile.tenGods.stems.length, 4);
  assert.ok(profile.strength.explanation.includes('月支五倍'));
  assert.equal(profile.yearlyOutlook.length, 4);
});

test('keeps agent readings deterministic for the same context', () => {
  const first = buildLocalReading(user, 'career', '适合争取晋升吗？', [], fixedDate);
  const second = buildLocalReading(user, 'career', '适合争取晋升吗？', [], fixedDate);
  assert.deepEqual(first, second);
  assert.equal(first.details.length, 4);
  assert.equal(first.analysisPath.length, 3);
  assert.match(first.details[0].body, /命盘|日主/);
  assert.ok(first.score >= 58 && first.score <= 94);
  assert.equal(first.report.timeline.length, 4);
  assert.ok(first.report.comparisons.length >= 2);
  assert.ok(first.report.triggers.length >= 3);
});

test('builds a traceable multi-year career report for a project and job-change question', () => {
  const profileUser = {
    id: 'zhang', name: '张楚楚', gender: '女', birthDate: '1990-06-17', birthTime: '00:40', birthplace: '中国'
  };
  const reading = buildLocalReading(profileUser, 'career', '如果新项目做成了，我还要跳槽吗？', [], fixedDate);
  assert.equal(reading.chart.baziText, '庚午 壬午 癸丑 壬子');
  assert.equal(reading.chart.strength.label, '偏弱');
  assert.deepEqual(reading.chart.strength.balancingElements, ['金', '水']);
  assert.deepEqual(reading.chart.tenGods.stems, ['正印', '劫财', '日主', '劫财']);
  assert.deepEqual(reading.chart.currentLuck, {
    pillar: '戊寅', startYear: 2024, endYear: 2033, stemTenGod: '正官', startDate: '1994-01-17'
  });
  assert.deepEqual(reading.chart.yearlyOutlook.map((item) => `${item.year}${item.pillar}${item.stemTenGod}`), [
    '2026丙午正财', '2027丁未偏财', '2028戊申正官', '2029己酉七杀'
  ]);
  assert.match(reading.brief, /2026年、2027年/);
  assert.match(reading.brief, /2028年、2029年/);
  assert.match(reading.report.verdict.body, /职级、汇报线、资源调配权和回报约定/);
  assert.match(reading.report.conclusion.body, /不要在成果尚未成为你的筹码前离场/);
  assert.ok(JSON.stringify(reading.report).length > 1800);
  assert.doesNotMatch(JSON.stringify(reading), /ENTJ/);
});

test('keeps strength language transparent instead of claiming an unverified full favorable-element verdict', () => {
  const reading = buildLocalReading(user, 'career', '接下来怎么规划？', [], fixedDate);
  assert.match(reading.chart.strength.disclaimer, /简化旺衰倾向/);
  assert.match(reading.report.basis[2].note, /不直接等同/);
  assert.doesNotMatch(reading.report.basis[2].note, /终身喜用神是/);
});

test('uses separate domains and carries relevant memory', () => {
  const history = [{ role: 'user', content: '我此前在考虑换工作' }];
  const career = buildLocalReading(user, 'career', '现在适合行动吗？', history, fixedDate);
  const love = buildLocalReading(user, 'love', '关系如何发展？', history, fixedDate);
  assert.notEqual(career.brief, love.brief);
  assert.match(career.memory, /换工作/);
});

test('returns one stable daily slip per user and day', () => {
  const first = buildDailyReading(user, [], fixedDate);
  const second = buildDailyReading(user, [], fixedDate);
  assert.equal(first.number, second.number);
  assert.equal(first.verse, second.verse);
});

test('builds five non-interactive overview conclusions from the same chart', () => {
  const summaries = buildOverviewReadings(user, {}, fixedDate);
  assert.equal(summaries.length, 5);
  assert.deepEqual(summaries.map((item) => item.agentId), ['career', 'love', 'health', 'outfit', 'talisman']);
  assert.ok(summaries.every((item) => item.word && item.summary));
});
