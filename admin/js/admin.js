const API_BASE = '/api';
let ADMIN_TOKEN = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (ADMIN_TOKEN) headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

const ADMIN_TOKEN_KEY = 'campus_connect_admin_token';

// ===================== LOGIN =====================
$('#admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#admin-username').value.trim();
  const password = $('#admin-password').value;
  const errEl = $('#admin-login-error');
  errEl.hidden = true;
  try {
    const result = await api('POST', '/auth/admin/login', { username, password });
    ADMIN_TOKEN = result.token;
    try { sessionStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_TOKEN); } catch (e) {}
    await enterAdminApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

async function tryAutoLogin() {
  let token = null;
  try { token = sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch (e) {}
  if (!token) return;
  ADMIN_TOKEN = token;
  try {
    await api('GET', '/attendance/admin/students');
    await enterAdminApp();
  } catch (e) {
    ADMIN_TOKEN = null;
    try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch (e2) {}
  }
}

$('#admin-logout').addEventListener('click', () => {
  ADMIN_TOKEN = null;
  try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch (e) {}
  $('#admin-app').hidden = true;
  $('#admin-login-view').hidden = false;
  $('#admin-login-form').reset();
});

// ===================== APP STATE =====================
const state = {
  students: [],
  subjects: [],
};

async function enterAdminApp() {
  $('#admin-login-view').hidden = true;
  $('#admin-app').hidden = false;

  const [students, subjects] = await Promise.all([
    api('GET', '/attendance/admin/students'),
    api('GET', '/attendance/admin/subjects'),
  ]);
  state.students = students;
  state.subjects = subjects;

  populateStudentSelect($('#att-student-select'));
  populateStudentSelect($('#marks-student-select'));
  populateStudentSelect($('#tt-student-select'));
  populateStudentSelect($('#log-student-select'));
  populateStudentSelect($('#results-student-select'));
  populateSubjectSelect($('#session-subject-select'));
  populateSubjectSelect($('#marks-subject-select'));
  populateSubjectSelect($('#tt-subject-select'));
  populateSubjectSelect($('#log-subject-select'));
  populateSubjectSelect($('#results-subject-select'));
  populateNotifTargets();
  renderSessionCheckboxes();

  await loadAttendanceTab();
  await loadAttendanceLogTab();
  await loadMarksTab();
  await loadResultsTab();
  await loadTimetableTab();
  await loadTilesTab();
}

function populateStudentSelect(selectEl) {
  selectEl.innerHTML = state.students
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.rollNo)})</option>`)
    .join('');
}
function populateSubjectSelect(selectEl) {
  selectEl.innerHTML = state.subjects
    .map((s) => `<option value="${s.id}">${escapeHtml(s.code)} - ${escapeHtml(s.name)}</option>`)
    .join('');
}
function populateNotifTargets() {
  const sel = $('#notif-target');
  const studentOptions = state.students
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.rollNo)})</option>`)
    .join('');
  sel.innerHTML = `<option value="broadcast">Broadcast to all students</option>${studentOptions}`;
}

// ===================== TABS =====================
$$('.admin-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.admin-nav-item').forEach((b) => b.classList.toggle('is-active', b === btn));
    $$('.admin-tab').forEach((tab) => { tab.hidden = tab.id !== `tab-${btn.dataset.tab}`; });
  });
});

// ===================== ATTENDANCE TAB (core feature) =====================
function pctClass(pct) {
  if (pct >= 75) return 'pct-good';
  if (pct >= 50) return 'pct-mid';
  return 'pct-bad';
}

