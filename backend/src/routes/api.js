const express = require('express');
const groupController = require('../controllers/groupController');
const teacherController = require('../controllers/teacherController');
const courseController = require('../controllers/courseController');
const vehicleController = require('../controllers/vehicleController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// 1. Nhóm giáo viên & Danh sách cần chú ý (bỏ qua 3 khóa khai giảng)
router.get('/groups', groupController.listGroups);
router.post('/groups', groupController.createGroup);
router.put('/groups/:id', groupController.updateGroup);
router.delete('/groups/:id', groupController.deleteGroup);
router.get('/dashboard/attention-groups', groupController.listAttentionGroups);

// 2. Giáo viên & Xe phụ trách (1 xe 1 GV = 5 HV, hỗ trợ nhóm có xe lẻ hoặc mượn xe/GV)
router.get('/teachers', teacherController.listTeachers);
router.post('/teachers', teacherController.createTeacher);
router.put('/teachers/:id', teacherController.updateTeacher);
router.delete('/teachers/:id', teacherController.deleteTeacher);

// 3. Quản lý Xe & Tra cứu biển số xe -> ra tên giáo viên, xe và các ngày đã khai giảng
router.get('/vehicles', vehicleController.listAllVehicles);
router.post('/vehicles', vehicleController.createStandaloneVehicle);
router.delete('/vehicles/:id', vehicleController.deleteVehicle);
router.get('/vehicles/search', vehicleController.searchVehiclesByPlate);

// 4. Khóa khai giảng (Ngày khai giảng) & Phân bổ học viên lên khóa (hỗ trợ mượn GV / mượn Xe nhóm khác)
router.get('/courses', courseController.listCourses);
router.post('/courses', courseController.createCourse);
router.put('/courses/:id', courseController.updateCourse);
router.delete('/courses/:id', courseController.deleteCourse);

router.get('/allocations', courseController.listAllocations);
router.post('/allocations', courseController.createAllocation);
router.put('/allocations/:id', courseController.updateAllocation);
router.delete('/allocations/:id', courseController.deleteAllocation);

// 5. Công cụ Admin Quản trị Dữ liệu (Export / Reset Seed / Bulk Import Excel-CSV từng bảng)
router.get('/admin/export', adminController.exportAllData);
router.post('/admin/reset-seed', adminController.resetSeedData);
router.post('/admin/bulk-import', adminController.bulkImportTeachersAndGroups);
router.post('/admin/import-table', adminController.importByTable);

module.exports = router;
