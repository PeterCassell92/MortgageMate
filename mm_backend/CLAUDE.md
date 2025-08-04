# MortgageMate Backend

## Tech Stack
- **Framework**: Express.js 5.x with TypeScript
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT tokens + bcryptjs for password hashing
- **Security**: Helmet for HTTP headers, CORS enabled
- **Environment**: dotenv for configuration
- **Package Manager**: Yarn (pinned with Volta)
- **Node Version**: 20.x (pinned with Volta)

## Prerequisites

### Volta (Required)
**Volta is REQUIRED** for this project to ensure consistent Node.js and Yarn versions across all developers.

#### Install Volta:
```bash
# Install Volta
curl https://get.volta.sh | bash

# Restart your terminal or run:
source ~/.bashrc  # or ~/.zshrc

# Verify installation
volta --version
```

#### What Volta Does:
- **Automatic version switching**: Uses pinned Node.js 20.x and Yarn 1.22.x from `package.json`
- **Team consistency**: All developers use identical tool versions
- **No manual version management**: Volta handles everything automatically

#### First-time Setup:
1. Install Volta (above)
2. Clone the project
3. Navigate to `mm_backend/`
4. Run `yarn install` - Volta will automatically use the correct Node/Yarn versions

## Project Structure
```
mm_backend/
├── src/
│   ├── routes/        # API route handlers
│   ├── middleware/    # Custom middleware functions
│   ├── models/        # Database models and queries
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── index.ts       # Main server entry point
├── dist/              # Compiled JavaScript (generated)
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
```

## Environment Variables
Backend reads from root `.env` file:
- `PORT`: Server port (default: 4321)
- `FRONTEND_URL`: Frontend URL for CORS (http://localhost:3000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)
- `ANTHROPIC_API_KEY`: Claude API key
- `MOCK_LLM`: Toggle for mocking LLM responses

## Development Commands
- `yarn dev`: Start development server with hot reload
- `yarn build`: Compile TypeScript to JavaScript
- `yarn start`: Run compiled production server
- `yarn type-check`: Run TypeScript compiler check without output

## API Endpoints

### Health & Info
- `GET /health`: Health check endpoint
- `GET /api`: API information and available endpoints

### Authentication (To be implemented)
- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User login
- `GET /api/auth/me`: Get current user info (protected)

### Mortgage Scenarios (To be implemented)
- `GET /api/scenarios`: Get user's mortgage scenarios
- `POST /api/scenarios`: Create new mortgage scenario
- `PUT /api/scenarios/:id`: Update mortgage scenario
- `DELETE /api/scenarios/:id`: Delete mortgage scenario

### Analysis (To be implemented)
- `POST /api/analysis/:scenarioId`: Create analysis for scenario
- `GET /api/analysis/:id`: Get analysis results

## Database Setup

### Prerequisites
1. **Install PostgreSQL + pgAdmin4**:
   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo snap install pgadmin4  # or use official repository
   ```

2. **Create Database**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE mortgagemate_dev;
   CREATE USER postgres WITH PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE mortgagemate_dev TO postgres;
   \q
   ```

3. **Run Database Setup**:
   ```bash
   cd mm_backend
   yarn setup-db
   ```

### pgAdmin4 Connection
- **Host**: localhost
- **Port**: 5432
- **Database**: mortgagemate_dev
- **Username**: postgres
- **Password**: postgres

### Available Scripts
- `yarn setup-db`: Initialize database and create tables
- Database utilities in `src/utils/database.ts`
- Migration scripts in `src/utils/migrations.ts`

## Database Models

### Users Table (✅ Implemented)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Features:**
- Auto-updating `updated_at` timestamp via database trigger
- Password hashing with bcryptjs + custom salt
- Unique username constraint
- User model with CRUD operations in `src/models/User.ts`

### Mortgage Scenarios Table
```sql
CREATE TABLE mortgage_scenarios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mortgage_type VARCHAR(50) CHECK (mortgage_type IN ('Fixed', 'Variable', 'Tracker')),
  monthly_payment DECIMAL(10,2),
  term_length INTEGER,
  initial_loan_size DECIMAL(12,2),
  overpayments TEXT, -- JSON string
  initial_house_value DECIMAL(12,2),
  product_cost DECIMAL(10,2),
  exit_fees TEXT, -- JSON string for sliding scale
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features
- **Password Hashing**: bcryptjs with configurable rounds
- **JWT Authentication**: Secure token-based auth
- **CORS**: Configured for frontend domain only
- **Helmet**: Security headers protection
- **Input Validation**: Express built-in + custom validation
- **SQL Injection Protection**: Parameterized queries with pg

## Error Handling
- Global error handler middleware
- 404 handler for unknown routes
- TypeScript strict mode for compile-time safety
- Proper HTTP status codes

## LLM Integration
- Anthropic Claude API integration (with mock toggle)
- Structured prompt construction for mortgage analysis
- Response caching in database
- Error handling for API failures

## Development Notes
- Use TypeScript strict mode throughout
- Implement proper error boundaries
- Log all authentication attempts
- Validate all input data
- Use parameterized database queries
- Handle async operations properly
- Implement rate limiting (future enhancement)