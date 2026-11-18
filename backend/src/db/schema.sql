PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teacher_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) BETWEEN 2 AND 100),
    has_business_household INTEGER NOT NULL DEFAULT 0 CHECK(has_business_household IN (0, 1)),
    business_household_info TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    full_name TEXT NOT NULL CHECK(length(trim(full_name)) BETWEEN 2 AND 100),
    phone TEXT DEFAULT '',
    has_business_household INTEGER NOT NULL DEFAULT 0 CHECK(has_business_household IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (group_id) REFERENCES teacher_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    teacher_id INTEGER UNIQUE,
    license_plate TEXT NOT NULL UNIQUE,
    normalized_plate TEXT NOT NULL,
    vehicle_class TEXT NOT NULL DEFAULT 'B2',
    max_quota INTEGER NOT NULL DEFAULT 5 CHECK(max_quota >= 1),
    created_at TEXT NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (group_id) REFERENCES teacher_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_normalized_plate ON vehicles(normalized_plate);

CREATE TABLE IF NOT EXISTS opening_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    opening_date TEXT NOT NULL UNIQUE,
    closing_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS course_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    allocating_group_id INTEGER,
    teacher_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    student_count INTEGER NOT NULL CHECK(student_count >= 1),
    closing_date TEXT DEFAULT '',
    next_eligible_date TEXT NOT NULL,
    turnaround_date TEXT NOT NULL,
    had_business_household_warning INTEGER NOT NULL DEFAULT 0 CHECK(had_business_household_warning IN (0, 1)),
    is_borrowed INTEGER NOT NULL DEFAULT 0 CHECK(is_borrowed IN (0, 1)),
    borrow_note TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (course_id) REFERENCES opening_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (allocating_group_id) REFERENCES teacher_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
