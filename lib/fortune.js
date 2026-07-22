const { Solar } = require('lunar-javascript');

const AGENTS = {
  career: {
    id: 'career', name: '事业运', role: '职场谋略师', icon: 'briefcase-business', color: '#b8533e',
    description: '看清时机、协作与进阶路径', placeholder: '最近适合争取晋升吗？'
  },
  love: {
    id: 'love', name: '爱情运', role: '关系洞察师', icon: 'heart', color: '#b54c67',
    description: '理解关系节奏与情感信号', placeholder: '这段关系接下来如何相处？'
  },
  health: {
    id: 'health', name: '健康运', role: '身心节律师', icon: 'activity', color: '#43806b',
    description: '关注作息、能量与身心节律', placeholder: '最近总是疲惫，要注意什么？'
  },
  outfit: {
    id: 'outfit', name: '穿着测算', role: '五行着装师', icon: 'shirt', color: '#447da0',
    description: '给出今日色彩、材质与场合建议', placeholder: '明天见客户应该怎么穿？'
  },
  talisman: {
    id: 'talisman', name: '灵器测算', role: '器物契合师', icon: 'gem', color: '#84659a',
    description: '测算材质、方位与器物契合度', placeholder: '我适合佩戴什么材质？'
  },
  daily: {
    id: 'daily', name: '每日一测', role: '今日签官', icon: 'sparkles', color: '#a06d2c',
    description: '一天一签，留一件值得做的事', placeholder: ''
  }
};

const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
};

const STEM_POLARITY = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳', 己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴'
};

const BRANCH_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
};

const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const DOMAIN_FOCUS = { career: '事业', love: '爱情', health: '健康', outfit: '社交', talisman: '情绪' };

const ELEMENT_GUIDE = {
  木: { strength: '生长与开拓', color: '青绿', material: '木质、棉麻', direction: '东' },
  火: { strength: '表达与行动', color: '朱红', material: '皮革、暖光金属', direction: '南' },
  土: { strength: '稳定与承接', color: '米白', material: '陶石、粗织物', direction: '中' },
  金: { strength: '判断与边界', color: '银白', material: '银饰、精钢', direction: '西' },
  水: { strength: '洞察与流动', color: '墨蓝', material: '玻璃、黑曜石', direction: '北' }
};

const TEN_GOD_THEME = {
  比肩: { theme: '自主与同伴', opportunity: '适合依靠熟悉能力推进，也容易获得同类资源响应', risk: '主见变强，需防各自为战或重复投入' },
  劫财: { theme: '协作与竞争', opportunity: '人脉、团队与资源交换会成为推进杠杆', risk: '利益边界模糊时，功劳、预算或精力容易被分散' },
  食神: { theme: '输出与沉淀', opportunity: '适合把经验做成作品、方法或稳定交付', risk: '节奏过松会错过明确的兑现节点' },
  伤官: { theme: '表达与破局', opportunity: '创新、提案和专业影响力更容易被看见', risk: '表达锋利时，容易与规则、管理者或既有流程发生摩擦' },
  正财: { theme: '成果与兑现', opportunity: '适合谈可量化结果、稳定收入与资源配置', risk: '目标过多会把精力压在短期回报上' },
  偏财: { theme: '机会与扩张', opportunity: '项目、外部合作和新增资源的机会更活跃', risk: '机会看似很多，但承接能力与现金、时间边界必须先算清' },
  正官: { theme: '责任与晋阶', opportunity: '职位、授权、规则内晋升与正式认可值得争取', risk: '考核与责任同步上升，不能只拿头衔不配资源' },
  七杀: { theme: '压力与决断', opportunity: '高压任务可转化为权责升级和关键履历', risk: '期限、竞争或管理压力集中，不宜在信息不足时激进加码' },
  正印: { theme: '平台与支持', opportunity: '制度、资深人士、学习与平台背书能明显降低试错成本', risk: '依赖现成支持时，个人成果的归属需要主动固化' },
  偏印: { theme: '洞察与转型', opportunity: '适合研究新方法、建立差异化能力或完成认知升级', risk: '想得太多、验证太少，会让机会停留在判断层面' },
  日主: { theme: '自我校准', opportunity: '适合回到自身节奏与真实需求', risk: '避免只凭主观感受替代外部验证' }
};

function generatingElement(element) {
  return Object.keys(GENERATES).find((item) => GENERATES[item] === element);
}

function tenGodForStem(dayMaster, targetStem) {
  if (!STEM_ELEMENT[dayMaster] || !STEM_ELEMENT[targetStem]) return '';
  if (dayMaster === targetStem) return '比肩';
  const dayElement = STEM_ELEMENT[dayMaster];
  const targetElement = STEM_ELEMENT[targetStem];
  const samePolarity = STEM_POLARITY[dayMaster] === STEM_POLARITY[targetStem];
  if (dayElement === targetElement) return samePolarity ? '比肩' : '劫财';
  if (GENERATES[dayElement] === targetElement) return samePolarity ? '食神' : '伤官';
  if (CONTROLS[dayElement] === targetElement) return samePolarity ? '偏财' : '正财';
  if (CONTROLS[targetElement] === dayElement) return samePolarity ? '七杀' : '正官';
  if (GENERATES[targetElement] === dayElement) return samePolarity ? '偏印' : '正印';
  return '';
}

