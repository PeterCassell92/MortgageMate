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
const allowedOrigins = [
  'http://localhost:3000',
  'https://mortgagemate-ai.netlify.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
  console.log('\n' + '='.repeat(70));
  console.log('🚀 MortgageMate API Server Started');
  console.log('='.repeat(70));

  // Server Info
  console.log('\n📡 Server Configuration:');
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   API Info: http://localhost:${PORT}/api`);

  // LLM Configuration
  console.log('\n🤖 LLM Configuration:');
  console.log(`   Implementation: ${process.env.LLM_IMPLEMENTATION || 'legacy'}`);
  console.log(`   Provider: ${process.env.LLM_PROVIDER || 'anthropic'}`);
  console.log(`   Mock Mode: ${process.env.MOCK_LLM === 'true' ? '✓ ENABLED' : '✗ Disabled'}`);
  console.log(`   Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Missing'}`);

  // LangChain Configuration
  console.log('\n🔗 LangChain Configuration:');
  console.log(`   Tracing: ${process.env.LANGCHAIN_TRACING_V2 === 'true' ? '✓ ENABLED' : '✗ Disabled'}`);
  if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log(`   Endpoint: ${process.env.LANGCHAIN_ENDPOINT || 'default'}`);
    console.log(`   Project: ${process.env.LANGCHAIN_PROJECT || 'default'}`);
    console.log(`   API Key: ${process.env.LANGCHAIN_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  }

  // Database Configuration
  console.log('\n🗄️  Database Configuration:');
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URI || 'Not configured';
  const dbHost = dbUrl.includes('@') ? dbUrl.split('@')[1].split('/')[0] : 'unknown';
  const dbName = dbUrl.includes('/') ? dbUrl.split('/').pop()?.split('?')[0] : 'unknown';
  console.log(`   Host: ${dbHost}`);
  console.log(`   Database: ${dbName}`);
  console.log(`   Connection: ${dbUrl.startsWith('postgresql') ? '✓ PostgreSQL' : '✗ Unknown'}`);

  // Frontend Configuration
  console.log('\n🎨 Frontend Configuration:');
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`   CORS: ${process.env.FRONTEND_URL ? '✓ Configured' : 'Using default'}`);

  // Document Processing
  console.log('\n📄 Document Processing:');
  console.log(`   Provider: ${process.env.DOCUMENT_PARSER_PROVIDER || 'claude'}`);
  console.log(`   Max Size: ${parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760') / 1024 / 1024}MB`);

  // Vectorize (RAG)
  console.log('\n🔍 Vector Search (RAG):');
  console.log(`   Vectorize: ${process.env.VECTORIZE_URL ? '✓ Configured' : '✗ Not configured'}`);

  console.log('\n' + '='.repeat(70));
  console.log('✓ Server ready to accept connections');
  console.log('='.repeat(70) + '\n');
});