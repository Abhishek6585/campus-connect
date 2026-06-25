// Seeds the Postgres database with demo data so the app works out of the box.
// Run with: npm run seed   (reads DATABASE_URL from backend/.env)

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./postgresDb');

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Create backend/.env with your Supabase connection string first.');
    process.exit(1);
  }

  // ---------- Users (students) ----------
  const studentPasswordHash = bcrypt.hashSync('student123', 8);
  const adminPasswordHash = bcrypt.hashSync('admin123', 8);

  await db.setAll('students', [
    {
      id: 1,
      rollNo: '12216312',
      name: 'Abhishek Verma',
      program: 'P132: B.Tech. (Computer Science and Engineering) (2022)',
      email: 'abhishek.verma@example.edu',
      phone: '9876543210',
      photoUrl: '',
      passwordHash: studentPasswordHash,
    },
    {
      id: 2,
      rollNo: '12216313',
      name: 'Priya Sharma',
      program: 'P132: B.Tech. (Computer Science and Engineering) (2022)',
      email: 'priya.sharma@example.edu',
      phone: '9876543211',
      photoUrl: '',
      passwordHash: studentPasswordHash,
    },
  ]);

  await db.setAll('admins', [
    {
      id: 1,
      username: 'admin',
      name: 'DCS Office Admin',
      passwordHash: adminPasswordHash,
    },
  ]);

  // ---------- Subjects ----------
  await db.setAll('subjects', [
    {
      id: 1,
      code: 'CSE435',
      name: 'COMPREHENSIVE SEMINAR',
      type: 'ST',
      faculty: 'Karun Handa',
      facultySeating: '28-202-CH30',
      section: 'ST001',
      credits: 2,
    },
    {
      id: 2,
      code: 'MKT907',
      name: 'WEB ANALYTICS',
      type: 'ST',
      faculty: 'Dr. Nikhil Dogra',
      facultySeating: '14-302-CH15',
      section: 'RE001',
      credits: 3,
    },
    {
      id: 3,
      code: 'PEIS20',
      name: 'MOCK INTERVIEWS - WINTER PEP I',
      type: 'PE',
      faculty: '',
      facultySeating: 'NA',
      section: '9P99D',
      credits: 1,
    },
    {
      id: 4,
      code: 'PEPS02',
      name: 'COMPANY PREP CLASSES - II',
      type: 'PE',
      faculty: '',
      facultySeating: 'NA',
      section: '9P745',
      credits: 1,
    },
    {
      id: 5,
      code: 'PEPS03',
      name: 'COMPANY PREP CLASSES - III',
      type: 'PE',
      faculty: '',
      facultySeating: 'NA',
      section: '9P99D',
      credits: 1,
    },
    { id: 6, code: 'CSE111', name: 'ORIENTATION TO COMPUTING-I', type: 'TH', faculty: 'Aman Deep', facultySeating: 'NA', section: 'ST001', credits: 4 },
    { id: 7, code: 'CSE326', name: 'INTERNET PROGRAMMING LABORATORY', type: 'PR', faculty: 'Aman Deep', facultySeating: 'NA', section: 'ST001', credits: 1 },
    { id: 8, code: 'INT108', name: 'PYTHON PROGRAMMING', type: 'TH', faculty: 'Karun Handa', facultySeating: 'NA', section: 'ST001', credits: 3 },
    { id: 9, code: 'MEC135', name: 'BASICS OF MECHANICAL ENGINEERING', type: 'TH', faculty: '', facultySeating: 'NA', section: 'ST001', credits: 3 },
    { id: 10, code: 'MTH174', name: 'ENGINEERING MATHEMATICS', type: 'TH', faculty: '', facultySeating: 'NA', section: 'ST001', credits: 4 },
    { id: 11, code: 'PES318', name: 'SOFT SKILLS-I', type: 'TH', faculty: '', facultySeating: 'NA', section: 'ST001', credits: 2 },
    { id: 12, code: 'PHY110', name: 'ENGINEERING PHYSICS', type: 'TH', faculty: '', facultySeating: 'NA', section: 'ST001', credits: 3 },
  ]);

  // ---------- Attendance ----------
  // attended/delivered tracked per student per subject; percent derived.
  await db.setAll('attendance', [
    {
      id: 1,
      studentId: 1,
      subjectId: 1,
      group: 1,
      rollNoInSection: 'RST001A52',
      attended: 2,
      delivered: 6,
      dutyLeaves: 0,
      lastAttended: '2026-06-22',
    },
    {
      id: 2,
      studentId: 1,
      subjectId: 2,
      group: 1,
      rollNoInSection: 'RRE001A02',
      attended: 0,
      delivered: 1,
      dutyLeaves: 0,
      lastAttended: '2026-06-12',
    },
    {
      id: 3,
      studentId: 1,
      subjectId: 3,
      group: 1,
      rollNoInSection: 'R9W120A03',
      attended: 0,
      delivered: 1,
      dutyLeaves: 0,
      lastAttended: '2025-12-06',
    },
    {
      id: 4,
      studentId: 1,
      subjectId: 4,
      group: 1,
      rollNoInSection: 'R9P745A37',
      attended: 0,
      delivered: 21,
      dutyLeaves: 0,
      lastAttended: '2026-05-08',
    },
    {
      id: 5,
      studentId: 1,
      subjectId: 5,
      group: 1,
      rollNoInSection: 'R9P13JA18',
      attended: 0,
      delivered: 63,
      dutyLeaves: 0,
      lastAttended: '2026-05-30',
    },
  ]);

  // ---------- Marks ----------
  await db.setAll('marks', [
    {
      id: 1,
      studentId: 1,
      subjectId: 1,
      examType: 'Mid Term',
      marksObtained: 18,
      maxMarks: 25,
      grade: 'A',
    },
    {
      id: 2,
      studentId: 1,
      subjectId: 2,
      examType: 'Quiz 1',
      marksObtained: 7,
      maxMarks: 10,
      grade: 'B+',
    },
  ]);

  // ---------- Results (semester-wise course final grades; TGPA/CGPA are computed, not stored) ----------
  await db.setAll('results', [
    // Semester I — full course list matching the screenshot
    { id: 1, studentId: 1, subjectId: 6, semester: 1, grade: 'O', credits: 4 },   // CSE111
    { id: 2, studentId: 1, subjectId: 7, semester: 1, grade: 'A+', credits: 1 },  // CSE326
    { id: 3, studentId: 1, subjectId: 8, semester: 1, grade: 'A+', credits: 3 },  // INT108
    { id: 4, studentId: 1, subjectId: 9, semester: 1, grade: 'B+', credits: 3 },  // MEC135
    { id: 5, studentId: 1, subjectId: 10, semester: 1, grade: 'D', credits: 4 },  // MTH174
    { id: 6, studentId: 1, subjectId: 11, semester: 1, grade: 'B+', credits: 2 }, // PES318
    { id: 7, studentId: 1, subjectId: 12, semester: 1, grade: 'B', credits: 3 },  // PHY110
    // Semester II - using existing subjects as stand-ins so TGPA ~6.69
    { id: 8, studentId: 1, subjectId: 1, semester: 2, grade: 'B', credits: 2 },
    { id: 9, studentId: 1, subjectId: 2, semester: 2, grade: 'B+', credits: 3 },
    { id: 10, studentId: 1, subjectId: 3, semester: 2, grade: 'A', credits: 1 },
    // Semester III - TGPA ~7.44
    { id: 11, studentId: 1, subjectId: 4, semester: 3, grade: 'A+', credits: 1 },
    { id: 12, studentId: 1, subjectId: 5, semester: 3, grade: 'A', credits: 1 },
    { id: 13, studentId: 1, subjectId: 8, semester: 3, grade: 'A', credits: 3 },
  ]);

  // ---------- Attendance session log (date-wise P/A history; rolls up into the `attendance` aggregate) ----------
  await db.setAll('attendanceLog', [
    { id: 1, studentId: 1, subjectId: 1, date: '2026-06-22', startTime: '09:30', endTime: '10:20', status: 'A', faculty: 'Karun Handa', facultyUid: '27278' },
    { id: 2, studentId: 1, subjectId: 1, date: '2026-06-22', startTime: '10:20', endTime: '11:10', status: 'A', faculty: 'Karun Handa', facultyUid: '27278' },
    { id: 3, studentId: 1, subjectId: 1, date: '2026-06-15', startTime: '09:30', endTime: '10:20', status: 'A', faculty: 'Karun Handa', facultyUid: '27278' },
    { id: 4, studentId: 1, subjectId: 1, date: '2026-06-15', startTime: '10:20', endTime: '11:10', status: 'A', faculty: 'Karun Handa', facultyUid: '27278' },
    { id: 5, studentId: 1, subjectId: 1, date: '2026-06-08', startTime: '09:30', endTime: '10:20', status: 'P', faculty: 'Karun Handa', facultyUid: '27278' },
    { id: 6, studentId: 1, subjectId: 1, date: '2026-06-08', startTime: '10:20', endTime: '11:10', status: 'P', faculty: 'Karun Handa', facultyUid: '27278' },
    { id: 7, studentId: 1, subjectId: 6, date: '2026-04-27', startTime: '13:40', endTime: '14:30', status: 'A', faculty: 'Aman Deep', facultyUid: '29605' },
    { id: 8, studentId: 1, subjectId: 6, date: '2026-04-22', startTime: '13:40', endTime: '14:30', status: 'A', faculty: 'Aman Deep', facultyUid: '29605' },
    { id: 9, studentId: 1, subjectId: 6, date: '2026-04-20', startTime: '13:40', endTime: '14:30', status: 'P', faculty: 'Aman Deep', facultyUid: '29605' },
    { id: 10, studentId: 1, subjectId: 6, date: '2026-04-15', startTime: '13:40', endTime: '14:30', status: 'A', faculty: 'Aman Deep', facultyUid: '29605' },
    { id: 11, studentId: 1, subjectId: 6, date: '2026-04-13', startTime: '13:40', endTime: '14:30', status: 'P', faculty: 'Aman Deep', facultyUid: '29605' },
    { id: 12, studentId: 1, subjectId: 6, date: '2026-04-08', startTime: '13:40', endTime: '14:30', status: 'A', faculty: 'Aman Deep', facultyUid: '29605' },
  ]);

  // ---------- Timetable ----------
  await db.setAll('timetable', [
    {
      id: 1,
      studentId: 1,
      day: 'Monday',
      subjectId: 1,
      startTime: '09:30',
      endTime: '10:20',
      room: '55-702',
      periodType: 'Practical',
      group: 0,
      section: 'ST001',
    },
    {
      id: 2,
      studentId: 1,
      day: 'Monday',
      subjectId: 1,
      startTime: '10:20',
      endTime: '11:10',
      room: '55-702',
      periodType: 'Practical',
      group: 0,
      section: 'ST001',
    },
    {
      id: 3,
      studentId: 1,
      day: 'Friday',
      subjectId: 2,
      startTime: '11:20',
      endTime: '12:10',
      room: '14-302',
      periodType: 'Lecture',
      group: 0,
      section: 'RE001',
    },
  ]);

  // ---------- Notifications / Messages ----------
  await db.setAll('notifications', [
    {
      id: 1,
      studentId: 1,
      title: 'ON CAMPUS Drive - PROGVISION DIGITAL',
      body: 'Dear Student, You are eligible for ON CAMPUS Drive of PROGVISION DIGITAL. Date will be notified later.',
      sender: 'Office of Director DCS',
      createdAt: '2026-06-23T09:00:00.000Z',
      read: false,
    },
    {
      id: 2,
      studentId: 1,
      title: 'COMPETETIVE EVENT - APPLE',
      body: 'Dear Student, You are eligible for COMPETETIVE EVENT of APPLE. Date will be notified later.',
      sender: 'Office of Director DCS',
      createdAt: '2026-06-23T08:30:00.000Z',
      read: false,
    },
    {
      id: 3,
      studentId: 1,
      title: 'ON CAMPUS Drive - SKILLFLOW LEARNING',
      body: 'Dear Student, You are eligible for ON CAMPUS Drive of SKILLFLOW LEARNING. Date will be notified later.',
      sender: 'Office of Director DCS',
      createdAt: '2026-06-22T08:30:00.000Z',
      read: false,
    },
  ]);

  // ---------- Dashboard tiles config (per student, so admin can toggle visibility later) ----------
  await db.setAll('tiles', [
    { id: 1, key: 'exams', label: 'Exams', icon: 'exam', badge: null, enabled: true },
    { id: 2, key: 'rms_status', label: 'RMS Status', icon: 'calendar-check', badge: null, enabled: true },
    { id: 3, key: 'events', label: 'Events', icon: 'people-star', badge: null, enabled: true },
    { id: 4, key: 'placement_scanner', label: 'Placement Barcode Scanner', icon: 'barcode', badge: null, enabled: true },
    { id: 5, key: 'view_marks', label: 'View Marks', icon: 'doc-check', badge: null, enabled: true },
    { id: 6, key: 'placement_drive', label: 'Placement Drive', icon: 'doc-check', badge: null, enabled: true },
    { id: 7, key: 'rms_request_status', label: 'RMS Request Status', icon: 'doc-check', badge: null, enabled: true },
    { id: 8, key: 'teacher_on_leave', label: 'Teacher on Leave', icon: 'doc-check', badge: null, enabled: true },
    { id: 9, key: 'timetable', label: 'Time table', icon: 'doc-check', badge: null, enabled: true },
    { id: 10, key: 'announce', label: 'Announce', icon: 'megaphone', badge: '0', enabled: true },
    { id: 11, key: 'edu_revolution', label: 'Edu Revolution', icon: 'grad-cap', badge: null, enabled: true },
    { id: 12, key: 'fee_statement', label: 'Fee Statement', icon: 'cash-hand', badge: null, enabled: true },
    { id: 13, key: 'attendance', label: 'Attendance', icon: 'clipboard-check', badge: '3%', enabled: true },
    { id: 14, key: 'assignment', label: 'Assignment', icon: 'doc-pencil', badge: '3', enabled: true },
    { id: 15, key: 'results', label: 'Results', icon: 'doc-chart', badge: '6.77', enabled: true },
  ]);

  console.log('Database seeded successfully.');
  console.log('Student login -> rollNo: 12216312, password: student123');
  console.log('Admin login   -> username: admin, password: admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
