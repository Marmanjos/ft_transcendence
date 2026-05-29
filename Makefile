COMPOSE = docker-compose -f srcs/docker-compose.yml

create:
	@printf '%s\n' \
		'PORT=3001' \
		'DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres?sslmode=require' \
		'SESSION_SECRET=change-me-in-production' > srcs/backend/.env

	@printf '%s\n' \
		'VITE_API_BASE_URL=http://localhost:3001' > srcs/frontend/.env

status:
	@echo '\nIMAGES:'
	@docker images
	@echo '\nNETWORKS:'
	@docker networks ls
	@echo '\nCONTAINERS'
	@docker ps


all:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v --rmi all

fclean: clean
	@rm -r -rf srcs/.env secrets/

re: fclean all

.PHONY: create status all down clean fclean re