function assessStrength(pillars, dayElement) {
  const monthBranch = pillars[1][1];
  const sourceElement = generatingElement(dayElement);
  const balancingElements = [sourceElement, dayElement];
  const weightedCharacters = [
    ...pillars.map((pillar, index) => ({ source: `${['年', '月', '日', '时'][index]}干`, element: STEM_ELEMENT[pillar[0]], weight: 1 })),
    ...pillars.map((pillar, index) => ({ source: `${['年', '月', '日', '时'][index]}支`, element: BRANCH_ELEMENT[pillar[1]], weight: index === 1 ? 5 : 1 }))
  ];
  const totalWeight = weightedCharacters.reduce((sum, item) => sum + item.weight, 0);
  const supportWeight = weightedCharacters
    .filter((item) => balancingElements.includes(item.element))
    .reduce((sum, item) => sum + item.weight, 0);
  const ratio = supportWeight / totalWeight;
  let label = '较均衡';
  if (ratio <= 0.3) label = '偏弱明显';
  else if (ratio <= 0.45) label = '偏弱';
  else if (ratio >= 0.7) label = '偏强明显';
  else if (ratio >= 0.56) label = '偏强';
  const monthElement = BRANCH_ELEMENT[monthBranch];
  const monthRelation = balancingElements.includes(monthElement) ? '得月令生扶' : '月令不直接生扶';
  const cautionElements = Object.keys(ELEMENT_GUIDE).filter((item) => !balancingElements.includes(item));
  return {
    label,
    ratio: Number(ratio.toFixed(2)),
    supportWeight,
    totalWeight,
    balancingElements,
    cautionElements,
    monthRelation,
    explanation: `${monthBranch}月属${monthElement}，日主${dayElement}${monthRelation}；按月支五倍、其余干支一倍计算，同类与生扶权重为 ${supportWeight}/${totalWeight}，因此判断为“${label}”倾向。`,
    disclaimer: '这是用于解释报告的简化旺衰倾向，未把调候、藏干强弱及全部合冲刑害等同于完整喜用神定论。'
  };
}

function yearlyTone(item, strength) {
  const support = [item.stemElement, item.branchElement].filter((element) => strength.balancingElements.includes(element)).length;
  const pressure = [item.stemElement, item.branchElement].filter((element) => strength.cautionElements.includes(element)).length;
  const score = support * 2 - pressure;
  if (score >= 3) return { label: '顺势兑现', score };
  if (score >= 1) return { label: '转机增多', score };
  if (score <= -2) return { label: '承压整合', score };
  return { label: '稳中调整', score };
}

function calculateLuck(eightChar, gender, dayMaster, strength, startYear) {
  const genderNumber = gender === '男' ? 1 : gender === '女' ? 0 : null;
  let currentLuck = null;
  const annualMap = new Map();
  if (genderNumber !== null) {
    const yun = eightChar.getYun(genderNumber);
    const daYun = yun.getDaYun();
    daYun.forEach((period) => {
      const pillar = period.getGanZhi();
      if (pillar) {
        period.getLiuNian().forEach((year) => annualMap.set(year.getYear(), { pillar: year.getGanZhi(), age: year.getAge() }));
      }
      if (startYear >= period.getStartYear() && startYear <= period.getEndYear()) {
        currentLuck = {
          pillar,
          startYear: period.getStartYear(),
          endYear: period.getEndYear(),
          stemTenGod: pillar ? tenGodForStem(dayMaster, pillar[0]) : '',
          startDate: yun.getStartSolar().toYmd()
        };
      }
    });
  }

  const yearlyOutlook = Array.from({ length: 4 }, (_, index) => {
    const year = startYear + index;
    const cached = annualMap.get(year);
    const pillar = cached?.pillar || Solar.fromYmdHms(year, 7, 1, 12, 0, 0).getLunar().getYearInGanZhiExact();
    const item = {
      year,
      pillar,
      age: cached?.age || null,
      stemElement: STEM_ELEMENT[pillar[0]],
      branchElement: BRANCH_ELEMENT[pillar[1]],
      stemTenGod: tenGodForStem(dayMaster, pillar[0])
    };
    return { ...item, tone: yearlyTone(item, strength) };
  });
  return { currentLuck, yearlyOutlook };
}

function parseBirth(user) {
  const [year, month, day] = user.birthDate.split('-').map(Number);
  const [hour, minute] = user.birthTime.split(':').map(Number);
  return { year, month, day, hour, minute };
}

function elementCounts(wuXingPairs) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  wuXingPairs.join('').split('').forEach((element) => {
    if (Object.hasOwn(counts, element)) counts[element] += 1;
  });
  return counts;
}

function dayRelation(dayElement, todayElement) {
  if (dayElement === todayElement) {
    return { name: '比和', modifier: 4, note: `今日${todayElement}气与本命同类，原有倾向会被放大，宜把力量集中在一件事上。` };
  }
  if (GENERATES[todayElement] === dayElement) {
    return { name: '生扶', modifier: 7, note: `今日${todayElement}气生扶本命${dayElement}，外部资源与回应相对容易到位。` };
  }
  if (GENERATES[dayElement] === todayElement) {
    return { name: '泄秀', modifier: 2, note: `本命${dayElement}气生今日${todayElement}，表达与产出顺手，但要留意精力外耗。` };
  }
  if (CONTROLS[todayElement] === dayElement) {
    return { name: '受制', modifier: -6, note: `今日${todayElement}气制约本命${dayElement}，规则、期限或他人要求会带来压力，宜先守边界。` };
  }
  return { name: '财机', modifier: 5, note: `本命${dayElement}气可制今日${todayElement}，适合主动配置资源，但不宜同时铺开太多目标。` };
}

function elementExtremes(counts) {
  const entries = Object.entries(counts);
  const dominant = [...entries].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))[0][0];
  const weakest = [...entries].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'zh-CN'))[0][0];
  return { dominant, weakest };
}

