# REST API Contracts: Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền

**Base URL**: `http://localhost:5000/api`  
**Content-Type**: `application/json`

---

## 1. Quản lý Nhóm Giáo Viên (`/api/groups`)

### `GET /api/groups`
Lấy danh sách tất cả Nhóm giáo viên kèm thống kê số lượng giáo viên, tổng định mức, số học viên còn lại và trạng thái "Danh sách cần chú ý" (bỏ qua 3 khóa).

**Query Params**:
- `referenceDate` *(optional, YYYY-MM-DD)*: Ngày dùng để tính hạn mức (mặc định: ngày hôm nay hoặc ngày của khóa khai giảng đang chọn).

**Response `200 OK`**:
```json
[
  {
    "id": 1,
    "name": "Nhóm Thầy Minh - Sông Tiền 1",
    "has_business_household": true,
    "business_household_info": "HKD-ST-001",
    "teacher_count": 3,
    "total_max_quota": 15,
    "total_used_quota": 8,
    "total_remaining_quota": 7,
    "consecutive_missed_courses": 0,
    "needs_attention": false,
    "missed_course_dates": []
  }
]
```

### `POST /api/groups`
Tạo mới Nhóm giáo viên.
- **Request Body**:
  ```json
  {
    "name": "Nhóm Thầy Hùng",
    "has_business_household": false,
    "business_household_info": "",
    "notes": ""
  }
  ```

### `PUT /api/groups/:id` & `DELETE /api/groups/:id`
Cập nhật hoặc xóa Nhóm giáo viên.

---

## 2. Quản lý Giáo Viên & Xe (`/api/teachers` & `/api/vehicles`)

### `GET /api/teachers`
Lấy danh sách Giáo viên kèm Nhóm giáo viên, Xe phụ trách và trạng thái định mức hiện tại (đã lên bao nhiêu, còn lại bao nhiêu, ngày đủ 3 tuần được lên tiếp, ngày đủ 6 tuần quay đầu).

**Query Params**:
- `groupId` *(optional)*: Lọc theo Nhóm giáo viên.
- `referenceDate` *(optional, YYYY-MM-DD)*: Ngày xét khai giảng để tính toán chính xác điều kiện 3 tuần / 6 tuần.

**Response `200 OK`**:
```json
[
  {
    "id": 10,
    "full_name": "Nguyễn Văn An",
    "phone": "0909123456",
    "group_id": 1,
    "group_name": "Nhóm Thầy Minh - Sông Tiền 1",
    "has_business_household": true,
    "group_has_business_household": true,
    "business_household_warning": false,
    "vehicle": {
      "id": 5,
      "license_plate": "63A-123.45",
      "vehicle_class": "B2",
      "max_quota": 5
    },
    "quota_status": {
      "max_quota": 5,
      "used_quota": 3,
      "remaining_quota": 2,
      "last_opening_date": "2026-11-01",
      "next_eligible_date": "2026-11-22",
      "turnaround_date": "2026-12-13",
      "can_enroll_on_reference_date": false,
      "status_message": "Đã lên 3 HV (ngày 2026-11-01). Còn lại 2 HV, được phép lên tiếp từ ngày 2026-11-22 (sau 3 tuần). Quay đầu 5 HV vào 2026-12-13 (sau 6 tuần)."
    }
  }
]
```

### `POST /api/teachers`
Thêm mới Giáo viên thuộc Nhóm giáo viên (hỗ trợ nhập kèm biển số xe của giáo viên đó ngay trong 1 lần tạo).
- **Request Body**:
  ```json
  {
    "group_id": 1,
    "full_name": "Trần Văn Bình",
    "phone": "0912345678",
    "has_business_household": false,
    "license_plate": "63A-567.89",
    "vehicle_class": "B2",
    "max_quota": 5
  }
  ```

---

## 3. Tra cứu Biển Số Xe (`/api/vehicles/search`)

### `GET /api/vehicles/search?plate=63A-123.45`
Tra cứu biển số xe, trả về tên giáo viên, nhóm giáo viên, thông tin xe, định mức còn lại và toàn bộ lịch sử các ngày đã khai giảng.

