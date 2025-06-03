const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes');
const discountRoutes = require('./routes/discountRoutes');
const pendingOrderRoutes = require('./routes/pendingOrderRoutes');
const upiRoutes = require('./routes/upiRoutes');
const authRoutes = require('./routes/authRoutes');
const { restoreAdminIfMissing, backupAdminCredentials } = require('./scripts/admin-recovery-service');
const Admin = require('./models/Admin');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [
      'https://masala-madness-main-production.up.railway.app',
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: [
    'https://masala-madness-main-production.up.railway.app',
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/pending-orders', pendingOrderRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Masala Madness API is running.');
});

// Socket.IO events
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // Removed noisy log: console.log('User disconnected:', socket.id);
  });
});

// Admin Recovery Functions
async function checkAndRecoverAdminCollection() {
  try {
    const adminCount = await Admin.countDocuments().catch(err => {
      console.warn('Error checking admin count:', err.message);
      return 0;
    });

    if (adminCount === 0) {
      console.log('No admin users found. Restoring admin account...');
      await restoreAdminIfMissing();
    } else {
      console.log(`Found ${adminCount} admin users.`);
      await backupAdminCredentials();
    }
  } catch (error) {
    console.error('Error in admin recovery process:', error);
  }
}

function setupCollectionWatchdog() {
  const interval = 1000 * 60 * 60; // 1 hour
  setInterval(checkAndRecoverAdminCollection, interval);

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected. Checking admin collection...');
    checkAndRecoverAdminCollection();
  });
}

// Database Connection and Server Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected.');
    await checkAndRecoverAdminCollection();
    setupCollectionWatchdog();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
