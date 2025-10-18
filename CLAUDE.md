# Mortgage Calculator Web Application - Project Specification

## Project Overview
A web application to help householders with mortgages determine if they are on the best deal by providing LLM-powered analysis of their current mortgage against available alternatives.

## Architecture
- **Frontend**: React + TypeScript + Material-UI (in `mm_frontend/`)
- **Backend**: Express.js + TypeScript (in `mm_backend/`)
- **Database**: PostgreSQL
- **LLM Integration**: Anthropic Claude Sonnet 4 API (with mock toggle)
- **Deployment**: Local development initially, future Netlify deployment

## Core Features

### 1. User Authentication
- Basic username/password authentication with salted password storage
- Future: Email verification on signup (not initial implementation)

### 2. Mortgage Data Capture
- Conversational chatbot interface for natural language data input
- No fixed order for data capture - flexible conversation flow
- Required data fields:
  - Monthly payments
  - Term length
  - Initial loan size
  - Overpayment history
  - Initial house value
  - Product cost of original mortgage
  - Exit fees (including sliding scale)
  - Mortgage type (Fixed/Variable/Tracker - start with Fixed only)

### 3. Mortgage Scenarios
- Users can have multiple "mortgage scenarios"
- Each scenario stores complete mortgage deal information
- Support for different mortgage structures

### 4. LLM Analysis System
- "Create Analysis" button triggers analysis when scenario is complete
- Pre-defined prompt construction using rules-based code (not LLM)
- Sends structured prompt to Claude API for mortgage deal comparison
- Caches analysis results in database
- Renders results using predefined templates

### 5. Analysis Output
- Optimal switching timing recommendations
- Financial savings/losses at critical future points
- Payback time calculations for switching deals
- Actionable advice for favorable mortgage deals

## Database Schema

### Users Table
- id, username, password_hash, salt, created_at, updated_at

### Mortgage Scenarios Table
- id, user_id, name, mortgage_type, monthly_payment, term_length, initial_loan_size, overpayments, initial_house_value, product_cost, exit_fees, created_at, updated_at

### Analyses Table
- id, mortgage_scenario_id, prompt_sent, llm_response, analysis_results, created_at

## Environment Configuration
- `ANTHROPIC_API_KEY`: Claude API key
- `MOCK_LLM`: Toggle for mocking LLM responses during development
- Database connection settings

## Development Commands

### Docker Compose (Recommended)
Start all services (PostgreSQL, backend, frontend) with a single command:

```bash
# Start all services in development mode
docker-compose up

# Start services in background
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start services
docker-compose up --build

# View logs
docker-compose logs -f [service-name]
```

### Manual Development (Alternative)
If you prefer running services individually:

**Backend:**
```bash
cd mm_backend
yarn dev
```

**Frontend:**
```bash
cd mm_frontend  
yarn dev
```

**Database:**
Ensure PostgreSQL is running locally with mortgagemate_dev database.

## Development Todo List

### High Priority
- ✅ Create CLAUDE.md file with complete project specification and memory (04/08/2025)
- ✅ Create .env and .env.example files with environment configuration (04/08/2025)
- ✅ Set up project structure with mm_frontend and mm_backend directories (04/08/2025)
- ✅ Initialize React TypeScript project in mm_frontend with Material-UI (04/08/2025)
- ✅ Initialize Express TypeScript project in mm_backend (04/08/2025)
- ✅ Add basic authentication workflow (11/08/2025)
  - ✅ Create PostgreSQL database with users table (04/08/2025)
  - ✅ Create authorization API endpoints (04/08/2025)
  - ✅ Create login API endpoints (04/08/2025)
  - ✅ Create register API endpoints (04/08/2025)
  - ✅ Create front end page for registration (04/08/2025)
  - ✅ Create front end login page (04/08/2025)
- 🔲 Set up environment configuration for local development
- 🔲 ensure that Chats, llm_requests and llm_response are all stored in the database properly
  - 🔲 Then make it possible for a user to be mid-chat and revisit the same chat.
    - 🔲 this will be done by loading the messages from the database, loading the data from the mortgage_scenarios back into the session instead of initialising a new chat
    - 🔲 make it possible to make a new chat from fresh which will make a chat with a new uuid. Chat table will need to have latest_view_time so that chats can be ordered by time last visited and the most recent chat will be restored when a user returns to the chat part of the dashboard.

### Medium Priority
- 🔲 Migrate database to cloud-based solution for collaborator access
- ✅ Set up PostgreSQL database schema for mortgage_scenarios and analyses tables
- 🔲 Design mortgage scenario data model supporting Fixed/Variable/Tracker types
- ✅ Build conversational chatbot interface for mortgage data capture
- 🔲 Implement backend API endpoints for mortgage scenario CRUD operations
- 🔲 Create user dashboard to view and manage mortgage scenarios
- ✅ Build LLM prompt construction system for mortgage analysis
- ✅ Set up Anthropic Claude API integration with mock toggle environment variable
- ✅ Implement RAG (Retrieval Augmented Generation) with Vectorize for real mortgage market data
  - ✅ Create Vectorize service integration with official client library
  - ✅ Create mortgage market service for intelligent product search
  - ✅ Integrate market data into mortgage analysis prompts
