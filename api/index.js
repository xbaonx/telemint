/**
 * API Server chính
 * Xử lý các yêu cầu mint NFT và các API khác
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const mintRoutes = require('./mint');

// Khởi tạo Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh từ thư mục public (cho admin panel)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', mintRoutes);

// Phục vụ frontend từ thư mục build
const distPath = path.join(__dirname, '../app/dist');
app.use(express.static(distPath));

// Route đặc biệt cho admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Mọi request khác đều trả về index.html (trừ các route đặc biệt)
app.get('*', (req, res) => {
  // Skip nếu là request tới /admin hoặc /api
  if (req.path === '/admin' || req.path.startsWith('/api/')) {
    return;
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`- API endpoints available at /api/*`);
  console.log(`- Frontend available at /`);
});
