# Development Scripts

This directory contains various scripts to help with development and deployment of OpenBookLM.

## Script Overview

| Script | Purpose | Status | When to Use |
|--------|---------|--------|-------------|
| `build.sh` | Builds the application for production | Active | Used in CI/CD and production deployments |
| `cleanup.sh` | Cleans up temporary files and docker resources | Active | When you need to clean up your local environment |
| `deploy.sh` | Handles production deployment | Active | When deploying to production |
| `k8s-dev.sh` | Sets up local Kubernetes development environment | Available | Optional: When testing K8s deployments locally |
| `setup.sh` | Initial project setup and dependencies | Active | When setting up the project for the first time |
| `wait-for-it.sh` | Utility to wait for service availability | Active | Used by other scripts to ensure service readiness |

## Local Development Options

### 1. Docker Compose (Recommended)
The simplest way to start development is using Docker Compose:

```bash
docker compose up
```

This will:
- Start the Next.js app on http://localhost:3000
- Set up a PostgreSQL database
- Enable hot reloading
- Make the debug port available on 9229

### 2. Kubernetes Local Development
For testing Kubernetes deployments locally, you can use the `k8s-dev.sh` script:

```bash
./scripts/k8s-dev.sh
```

This script:
- Sets up Minikube if not installed
- Builds and deploys the app in a local Kubernetes cluster
- Mounts source directories for live updates
- Sets up port forwarding

Note: Docker Compose is recommended for day-to-day development as it's simpler and faster to set up.

## Other Scripts

### build.sh
Build script used for production deployments and CI/CD pipelines.

## Environment Setup

All development methods require a `.env` file in the root directory. Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
