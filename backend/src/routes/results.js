const express = require('express');
const db = require('../db/postgresDb');
const { authRequired, adminOnly, studentOnly } = require('../middleware/auth');
const { VALID_GRADES, gradeLabel, computeTGPA, computeCGPA } = require('../utils/gradeHelpers');

const router = express.Router();

async function enrichResult(r) {
  const subject = await db.findById('subjects', r.subjectId);
  return {
    ...r,
    subjectCode: subject ? subject.code : r.courseCode || '',
    subjectName: subject ? subject.name : r.courseName || '',
    gradeLabel: gradeLabel(r.grade),
  };
}

/** Groups a student's result rows by semester number, each enriched + with TGPA. */
async function buildSemesterSummary(studentId) {
  const rows = await db.find('results', (r) => r.studentId === studentId);
  const bySemester = {};
  rows.forEach((r) => {
    if (!bySemester[r.semester]) bySemester[r.semester] = [];
    bySemester[r.semester].push(r);
  });

  const semesterNums = Object.keys(bySemester).map(Number).sort((a, b) => a - b);
  const semesters = [];
  for (const sem of semesterNums) {
    const courses = await Promise.all(bySemester[sem].map(enrichResult));
    const tgpa = computeTGPA(bySemester[sem]);
    semesters.push({ semester: sem, tgpa, courses });
  }

  const cgpa = computeCGPA(Object.values(bySemester));
  return { cgpa, semesters };
}

// GET /api/results/me  -> overall CGPA + per-semester TGPA (no course details, for the summary screen)
router.get('/me', authRequired, studentOnly, async (req, res, next) => {
  try {
    const { cgpa, semesters } = await buildSemesterSummary(req.user.id);
    const summary = semesters.map((s) => ({ semester: s.semester, tgpa: s.tgpa, courseCount: s.courses.length }));
    res.json({ cgpa, semesters: summary });
  } catch (err) { next(err); }
});

// GET /api/results/me/semester/:num -> course-wise grades for one semester (the drill-down screen)
router.get('/me/semester/:num', authRequired, studentOnly, async (req, res, next) => {
  try {
    const semNum = Number(req.params.num);
    const { semesters } = await buildSemesterSummary(req.user.id);
    const found = semesters.find((s) => s.semester === semNum);
    if (!found) return res.status(404).json({ error: 'No results found for this semester' });
    res.json(found);
  } catch (err) { next(err); }
});

// ---------------- ADMIN ----------------

// GET /api/results/admin/student/:studentId -> full summary (same shape as /me, for admin's own view)
router.get('/admin/student/:studentId', authRequired, adminOnly, async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    const student = await db.findById('students', studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(await buildSemesterSummary(studentId));
  } catch (err) { next(err); }
});

// POST /api/results/admin/update
// Body: { id?, studentId, subjectId, semester, grade, credits }
// Creates or updates one course's final grade for a semester. TGPA/CGPA recompute automatically
// from this on every read — nothing to "save" separately.
router.post('/admin/update', authRequired, adminOnly, async (req, res, next) => {
  try {
    const { id, studentId, subjectId, semester, grade, credits } = req.body;

    if (studentId == null || subjectId == null || semester == null || !grade) {
      return res.status(400).json({ error: 'studentId, subjectId, semester and grade are required' });
    }
    if (!VALID_GRADES.includes(grade)) {
      return res.status(400).json({ error: `grade must be one of: ${VALID_GRADES.join(', ')}` });
    }
    const student = await db.findById('students', Number(studentId));
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const subject = await db.findById('subjects', Number(subjectId));
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const patch = {
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      semester: Number(semester),
      grade,
      credits: credits != null ? Number(credits) : 3,
    };

    let saved;
    if (id) {
      saved = await db.update('results', Number(id), patch);
    } else {
      // Avoid duplicate rows for the same student+subject+semester; update in place if it exists.
      const existing = await db.findOne(
        'results',
        (r) => r.studentId === Number(studentId) && r.subjectId === Number(subjectId) && r.semester === Number(semester)
      );
      saved = existing ? await db.update('results', existing.id, patch) : await db.insert('results', patch);
    }

    res.json({ message: 'Result saved', record: await enrichResult(saved) });
  } catch (err) { next(err); }
});

// DELETE /api/results/admin/:id
router.delete('/admin/:id', authRequired, adminOnly, async (req, res, next) => {
  try {
    const ok = await db.remove('results', Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Result entry not found' });
    res.json({ message: 'Result entry deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
