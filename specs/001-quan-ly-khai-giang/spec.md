# Feature Specification: Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền

**Feature Branch**: `001-quan-ly-khai-giang`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Quản lý nhóm giáo viên, giáo viên, xe và theo dõi định mức học viên lên khóa khai giảng (1 xe 1 giáo viên tối đa 5 học viên, chu kỳ chờ 3 tuần và quay đầu 6 tuần), cảnh báo Hộ Kinh Doanh khi lên khóa, đưa nhóm giáo viên bỏ qua 3 khóa khai giảng vào danh sách cần chú ý, và tra cứu biển số xe để biết tên giáo viên, xe và các ngày đã khai giảng."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quản lý Lên Khóa Khai Giảng & Tính Định Mức Học Viên (Priority: P1)

Nhân viên điều phối đào tạo cần chọn Nhóm giáo viên / Giáo viên (gắn với Xe) để đăng ký số lượng học viên lên khóa trong mỗi đợt (ngày) khai giảng, đồng thời biết chính xác số lượng học viên còn lại được phép khai giảng và thời điểm được phép lên khóa tiếp theo dựa trên quy tắc chu kỳ 3 tuần và 6 tuần.

**Why this priority**: Đây là nghiệp vụ cốt lõi nhất của hệ thống nhằm kiểm soát hạn mức học viên trên mỗi cặp Giáo viên - Xe và đảm bảo đúng quy định thời gian giản cách giữa các đợt khai giảng.

**Independent Test**: Có thể kiểm thử độc lập bằng cách tạo 1 Nhóm giáo viên, 1 Giáo viên gắn với 1 Xe (định mức 5 học viên), thực hiện lên khóa đợt 1 với 3 học viên và kiểm tra hệ thống tính toán số lượng còn lại cũng như ngày sớm nhất được phép lên khóa đợt tiếp theo (sau 3 tuần) và ngày quay đầu định mức (sau 6 tuần).

**Acceptance Scenarios**:

1. **Given** một giáo viên phụ trách 1 xe có định mức chuẩn là 5 học viên và chưa lên khóa nào, **When** người vận hành xem thông tin lên khóa của giáo viên/nhóm giáo viên đó, **Then** hệ thống hiển thị số lượng học viên tối đa có thể khai giảng là 5 học viên.
2. **Given** giáo viên (1 xe) đã lên khóa ở đợt trước (ví dụ đã lên 3 học viên), **When** chưa đủ 3 tuần kể từ ngày khai giảng trước đó mà người vận hành chọn giáo viên này để lên khóa tiếp, **Then** hệ thống thông báo giáo viên đang trong thời gian chờ 3 tuần và hiển thị ngày cụ thể được phép khai giảng tiếp theo.
3. **Given** giáo viên đã lên khóa và đã qua mốc 6 tuần kể từ đợt khai giảng đó, **When** hệ thống tính toán lại hạn mức cho kỳ khai giảng mới, **Then** phần chỉ tiêu của đợt khai giảng cách đó 6 tuần được quay đầu (hoàn lại định mức 5 học viên cho cặp 1 giáo viên - 1 xe) để khai giảng lại từ đầu.

---

### User Story 2 - Quản lý Nhóm Giáo Viên, Giáo Viên, Xe & Cảnh Báo Hộ Kinh Doanh (Priority: P1)

Người vận hành cần nhập danh sách Nhóm giáo viên, thêm Giáo viên thuộc Nhóm giáo viên, gán Xe (biển số xe) và cập nhật trạng thái Hộ Kinh Doanh cho từng Giáo viên / Nhóm giáo viên. Khi tiến hành lên khóa, hệ thống phải kiểm tra và cảnh báo nếu Giáo viên hoặc Nhóm giáo viên chưa có Hộ Kinh Doanh.

**Why this priority**: Dữ liệu Nhóm giáo viên, Giáo viên, Xe và trạng thái Hộ Kinh Doanh là dữ liệu nền tảng bắt buộc phải có trước khi thực hiện bất kỳ đợt lên khóa hay tra cứu nào.

**Independent Test**: Có thể kiểm thử độc lập bằng cách thêm mới một Nhóm giáo viên và một Giáo viên chưa tích chọn "Có Hộ Kinh Doanh", sau đó thực hiện thao tác lên khóa cho giáo viên này và xác nhận hệ thống phát thông báo cảnh báo "Giáo viên / Nhóm giáo viên chưa có Hộ Kinh Doanh".

