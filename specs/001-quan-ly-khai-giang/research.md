# Phase 0 Research: Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền

**Feature**: `001-quan-ly-khai-giang`  
**Date**: 2026-11-16

## 1. Lựa chọn Công nghệ Backend (Node.js)

- **Decision**: Sử dụng **Node.js (ESM/CommonJS) + Express.js** kết hợp với **SQLite (`better-sqlite3` hoặc `sqlite3`)** cho cơ sở dữ liệu quan hệ cục bộ (dễ dàng nâng cấp sang PostgreSQL/MySQL khi triển khai cloud).
- **Rationale**:
  - Đáp ứng trực tiếp yêu cầu sử dụng **Node.js** của người dùng và Nguyên tắc I trong `constitution.md`.
  - `Express.js` gọn nhẹ, chuẩn hóa RESTful JSON API nhanh chóng cho các tác vụ CRUD Nhóm giáo viên, Giáo viên, Xe, Khóa khai giảng và tính toán định mức.
  - `SQLite` lưu trữ thành file `.db` ngay trong thư mục `backend/data/`, không yêu cầu cài đặt database server rời phức tạp trên máy Windows của người dùng nhưng vẫn đảm bảo đầy đủ ràng buộc khóa ngoại (Foreign Keys), Transaction và truy vấn SQL nhanh dưới 10ms.
- **Alternatives considered**:
  - *MongoDB*: Bị loại vì dữ liệu Nhóm giáo viên - Giáo viên - Xe - Khóa khai giảng có tính quan hệ chặt chẽ và cần tổng hợp (JOIN/GROUP BY) chính xác theo từng đợt.
  - *NestJS*: Quá nặng (boilerplate lớn) so với quy mô ứng dụng quản lý điều phối nội bộ (vi phạm nguyên tắc YAGNI trong Constitution).

## 2. Lựa chọn Công nghệ Frontend (React)

- **Decision**: Sử dụng **React 18 + Vite** kèm **Tailwind CSS** (hoặc CSS Modules chuẩn hóa) và `lucide-react` cho biểu tượng cảnh báo.
- **Rationale**:
  - Khởi chạy cực nhanh với Vite, hỗ trợ giao diện SPA mượt mà trên trình duyệt.
  - Dễ dàng xây dựng các bảng dữ liệu trực quan, thẻ cảnh báo màu vàng/đỏ cho trạng thái **Chưa có Hộ Kinh Doanh** và bảng **Danh sách cần chú ý (Bỏ qua 3 khóa khai giảng)**.
- **Alternatives considered**:
  - *Next.js SSR*: Không cần thiết vì đây là hệ thống quản trị nội bộ (Internal Dashboard), không cần SEO công khai; tách `frontend/` (React Vite) và `backend/` (Node.js Express) giúp cấu trúc dự án rõ ràng, dễ hiểu nhất.

## 3. Thuật toán Tính Định Mức 5 Học Viên, Chờ 3 Tuần & Quay Đầu 6 Tuần

