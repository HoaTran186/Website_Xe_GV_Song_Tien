const dayjs = require('dayjs');
const { getDb, normalizePlate } = require('../db/database');
const { calculateTeacherQuotaStatus } = require('../services/quotaService');

function listTeachers(req, res) {
  try {
    const db = getDb();
    const { groupId, referenceDate } = req.query;
    const refDate = referenceDate || dayjs().format('YYYY-MM-DD');

    let query = `
      SELECT t.*, tg.name AS group_name, tg.has_business_household AS group_has_business_household,
             tg.business_household_info AS group_business_household_info,
             v.id AS vehicle_id, v.license_plate, v.normalized_plate, v.vehicle_class, COALESCE(v.max_quota, 5) AS max_quota
      FROM teachers t
      JOIN teacher_groups tg ON tg.id = t.group_id
      LEFT JOIN vehicles v ON v.teacher_id = t.id
    `;
    const params = [];
    if (groupId) {
      query += ' WHERE t.group_id = ?';
      params.push(Number(groupId));
    }
    query += ' ORDER BY tg.id ASC, t.id ASC';

    const teachers = db.prepare(query).all(...params);
    const allocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         ORDER BY oc.opening_date DESC`
      )
      .all();

    const result = teachers.map((t) => {
      const teacherAllocs = allocations.filter((a) => Number(a.teacher_id) === Number(t.id));
      const quotaStatus = calculateTeacherQuotaStatus(t, teacherAllocs, refDate);
      return {
        id: t.id,
        full_name: t.full_name,
        phone: t.phone || '',
        group_id: t.group_id,
        group_name: t.group_name,
        has_business_household: Boolean(t.has_business_household),
        group_has_business_household: Boolean(t.group_has_business_household),
        business_household_warning: quotaStatus.business_household_warning,
        business_household_warning_message: quotaStatus.business_household_warning_message,
        vehicle: t.vehicle_id
          ? {
              id: t.vehicle_id,
              license_plate: t.license_plate,
              normalized_plate: t.normalized_plate,
              vehicle_class: t.vehicle_class,
              max_quota: t.max_quota,
            }
          : null,
        quota_status: quotaStatus,
        opening_history: teacherAllocs,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createTeacher(req, res) {
  try {
    const db = getDb();
    const {
      group_id,
      full_name,
      phone,
      has_business_household,
      license_plate,
      vehicle_class,
      max_quota,
    } = req.body;

    const trimmedName = String(full_name || '').trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Họ tên giáo viên phải từ 2 đến 100 ký tự.' });
    }

    if (!group_id) {
      return res.status(400).json({ error: 'Vui lòng chọn Nhóm giáo viên cho giáo viên này.' });
    }

    const group = db.prepare('SELECT * FROM teacher_groups WHERE id = ?').get(Number(group_id));
    if (!group) {
      return res.status(404).json({ error: 'Nhóm giáo viên không tồn tại.' });
    }

    const plateTrimmed = String(license_plate || '').trim();
    const normPlate = normalizePlate(plateTrimmed);

    if (plateTrimmed) {
      const existingPlate = db
        .prepare('SELECT id, license_plate, teacher_id FROM vehicles WHERE normalized_plate = ?')
        .get(normPlate);
      if (existingPlate && existingPlate.teacher_id) {
        return res.status(400).json({
          error: `Biển số xe "${plateTrimmed}" đã được gán cố định cho một giáo viên khác (${existingPlate.license_plate}). Nếu muốn mượn xe này khi lên khóa, bạn có thể để trống biển số xe cố định hoặc chọn mượn xe ở mục Lên Khóa.`,
        });
      }
    }

    const insertTeacher = db.prepare(
      `INSERT INTO teachers (group_id, full_name, phone, has_business_household)
       VALUES (?, ?, ?, ?)`
    );
    const teacherInfo = insertTeacher.run(
      Number(group_id),
      trimmedName,
      String(phone || '').trim(),
      has_business_household ? 1 : 0
    );
    const teacherId = teacherInfo.lastInsertRowid;

    if (plateTrimmed) {
      const existingUnassignedVehicle = db
        .prepare('SELECT * FROM vehicles WHERE normalized_plate = ? AND teacher_id IS NULL')
        .get(normPlate);

      if (existingUnassignedVehicle) {
        db.prepare(
          'UPDATE vehicles SET teacher_id = ?, group_id = ?, vehicle_class = ?, max_quota = ? WHERE id = ?'
        ).run(
          teacherId,
          Number(group_id),
          vehicle_class || existingUnassignedVehicle.vehicle_class || 'B2',
          Number(max_quota) || existingUnassignedVehicle.max_quota || 5,
          existingUnassignedVehicle.id
        );
      } else {
        db.prepare(
          `INSERT INTO vehicles (group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          Number(group_id),
          teacherId,
          plateTrimmed,
          normPlate,
          vehicle_class || 'B2',
          Number(max_quota) || 5
        );
      }
    }

    res.status(201).json({
      id: teacherId,
      group_id: Number(group_id),
      full_name: trimmedName,
      phone: String(phone || '').trim(),
      has_business_household: Boolean(has_business_household),
      license_plate: plateTrimmed || null,
      vehicle_class: vehicle_class || 'B2',
      max_quota: Number(max_quota) || 5,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateTeacher(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const {
      group_id,
      full_name,
      phone,
      has_business_household,
      license_plate,
      vehicle_class,
      max_quota,
    } = req.body;

    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(Number(id));
    if (!teacher) {
      return res.status(404).json({ error: 'Không tìm thấy giáo viên.' });
    }

    const trimmedName = String(full_name ?? teacher.full_name).trim();
    const nextGroupId = group_id !== undefined ? Number(group_id) : teacher.group_id;
    const nextHasHKD =
      has_business_household !== undefined
        ? has_business_household
          ? 1
          : 0
        : teacher.has_business_household;

    db.prepare(
      `UPDATE teachers
       SET group_id = ?, full_name = ?, phone = ?, has_business_household = ?
       WHERE id = ?`
    ).run(nextGroupId, trimmedName, String(phone ?? teacher.phone).trim(), nextHasHKD, Number(id));

    if (license_plate !== undefined) {
      const plateTrimmed = String(license_plate || '').trim();
      const normPlate = normalizePlate(plateTrimmed);
      const existingVehicle = db
        .prepare('SELECT * FROM vehicles WHERE teacher_id = ?')
        .get(Number(id));

      if (!plateTrimmed && existingVehicle) {
        // Bỏ gán giáo viên nhưng giữ xe lại cho nhóm (nhóm có xe nhưng thiếu giáo viên)
        db.prepare('UPDATE vehicles SET teacher_id = NULL WHERE id = ?').run(existingVehicle.id);
      } else if (plateTrimmed) {
        if (existingVehicle) {
          db.prepare(
            `UPDATE vehicles
             SET group_id = ?, license_plate = ?, normalized_plate = ?, vehicle_class = ?, max_quota = ?
             WHERE teacher_id = ?`
          ).run(
            nextGroupId,
            plateTrimmed,
            normPlate,
            vehicle_class || existingVehicle.vehicle_class || 'B2',
            Number(max_quota) || existingVehicle.max_quota || 5,
            Number(id)
          );
        } else {
          db.prepare(
            `INSERT INTO vehicles (group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            nextGroupId,
            Number(id),
            plateTrimmed,
            normPlate,
            vehicle_class || 'B2',
            Number(max_quota) || 5
          );
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteTeacher(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('DELETE FROM teachers WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
