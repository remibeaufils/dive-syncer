Start container

`docker-compose up`

Start container in background

`docker-compose up -d`

Stop container

`docker-compose stop`

Stop only specific service

`docker-compose stop database`

Remove volumes attached to the container

`docker-compose rm -v`

Remove specific container by specifying the container name

`docker-compose rm -f data`

----------------------------------------------

Run app

`node src/index.js`