**Acceptance Scenarios**:

1. **Given** người vận hành đang ở màn hình quản lý danh mục, **When** nhập tên giáo viên, chọn nhóm giáo viên trực thuộc, gán biển số xe và trạng thái Hộ Kinh Doanh, **Then** hệ thống lưu trữ thành công mối liên kết Nhóm giáo viên - Giáo viên - Xe - Hộ Kinh Doanh.
2. **Given** một giáo viên hoặc nhóm giáo viên đang có trạng thái "Chưa có Hộ Kinh Doanh", **When** người vận hành chọn giáo viên hoặc nhóm giáo viên đó để tiến hành lên khóa khai giảng, **Then** hệ thống lập tức hiển thị thông báo cảnh báo rõ ràng rằng giáo viên/nhóm giáo viên chưa có Hộ Kinh Doanh.

---

### User Story 3 - Tra Cứu Biển Số Xe & Lịch Sử Ngày Khai Giảng (Priority: P2)

Người vận hành cần nhập biển số xe vào ô tìm kiếm để tra cứu nhanh thông tin xe đó do giáo viên nào phụ trách (thuộc nhóm nào) và đã tham gia khai giảng vào những ngày nào (kèm số lượng học viên từng đợt).

**Why this priority**: Giúp nhân sự kiểm tra chéo thông tin phương tiện và lịch sử đào tạo tức thời khi làm hồ sơ hoặc kiểm tra tiến độ xe.

**Independent Test**: Có thể kiểm thử độc lập bằng cách nhập một biển số xe (hoặc một phần biển số) đã có dữ liệu lên khóa và kiểm tra kết quả trả về hiển thị đúng tên giáo viên, thông tin xe, nhóm giáo viên và danh sách các ngày đã khai giảng.

**Acceptance Scenarios**:

1. **Given** trong hệ thống đã có xe biển số `63A-123.45` gắn với giáo viên Nguyễn Văn A và đã lên khóa vào các ngày `2026-10-01` và `2026-10-22`, **When** người dùng nhập `63A-123.45` (hoặc `12345`) vào ô tìm kiếm biển số xe, **Then** hệ thống hiển thị tên giáo viên Nguyễn Văn A, nhóm giáo viên, thông tin xe `63A-123.45`, định mức hiện tại và danh sách đầy đủ các ngày đã khai giảng (`2026-10-01`, `2026-10-22`).
2. **Given** người dùng nhập một biển số xe chưa từng khai giảng đợt nào, **When** thực hiện tìm kiếm, **Then** hệ thống hiển thị tên giáo viên và xe tương ứng kèm trạng thái "Chưa có lịch sử khai giảng".

---

### User Story 4 - Theo Dõi Nhóm Giáo Viên Bỏ Qua 3 Khóa Khai Giảng (Danh Sách Cần Chú Ý) (Priority: P2)

Người quản lý cần hệ thống tự động phát hiện và liệt kê các Nhóm giáo viên đã bỏ qua 3 khóa khai giảng liên tiếp (tương ứng 3 ngày khai giảng của trung tâm) vào **Danh sách cần chú ý** để kịp thời đôn đốc và xử lý.

**Why this priority**: Giúp lãnh đạo trung tâm tự động giám sát hiệu suất tham gia lên khóa của các nhóm giáo viên mà không phải rà soát sổ sách thủ công qua từng đợt.

**Independent Test**: Có thể kiểm thử độc lập bằng cách tạo 3 đợt (ngày) khai giảng liên tiếp mà một Nhóm giáo viên không có học viên nào lên khóa, sau đó kiểm tra mục "Danh sách cần chú ý" xem nhóm giáo viên đó có tự động xuất hiện cùng số khóa đã bỏ qua hay không.

**Acceptance Scenarios**:

1. **Given** hệ thống đã diễn ra 3 khóa khai giảng (3 ngày khai giảng) liên tiếp mà Nhóm giáo viên X không tham gia lên khóa, **When** người dùng mở bảng theo dõi hoặc hoàn tất chốt khóa khai giảng thứ 3, **Then** Nhóm giáo viên X tự động được đưa vào **Danh sách cần chú ý** kèm thông tin 3 ngày khai giảng đã bỏ qua.
2. **Given** một Nhóm giáo viên chỉ mới bỏ qua 1 hoặc 2 khóa khai giảng, **When** xem Danh sách cần chú ý, **Then** nhóm đó chưa bị liệt kê vào danh sách vi phạm 3 khóa (có thể hiển thị số khóa đã vắng hiện tại để theo dõi sớm).

