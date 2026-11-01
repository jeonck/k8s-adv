---
title: "Where Kubernetes Certificates Are Stored"
weight: 230
slug: "23-k8s-cert-file-locations"
---

Learn where certificates are stored in a Kubernetes cluster and how to manage them.

---

## Certificate Storage Locations Overview

Kubernetes components store their certificates in different locations depending on their role.

| Location | Path | Description |
|------|------|------|
| **Control plane** | `/etc/kubernetes/pki/` | Stores the core certificates of the control plane node |
| **Worker node** | `/var/lib/kubelet/pki/` | Stores the kubelet's certificates |
| **etcd** | `/etc/kubernetes/pki/etcd/` | Dedicated certificates securing the etcd database |
| **User** | `~/.kube/config` | kubeconfig file containing the credentials for kubectl access |
| **Pod** | `/var/run/secrets/kubernetes.io/serviceaccount/` | ServiceAccount token and CA certificate |

---

## 1. Control Plane Node Certificates in Detail (`/etc/kubernetes/pki/`)

On a control plane node of a cluster created with kubeadm, the following certificate layout is created.

```mermaid
graph TD
    PKI[/etc/kubernetes/pki/]
    PKI --> CA[ca.crt / ca.key<br/>Root CA]
    PKI --> AS[apiserver.crt / apiserver.key<br/>API Server]
    PKI --> KC[apiserver-kubelet-client.crt<br/>API Server -> kubelet]
    PKI --> FP[front-proxy-ca.crt / front-proxy-client.crt<br/>Front Proxy]
    PKI --> SA[sa.pub / sa.key<br/>ServiceAccount]
    PKI --> ETCD[etcd/]
    
    ETCD --> ECA[ca.crt / ca.key<br/>etcd CA]
    ETCD --> ES[server.crt / peer.crt<br/>etcd Server/Peer]
```

### Purpose of the Key Files

| File name | Purpose | Importance |
|--------|------|--------|
| **ca.crt / ca.key** | Trust anchor of the entire cluster (Root CA) | **Highest (never leak)** |
| **apiserver.crt / .key** | Serving certificate of the API server | High |
| **sa.pub / .key** | Key pair for signing ServiceAccount tokens | High |
| **etcd/ca.crt / .key** | Separate CA for securing the etcd cluster | High |

---

## 2. Component kubeconfig Files (`/etc/kubernetes/`)

The configuration files (kubeconfig) that components use to connect to the API server are also stored on the control plane node. These files contain Base64-encoded certificate data.

- **admin.conf:** For the cluster administrator (for kubectl)
- **kubelet.conf:** Used when the kubelet connects to the API server
- **controller-manager.conf:** For kube-controller-manager
- **scheduler.conf:** For kube-scheduler

---

## 3. Worker Node Certificates (`/var/lib/kubelet/pki/`)

On worker nodes, the kubelet manages the following files to communicate securely with the API server.

- **kubelet.crt / .key:** The kubelet certificate (client or serving) used to identify the kubelet
- **ca.crt:** The Root CA certificate used to verify the API server's certificate

---

## Tips for Inspecting Certificates

On a Linux system, use the `openssl` command to view the contents of a specific certificate file.

```bash
# Check the certificate's Subject and expiration date
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -E "Subject:|Not After"
```

**Knowing exactly where certificates are stored lets you quickly resolve certificate expiration and permission issues quickly when troubleshooting.**
