
# run docker compose 
docker compose -f docker-compose.dev.yml up -d

# run migration database 
docker compose -f docker-compose.dev.yml run --rm migrate up
