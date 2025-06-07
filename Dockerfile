# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Install dependencies (including peer dependencies)
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy the entire source code
COPY . .

# Build the NestJS application
RUN npm run build

# Stage 2: Set up the production image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install only production dependencies and peer dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --frozen-lockfile

# Copy the built application from the builder stage
COPY --from=builder /app/dist /app/dist

# Create a non-root user for security reasons
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port the app will run on
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/main.js"]
