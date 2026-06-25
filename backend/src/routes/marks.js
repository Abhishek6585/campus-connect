const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, adminOnly, studentOnly } = require('../middleware/auth');

const router = express.Router();

async function enrichMark(m) {
  const subject = await db.findById('subjects', m.subjectId);
  return {
    ...m,
    subjectCode: subject ? subject.code : '',
    subjectName: subject ? subject.name : '',
  };
}

// GET /api/marks/me
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const rows = await db.find('marks', (m) => m.studentId === req.user.id);
    res.json(await Promise.all(rows.map(enrichMark)));
  } catch (err) { next(err); }
});

// GET /api/marks/admin/student/:studentId
router.get('/admin/student/:studentId', authRequired, adminOnly, async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    const rows = await db.find('marks', (m) => m.studentId === studentId);
    res.json(await Promise.all(rows.map(enrichMark)));
  } catch (err) { next(err); }
});

// POST /api/marks/admin/update  { id?, studentId, subjectId, examType, marksObtained, maxMarks, grade }
router.post('/admin/update', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { id, studentId, subjectId, examType, marksObtained, maxMarks, grade } = req.body;
    if (studentId == null || subjectId == null || !examType) {
      return res.status(400).json({ error: 'studentId, subjectId and examType are required' });
    }
    const patch = {
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      examType,
      marksObtained: Number(marksObtained),
      maxMarks: Number(maxMarks),
      grade: grade || '',
    };
    let saved;
    if (id) {
      saved = await db.update('marks', Number(id), patch);
    } else {
      saved = await db.insert('marks', patch);
    }
    res.json({ message: 'Marks saved', record: await enrichMark(saved) });
  } catch (err) { next(err); }
});

// DELETE /api/marks/admin/:id
router.delete('/admin/:id', authRequired, adminOnly, async (req, res, next) => {
  try {
    const ok = await db.remove('marks', Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Mark record not found' });
    res.json({ message: 'Mark record deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
