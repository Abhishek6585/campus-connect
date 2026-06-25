const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, adminOnly, studentOnly } = require('../middleware/auth');
const { getAggregateAttendance } = require('../utils/attendanceHelpers');
const { computeCGPA } = require('../utils/gradeHelpers');

const router = express.Router();

// GET /api/tiles/me -> enabled tiles with live badges computed from real data
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const allTiles = await db.all('tiles');
    const tiles = allTiles.filter((t) => t.enabled);

    const unread = await db.find('notifications', (n) => n.studentId === req.user.id && !n.read);
    const aggregateAttendance = await getAggregateAttendance(req.user.id);
    const marksRows = await db.find('marks', (m) => m.studentId === req.user.id);

    const resultRows = await db.find('results', (r) => r.studentId === req.user.id);
    const bySemester = {};
    resultRows.forEach((r) => {
      if (!bySemester[r.semester]) bySemester[r.semester] = [];
      bySemester[r.semester].push(r);
    });
    const cgpa = computeCGPA(Object.values(bySemester));

    const withLiveBadges = tiles.map((t) => {
      if (t.key === 'announce') return { ...t, badge: String(unread.length) };
      if (t.key === 'attendance') return { ...t, badge: `${aggregateAttendance}%` };
      if (t.key === 'view_marks') return { ...t, badge: marksRows.length ? String(marksRows.length) : null };
      if (t.key === 'results') return { ...t, badge: cgpa ? String(cgpa) : null };
      return t;
    });

    res.json(withLiveBadges);
  } catch (err) { next(err); }
});

// GET /api/tiles/admin -> all tiles (including disabled) for admin management
router.get('/admin', authRequired, adminOnly, async (req, res, next) => {
  try {
    res.json(await db.all('tiles'));
  } catch (err) { next(err); }
});

// POST /api/tiles/admin/toggle  { id, enabled }
router.post('/admin/toggle', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { id, enabled } = req.body;
    if (id == null || enabled == null) return res.status(400).json({ error: 'id and enabled are required' });
    const updated = await db.update('tiles', Number(id), { enabled: Boolean(enabled) });
    if (!updated) return res.status(404).json({ error: 'Tile not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
