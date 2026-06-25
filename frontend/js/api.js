const API_BASE = '/api';

const Api = {
  getToken() {
    return window.__authToken || null;
  },
  setToken(token) {
    window.__authToken = token;
  },
  clearToken() {
    window.__authToken = null;
  },

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      const message = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  },

  get(path) {
    return this.request('GET', path);
  },
  post(path, body) {
    return this.request('POST', path, body);
  },
  del(path) {
    return this.request('DELETE', path);
  },

  // Auth
  studentLogin(rollNo, password) {
    return this.post('/auth/student/login', { rollNo, password });
  },

  // Profile
  getProfile() {
    return this.get('/profile/me');
  },

  // Tiles
  getTiles() {
    return this.get('/tiles/me');
  },

  // Attendance
  getMyAttendance() {
    return this.get('/attendance/me');
  },

  // Marks
  getMyMarks() {
    return this.get('/marks/me');
  },

  // Timetable
  getMyTimetable(day) {
    return this.get(`/timetable/me${day ? `?day=${encodeURIComponent(day)}` : ''}`);
  },
  getMyTimetableDays() {
    return this.get('/timetable/me/days');
  },

  // Results
  getMyResults() {
    return this.get('/results/me');
  },
  getMySemesterResults(semesterNum) {
    return this.get(`/results/me/semester/${semesterNum}`);
  },

  // Attendance session log
  getMyAttendanceLog() {
    return this.get('/attendance/log/me');
  },

  // Notifications
  getMyNotifications() {
    return this.get('/notifications/me');
  },
  markNotificationRead(id) {
    return this.post(`/notifications/me/${id}/read`);
  },
};
