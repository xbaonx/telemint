/**
 * API Server chính
 * Xử lý các yêu cầu mint NFT và các API khác
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const mintRoutes = require('./mint');
const { launchBot } = require('./bot'); // Import bot

// Khởi tạo Express app
const app = express();
const port = process.env.PORT || 3000;

// Start Bot nếu có token
if (process.env.TELEGRAM_BOT_TOKEN) {
    launchBot();
} else {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not found. Bot will not start.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh từ thư mục public (cho admin panel)
app.use('/admin-assets', express.static(path.join(__dirname, 'public')));
console.log('Admin assets path:', path.join(__dirname, 'public'));

// API routes
app.use('/api', mintRoutes);

// Phục vụ frontend từ thư mục build
const distPath = path.join(__dirname, '../app/dist');
app.use(express.static(distPath));

// Mọi request khác đều trả về index.html (trừ API route)
app.get('*', (req, res) => {
  // Nếu là request tới /admin, phục vụ admin.html
  if (req.path === '/admin') {
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }

  // Nếu là API request, skip
  if (req.path.startsWith('/api/')) {
    return;
  }

  // Phục vụ frontend cho các request khác
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`- API endpoints available at /api/*`);
  console.log(`- Frontend available at /`);
});
