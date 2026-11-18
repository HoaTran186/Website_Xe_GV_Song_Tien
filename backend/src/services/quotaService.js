const dayjs = require('dayjs');

/**
 * Chuyển đổi chuỗi ngày (dd/mm/yyyy hoặc yyyy-mm-dd) về chuẩn nội bộ YYYY-MM-DD
 */
function toISODate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return s.slice(0, 10);
}

/**
 * Định dạng ngày sang chuẩn Việt Nam dd/mm/yyyy để hiển thị
 */
function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const iso = toISODate(dateStr);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return String(dateStr);
}

/**
 * Cộng số ngày theo định dạng chuẩn YYYY-MM-DD
 */
function addDays(dateStr, days) {
  return dayjs(toISODate(dateStr)).add(days, 'day').format('YYYY-MM-DD');
}

/**
 * Chuẩn hóa mã hạng xe (B1, B2, C1, C)
 */
function normalizeVehicleClass(rawClass) {
  const s = String(rawClass || '').trim().toUpperCase();
  if (!s) return '';
  if (s === 'B.01' || s === 'B01' || s === 'B1') return 'B1';
  if (s === 'B.02' || s === 'B02' || s === 'B2' || s === 'BK') return 'B2';
  if (s === 'C.01' || s === 'C01' || s === 'C1') return 'C1';
  if (s === 'C' || s === 'CK') return 'C';
  return s;
}

/**
 * Tự động nhận diện Hạng của Khóa khai giảng từ tên khóa:
 * - B.01K260... / B01... / B1... -> Hạng B1
 * - BK260... / B2...             -> Hạng B2
 * - C1K260... / C.01... / C1...  -> Hạng C1
 * - CK260...                     -> Hạng C
 */
function detectCourseClass(courseName) {
  if (!courseName) return '';
  const s = String(courseName).trim().toUpperCase().replace(/\s+/g, '');
  if (s.startsWith('B.01') || s.startsWith('B01') || s.startsWith('B1') || s.includes('B.01K') || s.includes('B1K')) {
    return 'B1';
  }
  if (s.startsWith('C1') || s.startsWith('C.01') || s.startsWith('C01') || s.includes('C1K')) {
    return 'C1';
  }
  if (s.startsWith('BK') || s.startsWith('B2') || s.startsWith('B.02') || s.includes('B2K') || s.includes('BK2')) {
    return 'B2';
  }
  if (s.startsWith('CK')) {
    return 'C';
  }
  return '';
}

/**
 * Tính toán trạng thái định mức học viên (1 xe 1 GV = 5 HV),
 * kiểm tra nghiêm ngặt chu kỳ 6 tuần (42 ngày) và 3 tuần (21 ngày) theo cả 2 chiều thời gian:
 * - Nếu Giáo viên / Xe đã lên khóa mà khoảng cách giữa ngày khai giảng đang xét (refDate)
 *   và đợt lên khóa đó CHƯA ĐỦ 6 TUẦN (|refDate - opening_date| < 42 ngày):
 *   + Nếu đã lên đủ định mức (5 HV) hoặc đã lên từ 2 đợt trở lên: TUYỆT ĐỐI KHÔNG THỂ LÊN KHÓA khi chưa đủ 6 tuần!
 *   + Nếu khóa trước mới lên một phần (ví dụ 3 HV, còn lại 2 HV):
 *     * Nếu khoảng cách < 3 tuần (21 ngày): KHÔNG THỂ LÊN KHÓA (phải chờ đủ 3 tuần).
 *     * Nếu khoảng cách từ đủ 3 tuần (21 ngày) đến dưới 6 tuần (41 ngày): chỉ được lên tối đa phần còn lại (2 HV).
 */
