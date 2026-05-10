require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const pool = require('./config/database');
const createTables = require('./models/migrate');
const routes = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { setIO: setNotifIO } = require('./services/notificationService');
const { setIO: setTaskIO } = require('./controllers/taskController');
const startCronJobs = require('./services/cronService');

const app = express();
const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

setNotifIO(io);
setTaskIO(io);

io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  if (userId) socket.join(`user:${userId}`);

  socket.on('join:project', (projectId) => socket.join(`project:${projectId}`));
  socket.on('leave:project', (projectId) => socket.leave(`project:${projectId}`));
  socket.on('disconnect', () => {});
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const boot = async () => {
  try {
    await pool.query('SELECT 1'); // Test DB connection
    await createTables();
    startCronJobs();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL}`);
    });
  } catch (err) {
    console.error('❌ Boot failed:', err);
    process.exit(1);
  }
};

boot();
