const { getDb, normalizePlate } = require('../db/database');
const { runSeed } = require('../db/seed');
const { addDays } = require('../services/quotaService');

function parseBooleanHKD(val) {
  if (val === true || val === 1 || val === '1') return 1;
  if (val === false || val === 0 || val === '0') return 0;
  const s = String(val || '').trim().toLowerCase();
  if (!s) return 1;
  if (
    s.includes('chưa') ||
    s.includes('chua') ||
    s.includes('không') ||
    s.includes('khong') ||
    s === 'no' ||
    s === 'false' ||
    s === '0'
  ) {
    return 0;
  }
  return 1;
}

function normalizeDateStr(raw) {
  if (!raw) return '';
  // Nếu Excel trả về số serial date (ví dụ 46342)
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  // Hỗ trợ DD/MM/YYYY -> YYYY-MM-DD
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return s.slice(0, 10);
}

function exportAllData(req, res) {
  try {
    const db = getDb();
    const teacher_groups = db.prepare('SELECT * FROM teacher_groups ORDER BY id ASC').all();
    const teachers = db.prepare('SELECT * FROM teachers ORDER BY id ASC').all();
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id ASC').all();
    const opening_courses = db.prepare('SELECT * FROM opening_courses ORDER BY opening_date DESC').all();
    const course_allocations = db.prepare('SELECT * FROM course_allocations ORDER BY id DESC').all();

    res.json({
      exported_at: new Date().toISOString(),
      counts: {
        teacher_groups: teacher_groups.length,
        teachers: teachers.length,
        vehicles: vehicles.length,
        opening_courses: opening_courses.length,
        course_allocations: course_allocations.length,
      },
      data: {
        teacher_groups,
        teachers,
        vehicles,
        opening_courses,
        course_allocations,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function clearAllData(req, res) {
  try {
    const db = getDb();
    db.exec(`
      DELETE FROM course_allocations;
      DELETE FROM opening_courses;
      DELETE FROM vehicles;
      DELETE FROM teachers;
      DELETE FROM teacher_groups;
      DELETE FROM sqlite_sequence;
    `);
    res.json({
      success: true,
      message: 'Đã xóa sạch toàn bộ dữ liệu! Hệ thống hiện đang trống để bạn nhập dữ liệu thực tế.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function resetSeedData(req, res) {
  return clearAllData(req, res);
}

/**
 * Nhập dữ liệu theo TỪNG BẢNG riêng biệt:
 * - table = 'groups'      (Bảng Nhóm Giáo Viên)
 * - table = 'teachers'    (Bảng Giáo Viên & Xe)
 * - table = 'courses'     (Bảng Khóa / Ngày Khai Giảng)
 * - table = 'allocations' (Bảng Bản Ghi Lên Khóa)
 */
function importByTable(req, res) {
  try {
    const db = getDb();
    const { table, rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        error: 'File Excel/CSV không có dòng dữ liệu nào.',
      });
    }

    let created = 0;
    let updated = 0;
    const errors = [];

    if (table === 'groups') {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {};
        const name = String(
          r.name ??
            r['Tên nhóm giáo viên'] ??
            r['Tên nhóm'] ??
            r['Nhóm giáo viên'] ??
            r['Nhóm GV'] ??
            ''
        ).trim();
        if (!name) continue;

        const hasHKD = parseBooleanHKD(
          r.has_business_household ?? r['HKD Nhóm'] ?? r['Hộ kinh doanh'] ?? r['HKD'] ?? 'Có'
        );
        const hkdInfo = String(
          r.business_household_info ?? r['Mã HKD'] ?? r['Tên HKD'] ?? ''
        ).trim();
        const notes = String(r.notes ?? r['Ghi chú'] ?? '').trim();

        const existing = db
          .prepare('SELECT * FROM teacher_groups WHERE LOWER(name) = LOWER(?)')
          .get(name);
        if (existing) {
          db.prepare(
            `UPDATE teacher_groups
             SET has_business_household = ?, business_household_info = ?, notes = ?
             WHERE id = ?`
          ).run(hasHKD, hkdInfo || existing.business_household_info, notes || existing.notes, existing.id);
          updated += 1;
        } else {
          db.prepare(
            `INSERT INTO teacher_groups (name, has_business_household, business_household_info, notes)
             VALUES (?, ?, ?, ?)`
          ).run(name, hasHKD, hkdInfo, notes);
          created += 1;
        }
      }

      return res.json({
        success: true,
        message: `[Bảng Nhóm Giáo Viên] Nhập thành công: Thêm mới ${created} nhóm, Cập nhật ${updated} nhóm.`,
      });
    }

    if (table === 'teachers') {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {};
        const groupName = String(
          r.group_name ??
            r['Nhóm giáo viên'] ??
            r['Tên nhóm'] ??
            r['Nhóm GV'] ??
            'Nhóm Mặc Định'
        ).trim();
        const fullName = String(
          r.full_name ?? r['Tên giáo viên'] ?? r['Họ tên'] ?? r['Giáo viên'] ?? ''
        ).trim();
        const plate = String(
          r.license_plate ?? r['Biển số xe'] ?? r['Biển số'] ?? r['Xe'] ?? ''
        ).trim();
        const phone = String(r.phone ?? r['Số điện thoại'] ?? r['SĐT'] ?? '').trim();
        const vehicleClass =
          String(r.vehicle_class ?? r['Hạng xe'] ?? r['Hạng'] ?? 'B2')
            .trim()
            .toUpperCase() || 'B2';
        const maxQuota = Number(r.max_quota ?? r['Định mức'] ?? 5) || 5;
        const hasHKD = parseBooleanHKD(
          r.has_business_household ?? r['HKD Giáo viên'] ?? r['Hộ kinh doanh'] ?? r['HKD'] ?? 'Có'
        );

        if (!fullName && !plate) continue;

        // Tìm hoặc tạo nhóm
        let group = db
          .prepare('SELECT * FROM teacher_groups WHERE LOWER(name) = LOWER(?)')
          .get(groupName);
        if (!group) {
          const gInfo = db
            .prepare('INSERT INTO teacher_groups (name, has_business_household) VALUES (?, 1)')
            .run(groupName);
          group = db.prepare('SELECT * FROM teacher_groups WHERE id = ?').get(gInfo.lastInsertRowid);
        }

        // Trường hợp 1: Nhóm có xe nhưng thiếu giáo viên (có Biển số xe nhưng trống Tên giáo viên)
        if (!fullName && plate) {
          const normPlate = normalizePlate(plate);
          const existingVehicle = db
            .prepare('SELECT * FROM vehicles WHERE normalized_plate = ?')
            .get(normPlate);
          if (existingVehicle) {
            db.prepare(
              'UPDATE vehicles SET group_id = ?, license_plate = ?, vehicle_class = ?, max_quota = ? WHERE id = ?'
            ).run(group.id, plate, vehicleClass, maxQuota, existingVehicle.id);
            updated += 1;
          } else {
            db.prepare(
              `INSERT INTO vehicles (group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota)
               VALUES (?, NULL, ?, ?, ?, ?)`
            ).run(group.id, plate, normPlate, vehicleClass, maxQuota);
            created += 1;
          }
          continue;
        }

        // Trường hợp 2: Có Tên giáo viên nhưng chưa có Biển số xe (sẽ mượn xe khi lên khóa)
        if (fullName && !plate) {
          db.prepare(
            `INSERT INTO teachers (group_id, full_name, phone, has_business_household)
             VALUES (?, ?, ?, ?)`
          ).run(group.id, fullName, phone, hasHKD);
          created += 1;
          continue;
        }

        const normPlate = normalizePlate(plate);
        const existingVehicle = db
          .prepare('SELECT * FROM vehicles WHERE normalized_plate = ?')
          .get(normPlate);

        if (existingVehicle && existingVehicle.teacher_id) {
          db.prepare(
            `UPDATE teachers
             SET group_id = ?, full_name = ?, phone = ?, has_business_household = ?
             WHERE id = ?`
          ).run(group.id, fullName, phone, hasHKD, existingVehicle.teacher_id);

          db.prepare(
            `UPDATE vehicles
             SET group_id = ?, license_plate = ?, vehicle_class = ?, max_quota = ?
             WHERE id = ?`
          ).run(group.id, plate, vehicleClass, maxQuota, existingVehicle.id);
          updated += 1;
        } else if (existingVehicle && !existingVehicle.teacher_id) {
          const tInfo = db
            .prepare(
              `INSERT INTO teachers (group_id, full_name, phone, has_business_household)
               VALUES (?, ?, ?, ?)`
            )
            .run(group.id, fullName, phone, hasHKD);
          db.prepare(
            `UPDATE vehicles
             SET group_id = ?, teacher_id = ?, license_plate = ?, vehicle_class = ?, max_quota = ?
             WHERE id = ?`
          ).run(group.id, tInfo.lastInsertRowid, plate, vehicleClass, maxQuota, existingVehicle.id);
          created += 1;
        } else {
          const tInfo = db
            .prepare(
              `INSERT INTO teachers (group_id, full_name, phone, has_business_household)
               VALUES (?, ?, ?, ?)`
            )
            .run(group.id, fullName, phone, hasHKD);

          db.prepare(
            `INSERT INTO vehicles (group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(group.id, tInfo.lastInsertRowid, plate, normPlate, vehicleClass, maxQuota);
          created += 1;
        }
      }

      return res.json({
        success: true,
        message: `[Bảng Giáo Viên & Xe] Nhập thành công: Thêm mới ${created} GV & Xe, Cập nhật ${updated} GV & Xe.${
          errors.length ? ` (${errors.length} dòng lỗi)` : ''
        }`,
        errors,
      });
    }

    if (table === 'courses') {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {};
        const courseName = String(
          r.course_name ?? r['Tên khóa khai giảng'] ?? r['Tên khóa'] ?? r['Khóa'] ?? ''
        ).trim();
        const rawDate =
          r.opening_date ?? r['Ngày khai giảng'] ?? r['Ngày'] ?? '';
        const openingDate = normalizeDateStr(rawDate);
        const notes = String(r.notes ?? r['Ghi chú'] ?? '').trim();

        if (!courseName && !openingDate) continue;
        if (!openingDate) {
          errors.push(`Dòng ${i + 1}: Thiếu ngày khai giảng`);
          continue;
        }

        const finalName = courseName || `Khóa ngày ${openingDate}`;
        const existing = db
          .prepare('SELECT * FROM opening_courses WHERE opening_date = ?')
          .get(openingDate);

        if (existing) {
          db.prepare(
            `UPDATE opening_courses SET course_name = ?, notes = ? WHERE id = ?`
          ).run(finalName, notes || existing.notes, existing.id);
          updated += 1;
        } else {
          db.prepare(
            `INSERT INTO opening_courses (course_name, opening_date, notes) VALUES (?, ?, ?)`
          ).run(finalName, openingDate, notes);
          created += 1;
        }
      }

      return res.json({
        success: true,
        message: `[Bảng Khóa Khai Giảng] Nhập thành công: Thêm mới ${created} khóa, Cập nhật ${updated} khóa.`,
        errors,
      });
    }

    if (table === 'allocations') {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {};
        const rawDate =
          r.opening_date ?? r['Ngày khai giảng'] ?? r['Ngày'] ?? '';
        const openingDate = normalizeDateStr(rawDate);
        const courseName = String(
          r.course_name ?? r['Tên khóa khai giảng'] ?? r['Tên khóa'] ?? ''
        ).trim();
        const plate = String(
          r.license_plate ?? r['Biển số xe'] ?? r['Biển số'] ?? r['Xe'] ?? ''
        ).trim();
        const teacherName = String(
          r.teacher_name ?? r['Tên giáo viên'] ?? r['Giáo viên'] ?? ''
        ).trim();
        const studentCount = Number(
          r.student_count ?? r['Số học viên lên'] ?? r['Số học viên'] ?? r['Số HV'] ?? 0
        );
        const notes = String(r.notes ?? r['Ghi chú'] ?? '').trim();

        if (!openingDate && !plate && !teacherName) continue;
        if (!studentCount || studentCount < 1) {
          errors.push(`Dòng ${i + 1}: Số học viên không hợp lệ`);
          continue;
        }

        // 1. Tìm hoặc tạo khóa khai giảng theo ngày
        let course = null;
        if (openingDate) {
          course = db
            .prepare('SELECT * FROM opening_courses WHERE opening_date = ?')
            .get(openingDate);
          if (!course) {
            const cInfo = db
              .prepare(
                'INSERT INTO opening_courses (course_name, opening_date) VALUES (?, ?)'
              )
              .run(courseName || `Khóa ngày ${openingDate}`, openingDate);
            course = db
              .prepare('SELECT * FROM opening_courses WHERE id = ?')
              .get(cInfo.lastInsertRowid);
          }
        } else if (courseName) {
          course = db
            .prepare('SELECT * FROM opening_courses WHERE LOWER(course_name) = LOWER(?)')
            .get(courseName);
        }

        if (!course) {
          errors.push(`Dòng ${i + 1}: Không xác định được Ngày khai giảng`);
          continue;
        }

        // 2. Tìm giáo viên & xe theo biển số xe (ưu tiên) hoặc tên giáo viên
        let teacherRow = null;
        if (plate) {
          const normP = normalizePlate(plate);
          teacherRow = db
            .prepare(
              `SELECT t.*, tg.has_business_household AS group_has_hkd, v.id AS vehicle_id
               FROM vehicles v
               JOIN teachers t ON t.id = v.teacher_id
               JOIN teacher_groups tg ON tg.id = t.group_id
               WHERE v.normalized_plate = ?`
            )
            .get(normP);
        }
        if (!teacherRow && teacherName) {
          teacherRow = db
            .prepare(
              `SELECT t.*, tg.has_business_household AS group_has_hkd, v.id AS vehicle_id
               FROM teachers t
               JOIN teacher_groups tg ON tg.id = t.group_id
               LEFT JOIN vehicles v ON v.teacher_id = t.id
               WHERE LOWER(t.full_name) = LOWER(?)`
            )
            .get(teacherName);
        }

        if (!teacherRow || !teacherRow.vehicle_id) {
          errors.push(
            `Dòng ${i + 1}: Không tìm thấy Giáo viên/Xe (${plate || teacherName})`
          );
          continue;
        }

        const hasHKDWarning =
          !teacherRow.has_business_household || !teacherRow.group_has_hkd ? 1 : 0;

        // Kiểm tra xem đã có bản ghi lên khóa của GV này trong khóa này chưa
        const existingAlloc = db
          .prepare(
            'SELECT * FROM course_allocations WHERE course_id = ? AND teacher_id = ?'
          )
          .get(course.id, teacherRow.id);

        if (existingAlloc) {
          db.prepare(
            `UPDATE course_allocations
             SET student_count = ?, notes = ?, had_business_household_warning = ?
             WHERE id = ?`
          ).run(studentCount, notes || existingAlloc.notes, hasHKDWarning, existingAlloc.id);
          updated += 1;
        } else {
          db.prepare(
            `INSERT INTO course_allocations (
               course_id, teacher_id, vehicle_id, student_count,
               next_eligible_date, turnaround_date, had_business_household_warning, notes
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            course.id,
            teacherRow.id,
            teacherRow.vehicle_id,
            studentCount,
            addDays(course.opening_date, 21),
            addDays(course.opening_date, 42),
            hasHKDWarning,
            notes
          );
          created += 1;
        }
      }

      return res.json({
        success: true,
        message: `[Bảng Bản Ghi Lên Khóa] Nhập thành công: Thêm mới ${created} bản ghi, Cập nhật ${updated} bản ghi.${
          errors.length ? ` (${errors.length} dòng bỏ qua: ${errors.slice(0, 2).join('; ')})` : ''
        }`,
        errors,
      });
    }

    return res.status(400).json({
      error: 'Tên bảng không hợp lệ (chỉ hỗ trợ groups, teachers, courses, allocations).',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function bulkImportTeachersAndGroups(req, res) {
  req.body.table = 'teachers';
  return importByTable(req, res);
}

module.exports = {
  exportAllData,
  resetSeedData,
  clearAllData,
  bulkImportTeachersAndGroups,
  importByTable,
};
