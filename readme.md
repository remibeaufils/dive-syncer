# Configure project

1. Create .env file

`cp .env.example .env`

2. Set value in .env file

`...`

3. Create docker-init-mongo.js file

`cp docker-init-mongo.js.example docker-init-mongo.js`

4. Set value in docker-init-mongo.js file

`...`

5. Create merchants.js file

`cp merchants.js.example merchants.js`

6. Set value in merchants.js file

`...`

7. Add Google Cloud service account *privatekey.json* file to the root of the project

`...`

8. Start container [in background]

`docker-compose up [-d]`

# Run Project

`node src/index.js merchant_id [source_name...]`

# Docker commands

Stop all running containers

`docker-compose stop`

Stop only specific service running in container

`docker-compose stop database`

Remove all stopped containers declared in docker-compose file

`docker-compose rm [-f]`

Remove volumes attached to the container

`docker-compose rm -v`

List containers related to images declared in docker-compose file.

`docker-compose ps`

List all running containers in docker engine

`docker ps -a`

Remove specific stopped container

`docker rm container_id`