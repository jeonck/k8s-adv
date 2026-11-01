---
title: "Inspecting Certificate Information (1/2) - Root CA and API Server"
weight: 260
slug: "26-inspect-cert-info-1"
---

Inspect the certificate file information for the Kubernetes cluster's Root CA certificate and the certificate used by the API Server.

---

## Certificate Inspection Overview

While operating a cluster, it is very important to verify certificate validity and trust relationships.

| Target | File Path | Main Role |
|-----------|-----------|-----------|
| **Root CA** | `/etc/kubernetes/pki/ca.crt` | Anchor of cluster trust (parent of all certificates) |
| **API Server** | `/etc/kubernetes/pki/apiserver.crt` | Server certificate proving the API server's identity |

---

## 1. Inspecting the Root CA Certificate

The Root CA certificate has a **Self-Signed** structure that vouches for itself.

### Command to View Detailed Information
```bash
openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout
```

### Analysis of Key Fields

```mermaid
graph TD
    CA[Root CA certificate information]
    CA --> Issuer["Issuer: CN = kubernetes-ca (itself)"]
    CA --> Subject["Subject: CN = kubernetes-ca (itself)"]
    CA --> Validity["Validity: about 10 years (for long-term retention)"]
    CA --> Usage["Key Usage: Certificate Sign (for signing certificates)"]
    CA --> Basic["Basic Constraints: CA:TRUE (is a certificate authority)"]
```

---

## 2. Inspecting the API Server Certificate

The API Server certificate is a **subordinate certificate** signed by the Root CA.

### Command to View Detailed Information
```bash
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout
```

### Analysis of Key Fields

| Field | Content | Description |
|--------|------|------|
| **Issuer** | `CN = kubernetes-ca` | Proves it was issued by the Root CA |
| **Subject** | `CN = kube-apiserver` | States that the certificate owner is the API server |
| **Validity** | About 1 year | A shorter cycle than the Root CA for security |
| **SAN** | `DNS:kubernetes, IP:10.96.0.1...` | List of additional domains and IPs that can be used to connect |

---

## 3. Verifying Trust Relationships Between Certificates

This is how to verify that the API server certificate was correctly signed by the Root CA.

```bash
# Signature verification command
openssl verify -CAfile /etc/kubernetes/pki/ca.crt /etc/kubernetes/pki/apiserver.crt

# Output
# /etc/kubernetes/pki/apiserver.crt: OK
```

**The ability to inspect and verify certificate information directly is essential for checking a cluster's security posture and resolving authentication-related failures.**
