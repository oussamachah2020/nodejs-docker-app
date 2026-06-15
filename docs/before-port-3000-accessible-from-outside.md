
## Overview

Nginx sits in front of the API container and acts as a reverse proxy. It receives all incoming HTTP traffic on port 80 and forwards it to the API container on port 3000 internally.

```
Internet
  → VPS port 80
    → Nginx container
      → API container (port 3000, internal only)
```

This means port 3000 is never exposed to the outside world — only Nginx is publicly accessible.

---

## Why a Reverse Proxy?

|Without Nginx|With Nginx|
|---|---|
|API exposed directly on port 3000|API hidden behind port 80|
|No request buffering|Nginx buffers slow clients|
|Hard to add SSL later|Easy to plug in SSL (Let's Encrypt)|
|Hard to host multiple services|Route by path or domain|
|No rate limiting|Can add rate limiting at Nginx level|

---

## Directory Structure

```
/opt/coros/
├── docker-compose.yml
├── .env
└── nginx/
    └── default.conf     ← Nginx config
```

---

## Setup

### 1. Create the Nginx config directory

```bash
mkdir -p /opt/coros/nginx
```

### 2. Create the config file

```bash
nano /opt/coros/nginx/default.conf
```

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Config explained line by line

|Line|Purpose|
|---|---|
|`listen 80`|Nginx listens for incoming HTTP traffic on port 80|
|`proxy_pass http://api:3000`|Forwards requests to the API container — `api` is the Docker service name|
|`proxy_http_version 1.1`|Required for WebSocket and keep-alive connections|
|`Upgrade` / `Connection` headers|Enables WebSocket proxying|
|`X-Real-IP`|Passes the real client IP to the API instead of the Nginx container IP|
|`X-Forwarded-For`|Appends the client IP to the forwarding chain|
|`proxy_cache_bypass`|Prevents caching of upgrade requests|

> `http://api:3000` works because both Nginx and the API are on the same Docker network — Docker resolves `api` to the API container's internal IP automatically.

---

## Docker Compose Changes

Two key changes were made to `docker-compose.yml`:

### Nginx service added

```yaml
nginx:
  image: nginx:alpine
  container_name: coros-nginx
  restart: unless-stopped
  ports:
    - 80:80
  volumes:
    - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
  depends_on:
    - api
```

The config file is mounted as a volume — no custom image needed, just the official `nginx:alpine`.

### API ports changed from `ports` to `expose`

```yaml
# Before — port 3000 accessible from outside
ports:
  - 3000:3000

# After — port 3000 internal only
expose:
  - 3000
```

|Directive|Behavior|
|---|---|
|`ports`|Maps container port to host — accessible from outside the VPS|
|`expose`|Makes port available only within the Docker network|

This means the API is no longer reachable directly at `http://yourvpsip:3000` — all traffic must go through Nginx on port 80.

---

## Apply the Changes

```bash
cd /opt/coros
sudo docker compose up -d
```

Docker Compose will start the Nginx container and keep everything else running.

Verify all containers are up:

```bash
sudo docker compose ps
```

Expected output:

```
NAME          IMAGE                         STATUS
coros-nginx   nginx:alpine                  Up
coros-api     oussama202/coros-api:latest   Up
coros-db      postgres:16-alpine            Up (healthy)
coros-redis   redis:7-alpine                Up (healthy)
```

Test the proxy:

```bash
curl http://yourvpsip/api/v1
```

---

## Common Commands

```bash
# View Nginx logs
sudo docker compose logs nginx -f

# Reload Nginx config without downtime
sudo docker exec coros-nginx nginx -s reload

# Test Nginx config for syntax errors
sudo docker exec coros-nginx nginx -t
```

---

## Adding SSL Later

When you have a domain pointed to the VPS, adding SSL with Let's Encrypt is straightforward:

1. Add `certbot` to the setup
2. Obtain a certificate for your domain
3. Update `default.conf` to listen on 443 and redirect 80 → 443

The current setup is already structured to make this a clean upgrade — no architectural changes needed.