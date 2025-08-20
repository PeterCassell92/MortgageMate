import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 4321;

// Middleware
app.use(helmet());

// CORS configuration - allow frontend requests
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MortgageMate API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// API info route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MortgageMate API v1.0',
    endpoints: {
      health: '/health',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        me: '/api/auth/me',
        validateToken: '/api/auth/validate-token',
        refresh: '/api/auth/refresh'
      },
      chat: {
        list: '/api/chat/list',
        create: '/api/chat/create',
        load: '/api/chat/:numericalId/load',
        delete: '/api/chat/:numericalId/delete',
        sendMessage: '/api/chat/:numericalId',
        config: '/api/chat/config',
        mortgageAnalysis: '/api/chat/mortgage-analysis'
      }
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 MortgageMate API server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});