function calculateProfile(user, now = new Date()) {
  const birth = parseBirth(user);
  const birthSolar = Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute, 0);
  const birthLunar = birthSolar.getLunar();
  const eightChar = birthLunar.getEightChar();
  const pillars = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
  const currentSolar = Solar.fromDate(now);
  const currentLunar = currentSolar.getLunar();
  const currentEightChar = currentLunar.getEightChar();
  const dayMaster = eightChar.getDayGan();
  const dayElement = STEM_ELEMENT[dayMaster];
  const wuXing = elementCounts([
    eightChar.getYearWuXing(),
    eightChar.getMonthWuXing(),
    eightChar.getDayWuXing(),
    eightChar.getTimeWuXing()
  ]);
  const { dominant, weakest } = elementExtremes(wuXing);
  const todayPillar = currentEightChar.getDay();
  const todayElement = STEM_ELEMENT[todayPillar[0]];
  const relation = dayRelation(dayElement, todayElement);
  const strength = assessStrength(pillars, dayElement);
  const tenGods = {
    stems: [
      eightChar.getYearShiShenGan(),
      eightChar.getMonthShiShenGan(),
      eightChar.getDayShiShenGan(),
      eightChar.getTimeShiShenGan()
    ],
    branches: [
      eightChar.getYearShiShenZhi(),
      eightChar.getMonthShiShenZhi(),
      eightChar.getDayShiShenZhi(),
      eightChar.getTimeShiShenZhi()
    ]
  };
  const luck = calculateLuck(eightChar, user.gender, dayMaster, strength, now.getFullYear());

  return {
    zodiac: `${birthSolar.getXingZuo()}座`,
    animal: birthLunar.getYearShengXiao(),
    lunarBirth: birthLunar.toString(),
    bazi: pillars,
    baziText: pillars.join(' '),
    dayMaster,
    dayElement,
    wuXing,
    dominantElement: dominant,
    weakElement: weakest,
    monthBranch: pillars[1][1],
    monthElement: BRANCH_ELEMENT[pillars[1][1]],
    naYin: [eightChar.getYearNaYin(), eightChar.getMonthNaYin(), eightChar.getDayNaYin(), eightChar.getTimeNaYin()],
    tenGods,
    growthPhases: [eightChar.getYearDiShi(), eightChar.getMonthDiShi(), eightChar.getDayDiShi(), eightChar.getTimeDiShi()],
    strength,
    currentLuck: luck.currentLuck,
    yearlyOutlook: luck.yearlyOutlook,
    today: {
      date: now.toISOString().slice(0, 10),
      lunar: currentLunar.toString(),
      pillar: todayPillar,
      element: todayElement,
      relation,
      yi: currentLunar.getDayYi().slice(0, 5),
      ji: currentLunar.getDayJi().slice(0, 4),
      direction: currentLunar.getDayPositionCaiDesc()
    }
  };
}

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function memoryHint(history) {
  const lastQuestion = [...history].reverse().find((message) => message.role === 'user');
  if (!lastQuestion) return '';
  const text = typeof lastQuestion.content === 'string' ? lastQuestion.content : lastQuestion.content?.question;
  return text ? `这次也延续了你此前对“${text.slice(0, 18)}”的关注。` : '';
}

function conciseQuestion(question) {
  const clean = String(question || '').replace(/\s+/g, ' ').trim();
  return clean.length > 24 ? `${clean.slice(0, 24)}…` : clean;
}

function domainQuestion(agentId) {
  return {
    career: '今天的事业推进重点是什么？',
    love: '今天的关系互动重点是什么？',
    health: '今天如何安排身心节律？',
    outfit: '今天怎样穿更顺应场合？',
    talisman: '今天什么器物更适合作为提醒？'
  }[agentId];
}

function yearList(items) {
  return items.map((item) => `${item.year}年`).join('、');
}

function yearlyDomainReading(chart, item, agentId) {
  const theme = TEN_GOD_THEME[item.stemTenGod] || TEN_GOD_THEME.日主;
  const supportElements = [item.stemElement, item.branchElement]
    .filter((element) => chart.strength.balancingElements.includes(element));
  const supportText = supportElements.length
    ? `${[...new Set(supportElements)].join('、')}进入流年，对${chart.strength.label}的日主形成补充`
    : `${item.stemElement}、${item.branchElement}都不在本报告的生扶侧，承接成本会上升`;
  const domainText = {
    career: `事业上应把“${theme.theme}”落到职位、预算、汇报线或可署名成果，避免只有任务增加、权责却未同步。`,
    love: `关系上会更突出“${theme.theme}”：重要的不是一时热度，而是回应是否稳定、边界能否协商、承诺能否兑现。`,
    health: `节律上会更突出“${theme.theme}”带来的消耗方式，应以睡眠、活动和持续不适记录校正安排，不能用流年替代医学判断。`,
    outfit: `穿着上适合把“${theme.theme}”转成场合策略：主色负责稳定气质，点缀色只承担提醒，不堆叠所谓开运元素。`,
    talisman: `器物上适合把“${theme.theme}”转成一个现实提醒，只选择已有、熟悉、安全的物件，不以价格代表契合度。`
  }[agentId];
  return {
    year: item.year,
    pillar: item.pillar,
    badge: item.tone.label,
    title: `${item.stemTenGod}主事：${theme.theme}`,
    body: `${item.year}${item.pillar}年，天干${item.pillar[0]}${item.stemElement}对${chart.dayMaster}${chart.dayElement}日主为${item.stemTenGod}，地支${item.pillar[1]}属${item.branchElement}。${supportText}。${domainText}`,
    opportunity: theme.opportunity,
    risk: theme.risk
  };
}

