const db = require('../db/postgresDb');

function pct(attended, delivered) {
  if (!delivered) return 0;
  return Math.round((attended / delivered) * 100);
}

/** Returns attendance rows for a student, joined with subject details and computed percent. */
async function getStudentAttendance(studentId) {
  const rows = await db.find('attendance', (a) => a.studentId === studentId);
  const results = [];
  for (const row of rows) {
    const subject = await db.findById('subjects', row.subjectId);
    results.push({
      id: row.id,
      subjectId: row.subjectId,
      subjectCode: subject ? subject.code : '',
      subjectName: subject ? subject.name : '',
      subjectType: subject ? subject.type : '',
      faculty: subject ? subject.faculty : '',
      facultySeating: subject ? subject.facultySeating : '',
      section: subject ? subject.section : '',
      group: row.group,
      rollNoInSection: row.rollNoInSection,
      attended: row.attended,
      delivered: row.delivered,
      dutyLeaves: row.dutyLeaves,
      lastAttended: row.lastAttended,
      percent: pct(row.attended, row.delivered),
    });
  }
  return results;
}

/** Aggregate attendance percent across all subjects for a student. */
async function getAggregateAttendance(studentId) {
  const rows = await db.find('attendance', (a) => a.studentId === studentId);
  const totalAttended = rows.reduce((s, r) => s + r.attended, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  return pct(totalAttended, totalDelivered);
}

module.exports = { pct, getStudentAttendance, getAggregateAttendance };
