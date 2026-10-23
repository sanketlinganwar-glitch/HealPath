import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import db from './database/db.js';
import { seedDatabase } from './database/seed.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { initCronJobs } from './services/cron.js';

// Route imports
import authRoutes from './routes/auth.js';
import departmentRoutes from './routes/departments.js';
import doctorRoutes from './routes/doctors.js';
import slotRoutes from './routes/slots.js';
import appointmentRoutes from './routes/appointments.js';
import queueRoutes from './routes/queue.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});
app.set('io', io);

// Security & Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allows Google Fonts, CDNs, and inline scripts for Hackathon
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 500, // 500 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', apiLimiter);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'MediCare - Hospital Website, Appointment & Queue System',
    timestamp: new Date().toISOString(),
    database: db.isMySQL() ? 'MySQL' : 'Atomic Store',
    socket_clients: io.engine.clientsCount
  });
});

// Setup WebSockets
setupSocketHandlers(io);

// Setup scheduled Cron jobs
initCronJobs(io);

// Auto-seed demo database if fresh
seedDatabase(false).catch(console.error);

// Fallback route for SPA / direct link navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server with Port Fallback
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

function startServer(port) {
  server.listen(port, () => {
    console.log(`
========================================================================
🏥 MediCare - Hospital Website, Appointment & Queue System
========================================================================
✨ Tagline: "Health Today. Brighter Tomorrow."
✨ Secondary: "Your Health. Our Priority."

🚀 Server running live at: http://localhost:${port}
🌐 Public Portal:         http://localhost:${port}/index.html
📅 Slot Booking:          http://localhost:${port}/booking.html
📺 Live Hospital Queue:    http://localhost:${port}/queue.html
📊 Role Dashboards:       http://localhost:${port}/dashboard.html
💬 FAQ & Voice Assistant: Available on all pages (bottom right)
========================================================================
`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is occupied, falling back to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server startup error:', err);
    }
  });
}

startServer(DEFAULT_PORT);

export { app, server, io };
