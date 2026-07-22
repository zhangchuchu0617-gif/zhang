const state = {
  users: [],
  agents: [],
  currentUserId: localStorage.getItem('wendao:current-profile') || localStorage.getItem('wenxu:user') || '',
  lastAgentId: localStorage.getItem('wendao:last-agent') || 'career',
  route: 'dashboard',
  conversations: {},
  dailyReadings: {},
  overviews: {},
  focusOptions: [],
  aiConnected: false,
  legacyServer: false,
  sending: false
};

const DEVICE_KEYS = {
  profiles: 'wendao:profiles:v1',
  conversations: 'wendao:conversations:v1',
  daily: 'wendao:daily:v1',
  current: 'wendao:current-profile'
};

const agentSuggestions = {
  career: ['近三个月适合换工作吗？', '本周如何推进关键项目？', '我该争取这次晋升吗？'],
  love: ['最近适合主动联系对方吗？', '这段关系的相处重点是什么？', '单身的我如何打开新关系？'],
  health: ['最近精力低要注意什么？', '本周怎样安排作息更合适？', '我的压力应该怎么疏解？'],
  outfit: ['明天见客户穿什么？', '今天的幸运色是什么？', '约会时怎样穿更有亲和力？'],
  talisman: ['我适合佩戴什么材质？', '办公桌适合摆什么器物？', '最近需要加强哪种元素？']
};

const elementColors = { 木: '#4f8061', 火: '#b4513f', 土: '#aa7a3c', 金: '#768590', 水: '#426f88' };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readDeviceJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}

function persistDeviceState() {
  localStorage.setItem(DEVICE_KEYS.profiles, JSON.stringify(state.users));
  localStorage.setItem(DEVICE_KEYS.conversations, JSON.stringify(state.conversations));
  localStorage.setItem(DEVICE_KEYS.daily, JSON.stringify(state.dailyReadings));
  localStorage.setItem(DEVICE_KEYS.current, state.currentUserId);
}

function profilePayload(user) {
  const { profile, ...plain } = user;
  return plain;
}

function icon(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
}

function refreshIcons(root = document) {
  if (window.lucide) window.lucide.createIcons({ root });
}

async function api(path, options = {}) {
  const useLocalEngine = window.WendaoLocalApi && (
    location.protocol === 'file:' ||
    location.hostname.endsWith('.github.io') ||
    new URLSearchParams(location.search).has('local-engine')
  );
  if (useLocalEngine) return window.WendaoLocalApi.request(path, options);

  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '请求失败，请稍后再试');
  return payload;
}

function currentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || state.users[0];
}

function currentAgent(id) {
  return state.agents.find((agent) => agent.id === id);
}

function resolvedBirthplaceDetail(user) {
  const keys = ['country', 'province', 'city', 'county', 'town', 'village'];
  const existing = user?.birthplaceDetail || {};
  const existingLabel = keys.map((key) => existing[key]).filter(Boolean).join(' · ');
  const savedLabel = String(user?.birthplace || '').trim();
  if (savedLabel.includes(' · ') && savedLabel !== existingLabel) {
    const segments = savedLabel.split(' · ').map((item) => item.trim());
    return Object.fromEntries(keys.map((key, index) => [key, segments[index] || '']));
  }
  return Object.fromEntries(keys.map((key) => [key, existing[key] || '']));
}