function reportBasis(chart) {
  const stemLabels = chart.tenGods.stems.map((value, index) => `${['年', '月', '日', '时'][index]}干${value}`).join('、');
  const luck = chart.currentLuck
    ? `${chart.currentLuck.pillar}（${chart.currentLuck.startYear}-${chart.currentLuck.endYear}），运干为${chart.currentLuck.stemTenGod}`
    : '性别未填写，暂不强行判定大运顺逆';
  return [
    { label: '四柱底盘', value: chart.baziText, note: `${chart.dayMaster}${chart.dayElement}日主，生于${chart.monthBranch}${chart.monthElement}月；${stemLabels}。` },
    { label: '旺衰倾向', value: chart.strength.label, note: `${chart.strength.explanation}${chart.strength.disclaimer}` },
    { label: '平衡侧重点', value: chart.strength.balancingElements.join('、'), note: `只表示本模型中较能补充日主承接力的元素，不直接等同于未经复核的“终身喜用神”。` },
    { label: '当前大运', value: luck, note: chart.currentLuck ? `大运提供十年背景，流年决定当年的具体起伏；两者必须和现实处境一起判断。` : '未来四年仍按确定的流年干支展开，结论会相应保守。' }
  ];
}

function buildPremiumReport(chart, agentId, question) {
  const timeline = chart.yearlyOutlook.map((item) => yearlyDomainReading(chart, item, agentId));
  const maxTone = Math.max(...chart.yearlyOutlook.map((item) => item.tone.score));
  const minTone = Math.min(...chart.yearlyOutlook.map((item) => item.tone.score));
  const favorableYears = chart.yearlyOutlook.filter((item) => item.tone.score === maxTone);
  const pressureYears = chart.yearlyOutlook.filter((item) => item.tone.score === minTone);
  const favorableText = yearList(favorableYears);
  const pressureText = yearList(pressureYears);
  const movingQuestion = /跳槽|离职|换工作|去留|辞职|要不要动|项目.*做成|项目.*成功/.test(question);
  const relationshipQuestion = /复合|分手|结婚|单身|对象|关系/.test(question);
  const basis = reportBasis(chart);
  const common = {
    basis,
    timeline,
    methodology: '四柱和十神由历法库确定；旺衰为透明权重模型；大运、流年用于判断时间节奏；最后再与问题中的现实条件交叉验证。'
  };

  if (agentId === 'career') {
    const title = movingQuestion ? '项目做成后，先固化成果再择机动' : '先把成果变成权责，再决定下一步';
    const brief = movingQuestion
      ? `结论先说：若新项目做成，不建议在${pressureText}立刻因焦虑主动跳槽。先在原平台把功劳、权限与回报写进可验证的安排；${favorableText}支持条件转强后，再比较内部升级与外部邀约，胜率更高。`
      : `这不是单看“今天宜不宜动”。命盘、大运和未来四年放在一起看，当前更重要的是把已有成果固化成职位、预算、团队权限或方法论；${favorableText}再争取升级，筹码会比现在完整。`;
    return {
      title,
      brief,
      report: {
        ...common,
        verdict: {
          heading: movingQuestion ? '不急着离场，先完成成果变现' : '用确定性成果换取下一层权限',
          body: `${chart.dayMaster}${chart.dayElement}日主呈${chart.strength.label}倾向，平衡侧重${chart.strength.balancingElements.join('、')}。${chart.currentLuck ? `当前行${chart.currentLuck.pillar}大运（${chart.currentLuck.startYear}-${chart.currentLuck.endYear}），运干对应${chart.currentLuck.stemTenGod}，十年主线更重视${TEN_GOD_THEME[chart.currentLuck.stemTenGod]?.theme || '责任与结构'}。` : ''}在这种结构下，最忌把“项目做成”只换成新的工作量，也不宜在成果尚未定价时裸辞重开。先把成功写进职级、汇报线、资源调配权和回报约定，再判断去留。`
        },
        comparisons: [
          { title: '留在原平台深耕', body: `优势是已有项目证据、协作信用与组织信息可以继续复利。尤其在${pressureText}，熟悉的平台能降低重新证明自己的成本；但必须设定回报固化期限，避免长期“只有责任，没有授权”。` },
          { title: '接受外部机会', body: `适合等到${favorableText}或现实条件明显升级后再谈。好的外部机会应同时改善平台质量、决策权限和总回报，并允许你带着方法论平移；若只是薪资小幅上涨却让资源归零，不构成真正升级。` }
        ],
        triggers: [
          { condition: '平台基本面不可逆转', recommendation: '若资金、业务或核心管理层持续退出，原有支持已经消失，应提前准备外部选项。' },
          { condition: '成果无法换成正式权责', recommendation: '项目完成后设定明确谈判节点；若职位、预算、团队或回报长期没有任何一项落地，继续留下的复利会递减。' },
          { condition: '出现降维邀约', recommendation: `外部平台、权限和回报至少两项显著提升，且能在${favorableText}完成交接或入职，可视为“带成果升级”而不是逃离。` },
          { condition: '身体与关系成本失控', recommendation: '若工作已经持续伤害健康或家庭安全，不必为了等待流年硬扛，现实止损优先于择时。' }
        ],
        conclusion: {
          heading: '最终判断',
          body: `若新项目真的做成，先留一段时间把成果定价，比立刻跳槽更合适。${pressureText}的重点是守住承接力、完成组织内兑现；${favorableText}再看内部能否自然升级。到那时若平台仍有空间，就顺势扩权；若平台失去支持或外部出现明显更高一级的邀约，再带着完整成果移动。关键不是“永远留”或“马上走”，而是不要在成果尚未成为你的筹码前离场。`
        }
      }
    };
  }

  const domainReports = {
    love: {
      title: relationshipQuestion ? '先看回应能否持续，再决定关系去留' : '关系的答案在稳定回应里',
      brief: `这段关系不能只凭一时热度下结论。${pressureText}更需要把期待说清、观察承诺兑现；${favorableText}互动空间相对增加，适合推进共同计划或确认关系边界。`,
      verdict: { heading: '用回应质量代替猜测', body: `${chart.dayMaster}${chart.dayElement}日主呈${chart.strength.label}倾向，关系里既需要情绪理解，也需要可持续的现实回应。问题“${conciseQuestion(question)}”的判断重点应放在：对方是否愿意解释、是否尊重边界、是否兑现小承诺，而不是只看一句表态。` },
      comparisons: [
        { title: '主动推进', body: `适合在${favorableText}提出具体邀约、共同计划或关系确认。表达要具体，不以试探和冷处理换取安全感。` },
        { title: '继续观察', body: `若处在${pressureText}且回应反复，先用两到四周观察一致性。持续失联、贬低、控制或威胁不属于“运势波动”，应优先保护自己。` }
      ],
      triggers: [
        { condition: '回应稳定且愿意协商', recommendation: '可以逐步增加共同计划，用行动验证关系承载力。' },
        { condition: '承诺与行动长期相反', recommendation: '停止替对方解释，把关系判断建立在重复出现的事实之上。' },
        { condition: '出现控制或伤害', recommendation: '优先寻求可信的人和专业支持，不等待所谓转运。' }
      ],
      conclusion: { heading: '最终判断', body: `关系值得继续的条件，不是“缘分感”有多强，而是双方能否在${pressureText}仍保持基本尊重，并在${favorableText}把关系推进到更清晰的位置。先看一致性，再决定投入深度。` }
    },
    health: {
      title: '先守住恢复力，再安排高强度目标',
      brief: `未来四年的重点不是预测疾病，而是识别哪几年更容易持续消耗。${pressureText}应主动减负并记录睡眠、疼痛和情绪变化；${favorableText}适合重建稳定运动与恢复节律。`,
      verdict: { heading: '把运势转成可观察的节律', body: `${chart.strength.explanation}这只能提示承接压力的倾向，不能诊断任何疾病。针对“${conciseQuestion(question)}”，应把主观疲惫转换成睡眠时长、活动量、饮食和症状持续时间等可记录信号，再决定休息或就医。` },
      comparisons: [
        { title: '可自我调整的疲惫', body: '通常会随规律睡眠、补水、进食和减少连续工作而改善，可连续记录三到七天观察。' },
        { title: '需要专业判断的信号', body: '持续或加重的疼痛、心悸、呼吸困难、明显失眠及情绪危机，应及时就医或联系专业人士，不用测算解释病因。' }
      ],
      triggers: [
        { condition: '压力年任务集中', recommendation: `在${pressureText}为高强度事项预留恢复日，不同时叠加多个长期目标。` },
        { condition: '连续三天恢复不佳', recommendation: '减少非必要消耗，并开始记录症状、睡眠和诱因。' },
        { condition: '症状持续或影响生活', recommendation: '及时就医，报告仅保留为生活安排参考。' }
      ],
      conclusion: { heading: '最终判断', body: `把${pressureText}当作“更早安排恢复”的提醒，把${favorableText}当作建立长期习惯的窗口。任何具体不适都以医学检查为准，不以五行或流年作病因结论。` }
    },
    outfit: {
      title: '按命盘定气质，按场合定比例',
      brief: `适合你的不是一套固定“幸运色”，而是以${ELEMENT_GUIDE[chart.dayElement].color}表达${ELEMENT_GUIDE[chart.dayElement].strength}，再根据场合与流年调整面积。正式场合先保证合身、层次和可信度。`,
      verdict: { heading: '先解决场合目标，再谈五行点缀', body: `${chart.dayMaster}${chart.dayElement}日主、${chart.strength.label}倾向，使${chart.strength.balancingElements.join('、')}更适合作为稳定气质的参考。针对“${conciseQuestion(question)}”，主色不超过全身三成，点缀色约一成，其余留给中性色和版型结构。` },
      comparisons: [
        { title: '正式沟通', body: `选择清晰肩线、少装饰和稳定材质；用${ELEMENT_GUIDE[chart.dayElement].color}放在上装、领口或配件附近，先建立可信度。` },
        { title: '社交与约会', body: '可以增加柔软材质和一处明度变化，但不同时使用三种以上高饱和颜色，避免五行标签压过本人气质。' }
      ],
      triggers: [
        { condition: '需要建立权威', recommendation: '减少碎小装饰，使用直线条、挺括面料和清晰明暗对比。' },
        { condition: '需要降低距离感', recommendation: '保留主色，增加柔软材质或低对比同色层次。' },
        { condition: '没有对应颜色', recommendation: '用相近明度、材质或一件小配件替代，不为开运额外消费。' }
      ],
      conclusion: { heading: '最终判断', body: `最有效的穿着方案是：合身与场合占七成，色彩层次占两成，五行提醒只占一成。${pressureText}更适合克制、稳定的结构；${favorableText}可增加表达性和个人辨识度。` }
    },
    talisman: {
      title: '器物只做提醒，不替你做决定',
      brief: `与你更契合的是${ELEMENT_GUIDE[chart.dayElement].material}类的一件熟悉小物，用来提醒${ELEMENT_GUIDE[chart.dayElement].strength}。不需要购买昂贵物件，也不把材质匹配解释为超自然功效。`,
      verdict: { heading: '契合度来自用途、习惯与安全', body: `${chart.dayMaster}${chart.dayElement}日主的平衡侧重为${chart.strength.balancingElements.join('、')}，因此可从${ELEMENT_GUIDE[chart.dayElement].material}中选择体量小、已有使用习惯的物件。它的实际价值是建立决策前的复核动作，而不是改变外部事件。` },
      comparisons: [
        { title: '适合长期使用', body: '来源清楚、材质安全、大小不影响工作，且能稳定提醒某个具体习惯，例如复核目标或暂停冲动决定。' },
        { title: '不建议选择', body: '高价、来源不明、引发过敏、尖锐易碎，或卖家承诺替代医疗、投资和现实行动的物件。' }
      ],
      triggers: [
        { condition: '需要聚焦', recommendation: `把一件熟悉小物放在${ELEMENT_GUIDE[chart.dayElement].direction}侧，触碰时只复核一个当前目标。` },
        { condition: '开始依赖物件做决定', recommendation: '立即停用“吉凶”判断，回到事实、成本和可逆性。' },
        { condition: '产生额外消费压力', recommendation: '优先使用已有物件；价格与所谓能量没有必然关系。' }
      ],
      conclusion: { heading: '最终判断', body: `选择一件安全、熟悉、能承载个人意义的小物即可。${pressureText}用它提醒边界，${favorableText}用它提醒行动；任何时候都不让器物替代证据和现实决策。` }
    }
  };
  const selected = domainReports[agentId];
  return {
    title: selected.title,
    brief: selected.brief,
    report: { ...common, verdict: selected.verdict, comparisons: selected.comparisons, triggers: selected.triggers, conclusion: selected.conclusion }
  };
}

