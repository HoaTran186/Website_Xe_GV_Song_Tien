const { getUserByToken } = require('../services/authService');

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.headers['x-auth-token'] || null;
}

function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = getUserByToken(token);
    req.user = user;
    req.token = token;
  } catch (err) {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  authenticate(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập.' });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Truy cập bị từ chối: Bạn không có quyền Quản Trị Viên (Admin) để thực hiện thao tác này.',
      });
    }
    next();
  });
}

module.exports = {
  extractToken,
  authenticate,
  requireAuth,
  requireAdmin,
};
