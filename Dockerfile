FROM node:20-alpine

WORKDIR /app

# 🔥 Install git (THIS FIXES YOUR ERROR)
RUN apk add --no-cache git

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy rest of project
COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev"]