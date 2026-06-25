// ===================== STATE =====================
const state = {
  student: null,
  tiles: [],
};

const TOKEN_STORAGE_KEY = 'campus_connect_token';

// Persist token via in-memory variable + a cookie-free fallback (no localStorage per artifact rules,
// but this is a real static site served by our own backend, so sessionStorage is fine here).
function saveToken(token) {
  Api.setToken(token);
  try { sessionStorage.setItem(TOKEN_STORAGE_KEY, token); } catch (e) {}
}
function restoreToken() {
  try {
    const t = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (t) Api.setToken(t);
    return t;
  } catch (e) { return null; }
}
function clearStoredToken() {
  Api.clearToken();
  try { sessionStorage.removeItem(TOKEN_STORAGE_KEY); } catch (e) {}
}

// ===================== ICONS =====================
const ICONS = {
  exam: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4"/><path d="M9 11l1.5 1.5L14 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 15h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  'calendar-check': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 14l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'people-star': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M5 20c0-3 3-5 7-5s7 2 7 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  barcode: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M4 4v4M8 4v6M12 4v4M16 4v6M20 4v4M4 16v4M8 14v6M12 16v4M16 14v6M20 16v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="11" r="2.4" stroke="currentColor" stroke-width="1.2"/></svg>',
  'doc-check': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4"/><path d="M9 13l1.6 1.6L15 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  megaphone: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 10v4l4 1 9 4V5L7 9l-4 1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M19 9c1 1 1 5 0 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  'grad-cap': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M2 8l10-4 10 4-10 4-10-4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" stroke="currentColor" stroke-width="1.4"/></svg>',
  'cash-hand': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 13c2-3 5-4 7-2l7 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="7" r="3" stroke="currentColor" stroke-width="1.4"/></svg>',
  'clipboard-check': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M9 3h6v3H9z" stroke="currentColor" stroke-width="1.4"/><path d="M9 13l1.8 1.8L15 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'doc-pencil': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4"/><path d="M9 17l1-3 6-6 2 2-6 6-3 1Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  'doc-chart': '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4"/><path d="M9 17v-4M12 17v-7M15 17v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

function iconFor(key) {
  return ICONS[key] || ICONS['doc-check'];
}

// ===================== DOM HELPERS =====================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

// ===================== LOGIN =====================
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rollNo = $('#login-rollno').value.trim();
  const password = $('#login-password').value;
  const errorEl = $('#login-error');
  errorEl.hidden = true;

  try {
    const result = await Api.studentLogin(rollNo, password);
    saveToken(result.token);
    state.student = result.student;
    await enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

async function tryAutoLogin() {
  const token = restoreToken();
  if (!token) return false;
  try {
    state.student = await Api.getProfile();
    await enterApp();
    return true;
  } catch (e) {
    clearStoredToken();
    return false;
  }
}

async function enterApp() {
  $('#view-login').hidden = true;
  $('#main-app').hidden = false;

  $('#menu-name').textContent = state.student.name;
  $('#menu-roll').textContent = state.student.rollNo;
  $('#menu-program').textContent = state.student.program;
  $('#menu-avatar').src = state.student.photoUrl || defaultAvatarDataUri(state.student.name);

  await refreshNotifBadge();
  navigateTo('dashboard');
}

function defaultAvatarDataUri(name) {
  const initials = (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><rect width="84" height="84" fill="#F2784B"/><text x="50%" y="56%" font-size="30" fill="white" text-anchor="middle" font-family="sans-serif">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ===================== NAVIGATION =====================
const content = $('#content');
const topbarTitle = $('#topbar-title');

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  happenings: 'Happenings',
  rms: 'RMS',
  marks: 'View Marks',
};

async function navigateTo(page) {
  $$('.nav-item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.page === page));
  topbarTitle.textContent = PAGE_TITLES[page] || 'Dashboard';

  content.innerHTML = '<div class="placeholder-page">Loading…</div>';

  try {
    if (page === 'dashboard') return renderDashboard();
    if (page === 'happenings') return renderHappenings();
    if (page === 'rms') return renderRmsStatus();
    if (page === 'marks') return renderMarks();
    return renderPlaceholder(page);
  } catch (err) {
    content.innerHTML = `<div class="placeholder-page"><div class="ico">⚠</div>${escapeHtml(err.message)}</div>`;
  }
}

$$('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===================== DASHBOARD =====================
async function renderDashboard() {
  const [tiles, timetableRes] = await Promise.all([Api.getTiles(), Api.getMyTimetable()]);
  state.tiles = tiles;

  const periods = timetableRes.periods || [];
  const timetableHtml = periods.length
    ? periods.map((p) => `
        <div class="tt-period">
          <div class="tt-time">${escapeHtml(p.startTime)}<br>${escapeHtml(p.endTime)}</div>
          <div class="tt-info">
            <p class="tt-subject">${escapeHtml(p.subjectCode)} - ${escapeHtml(p.subjectName)}</p>
            <p class="tt-meta">${escapeHtml(p.faculty || '')} ${p.room ? '· Room ' + escapeHtml(p.room) : ''}</p>
          </div>
        </div>`).join('')
    : `<div class="empty-box">No TimeTable<br>Available</div>`;

  const tileHtml = tiles.map((t) => `
    <button class="tile" data-tile="${t.key}">
      ${t.badge ? `<span class="tile-badge">${escapeHtml(t.badge)}</span>` : ''}
      <span class="tile-icon">${iconFor(t.icon)}</span>
      <span class="tile-label">${escapeHtml(t.label)}</span>
    </button>
  `).join('');

  content.innerHTML = `
    <div class="dost-row">
      <h2 class="section-heading" style="margin:0;">${escapeHtml(timetableRes.day)}'s Timetable</h2>
      <button class="chip-gradient">Your Dost</button>
    </div>
    ${timetableHtml}
    <button class="pep-banner">PEP Class Undertaking</button>

    <h2 class="section-heading">Add More Tiles</h2>
    <p class="section-sub">Tap a tile to open it.</p>
    <div class="tile-grid">${tileHtml}</div>
  `;

  $$('.tile', content).forEach((btn) => {
    btn.addEventListener('click', () => openTile(btn.dataset.tile));
  });
}

function openTile(key) {
  const routeMap = {
    attendance: renderAttendance,
    view_marks: renderMarks,
    results: renderResults,
    timetable: renderTimetableFull,
  };
  const renderer = routeMap[key];
  if (renderer) {
    topbarTitle.textContent = state.tiles.find((t) => t.key === key)?.label || 'Details';
    content.innerHTML = '<div class="placeholder-page">Loading…</div>';
    renderer().catch((err) => {
      content.innerHTML = `<div class="placeholder-page"><div class="ico">⚠</div>${escapeHtml(err.message)}</div>`;
    });
  } else {
    renderPlaceholder(key);
  }
}

// ===================== ATTENDANCE =====================
function donutSvg(percent) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color = percent >= 75 ? '#3FA66B' : percent >= 50 ? '#F4A93C' : '#E2483B';
  return `
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="${r}" stroke="#EEE8DA" stroke-width="6" fill="none"/>
      <circle cx="32" cy="32" r="${r}" stroke="${color}" stroke-width="6" fill="none"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    </svg>`;
}

async function renderAttendance() {
  const data = await Api.getMyAttendance();
  topbarTitle.textContent = 'Attendance';

  const cardsHtml = data.records.map((r) => `
    <div class="attendance-card">
      <div class="attendance-card-top">
        <div class="attendance-subject">${escapeHtml(r.subjectCode)} - ${escapeHtml(r.subjectName)} <span class="tag">(${escapeHtml(r.subjectType)})</span></div>
        <div class="group-flag">Group: ${escapeHtml(String(r.group))}</div>
      </div>
      <div class="attendance-row-flex">
        <div class="attendance-meta">
          <div>Faculty: <b>${escapeHtml(r.faculty || '—')}</b></div>
          <div>Faculty Seating: <b>${escapeHtml(r.facultySeating || 'NA')}</b></div>
          <div>Last Attended: <b>${escapeHtml(r.lastAttended || '—')}</b></div>
          <div>Attended/Delivered: <b>${r.attended}/${r.delivered}</b></div>
          <div>Duty Leaves: <b>${r.dutyLeaves}</b></div>
        </div>
        <div class="donut">
          ${donutSvg(r.percent)}
          <div class="donut-pct">${r.percent}%</div>
        </div>
      </div>
      <div class="attendance-footer">
        <span>Section: ${escapeHtml(r.section)}</span>
        <span>Roll No: ${escapeHtml(r.rollNoInSection)}</span>
      </div>
    </div>
  `).join('') || `<div class="empty-box">No attendance records yet.</div>`;

  content.innerHTML = `
    <div style="margin: -18px -18px 16px;">
      <div class="aggregate-bar">
        <span class="aggregate-label">AGGREGATE ATTENDANCE</span>
        <span class="aggregate-pill">${data.aggregate}%</span>
      </div>
    </div>
    <div class="log-link-row">
      <button class="log-link-btn" id="btn-view-log">View Session Log →</button>
    </div>
    ${cardsHtml}
  `;

  $('#btn-view-log').addEventListener('click', () => {
    topbarTitle.textContent = 'Attendance';
    content.innerHTML = '<div class="placeholder-page">Loading…</div>';
    renderAttendanceLog().catch((err) => {
      content.innerHTML = `<div class="placeholder-page"><div class="ico">⚠</div>${escapeHtml(err.message)}</div>`;
    });
  });
}

// ===================== ATTENDANCE SESSION LOG =====================
async function renderAttendanceLog() {
  const rows = await Api.getMyAttendanceLog();

  const cardsHtml = rows.length ? rows.map((r) => `
    <div class="log-card">
      <div class="log-stripe ${r.status === 'P' ? 'present' : 'absent'}"></div>
      <div class="log-status-letter">${escapeHtml(r.status)}</div>
      <div class="log-divider"></div>
      <div class="log-info">
        <div class="log-date-line">${formatLogDate(r.date)} <span class="slot-tag">[P]-${escapeHtml(formatTimeRange(r.startTime, r.endTime))}</span></div>
        <div class="log-faculty-line">Faculty : ${escapeHtml(r.faculty || '—')}${r.facultyUid ? ` (UID : ${escapeHtml(r.facultyUid)})` : ''}</div>
      </div>
    </div>
  `).join('') : `<div class="empty-box">No session history yet.</div>`;

  content.innerHTML = `
    <button class="results-back-link" id="btn-back-to-attendance">← Back to Attendance</button>
    ${cardsHtml}
  `;

  $('#btn-back-to-attendance').addEventListener('click', () => {
    content.innerHTML = '<div class="placeholder-page">Loading…</div>';
    renderAttendance();
  });
}

function formatLogDate(iso) {
  try {
    const d = new Date(iso);
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    const year = d.getFullYear();
    return `${dayName},${day} ${month}, ${year}`;
  } catch (e) { return iso; }
}

function formatTimeRange(start, end) {
  const fmt = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const period = (() => {
    const h = Number((end || start || '0:0').split(':')[0]);
    return h >= 12 ? 'PM' : 'AM';
  })();
  return `${fmt(start)}-${fmt(end)} ${period}`;
}

// ===================== MARKS =====================
async function renderMarks() {
  const marks = await Api.getMyMarks();
  topbarTitle.textContent = 'View Marks';

  content.innerHTML = marks.length
    ? marks.map((m) => `
        <div class="marks-card">
          <div class="marks-info">
            <p class="marks-subject">${escapeHtml(m.subjectCode)} - ${escapeHtml(m.subjectName)}</p>
            <p class="marks-exam">${escapeHtml(m.examType)}</p>
          </div>
          <div class="marks-score">
            <div class="num">${m.marksObtained}/${m.maxMarks}</div>
            <div class="grade">Grade: ${escapeHtml(m.grade || '—')}</div>
          </div>
        </div>
      `).join('')
    : `<div class="empty-box">No marks published yet.</div>`;
}

// ===================== RESULTS (CGPA / TGPA / grades) =====================
function bigDonutSvg(value, max = 10) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = c - pct * c;
  return `
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r="${r}" stroke="rgba(255,255,255,0.55)" stroke-width="10" fill="none"/>
      <circle cx="65" cy="65" r="${r}" stroke="#2D6CDF" stroke-width="10" fill="none"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    </svg>`;
}

function medDonutSvg(value, max = 10) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = c - pct * c;
  return `
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r="${r}" stroke="#EAEAEA" stroke-width="7" fill="none"/>
      <circle cx="42" cy="42" r="${r}" stroke="#2D6CDF" stroke-width="7" fill="none"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    </svg>`;
}

function gradeChipClass(grade) {
  if (grade === 'F') return 'grade-fail';
  if (['D', 'C'].includes(grade)) return 'grade-warn';
  return '';
}

async function renderResults() {
  const data = await Api.getMyResults();
  topbarTitle.textContent = 'Result';

  if (!data.semesters.length) {
    content.innerHTML = `<div class="empty-box">No results published yet.</div>`;
    return;
  }

  const semCardsHtml = data.semesters.map((s) => `
    <button class="sem-card" data-semester="${s.semester}">
      <div class="sem-card-head">Semester : ${toRoman(s.semester)}</div>
      <div class="sem-card-body">
        <div class="sem-donut">
          ${medDonutSvg(s.tgpa)}
          <div class="val">${s.tgpa}</div>
        </div>
      </div>
    </button>
  `).join('');

  content.innerHTML = `
    <div class="results-hero">
      <div class="results-donut-big">
        ${bigDonutSvg(data.cgpa)}
        <div class="val">${data.cgpa}</div>
      </div>
      <div class="results-hero-label">Overall Performance</div>
    </div>
    <div class="sem-grid">${semCardsHtml}</div>
  `;

  $$('.sem-card', content).forEach((btn) => {
    btn.addEventListener('click', () => {
      content.innerHTML = '<div class="placeholder-page">Loading…</div>';
      renderSemesterDetail(Number(btn.dataset.semester)).catch((err) => {
        content.innerHTML = `<div class="placeholder-page"><div class="ico">⚠</div>${escapeHtml(err.message)}</div>`;
      });
    });
  });
}

function toRoman(num) {
  const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return map[num - 1] || String(num);
}

async function renderSemesterDetail(semNum) {
  const data = await Api.getMySemesterResults(semNum);
  topbarTitle.textContent = 'Result';

  const rowsHtml = data.courses.map((c) => {
    const cls = gradeChipClass(c.grade);
    return `
      <div class="course-row">
        <div class="course-name">${escapeHtml(c.subjectCode)} :: ${escapeHtml(c.subjectName)}</div>
        <div class="grade-chip-wrap">
          <span class="grade-chip ${cls}">${escapeHtml(c.grade)}</span>
          <span class="grade-label-small ${cls}">${escapeHtml(c.gradeLabel)}</span>
        </div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <button class="results-back-link" id="btn-back-to-results">← Back to Results</button>
    <div class="sem-detail-card">
      <div class="sem-detail-head">
        <span class="sem-name">Semester:${toRoman(data.semester)}</span>
        <span class="sem-tgpa">TGPA : ${data.tgpa}</span>
      </div>
      <div class="sem-detail-cols"><span>Course</span><span>Grade</span></div>
      ${rowsHtml}
    </div>
  `;

  $('#btn-back-to-results').addEventListener('click', () => {
    content.innerHTML = '<div class="placeholder-page">Loading…</div>';
    renderResults();
  });
}

// ===================== TIMETABLE (day-tabbed) =====================
async function renderTimetableFull() {
  topbarTitle.textContent = 'TimeTable';
  const { days } = await Api.getMyTimetableDays();

  if (!days.length) {
    content.innerHTML = `<div class="empty-box">No TimeTable<br>Available</div>`;
    return;
  }

  await renderTimetableDay(days[0], days);
}

async function renderTimetableDay(selectedDay, allDays) {
  const tt = await Api.getMyTimetable(selectedDay);

  const tabsHtml = allDays.map((d) => `
    <button class="day-tab ${d === selectedDay ? 'is-active' : ''}" data-day="${escapeHtml(d)}">${escapeHtml(d)}</button>
  `).join('');

  const periodsHtml = tt.periods.length ? tt.periods.map((p) => `
    <div class="period-card">
      <div class="period-card-head">${escapeHtml(p.startTime)}-${escapeHtml(p.endTime)}</div>
      <div class="period-card-body">
        ${escapeHtml(p.periodType || 'Lecture')} / G:${escapeHtml(String(p.group ?? 0))}<br>
        C:${escapeHtml(p.subjectCode)} / R: ${escapeHtml(p.room || 'NA')}<br>
        S:${escapeHtml(p.section || '')}
      </div>
    </div>
  `).join('') : `<div class="empty-box" style="grid-column: 1 / -1;">No TimeTable<br>Available</div>`;

  content.innerHTML = `
    <div class="day-tabs">${tabsHtml}</div>
    <div class="period-grid">${periodsHtml}</div>
  `;

  $$('.day-tab', content).forEach((btn) => {
    btn.addEventListener('click', () => {
      content.innerHTML = '<div class="placeholder-page">Loading…</div>';
      renderTimetableDay(btn.dataset.day, allDays).catch((err) => {
        content.innerHTML = `<div class="placeholder-page"><div class="ico">⚠</div>${escapeHtml(err.message)}</div>`;
      });
    });
  });
}

// ===================== HAPPENINGS (re-uses notifications feed) =====================
async function renderHappenings() {
  const notes = await Api.getMyNotifications();
  content.innerHTML = notes.length
    ? notes.map((n) => `
        <div class="notif-item">
          <p class="notif-item-title">${escapeHtml(n.title)}</p>
          <p class="notif-item-body">${escapeHtml(n.body)}</p>
          <p class="notif-item-meta">${escapeHtml(n.sender)} (${formatDate(n.createdAt)})</p>
        </div>
      `).join('')
    : `<div class="empty-box">Nothing happening yet.</div>`;
}

// ===================== RMS STATUS =====================
async function renderRmsStatus() {
  const notes = await Api.getMyNotifications();
  const drives = notes.filter((n) => /drive|event/i.test(n.title));
  content.innerHTML = `
    <h2 class="section-heading" style="margin-top:0;">Placement &amp; RMS Updates</h2>
    ${drives.length ? drives.map((n) => `
      <div class="attendance-card">
        <div class="attendance-subject" style="margin-bottom:6px;">${escapeHtml(n.title)}</div>
        <div class="attendance-meta">${escapeHtml(n.body)}</div>
        <div class="attendance-footer"><span>${escapeHtml(n.sender)}</span><span>${formatDate(n.createdAt)}</span></div>
      </div>
    `).join('') : `<div class="empty-box">No RMS updates yet.</div>`}
  `;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return iso; }
}

// ===================== PLACEHOLDER =====================
function renderPlaceholder(key) {
  const label = (state.tiles.find((t) => t.key === key)?.label) || key.replace(/_/g, ' ');
  content.innerHTML = `
    <div class="placeholder-page">
      <div class="ico">🛠</div>
      <p>${escapeHtml(label)} is coming soon.</p>
    </div>`;
}

// ===================== SIDE MENU =====================
$('#btn-open-menu').addEventListener('click', () => { $('#menu-overlay').hidden = false; });
$$('[data-close-menu]').forEach((elx) => elx.addEventListener('click', () => { $('#menu-overlay').hidden = true; }));

$$('.side-menu-list li').forEach((li) => {
  li.addEventListener('click', () => {
    $('#menu-overlay').hidden = true;
    const page = li.dataset.page;
    if (page === 'attendance') {
      topbarTitle.textContent = 'Attendance';
      content.innerHTML = '<div class="placeholder-page">Loading…</div>';
      renderAttendance();
    } else if (page === 'marks') {
      navigateTo('marks');
    } else {
      topbarTitle.textContent = li.textContent.trim();
      content.innerHTML = `<div class="placeholder-page"><div class="ico">🛠</div>${escapeHtml(li.textContent.trim())} is coming soon.</div>`;
    }
  });
});

$('#btn-logout').addEventListener('click', () => {
  clearStoredToken();
  state.student = null;
  $('#menu-overlay').hidden = true;
  $('#main-app').hidden = true;
  $('#view-login').hidden = false;
  $('#login-form').reset();
});

// ===================== NOTIFICATIONS OVERLAY =====================
$('#btn-open-notifications').addEventListener('click', async () => {
  $('#notif-overlay').hidden = false;
  const list = $('#notif-list');
  list.innerHTML = '<div class="notif-empty">Loading…</div>';
  try {
    const notes = await Api.getMyNotifications();
    list.innerHTML = notes.length
      ? notes.map((n) => `
          <div class="notif-item">
            <p class="notif-item-title">${escapeHtml(n.title)}</p>
            <p class="notif-item-body">${escapeHtml(n.body)}</p>
            <p class="notif-item-meta">${escapeHtml(n.sender)} (${formatDate(n.createdAt)})</p>
          </div>`).join('')
      : '<div class="notif-empty">No messages yet.</div>';
    await refreshNotifBadge();
  } catch (err) {
    list.innerHTML = `<div class="notif-empty">${escapeHtml(err.message)}</div>`;
  }
});
$$('[data-close-notif]').forEach((elx) => elx.addEventListener('click', () => { $('#notif-overlay').hidden = true; }));

async function refreshNotifBadge() {
  try {
    const notes = await Api.getMyNotifications();
    const unread = notes.filter((n) => !n.read).length;
    const badge = $('#notif-badge');
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch (e) { /* ignore */ }
}

// ===================== BOOT =====================
tryAutoLogin();
