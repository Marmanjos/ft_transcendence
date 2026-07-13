DOCKER = docker
COMPOSE = $(DOCKER) compose -f srcs/docker-compose.yml
PROJECT_URL = https://localhost
DATA_DIRS = /home/$(USER)/data/backend /home/$(USER)/data/database
CERTS_DIR = secrets

all: setup
	$(COMPOSE) build --no-cache --pull
	$(COMPOSE) up -d --force-recreate

create: setup
	@printf '%s\n' \
		'PORT=3001' \
		'DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres?sslmode=require' \
		'SESSION_SECRET=change-me-in-production' > srcs/backend/.env

	@printf '%s\n' \
		'VITE_API_BASE_URL=https://localhost:3001' > srcs/frontend/.env
	@echo "✓ Environment files created"

setup:
	@mkdir -p $(DATA_DIRS)
	@mkdir -p $(CERTS_DIR)
	@if [ ! -f $(CERTS_DIR)/localhost.key ] || [ ! -f $(CERTS_DIR)/localhost.crt ]; then \
		openssl req -x509 -newkey rsa:2048 -nodes -out $(CERTS_DIR)/localhost.crt -keyout $(CERTS_DIR)/localhost.key -days 365 -subj "/CN=localhost"; \
		chmod 644 $(CERTS_DIR)/localhost.crt $(CERTS_DIR)/localhost.key; \
		echo "✓ SSL certificates generated"; \
	fi

status:
	@echo '\nIMAGES:'
	@$(DOCKER) images
	@echo '\nNETWORKS:'
	@$(DOCKER) network ls
	@echo '\nCONTAINERS'
	@$(DOCKER) ps

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v --rmi all
	$(DOCKER) builder prune -f
	$(DOCKER) system prune -f

fclean: clean
	@rm -rf srcs/.env $(CERTS_DIR)/

re: fclean all

open:
	@if command -v google-chrome >/dev/null 2>&1; then \
		google-chrome --incognito "$(PROJECT_URL)" >/dev/null 2>&1 & \
	else \
		echo "Error: Google Chrome not found. Please install Chrome to open the project."; \
		exit 1; \
	fi

.PHONY: create status all down clean fclean re open