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

**Important**: The `fly.toml` file is in the **root directory** of the project, so all `flyctl` commands should be run from there.

```bash
# Make sure you're in the project root directory (not mm_backend)
cd /path/to/MortgageCalculator

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

**Important**:
- The production deployment uses `Dockerfile.prod` (configured in fly.toml), while local development uses `Dockerfile` with docker-compose.
- **Run all `flyctl` commands from the project root directory** (where `fly.toml` is located)

```bash
# Deploy from project root directory (NOT from mm_backend)
cd /path/to/MortgageCalculator
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

**Current Setup**: The frontend is automatically deployed via GitHub integration. The repository is at https://github.com/PeterCassell92/MortgageMate and deploys from the `master` branch.

### 1. Automatic Deployment (GitHub - Already Configured)

The site is configured to automatically deploy when you push to the `master` branch:

```bash
# Make your changes, then push to trigger deployment
git add .
git commit -m "Your changes"
git push origin master
```

Netlify will automatically:
1. Detect the push to `master`
2. Build the frontend using the configured settings
3. Deploy to production

**Build Settings** (already configured in Netlify):
- **Base directory**: `mm_frontend`
- **Build command**: `yarn build`
- **Publish directory**: `mm_frontend/dist`

### 2. Environment Variables in Netlify

Environment variables are already configured in the Netlify dashboard. To add or update them:

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable** or edit existing ones

**Current Environment Variables**:
```bash
VITE_API_BASE_URL=https://mortgagemate-backend.fly.dev
VITE_APP_NAME=MortgageMate
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG=false
```

**Note**: After changing environment variables, you need to trigger a redeploy:
- Go to **Deploys** tab → Click **Trigger deploy** → **Deploy site**

### 3. Manual Deployment (CLI - Alternative Method)

If you need to deploy manually without pushing to GitHub:

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to frontend directory
cd mm_frontend

# Build the frontend
yarn build

# Deploy to production
netlify deploy --prod --dir=dist

# When prompted, select your existing site
```

This is useful for:
- Testing builds before pushing to GitHub
- Emergency hotfixes
- Deploying from a different branch

### 4. Update Backend CORS

Ensure your backend allows requests from the Netlify URL. Update `mm_backend/src/index.ts`:

```typescript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://mortgagemate.netlify.app', // Your Netlify URL
    'https://custom-domain.com'         // If you have a custom domain
  ],
  credentials: true
};
```

After updating CORS, redeploy the backend:
```bash
# From project root directory
cd /path/to/MortgageCalculator
flyctl deploy
```

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
# From project root directory
cd /path/to/MortgageCalculator
git pull
flyctl deploy
```

### Updating Frontend

**Automatic (via GitHub - Recommended)**:
```bash
# Make changes and push to master branch
git add .
git commit -m "Update frontend"
git push origin master

# Netlify automatically detects and deploys
# Monitor deployment at https://app.netlify.com
```

**Manual (via CLI)**:
```bash
cd mm_frontend
yarn build
netlify deploy --prod --dir=dist
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