async function loadAttendanceTab() {
  const studentId = Number($('#att-student-select').value || state.students[0]?.id);
  if (!studentId) return;
  const data = await api('GET', `/attendance/admin/student/${studentId}`);
  $('#att-aggregate-pill').textContent = `Aggregate: ${data.aggregate}%`;

  const rowsHtml = state.subjects.map((subject) => {
    const rec = data.records.find((r) => r.subjectId === subject.id) || {
      attended: 0, delivered: 0, dutyLeaves: 0, lastAttended: '', percent: 0,
    };
    return `
      <tr data-subject-id="${subject.id}">
        <td>${escapeHtml(subject.code)}<br><span style="color:var(--ink-faint);font-size:12px;">${escapeHtml(subject.name)}</span></td>
        <td><input type="number" min="0" class="num-input" data-field="attended" value="${rec.attended}" /></td>
        <td><input type="number" min="0" class="num-input" data-field="delivered" value="${rec.delivered}" /></td>
        <td><input type="number" min="0" class="num-input" data-field="dutyLeaves" value="${rec.dutyLeaves}" /></td>
        <td><input type="date" class="num-input" style="width:130px;" data-field="lastAttended" value="${rec.lastAttended || ''}" /></td>
        <td><span class="pct-tag ${pctClass(rec.percent)}" data-field="percent">${rec.percent}%</span></td>
        <td><button class="row-save-btn" data-action="save-attendance">Save</button></td>
      </tr>`;
  }).join('');

  $('#att-table-wrap').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Subject</th><th>Attended</th><th>Delivered</th><th>Duty Leaves</th><th>Last Attended</th><th>%</th><th></th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;

  $$('button[data-action="save-attendance"]', $('#att-table-wrap')).forEach((btn) => {
    btn.addEventListener('click', () => saveAttendanceRow(btn, studentId));
  });
}

async function saveAttendanceRow(btn, studentId) {
  const row = btn.closest('tr');
  const subjectId = Number(row.dataset.subjectId);
  const attended = Number(row.querySelector('[data-field="attended"]').value || 0);
  const delivered = Number(row.querySelector('[data-field="delivered"]').value || 0);
  const dutyLeaves = Number(row.querySelector('[data-field="dutyLeaves"]').value || 0);
  const lastAttended = row.querySelector('[data-field="lastAttended"]').value || null;

  if (attended > delivered) {
    alert('Attended cannot exceed delivered.');
    return;
  }

  btn.textContent = 'Saving…';
  try {
    const result = await api('POST', '/attendance/admin/update', {
      studentId, subjectId, attended, delivered, dutyLeaves, lastAttended,
    });
    const pct = delivered ? Math.round((result.record.attended / result.record.delivered) * 100) : 0;
    const pctEl = row.querySelector('[data-field="percent"]');
    pctEl.textContent = `${pct}%`;
    pctEl.className = `pct-tag ${pctClass(pct)}`;
    btn.textContent = 'Saved ✓';
    btn.dataset.state = 'saved';
    if (studentId === Number($('#att-student-select').value)) {
      const aggData = await api('GET', `/attendance/admin/student/${studentId}`);
      $('#att-aggregate-pill').textContent = `Aggregate: ${aggData.aggregate}%`;
    }
    setTimeout(() => { btn.textContent = 'Save'; btn.dataset.state = ''; }, 1500);
  } catch (err) {
    btn.textContent = 'Save';
    alert(`Failed to save: ${err.message}`);
  }
}

$('#att-student-select').addEventListener('change', loadAttendanceTab);

// ----- Bulk session marking -----
function renderSessionCheckboxes() {
  $('#session-student-checks').innerHTML = state.students.map((s) => `
    <label class="check-chip">
      <input type="checkbox" value="${s.id}" checked style="display:none;" />
      <span>${escapeHtml(s.name)} (${escapeHtml(s.rollNo)})</span>
    </label>
  `).join('');
  $$('.check-chip', $('#session-student-checks')).forEach((chip) => {
    chip.classList.add('checked');
    chip.addEventListener('click', () => {
      const input = chip.querySelector('input');
      input.checked = !input.checked;
      chip.classList.toggle('checked', input.checked);
    });
  });
  $('#session-date').valueAsDate = new Date();
}

