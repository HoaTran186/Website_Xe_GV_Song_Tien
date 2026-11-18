---

description: "Task list for Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền"
---

# Tasks: Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền

**Input**: Design documents from `/specs/001-quan-ly-khai-giang/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`

**Tests**: Unit test cho thuật toán tính định mức 3 tuần / 6 tuần được đưa vào giai đoạn hoàn thiện để đảm bảo độ chính xác tuyệt đối của nghiệp vụ.

**Organization**: Các task được chia theo từng User Story để có thể phát triển, kiểm thử và nghiệm thu độc lập.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Có thể chạy song song (khác file, không phụ thuộc task chưa xong)
- **[Story]**: Nhãn User Story (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Mọi task đều chứa đường dẫn file cụ thể

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Khởi tạo cấu trúc thư mục dự án `backend/` (Node.js) và `frontend/` (React Vite) theo `plan.md`

- [X] T001 Create project directory structure (`backend/src/db`, `backend/src/services`, `backend/src/controllers`, `backend/src/routes`, `backend/data`, `frontend/src/api`, `frontend/src/components`)
- [X] T002 Initialize Node.js backend package and dependencies (`express`, `cors`, `better-sqlite3`, `dayjs`) in `backend/package.json`
- [X] T003 [P] Initialize React Vite frontend package and dependencies (`react`, `react-dom`, `vite`, `tailwindcss`, `lucide-react`) in `frontend/package.json` and `frontend/vite.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Hạ tầng CSDL SQLite, Schema 5 bảng cốt lõi, Express API khung và React API client dùng chung cho mọi User Story

**⚠️ CRITICAL**: Phải hoàn tất Phase 2 trước khi bắt đầu các User Story

- [X] T004 Create SQLite schema with all 5 tables (`teacher_groups`, `teachers`, `vehicles`, `opening_courses`, `course_allocations`) and constraints (`name` Độ dài 2–100 ký tự, không trùng lặp; `has_business_household` INTEGER 0/1; `license_plate` Unique; `max_quota` Mặc định: 5; `opening_date` YYYY-MM-DD, Unique; `student_count` 1 <= student_count <= remaining_quota) in `backend/src/db/schema.sql`
- [X] T005 Implement SQLite database connection helper and auto-migration runner in `backend/src/db/database.js`
- [X] T006 [P] Setup Express application, CORS middleware, JSON body parser, error handler, and main router in `backend/src/app.js`, `backend/src/server.js`, and `backend/src/routes/api.js`
- [X] T007 [P] Create frontend HTTP API client wrapper for `http://localhost:5000/api` in `frontend/src/api/client.js`
- [X] T008 [P] Create base React layout, navigation header, and CSS styling in `frontend/index.html`, `frontend/src/index.css`, `frontend/src/main.jsx`, `frontend/src/components/Navbar.jsx`, and `frontend/src/App.jsx`

**Checkpoint**: Hạ tầng CSDL, Server Node.js và khung giao diện React đã sẵn sàng.

---

## Phase 3: User Story 2 - Quản lý Nhóm Giáo Viên, Giáo Viên, Xe & Cảnh Báo Hộ Kinh Doanh (Priority: P1) 🎯 MVP Core Data

**Goal**: Cho phép nhập Nhóm giáo viên, nhập tên Giáo viên thuộc Nhóm giáo viên, gán biển số xe (mặc định 1 xe 1 GV = 5 học viên) và quản lý trạng thái Hộ Kinh Doanh của Giáo viên / Nhóm giáo viên.

**Independent Test**: Thêm mới Nhóm giáo viên, thêm Giáo viên thuộc nhóm kèm biển số xe và trạng thái "Chưa có Hộ Kinh Doanh", kiểm tra dữ liệu lưu thành công và hiển thị nhãn cảnh báo Hộ Kinh Doanh.

### Implementation for User Story 2

- [X] T009 [P] [US2] Implement TeacherGroup CRUD controller (`GET /api/groups`, `POST /api/groups`, `PUT /api/groups/:id`, `DELETE /api/groups/:id`) validating `name` (Độ dài 2–100 ký tự, không trùng lặp) and `has_business_household` (INTEGER 0/1) in `backend/src/controllers/groupController.js`
- [X] T010 [P] [US2] Implement Teacher & Vehicle CRUD controller (`GET /api/teachers`, `POST /api/teachers`, `PUT /api/teachers/:id`, `DELETE /api/teachers/:id`) enforcing `full_name` (2–100 ký tự), `group_id` required FK, `license_plate` unique, `normalized_plate` (`license_plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()`), and `max_quota` default `5` in `backend/src/controllers/teacherController.js`
- [X] T011 [US2] Register `/api/groups` and `/api/teachers` routes in `backend/src/routes/api.js`
- [X] T012 [US2] Build React Teacher & Group management view (form tạo Nhóm GV, form nhập Giáo viên thuộc Nhóm GV + Biển số xe + Checkbox Hộ Kinh Doanh, danh sách nhóm và giáo viên) in `frontend/src/components/TeacherGroupTab.jsx`

**Checkpoint**: Hoàn tất quản lý Nhóm GV, Giáo viên, Xe và trạng thái Hộ Kinh Doanh.

---

## Phase 4: User Story 1 - Quản lý Lên Khóa Khai Giảng & Tính Định Mức Học Viên (Priority: P1) 🎯 MVP Core Logic

**Goal**: Quản lý các ngày khai giảng và đăng ký học viên lên khóa theo đúng quy tắc: 1 xe 1 giáo viên tối đa 5 học viên; nếu khóa trước đã lên 3 học viên thì còn lại 2 học viên và phải cách 3 tuần (+21 ngày) mới được lên tiếp 2 học viên đó; mỗi 6 tuần (+42 ngày) quay đầu lại định mức 5 học viên; đồng thời cảnh báo nếu Giáo viên / Nhóm giáo viên chưa có Hộ Kinh Doanh khi lên khóa.

**Independent Test**: Tạo Khóa K01 (lên 3 HV cho GV A) $\rightarrow$ hệ thống báo còn lại 2 HV, ngày được lên tiếp là sau 3 tuần (`+21 ngày`), ngày quay đầu là sau 6 tuần (`+42 ngày`), và hiển thị cảnh báo nếu GV/Nhóm chưa có Hộ Kinh Doanh.

### Implementation for User Story 1

- [X] T013 [US1] Implement quota calculation service (`calculateTeacherQuotaStatus`, `validateAllocationRequest`) computing `usedQuota` within 6-week window (`42 days`), `remainingQuota = max(0, max_quota - usedQuota)`, 3-week cooldown (`next_eligible_date = opening_date + 21 days`), 6-week turnaround (`turnaround_date = opening_date + 42 days`), and Business Household warning check in `backend/src/services/quotaService.js`
- [X] T014 [US1] Implement OpeningCourse & CourseAllocation controller (`GET /api/courses`, `POST /api/courses`, `GET /api/allocations`, `POST /api/allocations`, `DELETE /api/allocations/:id`) enforcing `1 <= student_count <= remaining_quota`, 3-week interval rule, and Business Household warning confirmation in `backend/src/controllers/courseController.js`
- [X] T015 [US1] Integrate `quotaService` into `groupController.js` and `teacherController.js` and mount `/api/courses` and `/api/allocations` routes in `backend/src/routes/api.js`
- [X] T016 [US1] Build React Course Allocation & Quota Tracking view (tạo/chọn Ngày khai giảng, hiển thị số lượng còn lại khai giảng của từng Nhóm GV & Giáo viên, cảnh báo chờ 3 tuần, ngày quay đầu 6 tuần, và hộp cảnh báo khi GV/Nhóm chưa có Hộ Kinh Doanh) in `frontend/src/components/CourseAllocationTab.jsx`

**Checkpoint**: Nghiệp vụ lên khóa, tính số lượng học viên còn lại (5 - đã lên), chờ 3 tuần, quay đầu 6 tuần và cảnh báo Hộ Kinh Doanh hoạt động hoàn chỉnh.

---

## Phase 5: User Story 3 - Tra Cứu Biển Số Xe & Lịch Sử Ngày Khai Giảng (Priority: P2)

**Goal**: Khi tìm biển số xe sẽ trả về tên giáo viên, nhóm giáo viên, thông tin xe, số lượng học viên còn lại và danh sách các ngày giáo viên/xe đó đã khai giảng.

**Independent Test**: Nhập biển số xe (có hoặc không có dấu gạch/chấm) vào ô tìm kiếm và kiểm tra kết quả hiển thị đúng tên giáo viên, xe và các ngày đã khai giảng.

### Implementation for User Story 3

- [X] T017 [P] [US3] Implement vehicle license plate search controller (`GET /api/vehicles/search?plate=...`) matching normalized or raw license plate and returning teacher, group, quota status, and ordered opening dates history in `backend/src/controllers/vehicleController.js`
- [X] T018 [US3] Register `/api/vehicles/search` route in `backend/src/routes/api.js`
- [X] T019 [US3] Build React Vehicle License Plate Search tab (ô nhập biển số xe tìm kiếm tức thời, thẻ thông tin Giáo viên - Nhóm - Xe - Hộ Kinh Doanh, và bảng lịch sử các ngày đã khai giảng) in `frontend/src/components/VehicleSearchTab.jsx`

**Checkpoint**: Chức năng tìm biển số xe ra tên giáo viên, xe và các ngày đã khai giảng hoạt động độc lập.

---

## Phase 6: User Story 4 - Theo Dõi Nhóm Giáo Viên Bỏ Qua 3 Khóa Khai Giảng (Danh Sách Cần Chú Ý) (Priority: P2)

**Goal**: Tự động phát hiện Nhóm giáo viên bỏ qua 3 khóa khai giảng (3 ngày khai giảng liên tiếp không có học viên lên khóa) và đưa vào "Danh sách cần chú ý".

**Independent Test**: Tạo 3 ngày khai giảng liên tiếp mà một Nhóm giáo viên không có học viên lên khóa, kiểm tra nhóm đó xuất hiện trong Danh sách cần chú ý kèm 3 ngày khai giảng đã bỏ qua.

### Implementation for User Story 4

- [X] T020 [P] [US4] Implement missed-courses detection service (`getAttentionGroups`) counting consecutive missed `opening_courses` per group (`consecutive_missed_courses >= 3`) in `backend/src/services/attentionService.js`
- [X] T021 [US4] Expose `GET /api/dashboard/attention-groups` endpoint in `backend/src/controllers/groupController.js` and `backend/src/routes/api.js`
- [X] T022 [US4] Build React Attention List component displaying groups that skipped $\ge 3$ opening courses with the specific missed opening dates in `frontend/src/components/AttentionBanner.jsx` and integrate into `frontend/src/App.jsx`

**Checkpoint**: Danh sách cần chú ý tự động cảnh báo các nhóm giáo viên bỏ qua 3 khóa khai giảng.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tạo dữ liệu mẫu thực tế của trung tâm Sông Tiền, viết unit test cho công thức 3 tuần / 6 tuần và kiểm tra theo `quickstart.md`

- [X] T023 [P] Create realistic seed script (tạo sẵn các Nhóm GV, Giáo viên có/chưa có Hộ Kinh Doanh, biển số xe `63A-...`, các khóa khai giảng minh họa trường hợp đã lên 3 HV còn 2 HV chờ 3 tuần, quay đầu 6 tuần, và nhóm bỏ qua 3 khóa) in `backend/src/db/seed.js`
- [X] T024 [P] Create unit test verifying 5-student quota, 3-week cooldown (`+21 days`), 6-week turnaround (`+42 days`), and 3-missed-courses attention rule in `backend/tests/quotaService.test.js`
- [X] T025 Run end-to-end validation according to `specs/001-quan-ly-khai-giang/quickstart.md`

---

## Phase 8: User Story 5 - Website Quản Trị Dữ Liệu Toàn Diện Cho Admin (Priority: P1)

**Goal**: Cung cấp cả trang Web Admin độc lập trên cổng Backend (`http://localhost:5000/admin`) và phân hệ Quản Trị Dữ Liệu Admin trên ứng dụng React (`http://localhost:5173`) để Admin có thể thêm, sửa, xóa mọi bảng dữ liệu (Nhóm GV, Giáo viên, Xe, Khóa khai giảng, Bản ghi lên khóa) và khôi phục/xuất dữ liệu.

**Independent Test**: Truy cập `http://localhost:5000/admin` hoặc tab "Quản Trị Dữ Liệu (Admin)" trên `http://localhost:5173`, thực hiện sửa thông tin một Giáo viên/Xe, sửa một Khóa khai giảng hoặc sửa số lượng học viên trong một Bản ghi lên khóa và kiểm tra dữ liệu cập nhật thành công.

### Implementation for User Story 5

- [X] T026 [US5] Add full Admin update/delete endpoints (`PUT /api/courses/:id`, `DELETE /api/courses/:id`, `PUT /api/allocations/:id`, `POST /api/admin/reset-seed`, `GET /api/admin/export`) in `backend/src/controllers/courseController.js`, `backend/src/controllers/adminController.js`, and `backend/src/routes/api.js`
- [X] T027 [P] [US5] Build standalone Backend Admin Data Management Website served at `http://localhost:5000/admin` in `backend/src/public/admin.html` and mount static route in `backend/src/app.js`
- [X] T028 [P] [US5] Extend frontend API client with full Admin CRUD methods (`updateCourse`, `deleteCourse`, `updateAllocation`, `resetSeedData`, `exportAllData`) in `frontend/src/api/client.js`
- [X] T029 [US5] Build React Admin Data Manager component supporting full inline/modal Create, Edit, Delete for all 5 tables (Groups, Teachers & Vehicles, Courses, Allocations) in `frontend/src/components/AdminDataManagerTab.jsx` and wire into `frontend/src/components/Navbar.jsx` and `frontend/src/App.jsx`
- [X] T030 [US5] Verify Admin CRUD endpoints and restart servers for live user access
- [X] T031 [US5] Unify all 5 feature modules onto a single unified page (`single-page` mode by default with smooth-scroll section anchors) in `frontend/src/App.jsx` and `frontend/src/components/Navbar.jsx`
- [X] T032 [US2] Add `POST /api/admin/bulk-import` endpoint to bulk-create/update TeacherGroups, Teachers, and Vehicles from Excel/CSV/TSV rows in `backend/src/controllers/adminController.js` and `backend/src/routes/api.js`
- [X] T033 [US2] Build Excel (`.xlsx`, `.xls`), CSV (`.csv`), and Excel Copy-Paste importer with template download in `frontend/src/components/ExcelImportBox.jsx` and integrate into `frontend/src/components/TeacherGroupTab.jsx` and `backend/src/public/admin.html`
- [X] T034 [US1] Support cross-group teacher/vehicle borrowing (`allocating_group_id`, `is_borrowed`, `borrow_note`, group-owned vehicles without permanent teacher) and `dd/mm/yyyy` date format across backend and frontend in `backend/src/db/database.js`, `backend/src/controllers/courseController.js`, `backend/src/controllers/vehicleController.js`, `frontend/src/components/CourseAllocationTab.jsx`, and `frontend/src/components/TeacherGroupTab.jsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** $\rightarrow$ **Phase 2 (Foundational)** $\rightarrow$ **Phase 3 (`[US2]`) & Phase 4 (`[US1]`)** $\rightarrow$ **Phase 5 (`[US3]`) & Phase 6 (`[US4]`)** $\rightarrow$ **Phase 7 (Polish)**.
- `Phase 2` là điều kiện tiên quyết cho tất cả User Stories.
- `Phase 5 ([US3])` và `Phase 6 ([US4])` có thể triển khai song song sau khi hoàn tất `Phase 4 ([US1])`.

### Parallel Opportunities

- `T002` (Backend init) và `T003` (Frontend init) chạy song song.
- `T006`, `T007`, `T008` trong Phase 2 chạy song song.
- `T009` (`groupController.js`) và `T010` (`teacherController.js`) chạy song song.
- `T017` (`vehicleController.js`) và `T020` (`attentionService.js`) chạy song song.
- `T023` (`seed.js`) và `T024` (`quotaService.test.js`) chạy song song.

---

## Implementation Strategy

### MVP First (User Stories 2 & 1)
1. Hoàn thành `Phase 1` (Setup) & `Phase 2` (Foundational SQLite + Express + React).
2. Hoàn thành `Phase 3` (`[US2]` - Nhập Nhóm GV, Giáo viên, Xe, Hộ Kinh Doanh).
3. Hoàn thành `Phase 4` (`[US1]` - Lên khóa khai giảng, tính định mức 5 HV, lên 3 còn 2 chờ 3 tuần, quay đầu 6 tuần, cảnh báo Hộ Kinh Doanh).

### Incremental Delivery (User Stories 3 & 4 + Seed)
4. Hoàn thành `Phase 5` (`[US3]` - Tìm kiếm biển số xe ra tên giáo viên và ngày đã khai giảng).
5. Hoàn thành `Phase 6` (`[US4]` - Danh sách cần chú ý khi nhóm bỏ qua 3 khóa khai giảng).
6. Hoàn thành `Phase 7` (Dữ liệu mẫu & Kiểm thử tự động).

