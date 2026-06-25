// Standard 10-point grading scale used by most Indian university result systems.
// grade -> { points, label } as shown in the Result screenshot (O / A+ / A / B+ / B / C / D / F).
const GRADE_SCALE = {
  O:  { points: 10, label: 'Outstanding' },
  'A+': { points: 9, label: 'Excellent' },
  A:  { points: 8, label: 'Very Good' },
  'B+': { points: 7, label: 'Good' },
  B:  { points: 6, label: 'Above Average' },
  C:  { points: 5, label: 'Average' },
  D:  { points: 4, label: 'Marginal' },
  F:  { points: 0, label: 'Fail' },
};

const VALID_GRADES = Object.keys(GRADE_SCALE);

function gradeLabel(grade) {
  return GRADE_SCALE[grade] ? GRADE_SCALE[grade].label : '';
}

function gradePoints(grade) {
  return GRADE_SCALE[grade] ? GRADE_SCALE[grade].points : 0;
}

/**
 * Computes TGPA for a list of { grade, credits } course rows:
 * TGPA = sum(points * credits) / sum(credits), rounded to 2 decimals.
 */
function computeTGPA(courseRows) {
  const totalCredits = courseRows.reduce((s, c) => s + Number(c.credits || 0), 0);
  if (!totalCredits) return 0;
  const weighted = courseRows.reduce((s, c) => s + gradePoints(c.grade) * Number(c.credits || 0), 0);
  return Math.round((weighted / totalCredits) * 100) / 100;
}

/**
 * Computes CGPA across multiple semesters, each an array of { grade, credits } rows.
 * Equivalent to TGPA computed over every course from every semester combined.
 */
function computeCGPA(semesterCourseLists) {
  const allCourses = semesterCourseLists.flat();
  return computeTGPA(allCourses);
}

module.exports = { GRADE_SCALE, VALID_GRADES, gradeLabel, gradePoints, computeTGPA, computeCGPA };