$('#session-submit').addEventListener('click', async () => {
  const subjectId = Number($('#session-subject-select').value);
  const date = $('#session-date').value;
  const studentIds = $$('.check-chip input', $('#session-student-checks'))
    .filter((i) => i.checked)
    .map((i) => Number(i.value));

  const feedback = $('#session-feedback');
  feedback.hidden = true;
  if (studentIds.length === 0) {
    feedback.textContent = 'Select at least one student.';
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
    return;
  }

  try {
    const result = await api('POST', '/attendance/admin/mark-session', {
      subjectId, studentIds, present: true, date,
    });
    feedback.textContent = result.message;
    feedback.className = 'feedback-text';
    feedback.hidden = false;
    await loadAttendanceTab();
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
  }
});

// ===================== ATTENDANCE LOG TAB =====================
async function loadAttendanceLogTab() {
  const studentId = Number($('#log-student-select').value || state.students[0]?.id);
  if (!studentId) return;
  const rows = await api('GET', `/attendance/log/admin/student/${studentId}`);

  $('#log-table-wrap').innerHTML = rows.length ? `
    <table class="data-table">
      <thead><tr><th>Date</th><th>Subject</th><th>Time</th><th>Status</th><th>Faculty</th><th></th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>${escapeHtml(r.date)}</td>
            <td>${escapeHtml(r.subjectCode)}</td>
            <td>${escapeHtml(r.startTime || '')}${r.endTime ? ' – ' + escapeHtml(r.endTime) : ''}</td>
            <td><span class="pct-tag ${r.status === 'P' ? 'pct-good' : 'pct-bad'}">${escapeHtml(r.status)}</span></td>
            <td>${escapeHtml(r.faculty || '—')}${r.facultyUid ? ' (UID: ' + escapeHtml(r.facultyUid) + ')' : ''}</td>
            <td><button class="row-save-btn" data-delete-log="${r.id}" style="background:#D6483B;">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color:var(--ink-faint);">No session history yet for this student.</p>`;

  $$('[data-delete-log]', $('#log-table-wrap')).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this session entry? Note: this does not roll back the aggregate attended/delivered counters — adjust those separately in the Attendance tab if needed.')) return;
      await api('DELETE', `/attendance/log/admin/${btn.dataset.deleteLog}`);
      loadAttendanceLogTab();
    });
  });
}
$('#log-student-select').addEventListener('change', loadAttendanceLogTab);

$('#log-date').valueAsDate = new Date();

$('#log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = $('#log-feedback');
  try {
    const result = await api('POST', '/attendance/log/admin/add', {
      studentId: Number($('#log-student-select').value),
      subjectId: Number($('#log-subject-select').value),
      date: $('#log-date').value,
      startTime: $('#log-start').value,
      endTime: $('#log-end').value,
      status: $('#log-status-select').value,
      faculty: $('#log-faculty').value,
      facultyUid: $('#log-faculty-uid').value,
    });
    feedback.textContent = result.message + ' — aggregate attendance updated too.';
    feedback.className = 'feedback-text';
    feedback.hidden = false;
    $('#log-faculty').value = '';
    $('#log-faculty-uid').value = '';
    loadAttendanceLogTab();
    // Keep the Attendance tab's numbers in sync if it's currently showing the same student.
    if (Number($('#att-student-select').value) === Number($('#log-student-select').value)) {
      loadAttendanceTab();
    }
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
  }
});

