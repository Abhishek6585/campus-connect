const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, adminOnly, studentOnly } = require('../middleware/auth');
const { getStudentAttendance, getAggregateAttendance } = require('../utils/attendanceHelpers');

const router = express.Router();

// ---------------- STUDENT ----------------

// GET /api/attendance/me  -> logged-in student's own attendance
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const records = await getStudentAttendance(req.user.id);
    const aggregate = await getAggregateAttendance(req.user.id);
    res.json({ aggregate, records });
  } catch (err) { next(err); }
});

// ---------------- ADMIN ----------------

// GET /api/attendance/admin/students -> list of students for the picker
router.get('/admin/students', authRequired, adminOnly, async (req, res, next) => {
  try {
    const students = (await db.all('students')).map(({ passwordHash, ...s }) => s);
    res.json(students);
  } catch (err) { next(err); }
});

// GET /api/attendance/admin/subjects -> list of subjects for the picker
router.get('/admin/subjects', authRequired, adminOnly, async (req, res, next) => {
  try {
    res.json(await db.all('subjects'));
  } catch (err) { next(err); }
});

// GET /api/attendance/admin/student/:studentId -> full attendance for one student (admin view)
router.get('/admin/student/:studentId', authRequired, adminOnly, async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    const student = await db.findById('students', studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const records = await getStudentAttendance(studentId);
    const aggregate = await getAggregateAttendance(studentId);
    res.json({ aggregate, records });
  } catch (err) { next(err); }
});

// POST /api/attendance/admin/update
// Body: { studentId, subjectId, attended, delivered, dutyLeaves, lastAttended }
// Creates the attendance record if it doesn't exist yet, otherwise updates it.
// This is the core endpoint the admin panel uses to edit a student's attendance for a subject.
router.post('/admin/update', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { studentId, subjectId, attended, delivered, dutyLeaves, lastAttended, group, rollNoInSection } = req.body;

    if (studentId == null || subjectId == null) {
      return res.status(400).json({ error: 'studentId and subjectId are required' });
    }

    const student = await db.findById('students', Number(studentId));
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const subject = await db.findById('subjects', Number(subjectId));
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    if (attended != null && delivered != null && Number(attended) > Number(delivered)) {
      return res.status(400).json({ error: 'attended cannot exceed delivered' });
    }

    const existing = await db.findOne(
      'attendance',
      (a) => a.studentId === Number(studentId) && a.subjectId === Number(subjectId)
    );

    const patch = {};
    if (attended != null) patch.attended = Number(attended);
    if (delivered != null) patch.delivered = Number(delivered);
    if (dutyLeaves != null) patch.dutyLeaves = Number(dutyLeaves);
    if (lastAttended != null) patch.lastAttended = lastAttended;
    if (group != null) patch.group = Number(group);
    if (rollNoInSection != null) patch.rollNoInSection = rollNoInSection;

    let saved;
    if (existing) {
      saved = await db.update('attendance', existing.id, patch);
    } else {
      saved = await db.insert('attendance', {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        group: group != null ? Number(group) : 1,
        rollNoInSection: rollNoInSection || '',
        attended: attended != null ? Number(attended) : 0,
        delivered: delivered != null ? Number(delivered) : 0,
        dutyLeaves: dutyLeaves != null ? Number(dutyLeaves) : 0,
        lastAttended: lastAttended || new Date().toISOString().slice(0, 10),
      });
    }

    res.json({ message: 'Attendance updated', record: saved });
  } catch (err) { next(err); }
});

// POST /api/attendance/admin/mark-session
// Body: { subjectId, studentIds: [..], present: true/false, date }
// Marks one class session as attended/missed for multiple students at once
// (e.g. taking attendance for today's lecture in one go).
router.post('/admin/mark-session', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { subjectId, studentIds, present, date } = req.body;
    if (subjectId == null || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'subjectId and a non-empty studentIds array are required' });
    }
    const subject = await db.findById('subjects', Number(subjectId));
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const sessionDate = date || new Date().toISOString().slice(0, 10);
    const updated = [];

    for (const studentId of studentIds) {
      const existing = await db.findOne(
        'attendance',
        (a) => a.studentId === Number(studentId) && a.subjectId === Number(subjectId)
      );
      if (existing) {
        const patch = {
          delivered: existing.delivered + 1,
          attended: existing.attended + (present ? 1 : 0),
        };
        if (present) patch.lastAttended = sessionDate;
        updated.push(await db.update('attendance', existing.id, patch));
      } else {
        updated.push(
          await db.insert('attendance', {
            studentId: Number(studentId),
            subjectId: Number(subjectId),
            group: 1,
            rollNoInSection: '',
            attended: present ? 1 : 0,
            delivered: 1,
            dutyLeaves: 0,
            lastAttended: present ? sessionDate : '',
          })
        );
      }
    }

    res.json({ message: `Session recorded for ${updated.length} student(s)`, records: updated });
  } catch (err) { next(err); }
});

