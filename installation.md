```markdown
# Installation Guide

## Overview

This guide provides step-by-step instructions to set up and run the project locally. The application uses Docker for containerization and requires a running Redis instance. A single startup script (`start.sh`) handles building and launching the services.

## System Requirements

- **Operating System**:
  - Linux (recommended)
  - macOS
  - Windows (via WSL2 or Git Bash; native Windows support may require additional configuration)
- **RAM**: At least 4 GB recommended (8 GB+ for smoother development)
- **Disk Space**: ~2 GB for Docker images and dependencies

## Prerequisites

The project requires the following tools to be installed:

### 1. Docker and Docker CLI
Docker is used to build and run the application containers.

- Install Docker Desktop (includes Docker CLI):
  - **Linux**: Follow https://docs.docker.com/engine/install/
  - **macOS**: https://docs.docker.com/desktop/install/mac-install/
  - **Windows**: https://docs.docker.com/desktop/install/windows-install/ (requires WSL2)
- Verify installation:
  ```bash
  docker --version
  docker compose version  # Docker Compose v2 is bundled with recent Docker versions

  sudo usermod -aG docker $USER
  ```

### 2. Redis
Redis is required as a data store (default port 6379).

- **Option A: Install and run Redis locally** (recommended for development)
  - **Linux (Ubuntu/Debian)**:
    ```bash
    sudo apt update
    sudo apt install redis-server
    sudo systemctl start redis
    sudo systemctl enable redis  # Start on boot
    ```
  - **macOS** (with Homebrew):
    ```bash
    brew install redis
    brew services start redis
    ```
  - **Windows**: Use WSL2 and follow Linux instructions, or install Redis for Windows (https://github.com/microsoftarchive/redis/releases)

- **Option B: Run Redis via Docker** (alternative)
  ```bash
  docker run -d --name redis -p 6379:6379 redis:alpine
  ```

- Verify Redis is running:
  ```bash
  redis-cli ping
  ```
  Expected output: `PONG`

### 3. Git (You can also simply down the zip file and extract it)
Required to clone the repository.
```bash
git --version
```
If not installed, download from https://git-scm.com/downloads.

## Port Requirements

The application uses the following hardcoded ports. Ensure they are free:

- **8000**: Backend/API server
- **3000**: Frontend/web interface
- **6379**: Redis

Check for conflicts:
```bash
sudo netstat -tuln | grep -E '8000|3000|6379'
# or on macOS/Windows
lsof -i :8000
lsof -i :3000
lsof -i :6379
```

If any are in use, stop the conflicting service or change the ports in the source code (not recommended at this stage).

## Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Make the startup script executable if not executable**
   ```bash
   chmod +x start.sh
   ```

3. **Make sure content directory exists in the root of the project before you do the next step**
4. **Start the application**
   ```bash
   sudo ./start.sh # first time run requires sudo
   ```

   The script will:
   - Build Docker images (if needed)
   - Start the required containers
   - Initialize the application
   - Launch the front end in your default browser

   Wait for the output to show that services are ready (look for messages like "Server running on port..." or similar).


## Stopping the Application

To stop all services:
```bash
docker compose down
# or if using the script
./start.sh --stop  # if supported; otherwise use Docker commands directly
```

## Updating the Project

Since there is currently no package manager:
1. Pull the latest changes:
   ```bash
   git pull origin main
   ```
2. Rebuild and restart:
   ```bash
   ./start.sh
   ```

We recommend checking the GitHub repository at least once a month for updates, bug fixes, and new features.

## Troubleshooting

- **Docker permission errors** (Linux): Add your user to the docker group
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```
- **Port conflicts**: See "Port Requirements" above
- **Redis connection issues**: Ensure Redis is running and accessible on port 6379
- **Build failures**: Check Docker logs
  ```bash
  docker compose logs
  ```
- **Other issues**: Check the GitHub Issues page or open a new issue with logs.

# Thanks for trying out the Project