function buildLocalReading(user, agentId, question, history = [], now = new Date()) {
  const chart = calculateProfile(user, now);
  const seed = hash(`${user.id}:${agentId}:${chart.today.date}:${question}`);
  const focusBoost = user.focus?.includes(DOMAIN_FOCUS[agentId]) ? 2 : 0;
  const score = Math.max(58, Math.min(94, 75 + chart.today.relation.modifier + focusBoost + ((seed % 9) - 4)));
  const guide = ELEMENT_GUIDE[chart.dayElement];
  const todayGuide = ELEMENT_GUIDE[chart.today.element];
  const questionLabel = conciseQuestion(question);
  const balanceText = `${chart.dominantElement}偏强、${chart.weakElement}偏少`;
  const tenGodLine = chart.tenGods.stems.map((value, index) => `${['年', '月', '日', '时'][index]}${value}`).join('·');
  const shared = {
    score,
    chart,
    question: questionLabel,
    evidence: [
      `八字 ${chart.baziText}`,
      `${chart.dayMaster}${chart.dayElement}日主·${chart.strength.label}倾向`,
      `十神 ${tenGodLine}`,
      chart.currentLuck ? `大运 ${chart.currentLuck.pillar}·${chart.currentLuck.stemTenGod}` : `月令 ${chart.monthBranch}${chart.monthElement}`,
      `流年 ${chart.yearlyOutlook.map((item) => `${item.year}${item.pillar}`).join('·')}`
    ],
    analysisPath: [
      { label: '命局底色', value: `${chart.dayMaster}${chart.dayElement}日主生于${chart.monthBranch}月，按月令权重为${chart.strength.label}倾向` },
      { label: '运势节奏', value: `${chart.currentLuck ? `${chart.currentLuck.pillar}大运叠加` : ''}${chart.yearlyOutlook[0].pillar}至${chart.yearlyOutlook.at(-1).pillar}流年，比较承压与生扶年份` },
      { label: '现实决策', value: `围绕“${questionLabel}”对照收益、风险与必须满足的行动条件` }
    ],
    memory: memoryHint(history),
    generatedBy: 'rules'
  };

  const readings = {
    career: {
      title: pick(['稳中见进', '以协作为先', '先定边界，再争机会', '适合推动关键一步'], seed),
      brief: `就“${questionLabel}”而言，今天适合先明确责任与资源，再推动可被验证的一步。${chart.today.relation.note}`,
      action: pick(['上午完成一次关键沟通', '把模糊任务拆成三个可验收节点', '先争取资源，再承诺时间', '主动同步一项阶段成果'], seed, 3),
      details: [
        { heading: '命盘依据', body: `${chart.dayMaster}${chart.dayElement}日主生于${chart.monthBranch}月，八字五行呈${balanceText}。这让你更擅长${guide.strength}，但遇到模糊权责时容易把精力用在补位而非争取关键成果。` },
        { heading: '当日推演', body: `今日${chart.today.pillar}属${chart.today.element}，与本命构成“${chart.today.relation.name}”。${chart.today.relation.note}因此本题的机会不在突然变化，而在把已有筹码变成明确承诺。` },
        { heading: '问题落点', body: `针对“${questionLabel}”，先查三件事：决策人是否明确、成果能否量化、资源是否在承诺前到位。三项中至少两项清楚，再主动推进；否则先补信息。` },
        { heading: '行动窗口', body: `上午优先完成判断和关键沟通，下午做书面确认与交付拆解。可把面向${chart.today.direction}作为专注仪式，但真正有效的是在今天结束前留下一个可追踪节点。` }
      ]
    },
    love: {
      title: pick(['坦诚比猜测更重要', '关系在细节里升温', '给彼此一点回应空间', '适合表达真实感受'], seed),
      brief: `就“${questionLabel}”而言，今天先观察回应质量，不宜靠猜测补全对方态度。${chart.today.relation.note}`,
      action: pick(['发出一个具体而轻松的邀约', '把“你总是”换成“我感受到”', '认真听完再回应', '留出一段不看手机的相处时间'], seed, 2),
      details: [
        { heading: '命盘依据', body: `${chart.dayMaster}${chart.dayElement}日主、${chart.zodiac}的表达习惯叠加${balanceText}，关系里更重视有内容的回应；压力下则可能先在心里形成结论，再等待对方证明。` },
        { heading: '当日推演', body: `今日${chart.today.pillar}与日主形成“${chart.today.relation.name}”。${chart.today.relation.note}关系分 ${score}/100 不是好坏判定，而是今天沟通阻力与可用空间的相对刻度。` },
        { heading: '问题落点', body: `针对“${questionLabel}”，把期待改写成一个对方能回答的具体问题。看对方是否愿意解释、是否兑现小承诺，比一句热烈表态更能说明关系质量。` },
        { heading: '分情形建议', body: '单身时优先观察交流是否自然、是否尊重边界；已有关系适合共同完成一件小事，再讨论分歧。若关系中存在控制、威胁或持续伤害，应优先寻求现实支持。' }
      ]
    },
    health: {
      title: pick(['先养节律，再谈效率', '身体需要一次留白', '精力宜收不宜散', '动静相济'], seed),
      brief: `就“${questionLabel}”而言，今天的重点是降低持续消耗、保住恢复窗口。${chart.today.relation.note}这不是诊断，持续不适应及时就医。`,
      action: pick(['午后步行 20 分钟', '今晚提前半小时放下屏幕', '每工作 50 分钟起身活动', '补足饮水并减少高糖饮品'], seed, 1),
      details: [
        { heading: '命盘依据', body: `${chart.dayMaster}${chart.dayElement}日主，五行${balanceText}。在生活节律层面，${guide.strength}是优势，但${chart.weakElement}偏少提示更需要主动安排恢复，而不是等疲惫后再补救。` },
        { heading: '当日推演', body: `今日${chart.today.pillar}${chart.today.element}气与日主形成“${chart.today.relation.name}”。${chart.today.relation.note}能量分 ${score}/100 仅用于安排强弱任务，不代表医学指标。` },
        { heading: '问题落点', body: `针对“${questionLabel}”，先连续三天记录睡眠、进食、活动与不适出现的时间，再判断是节律问题还是需要专业检查。不要仅凭运势描述推断病因。` },
        { heading: '恢复窗口', body: `今天可把复杂任务放在上午，午后安排低强度活动；睡前半小时减少屏幕刺激。若疼痛、心悸、失眠或情绪问题持续、加重，应及时咨询医生或专业人士。` }
      ]
    },
    outfit: {
      title: `${guide.color}提气，利落线条加分`,
      brief: `就“${questionLabel}”而言，建议以${guide.color}小面积提气、${todayGuide.color}作克制点缀，版型服务于场合而不是堆叠“幸运元素”。`,
      action: pick(['把主色控制在全身三成以内', '选择一件有结构感的上装', '用同色系深浅建立层次', '减少过多装饰，保留一个视觉重点'], seed),
      details: [
        { heading: '命盘依据', body: `${chart.dayMaster}${chart.dayElement}日主、五行${balanceText}，本命更适合用${guide.color}与${guide.material}表达${guide.strength}，而不是从头到脚使用单一“开运色”。` },
        { heading: '当日推演', body: `今日${chart.today.pillar}属${chart.today.element}，与日主为“${chart.today.relation.name}”。用${todayGuide.color}作约 10% 点缀，可把今日气象转成视觉提醒。` },
        { heading: '场合配比', body: `${guide.color}约 20%-30% + 中性色 60%-70% + ${todayGuide.color}或金属点缀 10%。正式沟通选直线条、挺括面料；轻松见面可增加柔软材质。` },
        { heading: '避雷与替代', body: `不同时叠加三种以上高饱和颜色，也不牺牲舒适度。若没有对应色，用同一明度或同类材质替代即可；重点是整洁、合身和符合场合。` }
      ]
    },
    talisman: {
      title: `${guide.material}与你今日更契合`,
      brief: `就“${questionLabel}”而言，今天更适合${guide.material}的一件熟悉小物，作用是提醒你回到${guide.strength}，不需要购买昂贵“开运物”。`,
      action: pick(['佩戴一件小体量单品', '清理常用物件并固定位置', `将重要物件放在${guide.direction}侧`, '今天只选一件有意义的随身物'], seed, 4),
      details: [
        { heading: '命盘依据', body: `${chart.dayMaster}${chart.dayElement}日主、五行${balanceText}，${guide.material}在五行象意上与本命${chart.dayElement}相应。契合分 ${score}/100 表示象意匹配度，不表示器物具有超自然功效。` },
        { heading: '当日推演', body: `今日${chart.today.pillar}${chart.today.element}气与日主构成“${chart.today.relation.name}”。${chart.today.relation.note}因此器物应承担“提醒聚焦”的功能，而非增加更多刺激。` },
        { heading: '使用方式', body: `优先使用已有、熟悉且安全的小物，放在${guide.direction}侧或随手可触及处；在做关键决定前用它提醒自己复核目标、成本与边界。` },
        { heading: '消费边界', body: '不建议因测算购买高价物件、叠戴多件或替代现实行动。材质过敏、尖锐易碎或影响工作安全的器物应直接排除。' }
      ]
    }
  };

  const premium = buildPremiumReport(chart, agentId, question);
  return { ...shared, ...readings[agentId], ...premium };
}

