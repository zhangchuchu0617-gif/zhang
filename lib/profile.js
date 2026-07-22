const FOCUS_OPTIONS = ['事业', '爱情', '健康', '社交', '官运', '考运', '财富', '情绪'];
const LOCATION_KEYS = ['country', 'province', 'city', 'county', 'town', 'village'];

const LEGACY_FOCUS_ALIASES = {
  事业成长: '事业',
  关系经营: '爱情',
  身心平衡: '健康'
};

const LEGACY_BIRTHPLACES = {
  杭州: { country: '中国', province: '浙江省', city: '杭州市', county: '', town: '', village: '' },
  成都: { country: '中国', province: '四川省', city: '成都市', county: '', town: '', village: '' },
  绍兴新昌儒岙: { country: '中国', province: '浙江省', city: '绍兴市', county: '新昌县', town: '儒岙镇', village: '' }
};

function cleanText(value, maxLength = 24) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function inferLegacyBirthplace(label) {
  const cleaned = cleanText(label, 80);
  if (LEGACY_BIRTHPLACES[cleaned]) return { ...LEGACY_BIRTHPLACES[cleaned] };
  return { country: '中国', province: '', city: cleaned, county: '', town: '', village: '' };
}

function normalizeBirthplaceDetail(detail, fallbackLabel = '') {
  const source = detail && typeof detail === 'object' ? detail : inferLegacyBirthplace(fallbackLabel);
  return Object.fromEntries(LOCATION_KEYS.map((key) => [key, cleanText(source[key])]));
}

function birthplaceLabel(detail, fallbackLabel = '') {
  const normalized = normalizeBirthplaceDetail(detail, fallbackLabel);
  const label = LOCATION_KEYS.map((key) => normalized[key]).filter(Boolean).join(' · ');
  return label || cleanText(fallbackLabel, 80) || '未填写';
}

function sanitizeFocus(focus) {
  if (!Array.isArray(focus)) return [];
  const normalized = focus
    .map((item) => LEGACY_FOCUS_ALIASES[cleanText(item, 12)] || cleanText(item, 12))
    .filter(Boolean);
  return [...new Set(normalized)].slice(0, 12);
}

module.exports = {
  FOCUS_OPTIONS,
  LOCATION_KEYS,
  birthplaceLabel,
  inferLegacyBirthplace,
  normalizeBirthplaceDetail,
  sanitizeFocus
};
