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

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available to our routes
app.set('io', io);

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/pending-orders', pendingOrderRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Masala Madness API is running.');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Enhanced admin recovery mechanism
const Admin = require('./models/Admin');

// Function to check and recover admin collection
async function checkAndRecoverAdminCollection() {
  try {
    // Check if admin collection exists and has admin users
    const adminCount = await Admin.countDocuments().catch(err => {
      console.warn('Error checking admin count:', err.message);
      return 0;
    });
    
    if (adminCount === 0) {
      console.log('No admin users found. Restoring admin account...');
      await restoreAdminIfMissing();
    } else {
      console.log(`Found ${adminCount} admin users.`);
      // Backup existing admins
      await backupAdminCredentials();
    }
  } catch (error) {
    console.error('Error in admin recovery process:', error);
  }
}

// Setup database watchdog to monitor admin collection
// This helps prevent issues when the collection is accidentally deleted
function setupCollectionWatchdog() {
  // Check admin collection every hour
  const interval = 1000 * 60 * 60; // 1 hour
  setInterval(checkAndRecoverAdminCollection, interval);
  
  // Also register watchdog for MongoDB events
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected. Checking admin collection...');
    checkAndRecoverAdminCollection();
  });
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected.');
    
    // First run the admin recovery to ensure admin exists
    await checkAndRecoverAdminCollection();
    
    // Setup watchdog timer
    setupCollectionWatchdog();
    
    // Start the server
    server.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch((err) => console.error(err));
