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

// API routes
app.use('/api', mintRoutes);

// Phục vụ frontend từ thư mục build
const distPath = path.join(__dirname, '../app/dist');
app.use(express.static(distPath));

// Mọi request khác đều trả về index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`- API endpoints available at /api/*`);
  console.log(`- Frontend available at /`);
});