**Response `200 OK`**:
```json
{
  "query": "63A-123.45",
  "results": [
    {
      "vehicle_id": 5,
      "license_plate": "63A-123.45",
      "vehicle_class": "B2",
      "max_quota": 5,
      "teacher": {
        "id": 10,
        "full_name": "Nguyễn Văn An",
        "phone": "0909123456",
        "has_business_household": true
      },
      "group": {
        "id": 1,
        "name": "Nhóm Thầy Minh - Sông Tiền 1",
        "has_business_household": true
      },
      "quota_status": {
        "used_quota": 3,
        "remaining_quota": 2,
        "next_eligible_date": "2026-11-22",
        "turnaround_date": "2026-12-13"
      },
      "opening_history": [
        {
          "allocation_id": 101,
          "course_id": 2,
          "course_name": "Khóa K12",
          "opening_date": "2026-11-01",
          "student_count": 3,
          "next_eligible_date": "2026-11-22",
          "turnaround_date": "2026-12-13",
          "is_active_in_6w_cycle": true
        }
      ]
    }
  ]
}
```

---

## 4. Quản lý Khóa Khai Giảng & Lên Khóa (`/api/courses` & `/api/allocations`)

### `GET /api/courses`
Lấy danh sách các Khóa (Ngày) khai giảng kèm tổng số học viên và số nhóm tham gia.

### `POST /api/courses`
Tạo đợt (ngày) khai giảng mới.
- **Request Body**:
  ```json
  {
    "course_name": "Khóa K13 - Tháng 11",
    "opening_date": "2026-11-22",
    "notes": ""
  }
  ```

### `POST /api/allocations`
Đăng ký lên khóa cho một Giáo viên trong một Ngày khai giảng cụ thể.
- **Request Body**:
  ```json
  {
    "course_id": 3,
    "teacher_id": 10,
    "student_count": 2,
    "confirm_without_business_household": true,
    "notes": "Lên tiếp 2 HV còn lại sau 3 tuần"
  }
  ```
- **Validation & Business Logic**:
  1. Kiểm tra `student_count <= remaining_quota` tại ngày `opening_date` của khóa. Nếu vượt quá, trả về `400 Bad Request` kèm thông báo số lượng tối đa còn lại.
  2. Kiểm tra điều kiện **3 tuần (21 ngày)**: Nếu giáo viên có đợt lên khóa trước đó trong chu kỳ 6 tuần mà `opening_date < last_opening_date + 21 ngày`, trả về `400 Bad Request` kèm thông báo: *"Giáo viên mới lên khóa ngày {last_opening_date}, phải cách 3 tuần (đến ngày {next_eligible_date}) mới có thể khai giảng tiếp {remaining_quota} học viên còn lại."*
  3. Kiểm tra **Hộ Kinh Doanh**: Nếu Giáo viên hoặc Nhóm giáo viên chưa có Hộ Kinh Doanh và `confirm_without_business_household !== true`, trả về `409 Conflict` (hoặc cảnh báo trên UI trước khi gửi) với thông điệp: *"Cảnh báo: Giáo viên hoặc Nhóm giáo viên chưa có Hộ Kinh Doanh!"* để người dùng xác nhận.

---

## 5. Danh Sách Cần Chú Ý (`/api/dashboard/attention-groups`)

### `GET /api/dashboard/attention-groups`
Trả về danh sách các Nhóm giáo viên đã bỏ qua $\ge 3$ khóa khai giảng (3 ngày khai giảng) liên tiếp.

**Response `200 OK`**:
```json
{
  "total_courses": 4,
  "attention_groups": [
    {
      "group_id": 2,
      "group_name": "Nhóm Thầy Phong",
      "has_business_household": false,
      "consecutive_missed_courses": 3,
      "missed_courses": [
        { "course_name": "Khóa K11", "opening_date": "2026-10-15" },
        { "course_name": "Khóa K12", "opening_date": "2026-11-01" },
        { "course_name": "Khóa K13", "opening_date": "2026-11-22" }
      ],
      "last_participated_date": "2026-09-20"
    }
  ]
}
```

