# Local Kubernetes Testing Guide

Run the full Muro stack locally on Kubernetes using **Kind** (Kubernetes in Docker).

## Prerequisites

```bash
# Install Kind (Windows with Chocolatey)
choco install kind

# Or download from: https://kind.sigs.k8s.io/docs/user/quick-start/

# Install kubectl
choco install kubernetes-cli

# Verify
kind version
kubectl version --client
```

---

## Quick Start

### 1. Create Cluster with Ingress Support

```bash
# Create a kind cluster with port mappings for ingress
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF

# Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 2. Build & Load Docker Images

```bash
# Build images
docker build -t muro/http-server:local -f apps/http-server/Dockerfile .
docker build -t muro/ws-server:local -f apps/ws-server/Dockerfile .
docker build -t muro/frontend:local -f apps/muro-frontend/Dockerfile .

# Load into Kind cluster
kind load docker-image muro/http-server:local
kind load docker-image muro/ws-server:local
kind load docker-image muro/frontend:local
```

### 3. Update Image Tags

Edit `k8s/kustomization.yaml` to use local image tags:
```yaml
images:
  - name: ghcr.io/ashea10/muro-http-server
    newName: muro/http-server
    newTag: local
  - name: ghcr.io/ashea10/muro-ws-server
    newName: muro/ws-server
    newTag: local
  - name: ghcr.io/ashea10/muro-frontend
    newName: muro/frontend
    newTag: local
```

### 4. Deploy

```bash
# Apply all manifests
kubectl apply -k k8s/

# Watch pods come up
kubectl get pods -n muro -w
```

### 5. Access the App

With Kind's port mapping, access directly at:
- **Frontend**: http://localhost (port 80 via ingress)

Or use port-forwarding:
```bash
kubectl port-forward -n muro svc/frontend 3000:3000
# Then open http://localhost:3000
```

---

## Useful Commands

```bash
# Check all resources
kubectl get all -n muro

# View pod logs
kubectl logs -n muro -l app.kubernetes.io/name=http-server

# Describe failing pods
kubectl describe pod -n muro <pod-name>

# Exec into a pod
kubectl exec -it -n muro <pod-name> -- /bin/sh

# Check HPA status
kubectl get hpa -n muro

# View ingress
kubectl get ingress -n muro
```

## Cleanup

```bash
# Delete all Muro resources
kubectl delete -k k8s/

# Delete the entire cluster
kind delete cluster
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Pods stuck in `Pending` | Check `kubectl describe pod` - probably resource limits |
| `ImagePullBackOff` | Image not loaded - run `kind load docker-image` again |
| Ingress not responding | Make sure nginx ingress controller is running |
| DB connection failed | Ensure postgres pod is `Running` first |
