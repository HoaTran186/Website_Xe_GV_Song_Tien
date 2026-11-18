const { getDb } = require('../db/database');
const {
  toISODate,
  formatDateVN,
  addDays,
  normalizeVehicleClass,
  detectCourseClass,
  calculateTeacherQuotaStatus,
  validateAllocationRequest,
} = require('../services/quotaService');

function listCourses(req, res) {
  try {
    const db = getDb();
    const courses = db.prepare('SELECT * FROM opening_courses ORDER BY opening_date DESC').all();
    const allocations = db
      .prepare(
        `SELECT ca.*,
                COALESCE(NULLIF(ca.closing_date, ''), oc.closing_date, '') AS effective_closing_date,
                t.full_name AS teacher_name,
                t.group_id AS teacher_group_id,
                tg_teacher.name AS teacher_group_name,
                COALESCE(ca.allocating_group_id, t.group_id) AS group_id,
                tg_alloc.name AS group_name,
                v.license_plate, v.vehicle_class,
                COALESCE(v.group_id, t.group_id) AS vehicle_group_id,
                tg_veh.name AS vehicle_group_name
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         JOIN teachers t ON t.id = ca.teacher_id
         JOIN teacher_groups tg_teacher ON tg_teacher.id = t.group_id
         LEFT JOIN teacher_groups tg_alloc ON tg_alloc.id = COALESCE(ca.allocating_group_id, t.group_id)
         JOIN vehicles v ON v.id = ca.vehicle_id
         LEFT JOIN teacher_groups tg_veh ON tg_veh.id = COALESCE(v.group_id, t.group_id)
         ORDER BY ca.id DESC`
      )
      .all();

    const result = courses.map((course) => {
      const courseAllocs = allocations.filter((a) => Number(a.course_id) === Number(course.id));
      const totalStudents = courseAllocs.reduce((sum, a) => sum + Number(a.student_count), 0);
      const groupSet = new Set(courseAllocs.map((a) => a.group_id));

      return {
        ...course,
        closing_date: course.closing_date || '',
        course_class: detectCourseClass(course.course_name),
        total_students: totalStudents,
        participating_groups_count: groupSet.size,
        allocations: courseAllocs.map((a) => ({
          ...a,
          closing_date: a.effective_closing_date || course.closing_date || '',
          had_business_household_warning: Boolean(a.had_business_household_warning),
          is_borrowed: Boolean(a.is_borrowed),
        })),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createCourse(req, res) {
  try {
    const db = getDb();
    const { course_name, opening_date, closing_date, notes } = req.body;
    const trimmedName = String(course_name || '').trim();
    const trimmedDate = toISODate(opening_date);
    const trimmedClosingDate = closing_date ? toISODate(closing_date) : '';

    if (!trimmedName || !trimmedDate) {
      return res
        .status(400)
        .json({ error: 'Vui lòng nhập Tên khóa và Ngày khai giảng (dd/mm/yyyy).' });
    }

    const existing = db
      .prepare('SELECT * FROM opening_courses WHERE opening_date = ?')
      .get(trimmedDate);
    if (existing) {
      return res.status(400).json({
        error: `Đã có khóa khai giảng "${existing.course_name}" vào ngày ${formatDateVN(trimmedDate)}.`,
      });
    }

    const info = db
      .prepare(
        `INSERT INTO opening_courses (course_name, opening_date, closing_date, notes)
         VALUES (?, ?, ?, ?)`
      )
      .run(trimmedName, trimmedDate, trimmedClosingDate, notes || '');

    const created = db
      .prepare('SELECT * FROM opening_courses WHERE id = ?')
      .get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function listAllocations(req, res) {
  try {
    const db = getDb();
    const { courseId, teacherId } = req.query;

    let query = `
      SELECT ca.*, oc.course_name, oc.opening_date,
             COALESCE(NULLIF(ca.closing_date, ''), oc.closing_date, '') AS closing_date,
             t.full_name AS teacher_name, t.has_business_household AS teacher_has_hkd,
             t.group_id AS teacher_group_id, tg_teacher.name AS teacher_group_name,
             COALESCE(ca.allocating_group_id, t.group_id) AS group_id,
             tg_alloc.name AS group_name,
             tg_alloc.has_business_household AS group_has_hkd,
             v.license_plate, v.vehicle_class, v.max_quota,
             COALESCE(v.group_id, t.group_id) AS vehicle_group_id,
             tg_veh.name AS vehicle_group_name
      FROM course_allocations ca
      JOIN opening_courses oc ON oc.id = ca.course_id
      JOIN teachers t ON t.id = ca.teacher_id
      JOIN teacher_groups tg_teacher ON tg_teacher.id = t.group_id
      LEFT JOIN teacher_groups tg_alloc ON tg_alloc.id = COALESCE(ca.allocating_group_id, t.group_id)
      JOIN vehicles v ON v.id = ca.vehicle_id
      LEFT JOIN teacher_groups tg_veh ON tg_veh.id = COALESCE(v.group_id, t.group_id)
    `;
    const conditions = [];
    const params = [];

    if (courseId) {
      conditions.push('ca.course_id = ?');
      params.push(Number(courseId));
    }
    if (teacherId) {
      conditions.push('ca.teacher_id = ?');
      params.push(Number(teacherId));
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY oc.opening_date DESC, ca.id DESC';

    const rows = db.prepare(query).all(...params);
    res.json(
      rows.map((r) => ({
        ...r,
        had_business_household_warning: Boolean(r.had_business_household_warning),
        is_borrowed: Boolean(r.is_borrowed),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createAllocation(req, res) {
  try {
    const db = getDb();
    const {
      course_id,
      allocating_group_id,
      teacher_id,
      vehicle_id,
      student_count,
      closing_date,
      confirm_without_business_household,
      notes,
    } = req.body;

    const course = db
      .prepare('SELECT * FROM opening_courses WHERE id = ?')
      .get(Number(course_id));
    if (!course) {
      return res.status(404).json({ error: 'Không tìm thấy khóa khai giảng.' });
    }

    const teacher = db
      .prepare(
        `SELECT t.*, tg.name AS group_name, tg.has_business_household AS group_has_business_household,
                v.id AS default_vehicle_id, v.license_plate AS default_license_plate,
                v.vehicle_class AS default_vehicle_class, COALESCE(v.max_quota, 5) AS max_quota
         FROM teachers t
         JOIN teacher_groups tg ON tg.id = t.group_id
         LEFT JOIN vehicles v ON v.teacher_id = t.id
         WHERE t.id = ?`
      )
      .get(Number(teacher_id));

    if (!teacher) {
      return res.status(404).json({ error: 'Không tìm thấy giáo viên.' });
    }

    // Xác định xe sử dụng (có thể là xe mặc định của GV, hoặc xe riêng của nhóm, hoặc xe mượn từ nhóm khác)
    const targetVehicleId = vehicle_id ? Number(vehicle_id) : teacher.default_vehicle_id;
    if (!targetVehicleId) {
      return res.status(400).json({
        error:
          'Giáo viên này chưa có xe cố định. Vui lòng chọn một Xe đào tạo (xe của nhóm hoặc mượn xe nhóm khác) ở ô Chọn Xe.',
      });
    }

    const chosenVehicle = db
      .prepare(
        `SELECT v.*, COALESCE(v.group_id, t.group_id) AS effective_group_id,
                tg.name AS vehicle_group_name, t.full_name AS owner_teacher_name
         FROM vehicles v
         LEFT JOIN teachers t ON t.id = v.teacher_id
         LEFT JOIN teacher_groups tg ON tg.id = COALESCE(v.group_id, t.group_id)
         WHERE v.id = ?`
      )
      .get(targetVehicleId);

    if (!chosenVehicle) {
      return res.status(404).json({ error: 'Không tìm thấy xe đào tạo đã chọn.' });
    }

    // Kiểm tra Hạng của Khóa khai giảng (B1, B2, C1) phải khớp với Hạng Xe
    const requiredCourseClass = detectCourseClass(course.course_name);
    const actualVehicleClass = normalizeVehicleClass(chosenVehicle.vehicle_class);
    if (requiredCourseClass && actualVehicleClass && requiredCourseClass !== actualVehicleClass) {
      return res.status(400).json({
        error: `Sai hạng xe! Khóa "${course.course_name}" là hạng ${requiredCourseClass}, chỉ xe hạng ${requiredCourseClass} mới được lên khóa này (Xe ${chosenVehicle.license_plate} đang là hạng ${actualVehicleClass}).`,
      });
    }

    // Xác định Nhóm đứng tên lên khóa (allocating_group_id)
    const finalAllocatingGroupId = allocating_group_id
      ? Number(allocating_group_id)
      : Number(teacher.group_id);

    const allocatingGroup = db
      .prepare('SELECT * FROM teacher_groups WHERE id = ?')
      .get(finalAllocatingGroupId);

    const allocatingGroupName = allocatingGroup ? allocatingGroup.name : teacher.group_name;

    // 1. Kiểm tra định mức 5 HV / chờ 3 tuần / quay đầu 6 tuần của GIÁO VIÊN
    const teacherAllocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         WHERE ca.teacher_id = ?
         ORDER BY oc.opening_date ASC`
      )
      .all(Number(teacher_id));

    const teacherValidation = validateAllocationRequest({
      teacher: {
        ...teacher,
        max_quota: chosenVehicle.max_quota || 5,
        group_name: allocatingGroupName,
        group_has_business_household: allocatingGroup
          ? allocatingGroup.has_business_household
          : teacher.group_has_business_household,
      },
      allocations: teacherAllocations,
      courseOpeningDate: course.opening_date,
      requestedStudents: Number(student_count),
    });

    if (!teacherValidation.valid) {
      return res.status(400).json({
        error: teacherValidation.error,
        quota_status: teacherValidation.quotaStatus,
      });
    }

    // 2. LUÔN kiểm tra định mức 5 HV / chờ 3 tuần / quay đầu 6 tuần của XE đó
    // (kể cả xe chính chủ hay xe mượn, đảm bảo nếu xe đã lên khóa chưa đủ 6 tuần thì không thể lên khóa!)
    const vehicleAllocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         WHERE ca.vehicle_id = ?
         ORDER BY oc.opening_date ASC`
      )
      .all(Number(chosenVehicle.id));

    const vehicleValidation = validateAllocationRequest({
      teacher: {
        full_name: `Xe ${chosenVehicle.license_plate}`,
        group_name: chosenVehicle.vehicle_group_name || allocatingGroupName,
        max_quota: chosenVehicle.max_quota || 5,
        has_business_household: 1,
        group_has_business_household: 1,
      },
      allocations: vehicleAllocations,
      courseOpeningDate: course.opening_date,
      requestedStudents: Number(student_count),
    });

    if (!vehicleValidation.valid) {
      return res.status(400).json({
        error: vehicleValidation.error,
        quota_status: vehicleValidation.quotaStatus,
      });
    }

    const { quotaStatus } = teacherValidation;

    // 3. Kiểm tra cảnh báo Hộ Kinh Doanh (của Giáo viên và của Nhóm đứng tên lên khóa)
    if (quotaStatus.business_household_warning && !confirm_without_business_household) {
      return res.status(409).json({
        requires_confirmation: true,
        warning_type: 'MISSING_BUSINESS_HOUSEHOLD',
        message: quotaStatus.business_household_warning_message,
        quota_status: quotaStatus,
      });
    }

    // 4. Phát hiện và ghi chú tự động việc Mượn Giáo Viên hoặc Mượn Xe giữa các nhóm
    const borrowReasons = [];
    if (Number(teacher.group_id) !== Number(finalAllocatingGroupId)) {
      borrowReasons.push(
        `Mượn tên GV ${teacher.full_name} (thuộc ${teacher.group_name})`
      );
    }
    if (
      chosenVehicle.effective_group_id &&
      Number(chosenVehicle.effective_group_id) !== Number(finalAllocatingGroupId)
    ) {
      borrowReasons.push(
        `Mượn Xe ${chosenVehicle.license_plate} (thuộc ${
          chosenVehicle.vehicle_group_name || 'nhóm khác'
        })`
      );
    } else if (
      chosenVehicle.teacher_id &&
      Number(chosenVehicle.teacher_id) !== Number(teacher.id)
    ) {
      borrowReasons.push(
        `Ghép Xe ${chosenVehicle.license_plate} (của GV ${chosenVehicle.owner_teacher_name})`
      );
    }

    const isBorrowed = borrowReasons.length > 0 ? 1 : 0;
    const borrowNote = borrowReasons.join(' • ');
    const finalClosingDate = closing_date
      ? toISODate(closing_date)
      : course.closing_date || '';

    // Nếu người dùng nhập ngày bế giảng lúc lên khóa, cập nhật luôn cho khóa khai giảng nếu khóa chưa có ngày bế giảng
    if (finalClosingDate && !course.closing_date) {
      db.prepare('UPDATE opening_courses SET closing_date = ? WHERE id = ?').run(
        finalClosingDate,
        Number(course_id)
      );
    }

    const info = db
      .prepare(
        `INSERT INTO course_allocations (
           course_id, allocating_group_id, teacher_id, vehicle_id, student_count,
           closing_date, next_eligible_date, turnaround_date, had_business_household_warning,
           is_borrowed, borrow_note, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(course_id),
        finalAllocatingGroupId,
        Number(teacher_id),
        Number(chosenVehicle.id),
        Number(student_count),
        finalClosingDate,
        teacherValidation.next_eligible_date,
        teacherValidation.turnaround_date,
        quotaStatus.business_household_warning ? 1 : 0,
        isBorrowed,
        borrowNote,
        notes || ''
      );

    // Tính lại trạng thái định mức mới sau khi vừa lên khóa
    const updatedAllocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         WHERE ca.teacher_id = ?
         ORDER BY oc.opening_date ASC`
      )
      .all(Number(teacher_id));

    const updatedQuotaStatus = calculateTeacherQuotaStatus(
      teacher,
      updatedAllocations,
      course.opening_date
    );

    res.status(201).json({
      id: info.lastInsertRowid,
      course_id: Number(course_id),
      course_name: course.course_name,
      opening_date: course.opening_date,
      closing_date: finalClosingDate,
      allocating_group_id: finalAllocatingGroupId,
      group_name: allocatingGroupName,
      teacher_id: Number(teacher_id),
      teacher_name: teacher.full_name,
      license_plate: chosenVehicle.license_plate,
      student_count: Number(student_count),
      is_borrowed: Boolean(isBorrowed),
      borrow_note: borrowNote,
      next_eligible_date: teacherValidation.next_eligible_date,
      turnaround_date: teacherValidation.turnaround_date,
      had_business_household_warning: quotaStatus.business_household_warning,
      business_household_warning_message: quotaStatus.business_household_warning_message,
      updated_quota_status: updatedQuotaStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateCourse(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { course_name, opening_date, closing_date, notes } = req.body;
    const existing = db.prepare('SELECT * FROM opening_courses WHERE id = ?').get(Number(id));
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy khóa khai giảng.' });
    }

    const nextName = String(course_name ?? existing.course_name).trim();
    const nextDate = toISODate(opening_date ?? existing.opening_date);
    const nextClosingDate =
      closing_date !== undefined
        ? closing_date
          ? toISODate(closing_date)
          : ''
        : existing.closing_date || '';
    const nextNotes = String(notes ?? existing.notes).trim();

    db.prepare(
      `UPDATE opening_courses
       SET course_name = ?, opening_date = ?, closing_date = ?, notes = ?
       WHERE id = ?`
    ).run(nextName, nextDate, nextClosingDate, nextNotes, Number(id));

    if (nextDate !== existing.opening_date) {
      db.prepare(
        `UPDATE course_allocations
         SET next_eligible_date = ?, turnaround_date = ?
         WHERE course_id = ?`
      ).run(addDays(nextDate, 21), addDays(nextDate, 42), Number(id));
    }

    const updated = db.prepare('SELECT * FROM opening_courses WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteCourse(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('DELETE FROM opening_courses WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateAllocation(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const {
      course_id,
      allocating_group_id,
      teacher_id,
      vehicle_id,
      student_count,
      closing_date,
      notes,
    } = req.body;

    const existing = db.prepare('SELECT * FROM course_allocations WHERE id = ?').get(Number(id));
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi lên khóa.' });
    }

    const targetCourseId = course_id !== undefined ? Number(course_id) : existing.course_id;
    const targetTeacherId = teacher_id !== undefined ? Number(teacher_id) : existing.teacher_id;
    const targetCount = student_count !== undefined ? Number(student_count) : existing.student_count;
    const targetClosingDate =
      closing_date !== undefined
        ? closing_date
          ? toISODate(closing_date)
          : ''
        : existing.closing_date || '';
    const targetNotes = notes !== undefined ? String(notes) : existing.notes;

    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 10) {
      return res.status(400).json({ error: 'Số lượng học viên phải từ 1 đến 10.' });
    }

    const course = db.prepare('SELECT * FROM opening_courses WHERE id = ?').get(targetCourseId);
    if (!course) {
      return res.status(404).json({ error: 'Khóa khai giảng không tồn tại.' });
    }

    const teacher = db
      .prepare(
        `SELECT t.*, tg.name AS group_name, tg.has_business_household AS group_has_business_household,
                v.id AS default_vehicle_id
         FROM teachers t
         JOIN teacher_groups tg ON tg.id = t.group_id
         LEFT JOIN vehicles v ON v.teacher_id = t.id
         WHERE t.id = ?`
      )
      .get(targetTeacherId);
    if (!teacher) {
      return res.status(400).json({ error: 'Giáo viên không tồn tại.' });
    }

    const targetVehicleId =
      vehicle_id !== undefined
        ? Number(vehicle_id)
        : existing.vehicle_id || teacher.default_vehicle_id;
    const targetAllocGroupId =
      allocating_group_id !== undefined
        ? Number(allocating_group_id)
        : existing.allocating_group_id || teacher.group_id;

    // Kiểm tra quy tắc 6 tuần / 3 tuần khi Admin sửa bản ghi (trừ chính bản ghi đang sửa)
    const otherTeacherAllocs = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         WHERE ca.teacher_id = ? AND ca.id != ?
         ORDER BY oc.opening_date ASC`
      )
      .all(targetTeacherId, Number(id));

    const teacherCheck = validateAllocationRequest({
      teacher: { ...teacher, max_quota: 5 },
      allocations: otherTeacherAllocs,
      courseOpeningDate: course.opening_date,
      requestedStudents: targetCount,
    });
    if (!teacherCheck.valid) {
      return res.status(400).json({ error: teacherCheck.error });
    }

    const otherVehicleAllocs = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         WHERE ca.vehicle_id = ? AND ca.id != ?
         ORDER BY oc.opening_date ASC`
      )
      .all(targetVehicleId, Number(id));

    const vehicleCheck = validateAllocationRequest({
      teacher: { full_name: `Xe ID #${targetVehicleId}`, max_quota: 5, has_business_household: 1, group_has_business_household: 1 },
      allocations: otherVehicleAllocs,
      courseOpeningDate: course.opening_date,
      requestedStudents: targetCount,
    });
    if (!vehicleCheck.valid) {
      return res.status(400).json({ error: vehicleCheck.error });
    }

    const hasHKDWarning =
      !teacher.has_business_household || !teacher.group_has_business_household ? 1 : 0;

    db.prepare(
      `UPDATE course_allocations
       SET course_id = ?, allocating_group_id = ?, teacher_id = ?, vehicle_id = ?, student_count = ?,
           closing_date = ?, next_eligible_date = ?, turnaround_date = ?, had_business_household_warning = ?, notes = ?
       WHERE id = ?`
    ).run(
      targetCourseId,
      targetAllocGroupId,
      targetTeacherId,
      targetVehicleId,
      targetCount,
      targetClosingDate,
      addDays(course.opening_date, 21),
      addDays(course.opening_date, 42),
      hasHKDWarning,
      targetNotes,
      Number(id)
    );

    const updated = db.prepare('SELECT * FROM course_allocations WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteAllocation(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('DELETE FROM course_allocations WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation,
};
