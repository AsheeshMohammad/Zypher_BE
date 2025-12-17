import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import uploadRoutes from './routes/upload.js';
import experienceRoutes from './routes/experience.js';
import educationRoutes from './routes/education.js';
import skillsRoutes from './routes/skills.js';
import newsRoutes from './routes/news.js';
import channelsRoutes from './routes/channels.js';
// import notificationRoutes from './routes/notifications.js';
// import NotificationWebSocket from './websocket/notifications.js';

dotenv.config();

const startServer = async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for Swagger UI
  }));

  // Cookie parser
  app.use(cookieParser());

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    }
  });
  app.use(limiter);

  // CORS configuration
  app.use(cors({
    origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Kynix API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true
    }
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Database connection test
  app.get('/test-db', async (req, res) => {
    try {
      const { getConnection } = await import('./config/database.js');
      const pool = await getConnection();
      await pool.request().query('SELECT 1 as test');
      res.json({ 
        success: true,
        message: 'Database connection successful', 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Database connection failed', 
        error: error.message,
        timestamp: new Date().toISOString() 
      });
    }
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/experience', experienceRoutes);
  app.use('/api/education', educationRoutes);
  app.use('/api/skills', skillsRoutes);
  app.use('/api/news', newsRoutes);
  app.use('/api/channels', channelsRoutes);
  // app.use('/api/notifications', notificationRoutes); // Moved to dynamic import below

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Kynix Backend API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        posts: '/api/posts',
        channels: '/api/channels',
        health: '/health',
        testDb: '/test-db',
        documentation: '/api-docs'
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });

  // Global error handler
  app.use((error, req, res, next) => {
    console.error('Global error handler:', error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    console.log(`📝 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔍 Database Test: http://localhost:${PORT}/test-db`);
  });

  // Initialize WebSocket for notifications
  try {
    const { default: NotificationWebSocket } = await import('./websocket/notifications.js');
    const notificationWS = new NotificationWebSocket(server);
    app.notificationWS = notificationWS;
    
    // Load notification routes
    const { default: notificationRoutes } = await import('./routes/notifications.js');
    app.use('/api/notifications', notificationRoutes);
  } catch (error) {
    console.warn('WebSocket notifications not available:', error.message);
  }

  return app;
};

// Start the server
startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});