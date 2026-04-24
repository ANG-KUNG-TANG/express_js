# 🚀 Express App Setup Guide

A full-stack Express-based application with support for local development and Dockerized deployment.

---

# 📦 1. Prerequisites

Ensure the following tools are installed:

* Node.js (v18+ recommended)
* pnpm
* Docker (optional)

---

# ⚡ 2. Local Development (Recommended)

Run the application directly for the fastest workflow.

## Install dependencies

```bash
pnpm install
```

## Setup environment variables

```bash
cp .env.example .env
```

Fill in required values inside `.env`.

## Start development server

```bash
pnpm run dev
```

* App runs on: [http://localhost:3000](http://localhost:3000) (or configured port)
* Hot reload enabled

---

# 🧠 3. Development Workflow

```bash
# Start
pnpm run dev

# Stop
CTRL + C
```

Reinstall dependencies only when:

* New packages are added
* package.json changes

```bash
pnpm install
```

---

# 🐳 4. Docker (Development)

```bash
docker-compose -f docker-compose.dev.yml up --build
```

* Live code mounting enabled
* No rebuild needed for code changes

Stop containers:

```bash
docker-compose -f docker-compose.dev.yml down
```

---

# 📦 5. Production (Docker)

```bash
# Build image
docker build -f Dockerfile.prod -t YOUR_DOCKERHUB_USERNAME/express-app:latest .

# Push image
docker push YOUR_DOCKERHUB_USERNAME/express-app:latest
```

Run production:

```bash
docker-compose up
```

---

# 👥 6. Sharing Setup

## First-time setup

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

cp .env.example .env
# Fill values

docker-compose up
```

## Update to latest version

```bash
docker-compose pull
docker-compose up
```

---

# 📁 7. Project Structure

| File                   | Purpose               | Commit |
| ---------------------- | --------------------- | ------ |
| Dockerfile.dev         | Development container | YES    |
| Dockerfile.prod        | Production image      | YES    |
| docker-compose.dev.yml | Dev environment       | YES    |
| docker-compose.yml     | Production setup      | YES    |
| .env.example           | Template              | YES    |
| .env                   | Secrets               | NO     |

---

# 🔐 8. Environment Variables

* Store sensitive data in `.env`
* Never commit `.env`

---

# 🧩 9. Common Commands

```bash
pnpm run dev
pnpm install
docker-compose up
docker-compose down
```

---

# ⚠️ 10. Troubleshooting

### Dependency issues

```bash
pnpm install
```

### Port conflict

* Change port in `.env`

### Docker issues

```bash
docker-compose down
docker-compose up --build
```

---

# 🎯 11. Best Practices

* Use pnpm for development speed
* Use Docker for consistency
* Keep secrets secure
* Build production images only when stable

---

# 📌 Summary

| Use Case    | Approach     |
| ----------- | ------------ |
| Development | pnpm run dev |
| Consistency | Docker dev   |
| Sharing     | Docker prod  |
