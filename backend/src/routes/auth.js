const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/postgresDb');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/student/login  { rollNo, password }
router.post('/student/login', async (req, res, next) => {
  try {
    const { rollNo, password } = req.body;
    if (!rollNo || !password) {
      return res.status(400).json({ error: 'rollNo and password are required' });
    }
    const student = await db.findOne('students', (s) => s.rollNo === String(rollNo));
    if (!student) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }
    const ok = bcrypt.compareSync(password, student.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }
    const token = signToken({ id: student.id, role: 'student', rollNo: student.rollNo });
    const { passwordHash, ...safeStudent } = student;
    res.json({ token, student: safeStudent });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin/login  { username, password }
router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const admin = await db.findOne('admins', (a) => a.username === String(username));
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const ok = bcrypt.compareSync(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = signToken({ id: admin.id, role: 'admin', username: admin.username });
    const { passwordHash, ...safeAdmin } = admin;
    res.json({ token, admin: safeAdmin });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