function buildOverviewReadings(user, historyByAgent = {}, now = new Date()) {
  return Object.keys(AGENTS)
    .filter((agentId) => agentId !== 'daily')
    .map((agentId) => {
      const reading = buildLocalReading(user, agentId, domainQuestion(agentId), historyByAgent[agentId] || [], now);
      return { agentId, word: reading.title, summary: reading.brief, score: reading.score, evidence: reading.evidence.slice(1, 4) };
    });
}

function buildDailyReading(user, history = [], now = new Date()) {
  const chart = calculateProfile(user, now);
  const seed = hash(`${user.id}:daily:${chart.today.date}`);
  const fortunes = [
    ['见微知著', '别急着求一个大答案，今天真正的转机藏在小变化里。'],
    ['静水流深', '慢一点不是停滞。把心放稳，事情会显出真正的次序。'],
    ['循光而行', '选择那件让你心里变亮一点的事，先走一步就好。'],
    ['守正出新', '保留原则，也给新方法一点空间。今天适合换个角度。'],
    ['顺势而为', '不与阻力硬碰，先完成容易推动的部分，局面自会松动。']
  ];
  const [title, verse] = pick(fortunes, seed);
  return {
    title,
    verse,
    number: String((seed % 99) + 1).padStart(2, '0'),
    level: pick(['上签', '中上签', '平签'], seed, 7),
    action: pick(['整理桌面', '主动问候', '提前十分钟', '写下一个决定', '散步二十分钟'], seed, 11),
    lucky: `${ELEMENT_GUIDE[chart.dayElement].color} · ${chart.today.direction}`,
    memory: memoryHint(history),
    chart,
    generatedBy: 'rules'
  };
}

