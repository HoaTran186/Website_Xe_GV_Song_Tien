<!--
Sync Impact Report
- Version change: N/A (template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Kiến trúc Tách biệt Frontend & Backend (React + Node.js)
  - [PRINCIPLE_2_NAME] → II. Tính Toàn vẹn Nghiệp vụ Đào tạo & Khai giảng (Domain Integrity)
  - [PRINCIPLE_3_NAME] → III. Kiểm tra Quy điều kiện & Cảnh báo Tự động (Validation & Alerting)
  - [PRINCIPLE_4_NAME] → IV. Truy xuất & Tra cứu Tức thời (Fast Lookup & Traceability)
  - [PRINCIPLE_5_NAME] → V. Giao diện Tiếng Việt Trực quan & Đơn giản (Simplicity & UX)
- Added sections:
  - Ràng buộc Công nghệ & Hạ tầng (Technology Stack Constraints)
  - Quy trình Phát triển & Cổng Chất lượng (Development Workflow & Quality Gates)
- Removed sections: None
- Follow-up TODOs: None
-->
# Website Quản Lý Xe & Giáo Viên Sông Tiền Constitution

## Core Principles

### I. Kiến trúc Tách biệt Frontend & Backend (React + Node.js)
Hệ thống PHẢI được xây dựng theo kiến trúc tách biệt rõ ràng giữa giao diện người dùng (Frontend sử dụng React) và dịch vụ xử lý nghiệp vụ (Backend sử dụng Node.js). Mọi giao tiếp dữ liệu giữa React và Node.js PHẢI thông qua RESTful API với định dạng JSON chuẩn hóa. Không được nhúng trực tiếp logic tính toán định mức khóa học phức tạp ở tầng giao diện mà không có xác thực từ phía Backend.

### II. Tính Toàn vẹn Nghiệp vụ Đào tạo & Khai giảng (Domain Integrity)
Mọi quy tắc tính toán chỉ tiêu học viên theo tỷ lệ Giáo viên - Xe (mặc định 1 giáo viên + 1 xe tối đa 5 học viên), chu kỳ chờ giữa các đợt lên khóa (3 tuần) và chu kỳ quay đầu khai giảng (6 tuần) PHẢI được kiểm soát tập trung tại tầng Domain/Service của Backend. Lịch sử mỗi đợt khai giảng (ngày khai giảng, số lượng học viên đã lên, số lượng còn lại) PHẢI được lưu trữ đầy đủ để đảm bảo khả năng đối soát bất cứ lúc nào.

### III. Kiểm tra Quy điều kiện & Cảnh báo Tự động (Validation & Alerting)
Hệ thống PHẢI tự động kiểm tra các điều kiện bắt buộc và phát sinh cảnh báo rõ ràng cho người vận hành:
- PHẢI kiểm tra trạng thái **Hộ Kinh Doanh** của Giáo viên và Nhóm giáo viên khi thực hiện lên khóa; nếu chưa có Hộ Kinh Doanh, hệ thống PHẢI hiển thị cảnh báo rõ ràng khi lên khóa.
- PHẢI tự động theo dõi số khóa (ngày khai giảng) liên tiếp mà một Nhóm giáo viên bỏ qua; nếu bỏ qua đủ 3 khóa khai giảng (3 ngày khai giảng), nhóm đó PHẢI được đưa vào **Danh sách cần chú ý**.

### IV. Truy xuất & Tra cứu Tức thời (Fast Lookup & Traceability)
Mọi thực thể cốt lõi (Nhóm giáo viên, Giáo viên, Xe/Biển số xe, Đợt khai giảng) PHẢI được liên kết chặt chẽ. Khi người dùng tra cứu theo **Biển số xe**, hệ thống PHẢI trả về đầy đủ và chính xác: thông tin xe, tên giáo viên phụ trách (cùng nhóm giáo viên), và toàn bộ lịch sử các ngày đã khai giảng của giáo viên/xe đó.

### V. Giao diện Tiếng Việt Trực quan & Đơn giản (Simplicity & UX)
Toàn bộ nhãn hiển thị, thông báo lỗi, cảnh báo Hộ Kinh Doanh và danh sách cần chú ý trên giao diện React PHẢI sử dụng tiếng Việt rõ ràng, dễ hiểu đối với nhân sự điều phối đào tạo. Ưu tiên thiết kế gọn nhẹ (YAGNI), tập trung giải quyết chính xác bài toán quản lý lên khóa, tra cứu biển số và theo dõi nhóm giáo viên.

## Ràng buộc Công nghệ & Hạ tầng (Technology Stack Constraints)

- **Frontend**: React (Vite), quản lý trạng thái và gọi API bất đồng bộ chuẩn xác, giao diện bảng biểu và bộ lọc tra cứu nhanh.
- **Backend**: Node.js (Express/Fastify), kiến trúc phân tầng rõ ràng (`routes` → `controllers` → `services` → `models/repositories`).
- **Cơ sở dữ liệu**: Cơ sở dữ liệu quan hệ (SQLite/PostgreSQL/MySQL) đảm bảo tính toàn vẹn khóa ngoại giữa Nhóm Giáo Viên, Giáo Viên, Xe và Lịch Sử Khai Giảng.
- **Xử lý thời gian**: Mọi tính toán chu kỳ 3 tuần và 6 tuần PHẢI sử dụng múi giờ chuẩn Việt Nam (`Asia/Ho_Chi_Minh` / UTC+7) và lưu trữ định dạng ngày ISO `YYYY-MM-DD`.

## Quy trình Phát triển & Cổng Chất lượng (Development Workflow & Quality Gates)

1. **Tuân thủ Spec-Driven Development**: Mọi tính năng mới hoặc thay đổi quy tắc tính chỉ tiêu học viên PHẢI được cập nhật tại `spec.md` và `plan.md` trước khi triển khai code.
2. **Kiểm thử Nghiệp vụ Cốt lõi**: Các công thức tính số lượng học viên còn lại được phép khai giảng, chu kỳ 3 tuần/6 tuần, và điều kiện đưa vào danh sách cần chú ý (bỏ qua 3 khóa) PHẢI có kịch bản kiểm thử tự động hoặc kịch bản nghiệm thu rõ ràng.
3. **Đối chiếu Constitution**: Mọi kế hoạch kỹ thuật (`plan.md`) và danh sách công việc (`tasks.md`) PHẢI vượt qua bước kiểm tra tương thích với bản Constitution này.

## Governance

Bản Constitution này là quy chuẩn cao nhất của dự án **Website Xe GV Sông Tiền**. Mọi thay đổi về công nghệ nền tảng (Node.js, React) hoặc quy tắc nghiệp vụ cốt lõi đều phải được cập nhật vào tài liệu này kèm theo lý do và nâng phiên bản theo chuẩn Semantic Versioning (`MAJOR.MINOR.PATCH`).

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
