---
title: "The Role of the Kubernetes Root CA"
weight: 220
slug: "22-k8s-root-ca-internal"
---

A Kubernetes cluster operates as its own Root CA, issuing and managing all certificates inside the cluster.

---

## Why Kubernetes Acts as a Root CA

The reason Kubernetes operates its own CA instead of using an external public CA (such as DigiCert) is the particular nature of intra-cluster communication.

| Category | Public CA (Let's Encrypt, etc.) | Kubernetes's Own CA |
|------|----------------------------|--------------------|
| **Purpose** | For services exposed to the internet | For communication between components inside the cluster |
| **Trust scope** | All browsers/devices worldwide | Inside that Kubernetes cluster only |
| **Cost/Time** | Possible cost, issuance wait time | Free, issued instantly through automation |
| **Validity period** | Usually 90 days to 1 year | 1 year by default (configurable) |
| **Analogy** | International passport | Company employee ID card |

---

## Trust Scope of the Kubernetes CA

The Kubernetes CA is a 'private certificate authority' trusted only within the boundary of the cluster.

```mermaid
graph TD
    CA[Kubernetes Root CA<br/>ca.crt / ca.key] -- "Sign/Issue" --> AS[API Server certificate]
    CA -- "Sign/Issue" --> KL[Kubelet certificate]
    CA -- "Sign/Issue" --> ET[etcd certificate]
    CA -- "Sign/Issue" --> CTL[Controller Manager certificate]
    
    subgraph Cluster["Inside the Kubernetes Cluster"]
    AS
    KL
    ET
    CTL
    end
    
    User[External browser] -- "Not trusted" --> AS
    Note right of User: That CA is not<br/>registered in the browser
```

---

## Kubernetes CA Structure and File Locations

### Key Certificate Files (kubeadm)

Kubernetes's core certificates are stored in the `/etc/kubernetes/pki/` directory on the control plane node.

| File Name | Role | Description |
|--------|------|------|
| **ca.crt** | Root CA certificate | The public key that all components use as the anchor of trust |
| **ca.key** | Root CA private key | **Must never be leaked.** Used when signing new certificates |
| **apiserver.crt** | API Server serving certificate | Used when clients verify the API server's identity |
| **apiserver-kubelet-client.crt** | Client certificate for the API Server | Used when the API server connects to the kubelet |
| **front-proxy-ca.crt** | Root CA for the proxy | A separate CA for communication with extension API servers |
| **sa.pub / sa.key** | Key for signing ServiceAccounts | Not a certificate; a key pair for signing JWT tokens |

---

## Flow of Certificate Usage in Kubernetes

1.  **Cluster initialization:** Running `kubeadm init` generates `ca.key` and `ca.crt`.
2.  **Component issuance:** The generated CA key is used to automatically issue certificates for `apiserver`, `scheduler`, and others.
3.  **Mutual authentication (mTLS):** For example, when `kube-scheduler` connects to the API server, each side verifies that the other's certificate was signed by `ca.crt`, establishing trust.

**The Kubernetes Root CA is the root of cluster security, and through this CA all communication within the cluster is encrypted and trusted.**
