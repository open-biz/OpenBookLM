#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if minikube is installed
if ! command_exists minikube; then
    echo "Minikube is not installed. Installing via Homebrew..."
    brew install minikube
fi

# Check if kubectl is installed
if ! command_exists kubectl; then
    echo "kubectl is not installed. Installing via Homebrew..."
    brew install kubectl
fi

# Start minikube if it's not running
if ! minikube status | grep -q "Running"; then
    echo "Starting minikube..."
    minikube start
fi

# Set docker env to use minikube's docker daemon
eval $(minikube docker-env)

# Build the development image
echo "Building development Docker image..."
docker build -t openbooklm-dev:latest -f Dockerfile .

# Mount source directories
echo "Mounting source directories..."
minikube mount ./src:/src &
minikube mount ./public:/public &

# Apply development kubernetes configurations
echo "Applying Kubernetes configurations..."
kubectl apply -f k8s/dev/

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/openbooklm-dev

# Set up port forwarding
echo "Setting up port forwarding..."
kubectl port-forward deployment/openbooklm-dev 3000:3000 &

echo "Development environment is ready!"
echo "Access the application at http://localhost:3000"
echo "To stop the development environment:"
echo "1. Press Ctrl+C to stop port forwarding"
echo "2. Run: minikube stop"
