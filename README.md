# MortgageMate

A Tool for helping users make optimal mortgage decisions.

The inspiration for the project was a conversation I had with Claude asking it for mortgage advice. I find Claude useful in this field to myself but it took me knowing how to use Claude well to design the right prompt.

I want to help future me and potentially other people get to a good prompt so they can easily be presented with actionable data and an understanding of their best mortgage options.

## 🚀 Deployed Application

**Live App:** https://mortgagemate-ai.netlify.app/

**Backend API:** https://mortgagemate-backend.fly.dev/

## Method

To achieve good mortgage advice outcomes we need to make it as easy as possible for a user to generate a good prompt that describes their entire present mortgage situation.

### Data Gathering (front end)

I've wrapped a LLM chat bot interface to get user data into a TypeScript React full stack web application.

### Data Storage

I've then structured that data into a PostgreSQL database so that key information can be retrieved. We don't store whole prompts because we want to generate fresh prompts each time such that we use the latest prompt templates with the best mortgage advice outcomes.

I have stored data that will apply to most mortgage scenarios in the database though there will be scope for additional data to be stored on each mortgage scenarios for optimal results

### Idea of this project is:

## A) To develop a usable product fast by only vibe-coding (minimal hands-on-code)

This project is not for commercial use so, though my code standards will be kept high, I'm looking to develop an MVP-like product at pace.

## B) To leverage Anthropic API / OpenAI API endpoints

To understand API integrations for Anthropic at a small-scale. both from a cost and performance perspective. I am most used to using LLMs in a desktop/cli capacity so it will be a good learning experience to get hands-on with the APIs.

## C) To showcase prompt-engineering / RAG for ensuring the application is given suitable context in which to reason

I want to use rules-based coding to create good LLM prompts, a principle that applies more broadly to apps that I am interested in building. This lowers token use by optimising the prompts, makes results more consistent and keeps the context window clear for maximal reasoning.

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
