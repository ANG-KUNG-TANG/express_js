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

diff --git a/readme.md b/readme.md
index 1e058757a28a1e067778cc11bed24162663ab5cb..52bb41e3205f9754021182be78bfb4296ea54f48 100644
--- a/readme.md
+++ b/readme.md
@@ -168,25 +168,51 @@ pnpm install
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
+
+
+---
+
+# 📚 12. Documentation
+
+- Project architecture and module map: `docs/PROJECT_DOCUMENTATION.md`
+- API endpoints reference: `docs/API_REFERENCE.md`
+- Database optimization + rate-limit audit: `docs/DB_RATE_LIMIT_AUDIT.md`
+
+---
+
+# 🛡️ 13. Rate Limiting
+
+The API uses `express-rate-limit` for baseline abuse protection:
+
+- Global API limiter on `/api`
+- Stricter auth limiter on `/api/auth` login/register/refresh/logout
+- Password reset limiter on `/api/auth/forgot-password` and `/api/auth/reset-password`
+
+Optional environment variables:
+
+```bash
+RATE_LIMIT_API_MAX=300
+RATE_LIMIT_AUTH_MAX=20
+```


COMPOSE_DEV  = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml
IMAGE        = baw1463i/ielts-js:latest

# ── Dev ───────────────────────────────────────────────────────────────────────
dev-up:
	$(COMPOSE_DEV) up

dev-up-d:
	$(COMPOSE_DEV) up -d

dev-down:
	$(COMPOSE_DEV) down

dev-restart:
	$(COMPOSE_DEV) restart app

dev-logs:
	$(COMPOSE_DEV) logs -f app

# ── Prod (local image build + push) ──────────────────────────────────────────
build:
	docker build -f Dockerfile.prod -t $(IMAGE) .

push: build
	docker push $(IMAGE)

# ── Prod (on server: pull + up) ───────────────────────────────────────────────
prod-pull:
	docker pull $(IMAGE)

prod-up: prod-pull
	$(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f app

# ── Utility ───────────────────────────────────────────────────────────────────
ps:
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

prune:
	docker system prune -f