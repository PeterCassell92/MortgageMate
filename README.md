# MortgageMate

A Tool for obtaining Mortgage Advice from a powerful agentic mortgage advisor, MortgageMate AI.

Online tools already in existance such as CompareTheMarket to give you available mortgage options on the market, and there are many mortgage calculators out there but how do you strategise and select the best option for your unique situation? With a mortgage advisor to understand all aspects of your situation and combine that with the market options you can make optimal decisions.

MortgageMate's edge comes from it's ability to be able to learn every aspect of your situation, including legal clauses from your existing mortgage documents & complicated exit fees which helps strategise both current and future options in order to optimise the timing of your next mortgaging move.

## 🚀 Deployed Application

**Live App:** https://mortgagemate-ai.netlify.app/

**Backend API:** https://mortgagemate-backend.fly.dev/

## Method

Tha aim is to provide a Web Front End as an interface to a backend AI Agent. That agent is configured with system prompts and imperatives that drive it towards obtaining the information from the user that it needs to make an analysis, whilst also leaving the conversation free-form enough that the user can offer specific, non-standard, information that can be considered in the analysis.

The analysis aims to provide the user with a sensible strategy to meet their goals and uses RAG to retrieve (presently spoofed) market data about available mortgage offerings.

A user can register and begin a Mortgage Advisor Session ( a Chat). Each Mortgage Advisor Session is stored in memory on the backend and then it is backed up a PostgreSQL database so that the chat session can be restored.

### Front End

**React** Frontend using TypeScript for Type Safety.
**Redux** for state management. The Chat Slice is the critical front end slice that sends user messages to the backend, stores the chat state so that the front end can guide the user through the conversation.

### Backend

**PostgreSQL** as a data store for chat session data, enabling chats from previous sessions to be restored and continued.
**LangChain Integration** for interacting with LLM models, presently set to be Anthropic Claude.
**Prompt Templating** allows a custom set of prompts to be loaded with user data to steer the agent towards mortgage advisor industry best practices and to steer the user toward useful analysis.
**RAG from VectorStore** RAG Pipeline set up in Vectorize can perform a daily run of UK market data retrieval. Vectorize implementation within the backend allows the LLM to have access to this vectorstore.
**Prisma** Prisma is used to ensure the database conforms to a known schema and migrations are handled in a structured way.

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
