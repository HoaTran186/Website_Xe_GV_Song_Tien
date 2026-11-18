const express = require('express');
const groupController = require('../controllers/groupController');
const teacherController = require('../controllers/teacherController');
const courseController = require('../controllers/courseController');
const vehicleController = require('../controllers/vehicleController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ================= 0. XÁC THỰC & ĐĂNG NHẬP =================
router.post('/auth/login', authController.login);
router.get('/auth/me', requireAuth, authController.getMe);
router.post('/auth/logout', requireAuth, authController.logout);

// ================= 1. QUẢN TRỊ TÀI KHOẢN (CHỈ ADMIN) =================
router.get('/admin/users', requireAdmin, authController.listUsers);
router.post('/admin/users', requireAdmin, authController.createUser);
router.put('/admin/users/:id', requireAdmin, authController.updateUser);
router.delete('/admin/users/:id', requireAdmin, authController.deleteUser);

// ================= 2. CÔNG CỤ ADMIN QUẢN TRỊ DỮ LIỆU (CHỈ ADMIN) =================
router.get('/admin/export', requireAdmin, adminController.exportAllData);
router.post('/admin/reset-seed', requireAdmin, adminController.resetSeedData);
router.post('/admin/bulk-import', requireAdmin, adminController.bulkImportTeachersAndGroups);
router.post('/admin/import-table', requireAdmin, adminController.importByTable);

// ================= 3. NGHIỆP VỤ HỆ THỐNG =================
// 3.1. Nhóm giáo viên & Danh sách cần chú ý (bỏ qua 3 khóa khai giảng)
router.get('/groups', groupController.listGroups);
router.post('/groups', groupController.createGroup);
router.put('/groups/:id', groupController.updateGroup);
router.delete('/groups/:id', groupController.deleteGroup);
router.get('/dashboard/attention-groups', groupController.listAttentionGroups);

// 3.2. Giáo viên & Xe phụ trách
router.get('/teachers', teacherController.listTeachers);
router.post('/teachers', teacherController.createTeacher);
router.put('/teachers/:id', teacherController.updateTeacher);
router.delete('/teachers/:id', teacherController.deleteTeacher);

// 3.3. Quản lý Xe & Tra cứu biển số xe
router.get('/vehicles', vehicleController.listAllVehicles);
router.post('/vehicles', vehicleController.createStandaloneVehicle);
router.delete('/vehicles/:id', vehicleController.deleteVehicle);
router.get('/vehicles/search', vehicleController.searchVehiclesByPlate);

// 3.4. Khóa khai giảng & Phân bổ học viên
router.get('/courses', courseController.listCourses);
router.post('/courses', courseController.createCourse);
router.put('/courses/:id', courseController.updateCourse);
router.delete('/courses/:id', courseController.deleteCourse);

router.get('/allocations', courseController.listAllocations);
router.post('/allocations', courseController.createAllocation);
router.put('/allocations/:id', courseController.updateAllocation);
router.delete('/allocations/:id', courseController.deleteAllocation);

module.exports = router;
