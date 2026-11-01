# ─────────────────────────────────────────────────────────────
# Delly Gold — Docker helpers
# Auto-detects docker compose v2 vs docker-compose v1
# Usage: make up | make down | make logs | make rebuild
# ─────────────────────────────────────────────────────────────

# Prefer Docker Compose v2 plugin (required on Docker Engine 24+).
# Legacy `docker-compose` v1 hits KeyError: 'ContainerConfig' when recreating containers.
COMPOSE_V2 := $(shell docker compose version > /dev/null 2>&1 && echo yes)
COMPOSE := $(if $(filter yes,$(COMPOSE_V2)),docker compose,docker-compose)

.PHONY: up down logs restart rebuild shell status clean fix-compose up-plain install-compose help

## Start containers in background (build if needed)
up:
	@if [ "$(COMPOSE_V2)" != "yes" ]; then \
		echo "⚠️  docker compose v2 not found."; \
		echo "   Install: sudo ./scripts/install-compose-v2.sh"; \
		echo "   Or run without Compose: make up-plain"; \
		exit 1; \
	fi
	@sh scripts/ensure-data.sh
	$(COMPOSE) up -d --build

## Start with plain Docker (no Compose plugin required)
up-plain:
	sh scripts/docker-up.sh

## Install Docker Compose v2 plugin on Linux
install-compose:
	sh scripts/install-compose-v2.sh

## Fix ContainerConfig / stale-container errors, then start fresh
fix-compose:
	-docker rm -f delly-gold 2>/dev/null
	$(COMPOSE) down --remove-orphans 2>/dev/null || true
	@sh scripts/ensure-data.sh
	$(COMPOSE) up -d --build

## Stop and remove containers
down:
	$(COMPOSE) down

## Follow logs
logs:
	$(COMPOSE) logs -f

## Restart app container
restart:
	$(COMPOSE) restart app

## Full rebuild — no cache
rebuild:
	$(COMPOSE) down
	@sh scripts/ensure-data.sh
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d

## Open shell in running container
shell:
	$(COMPOSE) exec app sh

## Show container status
status:
	$(COMPOSE) ps

## Stop containers (host ./data is kept — DB + uploads safe)
clean:
	$(COMPOSE) down

## Show this help
help:
	@echo ""
	@echo "  Delly Gold — Docker commands"
	@echo "  ─────────────────────────────"
	@grep -E '^## ' Makefile | sed 's/## /  /'
	@echo ""
