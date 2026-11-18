const dayjs = require('dayjs');
const { getDb, normalizePlate } = require('../db/database');
const { calculateTeacherQuotaStatus } = require('../services/quotaService');

function listAllVehicles(req, res) {
  try {
    const db = getDb();
    const refDate = req.query.referenceDate || dayjs().format('YYYY-MM-DD');

    const vehicles = db
      .prepare(
        `SELECT v.*,
                t.id AS teacher_id, t.full_name, t.phone, t.has_business_household,
                COALESCE(v.group_id, t.group_id) AS effective_group_id,
                tg.name AS group_name, tg.has_business_household AS group_has_business_household
         FROM vehicles v
         LEFT JOIN teachers t ON t.id = v.teacher_id
         LEFT JOIN teacher_groups tg ON tg.id = COALESCE(v.group_id, t.group_id)
         ORDER BY v.license_plate ASC`
      )
      .all();

    const allocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         ORDER BY oc.opening_date DESC`
      )
      .all();

    const result = vehicles.map((v) => {
      const vAllocs = allocations.filter((a) => Number(a.vehicle_id) === Number(v.id));
      const pseudoEntity = {
        full_name: v.full_name || `Xe ${v.license_plate}`,
        group_name: v.group_name || 'Chưa gán nhóm',
        max_quota: v.max_quota || 5,
        has_business_household: v.teacher_id ? v.has_business_household : v.group_has_business_household,
        group_has_business_household: v.group_has_business_household,
      };
      const quotaStatus = calculateTeacherQuotaStatus(pseudoEntity, vAllocs, refDate);

      return {
        id: v.id,
        license_plate: v.license_plate,
        normalized_plate: v.normalized_plate,
        vehicle_class: v.vehicle_class,
        max_quota: v.max_quota,
        group_id: v.effective_group_id,
        group_name: v.group_name || 'Chưa gán nhóm',
        teacher_id: v.teacher_id || null,
        teacher_name: v.full_name || null,
        quota_status: quotaStatus,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createStandaloneVehicle(req, res) {
  try {
    const db = getDb();
    const { group_id, license_plate, vehicle_class, max_quota, teacher_id } = req.body;
    const plateTrimmed = String(license_plate || '').trim();
    if (!plateTrimmed) {
      return res.status(400).json({ error: 'Vui lòng nhập biển số xe.' });
    }
    if (!group_id) {
      return res.status(400).json({ error: 'Vui lòng chọn Nhóm giáo viên sở hữu xe.' });
    }

    const normPlate = normalizePlate(plateTrimmed);
    const existing = db
      .prepare('SELECT * FROM vehicles WHERE normalized_plate = ?')
      .get(normPlate);
    if (existing) {
      return res.status(400).json({
        error: `Biển số xe "${plateTrimmed}" đã tồn tại trong hệ thống.`,
      });
    }

    const info = db
      .prepare(
        `INSERT INTO vehicles (group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(group_id),
        teacher_id ? Number(teacher_id) : null,
        plateTrimmed,
        normPlate,
        vehicle_class || 'B2',
        Number(max_quota) || 5
      );

    res.status(201).json({
      id: info.lastInsertRowid,
      group_id: Number(group_id),
      teacher_id: teacher_id ? Number(teacher_id) : null,
      license_plate: plateTrimmed,
      vehicle_class: vehicle_class || 'B2',
      max_quota: Number(max_quota) || 5,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteVehicle(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function searchVehiclesByPlate(req, res) {
  try {
    const db = getDb();
    const rawQuery = String(req.query.plate || '').trim();
    const normQuery = normalizePlate(rawQuery);
    const refDate = req.query.referenceDate || dayjs().format('YYYY-MM-DD');

    const baseSql = `
      SELECT v.*,
             t.id AS teacher_id, t.full_name, t.phone, t.has_business_household,
             COALESCE(v.group_id, t.group_id) AS effective_group_id,
             tg.name AS group_name, tg.has_business_household AS group_has_business_household,
             tg.business_household_info
      FROM vehicles v
      LEFT JOIN teachers t ON t.id = v.teacher_id
      LEFT JOIN teacher_groups tg ON tg.id = COALESCE(v.group_id, t.group_id)
    `;

    let vehicles;
    if (!normQuery) {
      vehicles = db.prepare(`${baseSql} ORDER BY v.license_plate ASC`).all();
    } else {
      vehicles = db
        .prepare(
          `${baseSql}
           WHERE v.normalized_plate LIKE ? OR UPPER(v.license_plate) LIKE ?
           ORDER BY v.license_plate ASC`
        )
        .all(`%${normQuery}%`, `%${rawQuery.toUpperCase()}%`);
    }

    const allocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date,
                COALESCE(NULLIF(ca.closing_date, ''), oc.closing_date, '') AS effective_closing_date,
                t.full_name AS alloc_teacher_name,
                ag.name AS allocating_group_name
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         LEFT JOIN teachers t ON t.id = ca.teacher_id
         LEFT JOIN teacher_groups ag ON ag.id = COALESCE(ca.allocating_group_id, t.group_id)
         ORDER BY oc.opening_date DESC`
      )
      .all();

    const results = vehicles.map((v) => {
      const vehicleAllocs = allocations.filter(
        (a) =>
          Number(a.vehicle_id) === Number(v.id) ||
          (v.teacher_id && Number(a.teacher_id) === Number(v.teacher_id))
      );
      const pseudoTeacher = {
        ...v,
        full_name: v.full_name || 'Xe nhóm (chưa có GV cố định)',
        has_business_household: v.teacher_id
          ? v.has_business_household
          : v.group_has_business_household,
      };
      const quotaStatus = calculateTeacherQuotaStatus(pseudoTeacher, vehicleAllocs, refDate);

      return {
        vehicle_id: v.id,
        license_plate: v.license_plate,
        normalized_plate: v.normalized_plate,
        vehicle_class: v.vehicle_class,
        max_quota: v.max_quota,
        teacher: {
          id: v.teacher_id || null,
          full_name: v.full_name || 'Chưa có GV cố định (Mượn GV khi lên khóa)',
          phone: v.phone || '',
          has_business_household: Boolean(
            v.teacher_id ? v.has_business_household : v.group_has_business_household
          ),
        },
        group: {
          id: v.effective_group_id,
          name: v.group_name || 'Chưa gán nhóm',
          has_business_household: Boolean(v.group_has_business_household),
          business_household_info: v.business_household_info || '',
        },
        quota_status: quotaStatus,
        opening_history: vehicleAllocs.map((a) => ({
          allocation_id: a.id,
          course_id: a.course_id,
          course_name: a.course_name,
          opening_date: a.opening_date,
          closing_date: a.effective_closing_date || '',
          student_count: a.student_count,
          teacher_name: a.alloc_teacher_name || v.full_name || '',
          allocating_group_name: a.allocating_group_name || v.group_name || '',
          is_borrowed: Boolean(a.is_borrowed),
          borrow_note: a.borrow_note || '',
          next_eligible_date: a.next_eligible_date,
          turnaround_date: a.turnaround_date,
          had_business_household_warning: Boolean(a.had_business_household_warning),
          notes: a.notes || '',
          is_active_in_6w_cycle: a.opening_date <= refDate && a.turnaround_date > refDate,
        })),
      };
    });

    res.json({
      query: rawQuery,
      count: results.length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listAllVehicles,
  createStandaloneVehicle,
  deleteVehicle,
  searchVehiclesByPlate,
};