function calculateTeacherQuotaStatus(teacher, allocations, referenceDateStr) {
  const refDate = toISODate(referenceDateStr) || dayjs().format('YYYY-MM-DD');
  const refDay = dayjs(refDate);
  const maxQuota = Number(teacher.max_quota) || 5;

  // Chuẩn hóa danh sách các đợt đã lên khóa và tính khoảng cách ngày so với refDate
  const normalizedAllocs = (allocations || [])
    .map((a) => {
      const openIso = toISODate(a.opening_date);
      const diffDays = refDay.diff(dayjs(openIso), 'day'); // > 0 nếu khóa ở quá khứ, < 0 nếu khóa ở tương lai
      return {
        ...a,
        opening_date: openIso,
        next_eligible_date: toISODate(a.next_eligible_date) || addDays(openIso, 21),
        turnaround_date: toISODate(a.turnaround_date) || addDays(openIso, 42),
        diff_days: diffDays,
        abs_diff_days: Math.abs(diffDays),
      };
    })
    .sort((a, b) => a.opening_date.localeCompare(b.opening_date));

  // Tất cả các đợt lên khóa nằm trong phạm vi CHƯA ĐỦ 6 TUẦN (< 42 ngày) tính từ ngày đang xét refDate (cả trước và sau refDate)
  const activeAllocations = normalizedAllocs.filter((a) => a.abs_diff_days < 42);

  const usedQuota = activeAllocations.reduce(
    (sum, item) => sum + Number(item.student_count || 0),
    0
  );
  const remainingQuota = Math.max(0, maxQuota - usedQuota);

  const firstAllocation = activeAllocations.length > 0 ? activeAllocations[0] : null;
  const lastAllocation =
    activeAllocations.length > 0 ? activeAllocations[activeAllocations.length - 1] : null;

  // Tìm đợt lên khóa gần ngày refDate nhất trong cửa sổ 6 tuần
  const closestAllocation =
    activeAllocations.length > 0
      ? [...activeAllocations].sort((a, b) => a.abs_diff_days - b.abs_diff_days)[0]
      : null;

  const lastOpeningDate = lastAllocation ? lastAllocation.opening_date : null;
  // Mốc +3 tuần chỉ áp dụng khi số học viên đã lên NHỎ HƠN 5 (còn lại remainingQuota > 0 để lên tiếp cho đủ 5 HV).
  // Nếu đã lên đủ 5 học viên (remainingQuota === 0) thì không có mốc +3 tuần mà bắt buộc quay đầu là 6 tuần (+42 ngày).
  const nextEligibleDate =
    lastAllocation && remainingQuota > 0 ? addDays(lastAllocation.opening_date, 21) : null;
  const earliestTurnaroundDate = firstAllocation ? addDays(firstAllocation.opening_date, 42) : null;
  const latestTurnaroundDate = lastAllocation ? addDays(lastAllocation.opening_date, 42) : null;

  let canEnroll = true;
  let statusCode = 'READY_FULL';
  let statusMessage = `Sẵn sàng khai giảng tối đa ${maxQuota} học viên (1 xe - 1 GV).`;

  if (activeAllocations.length > 0) {
    // Trường hợp 1: Đã lên đủ 5 HV (remainingQuota === 0) hoặc đã lên đủ 2 đợt trong chu kỳ 6 tuần -> BẮT BUỘC CHỜ ĐỦ 6 TUẦN!
    if (remainingQuota === 0 || activeAllocations.length >= 2) {
      canEnroll = false;
      statusCode = 'FULL_WAIT_6_WEEKS';
      const conflictDates = activeAllocations
        .map((a) => `${formatDateVN(a.opening_date)} (${a.student_count} HV)`)
        .join(', ');

      if (closestAllocation && closestAllocation.diff_days < 0) {
        statusMessage = `Không thể lên khóa vì chưa đủ 6 tuần! Đã có lịch lên khóa ngày ${conflictDates} (cách ngày ${formatDateVN(refDate)} chỉ ${closestAllocation.abs_diff_days} ngày < 6 tuần). Phải cách nhau đủ 6 tuần (42 ngày).`;
      } else {
        statusMessage = `Không thể lên khóa vì chưa đủ 6 tuần! Đã lên ${usedQuota}/${maxQuota} HV vào ngày ${conflictDates}. Phải chờ đủ 6 tuần (đến ngày ${formatDateVN(latestTurnaroundDate)}) mới được quay đầu khai giảng lại.`;
      }
    } else if (usedQuota > 0 && remainingQuota > 0) {
      // Trường hợp 2: Mới lên 1 phần (ví dụ 3 HV, còn lại 2 HV)
      // Kiểm tra khoảng cách so với đợt đã lên có đủ 3 tuần (21 ngày) chưa
      if (closestAllocation.abs_diff_days < 21) {
        canEnroll = false;
        statusCode = 'COOLDOWN_WAIT_3_WEEKS';
        const allowed3WDate = addDays(closestAllocation.opening_date, 21);
        statusMessage = `Chưa đủ 3 tuần & 6 tuần! Đã lên ${usedQuota}/${maxQuota} HV vào ngày ${formatDateVN(closestAllocation.opening_date)} (còn lại ${remainingQuota} HV). Phải cách tối thiểu 3 tuần (từ ngày ${formatDateVN(allowed3WDate)}) mới được lên tiếp ${remainingQuota} HV còn lại, hoặc chờ đủ 6 tuần (${formatDateVN(latestTurnaroundDate)}) để quay đầu 5 HV.`;
      } else {
        canEnroll = true;
        statusCode = 'READY_REMAINING_AFTER_3_WEEKS';
        statusMessage = `Đã qua 3 tuần kể từ khóa ${formatDateVN(closestAllocation.opening_date)} (đã lên ${usedQuota} HV, chưa đủ 6 tuần nên chưa quay đầu 5 HV). Hiện chỉ được phép lên tiếp tối đa ${remainingQuota} HV còn lại (Đủ 6 tuần quay đầu vào ${formatDateVN(earliestTurnaroundDate)}).`;
      }
    }
  }

  // Kiểm tra cảnh báo Hộ Kinh Doanh của Giáo viên và Nhóm giáo viên
  const teacherHasHKD = Boolean(teacher.has_business_household);
  const groupHasHKD = Boolean(teacher.group_has_business_household);
  const hasBusinessHouseholdWarning = !teacherHasHKD || !groupHasHKD;

  let businessHouseholdWarningMessage = '';
  if (!teacherHasHKD && !groupHasHKD) {
    businessHouseholdWarningMessage = `Cảnh báo: Giáo viên "${teacher.full_name}" và Nhóm "${teacher.group_name}" đều chưa có Hộ Kinh Doanh!`;
  } else if (!teacherHasHKD) {
    businessHouseholdWarningMessage = `Cảnh báo: Giáo viên "${teacher.full_name}" chưa có Hộ Kinh Doanh!`;
  } else if (!groupHasHKD) {
    businessHouseholdWarningMessage = `Cảnh báo: Nhóm giáo viên "${teacher.group_name}" chưa có Hộ Kinh Doanh!`;
  }

  return {
    reference_date: refDate,
    max_quota: maxQuota,
    used_quota: usedQuota,
    remaining_quota: remainingQuota,
    last_opening_date: lastOpeningDate,
    next_eligible_date: nextEligibleDate,
    turnaround_date: latestTurnaroundDate || earliestTurnaroundDate,
    latest_turnaround_date: latestTurnaroundDate,
    can_enroll_on_reference_date: canEnroll,
    status_code: statusCode,
    status_message: statusMessage,
    active_allocations: activeAllocations,
    business_household_warning: hasBusinessHouseholdWarning,
    business_household_warning_message: businessHouseholdWarningMessage,
  };
}

