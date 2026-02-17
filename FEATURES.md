# Features

## Personalization Freedom

The video feed is organized strictly by channels, providing a clean, predictable experience superior to YouTube's chaotic notifications.

The true power comes from **flexible channel categorization**. You can freely build a tree structure that suits your needs, without any enforced style:

- View **all channels** together
- Group by **Domain** → Channels (e.g., Science → all science channels)
- Group by **Domain** → **Subdomain** → Channels (e.g., Science → Biology → biology channels)

You can mix and match as you like—some categories can remain flat, others deeply nested. This gives you complete freedom to organize your subscriptions exactly how you want.

Two special categories are always present:
- **ALL** – A virtual category that shows every channel and video
- **Uncategorized** – A default bucket for channels that haven't been assigned to a domain/subdomain yet

These built-in categories make navigation effortless and ensure nothing gets lost.

## Batch Operations

To streamline management of many channels, batch operations are prioritized over individual actions.

Supported batch operations:
- **Batch Delete** – Remove multiple channels at once
- **Batch Change/Reset** – Update or reset domain, subdomain, or both for selected channels

**Adding channels** is done exclusively via CSV import (no manual single-channel entry).

### Recommended: Import from FreeTube
Subscribe to channels in FreeTube, then export your subscriptions as CSV.

### CSV Format
The CSV must follow this exact structure:
```csv
Channel ID,Channel URL,Channel title
UCXYZ123,https://www.youtube.com/channel/UCXYZ123,Example Channel Name
UCABC456,https://www.youtube.com/channel/UCABC456,Another Channel
```

If you prefer to build the CSV manually, open a YouTube channel page, view page source, and extract the channel ID from the RSS link or meta tags.

## Notification Management

- Notifications (new videos) are automatically deleted **15 hours after being viewed** to prevent feed bloat
- Future plans include a "Watch Later" feature
- The system is highly resilient: even if the server is offline for days or weeks, it will resume polling exactly where it left off and recover your last-seen state

## Clean and Focused User Interface (No Unnecessary Noise)

The interface is designed for minimalism and clarity:
- No welcome messages or onboarding screens
- No forced or redundant categorization beyond what you define
- Single, consistent context at all times
- No double-click actions or hidden behaviors—everything is direct and predictable

## Stability and Legality

- **100% legal and safe**: No scraping, no third-party services, no bots, no ToS violations
- Uses only official YouTube RSS feeds with smart polling
- No legally gray areas—everything operates within YouTube's allowed mechanisms

## Privacy & Productivity

### Freedom from Algorithms and Surveillance
- No account dependency means YouTube's algorithm cannot reliably profile or influence you
- Fully compatible with privacy tools:
  - VPNs
  - Hardened browsers that aggressively clear cookies

### No Technical Possibility of Privacy Invasion
- Entirely self-hosted—no cloud services
- No browser extensions required

### Support for Youtube's Good side
- Watch the notification feed directly on Youtube
	- to support the creators
	- To have no loading issues
	- To enjoy performance
	- With all the additional privacy layer like Vpn and hardened browser

## Scalability & Smart Polling

- Polling is intelligent and conservative: no hammering of YouTube servers, ensuring long-term reliability and low resource usage
- Scales effortlessly to hundreds of channels without performance issues

## Local Network & Multi-User Support

- Runs on your local machine or network (everyone connected to you through same wifi router)
- Supports multiple users with simple username + password authentication (protects your feed while allowing shared access)
- The host user has direct access to all data
- Multi-user handling is graceful and built-in
- By default, accessible from any device on the same Wi-Fi network

### Disable Network Access (Localhost Only)
If you want the app available only on the host machine:
1. Open the `docker-compose.yml` file
2. Remove or comment out the line containing `HOST: 0.0.0.0` (or similar network binding)
3. Restart with `./start.sh`

### Disable Password
- Go to user_server
- Delete/Rename proxy.ts anything under than proxy.ts / middlware.ts

### How to reset Your password
- `redis-cli` in the terminal
- search via `keys *`
- `flushall` to nuke everyone's pass / `Del [key...]`  to nuke specific pass
- go to signup page and simply create it under same name.

Thank you for using the project! But this is not the end, I plan to bring more
