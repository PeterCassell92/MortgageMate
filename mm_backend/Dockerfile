FROM node:20-alpine

WORKDIR /app

# Copy package files from backend directory
COPY mm_backend/package.json mm_backend/yarn.lock ./mm_backend/

# Install dependencies
WORKDIR /app/mm_backend
RUN yarn install --frozen-lockfile

# Copy backend source code and shared models
WORKDIR /app
COPY mm_backend/ ./mm_backend/
COPY models/ ./models/

# Set working directory to backend for execution
WORKDIR /app/mm_backend

# Expose ports (app and debug)
EXPOSE 4321 9229

# Start development server with debugging
CMD ["node", "--inspect=0.0.0.0:9229", "-r", "ts-node/register", "src/index.ts"]