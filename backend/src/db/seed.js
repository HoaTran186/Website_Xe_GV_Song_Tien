const { getDb, normalizePlate } = require('./database');
const { addDays } = require('../services/quotaService');

function runSeed(forceReset = false) {
  const db = getDb();

  if (forceReset) {
    db.exec(`
      DELETE FROM course_allocations;
      DELETE FROM opening_courses;
      DELETE FROM vehicles;
      DELETE FROM teachers;
      DELETE FROM teacher_groups;
    `);
  }

  const existingGroups = db.prepare('SELECT COUNT(*) as count FROM teacher_groups').get();
  if (existingGroups.count > 0 && !forceReset) {
    return false;
  }

  // 1. Tạo 3 Nhóm Giáo Viên:
  // - Nhóm 1: Đã có Hộ Kinh Doanh, hoạt động đều đặn
  // - Nhóm 2: Chưa có Hộ Kinh Doanh (để test cảnh báo khi lên khóa)
  // - Nhóm 3: Đã bỏ qua 3 khóa khai giảng liên tiếp (để test "Danh sách cần chú ý")
  const insertGroup = db.prepare(
    `INSERT INTO teacher_groups (name, has_business_household, business_household_info, notes, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  const g1 = insertGroup.run(
    'Nhóm 1 - Thầy Minh (Sông Tiền A)',
    1,
    'HKD-ST-001 (Đã đăng ký)',
    'Nhóm chủ lực hạng B2',
    '2026-09-01'
  ).lastInsertRowid;

  const g2 = insertGroup.run(
    'Nhóm 2 - Thầy Hùng (Chưa có HKD)',
    0,
    '',
    'Đang chờ bổ sung giấy phép Hộ Kinh Doanh',
    '2026-09-01'
  ).lastInsertRowid;

  const g3 = insertGroup.run(
    'Nhóm 3 - Thầy Phong (Vắng 3 khóa)',
    1,
    'HKD-ST-003',
    'Nhóm đã bỏ qua 3 ngày khai giảng liên tiếp',
    '2026-09-01'
  ).lastInsertRowid;

  // 2. Tạo Giáo Viên & Xe (1 xe 1 giáo viên = 5 học viên)
  const insertTeacher = db.prepare(
    `INSERT INTO teachers (group_id, full_name, phone, has_business_household, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (teacher_id, license_plate, normalized_plate, vehicle_class, max_quota, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  function addTeacherWithCar(groupId, fullName, phone, hasHKD, plate, vehicleClass = 'B2') {
    const tId = insertTeacher.run(groupId, fullName, phone, hasHKD ? 1 : 0, '2026-09-01').lastInsertRowid;
    const vId = insertVehicle.run(
      tId,
      plate,
      normalizePlate(plate),
      vehicleClass,
      5,
      '2026-09-01'
    ).lastInsertRowid;
    return { tId, vId };
  }

  // Nhóm 1
  const tAn = addTeacherWithCar(g1, 'Nguyễn Văn An', '0909111222', true, '63A-123.45', 'B2');
  const tBinh = addTeacherWithCar(g1, 'Trần Văn Bình', '0909333444', true, '63A-234.56', 'B2');
  const tCuong = addTeacherWithCar(g1, 'Lê Quốc Cường', '0909555666', false, '63A-345.67', 'C');

  // Nhóm 2 (Chưa có HKD)
  const tHung = addTeacherWithCar(g2, 'Phạm Văn Hùng', '0918111222', false, '63A-567.89', 'B2');
  const tDung = addTeacherWithCar(g2, 'Võ Minh Dũng', '0918333444', false, '63A-678.90', 'B1');

  // Nhóm 3 (Sẽ bỏ qua 3 khóa khai giảng liên tiếp)
  const tPhong = addTeacherWithCar(g3, 'Đặng Thanh Phong', '0939111222', true, '63A-888.99', 'B2');
  addTeacherWithCar(g3, 'Huỳnh Văn Tâm', '0939333444', true, '63A-999.88', 'B2');

  // 3. Tạo 4 Khóa Khai Giảng (Ngày khai giảng)
  // - Khóa K01: 2026-09-20 (Cách đây > 6 tuần so với 2026-11-16 -> Đã quay đầu!)
  // - Khóa K02: 2026-10-18 (Đã qua > 3 tuần (29 ngày), đủ điều kiện lên tiếp phần còn lại!)
  // - Khóa K03: 2026-11-05 (Mới cách 11 ngày < 3 tuần -> Đang chờ đủ 3 tuần!)
  // - Khóa K04: 2026-11-16 (Hôm nay)
  const insertCourse = db.prepare(
    `INSERT INTO opening_courses (course_name, opening_date, notes, created_at)
     VALUES (?, ?, ?, ?)`
  );

  const c1 = insertCourse.run(
    'Khóa K01 - Đợt 20/09 (Đã qua 6 tuần quay đầu)',
    '2026-09-20',
    'Khóa cách đây hơn 6 tuần (42 ngày), chỉ tiêu đã quay đầu lại đủ 5 HV',
    '2026-09-20'
  ).lastInsertRowid;

  const c2 = insertCourse.run(
    'Khóa K02 - Đợt 18/10 (Đã đủ 3 tuần)',
    '2026-10-18',
    'Khóa cách hiện tại hơn 3 tuần (đủ 21 ngày để lên tiếp số HV còn lại)',
    '2026-10-18'
  ).lastInsertRowid;

  const c3 = insertCourse.run(
    'Khóa K03 - Đợt 05/11 (Chưa đủ 3 tuần)',
    '2026-11-05',
    'Khóa mới khai giảng ngày 05/11 (đến 26/11 mới đủ 3 tuần)',
    '2026-11-05'
  ).lastInsertRowid;

  const c4 = insertCourse.run(
    'Khóa K04 - Đợt 16/11 (Khóa Hiện Tại)',
    '2026-11-16',
    'Ngày khai giảng hôm nay (dùng để lên tiếp 2 HV còn lại hoặc lên khóa mới)',
    '2026-11-16'
  ).lastInsertRowid;

  const insertAlloc = db.prepare(
    `INSERT INTO course_allocations (
       course_id, teacher_id, vehicle_id, student_count,
       next_eligible_date, turnaround_date, had_business_household_warning, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Kịch bản mẫu:
  // 1) Nhóm 3 (Thầy Phong) chỉ tham gia Khóa K01 (2026-09-20), sau đó BỎ QUA 3 khóa liên tiếp (K02, K03, K04)
  //    -> Nhóm 3 tự động bị đưa vào "Danh sách cần chú ý"!
  insertAlloc.run(
    c1,
    tPhong.tId,
    tPhong.vId,
    5,
    addDays('2026-09-20', 21),
    addDays('2026-09-20', 42),
    0,
    'Lên 5 HV ở Khóa K01 (đã qua 6 tuần nên đã quay đầu đủ 5 HV)'
  );

  // 2) Thầy Nguyễn Văn An (Xe 63A-123.45):
  //    Ở Khóa K02 (2026-10-18) đã lên 3 học viên -> Còn lại 2 học viên!
  //    Sau 3 tuần là ngày 2026-11-08 -> Tại Khóa K04 (2026-11-16) thầy An ĐỦ ĐIỀU KIỆN lên thêm 2 học viên nữa!
  insertAlloc.run(
    c2,
    tAn.tId,
    tAn.vId,
    3,
    addDays('2026-10-18', 21), // 2026-11-08
    addDays('2026-10-18', 42), // 2026-11-29
    0,
    'Khóa trước đã lên 3 học viên -> còn lại 2 học viên (đủ 3 tuần từ 08/11 nên nay được lên thêm 2 HV)'
  );

  // 3) Thầy Trần Văn Bình (Xe 63A-234.56):
  //    Ở Khóa K03 (2026-11-05) đã lên 3 học viên -> Còn lại 2 học viên!
  //    Nhưng phải cách 3 tuần (đến ngày 2026-11-26) mới được khai giảng tiếp 2 học viên nữa!
  insertAlloc.run(
    c3,
    tBinh.tId,
    tBinh.vId,
    3,
    addDays('2026-11-05', 21), // 2026-11-26
    addDays('2026-11-05', 42), // 2026-12-17
    0,
    'Đã lên 3 HV ngày 05/11 -> Còn lại 2 HV, phải chờ đủ 3 tuần (đến 26/11) mới được lên tiếp 2 HV'
  );

  // 4) Thầy Phạm Văn Hùng (Nhóm 2 - Chưa có HKD):
  //    Tham gia K02 (lên 2 HV) và K04 (lên 1 HV) có cảnh báo HKD
  insertAlloc.run(
    c2,
    tHung.tId,
    tHung.vId,
    2,
    addDays('2026-10-18', 21),
    addDays('2026-10-18', 42),
    1,
    'Lên khóa kèm cảnh báo chưa có Hộ Kinh Doanh'
  );

  insertAlloc.run(
    c4,
    tCuong.tId,
    tCuong.vId,
    4,
    addDays('2026-11-16', 21),
    addDays('2026-11-16', 42),
    1,
    'Đã lên 4 HV trong khóa hiện tại, còn 1 HV chờ sau 3 tuần'
  );

  return true;
}

function seedIfEmpty() {
  return runSeed(false);
}

if (require.main === module) {
  runSeed(true);
  console.log('Đã khởi tạo dữ liệu mẫu thành công cho Website Xe GV Sông Tiền!');
}

module.exports = {
  runSeed,
  seedIfEmpty,
};

