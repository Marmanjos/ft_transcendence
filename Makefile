COMPOSE = docker-compose -f srcs/docker-compose.yml

create:
	@mkdir -p secrets
	@printf '%s\n' \
		'DOMAIN_NAME=' \
		'DATA_BASE_NAME=' \
		'DATA_BASE_USER=' > srcs/.env
	@openssl rand -hex 16 > secrets/admin_passwd.txt

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

PHONY: create status all down clean fclean re