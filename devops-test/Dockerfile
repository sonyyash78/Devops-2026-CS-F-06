# Use official lightweight Node.js Alpine base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies (if any are added)
RUN npm install --omit=dev

# Copy application files
COPY server.js ./
COPY script.js ./
COPY style.css ./
COPY index.html ./
COPY success.html ./
COPY log.json ./

# Ensure unprivileged node user has write access to working directory and logs
RUN chown -R node:node /app

# Use built-in unprivileged node user for security
USER node

# Expose server port
EXPOSE 3000

# Health check to ensure the container is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]
