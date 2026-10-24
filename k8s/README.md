# ☸️ Kubernetes Deployment Guide — Pharma Desk

This directory contains the Kubernetes manifests for deploying Pharma Desk microservices (MongoDB, Backend API, and Frontend Client).

---

## 🏗️ Architecture

- **Database:** MongoDB Stateful deployment (`mongo:7`) with PersistentVolumeClaim (`mongodb-pvc`) and ClusterIP service (`mongodb-service:27017`).
- **Backend:** Express API deployment (`pharmadesk-api:latest`) with 2 replicas, environment variables configured via `ConfigMap` and `Secret`, exposed via NodePort service (`backend-service:30050`).
- **Frontend:** React Nginx client deployment (`pharmadesk-client:latest`) with 2 replicas, exposed via NodePort service (`frontend-service:30080`).
- **Ingress:** Ingress routing `/` to Frontend and `/api` to Backend.

---

## 🚀 Quick Start (Local Cluster / Minikube / Docker Desktop)

### Step 1: Build Docker Images Locally

```bash
# Build backend image
docker build -t pharmadesk-api:latest .

# Build frontend image
docker build -t pharmadesk-client:latest ./client
```

### Step 2: Deploy All Manifests to Kubernetes

```bash
kubectl apply -k k8s/
# OR
kubectl apply -f k8s/
```

### Step 3: Verify Pods and Services

```bash
kubectl get pods
kubectl get services
```

### Step 4: Access Application

- **Frontend:** http://localhost:30080
- **Backend API:** http://localhost:30050/api