---

### User Story 5 - Website Quản Trị Dữ Liệu Toàn Diện Cho Admin (Full Admin CRUD) (Priority: P1)

Quản trị viên (Admin) cần một giao diện/website quản lý dữ liệu tập trung để có thể trực tiếp xem, thêm mới, chỉnh sửa (sửa mọi trường thông tin) và xóa bất kỳ bản ghi nào trong toàn bộ 5 bảng dữ liệu của hệ thống (Nhóm giáo viên, Giáo viên, Xe đào tạo, Khóa khai giảng, và Bản ghi lên khóa), cũng như khôi phục dữ liệu mẫu hoặc xuất dữ liệu.

**Why this priority**: Đảm bảo Admin có toàn quyền hiệu chỉnh dữ liệu thực tế ở tầng Backend/Database ngay trên giao diện web mà không cần can thiệp câu lệnh SQL thủ công.

**Independent Test**: Mở trang Quản Trị Dữ Liệu Admin, chọn bất kỳ bảng nào (Nhóm GV, Giáo viên & Xe, Khóa khai giảng, Lịch sử lên khóa), bấm "Sửa" để thay đổi tên, biển số, định mức, ngày khai giảng hoặc số lượng học viên, bấm "Lưu" và kiểm tra dữ liệu cập nhật tức thời trên toàn hệ thống.

**Acceptance Scenarios**:

1. **Given** Admin đang ở giao diện Quản trị dữ liệu, **When** Admin chọn sửa thông tin một Nhóm giáo viên, Giáo viên, Biển số xe, Ngày khai giảng hoặc Bản ghi số học viên lên khóa, **Then** hệ thống lưu thay đổi vào CSDL Backend và tự động tính toán lại toàn bộ định mức 3 tuần / 6 tuần cũng như Danh sách cần chú ý.
2. **Given** Admin muốn truy cập trang quản trị dữ liệu độc lập của Backend (`http://localhost:5000/admin`) hoặc phân hệ Admin trên ứng dụng React (`http://localhost:5173`), **When** thực hiện thêm/sửa/xóa dữ liệu, **Then** cả hai giao diện đều đồng bộ trên cùng một nguồn dữ liệu Backend.

---

### Edge Cases

- **Một giáo viên phụ trách nhiều xe hoặc đổi xe giữa các khóa**: Nếu thay đổi biển số xe của giáo viên, lịch sử các ngày khai giảng trước đó vẫn phải giữ nguyên biển số xe tại thời điểm khai giảng để đảm bảo tra cứu chính xác.
- **Nhập biển số xe với định dạng khác nhau**: Người dùng có thể nhập `63A-123.45`, `63A12345` hoặc `63a 123.45`; hệ thống cần chuẩn hóa chuỗi tìm kiếm để vẫn trả về đúng kết quả.
- **Giáo viên đăng ký số học viên vượt quá định mức còn lại**: Hệ thống phải ngăn chặn hoặc cảnh báo rõ số lượng tối đa được phép lên trong đợt đó.
- **Nhóm giáo viên mới thành lập**: Chỉ tính số khóa khai giảng bị bỏ qua kể từ ngày Nhóm giáo viên được tạo/kích hoạt trong hệ thống, không tính các khóa khai giảng trong quá khứ trước khi nhóm tồn tại.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI cho phép tạo, cập nhật, xóa và xem danh sách **Nhóm giáo viên** (bao gồm tên nhóm, trạng thái Hộ Kinh Doanh của nhóm, ghi chú).
- **FR-002**: Hệ thống PHẢI cho phép tạo, cập nhật, xóa và phân loại **Giáo viên** trực thuộc một **Nhóm giáo viên** cụ thể, kèm theo trạng thái **Hộ Kinh Doanh** của giáo viên đó.
- **FR-003**: Hệ thống PHẢI cho phép quản lý thông tin **Xe đào tạo** (biển số xe, loại xe/hạng xe) và gán cặp **1 Giáo viên - 1 Xe** với định mức chuẩn là **5 học viên**.
- **FR-004**: Hệ thống PHẢI cho phép tạo các **Khóa khai giảng (Ngày khai giảng)** và ghi nhận số lượng học viên lên khóa cho từng Giáo viên / Nhóm giáo viên trong đợt đó.
- **FR-005**: Hệ thống PHẢI tự động tính toán số lượng học viên còn lại được phép khai giảng của mỗi Giáo viên và Nhóm giáo viên theo quy tắc chu kỳ 3 tuần và 6 tuần:
  - Mỗi cặp **1 Giáo viên - 1 Xe** có tổng định mức tối đa là **5 học viên** trong một chu kỳ **6 tuần** (42 ngày).
  - Nếu ở khóa trước giáo viên đã lên `X` học viên (ví dụ: đã lên **3 học viên**), thì số lượng còn lại trong định mức là `5 - X` học viên (tức còn lại **2 học viên**).
  - Giáo viên phải chờ tối thiểu **3 tuần** (21 ngày) kể từ ngày khai giảng trước đó thì mới được phép đăng ký lên tiếp số học viên còn lại (`2 học viên`) trong đợt khai giảng kế tiếp.
  - Đủ **6 tuần** (42 ngày) kể từ ngày khai giảng của đợt đầu, chỉ tiêu học viên đã lên ở đợt đó sẽ được **quay đầu (hoàn lại định mức)** để giáo viên có thể khai giảng lại từ đầu.
