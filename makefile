COMPOSE_DEV  = docker compose -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.prod.yml
IMAGE        = baw1463i/ielts-js:latest

# ── Dev (Dockerfile.dev — source mounted, nodemon) ───────────────────────────
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

dev-logs-redis:
	$(COMPOSE_DEV) logs -f redis

dev-shell:
	$(COMPOSE_DEV) exec app sh

# Run when you add/remove packages (rebuilds node_modules in container)
dev-rebuild:
	$(COMPOSE_DEV) down
	$(COMPOSE_DEV) build --no-cache
	$(COMPOSE_DEV) up -d

# ── Prod build + push (run on YOUR machine) ───────────────────────────────────
build:
	docker build -f Dockerfile -t $(IMAGE) .

push: build
	docker push $(IMAGE)

# ── Prod deploy (run on SERVER) ───────────────────────────────────────────────
prod-pull:
	docker pull $(IMAGE)

prod-up: prod-pull
	$(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE_PROD) down

prod-restart:
	$(COMPOSE_PROD) restart app

prod-logs:
	$(COMPOSE_PROD) logs -f app

prod-shell:
	$(COMPOSE_PROD) exec app sh

# ── Utility ───────────────────────────────────────────────────────────────────
ps:
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

prune:
	docker system prune -f

.PHONY: dev-up dev-up-d dev-down dev-restart dev-logs dev-logs-redis dev-shell \
        dev-rebuild build push prod-pull prod-up prod-down prod-restart \
        prod-logs prod-shell ps prune