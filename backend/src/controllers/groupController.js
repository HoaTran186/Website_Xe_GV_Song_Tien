const { getAttentionGroups } = require('../services/attentionService');
const dayjs = require('dayjs');
const { getDb } = require('../db/database');
const { calculateTeacherQuotaStatus } = require('../services/quotaService');
const { evaluateGroupAttentionStatus } = require('../services/attentionService');

function listGroups(req, res) {
  try {
    const db = getDb();
    const referenceDate = req.query.referenceDate || dayjs().format('YYYY-MM-DD');

    const groups = db.prepare('SELECT * FROM teacher_groups ORDER BY id ASC').all();
    const teachers = db
      .prepare(
        `SELECT t.*, tg.name AS group_name, tg.has_business_household AS group_has_business_household,
                v.id AS vehicle_id, v.license_plate, v.vehicle_class, COALESCE(v.max_quota, 5) AS max_quota
         FROM teachers t
         JOIN teacher_groups tg ON tg.id = t.group_id
         LEFT JOIN vehicles v ON v.teacher_id = t.id
         ORDER BY t.id ASC`
      )
      .all();

    // Các xe thuộc nhóm nhưng chưa có giáo viên cố định (nhóm có xe nhưng thiếu giáo viên)
    const spareVehicles = db
      .prepare(
        `SELECT v.*, tg.name AS group_name
         FROM vehicles v
         LEFT JOIN teacher_groups tg ON tg.id = v.group_id
         WHERE v.teacher_id IS NULL
         ORDER BY v.id ASC`
      )
      .all();

    const allocations = db
      .prepare(
        `SELECT ca.*, oc.course_name, oc.opening_date,
                COALESCE(ca.allocating_group_id, t.group_id) AS effective_group_id,
                t.group_id AS teacher_group_id
         FROM course_allocations ca
         JOIN opening_courses oc ON oc.id = ca.course_id
         JOIN teachers t ON t.id = ca.teacher_id
         ORDER BY oc.opening_date ASC`
      )
      .all();

    const courses = db.prepare('SELECT * FROM opening_courses ORDER BY opening_date ASC').all();

    const result = groups.map((group) => {
      const groupTeachers = teachers.filter((t) => Number(t.group_id) === Number(group.id));
      const groupSpareVehicles = spareVehicles.filter(
        (v) => Number(v.group_id) === Number(group.id)
      );
      // Tính chuyên cần của nhóm dựa trên effective_group_id (nhóm đứng tên lên khóa) hoặc giáo viên của nhóm
      const groupAllocations = allocations.filter(
        (a) =>
          Number(a.effective_group_id) === Number(group.id) ||
          Number(a.teacher_group_id) === Number(group.id)
      );

      let totalMaxQuota = 0;
      let totalUsedQuota = 0;
      let totalRemainingQuota = 0;
      let availableNowQuota = 0;
      let teachersWithoutHKD = 0;

      const teacherDetails = groupTeachers.map((t) => {
        const tAllocs = allocations.filter((a) => Number(a.teacher_id) === Number(t.id));
        const quotaStatus = calculateTeacherQuotaStatus(t, tAllocs, referenceDate);
        totalMaxQuota += quotaStatus.max_quota;
        totalUsedQuota += quotaStatus.used_quota;
        totalRemainingQuota += quotaStatus.remaining_quota;
        if (quotaStatus.can_enroll_on_reference_date) {
          availableNowQuota += quotaStatus.remaining_quota;
        }
        if (!t.has_business_household) {
          teachersWithoutHKD += 1;
        }
        return {
          ...t,
          has_business_household: Boolean(t.has_business_household),
          quota_status: quotaStatus,
        };
      });

      // Tính cả định mức cho các Xe lẻ của nhóm (trường hợp nhóm có 5 xe nhưng chỉ có 4 giáo viên)
      const spareVehicleDetails = groupSpareVehicles.map((sv) => {
        const svAllocs = allocations.filter((a) => Number(a.vehicle_id) === Number(sv.id));
        const pseudoTeacher = {
          full_name: `Xe lẻ ${sv.license_plate} (Chờ mượn GV)`,
          group_name: group.name,
          max_quota: sv.max_quota || 5,
          has_business_household: group.has_business_household,
          group_has_business_household: group.has_business_household,
        };
        const quotaStatus = calculateTeacherQuotaStatus(pseudoTeacher, svAllocs, referenceDate);
        totalMaxQuota += quotaStatus.max_quota;
        totalUsedQuota += quotaStatus.used_quota;
        totalRemainingQuota += quotaStatus.remaining_quota;
        if (quotaStatus.can_enroll_on_reference_date) {
          availableNowQuota += quotaStatus.remaining_quota;
        }
        return {
          ...sv,
          quota_status: quotaStatus,
        };
      });

      const attentionStatus = evaluateGroupAttentionStatus(group, courses, groupAllocations);

      return {
        id: group.id,
        name: group.name,
        has_business_household: Boolean(group.has_business_household),
        business_household_info: group.business_household_info || '',
        notes: group.notes || '',
        created_at: group.created_at,
        teacher_count: groupTeachers.length,
        spare_vehicle_count: spareVehicleDetails.length,
        spare_vehicles: spareVehicleDetails,
        teachers_without_hkd: teachersWithoutHKD,
        total_max_quota: totalMaxQuota,
        total_used_quota: totalUsedQuota,
        total_remaining_quota: totalRemainingQuota,
        available_now_quota: availableNowQuota,
        consecutive_missed_courses: attentionStatus.consecutive_missed_courses,
        needs_attention: attentionStatus.needs_attention,
        missed_courses: attentionStatus.missed_courses,
        missed_course_dates: attentionStatus.missed_course_dates,
        last_participated_date: attentionStatus.last_participated_date,
        teachers: teacherDetails,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createGroup(req, res) {
  try {
    const db = getDb();
    const { name, has_business_household, business_household_info, notes } = req.body;
    const trimmedName = String(name || '').trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Tên nhóm giáo viên phải từ 2 đến 100 ký tự.' });
    }

    const existing = db.prepare('SELECT id FROM teacher_groups WHERE name = ?').get(trimmedName);
    if (existing) {
      return res.status(400).json({ error: `Nhóm giáo viên "${trimmedName}" đã tồn tại.` });
    }

    const stmt = db.prepare(
      `INSERT INTO teacher_groups (name, has_business_household, business_household_info, notes)
       VALUES (?, ?, ?, ?)`
    );
    const info = stmt.run(
      trimmedName,
      has_business_household ? 1 : 0,
      business_household_info || '',
      notes || ''
    );

    const created = db.prepare('SELECT * FROM teacher_groups WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      ...created,
      has_business_household: Boolean(created.has_business_household),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateGroup(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, has_business_household, business_household_info, notes } = req.body;
    const trimmedName = String(name || '').trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Tên nhóm giáo viên phải từ 2 đến 100 ký tự.' });
    }

    db.prepare(
      `UPDATE teacher_groups
       SET name = ?, has_business_household = ?, business_household_info = ?, notes = ?
       WHERE id = ?`
    ).run(
      trimmedName,
      has_business_household ? 1 : 0,
      business_household_info || '',
      notes || '',
      Number(id)
    );

    const updated = db.prepare('SELECT * FROM teacher_groups WHERE id = ?').get(Number(id));
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy nhóm giáo viên.' });
    }

    res.json({
      ...updated,
      has_business_household: Boolean(updated.has_business_household),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteGroup(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('DELETE FROM teacher_groups WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function listAttentionGroups(req, res) {
  try {
    const db = getDb();
    const report = getAttentionGroups(db);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  listAttentionGroups,
};