- **FR-006**: Khi thực hiện lên khóa cho Giáo viên hoặc Nhóm giáo viên chưa có **Hộ Kinh Doanh**, hệ thống PHẢI tự động kiểm tra và hiển thị thông báo **Cảnh báo: "Giáo viên / Nhóm giáo viên chưa có Hộ Kinh Doanh"** ngay trên màn hình lên khóa (cho phép người điều phối xác nhận lưu kèm nhãn cảnh báo hoặc cập nhật bổ sung Hộ Kinh Doanh ngay).
- **FR-007**: Hệ thống PHẢI theo dõi các ngày khai giảng và tự động đưa Nhóm giáo viên bỏ qua **3 khóa khai giảng (3 ngày khai giảng) liên tiếp** (không có bất kỳ học viên nào của nhóm lên khóa trong 3 ngày khai giảng liên tiếp của trung tâm) vào **Danh sách cần chú ý**. Khi nhóm có học viên lên khóa trở lại ở đợt tiếp theo, bộ đếm số khóa bỏ qua liên tiếp tự động đặt lại về `0`.
- **FR-008**: Hệ thống PHẢI cung cấp chức năng **Tìm kiếm theo biển số xe** (hỗ trợ tìm kiếm gần đúng và bỏ qua dấu gạch/dấu chấm), trả về đầy đủ: Biển số xe, Tên giáo viên phụ trách, Nhóm giáo viên, Trạng thái Hộ Kinh Doanh, Số lượng học viên còn lại có thể lên khóa, và Danh sách toàn bộ các ngày đã khai giảng kèm số học viên từng ngày.
- **FR-009**: Hệ thống PHẢI hiển thị bảng tổng hợp theo **Nhóm giáo viên** trong mỗi đợt lên khóa để người điều phối nhìn thấy ngay: tổng định mức của nhóm, số lượng đã lên khóa, và số lượng còn lại có thể khai giảng của cả nhóm cũng như từng giáo viên trong nhóm.
- **FR-010**: Hệ thống PHẢI cung cấp giao diện **Quản Trị Dữ Liệu Admin (Admin Data Manager)** cho phép Admin trực tiếp Thêm, Sửa, Xóa toàn bộ dữ liệu gốc của cả 5 thực thể: Nhóm giáo viên, Giáo viên, Xe đào tạo (biển số, hạng xe, định mức), Khóa khai giảng (tên khóa, ngày khai giảng), và Bản ghi lên khóa (số lượng học viên, khóa học, giáo viên, ghi chú).
- **FR-011**: Hệ thống PHẢI tích hợp phân hệ **Quản Trị Dữ Liệu (Admin)** ngay trên cùng một trang của ứng dụng React (`http://localhost:5173`), đảm bảo Backend chỉ đóng vai trò REST API thuần túy (`http://localhost:5000/api`).
- **FR-012**: Hệ thống PHẢI cho phép **Nhập nhanh hàng loạt (Bulk Import)** Nhóm giáo viên, Giáo viên và Biển số xe từ file **Excel (`.xlsx`, `.xls`)**, **CSV (`.csv`)** hoặc **Copy-Paste trực tiếp từ bảng Excel**, kèm nút tải file Excel mẫu chuẩn.
- **FR-013**: Hệ thống PHẢI hỗ trợ nghiệp vụ **Mượn Giáo viên hoặc Mượn Xe liên nhóm** khi lên khóa khai giảng: nếu một Nhóm giáo viên có xe nhưng thiếu giáo viên (hoặc ngược lại), nhóm đó có thể mượn nhờ tên Giáo viên hoặc Xe của nhóm khác để ghép cặp lên khóa, đồng thời kiểm tra định mức 5 HV / chờ 3 tuần / quay đầu 6 tuần của cả Giáo viên và Xe được mượn, cũng như ghi nhận rõ lịch sử mượn liên nhóm.