/**
 * Kiểm tra hợp lệ khi thực hiện đăng ký lên khóa cho một Giáo viên / Xe vào một Ngày khai giảng
 */
function validateAllocationRequest({ teacher, allocations, courseOpeningDate, requestedStudents }) {
  const count = Number(requestedStudents);
  if (!Number.isInteger(count) || count < 1) {
    return {
      valid: false,
      error: 'Số lượng học viên lên khóa phải là số nguyên lớn hơn hoặc bằng 1.',
    };
  }

  const normalizedCourseDate = toISODate(courseOpeningDate);
  const quotaStatus = calculateTeacherQuotaStatus(teacher, allocations, normalizedCourseDate);

  if (!quotaStatus.can_enroll_on_reference_date) {
    return {
      valid: false,
      error: `[${teacher.full_name}] ${quotaStatus.status_message}`,
      quotaStatus,
    };
  }

  if (count > quotaStatus.remaining_quota) {
    return {
      valid: false,
      error: `Vượt quá số lượng còn lại trong chu kỳ 6 tuần! "${teacher.full_name}" hiện chỉ còn lại tối đa ${quotaStatus.remaining_quota} học viên được phép khai giảng (định mức ${quotaStatus.max_quota} HV, đã lên ${quotaStatus.used_quota} HV trong vòng 6 tuần).`,
      quotaStatus,
    };
  }

  return {
    valid: true,
    next_eligible_date: addDays(normalizedCourseDate, 21),
    turnaround_date: addDays(normalizedCourseDate, 42),
    quotaStatus,
  };
}

module.exports = {
  toISODate,
  formatDateVN,
  addDays,
  normalizeVehicleClass,
  detectCourseClass,
  calculateTeacherQuotaStatus,
  validateAllocationRequest,
};
