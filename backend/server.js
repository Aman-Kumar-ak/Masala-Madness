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

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS and increased timeouts
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5173',
      'https://masala-madness.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000, // 30 seconds
  pingInterval: 10000 // 10 seconds
});

// Make io available in routes
app.set('io', io);

// Always allow the Vercel frontend, .env FRONTEND_URL, and localhost for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://masala-madness.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Middleware
app.use(cors({
  origin: true, // Allow all origins for testing
  methods: ['GET', 'POST'],
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

// Wake-up ping endpoint
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'pong', time: Date.now() });
});

// Socket.IO events
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // Removed noisy log: console.log('User disconnected:', socket.id);
  });
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
