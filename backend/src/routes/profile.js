const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, studentOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/me
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const student = await db.findById('students', req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const { passwordHash, ...safe } = student;
    res.json(safe);
  } catch (err) { next(err); }
});

module.exports = router;