// ===================== MARKS TAB =====================
async function loadMarksTab() {
  const studentId = Number($('#marks-student-select').value || state.students[0]?.id);
  if (!studentId) return;
  const rows = await api('GET', `/marks/admin/student/${studentId}`);
  $('#marks-table-wrap').innerHTML = rows.length ? `
    <table class="data-table">
      <thead><tr><th>Subject</th><th>Exam</th><th>Score</th><th>Grade</th><th></th></tr></thead>
      <tbody>
        ${rows.map((m) => `
          <tr>
            <td>${escapeHtml(m.subjectCode)}</td>
            <td>${escapeHtml(m.examType)}</td>
            <td>${m.marksObtained}/${m.maxMarks}</td>
            <td>${escapeHtml(m.grade || '—')}</td>
            <td><button class="row-save-btn" data-delete-mark="${m.id}" style="background:#D6483B;">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color:var(--ink-faint);">No marks yet for this student.</p>`;

  $$('[data-delete-mark]', $('#marks-table-wrap')).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this mark entry?')) return;
      await api('DELETE', `/marks/admin/${btn.dataset.deleteMark}`);
      loadMarksTab();
    });
  });
}
$('#marks-student-select').addEventListener('change', loadMarksTab);

$('#marks-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = $('#marks-feedback');
  try {
    await api('POST', '/marks/admin/update', {
      studentId: Number($('#marks-student-select').value),
      subjectId: Number($('#marks-subject-select').value),
      examType: $('#marks-exam-type').value,
      marksObtained: Number($('#marks-obtained').value),
      maxMarks: Number($('#marks-max').value),
      grade: $('#marks-grade').value,
    });
    feedback.textContent = 'Saved.';
    feedback.className = 'feedback-text';
    feedback.hidden = false;
    $('#marks-form').reset();
    loadMarksTab();
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
  }
});

// ===================== RESULTS / GPA TAB =====================
function gradeTagClass(grade) {
  if (grade === 'F') return 'pct-bad';
  if (['D', 'C'].includes(grade)) return 'pct-mid';
  return 'pct-good';
}

async function loadResultsTab() {
  const studentId = Number($('#results-student-select').value || state.students[0]?.id);
  if (!studentId) return;
  const data = await api('GET', `/results/admin/student/${studentId}`);
  $('#results-cgpa-pill').textContent = `CGPA: ${data.cgpa}`;

  if (!data.semesters.length) {
    $('#results-table-wrap').innerHTML = `<p style="color:var(--ink-faint);">No results entered yet for this student.</p>`;
    return;
  }

  $('#results-table-wrap').innerHTML = data.semesters.map((sem) => `
    <h3 style="font-size:14px; margin: 18px 0 8px;">Semester ${sem.semester} <span style="color:var(--orange-1); font-weight:700;">— TGPA ${sem.tgpa}</span></h3>
    <table class="data-table" style="margin-bottom: 8px;">
      <thead><tr><th>Subject</th><th>Grade</th><th>Credits</th><th></th></tr></thead>
      <tbody>
        ${sem.courses.map((c) => `
          <tr>
            <td>${escapeHtml(c.subjectCode)} - ${escapeHtml(c.subjectName)}</td>
            <td><span class="pct-tag ${gradeTagClass(c.grade)}">${escapeHtml(c.grade)}</span> <span style="color:var(--ink-faint); font-size:12px;">${escapeHtml(c.gradeLabel)}</span></td>
            <td>${c.credits}</td>
            <td><button class="row-save-btn" data-delete-result="${c.id}" style="background:#D6483B;">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `).join('');

  $$('[data-delete-result]', $('#results-table-wrap')).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this grade entry?')) return;
      await api('DELETE', `/results/admin/${btn.dataset.deleteResult}`);
      loadResultsTab();
    });
  });
}
$('#results-student-select').addEventListener('change', loadResultsTab);

$('#results-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = $('#results-feedback');
  try {
    await api('POST', '/results/admin/update', {
      studentId: Number($('#results-student-select').value),
      subjectId: Number($('#results-subject-select').value),
      semester: Number($('#results-semester').value),
      grade: $('#results-grade-select').value,
      credits: Number($('#results-credits').value || 3),
    });
    feedback.textContent = 'Grade saved — TGPA/CGPA recalculated.';
    feedback.className = 'feedback-text';
    feedback.hidden = false;
    loadResultsTab();
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
  }
});

// ===================== TIMETABLE TAB =====================
async function loadTimetableTab() {
  const studentId = Number($('#tt-student-select').value || state.students[0]?.id);
  if (!studentId) return;
  const rows = await api('GET', `/timetable/admin/student/${studentId}`);
  $('#tt-table-wrap').innerHTML = rows.length ? `
    <table class="data-table">
      <thead><tr><th>Day</th><th>Subject</th><th>Time</th><th>Type</th><th>Room</th><th>Group</th><th>Section</th><th></th></tr></thead>
      <tbody>
        ${rows.map((t) => `
          <tr>
            <td>${escapeHtml(t.day)}</td>
            <td>${escapeHtml(t.subjectCode)} - ${escapeHtml(t.subjectName)}</td>
            <td>${escapeHtml(t.startTime)} – ${escapeHtml(t.endTime)}</td>
            <td>${escapeHtml(t.periodType || 'Lecture')}</td>
            <td>${escapeHtml(t.room || '—')}</td>
            <td>${t.group ?? 0}</td>
            <td>${escapeHtml(t.section || '—')}</td>
            <td><button class="row-save-btn" data-delete-tt="${t.id}" style="background:#D6483B;">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color:var(--ink-faint);">No periods scheduled for this student.</p>`;

  $$('[data-delete-tt]', $('#tt-table-wrap')).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this period?')) return;
      await api('DELETE', `/timetable/admin/${btn.dataset.deleteTt}`);
      loadTimetableTab();
    });
  });
}
$('#tt-student-select').addEventListener('change', loadTimetableTab);

