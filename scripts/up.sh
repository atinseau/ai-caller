#/bin/bash

export $(grep -v '#' ./apps/api/.env | xargs)

docker compose \
    --env-file ./apps/api/.env \
    -f docker-compose.yml \
    up -d

echo "N8N is running at http://localhost:${N8N_PORT}"