- ✅ **Migrate to LangChain for unified LLM interface and comprehensive observability** (11/10/2025)
  - ✅ Replace direct Anthropic SDK calls with LangChain ChatAnthropic
  - ✅ Convert prompt templates to LangChain format
  - ✅ Implement feature flag (`LLM_IMPLEMENTATION=legacy|langchain`) for instant switching
  - ✅ Migrate search query generation (first service migrated)
  - 🔲 Set up LangSmith for conversation tracing and debugging
  - 🔲 Migrate remaining services (mortgage analysis, document parsing, chat)
  - 🔲 Add streaming support and improved error handling
- 🔲 Revisit best Document Parsing services and models for scanning in mortgage documents specifically
- 🔲 create specialized prompts for different document types (statements, offers, valuations)
- 🔲 Create specialized prompts when asking about certain information.
- 🔲 Add Analyse button as a call to action when this is being offered by the chat
- 🔲 Add Graphs to visualise some key mortgage data (for example capital owned over time)

### Low Priority
- 🔲 Implement 'Create Analysis' functionality and result caching
- 🔲 Design and implement analysis result templates/rendering
- 🔲 Remove remove chat Id from Chat.tsx - Investigate, but I think that chat Id is loaded by the backend against the authenticated user.
- ✅ Add data validation for mortgage scenario completeness
- 🔲 Optimize LLM token usage on chat resume with conversation truncation/summarization

## Development Workflow

### Frontend Development Process
**IMPORTANT: Always run TypeScript check before committing frontend changes:**

```bash
cd mm_frontend
yarn type-check
```

This prevents TypeScript errors from reaching runtime and ensures code quality. The `yarn type-check` command runs `tsc --noEmit` to validate types without generating files.

### Common Issues
- **Module resolution errors:** Restart Vite dev server after creating new files
- **Import/export mismatches:** Always run `yarn type-check` to catch early

## Current Development Status
Chat system with document upload and comprehensive prompt template architecture complete. Ready for Anthropic API integration.

## Next Steps - API Integration
### Getting Anthropic API Tokens
1. **Sign up/Login** at https://console.anthropic.com/
2. **Go to API Keys** section in the dashboard  
3. **Create a new API key** (give it a descriptive name like "MortgageMate Development")
4. **Copy the key** (starts with `sk-ant-api...`)

### Adding to Environment
Once you have the key, add it to your environment:

**Option 1: Docker Environment (Recommended)**
```bash
# Update your local .env file
echo "ANTHROPIC_API_KEY=your-actual-key-here" >> .env

# Then restart containers to pick up the new key
docker-compose down && docker-compose up -d
```
note. Never offer to run docker-compose commands in bash. I will do these myself. Just give me the commands.

**Option 2: Direct Environment Variable**
```bash
export ANTHROPIC_API_KEY=your-actual-key-here
```

### Test the Integration
Once the key is set up:
1. **Switch from mock mode** by setting `MOCK_LLM=false` in .env
2. **Test the chat** with real Claude responses
3. **Try the mortgage advisor prompts** with actual AI analysis  
4. **Monitor token usage tracking** with real API calls

### API Pricing Reference
- **Claude 4 Sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Typical chat message**: ~100-500 tokens
- **Full mortgage analysis**: ~2,000-5,000 tokens
- **Cost per analysis**: Usually under $0.10

The system tracks all token usage and costs in the database for spending monitoring.

## Claude Interaction Memories
- When I say "Ongoing" or "Add to Ongoing" - you will know this means I want to add a task to the Ongoing List
- In the Ongoing list, subtasks should be indented below their parent task. Indentation can continue multiple levels in.

## Project Conventions and Guidelines
- Completed Tasks on the Ongoing Todo list are ticked off with a tick emoji and a completed date in brackets in format DD/MM/YYYY

## Document/Image Parsing Options

### AI-Powered Document Processing Options
For processing mortgage documents, bank statements, and financial PDFs/images:

#### Primary Options (Vision-Enabled LLMs)
1. **Claude 3.5 Sonnet (Anthropic)** - Has excellent vision capabilities and can process images, documents, tables very well
2. **GPT-4 Vision (OpenAI)** - Also good at document processing

#### Specialized Document AI Services  
3. **Google Document AI** - Enterprise-grade document processing
4. **AWS Textract** - Amazon's document analysis service
5. **Azure Form Recognizer/Document Intelligence** - Microsoft's document processing
6. **Mindee API** - Specialized for financial documents

### Implementation Notes
- Claude 4 Sonnet already integrated - best first choice for mortgage document parsing
- Can use vision API to extract structured data from uploaded mortgage statements, offers, etc.
- Should create specialized prompts for different document types (statements, offers, valuations)


## Interaction Guidelines
- Whenever we reach a task completion (as far as you think), you should prompt me to ask if I want to mark the task as complete. I may respond 1) Yes or 2) No, it's not done yet, I will define how we approach next steps and/or refinements