function sanitizeAiReading(value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  const aiReport = value.report && typeof value.report === 'object' ? value.report : null;
  const report = aiReport ? {
    ...fallback.report,
    methodology: String(aiReport.methodology || fallback.report.methodology).slice(0, 300),
    basis: fallback.report.basis,
    verdict: {
      heading: String(aiReport.verdict?.heading || fallback.report.verdict.heading).slice(0, 36),
      body: String(aiReport.verdict?.body || fallback.report.verdict.body).slice(0, 1000)
    },
    timeline: fallback.report.timeline.map((item, index) => ({
      ...item,
      title: String(aiReport.timeline?.[index]?.title || item.title).slice(0, 48),
      body: String(aiReport.timeline?.[index]?.body || item.body).slice(0, 1000),
      opportunity: String(aiReport.timeline?.[index]?.opportunity || item.opportunity).slice(0, 360),
      risk: String(aiReport.timeline?.[index]?.risk || item.risk).slice(0, 360)
    })),
    comparisons: Array.isArray(aiReport.comparisons) && aiReport.comparisons.length >= 2
      ? aiReport.comparisons.slice(0, 3).map((item) => ({
        title: String(item.title || '方案对照').slice(0, 36),
        body: String(item.body || '').slice(0, 900)
      }))
      : fallback.report.comparisons,
    triggers: Array.isArray(aiReport.triggers) && aiReport.triggers.length >= 3
      ? aiReport.triggers.slice(0, 5).map((item) => ({
        condition: String(item.condition || '判断条件').slice(0, 48),
        recommendation: String(item.recommendation || '').slice(0, 600)
      }))
      : fallback.report.triggers,
    conclusion: {
      heading: String(aiReport.conclusion?.heading || fallback.report.conclusion.heading).slice(0, 36),
      body: String(aiReport.conclusion?.body || fallback.report.conclusion.body).slice(0, 1000)
    }
  } : fallback.report;
  return {
    ...fallback,
    title: String(value.title || fallback.title).slice(0, 36),
    brief: String(value.brief || fallback.brief).slice(0, 320),
    action: String(value.action || fallback.action).slice(0, 80),
    analysisPath: Array.isArray(value.analysisPath) && value.analysisPath.length === 3
      ? value.analysisPath.map((item, index) => ({
        label: String(item.label || fallback.analysisPath[index].label).slice(0, 12),
        value: String(item.value || fallback.analysisPath[index].value).slice(0, 140)
      }))
      : fallback.analysisPath,
    details: Array.isArray(value.details) && value.details.length
      ? value.details.slice(0, 4).map((item) => ({
        heading: String(item.heading || '详细解读').slice(0, 20),
        body: String(item.body || '').slice(0, 600)
      }))
      : fallback.details,
    report,
    generatedBy: 'ai'
  };
}

