# GitHub Actions Workflows

## Docker Build Workflow

The `docker-build.yml` workflow automatically builds and pushes the Docker image to GitHub Container Registry (ghcr.io) when:
- Code is pushed to the `main` branch
- A new tag is created (v*.*.*)
- A pull request is opened against `main` (build only, no push)

### Features
- Uses Docker Buildx for efficient builds
- Implements layer caching to speed up builds
- Automatically generates Docker tags based on:
  - Git branch name
  - Git tag (for releases)
  - Git SHA
- Pushes to GitHub Container Registry (ghcr.io)

### Required Setup
1. Ensure your repository has access to create packages:
   - Go to Settings > Actions > General
   - Enable "Read and write permissions"

2. Update your Kubernetes manifests to use the new image:
   ```yaml
   image: ghcr.io/open-biz/openbooklm:main
   ```

### Image Tags
The workflow generates several tags for each image:
- For branches: `ghcr.io/open-biz/openbooklm:branch-name`
- For tags: `ghcr.io/open-biz/openbooklm:1.2.3`
- For PRs: `ghcr.io/open-biz/openbooklm:pr-123`
- SHA: `ghcr.io/open-biz/openbooklm:sha-123456`

### Local Testing
To pull the image locally:
```bash
docker pull ghcr.io/open-biz/openbooklm:main
```
