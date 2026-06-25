const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, adminOnly, studentOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications/me
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const rows = await db.find('notifications', (n) => n.studentId === req.user.id);
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/notifications/me/unread-count
router.get('/me/unread-count', authRequired, studentOnly, async (req, res, next) => {
  try {
    const rows = await db.find('notifications', (n) => n.studentId === req.user.id && !n.read);
    res.json({ count: rows.length });
  } catch (err) { next(err); }
});

// POST /api/notifications/me/:id/read
router.post('/me/:id/read', authRequired, studentOnly, async (req, res, next) => {
  try {
    const note = await db.findById('notifications', Number(req.params.id));
    if (!note || note.studentId !== req.user.id) return res.status(404).json({ error: 'Notification not found' });
    const updated = await db.update('notifications', note.id, { read: true });
    res.json(updated);
  } catch (err) { next(err); }
});

// ---------------- ADMIN ----------------

// POST /api/notifications/admin/send  { studentId, title, body, sender }  -> send to one student
router.post('/admin/send', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { studentId, title, body, sender } = req.body;
    if (studentId == null || !title || !body) {
      return res.status(400).json({ error: 'studentId, title and body are required' });
    }
    const student = await db.findById('students', Number(studentId));
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const note = await db.insert('notifications', {
      studentId: Number(studentId),
      title,
      body,
      sender: sender || 'Office of Director DCS',
      createdAt: new Date().toISOString(),
      read: false,
    });
    res.json({ message: 'Notification sent', record: note });
  } catch (err) { next(err); }
});

// POST /api/notifications/admin/broadcast  { title, body, sender }  -> send to all students
router.post('/admin/broadcast', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { title, body, sender } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    const students = await db.all('students');
    const created = [];
    for (const s of students) {
      created.push(
        await db.insert('notifications', {
          studentId: s.id,
          title,
          body,
          sender: sender || 'Office of Director DCS',
          createdAt: new Date().toISOString(),
          read: false,
        })
      );
    }
    res.json({ message: `Broadcast sent to ${created.length} student(s)`, records: created });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/admin/:id
router.delete('/admin/:id', authRequired, adminOnly, async (req, res, next) => {
  try {
    const ok = await db.remove('notifications', Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
