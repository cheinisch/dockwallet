# DockWallet

Self-hosted boarding pass manager.

## Structure

```
dockwallet/
├── backend/        # Node.js API → cheinisch/dockwallet-backend
├── frontend/       # React + Tailwind + Nginx → cheinisch/dockwallet-frontend
├── db/             # PostgreSQL init script
└── docker-compose.yml
```

## Setup

```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

The app is available at `http://localhost:8080`.

### First Login

Username: `admin@local`
Password: `changeme`

## Images

| Image | Description |
|---|---|
| `cheinisch/dockwallet-backend` | Node.js REST API |
| `cheinisch/dockwallet-frontend` | React UI served by Nginx |
