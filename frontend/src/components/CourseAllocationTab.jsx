import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarPlus,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowLeftRight,
  Check,
  Filter,
  Users,
  GraduationCap,
} from 'lucide-react';
import { api } from '../api/client';
import {
  formatDateVN,
  toISODate,
  detectCourseClass,
  normalizeVehicleClass,
  getCoursePatternLabel,
} from '../utils/dateFormat';

export default function CourseAllocationTab({
  courses,
  selectedCourseId,
  setSelectedCourseId,
  onRefreshAll,
}) {
  const [groupsWithQuota, setGroupsWithQuota] = useState([]);
  const [teachersWithQuota, setTeachersWithQuota] = useState([]);
  const [vehiclesWithQuota, setVehiclesWithQuota] = useState([]);

  // Mặc định chỉ hiển thị các Giáo viên & Xe ĐƯỢC PHÉP LÊN KHÓA vào ngày khai giảng đang chọn và ĐÚNG HẠNG KHÓA
  const [onlyShowEligibleOnDate, setOnlyShowEligibleOnDate] = useState(true);
  const [classFilterMode, setClassFilterMode] = useState('AUTO_BY_COURSE'); // 'AUTO_BY_COURSE' | 'ALL' | 'B1' | 'B2' | 'C1'

  // Form tạo Khóa (Ngày) khai giảng mới
  const [newCourseName, setNewCourseName] = useState('');
  const [newOpeningDate, setNewOpeningDate] = useState('');
  const [newClosingDate, setNewClosingDate] = useState('');
  const [newCourseNotes, setNewCourseNotes] = useState('');

  // Form lên khóa (hỗ trợ mượn Giáo viên hoặc mượn Xe từ nhóm khác)
  const [allocatingGroupId, setAllocatingGroupId] = useState('');
  const [allowBorrowCrossGroup, setAllowBorrowCrossGroup] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [studentCount, setStudentCount] = useState(5);
  const [allocationClosingDate, setAllocationClosingDate] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');

  // Cảnh báo xác nhận Hộ Kinh Doanh
  const [pendingHKDWarning, setPendingHKDWarning] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const activeCourse =
    courses.find((c) => Number(c.id) === Number(selectedCourseId)) || courses[0] || null;
  const referenceDate = activeCourse ? activeCourse.opening_date : '';
  const detectedCourseClass = activeCourse ? detectCourseClass(activeCourse.course_name) : '';

  // Hạng xe đang được lọc (Mặc định tự động lấy theo hạng của Khóa đang chọn: B1 / B2 / C1)
  const effectiveClassFilter =
    classFilterMode === 'AUTO_BY_COURSE'
      ? detectedCourseClass
      : classFilterMode === 'ALL'
      ? ''
      : classFilterMode;

  const loadQuotaForCourseDate = async (dateStr) => {
    try {
      const [gList, tList, vList] = await Promise.all([
        api.getGroups(dateStr),
        api.getTeachers({ referenceDate: dateStr }),
        api.getVehicles(dateStr),
      ]);
      setGroupsWithQuota(gList);
      setTeachersWithQuota(tList);
      setVehiclesWithQuota(vList);

      if (!allocatingGroupId && gList.length > 0) {
        const firstGroupWithTeacher =
          gList.find((g) => g.teacher_count > 0 || g.spare_vehicle_count > 0) || gList[0];
        setAllocatingGroupId(String(firstGroupWithTeacher.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadQuotaForCourseDate(referenceDate);
    if (activeCourse?.closing_date) {
      setAllocationClosingDate(formatDateVN(activeCourse.closing_date));
    } else {
      setAllocationClosingDate('');
    }
  }, [referenceDate, activeCourse?.id, courses]);

  // Kiểm tra một Giáo viên hoặc Xe có khớp với Hạng khóa đang lọc (B1, B2, C1) hay không
  const matchesClassFilter = (vehicleClassStr) => {
    if (!effectiveClassFilter) return true;
    const norm = normalizeVehicleClass(vehicleClassStr);
    if (!norm) return true; // Nếu GV chưa có xe riêng thì vẫn cho phép mượn xe đúng hạng
    return norm === effectiveClassFilter;
  };

  // Lọc các Giáo viên và Xe theo: (1) Đúng Hạng Khóa (B1/B2/C1) và (2) Đủ điều kiện lên ngày đang chọn
  const baseTeachers = teachersWithQuota.filter((t) => {
    const classOk = matchesClassFilter(t.vehicle?.vehicle_class);
    const dateOk = onlyShowEligibleOnDate
      ? Boolean(t.quota_status?.can_enroll_on_reference_date)
      : true;
    return classOk && dateOk;
  });

  const baseVehicles = vehiclesWithQuota.filter((v) => {
    const classOk = matchesClassFilter(v.vehicle_class);
    const dateOk = onlyShowEligibleOnDate
      ? Boolean(v.quota_status?.can_enroll_on_reference_date)
      : true;
    return classOk && dateOk;
  });

  const sameGroupTeachers = baseTeachers.filter(
    (t) => !allocatingGroupId || Number(t.group_id) === Number(allocatingGroupId)
  );
  const otherGroupTeachers = baseTeachers.filter(
    (t) => allocatingGroupId && Number(t.group_id) !== Number(allocatingGroupId)
  );

  const selectableTeachers = allowBorrowCrossGroup
    ? [...sameGroupTeachers, ...otherGroupTeachers]
    : sameGroupTeachers;

  const sameGroupVehicles = baseVehicles.filter(
    (v) => !allocatingGroupId || Number(v.group_id) === Number(allocatingGroupId)
  );
  const otherGroupVehicles = baseVehicles.filter(
    (v) => allocatingGroupId && Number(v.group_id) !== Number(allocatingGroupId)
  );
  const selectableVehicles = allowBorrowCrossGroup
    ? [...sameGroupVehicles, ...otherGroupVehicles]
    : sameGroupVehicles;

  // Khi đổi Nhóm lên khóa hoặc đổi Khóa (đổi Hạng B1/B2/C1), tự động chọn Giáo viên và Xe đúng hạng & đủ điều kiện
  useEffect(() => {
    if (selectableTeachers.length > 0) {
      const currentStillValid = selectableTeachers.some(
        (t) => Number(t.id) === Number(selectedTeacherId)
      );
      if (!currentStillValid) {
        const chosenT =
          sameGroupTeachers.find((t) => t.quota_status?.can_enroll_on_reference_date) ||
          sameGroupTeachers[0] ||
          selectableTeachers.find((t) => t.quota_status?.can_enroll_on_reference_date) ||
          selectableTeachers[0];
        setSelectedTeacherId(String(chosenT.id));
        setStudentCount(Math.max(1, chosenT.quota_status?.remaining_quota || 5));

        const groupOwnVehicle =
          sameGroupVehicles.find((v) => v.quota_status?.can_enroll_on_reference_date) ||
          sameGroupVehicles[0];
        if (
          Number(chosenT.group_id) !== Number(allocatingGroupId) &&
          groupOwnVehicle
        ) {
          setSelectedVehicleId(String(groupOwnVehicle.id));
        } else if (
          chosenT.vehicle?.id &&
          matchesClassFilter(chosenT.vehicle.vehicle_class)
        ) {
          setSelectedVehicleId(String(chosenT.vehicle.id));
        } else if (selectableVehicles[0]) {
          setSelectedVehicleId(String(selectableVehicles[0].id));
        }
      }
    } else {
      setSelectedTeacherId('');
    }
  }, [
    allocatingGroupId,
    allowBorrowCrossGroup,
    onlyShowEligibleOnDate,
    effectiveClassFilter,
    teachersWithQuota,
    vehiclesWithQuota,
  ]);

  const currentTeacher = teachersWithQuota.find(
    (t) => Number(t.id) === Number(selectedTeacherId)
  );
  const currentVehicle = vehiclesWithQuota.find(
    (v) => Number(v.id) === Number(selectedVehicleId)
  );
  const currentAllocatingGroup = groupsWithQuota.find(
    (g) => Number(g.id) === Number(allocatingGroupId)
  );

  const isBorrowingTeacher =
    currentTeacher &&
    allocatingGroupId &&
    Number(currentTeacher.group_id) !== Number(allocatingGroupId);
  const isBorrowingVehicle =
    currentVehicle &&
    allocatingGroupId &&
    currentVehicle.group_id &&
    Number(currentVehicle.group_id) !== Number(allocatingGroupId);

  const canTeacherEnroll = Boolean(currentTeacher?.quota_status?.can_enroll_on_reference_date);
  const canVehicleEnroll = Boolean(currentVehicle?.quota_status?.can_enroll_on_reference_date);
  const vehicleMatchesCourseClass =
    !detectedCourseClass ||
    !currentVehicle ||
    normalizeVehicleClass(currentVehicle.vehicle_class) === detectedCourseClass;

  const canBothEnroll = canTeacherEnroll && canVehicleEnroll && vehicleMatchesCourseClass;

  // Danh sách hiển thị ở Bảng Khu vực 2 (lọc theo hạng khóa B1/B2/C1 + đủ điều kiện ngày)
  const tableTeachers = teachersWithQuota.filter((t) => {
    const classOk = matchesClassFilter(t.vehicle?.vehicle_class);
    const dateOk = onlyShowEligibleOnDate
      ? Boolean(t.quota_status?.can_enroll_on_reference_date)
      : true;
    return classOk && dateOk;
  });

  // Tìm danh sách tên các Khóa khai giảng hiện có mà một chiếc xe (theo hạng B1/B2/C1) có thể tham gia
  const getMatchingCoursesForVehicleClass = (vClass) => {
    const norm = normalizeVehicleClass(vClass);
    if (!norm) return [];
    return courses.filter((c) => {
      const cClass = detectCourseClass(c.course_name);
      return !cClass || cClass === norm;
    });
  };

  const handleQuickPickTeacherAndVehicle = (teacher, vehicleIdToUse) => {
    setAllocatingGroupId(String(teacher.group_id));
    setSelectedTeacherId(String(teacher.id));
    if (vehicleIdToUse) {
      setSelectedVehicleId(String(vehicleIdToUse));
    } else if (teacher.vehicle?.id) {
      setSelectedVehicleId(String(teacher.vehicle.id));
    }
    setStudentCount(Math.max(1, teacher.quota_status?.remaining_quota || 5));
    setPendingHKDWarning(null);
    setErrorMsg(null);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    try {
      const created = await api.createCourse({
        course_name: newCourseName,
        opening_date: newOpeningDate,
        closing_date: newClosingDate,
        notes: newCourseNotes,
      });
      setNewCourseName('');
      setNewOpeningDate('');
      setNewClosingDate('');
      setNewCourseNotes('');
      await onRefreshAll();
      setSelectedCourseId(created.id);
      const autoClass = detectCourseClass(created.course_name);
      setFeedback(
        `Đã tạo khóa khai giảng "${created.course_name}" (Ngày ${formatDateVN(created.opening_date)}${
          autoClass ? ` — Tự động nhận diện Hạng ${autoClass}` : ''
        })!`
      );
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const submitAllocation = async (confirmWithoutHKD = false) => {
    if (!activeCourse || !currentTeacher) return;
    setErrorMsg(null);
    setFeedback(null);

    try {
      const res = await api.createAllocation({
        course_id: activeCourse.id,
        allocating_group_id: allocatingGroupId
          ? Number(allocatingGroupId)
          : currentTeacher.group_id,
        teacher_id: currentTeacher.id,
        vehicle_id: selectedVehicleId ? Number(selectedVehicleId) : currentTeacher.vehicle?.id,
        student_count: Number(studentCount),
        closing_date: activeCourse?.closing_date ? formatDateVN(activeCourse.closing_date) : '',
        confirm_without_business_household: confirmWithoutHKD,
        notes: allocationNotes,
      });

      setPendingHKDWarning(null);
      setAllocationNotes('');
      await onRefreshAll();
      await loadQuotaForCourseDate(referenceDate);

      setFeedback(
        `Lên khóa thành công cho ${res.group_name}: Giáo viên ${res.teacher_name} — Xe ${res.license_plate} đã lên ${res.student_count} học viên trong ${res.course_name} (${formatDateVN(res.opening_date)}). ${
          res.borrow_note ? `[${res.borrow_note}] • ` : ''
        }Số lượng còn lại khai giảng: ${res.updated_quota_status.remaining_quota} HV (${
          res.updated_quota_status.remaining_quota > 0
            ? `Mở khóa tiếp sau 3 tuần: ${formatDateVN(res.next_eligible_date)}`
            : `Đã đủ 5 HV — Quay đầu 6 tuần: ${formatDateVN(res.turnaround_date)}`
        }).`
      );
    } catch (err) {
      if (err.status === 409 && err.payload?.requires_confirmation) {
        setPendingHKDWarning(err.payload.message);
      } else {
        setErrorMsg(err.message);
      }
    }
  };

  const handleDeleteAllocation = async (allocId) => {
    if (!window.confirm('Bạn muốn xóa bản ghi lên khóa này?')) return;
    try {
      await api.deleteAllocation(allocId);
      await onRefreshAll();
      await loadQuotaForCourseDate(referenceDate);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const previewNewCourseClass = detectCourseClass(newCourseName);

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-sm font-medium flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl text-sm font-medium flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* THÔNG TIN TỔNG QUAN & TỔNG SỐ HỌC VIÊN CỦA KHÓA ĐANG CHỌN */}
      {activeCourse && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  Khóa đang chọn
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {activeCourse.course_name}
                </h2>
                {detectedCourseClass && (
                  <span className="px-3 py-0.5 bg-amber-400 text-slate-950 font-black text-xs rounded-full border border-slate-900 shadow-2xs">
                    Hạng {detectedCourseClass} ({getCoursePatternLabel(detectedCourseClass)})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 mt-1.5">
                <span>
                  📅 Khai giảng: <strong className="text-blue-900 font-bold">{formatDateVN(activeCourse.opening_date)}</strong>
                </span>
                <span>
                  🏁 Bế giảng:{' '}
                  <strong className="text-purple-900 font-bold">
                    {activeCourse.closing_date ? formatDateVN(activeCourse.closing_date) : 'Chưa cập nhật'}
                  </strong>
                </span>
                {activeCourse.notes && (
                  <span className="text-slate-500 italic">
                    Ghi chú: {activeCourse.notes}
                  </span>
                )}
              </div>
            </div>

            {/* Khối Thống kê Tổng Số Học Viên Khóa */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto">
              <div className="col-span-2 sm:col-span-1 bg-white border-2 border-blue-600 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-center shadow-sm">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Tổng Số HV Khóa
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-700 leading-tight">
                  {activeCourse.total_students || 0}{' '}
                  <span className="text-xs font-bold text-slate-600">học viên</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center shadow-sm">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Đã Lên Khóa
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {activeCourse.allocations?.length || 0}{' '}
                  <span className="text-xs font-normal text-slate-500">lượt xe</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center shadow-sm">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Số Nhóm
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {activeCourse.participating_groups_count || 0}{' '}
                  <span className="text-xs font-normal text-slate-500">nhóm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chi tiết học viên phân bổ theo từng nhóm giáo viên */}
          {activeCourse.allocations && activeCourse.allocations.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-blue-200/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Chi tiết học viên theo nhóm:
              </span>
              {Object.entries(
                activeCourse.allocations.reduce((acc, a) => {
                  acc[a.group_name] = (acc[a.group_name] || 0) + Number(a.student_count);
                  return acc;
                }, {})
              ).map(([grpName, stCount]) => (
                <span
                  key={grpName}
                  className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-slate-800 font-semibold shadow-2xs flex items-center gap-1.5"
                >
                  <span>{grpName}:</span>
                  <span className="text-blue-700 font-extrabold">{stCount} HV</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Khu vực 1: Chọn Khóa Khai Giảng & Tạo Ngày Khai Giảng Mới */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
          {/* Header thanh gọn */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-700" />
              <h2 className="text-base font-bold text-slate-900">
                Đăng Ký Lên Khóa
              </h2>
              {detectedCourseClass && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 font-bold text-xs rounded-full border border-amber-300">
                  Hạng {detectedCourseClass}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={onlyShowEligibleOnDate}
                  onChange={(e) => setOnlyShowEligibleOnDate(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded"
                />
                Chỉ hiện đủ điều kiện
              </label>

              <span className="text-slate-300">|</span>

              <label className="flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer hover:text-indigo-900 select-none">
                <input
                  type="checkbox"
                  checked={allowBorrowCrossGroup}
                  onChange={(e) => setAllowBorrowCrossGroup(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                Cho phép mượn ngoài nhóm
              </label>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAllocation(false);
            }}
            className="space-y-4"
          >
            {/* Hàng 1: Khóa & Nhóm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Khóa Khai Giảng *
                </label>
                <select
                  value={activeCourse?.id || ''}
                  onChange={(e) => {
                    setSelectedCourseId(Number(e.target.value));
                    setClassFilterMode('AUTO_BY_COURSE');
                    setPendingHKDWarning(null);
                    setErrorMsg(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-blue-50/50 text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {courses.map((c) => {
                    const cClass = detectCourseClass(c.course_name);
                    return (
                      <option key={c.id} value={c.id}>
                        {formatDateVN(c.opening_date)} — {c.course_name}{' '}
                        {cClass ? `[${cClass}]` : ''} ({c.total_students || 0} HV)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Nhóm Lên Khóa *
                </label>
                <select
                  value={allocatingGroupId}
                  onChange={(e) => {
                    setAllocatingGroupId(e.target.value);
                    setPendingHKDWarning(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {groupsWithQuota.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Được lên: {g.available_now_quota} HV)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hàng 2: Giáo Viên & Xe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>3. Giáo Viên *</span>
                  {effectiveClassFilter && (
                    <span className="text-[11px] font-normal text-slate-500">
                      Hạng {effectiveClassFilter}
                    </span>
                  )}
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setSelectedTeacherId(tId);
                    setPendingHKDWarning(null);
                    const found = teachersWithQuota.find((x) => Number(x.id) === Number(tId));
                    if (found) {
                      setStudentCount(Math.max(1, found.quota_status.remaining_quota || 1));
                      const groupSpareCar = sameGroupVehicles.find((v) => !v.teacher_id);
                      if (
                        Number(found.group_id) !== Number(allocatingGroupId) &&
                        groupSpareCar
                      ) {
                        setSelectedVehicleId(String(groupSpareCar.id));
                      } else if (found.vehicle?.id) {
                        setSelectedVehicleId(String(found.vehicle.id));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectableTeachers.length === 0 && (
                    <option value="">
                      -- Không có GV {effectiveClassFilter ? `hạng ${effectiveClassFilter}` : ''} đủ điều kiện --
                    </option>
                  )}
                  {sameGroupTeachers.length > 0 && (
                    <optgroup label="Giáo viên trong nhóm">
                      {sameGroupTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.quota_status.can_enroll_on_reference_date ? '✓' : '⛔'}{' '}
                          {t.full_name}{' '}
                          {t.vehicle ? `(Xe ${t.vehicle.license_plate})` : '(Chưa có xe)'} — [Còn:{' '}
                          {t.quota_status.remaining_quota} HV]
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allowBorrowCrossGroup && otherGroupTeachers.length > 0 && (
                    <optgroup label="Mượn giáo viên nhóm khác">
                      {otherGroupTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.quota_status.can_enroll_on_reference_date ? '✓' : '⛔'} [Mượn từ{' '}
                          {t.group_name}] {t.full_name}{' '}
                          {t.vehicle ? `(Xe ${t.vehicle.license_plate})` : ''} — [Còn:{' '}
                          {t.quota_status.remaining_quota} HV]
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>4. Xe Tập Lái *</span>
                  {effectiveClassFilter && (
                    <span className="text-[11px] font-normal text-slate-500">
                      Hạng {effectiveClassFilter}
                    </span>
                  )}
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    setPendingHKDWarning(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectableVehicles.length === 0 && (
                    <option value="">
                      -- Không có Xe {effectiveClassFilter ? `hạng ${effectiveClassFilter}` : ''} đủ điều kiện --
                    </option>
                  )}
                  {sameGroupVehicles.length > 0 && (
                    <optgroup label="Xe trong nhóm">
                      {sameGroupVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.quota_status.can_enroll_on_reference_date ? '✓' : '⛔'}{' '}
                          {v.license_plate} (Hạng {v.vehicle_class}) — [Còn:{' '}
                          {v.quota_status.remaining_quota} HV]
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allowBorrowCrossGroup && otherGroupVehicles.length > 0 && (
                    <optgroup label="Mượn xe nhóm khác">
                      {otherGroupVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.quota_status.can_enroll_on_reference_date ? '✓' : '⛔'} [Mượn từ{' '}
                          {v.group_name}] {v.license_plate} (Hạng {v.vehicle_class}) — [Còn:{' '}
                          {v.quota_status.remaining_quota} HV]
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {/* Hàng 3: Số Lượng Học Viên & Ghi Chú */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  5. Số Lượng Học Viên Lên *
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={studentCount}
                    onChange={(e) => setStudentCount(Math.min(5, Math.max(1, Number(e.target.value))))}
                    className="w-16 sm:w-20 px-2 sm:px-3 py-2 border border-slate-300 rounded-lg text-base font-black text-center text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                  />
                  {/* Nút bấm nhanh 1, 2, 3, 4, 5 cực tiện lợi */}
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setStudentCount(num)}
                        className={`flex-1 py-1.5 sm:py-2 px-0.5 sm:px-1 text-[11px] sm:text-xs font-bold rounded-lg border transition cursor-pointer ${
                          Number(studentCount) === num
                            ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {num} HV
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6. Ghi Chú (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  placeholder="Ghi chú thêm nếu có..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Trạng thái mượn liên nhóm (chỉ hiện khi có mượn) */}
            {(isBorrowingTeacher || isBorrowingVehicle) && (
              <div className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-950 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Đang mượn liên nhóm:</strong>{' '}
                  {isBorrowingTeacher && `GV ${currentTeacher.full_name} (${currentTeacher.group_name})`}
                  {isBorrowingTeacher && isBorrowingVehicle && ' • '}
                  {isBorrowingVehicle && `Xe ${currentVehicle?.license_plate} (${currentVehicle?.group_name})`}
                </span>
              </div>
            )}

            {/* Thanh trạng thái kiểm tra điều kiện (gọn gàng, tinh tế) */}
            {currentTeacher && (
              canBothEnroll ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Đủ điều kiện:</strong> {currentTeacher.full_name} + {currentVehicle?.license_plate || 'Chưa chọn xe'} sẵn sàng lên khóa.
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-full font-bold text-emerald-800 text-[11px] whitespace-nowrap shadow-2xs">
                    Được lên: {currentTeacher.quota_status.remaining_quota} HV
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-950 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Không đủ điều kiện lên khóa</span>
                  </div>
                  {!vehicleMatchesCourseClass && (
                    <p className="font-semibold text-red-800">
                      • Sai hạng xe: Khóa "{activeCourse?.course_name}" là Hạng {detectedCourseClass}, nhưng xe {currentVehicle?.license_plate} là Hạng {currentVehicle?.vehicle_class}.
                    </p>
                  )}
                  {!currentTeacher.quota_status.can_enroll_on_reference_date && (
                    <p>• GV ({currentTeacher.full_name}): {currentTeacher.quota_status.status_message}</p>
                  )}
                  {currentVehicle && !currentVehicle.quota_status.can_enroll_on_reference_date && (
                    <p>• Xe ({currentVehicle.license_plate}): {currentVehicle.quota_status.status_message}</p>
                  )}
                </div>
              )
            )}

            {/* Cảnh báo chưa có Hộ Kinh Doanh nếu có */}
            {currentTeacher &&
              (currentTeacher.quota_status.business_household_warning ||
                (currentAllocatingGroup && !currentAllocatingGroup.has_business_household)) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Lưu ý:</strong> {currentTeacher.quota_status.business_household_warning_message || `Nhóm "${currentAllocatingGroup?.name}" chưa có Hộ Kinh Doanh.`}
                  </span>
                </div>
              )}

            {pendingHKDWarning && (
              <div className="p-4 bg-amber-100 border-2 border-amber-500 rounded-xl space-y-3">
                <div className="flex items-start gap-2 text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-sm">{pendingHKDWarning}</p>
                    <p className="mt-1">
                      Giáo viên hoặc Nhóm giáo viên này chưa có Hộ Kinh Doanh. Bạn có chắc chắn vẫn muốn cho phép lên khóa kèm cảnh báo này không?
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => submitAllocation(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Vẫn Xác Nhận Lên Khóa (Kèm Cảnh Báo HKD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingHKDWarning(null)}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    Hủy Bỏ
                  </button>
                </div>
              </div>
            )}

            {/* Nút bấm Submit rõ ràng, thân thiện */}
            <button
              type="submit"
              disabled={!canBothEnroll}
              className={`w-full py-2.5 font-bold text-sm rounded-lg shadow-sm transition ${
                canBothEnroll
                  ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
              }`}
            >
              {canBothEnroll
                ? `✓ Xác Nhận Lên Khóa Cho Giáo Viên Này (${studentCount} Học Viên)`
                : '⛔ Chưa Đủ Điều Kiện Lên Khóa (Xem Chi Tiết Ở Trên)'}
            </button>
          </form>
        </div>

        {/* Form Tạo Khóa (Ngày) Khai Giảng Mới */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-emerald-700" />
            Tạo Khóa (Ngày Khai Giảng) Mới
          </h2>

          <form onSubmit={handleCreateCourse} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Tên Khóa Khai Giảng *
                </label>
                {previewNewCourseClass && (
                  <span className="px-2 py-0.5 bg-amber-300 text-slate-950 font-bold text-[11px] rounded">
                    Nhận diện: Khóa Hạng {previewNewCourseClass}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="VD: BK26045, B.01K26055, C1K26012..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ngày Khai Giảng *</span>
                  <span className="text-[11px] font-normal text-slate-400">dd/mm/yyyy</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={newOpeningDate}
                    onChange={(e) => setNewOpeningDate(e.target.value)}
                    placeholder="10/12/2026"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-emerald-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    tabIndex={-1}
                    value={toISODate(newOpeningDate)}
                    onChange={(e) => setNewOpeningDate(formatDateVN(e.target.value))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                    title="Chọn ngày khai giảng từ lịch"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ngày Bế Giảng</span>
                  <span className="text-[11px] font-normal text-slate-400">dd/mm/yyyy</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={newClosingDate}
                    onChange={(e) => setNewClosingDate(e.target.value)}
                    placeholder="15/03/2027"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-purple-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    tabIndex={-1}
                    value={toISODate(newClosingDate)}
                    onChange={(e) => setNewClosingDate(formatDateVN(e.target.value))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                    title="Chọn ngày bế giảng từ lịch"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
              <input
                type="text"
                value={newCourseNotes}
                onChange={(e) => setNewCourseNotes(e.target.value)}
                placeholder="Ghi chú đợt khai giảng"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-lg shadow-sm"
            >
              + Tạo Ngày Khai Giảng Mới & Lọc Xe Theo Hạng
            </button>
          </form>
        </div>
      </div>

      {/* Khu vực 2: DANH SÁCH LỌC XE NÀO - HẠNG NÀO CÓ THỂ LÊN KHÓA NÀO VÀO NGÀY ĐANG CHỌN */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-500 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-black rounded-lg">
                LỌC THEO NGÀY {formatDateVN(referenceDate)}
              </span>
              {effectiveClassFilter && (
                <span className="px-2.5 py-1 bg-amber-400 text-slate-950 text-xs font-black rounded-lg border border-slate-900">
                  CHỈ XE HẠNG {effectiveClassFilter} (KHÓA {activeCourse?.course_name})
                </span>
              )}
              <h3 className="text-base font-bold text-slate-900">
                Danh Sách Xe & Giáo Viên{' '}
                {effectiveClassFilter ? `Hạng ${effectiveClassFilter}` : 'Tất Cả Hạng'} Được Lên Khóa{' '}
                <span className="text-blue-800">{activeCourse?.course_name}</span> (Ngày{' '}
                <span className="text-emerald-700">{formatDateVN(referenceDate)}</span>)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Quy tắc: Khóa <strong>B.01K260...</strong> chỉ nhận xe <strong>Hạng B1</strong> • Khóa{' '}
              <strong>BK260...</strong> chỉ nhận xe <strong>Hạng B2</strong> • Khóa{' '}
              <strong>C1K260...</strong> chỉ nhận xe <strong>Hạng C1</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOnlyShowEligibleOnDate(!onlyShowEligibleOnDate)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            {onlyShowEligibleOnDate
              ? 'Xem thêm cả các Xe/GV đang chờ đủ 6T/3T'
              : 'Chỉ hiện các Xe/GV ĐƯỢC LÊN KHÓA ngày này'}
          </button>
        </div>

        {/* Thanh bấm lọc nhanh theo Hạng B1 / B2 / C1 */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 overflow-x-auto no-scrollbar sm:flex-wrap">
          <span className="text-xs font-bold text-slate-700 shrink-0 whitespace-nowrap">Lọc theo Hạng xe / Khóa:</span>
          {[
            {
              id: 'AUTO_BY_COURSE',
              label: `Tự động (${activeCourse?.course_name || ''} - Hạng ${detectedCourseClass || 'Tất cả'})`,
            },
            { id: 'B1', label: 'Hạng B1 (B.01K...)' },
            { id: 'B2', label: 'Hạng B2 (BK...)' },
            { id: 'C1', label: 'Hạng C1 (C1K...)' },
            { id: 'ALL', label: 'Tất cả (B1+B2+C1)' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setClassFilterMode(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap transition cursor-pointer ${
                classFilterMode === btn.id
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {tableTeachers.length === 0 ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center text-sm text-amber-900 font-semibold">
            Không có Giáo viên / Xe <strong>{effectiveClassFilter ? `Hạng ${effectiveClassFilter}` : ''}</strong> nào đủ điều kiện lên khóa vào ngày <strong>{formatDateVN(referenceDate)}</strong>. Hãy chọn ngày khai giảng khác, đổi bộ lọc hạng ở trên, hoặc bấm <em>"Xem thêm cả các Xe/GV đang chờ đủ 6T/3T"</em> để xem ngày quay đầu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50 text-emerald-950 border-b border-emerald-200">
                  <th className="py-2.5 px-3">Nhóm Giáo Viên</th>
                  <th className="py-2.5 px-3">Giáo Viên</th>
                  <th className="py-2.5 px-3">Biển Số Xe & Hạng</th>
                  <th className="py-2.5 px-3">Được Lên Khóa Nào?</th>
                  <th className="py-2.5 px-3">Đã Lên (Trong 6T)</th>
                  <th className="py-2.5 px-3">Số HV Được Lên ({formatDateVN(referenceDate)})</th>
                  <th className="py-2.5 px-3">Trạng Thái Chu Kỳ 3T / 6T</th>
                  <th className="py-2.5 px-3 text-right">Chọn Nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tableTeachers.map((t) => {
                  const q = t.quota_status;
                  const isSelected = Number(t.id) === Number(selectedTeacherId);
                  const vClass = normalizeVehicleClass(t.vehicle?.vehicle_class);
                  const matchingCourses = getMatchingCoursesForVehicleClass(vClass);

                  return (
                    <tr
                      key={t.id}
                      className={
                        isSelected
                          ? 'bg-blue-50/80'
                          : q.can_enroll_on_reference_date
                          ? 'hover:bg-emerald-50/40'
                          : 'bg-red-50/40 opacity-75'
                      }
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {t.group_name}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {t.full_name}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {t.vehicle ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-amber-300 text-slate-950 font-bold rounded border border-slate-700">
                              {t.vehicle.license_plate}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-black text-[11px] ${
                                vClass === 'B1'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : vClass === 'B2'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : 'bg-orange-100 text-orange-900 border border-orange-300'
                              }`}
                            >
                              Hạng {vClass}
                            </span>
                          </div>
                        ) : (
                          <span className="text-indigo-700 font-semibold italic">
                            Chưa có xe riêng
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 whitespace-nowrap">
                          {getCoursePatternLabel(vClass)}
                        </div>
                        {matchingCourses.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Khóa khớp hạng:{' '}
                            {matchingCourses
                              .slice(0, 3)
                              .map((mc) => `${mc.course_name} (${formatDateVN(mc.opening_date)})`)
                              .join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {q.used_quota} / {q.max_quota} HV
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {q.can_enroll_on_reference_date ? (
                          <span className="inline-block whitespace-nowrap px-3 py-1 bg-emerald-600 text-white font-bold rounded-full shadow-sm">
                            Được lên: tối đa {q.remaining_quota} HV
                          </span>
                        ) : (
                          <span className="inline-block whitespace-nowrap px-2.5 py-1 bg-red-100 text-red-900 font-bold rounded-full">
                            Không thể lên (0 HV)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-md">{q.status_message}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {q.can_enroll_on_reference_date ? (
                          <button
                            type="button"
                            onClick={() => handleQuickPickTeacherAndVehicle(t, t.vehicle?.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                              isSelected
                                ? 'bg-blue-700 text-white'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-400'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isSelected ? 'Đang chọn' : 'Chọn lên khóa'}
                          </button>
                        ) : (
                          <span className="text-red-600 font-semibold text-[11px]">
                            Chưa đủ 6T/3T
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Khu vực 3: Danh sách các bản ghi đã lên khóa của Khóa đang chọn */}
      {activeCourse && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh Sách Đã Lên Khóa Trong {activeCourse.course_name}{' '}
                {detectedCourseClass ? `[Hạng ${detectedCourseClass}]` : ''} ({formatDateVN(activeCourse.opening_date)})
              </h3>
              {activeCourse.closing_date && (
                <p className="text-xs text-purple-700 font-semibold mt-0.5">
                  Ngày bế giảng: {formatDateVN(activeCourse.closing_date)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-950 flex items-center gap-1.5 shadow-2xs">
                <span>Tổng số học viên của khóa:</span>
                <span className="text-sm font-black text-blue-700">{activeCourse.total_students || 0}</span>
                <span>HV</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                {activeCourse.allocations?.length || 0} lượt xe / GV
              </div>
            </div>
          </div>

          {!activeCourse.allocations || activeCourse.allocations.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Chưa có giáo viên nào đăng ký học viên trong ngày khai giảng này.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3">Nhóm Lên Khóa</th>
                    <th className="py-2.5 px-3">Giáo Viên Đứng Tên</th>
                    <th className="py-2.5 px-3">Biển Số Xe & Hạng</th>
                    <th className="py-2.5 px-3">Số Học Viên Lên</th>
                    <th className="py-2.5 px-3">Ngày Bế Giảng</th>
                    <th className="py-2.5 px-3">Mượn GV / Xe Liên Nhóm</th>
                    <th className="py-2.5 px-3">Ngày Mở Khóa Tiếp (+3 Tuần)</th>
                    <th className="py-2.5 px-3">Ngày Quay Đầu (+6 Tuần)</th>
                    <th className="py-2.5 px-3">Cảnh Báo HKD</th>
                    <th className="py-2.5 px-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeCourse.allocations.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{a.group_name}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-950 whitespace-nowrap">{a.teacher_name}</td>
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-amber-300 rounded border border-slate-700">
                          {a.license_plate} ({a.vehicle_class})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-800 whitespace-nowrap">{a.student_count} HV</td>
                      <td className="py-2.5 px-3 font-semibold text-purple-800 whitespace-nowrap">
                        {a.closing_date ? formatDateVN(a.closing_date) : '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {a.is_borrowed || a.borrow_note ? (
                          <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-full font-bold">
                            {a.borrow_note || 'Mượn liên nhóm'}
                          </span>
                        ) : (
                          <span className="text-slate-500">Cùng nhóm</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {a.student_count < 5 ? (
                          <span className="font-semibold text-blue-800">
                            {formatDateVN(a.next_eligible_date)} (Lên tiếp {5 - a.student_count} HV)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Đã đủ 5 HV (Chờ 6 tuần)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800 whitespace-nowrap">
                        {formatDateVN(a.turnaround_date)}
                      </td>
                      <td className="py-2.5 px-3">
                        {a.had_business_household_warning ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">
                            Có cảnh báo chưa HKD
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Đầy đủ HKD</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteAllocation(a.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-bold">
                    <td colSpan={3} className="py-3 px-3 text-right uppercase text-xs tracking-wider">
                      TỔNG CỘNG HỌC VIÊN CỦA KHÓA {activeCourse.course_name}:
                    </td>
                    <td className="py-3 px-3 text-blue-900 font-black text-sm whitespace-nowrap">
                      {activeCourse.total_students || 0} HV
                    </td>
                    <td colSpan={6} className="py-3 px-3 text-slate-600 font-semibold text-xs">
                      (Đã lên cho {activeCourse.allocations?.length || 0} lượt xe & giáo viên)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
