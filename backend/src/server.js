require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const marksRoutes = require('./routes/marks');
const timetableRoutes = require('./routes/timetable');
const notificationsRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const tilesRoutes = require('./routes/tiles');
const resultsRoutes = require('./routes/results');

const app = express();

app.use(cors());
app.use(express.json());

// Locally (npm start), also serve the two static frontends from this same
// process so `npm start` alone is enough to try the whole app. On Vercel,
// frontend/ and admin/ are deployed as their own static sites and this
// block never runs (see vercel.json), so it's safe either way.
if (require.main === module) {
  app.use('/', express.static(path.join(__dirname, '..', '..', 'frontend')));
  app.use('/admin', express.static(path.join(__dirname, '..', '..', 'admin')));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tiles', tilesRoutes);
app.use('/api/results', resultsRoutes);

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler — every route's catch block calls next(err), which lands here.
// Without this, a thrown/rejected error in an async route would otherwise hang the
// request or leak a raw stack trace to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start a listening server when run directly (`node src/server.js` / `npm start`).
// When imported by api/index.js on Vercel, we just want the configured `app` object —
// Vercel's runtime calls it as a request handler, it doesn't need .listen().
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    console.log(`Student app:  http://localhost:${PORT}/`);
    console.log(`Admin panel:  http://localhost:${PORT}/admin/`);
  });
}

module.exports = app;
