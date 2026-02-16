```markdown
# HydraWatch

**Your self-hosted, privacy-first YouTube subscription manager**
Clean chronological feed. Total organization freedom. No algorithms. No tracking. No Google account required.

Named **HydraWatch** from the mythical creature Hydra. Due to the love-hate relationship with this Project. (Edge case Monster)

## Core Philosophy

- **Channel-first, chronological viewing** — like the good old days of subscriptions
- **Your category tree, your rules** — unlimited nesting, mix domains/subdomains/genres/moods however you like
- **100% above board** — only official YouTube RSS feeds + intelligent, low-impact polling
- **Fully self-hosted** — Dockerized, runs locally or on your LAN, zero cloud dependency
- **Privacy by design** — no login to Google, works perfectly with VPNs + hardened browsers

## Tech Stack

- **Backend**: FastAPI (Python) + Pydantic + HTTPX + Feedparser
- **Frontend**: Next.js
- **Storage**: SQLite (lightweight persistence) + Redis (caching & state)
- **Security**: Argon2 for password hashing
- **Deployment**: Docker + Docker Compose (single `start.sh` to rule them all)

Modern, efficient, and easy to maintain — perfect for self-hosting enthusiasts and developers alike.

## Key Features

- Flexible nested categories (e.g. Science → Biology → Talks | Gaming → Retro → Speedruns)
- Built-in **ALL** view + **Uncategorized** fallback
- **Batch operations first**: CSV import (ideal from FreeTube export), bulk domain/subdomain changes, batch delete
- Notifications auto-expire after 15 hours once viewed → keeps your feed fresh
- Resilient polling: survives days/weeks offline, resumes exactly where it left off
- Simple multi-user support (username + password) for family/LAN sharing
- Optional strict localhost mode (disable LAN access in docker-compose.yml)
- Scales comfortably to hundreds of channels with very low resource usage

Full details → [FEATURES.md](./FEATURES.md)

## Quick Start (≈5 minutes)

1. **Prerequisites**
   - Docker & Docker Compose
   - Redis (run locally or via `docker run -d -p 6379:6379 redis:alpine`)
   - Git (or download ZIP)

2. **Launch**
   ```bash
   git clone https://github.com/YOUR-USERNAME/hydrawatch.git
   cd hydrawatch
   chmod +x start.sh
   sudo ./start.sh          # sudo usually only needed first time for Docker group
