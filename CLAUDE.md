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
To be determined based on final project setup.

## Development Todo List

### High Priority
- ✅ Create CLAUDE.md file with complete project specification and memory (04/08/2025)
- ✅ Create .env and .env.example files with environment configuration (04/08/2025)
- ✅ Set up project structure with mm_frontend and mm_backend directories (04/08/2025)
- ✅ Initialize React TypeScript project in mm_frontend with Material-UI (04/08/2025)
- ✅ Initialize Express TypeScript project in mm_backend (04/08/2025)
- 🔲 Add basic authentication workflow
  - ✅ Create PostgreSQL database with users table (04/08/2025)
  - ✅ Create authorization API endpoints (04/08/2025)
  - ✅ Create login API endpoints (04/08/2025)
  - ✅ Create register API endpoints (04/08/2025)
  - ✅ Create front end page for registration (04/08/2025)
  - ✅ Create front end login page (04/08/2025)
- 🔲 Set up environment configuration for local development

### Medium Priority
- 🔲 Migrate database to cloud-based solution for collaborator access
- 🔲 Set up PostgreSQL database schema for mortgage_scenarios and analyses tables
- 🔲 Design mortgage scenario data model supporting Fixed/Variable/Tracker types
- 🔲 Build conversational chatbot interface for mortgage data capture
- 🔲 Implement backend API endpoints for mortgage scenario CRUD operations
- 🔲 Create user dashboard to view and manage mortgage scenarios
- 🔲 Build LLM prompt construction system for mortgage analysis
- 🔲 Set up Anthropic Claude API integration with mock toggle environment variable

### Low Priority
- 🔲 Implement 'Create Analysis' functionality and result caching
- 🔲 Design and implement analysis result templates/rendering
- 🔲 Add data validation for mortgage scenario completeness

## Current Development Status
Project initialization phase - environment configuration completed.

## Claude Interaction Memories
- When I say "Ongoing" or "Add to Ongoing" - you will know this means I want to add a task to the Ongoing List
- In the Ongoing list, subtasks should be indented below their parent task. Indentation can continue multiple levels in.

## Project Conventions and Guidelines
- Completed Tasks on the Ongoing Todo list are ticked off with a tick emoji and a completed date in brackets in format DD/MM/YYYY

## Interaction Guidelines
- Whenever we reach a task completion (as far as you think), you should prompt me to ask if I want to mark the task as complete. I may respond 1) Yes or 2) No, it's not done yet, I will define how we approach next steps and/or refinements