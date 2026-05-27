FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache git

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Production deps only — smaller image
RUN pnpm install --prod --no-frozen-lockfile

# Copy source code into image
COPY . .

# Remove sensitive files if accidentally copied
RUN rm -f .env

EXPOSE 3000

CMD ["node", "src/server.js"]