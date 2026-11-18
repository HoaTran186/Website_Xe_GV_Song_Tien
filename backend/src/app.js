const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const { getDb } = require('./db/database');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Đảm bảo CSDL được khởi tạo
getDb();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Website Xe GV Sông Tiền API' });
});

app.use('/api', apiRoutes);

// Phục vụ giao diện React (frontend/dist) khi triển khai trên Render / Production
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Lỗi máy chủ nội bộ' });
});

module.exports = app;
