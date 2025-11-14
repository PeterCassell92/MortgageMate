# MortgageMate

An AI-powered mortgage advisory platform featuring an intelligent agentic advisor that helps you navigate complex mortgage decisions.

Online tools like CompareTheMarket show available mortgage options, and countless calculators exist—but how do you strategize and select the best option for your unique situation? MortgageMate combines comprehensive situational understanding with real market data to deliver optimal decisions.

**MortgageMate's edge:** Advanced document parsing capabilities extract critical details from your existing mortgage documents, including legal clauses and complex exit fees. This deep understanding enables strategic recommendations for both current refinancing and future mortgage moves, optimizing timing and financial outcomes.

## 🚀 Deployed Application

**Live App:** https://mortgagemate-ai.netlify.app/

**Backend API:** https://mortgagemate-backend.fly.dev/

## How It Works

MortgageMate provides a conversational web interface powered by a backend AI agent. The agent uses carefully crafted system prompts to guide information gathering while maintaining conversational flexibility—allowing users to share unique, non-standard details that enhance analysis quality.

**Analysis Process:**
- AI-driven conversation collects comprehensive mortgage and financial data
- RAG (Retrieval Augmented Generation) queries market data from a vector database
- LLM generates personalized mortgage strategy recommendations

**Session Management:**
Users register and create Mortgage Advisor Sessions (chats). Each session maintains state in-memory for fast interactions, with full persistence to PostgreSQL enabling seamless session restoration across visits.

## 🛠️ Tech Stack

### Frontend
<p align="left">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="React" width="40" height="40"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="Redux" width="40" height="40"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" alt="TypeScript" width="40" height="40"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/materialui/materialui-original.svg" alt="Material-UI" width="40" height="40"/>
</p>

### Backend
<p align="left">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" alt="Node.js" width="40" height="40"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" width="40" height="40"/>
  <img src="https://avatars.githubusercontent.com/u/126733545?s=200&v=4" alt="LangChain" width="40" height="40"/>
  <img src="https://pbs.twimg.com/profile_images/1779523725128212480/8DலெsEZu_400x400.jpg" alt="Vectorize" width="40" height="40"/>
</p>

### Observability & Tooling
<p align="left">
  <img src="https://avatars.githubusercontent.com/u/126733545?s=200&v=4" alt="LangSmith" width="40" height="40"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg" alt="Docker" width="40" height="40"/>
</p>

---

## 🏗️ Architecture Details

### Frontend Technologies

**React + TypeScript**
Type-safe component architecture ensuring robust UI development and compile-time error detection.

**Redux Toolkit**
Centralized state management with the Chat Slice handling message flow, conversation state, and UI guidance throughout the mortgage advisory process.

**Material-UI**
Professional, accessible component library providing consistent UX across the application.

### Backend Technologies

**Node.js + Express**
RESTful API server handling authentication, chat sessions, and LLM orchestration.

**PostgreSQL**
Persistent data store for user accounts, chat sessions, messages, and mortgage scenarios. Enables seamless session restoration and chat history.

**LangChain**
Unified LLM interface for interacting with Anthropic Claude, providing flexible prompt chaining and model abstraction.

**LangSmith**
Production-grade observability platform tracking LLM requests, responses, token usage, and conversation flows for debugging and optimization.

**Prompt Templating System**
Custom prompt templates dynamically loaded with user data, steering conversations toward mortgage advisory best practices and comprehensive information gathering.

**Vectorize RAG Pipeline**
Vector database integration enabling retrieval of real UK mortgage market data. Daily data ingestion keeps recommendations current with market conditions.

**Prisma ORM**
Type-safe database client with schema management and migrations, ensuring database integrity and developer productivity.

---

## Development Tools - MCPs (Model Context Protocol)

This project uses several MCP servers to enhance Claude Code's capabilities during development. MCPs are configured in `.mcp.json` at the root of the project.

### Available MCPs

#### 1. **TypeScript Compilation MCP**
Provides TypeScript build and error analysis capabilities.

**Configuration:**
```json
"typescript-compilation": {
  "command": "node",
  "args": ["${TYPESCRIPT_COMPILER_MCP_PATH}/dist/index.js"]
}
```

**Features:**
- Run `yarn build` (tsc) and analyze compilation output
- Parse and categorize TypeScript errors by file, type, or severity
- Integrated directly into Claude Code workflow

**Usage:**
No additional setup required - works automatically when Claude Code needs to check TypeScript compilation.

---

#### 2. **Postgres MCP**
Direct PostgreSQL database access for queries, schema inspection, and analysis.

**Configuration:**
```json
"postgres": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-e", "DATABASE_URI",
    "crystaldba/postgres-mcp",
    "--access-mode=unrestricted"
  ],
  "env": {
    "DATABASE_URI": "postgresql://postgres:postgres@localhost:5433/mortgagemate_dev"
  }
}
```

**Features:**
- List schemas, tables, views, and database objects
- Execute SQL queries directly
- Explain query execution plans with cost estimates
- Analyze database health (indexes, connections, vacuum, etc.)
- View top queries by resource usage
- Recommend optimal indexes

**Usage:**
Ensure PostgreSQL is running (see Docker Compose section below). Claude Code can then query the database directly.

---

#### 3. **Browser Tools MCP**
Web browser automation and inspection for frontend development and debugging.

**Configuration:**
```json
"browser-tools": {
  "command": "npx",
  "args": ["@agentdeskai/browser-tools-mcp@latest"]
}
```

**Features:**
- Check browser console logs and errors
- Inspect network requests and errors
- Take screenshots of current browser state
- Get selected DOM elements
- Run accessibility, performance, SEO, and best practices audits
- Integrated debugger and audit modes

**Setup Requirements:**
1. **Install Chrome Extension:**
   - Install the [Browser Tools Chrome Extension](https://chromewebstore.google.com/detail/browser-tools/hmcgaeofkodnnfkkipdjkeenmopnnjpe)
   - The extension enables communication between Claude Code and your browser

2. **Start the Browser Tools Server:**
   ```bash
   npx @agentdeskai/browser-tools-server@latest
   ```
   - Run this in a separate terminal window
   - Keep it running while using browser tools
   - The server acts as a bridge between Claude Code and the browser extension

3. **Open Your Application:**
   - Navigate to `http://localhost:3000` in Chrome
   - The extension will connect to the server automatically

**Usage Example:**
```
User: "Check what errors are in my browser console for localhost:3000"
Claude: [Uses mcp__browser-tools__getConsoleErrors]
```

**Available Browser Tools:**
- `getConsoleLogs` - View all console output
- `getConsoleErrors` - View only error messages
- `getNetworkLogs` - View all network requests
- `getNetworkErrors` - View failed network requests
- `takeScreenshot` - Capture current browser state
- `getSelectedElement` - Inspect selected DOM element
- `runAccessibilityAudit` - Run accessibility checks
- `runPerformanceAudit` - Analyze page performance
- `runSEOAudit` - Check SEO best practices
- `runDebuggerMode` - Debug application issues

**Note:** If you see "Failed to discover browser connector server", ensure:
1. The browser tools server is running (`npx @agentdeskai/browser-tools-server@latest`)
2. Chrome extension is installed and enabled
3. You have navigated to the target URL in Chrome

---

### MCP Configuration File

All MCPs are configured in `.mcp.json` at the project root. This file is read by Claude Code to determine which tools are available during development.
