# Deployment Guide: Fly.io + Netlify

## Architecture
- **Backend**: Fly.io (Express API)
- **Database**: Fly.io Postgres (3GB free tier)
- **Frontend**: Netlify (React SPA)

## Important: Development vs Production

- **Development (docker-compose)**: Uses `mm_backend/Dockerfile`
- **Production (Fly.io)**: Uses `mm_backend/Dockerfile.prod`

Your local `docker-compose up` will continue to work normally using the dev Dockerfile!

---

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Netlify Account**: Sign up at https://netlify.com
3. **Git Repository**: Push code to GitHub/GitLab

---

## Part 1: Deploy Backend to Fly.io

### 1. Install Fly.io CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Verify installation
flyctl version

# Login (creates account if needed)
flyctl auth login
```

### 2. Create Postgres Database

```bash
# Create database (do this BEFORE creating the app)
flyctl postgres create

# When prompted:
# - App name: mortgagemate-db (or your choice)
# - Region: lhr (London) or closest to your users
# - Configuration: Development (free tier - 3GB storage)

# IMPORTANT: Save the connection string displayed!
# It looks like: postgres://user:password@hostname:5432/dbname
```

### 3. Initialize Backend App

```bash
cd mm_backend

# Initialize Fly.io app (fly.toml already exists)
flyctl launch --no-deploy

# When prompted:
# - App name: mortgagemate-backend (or your choice)
# - Region: Same as database (e.g., lhr)
# - Deploy: NO (we need to set secrets first)
```

### 4. Attach Database to Backend

```bash
# Attach the database you created
flyctl postgres attach mortgagemate-db

# This creates a DATABASE_URL secret automatically
```

### 5. Set Environment Secrets

```bash
# Set all your secret environment variables
flyctl secrets set \
  ANTHROPIC_API_KEY="your-anthropic-key" \
  OPENAI_API_KEY="your-openai-key" \
  JWT_SECRET="your-jwt-secret" \
  SESSION_SECRET="your-session-secret" \
  VECTORIZE_API_KEY="your-vectorize-key" \
  VECTORIZE_PIPELINE_ID="your-pipeline-id" \
  VECTORIZE_ORGANIZATION_ID="your-org-id" \
  LANGCHAIN_API_KEY="your-langchain-key" \
  LANGCHAIN_PROJECT="mortgagemate-prod"

# Set non-secret environment variables in fly.toml (already configured):
# - PORT=4321
# - NODE_ENV=production
# - LLM_PROVIDER=anthropic
# - LLM_IMPLEMENTATION=langchain
# - MOCK_LLM=false
```

Add these non-secret env vars to fly.toml:

```toml
[env]
  PORT = "4321"
  NODE_ENV = "production"
  LLM_PROVIDER = "anthropic"
  LLM_IMPLEMENTATION = "langchain"
  MOCK_LLM = "false"
  VECTORIZE_URL = "https://api.vectorize.io/v1"
  LANGCHAIN_TRACING_V2 = "true"
  LANGCHAIN_ENDPOINT = "https://eu.api.smith.langchain.com"
  DOCUMENT_PARSER_PROVIDER = "claude"
  MAX_DOCUMENT_SIZE = "10485760"
  BCRYPT_ROUNDS = "12"
```

### 6. Deploy Backend

**Important**: The production deployment uses `Dockerfile.prod` (configured in fly.toml), while local development uses `Dockerfile` with docker-compose.

```bash
# Deploy from mm_backend directory
flyctl deploy

# Monitor logs
flyctl logs

# Check if it's running
flyctl status

# Get the URL
flyctl info
# Save this URL! e.g., https://mortgagemate-backend.fly.dev
```

### 7. Test Backend

```bash
# Test health endpoint
curl https://mortgagemate-backend.fly.dev/health