function avatarColor(user) {
  const colors = ['#3e7765', '#a94432', '#49748f', '#755d87', '#9b622d'];
  const total = [...user.name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function userAvatar(user, className = 'avatar') {
  return `<span class="${className}" style="--avatar-color:${avatarColor(user)}">${escapeHtml(user.name.slice(0, 1))}</span>`;
}

function formatChineseDate(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(date);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function routeFromHash() {
  const hash = location.hash.replace(/^#/, '');
  return hash || 'dashboard';
}

function navigate(route) {
  if (location.hash === `#${route}`) {
    state.route = route;
    renderRoute();
  } else {
    location.hash = route;
  }
}

function renderNavigation() {
  const agentItems = state.agents.filter((agent) => agent.id !== 'daily');
  const currentAgentId = state.route.startsWith('agent/') ? state.route.split('/')[1] : '';
  $('#side-nav').innerHTML = `
    <button class="nav-item ${state.route === 'dashboard' ? 'active' : ''}" data-nav="dashboard" type="button">
      ${icon('layout-dashboard')}<span>今日概览</span>
    </button>
    <button class="nav-item" data-daily type="button">
      ${icon('sparkles')}<span>每日一测</span><span class="nav-dot" style="--agent-color:#a9782d"></span>
    </button>
    <div class="nav-label">专属测算</div>
    ${agentItems.map((agent) => `
      <button class="nav-item ${currentAgentId === agent.id ? 'active' : ''}" data-agent="${agent.id}" type="button" style="--agent-color:${agent.color}">
        ${icon(agent.icon)}<span>${agent.name}</span><span class="nav-dot"></span>
      </button>
    `).join('')}
  `;

  $('#mobile-nav').innerHTML = `
    <button class="nav-item ${state.route === 'dashboard' ? 'active' : ''}" data-nav="dashboard" type="button">${icon('layout-dashboard')}<span>概览</span></button>
    <button class="nav-item ${currentAgentId ? 'active' : ''}" data-agent-hub type="button">${icon('message-circle-more')}<span>测算</span></button>
    <button class="nav-item" data-daily type="button">${icon('sparkles')}<span>每日</span></button>
    <button class="nav-item" data-profile type="button">${icon('user-round')}<span>档案</span></button>
  `;

  $$('[data-nav]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.nav)));
  $$('[data-agent]').forEach((button) => button.addEventListener('click', () => navigate(`agent/${button.dataset.agent}`)));
  $('[data-agent-hub]')?.addEventListener('click', () => navigate(`agent/${state.lastAgentId}`));
  $$('[data-daily]').forEach((button) => button.addEventListener('click', showDaily));
  $$('[data-profile]').forEach((button) => button.addEventListener('click', () => showProfileModal(false)));
  refreshIcons();
}

function renderUserControls() {
  const user = currentUser();
  if (!user) return;
  $('#user-switcher').innerHTML = `
    ${userAvatar(user)}
    <span class="user-switcher-copy"><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.profile.baziText)}</small></span>
    ${icon('chevrons-up-down', 14)}
  `;
  $('#mobile-user').textContent = user.name.slice(0, 1);
  $('#mobile-user').style.background = avatarColor(user);
  refreshIcons();
}

function closePopover() {
  $('#popover-root').innerHTML = '';
}

function showUserPopover(anchor) {
  const root = $('#popover-root');
  if (root.children.length) return closePopover();
  const rect = anchor.getBoundingClientRect();
  root.innerHTML = `
    <div class="popover" role="menu" style="left:${Math.max(12, rect.left)}px;bottom:${Math.max(12, window.innerHeight - rect.top + 8)}px">
      <div class="popover-title">切换当前档案</div>
      ${state.users.map((user) => `
        <button class="user-option ${user.id === state.currentUserId ? 'active' : ''}" data-user-id="${user.id}" type="button" role="menuitem">
          ${userAvatar(user)}
          <span class="user-switcher-copy"><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.profile.zodiac)} · ${escapeHtml(user.profile.animal)}年</small></span>
          ${user.id === state.currentUserId ? `<span class="check">${icon('check', 15)}</span>` : ''}
        </button>
      `).join('')}
      <button class="button button-ghost popover-add" data-add-user type="button">${icon('user-round-plus', 15)}新增档案</button>
      <p class="popover-privacy">${icon('shield-check', 12)}档案与测算记录仅保存在此设备</p>
    </div>
  `;
  $$('[data-user-id]', root).forEach((button) => button.addEventListener('click', () => {
    state.currentUserId = button.dataset.userId;
    persistDeviceState();
    closePopover();
    renderUserControls();
    renderNavigation();
    renderRoute();
  }));
  $('[data-add-user]', root).addEventListener('click', () => { closePopover(); showProfileModal(true); });
  refreshIcons(root);
}

function renderDashboard() {
  const user = currentUser();
  const profile = user.profile;
  const agents = state.agents.filter((agent) => agent.id !== 'daily');
  const elementTotal = Math.max(1, Object.values(profile.wuXing).reduce((sum, count) => sum + count, 0));

  $('#main-content').innerHTML = `
    <div class="page">
      <header class="page-head">
        <div>
          <p class="eyebrow">${formatChineseDate()}</p>
          <h1 class="page-title">${greeting()}，${escapeHtml(user.name)}</h1>
          <p class="page-subtitle">命盘是理解节奏的坐标，不是替你做决定的答案。</p>
        </div>
        <div class="status-cluster">
          <span class="status-pill"><span class="online-dot"></span>${state.aiConnected ? 'AI 综合推演' : '命理规则推演'}</span>
          <span class="status-pill">${icon('shield-check', 13)}设备本地档案</span>
        </div>
      </header>

      <div class="dashboard-grid">
        <section class="daily-band" aria-labelledby="daily-title">
          <div class="daily-copy">
            <span class="daily-label">${icon('sparkles', 15)}每日一测</span>
            <h2 id="daily-title">今日之事，宜先问内心，再问时机</h2>
            <p>${escapeHtml(profile.today.lunar)} · ${escapeHtml(profile.today.pillar)}日<br>每天一签，保留一件值得做的小事。</p>
            <button class="button button-light" data-open-daily type="button">${icon('scroll-text', 16)}抽取今日签文</button>
          </div>
          <div class="daily-visual" aria-hidden="true"><canvas class="astrolabe" width="600" height="600"></canvas></div>
        </section>

        <aside class="profile-panel" aria-label="当前测算档案">
          <div class="profile-panel-head">
            <div class="profile-identity">
              ${userAvatar(user)}
              <div><h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.birthDate)} · ${escapeHtml(user.birthTime)} · ${escapeHtml(user.birthplace)}</p></div>
            </div>
            ${user.member ? `<span class="member-badge">${icon('crown', 11)}明鉴会员</span>` : `<button class="icon-button" data-edit-profile type="button" title="编辑档案">${icon('pencil', 15)}</button>`}
          </div>
          <div class="bazi-grid" aria-label="四柱八字">
            ${profile.bazi.map((pillar, index) => `<div class="pillar"><span>${['年柱','月柱','日柱','时柱'][index]}</span><strong>${escapeHtml(pillar)}</strong></div>`).join('')}
          </div>
          <div class="profile-facts">
            <div class="fact"><span>星座</span><strong>${escapeHtml(profile.zodiac)}</strong></div>
            <div class="fact"><span>生肖</span><strong>${escapeHtml(profile.animal)}</strong></div>
            <div class="fact"><span>日主</span><strong>${escapeHtml(profile.dayMaster)} · ${escapeHtml(profile.dayElement)}命</strong></div>
            <div class="fact"><span>农历生辰</span><strong>${escapeHtml(profile.lunarBirth.replace(/^一[九二〇零一二三四五六七八九]{3}年/, ''))}</strong></div>
          </div>
          <div class="element-row">
            <span class="section-kicker">五行结构</span>
            <div class="element-bars">
              ${Object.entries(profile.wuXing).map(([element, count]) => `<span class="element-bar" style="--element-color:${elementColors[element]};flex:${Math.max(0.4, count / elementTotal * 10)}" title="${element} ${count}"></span>`).join('')}
            </div>
            <div class="element-legend">${Object.entries(profile.wuXing).map(([element, count]) => `<span>${element}<b>${count}</b></span>`).join('')}</div>
          </div>
        </aside>

        <section class="agents-section" aria-labelledby="agents-title">
          <div class="section-head">
            <div><h2 id="agents-title">今日五运</h2><p>基于当前档案命盘与今日干支的快速概括</p></div>
          </div>
          <div class="overview-grid" id="overview-grid" aria-live="polite">
            ${agents.map((agent) => `
              <article class="overview-item is-loading" style="--agent-color:${agent.color}">
                <span class="overview-icon">${icon(agent.icon, 18)}</span>
                <div><span class="overview-name">${escapeHtml(agent.name)}</span><strong>推演中</strong><p>正在结合八字与今日干支整理结论</p></div>
              </article>
            `).join('')}
          </div>
        </section>
      </div>
    </div>
  `;

  $('[data-open-daily]').addEventListener('click', showDaily);
  $('[data-edit-profile]')?.addEventListener('click', () => showProfileModal(false));
  refreshIcons($('#main-content'));
  requestAnimationFrame(() => $$('.astrolabe').forEach(drawAstrolabe));
  loadOverviewSummaries(user, agents);
}

function fallbackOverviewSummaries(user, agents) {
  const profile = user.profile;
  const balance = profile.dominantElement && profile.weakElement
    ? `${profile.dominantElement}偏强、${profile.weakElement}偏少`
    : `${profile.dayMaster}${profile.dayElement}日主`;
  const copies = {
    career: ['稳进', `今天先定权责再推进成果；${balance}，更适合集中处理一项关键任务。`],
    love: ['回应', `今天用具体问题代替猜测；${profile.zodiac}的表达需要真实回应来落地。`],
    health: ['收敛', `把精力留给恢复窗口，减少连续消耗；不适持续时应及时就医。`],
    outfit: ['清简', `以${profile.dayElement}元素对应色作小面积重点，版型与场合优先。`],
    talisman: ['定心', `选择一件熟悉小物作为注意力提醒，不需要额外购买所谓开运物。`]
  };
  return agents.map((agent) => ({ agentId: agent.id, word: copies[agent.id][0], summary: copies[agent.id][1] }));
}

function paintOverviewSummaries(summaries, agents) {
  const root = $('#overview-grid');
  if (!root) return;
  const byId = Object.fromEntries(summaries.map((item) => [item.agentId, item]));
  root.innerHTML = agents.map((agent) => {
    const item = byId[agent.id];
    return `
      <article class="overview-item" style="--agent-color:${agent.color}">
        <span class="overview-icon">${icon(agent.icon, 18)}</span>
        <div><span class="overview-name">${escapeHtml(agent.name)}</span><strong>${escapeHtml(item?.word || '平稳')}</strong><p>${escapeHtml(item?.summary || agent.description)}</p></div>
      </article>
    `;
  }).join('');
  refreshIcons(root);
}

async function loadOverviewSummaries(user, agents) {
  const key = `${user.id}:${user.profile.today.date}`;
  if (state.overviews[key]) return paintOverviewSummaries(state.overviews[key], agents);
  const historyByAgent = Object.fromEntries(agents.map((agent) => [agent.id, state.conversations[`${user.id}:${agent.id}`] || []]));
  try {
    const payload = await api('/api/overview', {
      method: 'POST',
      body: JSON.stringify({ user: profilePayload(user), historyByAgent })
    });
    state.overviews[key] = payload.summaries;
  } catch {
    state.overviews[key] = fallbackOverviewSummaries(user, agents);
  }
  if (state.route === 'dashboard' && currentUser()?.id === user.id) paintOverviewSummaries(state.overviews[key], agents);
}

function drawAstrolabe(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = size * 0.39;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(220,185,120,0.68)';
  ctx.fillStyle = 'rgba(220,185,120,0.8)';
  ctx.lineWidth = 1.2;
  [1, 0.78, 0.56, 0.30].forEach((ratio, index) => {
    ctx.beginPath();
    ctx.arc(center, center, radius * ratio, 0, Math.PI * 2);
    ctx.stroke();
    if (index < 2) {
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.arc(center, center, radius * (ratio - 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  for (let index = 0; index < 24; index += 1) {
    const angle = (Math.PI * 2 * index) / 24 - Math.PI / 2;
    const inner = radius * (index % 3 === 0 ? 0.3 : 0.78);
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
    ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    ctx.stroke();
  }
  const starSeed = 19;
  for (let index = 0; index < 38; index += 1) {
    const angle = ((index * 137.5 + starSeed) * Math.PI) / 180;
    const distance = radius * (0.12 + ((index * 43) % 76) / 100);
    const x = center + Math.cos(angle) * distance;
    const y = center + Math.sin(angle) * distance;
    ctx.beginPath();
    ctx.arc(x, y, index % 7 === 0 ? 3.4 : 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = '26px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['木', '火', '土', '金', '水'].forEach((text, index) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    ctx.fillText(text, center + Math.cos(angle) * radius * 0.67, center + Math.sin(angle) * radius * 0.67);
  });
  ctx.font = '42px serif';
  ctx.fillText('道', center, center);
}

function contextPanel(user) {
  const profile = user.profile;
  return `
    <aside class="context-panel">
      <h2>本次测算依据</h2>
      <div class="context-user">${userAvatar(user)}<div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.birthplace)} · ${escapeHtml(profile.zodiac)}</small></div></div>
      <section class="context-section">
        <h3>命盘信息</h3>
        <div class="context-pillars">${profile.bazi.map((pillar) => `<span class="context-pillar">${escapeHtml(pillar)}</span>`).join('')}</div>
      </section>
      <section class="context-section">
        <h3>个人特征</h3>
        <div class="context-list">
          <div class="context-line"><span>日主</span><strong>${escapeHtml(profile.dayMaster)} · ${escapeHtml(profile.dayElement)}</strong></div>
          ${profile.strength ? `<div class="context-line"><span>旺衰倾向</span><strong>${escapeHtml(profile.strength.label)}</strong></div>` : ''}
          ${profile.currentLuck?.pillar ? `<div class="context-line"><span>当前大运</span><strong>${escapeHtml(profile.currentLuck.pillar)} · ${escapeHtml(profile.currentLuck.stemTenGod)}</strong></div>` : ''}
          <div class="context-line"><span>生肖</span><strong>${escapeHtml(profile.animal)}</strong></div>
          <div class="context-line"><span>星座</span><strong>${escapeHtml(profile.zodiac)}</strong></div>
          <div class="context-line"><span>关注</span><strong>${escapeHtml(user.focus?.[0] || '个人成长')}</strong></div>
        </div>
      </section>
      <section class="context-section">
        <h3>今日气象</h3>
        <div class="context-list">
          <div class="context-line"><span>日柱</span><strong>${escapeHtml(profile.today.pillar)}</strong></div>
          <div class="context-line"><span>宜</span><strong>${escapeHtml(profile.today.yi.slice(0, 2).join('、'))}</strong></div>
          <div class="context-line"><span>方位</span><strong>${escapeHtml(profile.today.direction)}</strong></div>
        </div>
      </section>
      <section class="context-section">
        <p class="context-note">当前 Agent 只读取“${escapeHtml(user.name)}”档案和本方向最近 20 轮对话。切换档案后，命盘、上下文和记忆会同步切换。</p>
      </section>
    </aside>
  `;
}

function premiumReportHtml(reading) {
  const report = reading.report;
  if (!report) {
    return `
      <div class="details-block ${reading.detailsLocked ? 'locked' : ''}">
        ${(reading.details || []).map((detail) => `<div class="detail-row"><h3>${escapeHtml(detail.heading)}</h3><p>${escapeHtml(detail.body)}</p></div>`).join('')}
        ${reading.detailsLocked ? `<div class="lock-overlay">${icon('lock-keyhole', 20)}<strong>完整推演已生成</strong><p>查看命盘依据、分情形判断与行动窗口</p><button class="button button-primary" data-unlock type="button">查看详细报告</button></div>` : ''}
      </div>
    `;
  }
  return `
    <section class="premium-report ${reading.detailsLocked ? 'locked' : ''}" aria-label="详细测算报告">
      <div class="premium-report-content">
        <header class="report-header">
          <div><span class="report-kicker">完整命理推演</span><h3>${escapeHtml(report.verdict.heading)}</h3></div>
          <span class="report-length">四年流年</span>
        </header>
        <p class="report-method">${escapeHtml(report.methodology)}</p>
        <div class="report-basis" aria-label="测算底盘">
          ${(report.basis || []).map((item) => `
            <div class="basis-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><p>${escapeHtml(item.note)}</p></div>
          `).join('')}
        </div>
        <section class="report-section report-verdict">
          <div class="report-section-title"><span>01</span><h4>底层判断</h4></div>
          <p>${escapeHtml(report.verdict.body)}</p>
        </section>
        <section class="report-section">
          <div class="report-section-title"><span>02</span><h4>未来四年节奏</h4></div>
          <div class="report-timeline">
            ${(report.timeline || []).map((item) => `
              <article class="timeline-row">
                <div class="timeline-year"><strong>${escapeHtml(item.year)}</strong><span>${escapeHtml(item.pillar)}</span></div>
                <div class="timeline-copy">
                  <div class="timeline-title"><span>${escapeHtml(item.badge)}</span><h5>${escapeHtml(item.title)}</h5></div>
                  <p>${escapeHtml(item.body)}</p>
                  <div class="timeline-dual"><p><strong>可用机会</strong>${escapeHtml(item.opportunity)}</p><p><strong>主要风险</strong>${escapeHtml(item.risk)}</p></div>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
        <section class="report-section">
          <div class="report-section-title"><span>03</span><h4>方案对照</h4></div>
          <div class="report-comparisons">
            ${(report.comparisons || []).map((item) => `<div><h5>${escapeHtml(item.title)}</h5><p>${escapeHtml(item.body)}</p></div>`).join('')}
          </div>
        </section>
        <section class="report-section">
          <div class="report-section-title"><span>04</span><h4>什么情况下需要改变策略</h4></div>
          <div class="report-triggers">
            ${(report.triggers || []).map((item) => `<div><strong>${escapeHtml(item.condition)}</strong><p>${escapeHtml(item.recommendation)}</p></div>`).join('')}
          </div>
        </section>
        <section class="report-conclusion">
          <span>结论</span><div><h4>${escapeHtml(report.conclusion.heading)}</h4><p>${escapeHtml(report.conclusion.body)}</p></div>
        </section>
      </div>
      ${reading.detailsLocked ? `<div class="lock-overlay report-lock">${icon('lock-keyhole', 22)}<strong>详细版已完成推演</strong><p>解锁命局底盘、未来四年流年、方案利弊与改变策略的触发条件</p><button class="button button-primary" data-unlock type="button">查看完整报告</button></div>` : ''}
    </section>
  `;
}

function readingHtml(reading, agent) {
  const analysisPath = reading.analysisPath?.length ? reading.analysisPath : [
    { label: '命盘底色', value: reading.evidence?.[0] || '依据当前档案四柱与五行结构' },
    { label: '今日作用', value: reading.evidence?.[2] || '结合今日干支判断作用节奏' },
    { label: '问事落点', value: reading.question ? `围绕“${reading.question}”给出判断` : '将命盘信号落到当前问题与行动上' }
  ];
  return `
    <div class="reading-result" style="--agent-color:${agent.color}">
      <div class="reading-topline"><span class="score-ring">${reading.score}</span><h2>${escapeHtml(reading.title)}</h2></div>
      <p class="brief">${escapeHtml(reading.brief)}</p>
      <div class="analysis-path" aria-label="测算推演链">
        ${analysisPath.map((item, index) => `
          <div class="analysis-step"><span>${index + 1}</span><div><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.value)}</p></div></div>
        `).join('')}
      </div>
      <div class="reading-evidence">${(reading.evidence || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}<span>${reading.generatedBy === 'ai' ? 'AI 综合解读' : '命理规则推演'}</span></div>
      <div class="action-line">${icon('circle-check-big', 15)}<span><strong>今日行动：</strong>${escapeHtml(reading.action)}</span></div>
      ${reading.memory ? `<p class="memory-line">${icon('brain', 13)} ${escapeHtml(reading.memory)}</p>` : ''}
      ${premiumReportHtml(reading)}
      <p class="reading-boundary">测算用于整理趋势与行动线索，不构成医疗、法律、投资或其他专业意见。</p>
    </div>
  `;
}

function messageHtml(message, agent) {
  if (message.role === 'user') return `<div class="message user"><div class="message-content">${escapeHtml(message.content)}</div></div>`;
  return `
    <div class="message assistant" style="--agent-color:${agent.color}">
      <div class="message-meta"><span class="mini-agent">${icon(agent.icon, 13)}</span><strong>${escapeHtml(agent.role)}</strong><span>·</span><span>${new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span></div>
      ${readingHtml(message.content, agent)}
    </div>
  `;
}

async function renderAgentPage(agentId) {
  const agent = currentAgent(agentId);
  const user = currentUser();
  if (!agent || agent.id === 'daily') return navigate('dashboard');
  const key = `${user.id}:${agent.id}`;

  state.lastAgentId = agent.id;
  localStorage.setItem('wendao:last-agent', state.lastAgentId);
  if (!state.conversations[key]) state.conversations[key] = [];
  if (state.legacyServer && !state.conversations[key].length) {
    try {
      state.conversations[key] = (await api(`/api/conversations?userId=${encodeURIComponent(user.id)}&agentId=${agent.id}`)).messages;
      persistDeviceState();
    } catch {}
  }
  const messages = state.conversations[key];
  const selectableAgents = state.agents.filter((item) => item.id !== 'daily');

  $('#main-content').innerHTML = `
    <div class="agent-page" style="--agent-color:${agent.color}">
      <div class="agent-layout">
        <section class="conversation">
          <header class="conversation-head">
            <span class="agent-icon" style="--agent-color:${agent.color}">${icon(agent.icon, 20)}</span>
            <div class="conversation-title"><h1>${escapeHtml(agent.name)} · ${escapeHtml(agent.role)}</h1><p>${escapeHtml(agent.description)}</p></div>
            <label class="mobile-agent-select" aria-label="切换测算方向"><select id="mobile-agent-select">${selectableAgents.map((item) => `<option value="${item.id}" ${item.id === agent.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select>${icon('chevron-down', 13)}</label>
            <span class="memory-chip">${icon('brain', 13)}已读取 ${Math.floor(messages.length / 2)} 轮记忆</span>
          </header>
          <div class="messages" id="messages">
            ${messages.length ? messages.map((message) => messageHtml(message, agent)).join('') : `
              <div class="empty-conversation">
                <span class="empty-seal" style="--agent-color:${agent.color}">${icon(agent.icon, 25)}</span>
                <h2>想从哪里开始测算？</h2>
                <p>我会结合 ${escapeHtml(user.name)} 的四柱、五行、星座与这个方向的历史对话来分析。</p>
                <div class="suggestion-row">${agentSuggestions[agent.id].map((text) => `<button class="suggestion" data-suggestion type="button" style="--agent-color:${agent.color}">${escapeHtml(text)}</button>`).join('')}</div>
              </div>
            `}
          </div>
          <form class="conversation-composer" id="composer">
            <div class="composer-box">
              <textarea id="question-input" rows="1" maxlength="500" placeholder="${escapeHtml(agent.placeholder)}" aria-label="测算问题"></textarea>
              <button class="send-button" type="submit" title="发送问题" aria-label="发送问题">${icon('arrow-up', 19)}</button>
            </div>
            <div class="composer-footnote"><span>记录仅保存到“${escapeHtml(user.name)}”的设备本地记忆</span><span>Enter 发送 · Shift + Enter 换行</span></div>
          </form>
        </section>
        ${contextPanel(user)}
      </div>
    </div>
  `;

  $('#mobile-agent-select')?.addEventListener('change', (event) => navigate(`agent/${event.target.value}`));
  $$('[data-suggestion]').forEach((button) => button.addEventListener('click', () => {
    $('#question-input').value = button.textContent.trim();
    $('#question-input').focus();
  }));
  $('#composer').addEventListener('submit', (event) => sendQuestion(event, agent));
  $('#question-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      $('#composer').requestSubmit();
    }
  });
  $$('[data-unlock]').forEach((button) => button.addEventListener('click', showPaywall));
  refreshIcons($('#main-content'));
  const messageContainer = $('#messages');
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

async function sendQuestion(event, agent) {
  event.preventDefault();
  if (state.sending) return;
  const input = $('#question-input');
  const question = input.value.trim();
  if (!question) return showToast('先写下一个具体问题', 'message-circle-warning');
  const user = currentUser();
  const key = `${user.id}:${agent.id}`;
  state.sending = true;
  input.value = '';
  state.conversations[key].push({ id: `local-${Date.now()}`, role: 'user', content: question, createdAt: new Date().toISOString() });

  const container = $('#messages');
  container.innerHTML = state.conversations[key].map((message) => messageHtml(message, agent)).join('') + `
    <div class="message assistant" style="--agent-color:${agent.color}"><div class="loading-reading"><span class="mini-agent">${icon(agent.icon, 13)}</span><span>正在结合命盘与历史对话推演</span><span class="loading-dots"><span></span><span></span><span></span></span></div></div>
  `;
  refreshIcons(container);
  container.scrollTop = container.scrollHeight;

  try {
    const payload = await api('/api/reading', {
      method: 'POST',
      body: JSON.stringify({ user: profilePayload(user), agentId: agent.id, question, history: state.conversations[key].slice(0, -1) })
    });
    state.conversations[key].push({ id: `answer-${Date.now()}`, role: 'assistant', content: payload.reading, createdAt: new Date().toISOString() });
    state.conversations[key] = state.conversations[key].slice(-40);
    persistDeviceState();
  } catch (error) {
    if (state.legacyServer) {
      try {
        const payload = await api('/api/reading', { method: 'POST', body: JSON.stringify({ userId: user.id, agentId: agent.id, question }) });
        state.conversations[key].push({ id: `answer-${Date.now()}`, role: 'assistant', content: payload.reading, createdAt: new Date().toISOString() });
        state.conversations[key] = state.conversations[key].slice(-40);
        persistDeviceState();
      } catch (legacyError) {
        state.conversations[key].pop();
        showToast(legacyError.message, 'circle-alert');
        input.value = question;
      }
    } else {
      state.conversations[key].pop();
      showToast(error.message, 'circle-alert');
      input.value = question;
    }
  } finally {
    state.sending = false;
    renderAgentPage(agent.id);
  }
}

async function showDaily() {
  closePopover();
  const user = currentUser();
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <section class="modal daily-modal" role="dialog" aria-modal="true" aria-label="每日一测">
        <header class="modal-head"><div><h2>每日一测</h2><p>正在为 ${escapeHtml(user.name)} 整理今日签文</p></div><button class="icon-button" data-modal-x type="button" aria-label="关闭">${icon('x')}</button></header>
        <div class="modal-body"><div class="loading-reading" style="--agent-color:#a9782d">${icon('sparkles')}<span>循今日干支与个人命盘取签</span><span class="loading-dots"><span></span><span></span><span></span></span></div></div>
      </section>
    </div>
  `;
  bindModalClose();
  refreshIcons(root);
  try {
    const date = new Date().toISOString().slice(0, 10);
    const key = `${user.id}:${date}`;
    let reading = state.dailyReadings[key];
    if (!reading) {
      const history = Object.entries(state.dailyReadings)
        .filter(([readingKey]) => readingKey.startsWith(`${user.id}:`))
        .map(([, item]) => ({ role: 'assistant', content: item.verse }));
      try {
        reading = (await api('/api/daily', { method: 'POST', body: JSON.stringify({ user: profilePayload(user), history }) })).reading;
      } catch (error) {
        if (!state.legacyServer) throw error;
        reading = (await api('/api/daily', { method: 'POST', body: JSON.stringify({ userId: user.id }) })).reading;
      }
      state.dailyReadings[key] = reading;
      persistDeviceState();
    }
    root.innerHTML = `
      <div class="modal-backdrop" data-close-modal>
        <section class="modal modal-wide daily-modal" role="dialog" aria-modal="true" aria-labelledby="daily-result-title">
          <header class="modal-head"><div><h2 id="daily-result-title">${formatChineseDate()} · 今日签</h2><p>${escapeHtml(reading.chart.today.lunar)} · ${escapeHtml(reading.chart.today.pillar)}日</p></div><button class="icon-button" data-modal-x type="button" aria-label="关闭">${icon('x')}</button></header>
          <div class="daily-slip">
            <div class="slip-number"><span>问道第</span><strong>${escapeHtml(reading.number)}</strong><span>签</span></div>
            <div class="slip-content">
              <span class="slip-level">${escapeHtml(reading.level)}</span>
              <h3>${escapeHtml(reading.title)}</h3>
              <p class="slip-verse">${escapeHtml(reading.verse)}</p>
              <div class="slip-meta"><span>宜做 <strong>${escapeHtml(reading.action)}</strong></span><span>签色方位 <strong>${escapeHtml(reading.lucky)}</strong></span></div>
              ${reading.memory ? `<p class="memory-line">${icon('brain', 13)} ${escapeHtml(reading.memory)}</p>` : ''}
            </div>
          </div>
          <div class="daily-share-actions">
            <button class="button button-light" data-save-daily type="button">${icon('download', 16)}保存签图</button>
            <button class="button button-light" data-share-daily type="button">${icon('share-2', 16)}分享签图</button>
          </div>
          <canvas class="astrolabe" width="600" height="600" aria-hidden="true"></canvas>
        </section>
      </div>
    `;
    bindModalClose();
    $('[data-save-daily]').addEventListener('click', () => saveDailyImage(reading, user));
    $('[data-share-daily]').addEventListener('click', () => shareDailyImage(reading, user));
    refreshIcons(root);
    requestAnimationFrame(() => drawAstrolabe($('.astrolabe', root)));
  } catch (error) {
    closeModal();
    showToast(error.message, 'circle-alert');
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 6) {
  const chars = [...String(text)];
  let line = '';
  let lineIndex = 0;
  for (let index = 0; index < chars.length && lineIndex < maxLines; index += 1) {
    const test = line + chars[index];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight);
      line = chars[index];
      lineIndex += 1;
    } else {
      line = test;
    }
  }
  if (lineIndex < maxLines && line) ctx.fillText(line, x, y + lineIndex * lineHeight);
}

function createDailyImageBlob(reading, user) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#202a27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(220,185,120,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 72, 936, 1296);
  ctx.strokeRect(92, 92, 896, 1256);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dcb978';
  ctx.font = '32px "Songti SC", serif';
  ctx.fillText('问 道 · 每 日 一 测', 540, 150);
  ctx.font = '36px "Songti SC", serif';
  ctx.fillText(`${formatChineseDate()} · ${reading.chart.today.pillar}日`, 540, 220);
  ctx.font = '700 96px "Songti SC", serif';
  ctx.fillText(reading.level, 540, 390);
  ctx.fillStyle = '#ffffff';
  ctx.font = '64px "Songti SC", serif';
  ctx.fillText(reading.title, 540, 510);
  ctx.fillStyle = '#d8dfdb';
  ctx.font = '38px "Songti SC", serif';
  drawWrappedText(ctx, reading.verse, 540, 620, 720, 66, 5);
  ctx.strokeStyle = 'rgba(220,185,120,0.35)';
  ctx.beginPath();
  ctx.moveTo(220, 900);
  ctx.lineTo(860, 900);
  ctx.stroke();
  ctx.fillStyle = '#aeb9b4';
  ctx.font = '28px "PingFang SC", sans-serif';
  ctx.fillText('宜 做', 540, 980);
  ctx.fillStyle = '#ffffff';
  ctx.font = '44px "Songti SC", serif';
  ctx.fillText(reading.action, 540, 1045);
  ctx.fillStyle = '#aeb9b4';
  ctx.font = '27px "PingFang SC", sans-serif';
  ctx.fillText(`签色方位  ${reading.lucky}`, 540, 1130);
  ctx.fillText(`${user.name} · 第 ${reading.number} 签 · 仅作趋势参考`, 540, 1285);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('签图生成失败')), 'image/png'));
}

async function saveDailyImage(reading, user) {
  try {
    const blob = await createDailyImageBlob(reading, user);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `问道-${user.name}-${reading.chart.today.date}-今日签.png`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('今日签图已保存', 'circle-check');
  } catch (error) {
    showToast(error.message, 'circle-alert');
  }
}

async function shareDailyImage(reading, user) {
  try {
    const blob = await createDailyImageBlob(reading, user);
    const file = new File([blob], `问道-${reading.chart.today.date}-今日签.png`, { type: 'image/png' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: '问道 · 今日签', text: `${reading.level}｜${reading.title}`, files: [file] });
    } else {
      await saveDailyImage(reading, user);
      showToast('当前浏览器不支持直接分享，已保存签图', 'download');
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('未能打开分享，请改用保存签图', 'circle-alert');
  }
}

function profileForm(user, isNew) {
  const location = user ? resolvedBirthplaceDetail(user) : {
    country: '中国', province: '', city: '', county: '', town: '', village: ''
  };
  const focusOptions = state.focusOptions.length
    ? state.focusOptions
    : ['事业', '爱情', '健康', '社交', '官运', '考运', '财富', '情绪'];
  const selectedFocus = new Set(user?.focus || []);
  const customFocus = [...selectedFocus].filter((item) => !focusOptions.includes(item));
  const focusTag = (item, custom = false) => `
    <button class="focus-tag ${selectedFocus.has(item) ? 'selected' : ''} ${custom ? 'custom' : ''}" data-focus-tag="${escapeHtml(item)}" ${custom ? 'data-custom-focus' : ''} type="button" aria-pressed="${selectedFocus.has(item)}">
      <span>${escapeHtml(item)}</span>${custom ? icon('x', 12) : ''}
    </button>
  `;
  return `
    <form id="profile-form">
      <div class="form-grid">
        <div class="form-field"><label for="profile-name">姓名 / 称呼</label><input id="profile-name" name="name" required maxlength="20" value="${escapeHtml(user?.name || '')}" placeholder="用于区分测算档案"></div>
        <div class="form-field"><label for="profile-gender">性别</label><select id="profile-gender" name="gender"><option ${user?.gender === '女' ? 'selected' : ''}>女</option><option ${user?.gender === '男' ? 'selected' : ''}>男</option><option ${user?.gender === '未填写' ? 'selected' : ''}>未填写</option></select></div>
        <div class="form-field"><label for="profile-date">公历出生日期</label><input id="profile-date" name="birthDate" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0,10)}" required value="${escapeHtml(user?.birthDate || '1995-01-01')}"></div>
        <div class="form-field"><label for="profile-time">出生时间</label><input id="profile-time" name="birthTime" type="time" required value="${escapeHtml(user?.birthTime || '12:00')}"><span class="field-note">尽量填写准确时间，用于计算时柱</span></div>
        <section class="form-section full" aria-labelledby="birthplace-title">
          <div class="form-section-head"><strong id="birthplace-title">出生地</strong><span>请按出生时的行政区划填写，县级以下可按实际情况补充</span></div>
          <div class="location-grid">
            <div class="form-field"><label for="place-country">国家 / 地区</label><input id="place-country" name="birthplaceCountry" maxlength="24" required value="${escapeHtml(location.country || '中国')}" placeholder="中国"></div>
            <div class="form-field"><label for="place-province">省份 / 州</label><input id="place-province" name="birthplaceProvince" maxlength="24" required value="${escapeHtml(location.province || '')}" placeholder="浙江省"></div>
            <div class="form-field"><label for="place-city">城市</label><input id="place-city" name="birthplaceCity" maxlength="24" required value="${escapeHtml(location.city || '')}" placeholder="绍兴市"></div>
            <div class="form-field"><label for="place-county">县 / 区</label><input id="place-county" name="birthplaceCounty" maxlength="24" value="${escapeHtml(location.county || '')}" placeholder="新昌县"></div>
            <div class="form-field"><label for="place-town">镇 / 街道</label><input id="place-town" name="birthplaceTown" maxlength="24" value="${escapeHtml(location.town || '')}" placeholder="儒岙镇"></div>
            <div class="form-field"><label for="place-village">村 / 社区</label><input id="place-village" name="birthplaceVillage" maxlength="24" value="${escapeHtml(location.village || '')}" placeholder="南山村"></div>
          </div>
        </section>
        <section class="form-section full" aria-labelledby="focus-title">
          <div class="form-section-head"><strong id="focus-title">当前关注</strong><span>可多选，也可以添加自己的标签</span></div>
          <div class="focus-tags" id="focus-tags" role="group" aria-label="当前关注标签">
            ${focusOptions.map((item) => focusTag(item)).join('')}
            ${customFocus.map((item) => focusTag(item, true)).join('')}
          </div>
          <div class="custom-focus-row">
            <input id="custom-focus-input" maxlength="12" placeholder="输入自定义标签，例如：创业">
            <button class="icon-button tag-add-button" id="add-focus-tag" type="button" title="添加关注标签" aria-label="添加关注标签">${icon('plus', 17)}</button>
          </div>
          <span class="field-note">最多选择 12 个标签，每个自定义标签不超过 12 个字</span>
        </section>
      </div>
    </form>
  `;
}

function bindProfileFocusControls() {
  const tags = $('#focus-tags');
  const input = $('#custom-focus-input');
  tags.addEventListener('click', (event) => {
    const button = event.target.closest('[data-focus-tag]');
    if (!button) return;
    if (button.hasAttribute('data-custom-focus')) {
      button.remove();
      return;
    }
    const selected = !button.classList.contains('selected');
    if (selected && $$('.focus-tag.selected', tags).length >= 12) return showToast('最多选择 12 个关注标签', 'circle-alert');
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const addCustomTag = () => {
    const label = input.value.trim().replace(/\s+/g, ' ').slice(0, 12);
    if (!label) return;
    const existing = $$('[data-focus-tag]', tags).find((button) => button.dataset.focusTag === label);
    if (existing) {
      existing.classList.add('selected');
      existing.setAttribute('aria-pressed', 'true');
      input.value = '';
      return;
    }
    if ($$('.focus-tag.selected', tags).length >= 12) return showToast('最多选择 12 个关注标签', 'circle-alert');
    tags.insertAdjacentHTML('beforeend', `
      <button class="focus-tag selected custom" data-focus-tag="${escapeHtml(label)}" data-custom-focus type="button" aria-pressed="true" aria-label="移除自定义标签 ${escapeHtml(label)}">
        <span>${escapeHtml(label)}</span>${icon('x', 12)}
      </button>
    `);
    input.value = '';
    refreshIcons(tags);
  };

  $('#add-focus-tag').addEventListener('click', addCustomTag);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomTag();
    }
  });
}

function showProfileModal(isNew) {
  closePopover();
  const user = isNew ? null : currentUser();
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <header class="modal-head"><div><h2 id="profile-modal-title">${isNew ? '新增档案' : '编辑个人档案'}</h2><p>每份档案的命盘与 Agent 记忆相互独立，仅保存在此设备</p></div><button class="icon-button" data-modal-x type="button" aria-label="关闭">${icon('x')}</button></header>
        <div class="modal-body">${profileForm(user, isNew)}</div>
        <footer class="modal-actions"><button class="button button-secondary" data-modal-x type="button">取消</button><button class="button button-primary" data-save-profile type="button">${icon('check', 16)}保存档案</button></footer>
      </section>
    </div>
  `;
  bindModalClose();
  bindProfileFocusControls();
  $('[data-save-profile]').addEventListener('click', () => saveProfile(isNew));
  refreshIcons(root);
  setTimeout(() => $('#profile-name')?.focus(), 0);
}

async function saveProfile(isNew) {
  const form = $('#profile-form');
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data.birthplaceDetail = {
    country: String(data.birthplaceCountry || '').trim(),
    province: String(data.birthplaceProvince || '').trim(),
    city: String(data.birthplaceCity || '').trim(),
    county: String(data.birthplaceCounty || '').trim(),
    town: String(data.birthplaceTown || '').trim(),
    village: String(data.birthplaceVillage || '').trim()
  };
  data.birthplace = Object.values(data.birthplaceDetail).filter(Boolean).join(' · ');
  ['birthplaceCountry', 'birthplaceProvince', 'birthplaceCity', 'birthplaceCounty', 'birthplaceTown', 'birthplaceVillage'].forEach((key) => delete data[key]);
  data.focus = $$('.focus-tag.selected', form).map((button) => button.dataset.focusTag).slice(0, 12);
  const existing = isNew ? null : currentUser();
  data.id = existing?.id || `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  data.member = existing?.member || false;
  data.createdAt = existing?.createdAt || new Date().toISOString();
  const button = $('[data-save-profile]');
  button.disabled = true;
  button.textContent = '正在计算命盘…';
  try {
    let payload;
    try {
      payload = await api('/api/profile', { method: 'POST', body: JSON.stringify({ user: data }) });
    } catch (error) {
      if (!state.legacyServer) throw error;
      payload = await api(isNew ? '/api/users' : `/api/users/${currentUser().id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(data)
      });
    }
    if (isNew) {
      payload.user.birthplaceDetail = resolvedBirthplaceDetail({ ...payload.user, birthplace: data.birthplace });
      state.users.push(payload.user);
      state.currentUserId = payload.user.id;
    } else {
      payload.user.birthplaceDetail = resolvedBirthplaceDetail({ ...payload.user, birthplace: data.birthplace });
      const index = state.users.findIndex((item) => item.id === payload.user.id);
      state.users[index] = payload.user;
    }
    state.overviews = {};
    persistDeviceState();
    closeModal();
    renderUserControls();
    renderNavigation();
    renderRoute();
    showToast(isNew ? '测算档案已建立' : '命盘资料已更新', 'circle-check');
  } catch (error) {
    button.disabled = false;
    button.innerHTML = `${icon('check', 16)}保存档案`;
    refreshIcons(button);
    showToast(error.message, 'circle-alert');
  }
}

function showPaywall() {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <div class="paywall-hero">
          <div class="paywall-copy"><span class="member-badge">${icon('crown', 12)}明鉴会员</span><h2 id="paywall-title">看见结论背后的完整推演</h2><p>详细版展开十神与旺衰依据、大运背景、未来四年流年、方案利弊和改变策略的触发条件。</p></div>
          <div class="paywall-seal"><span>览</span></div>
        </div>
        <div class="benefit-list">
          <div class="benefit">${icon('scroll-text')}<strong>完整报告</strong><p>解锁多年度推演、关键年份、风险对照与明确结论。</p></div>
          <div class="benefit">${icon('brain-circuit')}<strong>长期记忆</strong><p>每个 Agent 独立延续这个用户的历史关注。</p></div>
          <div class="benefit">${icon('users-round')}<strong>多人档案</strong><p>家庭成员或伙伴的资料与记录互不混用。</p></div>
        </div>
        <div class="pricing-line"><div class="price"><strong>¥29</strong><small>/ 月 · 原型演示价</small></div><button class="button button-primary" data-confirm-unlock type="button">${icon('unlock-keyhole', 16)}立即解锁详细版</button></div>
        <p class="demo-note">当前为产品原型：点击后会直接模拟开通，不会产生真实扣款。</p>
      </section>
    </div>
  `;
  bindModalClose();
  $('[data-confirm-unlock]').addEventListener('click', unlockMember);
  refreshIcons(root);
}

async function unlockMember() {
  const button = $('[data-confirm-unlock]');
  button.disabled = true;
  button.textContent = '正在开通…';
  try {
    let user = { ...currentUser(), member: true };
    try {
      user = (await api('/api/unlock', { method: 'POST', body: JSON.stringify({ user: profilePayload(user) }) })).user;
    } catch (error) {
      if (!state.legacyServer) throw error;
      user = (await api('/api/unlock', { method: 'POST', body: JSON.stringify({ userId: currentUser().id }) })).user;
    }
    const index = state.users.findIndex((item) => item.id === user.id);
    state.users[index] = user;
    Object.keys(state.conversations).filter((key) => key.startsWith(`${user.id}:`)).forEach((key) => {
      state.conversations[key].forEach((message) => {
        if (message.role === 'assistant') message.content.detailsLocked = false;
      });
    });
    persistDeviceState();
    closeModal();
    renderUserControls();
    await renderRoute();
    showToast('详细报告已解锁', 'badge-check');
  } catch (error) {
    button.disabled = false;
    showToast(error.message, 'circle-alert');
  }
}

function bindModalClose() {
  $$('[data-modal-x]').forEach((button) => button.addEventListener('click', closeModal));
  $('[data-close-modal]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
}

function closeModal() {
  $('#modal-root').innerHTML = '';
}

function showToast(message, iconName = 'info') {
  const root = $('#toast-root');
  root.innerHTML = `<div class="toast">${icon(iconName, 16)}<span>${escapeHtml(message)}</span></div>`;
  refreshIcons(root);
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { root.innerHTML = ''; }, 2800);
}

async function renderRoute() {
  state.route = routeFromHash();
  renderNavigation();
  if (state.route.startsWith('agent/')) {
    await renderAgentPage(state.route.split('/')[1]);
  } else {
    renderDashboard();
  }
  $('#main-content').focus({ preventScroll: true });
}

async function init() {
  $('#main-content').innerHTML = `<div class="loading-state"><div>${icon('loader-circle', 22)}<p>正在准备你的命盘空间</p></div></div>`;
  refreshIcons();
  try {
    const payload = await api('/api/bootstrap');
    state.legacyServer = payload.storageMode !== 'device';
    state.agents = payload.agents;
    state.focusOptions = payload.focusOptions || [];
    state.aiConnected = payload.aiConnected;
    state.conversations = readDeviceJson(DEVICE_KEYS.conversations, {});
    state.dailyReadings = readDeviceJson(DEVICE_KEYS.daily, {});
    state.users = readDeviceJson(DEVICE_KEYS.profiles, []);

    if (!state.users.length && Array.isArray(payload.users) && payload.users.length) {
      state.users = payload.users;
    }

    if (!state.users.length && location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
      try {
        const legacy = await api('/api/legacy-export');
        state.users = legacy.users || [];
        if (!Object.keys(state.conversations).length) state.conversations = legacy.conversations || {};
        if (!Object.keys(state.dailyReadings).length) state.dailyReadings = legacy.dailyReadings || {};
      } catch {}
    }

    if (!state.users.length) {
      const demo = {
        id: 'profile-demo', name: '体验档案', gender: '未填写', birthDate: '1995-01-01', birthTime: '12:00',
        birthplace: '中国 · 浙江省 · 杭州市',
        birthplaceDetail: { country: '中国', province: '浙江省', city: '杭州市', county: '', town: '', village: '' },
        focus: ['事业', '爱情'], member: false, createdAt: new Date().toISOString()
      };
      state.users = [(await api('/api/profile', { method: 'POST', body: JSON.stringify({ user: demo }) })).user];
    } else if (!state.legacyServer) {
      state.users = await Promise.all(state.users.map(async (user) => {
        try {
          return (await api('/api/profile', { method: 'POST', body: JSON.stringify({ user: profilePayload(user) }) })).user;
        } catch {
          return user;
        }
      }));
    }

    state.users = state.users.map((user) => ({ ...user, birthplaceDetail: resolvedBirthplaceDetail(user) }));
    if (!state.users.some((user) => user.id === state.currentUserId)) state.currentUserId = state.users[0]?.id || '';
    persistDeviceState();
    renderUserControls();
    await renderRoute();
  } catch (error) {
    $('#main-content').innerHTML = `<div class="error-state"><div>${icon('circle-alert', 28)}<h2>应用没有正常启动</h2><p>${escapeHtml(error.message)}</p><button class="button button-primary" onclick="location.reload()">重新加载</button></div></div>`;
    refreshIcons();
  }
}

$('#user-switcher').addEventListener('click', (event) => { event.stopPropagation(); showUserPopover(event.currentTarget); });
$('#mobile-user').addEventListener('click', (event) => { event.stopPropagation(); showUserPopover(event.currentTarget); });
$('#settings-button').addEventListener('click', () => showProfileModal(false));
document.addEventListener('click', (event) => { if (!event.target.closest('.popover') && !event.target.closest('#user-switcher') && !event.target.closest('#mobile-user')) closePopover(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closePopover(); closeModal(); }
});
window.addEventListener('hashchange', renderRoute);

init();