$('#tt-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = $('#tt-feedback');
  try {
    await api('POST', '/timetable/admin/update', {
      studentId: Number($('#tt-student-select').value),
      day: $('#tt-day-select').value,
      subjectId: Number($('#tt-subject-select').value),
      startTime: $('#tt-start').value,
      endTime: $('#tt-end').value,
      periodType: $('#tt-period-type').value,
      room: $('#tt-room').value,
      group: $('#tt-group').value,
      section: $('#tt-section').value,
    });
    feedback.textContent = 'Period added.';
    feedback.className = 'feedback-text';
    feedback.hidden = false;
    $('#tt-form').reset();
    loadTimetableTab();
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
  }
});

// ===================== NOTIFICATIONS TAB =====================
$('#notif-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = $('#notif-feedback');
  const target = $('#notif-target').value;
  const title = $('#notif-title').value;
  const body = $('#notif-body').value;
  const sender = $('#notif-sender').value;

  try {
    let result;
    if (target === 'broadcast') {
      result = await api('POST', '/notifications/admin/broadcast', { title, body, sender });
    } else {
      result = await api('POST', '/notifications/admin/send', { studentId: Number(target), title, body, sender });
    }
    feedback.textContent = result.message;
    feedback.className = 'feedback-text';
    feedback.hidden = false;
    $('#notif-form').reset();
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = 'feedback-text is-error';
    feedback.hidden = false;
  }
});

// ===================== TILES TAB =====================
async function loadTilesTab() {
  const tiles = await api('GET', '/tiles/admin');
  $('#tiles-list').innerHTML = tiles.map((t) => `
    <div class="tile-admin-row">
      <span class="tile-admin-label">${escapeHtml(t.label)}</span>
      <label class="switch">
        <input type="checkbox" data-tile-id="${t.id}" ${t.enabled ? 'checked' : ''} />
        <span class="track"></span>
      </label>
    </div>
  `).join('');

  $$('[data-tile-id]', $('#tiles-list')).forEach((input) => {
    input.addEventListener('change', async () => {
      await api('POST', '/tiles/admin/toggle', { id: Number(input.dataset.tileId), enabled: input.checked });
    });
  });
}

// ===================== BOOT =====================
tryAutoLogin();
