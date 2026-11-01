.PHONY: up down logs test test-pb build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

test:
	cd frontend && npm test

test-pb:
	cd pocketbase && npm test

build:
	cd frontend && npm run build
