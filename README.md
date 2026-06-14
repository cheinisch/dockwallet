# DockWallet

[![GitHub Release](https://img.shields.io/github/v/release/cheinisch/dockwallet?label=version&color=blue)](https://github.com/cheinisch/dockwallet/releases)
[![Docker Image](https://img.shields.io/docker/v/cheinisch/dockwallet?label=docker&logo=docker&color=2496ED)](https://hub.docker.com/r/cheinisch/dockwallet)
[![Build Status](https://img.shields.io/github/actions/workflow/status/cheinisch/dockwallet/cicd.yml?label=build&logo=github)](https://github.com/cheinisch/dockwallet/actions)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL%20v3-green)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-docs.dockwallet.app-informational)](https://docs.dockwallet.app)

Self-hosted boarding pass manager with multi-user support and Android sync.

## Structure

```
dockwallet/
├── backend/        # FastAPI + PostgreSQL → cheinisch/dockwallet-backend
├── frontend/       # Tailwind CSS + Nginx → cheinisch/dockwallet-frontend
├── db/             # PostgreSQL init script
└── docker-compose.yml
```

## Installation

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.20 (included with Docker Desktop)

### 1. Clone the repository

```bash
git clone https://github.com/cheinisch/dockwallet.git
cd dockwallet
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and adjust the values:

```env
# Database
POSTGRES_USER=dockwallet
POSTGRES_PASSWORD=changeme
POSTGRES_DB=dockwallet

# Backend
SECRET_KEY=your-secret-key-here
```

> **Tip:** Generate a secure secret key with `openssl rand -hex 32`.

### 3. Start the stack

```bash
docker compose up -d
```

This pulls the images and starts three containers: PostgreSQL, the FastAPI backend, and the Nginx frontend.

### 4. Open the app

Navigate to [http://localhost:8080](http://localhost:8080).

### First Login

| Field | Value |
|---|---|
| Username | `admin@local` |
| Password | `changeme` |

> **Important:** Change the admin password immediately after the first login.

### Updating

```bash
docker compose pull
docker compose up -d
```

## Images

| Image | Description |
|---|---|
| `cheinisch/dockwallet-backend` | FastAPI REST API |
| `cheinisch/dockwallet-frontend` | Tailwind UI served by Nginx |

## Android App

The companion Android app ([cheinisch/dockwallet-app](https://github.com/cheinisch/dockwallet-app)) connects to your self-hosted instance and keeps boarding passes in sync across multiple devices.

## Documentation

Full documentation is available at [docs.dockwallet.app](https://docs.dockwallet.app).

## License

[AGPL-3.0](LICENSE)