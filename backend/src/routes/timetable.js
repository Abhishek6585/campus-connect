const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, adminOnly, studentOnly } = require('../middleware/auth');

const router = express.Router();

async function enrich(t) {
  const subject = await db.findById('subjects', t.subjectId);
  return {
    ...t,
    subjectCode: subject ? subject.code : '',
    subjectName: subject ? subject.name : '',
    faculty: subject ? subject.faculty : '',
  };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/timetable/me/days -> which days actually have periods scheduled (for tab UI)
router.get('/me/days', authRequired, studentOnly, async (req, res, next) => {
  try {
    const rows = await db.find('timetable', (t) => t.studentId === req.user.id);
    const daysWithPeriods = [...new Set(rows.map((r) => r.day))];
    const ordered = DAYS.filter((d) => daysWithPeriods.includes(d));
    res.json({ days: ordered });
  } catch (err) { next(err); }
});

// GET /api/timetable/me?day=Monday  (defaults to today)
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const day = req.query.day || DAYS[new Date().getDay()];
    const rows = await db.find('timetable', (t) => t.studentId === req.user.id && t.day === day);
    const enriched = await Promise.all(rows.map(enrich));
    enriched.sort((a, b) => a.startTime.localeCompare(b.startTime));
    res.json({ day, periods: enriched });
  } catch (err) { next(err); }
});

// GET /api/timetable/admin/student/:studentId
router.get('/admin/student/:studentId', authRequired, adminOnly, async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    const rows = await db.find('timetable', (t) => t.studentId === studentId);
    res.json(await Promise.all(rows.map(enrich)));
  } catch (err) { next(err); }
});

// POST /api/timetable/admin/update  { id?, studentId, day, subjectId, startTime, endTime, room, periodType, group, section }
router.post('/admin/update', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { id, studentId, day, subjectId, startTime, endTime, room, periodType, group, section } = req.body;
    if (studentId == null || !day || subjectId == null || !startTime || !endTime) {
      return res.status(400).json({ error: 'studentId, day, subjectId, startTime, endTime are required' });
    }
    const patch = {
      studentId: Number(studentId),
      day,
      subjectId: Number(subjectId),
      startTime,
      endTime,
      room: room || '',
      periodType: periodType || 'Lecture',
      group: group != null && group !== '' ? Number(group) : 0,
      section: section || '',
    };
    let saved;
    if (id) {
      saved = await db.update('timetable', Number(id), patch);
    } else {
      saved = await db.insert('timetable', patch);
    }
    res.json({ message: 'Timetable entry saved', record: await enrich(saved) });
  } catch (err) { next(err); }
});

// DELETE /api/timetable/admin/:id
router.delete('/admin/:id', authRequired, adminOnly, async (req, res, next) => {
  try {
    const ok = await db.remove('timetable', Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Timetable entry not found' });
    res.json({ message: 'Timetable entry deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
