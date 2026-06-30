DOCKER = docker
COMPOSE = $(DOCKER) compose -f srcs/docker-compose.yml
PROJECT_URL = http://localhost

all:
	$(COMPOSE) build --no-cache --pull
	$(COMPOSE) up -d --force-recreate

create:
	@printf '%s\n' \
		'PORT=3001' \
		'DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres?sslmode=require' \
		'SESSION_SECRET=change-me-in-production' > srcs/backend/.env

	@printf '%s\n' \
		'VITE_API_BASE_URL=http://localhost:3001' > srcs/frontend/.env

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
	@rm -rf srcs/.env secrets/

re: fclean all

open:
	@if command -v firefox >/dev/null 2>&1; then \
		firefox --private-window "$(PROJECT_URL)" >/dev/null 2>&1 & \
	elif command -v google-chrome >/dev/null 2>&1; then \
		google-chrome --incognito "$(PROJECT_URL)" >/dev/null 2>&1 & \
	elif command -v chromium >/dev/null 2>&1; then \
		chromium --incognito "$(PROJECT_URL)" >/dev/null 2>&1 & \
	elif command -v chromium-browser >/dev/null 2>&1; then \
		chromium-browser --incognito "$(PROJECT_URL)" >/dev/null 2>&1 & \
	else \
		echo "No supported browser found. Open $(PROJECT_URL) manually."; \
		exit 1; \
	fi

.PHONY: create status all down clean fclean re open