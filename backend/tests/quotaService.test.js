const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateTeacherQuotaStatus,
  validateAllocationRequest,
} = require('../src/services/quotaService');
const { evaluateGroupAttentionStatus } = require('../src/services/attentionService');

test('1 xe 1 giáo viên = 5 học viên: chưa lên khóa nào thì còn lại đủ 5 học viên', () => {
  const teacher = {
    id: 1,
    full_name: 'Nguyễn Văn An',
    group_name: 'Nhóm 1',
    max_quota: 5,
    has_business_household: 1,
    group_has_business_household: 1,
  };

  const status = calculateTeacherQuotaStatus(teacher, [], '2026-11-16');
  assert.equal(status.max_quota, 5);
  assert.equal(status.used_quota, 0);
  assert.equal(status.remaining_quota, 5);
  assert.equal(status.can_enroll_on_reference_date, true);
  assert.equal(status.business_household_warning, false);
});

test('Nếu khóa trước đã lên 3 học viên thì còn lại 2 học viên, chưa đủ 3 tuần thì phải chờ, đủ 3 tuần thì được lên thêm 2 học viên nữa', () => {
  const teacher = {
    id: 1,
    full_name: 'Nguyễn Văn An',
    group_name: 'Nhóm 1',
    max_quota: 5,
    has_business_household: 1,
    group_has_business_household: 1,
  };

  const allocations = [
    {
      course_id: 1,
      opening_date: '2026-10-01',
      student_count: 3,
      next_eligible_date: '2026-10-22', // +21 ngày (3 tuần)
      turnaround_date: '2026-11-12',    // +42 ngày (6 tuần)
    },
  ];

  // 1) Ngày 2026-10-15 (chưa đủ 3 tuần): còn lại 2 HV nhưng chưa được phép lên khóa
  const statusBefore3Weeks = calculateTeacherQuotaStatus(teacher, allocations, '2026-10-15');
  assert.equal(statusBefore3Weeks.used_quota, 3);
  assert.equal(statusBefore3Weeks.remaining_quota, 2);
  assert.equal(statusBefore3Weeks.can_enroll_on_reference_date, false);
  assert.equal(statusBefore3Weeks.status_code, 'COOLDOWN_WAIT_3_WEEKS');

  const invalidAttempt = validateAllocationRequest({
    teacher,
    allocations,
    courseOpeningDate: '2026-10-15',
    requestedStudents: 2,
  });
  assert.equal(invalidAttempt.valid, false);

  // 2) Ngày 2026-10-22 (đã đủ 3 tuần): được phép lên thêm tối đa 2 HV còn lại
  const statusAfter3Weeks = calculateTeacherQuotaStatus(teacher, allocations, '2026-10-22');
  assert.equal(statusAfter3Weeks.used_quota, 3);
  assert.equal(statusAfter3Weeks.remaining_quota, 2);
  assert.equal(statusAfter3Weeks.can_enroll_on_reference_date, true);
  assert.equal(statusAfter3Weeks.status_code, 'READY_REMAINING_AFTER_3_WEEKS');

  // Thử lên 3 HV (vượt quá 2 HV còn lại) -> bị từ chối
  const exceedAttempt = validateAllocationRequest({
    teacher,
    allocations,
    courseOpeningDate: '2026-10-22',
    requestedStudents: 3,
  });
  assert.equal(exceedAttempt.valid, false);

  // Lên đúng 2 HV còn lại -> hợp lệ!
  const validAttempt = validateAllocationRequest({
    teacher,
    allocations,
    courseOpeningDate: '2026-10-22',
    requestedStudents: 2,
  });
  assert.equal(validAttempt.valid, true);

  // 3) Ngày 2026-11-12 (đủ 6 tuần = 42 ngày): quay đầu lại đủ 5 học viên!
  const statusAfter6Weeks = calculateTeacherQuotaStatus(teacher, allocations, '2026-11-12');
  assert.equal(statusAfter6Weeks.used_quota, 0);
  assert.equal(statusAfter6Weeks.remaining_quota, 5);
  assert.equal(statusAfter6Weeks.can_enroll_on_reference_date, true);
});

test('Cảnh báo khi Giáo viên hoặc Nhóm giáo viên chưa có Hộ Kinh Doanh', () => {
  const teacherNoHKD = {
    id: 2,
    full_name: 'Phạm Văn Hùng',
    group_name: 'Nhóm 2',
    max_quota: 5,
    has_business_household: 0,
    group_has_business_household: 1,
  };

  const status = calculateTeacherQuotaStatus(teacherNoHKD, [], '2026-11-16');
  assert.equal(status.business_household_warning, true);
  assert.match(status.business_household_warning_message, /chưa có Hộ Kinh Doanh/);
});

test('Nhóm giáo viên bỏ qua 3 khóa khai giảng (3 ngày khai giảng) liên tiếp sẽ vào Danh sách cần chú ý', () => {
  const group = { id: 3, name: 'Nhóm Thầy Phong', has_business_household: 1 };
  const courses = [
    { id: 1, course_name: 'K01', opening_date: '2026-09-20' },
    { id: 2, course_name: 'K02', opening_date: '2026-10-18' },
    { id: 3, course_name: 'K03', opening_date: '2026-11-05' },
    { id: 4, course_name: 'K04', opening_date: '2026-11-16' },
  ];
  // Chỉ tham gia K01, bỏ qua K02, K03, K04 (3 khóa liên tiếp)
  const groupAllocations = [{ course_id: 1, student_count: 5 }];

  const attention = evaluateGroupAttentionStatus(group, courses, groupAllocations);
  assert.equal(attention.consecutive_missed_courses, 3);
  assert.equal(attention.needs_attention, true);
  assert.deepEqual(attention.missed_course_dates, ['2026-10-18', '2026-11-05', '2026-11-16']);
});

test('Nếu giáo viên hoặc xe đã lên khóa (5 HV) mà chưa đủ 6 tuần (cả trước và sau ngày khai giảng) thì không thể lên khóa', () => {
  const teacher = {
    id: 1,
    full_name: 'Nguyễn Duy Hiếu',
    group_name: 'Nhóm 2',
    max_quota: 5,
    has_business_household: 1,
    group_has_business_household: 1,
  };

  const allocations = [
    {
      course_id: 3,
      opening_date: '2026-09-07',
      student_count: 5,
      next_eligible_date: '2026-09-28',
      turnaround_date: '2026-10-19',
    },
  ];

  // Thử lên khóa ngày 20/08/2026 (cách 07/09/2026 chỉ 18 ngày < 6 tuần) -> PHẢI BỊ CHẶN!
  const beforeAttempt = validateAllocationRequest({
    teacher,
    allocations,
    courseOpeningDate: '2026-08-20',
    requestedStudents: 1,
  });
  assert.equal(beforeAttempt.valid, false);
  assert.match(beforeAttempt.error, /chưa đủ 6 tuần/);

  // Thử lên khóa ngày 01/10/2026 (cách 07/09/2026 chỉ 24 ngày < 6 tuần) -> PHẢI BỊ CHẶN!
  const afterAttempt = validateAllocationRequest({
    teacher,
    allocations,
    courseOpeningDate: '2026-10-01',
    requestedStudents: 1,
  });
  assert.equal(afterAttempt.valid, false);
  assert.match(afterAttempt.error, /chưa đủ 6 tuần/);
});


