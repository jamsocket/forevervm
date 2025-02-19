# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile
# Use a Node.js image
FROM node:22.12-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy the package files
COPY javascript/mcp-server/package*.json ./
COPY javascript/package*.json ../

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm install --ignore-scripts && npm run build --workspaces

# Copy the source code
COPY javascript/mcp-server/src ./src
COPY javascript/mcp-server/tsconfig.json ./

# Build the project
RUN npm run build

# Set the working directory for the final stage
FROM node:22-alpine AS release
WORKDIR /app

# Copy built files from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
RUN npm ci --omit=dev

# Set environment variables
ENV NODE_ENV=production

# Expose necessary ports (if known)
# EXPOSE 3000 # Uncomment and set the correct port if needed

# Command to run the application
ENTRYPOINT ["node", "build/index.js"]
