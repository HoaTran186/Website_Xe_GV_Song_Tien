const { getDb } = require('../db/database');
const {
  hashPassword,
  verifyPassword,
  findUserByUsername,
  findUserById,
  createSession,
  deleteSession,
} = require('../services/authService');

function login(req, res) {
  try {
    const { username, password } = req.body;
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập Tên đăng nhập và Mật khẩu.' });
    }

    const user = findUserByUsername(cleanUsername);
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const isValid = verifyPassword(cleanPassword, user.password_hash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const token = createSession(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập.' });
  }
  res.json({ user: req.user });
}

function logout(req, res) {
  try {
    if (req.token) {
      deleteSession(req.token);
    }
    res.json({ message: 'Đăng xuất thành công.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ================= ADMIN USER MANAGEMENT =================
function listUsers(req, res) {
  try {
    const db = getDb();
    const users = db
      .prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY id ASC')
      .all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function createUser(req, res) {
  try {
    const db = getDb();
    const { username, password, full_name, role } = req.body;

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanFullName = String(full_name || '').trim();
    const cleanPassword = String(password || '').trim();
    const targetRole = role === 'admin' ? 'admin' : 'user';

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 4 ký tự.' });
    }
    if (!cleanFullName || cleanFullName.length < 2) {
      return res.status(400).json({ error: 'Họ tên người dùng phải có ít nhất 2 ký tự.' });
    }

    const existing = findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: `Tên đăng nhập "${cleanUsername}" đã tồn tại.` });
    }

    const { hash, salt } = hashPassword(cleanPassword);
    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, salt, full_name, role)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(cleanUsername, hash, salt, cleanFullName, targetRole);

    const created = findUserById(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function updateUser(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { full_name, role, password } = req.body;

    const existing = findUserById(Number(id));
    if (!existing) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
    }

    const targetFullName = full_name ? String(full_name).trim() : existing.full_name;
    const targetRole = role ? (role === 'admin' ? 'admin' : 'user') : existing.role;

    if (password && String(password).trim().length >= 4) {
      const { hash, salt } = hashPassword(String(password).trim());
      db.prepare(
        `UPDATE users
         SET full_name = ?, role = ?, password_hash = ?, salt = ?
         WHERE id = ?`
      ).run(targetFullName, targetRole, hash, salt, Number(id));
    } else {
      db.prepare(
        `UPDATE users
         SET full_name = ?, role = ?
         WHERE id = ?`
      ).run(targetFullName, targetRole, Number(id));
    }

    const updated = findUserById(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteUser(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình.' });
    }

    const existing = findUserById(Number(id));
    if (!existing) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(Number(id));
    res.json({ message: `Đã xóa tài khoản "${existing.username}".` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  login,
  getMe,
  logout,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
