.PHONY: dev prod build stop logs clean

# Development
dev:
	docker compose up --build

dev-bg:
	docker compose up --build -d

# Production (with nginx)
prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Build images only
build:
	docker compose build

# Stop all containers
stop:
	docker compose down

# View logs
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Clean everything (containers + images + volumes)
clean:
	docker compose down --rmi all --volumes --remove-orphans

# Restart a single service
restart-backend:
	docker compose restart backend

restart-frontend:
	docker compose restart frontend

# Shell into container
shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

# Health check
health:
	curl -s http://localhost:4000/health | python -m json.tool
