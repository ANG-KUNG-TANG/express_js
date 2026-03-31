FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

# Production deps only — smaller image
RUN pnpm install --prod --no-frozen-lockfile

# Copy source code into image (friend doesn't need to mount anything)
COPY . .

# Remove sensitive files if accidentally copied
RUN rm -f .env

EXPOSE 3000

CMD ["node", "src/server.js"]