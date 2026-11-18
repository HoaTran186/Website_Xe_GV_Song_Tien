const crypto = require('node:crypto');
const { getDb } = require('../db/database');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch (_) {
    return false;
  }
}

function findUserByUsername(username) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase());
}

function findUserById(id) {
  const db = getDb();
  return db.prepare('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?').get(id);
}

function createSession(userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO user_sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

function deleteSession(token) {
  const db = getDb();
  db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
}

function getUserByToken(token) {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.full_name, u.role, u.created_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);
  return row || null;
}

function seedDefaultUsers(db) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCount || userCount.count === 0) {
    const adminPass = hashPassword('admin123');
    db.prepare(
      `INSERT INTO users (username, password_hash, salt, full_name, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run('admin', adminPass.hash, adminPass.salt, 'Quản Trị Viên Sông Tiền', 'admin');

    const userPass = hashPassword('user123');
    db.prepare(
      `INSERT INTO users (username, password_hash, salt, full_name, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run('user1', userPass.hash, userPass.salt, 'Cán Bộ Nghiệp Vụ', 'user');
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  findUserByUsername,
  findUserById,
  createSession,
  deleteSession,
  getUserByToken,
  seedDefaultUsers,
};
