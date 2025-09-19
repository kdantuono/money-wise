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

# Copy web app
WORKDIR /app
COPY apps/web/ ./apps/web/

# Move to web directory and install dependencies
WORKDIR /app/apps/web
RUN npm install

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]