### Key Entities *(include if feature involves data)*

- **Nhóm Giáo Viên (TeacherGroup)**: Đại diện cho một tổ/nhóm giáo viên; gồm Tên nhóm, Trạng thái Hộ Kinh Doanh của nhóm, Số khóa khai giảng liên tiếp đã bỏ qua, Trạng thái nằm trong "Danh sách cần chú ý".
- **Giáo Viên (Teacher)**: Thuộc về một Nhóm giáo viên; gồm Họ tên, Số điện thoại/Mã GV, Trạng thái Hộ Kinh Doanh cá nhân, Trạng thái hoạt động.
- **Xe Đào Tạo (Vehicle)**: Phương tiện gắn với giáo viên; gồm Biển số xe (chuẩn hóa và hiển thị), Hạng xe, Định mức học viên chuẩn trên cặp Giáo viên - Xe (mặc định 5 học viên).
- **Khóa / Ngày Khai Giảng (OpeningCourse / Session)**: Đại diện cho một đợt khai giảng của trung tâm; gồm Mã khóa/Tên khóa, Ngày khai giảng, Trạng thái khóa.
- **Bản Ghi Lên Khóa (CourseEnrollment / Allocation)**: Ghi nhận việc một Giáo viên (cùng Xe và Nhóm giáo viên) đăng ký số lượng học viên trong một Ngày khai giảng cụ thể; gồm Ngày khai giảng, Số lượng học viên lên khóa, Ngày đủ 3 tuần (mở khóa đợt kế tiếp), Ngày đủ 6 tuần (quay đầu định mức), và Ghi chú cảnh báo Hộ Kinh Doanh (nếu có tại thời điểm lên khóa).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người vận hành có thể tra cứu bất kỳ biển số xe nào và xem đầy đủ tên giáo viên, xe cùng toàn bộ lịch sử ngày khai giảng trong vòng dưới **2 giây**.
- **SC-002**: **100%** các trường hợp Giáo viên hoặc Nhóm giáo viên chưa có Hộ Kinh Doanh đều được hệ thống phát hiện và hiển thị cảnh báo ngay trên màn hình khi thao tác lên khóa.
- **SC-003**: **100%** các Nhóm giáo viên vắng mặt đủ 3 ngày khai giảng liên tiếp đều được tự động tổng hợp chính xác vào "Danh sách cần chú ý" mà không cần tính toán thủ công.
- **SC-004**: Giảm tối thiểu **80%** thời gian nhân viên điều phối phải cộng sổ tay để tính số lượng học viên còn lại được phép khai giảng và kiểm tra hạn chờ 3 tuần / quay đầu 6 tuần của từng giáo viên.

## Assumptions

- Mỗi cặp **1 Giáo viên - 1 Xe** có định mức cơ sở mặc định là **5 học viên** (hệ thống cho phép giữ mặc định là 5 và có thể chỉnh sửa cấu hình nếu cần mở rộng sau này).
- Khoảng thời gian **3 tuần** được tính bằng **21 ngày** và **6 tuần** được tính bằng **42 ngày** kể từ ngày khai giảng của đợt tương ứng.
- Hệ thống phục vụ cho nhân sự điều phối/quản lý nội bộ của trung tâm **Xe GV Sông Tiền** trên trình duyệt web máy tính và máy tính bảng.