- **Decision**: Tính toán động dựa trên các bản ghi lên khóa (`course_allocations`) trong cửa sổ **6 tuần (42 ngày)** tính đến ngày khai giảng đang xét `T_target`:
  1. **Định mức cơ sở (`max_quota`)**: Mỗi cặp `1 Giáo viên - 1 Xe` có `max_quota = 5` học viên.
  2. **Quay đầu 6 tuần (42 ngày)**: Mọi bản ghi lên khóa có ngày khai giảng `T_prev <= T_target - 42 ngày` được xem là **đã hoàn thành chu kỳ 6 tuần (đã quay đầu)** và không còn chiếm chỉ tiêu hiện tại.
  3. **Số lượng đã lên trong chu kỳ 6 tuần hiện hành (`used_quota`)**: Tổng `student_count` của các bản ghi lên khóa trong khoảng `(T_target - 42 ngày, T_target]`.
  4. **Số lượng học viên còn lại được phép khai giảng (`remaining_quota`)**:
     $$\text{remaining\_quota} = \max(0, 5 - \text{used\_quota})$$
     *(Ví dụ: Khóa trước tại `T_0` thầy đã lên `3` học viên $\Rightarrow$ `remaining_quota = 5 - 3 = 2` học viên).*
  5. **Điều kiện giản cách 3 tuần (21 ngày)**:
     - Nếu giáo viên đã có đợt lên khóa gần nhất tại `T_last` (với `T_target - 42 ngày < T_last <= T_target`), thì ngày sớm nhất được phép lên tiếp phần chỉ tiêu còn lại (`2` học viên) là:
       $$T_{\text{next\_allowed}} = T_{\text{last}} + 21 \text{ ngày (3 tuần)}$$
     - Nếu `T_target < T_last + 21 ngày`: Trạng thái là **"Đang chờ đủ 3 tuần"** (hiển thị rõ `remaining_quota = 2`, nhưng chỉ được lên khóa từ ngày `T_last + 21 ngày`).
     - Nếu `T_target >= T_last + 21 ngày` và `remaining_quota > 0`: Trạng thái là **"Đủ điều kiện lên tiếp"** (được phép đăng ký tối đa `remaining_quota = 2` học viên).
     - Ngày quay đầu toàn bộ chỉ tiêu của đợt `T_last` là `T_turnaround = T_last + 42 ngày (6 tuần)`.
- **Rationale**: Phản ánh chính xác 100% quy tắc thực tế người dùng đã xác nhận: *"nếu thầy đó đã lên 3 hv rồi thì còn lại 2 hv nữa, nếu có ngày khai giảng sau 3 tuần thì thầy sẽ được lên thêm 2 hv nữa; và mỗi 6 tuần sẽ quay đầu lại khai giảng lại 1 lần nữa"*.

## 4. Thuật toán Phát hiện Nhóm Giáo Viên Bỏ Qua 3 Khóa Khai Giảng Liên Tiếp

- **Decision**:
  - Xét danh sách các **Khóa khai giảng (`opening_courses`)** của trung tâm được sắp xếp theo thứ tự thời gian `opening_date ASC`.
  - Với mỗi Nhóm giáo viên (chỉ tính các khóa khai giảng có `opening_date >= ngày tạo nhóm`):
    - Một nhóm được tính là **Tham gia** trong khóa `K` nếu tổng số học viên lên khóa của tất cả giáo viên thuộc nhóm trong khóa `K` lớn hơn `0` (`SUM(student_count) > 0`).
    - Ngược lại (`SUM(student_count) == 0`), nhóm bị tính là **Bỏ qua** khóa `K`.
    - Đếm số khóa bị bỏ qua liên tiếp tính từ khóa khai giảng gần nhất trở về trước (`consecutive_missed_courses`).
    - Nếu `consecutive_missed_courses >= 3`: Đánh dấu `is_attention_needed = true` và đưa vào **Danh sách cần chú ý** kèm danh sách 3 ngày khai giảng đã bỏ qua.
- **Rationale**: Tự động, minh bạch, không phụ thuộc thao tác nhập tay, tự động cập nhật ngay khi thêm khóa khai giảng hoặc phân bổ học viên.

## 5. Chuẩn hóa Tìm kiếm Biển Số Xe

- **Decision**: Lưu cả biển số hiển thị (`license_plate`, ví dụ `63A-123.45`) và biển số chuẩn hóa (`normalized_plate`, viết hoa và loại bỏ mọi ký tự ngoài chữ/số: `63A12345`). Khi tìm kiếm, chuẩn hóa từ khóa người dùng nhập để so khớp `LIKE '%keyword%'` trên cả 2 cột.
- **Rationale**: Đảm bảo nhân viên gõ `63A-123.45`, `63a12345` hay `123.45` đều tìm ra ngay tên giáo viên, xe và lịch sử các ngày đã khai giảng.

