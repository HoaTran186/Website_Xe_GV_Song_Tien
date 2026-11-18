function evaluateGroupAttentionStatus(group, allCourses, groupAllocations) {
  const sortedCourses = [...(allCourses || [])].sort((a, b) =>
    a.opening_date.localeCompare(b.opening_date)
  );

  const participatedCourseIds = new Set(
    (groupAllocations || [])
      .filter((a) => Number(a.student_count) > 0)
      .map((a) => Number(a.course_id))
  );

  let consecutiveMissed = 0;
  const missedCourses = [];
  let lastParticipatedDate = null;

  for (const course of sortedCourses) {
    if (participatedCourseIds.has(Number(course.id))) {
      consecutiveMissed = 0;
      missedCourses.length = 0;
      lastParticipatedDate = course.opening_date;
    } else {
      consecutiveMissed += 1;
      missedCourses.push({
        course_id: course.id,
        course_name: course.course_name,
        opening_date: course.opening_date,
      });
    }
  }

  const needsAttention = consecutiveMissed >= 3;

  return {
    group_id: group.id,
    group_name: group.name,
    has_business_household: Boolean(group.has_business_household),
    business_household_info: group.business_household_info || '',
    consecutive_missed_courses: consecutiveMissed,
    needs_attention: needsAttention,
    missed_courses: missedCourses,
    missed_course_dates: missedCourses.map((c) => c.opening_date),
    last_participated_date: lastParticipatedDate,
  };
}

function getAttentionGroups(db) {
  const groups = db.prepare('SELECT * FROM teacher_groups ORDER BY id ASC').all();
  const courses = db.prepare('SELECT * FROM opening_courses ORDER BY opening_date ASC').all();
  const allocations = db
    .prepare(
      `SELECT ca.*, COALESCE(ca.allocating_group_id, t.group_id) AS effective_group_id, t.group_id AS teacher_group_id
       FROM course_allocations ca
       JOIN teachers t ON t.id = ca.teacher_id`
    )
    .all();

  const evaluatedGroups = groups.map((group) => {
    const groupAllocs = allocations.filter(
      (a) =>
        Number(a.effective_group_id) === Number(group.id) ||
        Number(a.teacher_group_id) === Number(group.id)
    );
    return evaluateGroupAttentionStatus(group, courses, groupAllocs);
  });

  return {
    total_courses: courses.length,
    all_groups_status: evaluatedGroups,
    attention_groups: evaluatedGroups.filter((g) => g.needs_attention),
  };
}

module.exports = {
  evaluateGroupAttentionStatus,
  getAttentionGroups,
};
