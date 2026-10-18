<div align="center">

# BREKZO — Smart Campus Canteen Platform

**Full-stack prototype for menu discovery, pre-ordering, pickup, wallet-style flows, and canteen operations**

[![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)

[Project homepage](https://brekzo.vercel.app) · [Source repository](https://github.com/777tharun7/BREKZO)

</div>

## Overview

BREKZO is a campus canteen web-application prototype. The repository combines a React/Vite frontend with a FastAPI backend and database-access layer. The code includes routes and UI modules for authentication, canteen/menu browsing, orders, wallet, offers, waste, analytics, inventory, pickup, reviews, student workflows, and other campus food operations.

The repository has local Docker Compose configuration and a Vercel routing configuration. The current online deployment and each hosted integration should be verified independently before describing them as production-ready.

## Architecture

```text
React + Vite frontend
        │
        ├── REST requests
        └── Socket.IO client
                 │
          FastAPI backend
                 │
       Routers / application logic
                 │
        PostgreSQL (Compose)
                 │
     SQLite fallback in local code
```

### Current code areas

- `frontend/` — React, Vite, TypeScript, routing, charts, icons, QR-code and motion dependencies.
- `backend-fastapi/main.py` — FastAPI app, router registration, and Socket.IO integration.
- `backend-fastapi/routers/` — route modules for auth, canteens, menu, orders, wallet, offers, waste, analytics, inventory, pickup, reviews and related operations.
- `backend-fastapi/database.py` — PostgreSQL connection setup with a SQLite fallback.
- `docker-compose.yml` — local PostgreSQL, backend and frontend services.
- `api/index.py` and `vercel.json` — Vercel API entry point and routing configuration.

## Technology stack

| Layer | Technologies visible in repository |
|---|---|
| Frontend | React, TypeScript, Vite, Axios, React Router, Recharts, Framer Motion, Socket.IO client |
| Backend | Python, FastAPI, Uvicorn, Python Socket.IO |
| Database | PostgreSQL via asyncpg; aiosqlite fallback |
| Development/deployment | Docker Compose, Dockerfiles, Vercel configuration |

## Run locally with Docker Compose

**Prerequisites:** Docker Desktop or Docker Engine with the Docker Compose plugin.

1. Create a local environment file from the example:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env`. Replace the example password and keep `POSTGRES_PASSWORD` and `DATABASE_URL` synchronized. Use a URL-safe password (letters, numbers, underscore, or hyphen) unless you URL-encode reserved characters in the database URL. The example values are for local setup only.

3. Build and start the services from the repository root:

   ```bash
   docker compose up --build
   ```

4. Open the frontend at [http://localhost:5173](http://localhost:5173). The backend is exposed on [http://localhost:8000](http://localhost:8000); interactive API documentation is normally available at [http://localhost:8000/docs](http://localhost:8000/docs).

Stop the stack with `docker compose down`. Use `docker compose down -v` only when you intentionally want to delete the local PostgreSQL volume and its contents.

## Data and evaluation status

This repository contains demonstration/seed-data generation logic and a checked-in SQLite database plus SQLite sidecar files. Review the committed database contents before reusing or publicly distributing the repository; ignore rules prevent new local database files from being added accidentally but do not untrack files that are already committed.

No load test, security assessment, payment-provider verification, or measured food-waste impact study is included in this README. Treat the application as a prototype until those checks have been performed.

## Security checklist before deployment

- Rotate the PostgreSQL password that was previously hard-coded in the tracked Compose file. The current Compose configuration now reads secrets from a local `.env`; removing the literal from the latest version does not erase it from Git history.
- Keep real `.env` files, credentials, and production data out of Git. Only commit examples such as `.env.example`.
- The inspected backend currently configures permissive CORS and exposes Socket.IO room-joining/status-update handlers. Restrict allowed origins and enforce authenticated, authorized access to order/user/kitchen rooms before deploying to untrusted users.
- Review the checked-in SQLite database and its `-wal`/`-shm` sidecars to ensure they contain only intended demo data.
- Validate access controls, password handling, order ownership, payment behavior, database migrations, logging and error handling before production use.

## Limitations and next steps

1. Add reproducible tests for authentication, authorization, order/payment state transitions, and inventory consistency.
2. Document which payment actions are simulations versus integrations with a real provider.
3. Add a sanitized screenshot or short demo video and verify the public deployment URL.
4. Add deployment-specific environment instructions, health checks, and a safe database migration strategy.

## Repository links

- [Frontend source](frontend/)
- [Backend source](backend-fastapi/)
- [Docker Compose configuration](docker-compose.yml)
- [Vercel routing configuration](vercel.json)
