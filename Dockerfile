# =========================================================================
# Stage 1: Builder
# This stage installs all dependencies (including dev) and builds the
# TypeScript source code into JavaScript.
# =========================================================================
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker's layer caching.
# This step only re-runs if these files change.
COPY package*.json ./
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Build the TypeScript project into JavaScript in the /dist directory
RUN npm run build

# =========================================================================
# Stage 2: Production
# This stage creates the final, lean image. It starts from a fresh Node.js
# base and only copies the necessary production dependencies and the
# compiled JavaScript from the 'builder' stage.
# =========================================================================
FROM node:20-alpine AS production

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json again
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy the built application from the 'builder' stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the application will run on. This is documentation; the actual
# port mapping is done in docker-compose.yml.
# We will use an ARG and ENV to make this configurable.
ARG PORT=1923
ENV PORT=${PORT}
EXPOSE ${PORT}

# The command to run your application
CMD ["node", "dist/server.js"]