# Should return: {"status":"healthy"}
```

---

## Part 2: Deploy Frontend to Netlify

### 1. Update Frontend Environment

Create/update `mm_frontend/.env.production`:

```bash
# Use your Fly.io backend URL
VITE_API_BASE_URL=https://mortgagemate-backend.fly.dev
VITE_APP_NAME=MortgageMate
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG=false
```

### 2. Update Backend CORS

Update `mm_backend/src/index.ts` to allow your Netlify domain:

```typescript
// After deployment, add your Netlify URL to CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-app.netlify.app', // Add this after first deploy
    'https://custom-domain.com'     // If you have a custom domain
  ],
  credentials: true
};
```

Redeploy backend:
```bash
cd mm_backend
flyctl deploy
```

### 3. Deploy to Netlify (Option A: CLI)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

cd mm_frontend

# Build the frontend
yarn build

# Deploy (first time - creates new site)
netlify deploy --prod

# When prompted:
# - Create & configure new site
# - Team: Your team
# - Site name: mortgagemate (or your choice)
# - Publish directory: dist

# Save the URL! e.g., https://mortgagemate.netlify.app
```

### 4. Deploy to Netlify (Option B: GitHub - Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to your GitHub repository
   - Configure build settings:
     - **Base directory**: `mm_frontend`
     - **Build command**: `yarn build`
     - **Publish directory**: `mm_frontend/dist`

3. **Set Environment Variables** in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add:
     - `VITE_API_BASE_URL`: Your Fly.io backend URL
     - `VITE_APP_NAME`: MortgageMate
     - `VITE_NODE_ENV`: production
     - `VITE_ENABLE_DEBUG`: false

4. **Deploy**:
   - Click "Deploy site"
   - Wait for build to complete
   - Save the URL (e.g., `https://mortgagemate.netlify.app`)

5. **Update Backend CORS**:
   - Add the Netlify URL to CORS in `mm_backend/src/index.ts`
   - Redeploy backend: `flyctl deploy` from `mm_backend/`

---

## Part 3: Testing

### 1. Test Full Flow

1. Visit your Netlify URL
2. Register a new account
3. Upload a mortgage document
4. Start a conversation with the AI advisor
5. Request analysis and check if market data is retrieved

### 2. Monitor Logs

```bash
# Backend logs
flyctl logs -a mortgagemate-backend

# Database logs
flyctl logs -a mortgagemate-db

# Frontend logs (in Netlify dashboard)
```

### 3. Check Database

```bash
# Connect to database
flyctl postgres connect -a mortgagemate-db

# Run queries
\dt  # List tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM llm_requests;
```

---

## Costs

### Free Tiers
- **Fly.io**: $0/month for hobby projects (256MB RAM, 3GB storage included)
- **Netlify**: $0/month (100GB bandwidth, 300 build minutes)
- **Total**: $0/month for low-traffic usage

### Paid Tiers (if you exceed free limits)
- **Fly.io**: ~$5-10/month for more resources
- **Netlify**: $19/month for Pro features
- **API costs**: Anthropic, Vectorize (pay-as-you-go)

---

## Maintenance

### Updating Backend
```bash
cd mm_backend
git pull
flyctl deploy
```

### Updating Frontend
```bash
cd mm_frontend
git pull
# If using GitHub: Netlify auto-deploys on push
# If using CLI:
yarn build
netlify deploy --prod
```

### Database Migrations
```bash
# Migrations run automatically on deploy via CMD in Dockerfile
# To run manually:
flyctl ssh console -a mortgagemate-backend
npx prisma migrate deploy
```

---

## Troubleshooting

### Backend not starting
```bash
# Check logs
flyctl logs -a mortgagemate-backend

# Check secrets are set
flyctl secrets list -a mortgagemate-backend

# SSH into machine
flyctl ssh console -a mortgagemate-backend
```

### Database connection issues
```bash
# Check DATABASE_URL is set
flyctl secrets list -a mortgagemate-backend | grep DATABASE_URL

# Test connection
flyctl postgres connect -a mortgagemate-db
```

### Frontend can't connect to backend
1. Check CORS is configured correctly
2. Verify VITE_API_BASE_URL in Netlify environment variables
3. Test backend directly: `curl https://your-backend.fly.dev/health`

---

## Custom Domain (Optional)

### Backend
```bash
flyctl certs add api.yourdomain.com -a mortgagemate-backend
```

### Frontend
1. Go to Netlify dashboard → Domain settings
2. Add custom domain
3. Configure DNS with your domain provider

---

## Monitoring & Observability

- **Fly.io Metrics**: https://fly.io/dashboard/your-app/metrics
- **Netlify Analytics**: https://app.netlify.com/sites/your-site/analytics
- **LangSmith**: https://smith.langchain.com (for LLM tracing)
- **Vectorize**: https://vectorize.io dashboard