// DELETE /api/attendance/admin/:id -> remove an attendance record entirely
router.delete('/admin/:id', authRequired, adminOnly, async (req, res, next) => {
  try {
    const ok = await db.remove('attendance', Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Attendance record not found' });
    res.json({ message: 'Attendance record deleted' });
  } catch (err) { next(err); }
});

// =====================================================================
// SESSION LOG (date-wise Present/Absent history, separate from the
// aggregate attended/delivered counts above). Matches the "Attendance"
// screen that lists every individual class session with P/A and faculty.
// =====================================================================

async function enrichLogEntry(entry) {
  const subject = await db.findById('subjects', entry.subjectId);
  return {
    ...entry,
    subjectCode: subject ? subject.code : '',
    subjectName: subject ? subject.name : '',
  };
}

// ---------------- STUDENT ----------------

// GET /api/attendance/log/me -> full date-wise session history, most recent first
router.get('/log/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const rows = await db.find('attendanceLog', (e) => e.studentId === req.user.id);
    const enriched = await Promise.all(rows.map(enrichLogEntry));
    enriched.sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.startTime || '').localeCompare(a.startTime || '');
    });
    res.json(enriched);
  } catch (err) { next(err); }
});

// ---------------- ADMIN ----------------

// GET /api/attendance/log/admin/student/:studentId -> session history for one student
router.get('/log/admin/student/:studentId', authRequired, adminOnly, async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    const rows = await db.find('attendanceLog', (e) => e.studentId === studentId);
    const enriched = await Promise.all(rows.map(enrichLogEntry));
    enriched.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(enriched);
  } catch (err) { next(err); }
});

// POST /api/attendance/log/admin/add
// Body: { studentId, subjectId, date, startTime, endTime, status, faculty, facultyUid }
// Adds one session log entry (a single class meeting) for one student, AND rolls it into
// that student/subject's aggregate attended/delivered counters automatically, so the
// aggregate Attendance view and the session log always agree with each other.
router.post('/log/admin/add', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { studentId, subjectId, date, startTime, endTime, status, faculty, facultyUid } = req.body;

    if (studentId == null || subjectId == null || !date || !status) {
      return res.status(400).json({ error: 'studentId, subjectId, date and status are required' });
    }
    if (!['P', 'A'].includes(status)) {
      return res.status(400).json({ error: "status must be 'P' or 'A'" });
    }
    const student = await db.findById('students', Number(studentId));
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const subject = await db.findById('subjects', Number(subjectId));
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const entry = await db.insert('attendanceLog', {
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      date,
      startTime: startTime || '',
      endTime: endTime || '',
      status,
      faculty: faculty || subject.faculty || '',
      facultyUid: facultyUid || '',
    });

    // Keep the aggregate counters in sync with this new session.
    const existingAgg = await db.findOne(
      'attendance',
      (a) => a.studentId === Number(studentId) && a.subjectId === Number(subjectId)
    );
    if (existingAgg) {
      await db.update('attendance', existingAgg.id, {
        delivered: existingAgg.delivered + 1,
        attended: existingAgg.attended + (status === 'P' ? 1 : 0),
        lastAttended: status === 'P' ? date : existingAgg.lastAttended,
      });
    } else {
      await db.insert('attendance', {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        group: 1,
        rollNoInSection: '',
        attended: status === 'P' ? 1 : 0,
        delivered: 1,
        dutyLeaves: 0,
        lastAttended: status === 'P' ? date : '',
      });
    }

    res.json({ message: 'Session log entry added', record: await enrichLogEntry(entry) });
  } catch (err) { next(err); }
});

// DELETE /api/attendance/log/admin/:id -> remove a single session log entry
// (does NOT roll back the aggregate counters automatically - use the aggregate
// update endpoint separately if you need to correct those too).
router.delete('/log/admin/:id', authRequired, adminOnly, async (req, res, next) => {
  try {
    const ok = await db.remove('attendanceLog', Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Log entry not found' });
    res.json({ message: 'Log entry deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
