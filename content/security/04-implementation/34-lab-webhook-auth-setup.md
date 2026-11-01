---
title: "Procedure for Changing the API Server Authentication Plugin to Webhook Authentication"
weight: 340
slug: "34-lab-webhook-auth-setup"
---

A lab procedure for switching the Kubernetes API server's authentication method to one based on an external webhook server.

---

## Task Overview

This lab extends the API server's default authentication so that it delegates token authentication to an external service.

| Step | Task | Notes |
|------|-----------|------|
| **1. Pre-check** | Check the API server's current authentication settings. | `kube-apiserver.yaml` |
| **2. Build the webhook server** | Prepare an external webhook server to validate tokens. | HTTPS-based server |
| **3. Configure** | Write the configuration file the API server uses when calling the webhook. | `webhook-config.yaml` |
| **4. Apply to the API server** | Modify the API server's startup flags to enable the webhook. | API server restarts |

---

## Authentication Switch Architecture

```mermaid
graph LR
    User[User request] -- "Submit Token" --> API[API Server]
    API -- "TokenReview request" --> Webhook[External Webhook server]
    Webhook -- "DB/LDAP lookup" --> Verify{Verify}
    Verify -- "Authentication success" --> API
    API -- "After RBAC authorization" --> Resource[Cluster resources]
```

---

## Step 1: Check the Current Authentication Settings

On the control plane node, check which authentication method the cluster is currently using.

```bash
# Check the API Server configuration file
grep -E "mode|auth" /etc/kubernetes/manifests/kube-apiserver.yaml

# Default configuration example:
# - --authorization-mode=Node,RBAC
# - --client-ca-file=/etc/kubernetes/pki/ca.crt
```

---

## Step 2: Write the Webhook Configuration File (`/etc/kubernetes/pki/webhook-config.yaml`)

Define the address and authentication information the API server needs to communicate with the external webhook server.

```yaml
apiVersion: v1
kind: Config
clusters:
- name: external-auth-service
  cluster:
    server: https://auth.example.com/authenticate # Webhook server address
    certificate-authority: /etc/kubernetes/pki/ca.crt # CA for verifying the webhook server
users:
- name: kube-apiserver
  user:
    client-certificate: /etc/kubernetes/pki/apiserver.crt
    client-key: /etc/kubernetes/pki/apiserver.key
contexts:
- context:
    cluster: external-auth-service
    user: kube-apiserver
  name: webhook-auth-context
current-context: webhook-auth-context
```

---

## Step 3: Modify the API Server Options

Edit the `kube-apiserver.yaml` file on the control plane node to enable webhook authentication.

```yaml
# Modify /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    ...
    - --authentication-token-webhook-config-file=/etc/kubernetes/pki/webhook-config.yaml
    - --authentication-token-webhook-cache-ttl=5m
```

---

## Cautions and Tips

1.  **Beware of SPOF:** If the external webhook server goes down, cluster authentication itself can be paralyzed. A high-availability (HA) configuration is recommended.
2.  **Authentication failure logs:** If a problem occurs, check the API server logs (`kubectl logs -n kube-system <apiserver-pod>`) for communication errors with the webhook server.
3.  **Use caching:** The `--authentication-token-webhook-cache-ttl` option can reduce the load on the external server and improve authentication performance.

**Once the webhook authentication setup is complete, you can flexibly integrate the Kubernetes cluster with your enterprise's unified authentication system.**
