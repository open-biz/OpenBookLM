# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying OpenBookLM.

## Prerequisites

- Kubernetes cluster
- kubectl configured to communicate with your cluster
- Access to ghcr.io/open-biz/openbooklm container images

## Container Images

The application images are hosted on GitHub Container Registry:
```
ghcr.io/open-biz/openbooklm:main     # Latest main branch build
ghcr.io/open-biz/openbooklm:v*.*.*   # Release versions
```

## Configuration

1. The deployment is configured to use the GitHub Container Registry image:
   ```yaml
   image: ghcr.io/open-biz/openbooklm:main
   ```

2. Update the `configmap.yaml` with your non-sensitive environment variables.

3. Update the `secrets.yaml` with your base64-encoded sensitive data:
   ```bash
   echo -n "your-secret" | base64
   ```

## Deployment

1. Create the resources:
   ```bash
   kubectl apply -f k8s/
   ```

2. Verify the deployment:
   ```bash
   kubectl get pods
   kubectl get services
   ```

## Accessing the Application

The application is exposed through a ClusterIP service. To access it, you can:

1. Set up an Ingress (recommended for production)
2. Use port-forwarding for testing:
   ```bash
   kubectl port-forward svc/openbooklm 8080:80
   ```

## Scaling

To scale the application, modify the `replicas` field in `deployment.yaml` or use:
```bash
kubectl scale deployment openbooklm --replicas=3
```

## CI/CD

The container images are automatically built and pushed to GitHub Container Registry via GitHub Actions when:
- Code is pushed to the main branch
- A new release tag is created
- Pull requests are opened (build only)
