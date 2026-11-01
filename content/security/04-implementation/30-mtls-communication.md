---
title: "Mutual TLS Authentication (mTLS)"
weight: 300
slug: "30-mtls-communication"
---

Learn about mutual TLS (mTLS), the foundation of communication inside a Kubernetes cluster.

---

## What Is mTLS?

mTLS is a security protocol in which the client and server **verify each other's certificates to authenticate identity in both directions**. This contrasts with ordinary HTTPS (one-way TLS), where only the server is authenticated.

### One-Way TLS vs Mutual TLS (mTLS)

| Category | One-way TLS (regular HTTPS) | Mutual TLS (mTLS) |
|------|-------------------------|-----------------|
| **Who authenticates** | Only the server proves itself | Both the client and the server prove themselves |
| **Certificate submission** | Only the server submits a certificate | Both submit their own certificates |
| **Main use** | Regular website access | Component-to-component communication, API security |
| **Security level** | Moderate (used together with ID/password) | Very high (identity based on device or account) |

---

## mTLS Communication Flow

The mTLS handshake is the regular TLS process with added steps for submitting and verifying the client certificate.

```mermaid
sequenceDiagram
    participant C as Client (kubectl/kubelet)
    participant S as Server (API Server)
    
    C->>S: 1. ClientHello (version, cipher list)
    S->>C: 2. ServerHello + server certificate
    Note over C: 3. Verify server certificate (Root CA)
    S->>C: 4. Certificate Request (request client certificate)
    C->>S: 5. Submit client certificate
    Note over S: 6. Verify client certificate (Root CA)
    Note over C,S: 7. Key exchange; mTLS session established
    C<->>S: 8. Secure communication between mutually authenticated peers
```

---

## Using mTLS in Kubernetes

Kubernetes follows a "zero trust" approach and uses mTLS for its core internal communication.

- **Control plane communication:** When `kube-scheduler` and `kube-controller-manager` connect to the API server, each performs mTLS using its own certificate.
- **Node communication:** When the `kubelet` communicates with the API server, or the API server fetches logs from the `kubelet`, they verify each other's certificates.
- **Service mesh:** Service mesh tools such as Istio and Linkerd automatically encrypt all communication between microservices with mTLS.

---

## Key Benefits of mTLS

1.  **Prevents impersonation:** A stolen ID or password alone is not enough to connect; the correct private key and certificate are required.
2.  **Accountability:** Every party is authenticated, so you can reliably trace which component made which request.
3.  **Blocks man-in-the-middle (MITM) attacks:** Because both ends verify each other, it is very difficult to intercept or forge data in transit.

**mTLS acts as the "security wall" of a Kubernetes cluster, providing an environment where all components can trust each other and communicate safely.**
