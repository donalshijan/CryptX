Just remember to use the command 
docker run --network my-network --name postgresdb -p 5433:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres my-postgres-image
To run the postgres container, some of these environment variables must be set or the container won't let run psql commands in it's terminal