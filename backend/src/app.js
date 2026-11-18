const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const { getDb } = require('./db/database');

const app = express();

app.use(cors());
app.use(express.json());

// Đảm bảo CSDL được khởi tạo
getDb();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Website Xe GV Sông Tiền API' });
});

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Lỗi máy chủ nội bộ' });
});

module.exports = app;
