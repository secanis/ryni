.PHONY: up down logs test test-pb build lint-helm test-helm build-images keep-kind clean-kind

HELM_CHART   := helm/ryni
KIND_CLUSTER := ryni-test
SCRIPTS_DIR  := scripts
TAG          ?= v0.1.0
REPO_OWNER   ?= secanis
PB_IMAGE     := docker.io/$(REPO_OWNER)/ryni-pocketbase
FE_IMAGE     := docker.io/$(REPO_OWNER)/ryni-frontend

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

lint-helm: ## helm lint + helm template render check
	@$(SCRIPTS_DIR)/test-helm.sh --lint-only

test-helm: ## Full end-to-end test: build images, kind cluster, install chart, smoke test
	@TAG=$(TAG) PB_IMAGE=$(PB_IMAGE) FE_IMAGE=$(FE_IMAGE) $(SCRIPTS_DIR)/test-helm.sh

build-images: ## Build PocketBase and frontend images locally
	@TAG=$(TAG) PB_IMAGE=$(PB_IMAGE) FE_IMAGE=$(FE_IMAGE) $(SCRIPTS_DIR)/test-helm.sh --build-only

keep-kind: ## Run the full test but keep the kind cluster for debugging
	@TAG=$(TAG) PB_IMAGE=$(PB_IMAGE) FE_IMAGE=$(FE_IMAGE) $(SCRIPTS_DIR)/test-helm.sh --keep-kind

clean-kind: ## Delete the test kind cluster if it still exists
	-kind delete cluster --name $(KIND_CLUSTER)
