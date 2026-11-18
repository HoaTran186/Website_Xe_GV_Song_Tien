# Implementation Plan: Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền

**Branch**: `001-quan-ly-khai-giang` | **Date**: 2026-11-16 | **Spec**: [spec.md](file:///d:/Website_Xe_GV_Song_Tien/specs/001-quan-ly-khai-giang/spec.md)

**Input**: Feature specification from `/specs/001-quan-ly-khai-giang/spec.md`

## Summary

Xây dựng ứng dụng web quản lý điều phối xe, giáo viên, nhóm giáo viên và theo dõi hạn mức lên khóa khai giảng cho trung tâm **Xe GV Sông Tiền** với kiến trúc tách biệt **Backend Node.js (Express + SQLite)** và **Frontend React (Vite + Tailwind CSS)**. Hệ thống tự động hóa việc tính số lượng học viên còn lại được phép khai giảng (1 xe 1 giáo viên tối đa 5 học viên, cách 3 tuần mới được lên tiếp số học viên còn lại, mỗi 6 tuần quay đầu định mức), cảnh báo khi giáo viên/nhóm chưa có Hộ Kinh Doanh lúc lên khóa, phát hiện nhóm giáo viên bỏ qua 3 khóa khai giảng liên tiếp để đưa vào Danh sách cần chú ý, và tra cứu nhanh theo biển số xe để biết tên giáo viên, xe cùng lịch sử các ngày đã khai giảng.

## Technical Context

**Language/Version**: JavaScript (ES2022+) / Node.js v18+

**Primary Dependencies**:
- **Backend**: `express`, `cors`, `better-sqlite3` (hoặc `sqlite3`), `dayjs` (xử lý chu kỳ 3 tuần / 6 tuần chính xác).
- **Frontend**: `react`, `react-dom`, `vite`, `tailwindcss`, `lucide-react` (biểu tượng giao diện).

**Storage**: SQLite (`backend/data/song_tien.db`) với ràng buộc khóa ngoại đầy đủ.

**Testing**: Node.js built-in test runner (`node --test`) & kiểm thử nghiệm thu theo `quickstart.md`.

**Target Platform**: Web Browser (Desktop & Tablet) + Windows/Linux Node.js Server.

**Project Type**: `web-service` + `single-page-application` (Full-stack React + Node.js).

**Performance Goals**: Thời gian phản hồi API tra cứu biển số xe và tính toán hạn mức khai giảng `< 50ms` (p95), giao diện hiển thị tức thời dưới `1 giây`.

**Constraints**: Múi giờ tính ngày khai giảng theo chuẩn Việt Nam (`YYYY-MM-DD`), giao diện 100% tiếng Việt rõ ràng.

**Scale/Scope**: Hỗ trợ quản lý hàng chục nhóm giáo viên, hàng trăm giáo viên & xe đào tạo, và hàng nghìn lịch sử đợt khai giảng qua nhiều năm.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Kiến trúc Tách biệt Frontend & Backend (React + Node.js)**: Đạt — Dự án tách rõ thư mục `backend/` (Node.js Express REST API) và `frontend/` (React Vite SPA).
- [x] **II. Tính Toàn vẹn Nghiệp vụ Đào tạo & Khai giảng**: Đạt — Công thức 1 xe 1 GV = 5 HV, chờ 3 tuần (+21 ngày) để lên tiếp phần còn lại (`5 - đã lên`), và quay đầu sau 6 tuần (+42 ngày) được xử lý tập trung tại `backend/src/services/quotaService.js`.
- [x] **III. Kiểm tra Quy điều kiện & Cảnh báo Tự động**: Đạt — Kiểm tra trạng thái Hộ Kinh Doanh của GV/Nhóm GV khi lên khóa và tự động lọc các nhóm bỏ qua $\ge 3$ khóa khai giảng liên tiếp vào Danh sách cần chú ý.
- [x] **IV. Truy xuất & Tra cứu Tức thời**: Đạt — Endpoint `/api/vehicles/search` chuẩn hóa biển số xe và trả về đầy đủ tên giáo viên, nhóm, xe và các ngày đã khai giảng.
- [x] **V. Giao diện Tiếng Việt Trực quan & Đơn giản**: Đạt — Thiết kế 4 khu vực chức năng trực quan bằng tiếng Việt trên React.

## Project Structure

### Documentation (this feature)

```text
specs/001-quan-ly-khai-giang/
├── plan.md              # Kế hoạch triển khai kỹ thuật (/speckit-plan)
├── research.md          # Nghiên cứu công nghệ & thuật toán 3 tuần / 6 tuần
├── data-model.md        # Thiết kế bảng CSDL & quan hệ thực thể
├── quickstart.md        # Hướng dẫn chạy và kịch bản kiểm thử nghiệm thu
├── contracts/
│   └── api.md           # Đặc tả REST API giữa React và Node.js
└── tasks.md             # Danh sách công việc chi tiết (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── package.json
├── data/
│   └── song_tien.db
├── src/
│   ├── app.js
│   ├── server.js
│   ├── db/
│   │   ├── database.js
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── services/
│   │   ├── quotaService.js
│   │   └── attentionService.js
│   ├── controllers/
│   │   ├── groupController.js
│   │   ├── teacherController.js
│   │   ├── vehicleController.js
│   │   └── courseController.js
│   └── routes/
│       └── api.js
└── tests/
    └── quotaService.test.js

frontend/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── api/
    │   └── client.js
    └── components/
        ├── Navbar.jsx
        ├── AttentionBanner.jsx
        ├── CourseAllocationTab.jsx
        ├── TeacherGroupTab.jsx
        └── VehicleSearchTab.jsx
```

**Structure Decision**: Chọn mô hình Web Application tách biệt `backend/` (Node.js Express + SQLite) và `frontend/` (React + Vite) tại thư mục gốc của dự án để tuân thủ chặt chẽ Nguyên tắc I của Constitution và giúp việc phát triển, kiểm thử độc lập từng tầng dễ dàng.

## Complexity Tracking

Không có vi phạm Constitution nào cần giải trình.
