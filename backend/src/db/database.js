const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'song_tien.db');

let dbInstance = null;

function normalizePlate(plate) {
  if (!plate) return '';
  return String(plate).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Nâng cấp cấu trúc bảng an toàn (Zero Data Loss Migration)
 * Cho phép:
 * 1) Bảng vehicles có thêm cột group_id và cho phép teacher_id = NULL (nhóm có xe nhưng thiếu giáo viên)
 * 2) Bảng course_allocations có thêm cột allocating_group_id, is_borrowed, borrow_note (mượn giáo viên hoặc mượn xe nhóm khác)
 */
function runSafeMigrations(db) {
  // Kiểm tra bảng vehicles
  const vehicleCols = db.prepare("PRAGMA table_info('vehicles')").all();
  if (vehicleCols.length > 0) {
    const hasGroupId = vehicleCols.some((c) => c.name === 'group_id');
    const teacherCol = vehicleCols.find((c) => c.name === 'teacher_id');
    const teacherNotNull = teacherCol && teacherCol.notnull === 1;

    if (!hasGroupId || teacherNotNull) {
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec(`
          CREATE TABLE vehicles_new (
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
        `);

        if (hasGroupId) {
          db.exec(`
            INSERT INTO vehicles_new (id, group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota, created_at)
            SELECT v.id, COALESCE(v.group_id, t.group_id), v.teacher_id, v.license_plate, v.normalized_plate, v.vehicle_class, v.max_quota, v.created_at
            FROM vehicles v
            LEFT JOIN teachers t ON t.id = v.teacher_id;
          `);
        } else {
          db.exec(`
            INSERT INTO vehicles_new (id, group_id, teacher_id, license_plate, normalized_plate, vehicle_class, max_quota, created_at)
            SELECT v.id, t.group_id, v.teacher_id, v.license_plate, v.normalized_plate, v.vehicle_class, v.max_quota, v.created_at
            FROM vehicles v
            LEFT JOIN teachers t ON t.id = v.teacher_id;
          `);
        }

        db.exec('DROP TABLE vehicles;');
        db.exec('ALTER TABLE vehicles_new RENAME TO vehicles;');
        db.exec('CREATE INDEX IF NOT EXISTS idx_vehicles_normalized_plate ON vehicles(normalized_plate);');
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      } finally {
        db.exec('PRAGMA foreign_keys = ON;');
      }
    }
  }

  // Kiểm tra bảng opening_courses
  const courseCols = db.prepare("PRAGMA table_info('opening_courses')").all();
  if (courseCols.length > 0) {
    const cNames = new Set(courseCols.map((c) => c.name));
    if (!cNames.has('closing_date')) {
      db.exec("ALTER TABLE opening_courses ADD COLUMN closing_date TEXT DEFAULT '';");
    }
  }

  // Kiểm tra bảng course_allocations
  const allocCols = db.prepare("PRAGMA table_info('course_allocations')").all();
  if (allocCols.length > 0) {
    const colNames = new Set(allocCols.map((c) => c.name));
    if (!colNames.has('closing_date')) {
      db.exec("ALTER TABLE course_allocations ADD COLUMN closing_date TEXT DEFAULT '';");
    }
    if (!colNames.has('allocating_group_id')) {
      db.exec('ALTER TABLE course_allocations ADD COLUMN allocating_group_id INTEGER;');
      db.exec(`
        UPDATE course_allocations
        SET allocating_group_id = (
          SELECT t.group_id FROM teachers t WHERE t.id = course_allocations.teacher_id
        )
        WHERE allocating_group_id IS NULL;
      `);
    }
    if (!colNames.has('is_borrowed')) {
      db.exec('ALTER TABLE course_allocations ADD COLUMN is_borrowed INTEGER NOT NULL DEFAULT 0;');
    }
    if (!colNames.has('borrow_note')) {
      db.exec("ALTER TABLE course_allocations ADD COLUMN borrow_note TEXT DEFAULT '';");
    }
  }

  // Đảm bảo có bảng users và user_sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE CHECK(length(trim(username)) >= 3),
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL CHECK(length(trim(full_name)) >= 2),
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    const { seedDefaultUsers } = require('../services/authService');
    seedDefaultUsers(db);
  } catch (err) {
    console.error('Error seeding default users:', err);
  }
}

function getDb(customPath) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || process.env.DB_PATH || DEFAULT_DB_PATH;
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  runSafeMigrations(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function resetDbForTesting(db) {
  dbInstance = db;
}

module.exports = {
  getDb,
  resetDbForTesting,
  normalizePlate,
  DEFAULT_DB_PATH,
};
