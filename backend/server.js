const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes');
const discountRoutes = require('./routes/discountRoutes');
const upiRoutes = require('./routes/upiRoutes');
const authRoutes = require('./routes/authRoutes');
const User = require('./models/User');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with unified CORS
const io = new Server(server, {
  cors: {
    origin: [
      'https://masala-madness.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://masala-madness.onrender.com',
      process.env.FRONTEND_URL
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000, // 30 seconds
  pingInterval: 10000 // 10 seconds
});

// User <-> socket mapping for force logout
const userSockets = new Map();

// Make io available in routes
app.set('io', io);
app.set('userSockets', userSockets);

// Always allow the Vercel frontend, .env FRONTEND_URL, and localhost for CORS
const allowedOrigins = [
  'https://masala-madness.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://masala-madness.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Masala Madness API is running.');
});

// Wake-up ping endpoint
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'pong', time: Date.now() });
});

// Socket.IO events
io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    if (userId) userSockets.set(userId, socket.id);
    socket.userId = userId;
  });

  // Listen for user-active heartbeat
  socket.on('user-active', async (userId) => {
    if (!userId) return;
    try {
      await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
    } catch (e) { /* ignore */ }
  });

  socket.on('disconnect', () => {
    for (const [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Periodically broadcast online status to all admins
setInterval(async () => {
  try {
    const users = await User.find({}, '_id lastActiveAt');
    const now = Date.now();
    const onlineStatus = {};
    users.forEach(u => {
      onlineStatus[u._id] = u.lastActiveAt && (now - new Date(u.lastActiveAt).getTime() < 30000); // 30s window
    });
    io.emit('user-online-status', onlineStatus);
  } catch (e) { /* ignore */ }
}, 5000); // every 5s

// CORS error handler (must be after all app.use and routes)
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS error: This origin is not allowed.' });
  }
  next(err);
});

// Database Connection and Server Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected.');

    const PORT = process.env.PORT || 5000;
    // Bind to 0.0.0.0 for global accessibility
    server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
