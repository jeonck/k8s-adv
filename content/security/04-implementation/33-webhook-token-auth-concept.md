---
title: "API Server Webhook Token Authentication"
weight: 330
slug: "33-webhook-token-auth-concept"
---

Learn about Webhook Token Authentication in the Kubernetes API server.

---

## What Is Webhook Token Authentication?

Webhook Token Authentication is a method in which the API server does not validate tokens itself but instead **delegates identity verification to an external webhook server**.

### Core Concepts

- **Extensibility:** You can implement complex authentication logic that Kubernetes does not support natively.
- **Integration:** You can integrate Kubernetes with an in-house LDAP, Active Directory, or other existing authentication system.
- **Delegation:** The API server simply forwards the token and decides whether authentication succeeded based on the external server's response (authenticated or not).

---

## How It Works

Communication between the API server and the external webhook server takes place through an API object called `TokenReview`.

```mermaid
sequenceDiagram
    participant C as Client (kubectl/curl)
    participant A as API Server
    participant W as External Webhook Server
    
    C->>A: 1. Request (with bearer token)
    A->>W: 2. TokenReview request (send token)
    Note over W: 3. Validate token and extract user information
    W->>A: 4. TokenReview response (authentication result + username/groups)
    Note over A: 5. Apply authentication result, then perform authorization (e.g., RBAC)
    A->>C: 6. Return the requested resource or deny the request
```

---

## Configuration Summary

### 1. Create the Webhook Configuration File
You need a configuration file (`webhook-config.yaml`) that defines which webhook server the API server sends data to.

| Item | Description | Note |
|------|------|------|
| **clusters** | URL and CA certificate of the webhook server | HTTPS recommended |
| **users** | Credentials the API server uses to connect to the webhook server | (Optional) |

### 2. Add kube-apiserver Flags
Enable the webhook in the `kube-apiserver` manifest on the control plane node.

```bash
# Example of editing kube-apiserver.yaml
- --authentication-token-webhook-config-file=/etc/kubernetes/pki/webhook-config.yaml
- --authentication-token-webhook-cache-ttl=2m
```

---

## Pros and Cons Summary

| Pros | Cons |
|------|------|
| - Integrates fully with the existing in-house authentication system | - Authentication fails if the external webhook server is down (single point of failure) |
| - Enables centralized user management | - Adds network latency |
| - Can be combined with complex security policies (IP restrictions, etc.) | - Requires building and operating a separate webhook server |

**The webhook method is a powerful authentication mechanism that offers the most flexibility when integrating Kubernetes with an existing security framework in an enterprise environment.**
