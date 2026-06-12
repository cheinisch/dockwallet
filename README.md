# OwnPass

![Docker Image Version](https://img.shields.io/docker/v/cheinisch/ownpass?sort=semver&label=version&color=blue)
![Docker Pulls](https://img.shields.io/docker/pulls/cheinisch/ownpass)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/cheinisch/ownpass/cicd.yml?label=build)
![License](https://img.shields.io/github/license/cheinisch/ownpass)

Self-hosted boarding pass manager. Store, manage and sync your boarding passes across all your devices.

## Features

- 📋 Store and manage boarding passes
- 🔄 Sync across multiple devices via Android app
- 👥 Multi-user support
- 🔧 Admin interface
- 🐳 Easy self-hosting with Docker

## Requirements

- Docker
- Docker Compose

## Setup

1. Download `docker-compose.yml` and `db/init.sql`:

```bash
curl -O https://raw.githubusercontent.com/cheinisch/ownpass/main/docker-compose.yml
mkdir db && curl -o db/init.sql https://raw.githubusercontent.com/cheinisch/ownpass/main/db/init.sql
```

2. Create `.env` file:

```env
DOMAIN=ownpass.example.com
DB_USER=ownpass
DB_PASSWORD=yourpassword
JWT_SECRET=yoursecretkey
```

3. Start:

```bash
docker compose up -d
```

OwnPass is now available at `http://your-server:8080`.

## Reverse Proxy

OwnPass runs on port `8080`. If you want to serve it under a domain, point your reverse proxy (e.g. Nginx, Traefik, Pangolin) to that port.

HTTPS is not handled by OwnPass itself — your reverse proxy is responsible for SSL termination.

## Android App

The Android app connects to your OwnPass instance and syncs boarding passes across devices. Enter your instance URL in the app settings.

## Update

```bash
docker compose pull
docker compose up -d
```

## Admin Interface

The first registered user can be promoted to admin via the admin interface at `/admin`.

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Tailwind CSS
- **Database:** PostgreSQL
- **Server:** Nginx
- **Container:** Docker

## License

MIT