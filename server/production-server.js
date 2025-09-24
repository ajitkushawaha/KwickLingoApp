// server/production-server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Production configuration
const PRODUCTION_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://your-domain.com',
  MAX_CONNECTIONS: process.env.MAX_CONNECTIONS || 1000,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100, // requests per window
};

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    },
  },
}));

// CORS configuration for production
app.use(cors({
  origin: PRODUCTION_CONFIG.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: PRODUCTION_CONFIG.RATE_LIMIT_WINDOW,
  max: PRODUCTION_CONFIG.RATE_LIMIT_MAX,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO configuration for production
const io = socketIo(server, {
  cors: {
    origin: PRODUCTION_CONFIG.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
});

// Import the main server logic
const { setupSocketHandlers } = require('./server');

// Setup socket handlers
setupSocketHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: PRODUCTION_CONFIG.NODE_ENV,
    version: '1.0.0',
  });
});

// Metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  const metrics = {
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(metrics);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Production Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: PRODUCTION_CONFIG.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(PRODUCTION_CONFIG.PORT, '0.0.0.0', () => {
  console.log(`🚀 KwickLingo Production Server running on port ${PRODUCTION_CONFIG.PORT}`);
  console.log(`📊 Health check: http://localhost:${PRODUCTION_CONFIG.PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PRODUCTION_CONFIG.PORT}/metrics`);
  console.log(`🌍 Environment: ${PRODUCTION_CONFIG.NODE_ENV}`);
  console.log(`🔒 CORS Origin: ${PRODUCTION_CONFIG.CORS_ORIGIN}`);
});

module.exports = { app, server, io };
