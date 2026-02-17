# HydraWatch

**Your personal, self-hosted YouTube subscription manager**
Clean. Private. Algorithm-free, Cloud-Free, Cost-Free

Named **HydraWatch** from the mythical creature Hydra. Due to the love-hate relationship with this Project. (Edge case Monster)

## At a Glance

- **Chronological channel-based feed** — the way subscriptions should feel
- **Completely free-form category tree** — nest domains, subdomains, genres, moods, whatever you want
- **100% legal & clean** — only official YouTube RSS feeds + smart polling
- **Self-hosted + local network** — runs in Docker, accessible from any device on your Wi-Fi
- **Privacy-first** — no Google login, no tracking, no cloud middleman
- **Batch-first management** — CSV import (great with FreeTube exports), bulk edit/delete/re-categorize

## Why It Exists

- **Boosts productivity:** YouTube has become essential for discovering content and staying current—but it’s also designed to hijack your attention with endless distractions. HydraWatch keeps you productive by delivering clean updates without opening YouTube.

- **Organized, not chaotic:** Official notifications are spaghetti when you follow 100+ channels across multiple genres, Some serious and others are meant to be fun. HydraWatch turns that chaos into a simple, local-first dashboard that actually makes sense.

- **Fight against Algorithm** : You tube algorithm learns you heavily through your Youtube account. it learns, boxes you and and stifles your taste. Say no More with HydraWatch.

- **Step Forward Privacy & Security** : Harden Browser clears cookies aggressively. Which Industry frames as UX vs Security, Basically a order from chaos. Say No more

- **Instant reset:** Want a clean slate of Youtube feed? Just clear your local data. Your feed refreshes instantly, while subscription never leaves

- **Privacy-friendly:** Works perfectly with hardened, privacy-focused browsers. No broken accounts or lost convenience when your browser clears cookies—HydraWatch stays smooth and secure.

## Quick Start

```bash
git clone https://github.com/your-username/hydrawatch.git
cd hydrawatch
chmod +x start.sh
sudo ./start.sh          # first run (Docker permissions)
```

→ Opens http://localhost:3000 (or your LAN IP:3000)

Full setup instructions → [INSTALLATION.md](./INSTALLATION.md)

## Features

- Unlimited nested categories (Science → Physics → Lectures, Gaming → Retro → Speedruns…)
- Built-in **ALL** and **Uncategorized** views
- Notifications auto-clean after 15 hours (prevents eternal backlog)
- Survives long offline periods — resumes exactly where it left off
- Multi-user support with simple username/password
- Optional localhost-only mode (disable LAN access)
- Very conservative on YouTube servers → scales to 500+ channels comfortably

Complete list → [FEATURES.md](./FEATURES.md)

## Screenshots / Video
(Upcoming)

## Current Project Status

- Actively used daily by the author
- Technical deep-dive documentation in progress
- **Contributions temporarily paused** until docs are complete → [CONTRIBUTING.md](./CONTRIBUTING.md)

## Tech Highlights
- Content_Server: Python, FastAPI, Pydantic, HTTPX, Sqlite, Aiosqlite, logging, pathlib, time
- User_Server: Next.js, bun, Redis, Argon2
- Packaging: Docker Compose, qrencode

## Who It's For

- Power users with 100–1000 subscriptions
- People who hate algorithmic feeds
- Privacy / self-hosting enthusiasts
- Anyone nostalgic for the old "subscriptions" tab but with better organization

Made with equal parts of frustrations and determination.

Star it if it saves you from another hydra head.
Open issues for war stories — the name came from them after all.
