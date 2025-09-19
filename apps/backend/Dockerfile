FROM node:18-alpine

WORKDIR /app

# Copy root package.json
COPY package*.json ./

# Copy packages
COPY packages/ ./packages/

# Install root dependencies
RUN npm install

# Build types package
WORKDIR /app/packages/types
RUN npm install && npm run build

# Copy backend app
WORKDIR /app
COPY apps/backend/ ./apps/backend/

# Move to backend directory and install dependencies
WORKDIR /app/apps/backend
RUN npm install

# Copy environment file
COPY apps/backend/.env.example ./apps/backend/.env

# Build the application
RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "start:prod"]