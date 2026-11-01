---
title: "Certificate-Based Access to the Kubernetes API Server"
weight: 290
slug: "29-client-cert-auth-concept"
---

This document explains X.509 certificate-based authentication for securely connecting to the Kubernetes API server.

---

## API Server Authentication Overview

Every request to the API server goes through the following three stages.

| Stage | Role | Notes |
|------|------|------|
| **1. Authentication** | "Who are you?" | Identity verification |
| **2. Authorization** | "What can you do?" | Granting permissions (RBAC, etc.) |
| **3. Admission Control** | "Is the request valid?" | Additional validation and mutation |

---

## Client Certificate Authentication (X.509 Client Certs)

Client certificate authentication is a built-in Kubernetes authentication method and one of the strongest.

### How It Works (mTLS Flow)

```mermaid
sequenceDiagram
    participant C as Client (kubectl)
    participant S as API Server (6443)
    
    C->>S: 1. Request TLS connection and present the client certificate
    Note over S: 2. Verify the client certificate against the Root CA certificate
    Note over S: 3. Check the certificate validity period
    Note over S: 4. Extract user info from certificate fields (CN, O)
    S->>C: 5. Authentication succeeds and communication begins
```

### Key Certificate Fields and Their Roles

Kubernetes identifies a user based on specific fields in the certificate.

| Field | Meaning | Kubernetes Mapping | Example |
|--------|------|-----------------|------|
| **CN (Common Name)** | Common name | **User Name** | `admin`, `john-doe` |
| **O (Organization)** | Organization name | **Group** | `system:masters`, `developers` |

> **Note:** Kubernetes does not store 'User' resources internally. It simply trusts the **CN** value written in the certificate and recognizes it as the user.

---

## Key Certificate Components

- **ca.crt:** The Root CA certificate (public key) the API server uses to verify that a client certificate is genuine
- **client.crt:** The user's identity credential (public key + CA signature), submitted to the API server
- **client.key:** The private key that the user must keep secure to prove their identity

---

## Pros and Cons Summary

| Pros | Cons |
|------|------|
| - Very strong security (asymmetric key based) | - Revocation of an issued certificate is difficult |
| - Authentication needs no external service (only the CA certificate is needed) | - Certificates must be renewed manually when they expire |
| - No separate user DB is needed | - MFA (multi-factor authentication) is not supported |

**Certificate-based authentication is the most widely used method for admin tools (kubectl) and component-to-component communication (kubelet-apiserver).**
