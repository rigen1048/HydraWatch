# HydraWatch

**Your personal, self-hosted YouTube subscription manager**
Clean. Private. Algorithm-free. Built for people who have a love-hate relationship with YouTube's edge cases — and want to win.

Named **HydraWatch** from the mythical creature Hydra. Due to the love-hate relationship with this Project. (Edge case Monster)

## At a Glance

- **Chronological channel-based feed** — the way subscriptions used to feel
- **Completely free-form category tree** — nest domains, subdomains, genres, moods, whatever you want
- **100% legal & clean** — only official YouTube RSS feeds + smart polling
- **Self-hosted + local network** — runs in Docker, accessible from any device on your Wi-Fi
- **Privacy-first** — no Google login, no tracking, no cloud middleman
- **Batch-first management** — CSV import (great with FreeTube exports), bulk edit/delete/re-categorize

## Why It Exists

Because after hundreds of channels you realize:
- YouTube wants chaos
- You want control
- Most alternatives either sell your soul or give you another algorithm

HydraWatch is the middle path: minimal UI, maximum organization freedom, zero surveillance.

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

## Screenshots

(Add your screenshots here — dashboard with tree, batch edit screen, mobile view, etc.)

## Current Project Status

- Actively used daily by the author
- Technical deep-dive documentation in progress
- **Contributions temporarily paused** until docs are complete → [CONTRIBUTING.md](./CONTRIBUTING.md)

## Tech Highlights

- Docker + Docker Compose
- Redis (fast, lightweight storage)
- Simple file-based auth
- Frontend: [React / Vue / …]
- Backend: [FastAPI / Express / …]

(Details in source code & upcoming docs)

## Who It's For

- Power users with 100–1000 subscriptions
- People who hate algorithmic feeds
- Privacy / self-hosting enthusiasts
- Anyone nostalgic for the old "subscriptions" tab but with better organization

Made with equal parts frustration and determination.

Star it if it saves you from another hydra head.
Open issues for war stories — the name came from them after all.
