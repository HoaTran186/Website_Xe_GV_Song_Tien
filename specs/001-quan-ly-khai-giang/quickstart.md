# Quickstart Validation Guide: Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền

**Feature**: `001-quan-ly-khai-giang`  
**Date**: 2026-11-16

## 1. Yêu cầu Hệ thống (Prerequisites)

- **Node.js**: Phiên bản `v18+` hoặc `v20+`
- **Trình quản lý gói**: `npm` (đi kèm Node.js)

## 2. Khởi chạy Dự án

### Bước 1: Chạy Backend (Node.js + Express + SQLite)
```powershell
cd backend
npm install
npm run seed   # Tạo dữ liệu mẫu (Nhóm GV, Giáo viên, Xe, Khóa khai giảng)
npm run dev    # Khởi chạy API Server tại http://localhost:5000
```

### Bước 2: Chạy Frontend (React + Vite)
```powershell
cd frontend
npm install
npm run dev    # Khởi chạy giao diện Web tại http://localhost:5173
```

---

## 3. Các Kịch bản Kiểm thử Nghiệp vụ Cốt lõi (End-to-End Validation)

### Kịch bản 1: Kiểm tra quy tắc 1 Xe 1 Giáo viên = 5 Học viên, Chờ 3 tuần & Quay đầu 6 tuần
1. Mở màn hình **Lên Khóa Khai Giảng**, chọn **Khóa K01 (Ngày `2026-10-01`)**.
2. Chọn **Thầy Nguyễn Văn An** (Xe `63A-123.45`, định mức 5 học viên) và đăng ký lên **3 học viên**.
3. Kiểm tra bảng trạng thái:
   - Đã lên: `3` học viên | **Số lượng còn lại khai giảng: `2` học viên**.
   - Ngày sớm nhất được lên tiếp 2 học viên còn lại (sau 3 tuần): **`2026-10-22`**.
   - Ngày quay đầu lại 5 học viên (sau 6 tuần): **`2026-11-12`**.
4. Tạo **Khóa K02 (Ngày `2026-10-10` — chưa đủ 3 tuần)** và thử lên tiếp 2 học viên cho Thầy An $\rightarrow$ Hệ thống chặn và thông báo phải đợi đủ 3 tuần (đến `2026-10-22`).
5. Tạo **Khóa K03 (Ngày `2026-10-22` — đã đủ 3 tuần)** và đăng ký cho Thầy An $\rightarrow$ Hệ thống cho phép lên tối đa đúng **2 học viên** còn lại.
6. Tạo **Khóa K04 (Ngày `2026-11-15` — đã qua 6 tuần kể từ `2026-10-01`)** $\rightarrow$ Hệ thống tự động hoàn lại (quay đầu) 3 học viên của đợt `2026-10-01` để Thầy An có thể khai giảng lại.

### Kịch bản 2: Kiểm tra Cảnh báo chưa có Hộ Kinh Doanh khi lên khóa
1. Vào mục **Giáo viên & Nhóm GV**, tạo một giáo viên (hoặc nhóm giáo viên) có trạng thái **Chưa có Hộ Kinh Doanh**.
2. Chuyển sang màn hình **Lên Khóa Khai Giảng**, chọn giáo viên đó $\rightarrow$ Hệ thống lập tức hiển thị hộp cảnh báo nổi bật: **"Cảnh báo: Giáo viên / Nhóm giáo viên chưa có Hộ Kinh Doanh!"**.

### Kịch bản 3: Kiểm tra Nhóm Giáo Viên bỏ qua 3 khóa khai giảng vào "Danh sách cần chú ý"
1. Tạo một Nhóm giáo viên (ví dụ: *Nhóm Thầy Phong*) và 3 ngày khai giảng liên tiếp mà nhóm này không có học viên nào lên khóa.
2. Mở mục **Danh sách cần chú ý** trên Dashboard $\rightarrow$ *Nhóm Thầy Phong* tự động xuất hiện với nhãn **"Đã bỏ qua 3 khóa khai giảng"** cùng danh sách 3 ngày khai giảng đã vắng.

### Kịch bản 4: Kiểm tra Tìm kiếm Biển Số Xe
1. Tại thanh **Tra cứu Biển số xe**, nhập `63A-123.45` (hoặc `12345`).
2. Hệ thống hiển thị ngay: Tên giáo viên (**Nguyễn Văn An**), Nhóm giáo viên, Biển số xe (`63A-123.45`), Số học viên còn lại, và bảng lịch sử các ngày đã khai giảng (`2026-10-01`: 3 HV, `2026-10-22`: 2 HV).

