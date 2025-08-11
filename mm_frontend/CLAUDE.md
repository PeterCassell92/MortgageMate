# MortgageMate Frontend

## Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7.x
- **UI Library**: Material-UI (MUI) v7
- **Styling**: Emotion (MUI's styling solution)
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
3. Navigate to `mm_frontend/`
4. Run `yarn install` - Volta will automatically use the correct Node/Yarn versions

## Project Structure
```
mm_frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API calls and external services
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── App.tsx        # Main app component
├── public/            # Static assets
├── vite.config.ts     # Vite configuration
└── package.json       # Dependencies and scripts
```

## Environment Variables
All frontend environment variables must use the `VITE_` prefix to be accessible in the browser:
- `VITE_API_BASE_URL`: Backend API URL (http://localhost:4321)
- `VITE_APP_NAME`: Application name (MortgageMate)
- `VITE_NODE_ENV`: Environment (development/production)
- `VITE_ENABLE_DEBUG`: Enable debug features in development

## Development Commands
- `yarn dev`: Start development server on port 3000
- `yarn build`: Build for production
- `yarn preview`: Preview production build
- `yarn lint`: Run ESLint (to be added)
- `yarn type-check`: Run TypeScript compiler check

## Key Features to Implement

### 1. Authentication Flow
- Login/Signup pages with Material-UI forms
- JWT token management
- Protected routes

### 2. Conversational Data Capture
- Chat interface for mortgage data collection
- Natural language input processing
- Progressive data gathering without fixed order
- Real-time validation and feedback

### 3. Dashboard
- User's mortgage scenarios overview
- Create new scenario button
- Edit existing scenarios
- View analysis results

### 4. Mortgage Scenario Management
- Form/chat hybrid for data entry
- Support for Fixed/Variable/Tracker mortgage types
- Data fields:
  - Monthly payments
  - Term length  
  - Initial loan size
  - Overpayment history
  - Initial house value
  - Product cost
  - Exit fees (sliding scale)

### 5. Analysis Results Display
- Templates for LLM analysis output
- Visualizations for savings/losses over time
- Actionable recommendations
- Export functionality

## API Integration
- Base URL from `VITE_API_BASE_URL` environment variable
- RESTful endpoints to Astro backend
- Authentication headers with JWT tokens
- Error handling and loading states

## Material-UI Theme
- Custom theme configuration for MortgageMate branding
- Responsive design for mobile/desktop
- Dark/light mode support (future enhancement)

## State Management
- React hooks for local state
- Context API for global state (user auth, themes)
- Consider Zustand for complex state management if needed

## Development Notes
- Use TypeScript strict mode
- Follow React best practices (hooks, functional components)
- Implement proper error boundaries
- Add loading states for all async operations
- Ensure accessibility (a11y) compliance
- Use the available TypeScript Compiler MCP tool to check if changes have resulted in valid Typescript
- Do not offer to run the dev server, the developer will always be running that anyway.
- When making UI changes, do offer to use playwright to navigate to the page and screenshot pages to diagnose issues / measure success.