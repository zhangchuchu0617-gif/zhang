const fs = require('node:fs');
const path = require('node:path');
const { birthplaceLabel, inferLegacyBirthplace, normalizeBirthplaceDetail, sanitizeFocus } = require('./profile');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');

const initialState = {
  users: [
    {
      id: 'user-lin',
      name: '林默',
      gender: '女',
      birthDate: '1992-08-17',
      birthTime: '09:30',
      birthplace: '中国 · 浙江省 · 杭州市',
      birthplaceDetail: { country: '中国', province: '浙江省', city: '杭州市', county: '', town: '', village: '' },
      focus: ['事业', '健康'],
      member: false,
      createdAt: '2026-07-01T08:00:00.000Z'
    },
    {
      id: 'user-zhou',
      name: '周屿',
      gender: '男',
      birthDate: '1988-03-26',
      birthTime: '21:10',
      birthplace: '中国 · 四川省 · 成都市',
      birthplaceDetail: { country: '中国', province: '四川省', city: '成都市', county: '', town: '', village: '' },
      focus: ['爱情', '个人选择'],
      member: true,
      createdAt: '2026-07-03T08:00:00.000Z'
    }
  ],
  conversations: {},
  dailyReadings: {}
};

function ensureStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, `${JSON.stringify(initialState, null, 2)}\n`);
  }
}

function readStore() {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  let migrated = false;
  store.users.forEach((user) => {
    const detail = normalizeBirthplaceDetail(user.birthplaceDetail || inferLegacyBirthplace(user.birthplace), user.birthplace);
    const label = birthplaceLabel(detail, user.birthplace);
    const focus = sanitizeFocus(user.focus);
    if (JSON.stringify(user.birthplaceDetail) !== JSON.stringify(detail)) {
      user.birthplaceDetail = detail;
      migrated = true;
    }
    if (user.birthplace !== label) {
      user.birthplace = label;
      migrated = true;
    }
    if (JSON.stringify(user.focus) !== JSON.stringify(focus)) {
      user.focus = focus;
      migrated = true;
    }
  });
  if (migrated) writeStore(store);
  return store;
}

function writeStore(store) {
  const temporary = `${STORE_PATH}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`);
  fs.renameSync(temporary, STORE_PATH);
}

function mutateStore(mutator) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

module.exports = { readStore, mutateStore };
