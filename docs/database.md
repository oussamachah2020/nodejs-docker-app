## Overview

Coros uses a Docker-based deployment pipeline with GitHub Actions for CI/CD. The API is built into a Docker image, pushed to Docker Hub, and deployed to a VPS on every push to `main`.

```
Push to main
  → GitHub Actions builds the API image
  → Pushes to Docker Hub (oussama202/coros-api)
  → SSHs into VPS
  → Pulls new image
  → Restarts API container only
  → Postgres & Redis untouched
```

---

## Stack

|Service|Image|Notes|
|---|---|---|
|API|oussama202/coros-api:latest|Built and pushed via CI/CD|
|Postgres|postgres:16-alpine|Official image, never rebuilt|
|Redis|redis:7-alpine|Official image, never rebuilt|

---

## Prerequisites

### Local Machine

- Docker Desktop
- pnpm
- SSH key pair generated locally (`~/.ssh/id_ed25519`)

### VPS (Hostinger)

- Ubuntu VPS
- SSH access on port `52`
- Docker installed

---

## Infrastructure Setup

### 1. Generate SSH Key Pair (Local Machine)

```bash
ssh-keygen -t ed25519 -C "github-actions-coros"
```

Copy the public key to the VPS:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 52 youruser@yourvpsip
```

### 2. Install Docker on VPS

SSH into the VPS:

```bash
ssh -p 52 youruser@yourvpsip
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Add user to docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Create App Directory on VPS

```bash
mkdir -p /opt/coros
cd /opt/coros
```

### 4. Create Production `docker-compose.yml`

Create `/opt/coros/docker-compose.yml`:

```yaml
services:
  api:
    image: oussama202/coros-api:latest
    container_name: coros-api
    restart: unless-stopped
    env_file: .env
    ports:
      - 3000:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    container_name: coros-db
    restart: unless-stopped
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: coros-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--pass", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 5. Create `.env` on VPS

Create `/opt/coros/.env` with production values:

```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=coros
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=coros_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_strong_redis_password

# JWT
JWT_ACCESS_SECRET=your_strong_access_secret
JWT_REFRESH_SECRET=your_strong_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=3000
```

> ⚠️ Never commit `.env` to version control.

### 6. First Deploy

```bash
cd /opt/coros
sudo docker compose up -d
```

This will pull all images and initialize the database. Postgres and Redis volumes are created once and never wiped in normal operations.

---

## CI/CD Pipeline

### GitHub Actions Workflow

Located at `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build & push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/coros-api:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/coros-api:${{ github.sha }}

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            cd /opt/coros
            sudo docker compose pull api
            sudo docker compose up -d
            sudo docker image prune -f
```

### GitHub Secrets

Add these in your repo under **Settings → Secrets → Actions**:

|Secret|Value|
|---|---|
|`DOCKERHUB_USERNAME`|Your Docker Hub username|
|`DOCKERHUB_TOKEN`|Docker Hub access token (not your password)|
|`VPS_HOST`|VPS IP address|
|`VPS_USER`|VPS SSH username|
|`VPS_SSH_KEY`|Local machine private key (`~/.ssh/id_ed25519`)|
|`VPS_PORT`|`52`|

> ⚠️ `VPS_SSH_KEY` must be the **private key** from your **local machine**, not the VPS. The corresponding public key must be in `~/.ssh/authorized_keys` on the VPS.

---

## Image Tagging Strategy

Every build produces two tags:

|Tag|Purpose|
|---|---|
|`:latest`|Always points to the most recent build|
|`:git-sha`|Pinned to a specific commit — used for rollbacks|

### Rollback

To roll back to a previous version on the VPS:

```bash
cd /opt/coros

# Edit docker-compose.yml and change the image tag
# oussama202/coros-api:latest → oussama202/coros-api:<git-sha>

sudo docker compose up -d
```

---

## Database

Postgres data lives in a Docker volume on the VPS disk. It is initialized once on first `docker compose up` and persists across all future deployments.

### The only times you touch the DB:

- Postgres version upgrade (planned, rare)
- Restore from backup after a disaster

### Backup (manual)

```bash
docker exec coros-db pg_dump -U coros coros_db > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
cat backup.sql | docker exec -i coros-db psql -U coros -d coros_db
```

---

## Common Commands

```bash
# Check running containers
sudo docker compose ps

# View API logs
sudo docker compose logs api -f

# View DB logs
sudo docker compose logs postgres

# Restart API only
sudo docker compose restart api

# Pull latest image manually
sudo docker compose pull api && sudo docker compose up -d

# Remove unused images
sudo docker image prune -f
```

---

## Troubleshooting

### API cannot connect to database

- Make sure `POSTGRES_HOST=postgres` (service name, not localhost)
- Make sure `POSTGRES_PORT=5432` (internal container port, not 5433)
- Check DB is healthy: `sudo docker compose ps`

### SSH authentication failed in CI

- Ensure `VPS_SSH_KEY` contains the **local machine private key** including `-----BEGIN OPENSSH PRIVATE KEY-----` header
- Ensure the corresponding public key is in `~/.ssh/authorized_keys` on the VPS
- Ensure `VPS_PORT` secret is set to `52`

### Docker permission denied

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Prettier module not found in production build

- `prettier` is a runtime dependency of `@react-email/render`
- Fix: copy `apps/api/node_modules` in the Dockerfile runner stage

```dockerfile
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
```