async function generateAiReading({ user, agentId, question, history, fallback }) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  const model = process.env.AI_MODEL;
  if (!apiKey || !apiUrl || !model || agentId === 'daily') return fallback;

  const agent = AGENTS[agentId];
  const chart = fallback.chart;
  const recent = history.slice(-8).map((message) => ({ role: message.role, content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }));
  const system = `你是${agent.role}。沿用给定的确定性排盘、十神、大运与流年，不能改写干支和年份，不能编造用户未提供的经历、职位、领导关系、人格类型或家庭状态，也不能把简化旺衰倾向伪装成完整喜用神定论。输出 JSON：title、brief、action、analysisPath、report。brief 120-220 字，先给明确结论再解释因果。analysisPath 恰好三项，每项含 label/value。report 必须含 verdict、timeline、comparisons、triggers、conclusion：verdict 含 heading/body；timeline 必须按给定四个年份依次输出，每项含 title/body/opportunity/risk；comparisons 至少两项，每项含 title/body；triggers 至少三项，每项含 condition/recommendation；conclusion 含 heading/body。详细版应达到 1200-2200 个中文字符，解释命理术语如何落到现实决策，不能用万能话术凑字数。健康领域不诊断疾病并明确就医边界；灵器领域不得暗示超自然功效或诱导消费。`;
  const context = `用户：${user.name}；性别：${user.gender}；出生地：${user.birthplace}；星座：${chart.zodiac}；生肖：${chart.animal}；八字：${chart.baziText}；日主：${chart.dayMaster}${chart.dayElement}；月令：${chart.monthBranch}${chart.monthElement}；天干十神：${chart.tenGods.stems.join('、')}；地支藏干十神：${chart.tenGods.branches.map((items) => items.join('/')).join('、')}；旺衰倾向：${chart.strength.label}（依据：${chart.strength.explanation}；边界：${chart.strength.disclaimer}）；平衡侧重：${chart.strength.balancingElements.join('、')}；当前大运：${chart.currentLuck ? `${chart.currentLuck.pillar}，${chart.currentLuck.startYear}-${chart.currentLuck.endYear}，运干${chart.currentLuck.stemTenGod}` : '未判定'}；未来四年（不得修改）：${chart.yearlyOutlook.map((item) => `${item.year}${item.pillar}，${item.stemTenGod}，${item.tone.label}`).join('；')}；今日干支：${chart.today.pillar}${chart.today.element}；用户问题：${question}；规则版完整报告：${JSON.stringify(fallback.report)}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...recent, { role: 'user', content: context }]
      }),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) return fallback;
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    return sanitizeAiReading(JSON.parse(content), fallback);
  } catch {
    return fallback;
  }
}

module.exports = { AGENTS, calculateProfile, buildLocalReading, buildOverviewReadings, buildDailyReading, generateAiReading };
