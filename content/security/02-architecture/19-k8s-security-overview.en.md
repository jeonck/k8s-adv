---
title: "Authentication and Authorization"
weight: 190
slug: "19-k8s-security-overview"
---

Learn about authentication and authorization, the core concepts of Kubernetes security.

---

## Core Concept Comparison

| Category | Authentication | Authorization |
|------|-----------------------|----------------------|
| **Key question** | "Who are you?" | "What can you do?" |
| **Purpose** | Identity verification | Granting permissions and controlling resource access |
| **Analogy** | Passport check, company access badge | Visa issuance, access rights to a specific floor |
| **K8s methods** | Certificates, tokens, OIDC, etc. | RBAC, ABAC, Node, etc. |

---

## Security Processing Flow

Every request that arrives at the Kubernetes API server goes through the following 3 stages.

```mermaid
flowchart TD
    Request[User request] --> AuthN{1. Authentication}
    AuthN -- Success --> AuthZ{2. Authorization}
    AuthN -- Failure --> Deny1[401 Unauthorized]
    
    AuthZ -- Success --> Admit{3. Admission Control}
    AuthZ -- Failure --> Deny2[403 Forbidden]
    
    Admit -- Approved --> ETCD[(etcd store/execute)]
    Admit -- Rejected --> Deny3[403 Forbidden]
```

---

## 1. Authentication

This is the process of verifying who the requesting principal is. Kubernetes has no 'user' resource of its own; it verifies identity through external authentication systems or certificates.

### Main Authentication Methods
- **X.509 Client Certs:** Authentication via client certificates (kubeadm default)
- **Static Token File:** Token authentication via a static file
- **Bootstrap Tokens:** Tokens used when joining a cluster
- **Service Account Tokens:** Automatically generated tokens used inside Pods
- **OIDC (OpenID Connect):** Authentication integrated with an external IDP (Google, Okta, etc.)

---

## 2. Authorization

This checks whether an authenticated user has permission to perform a specific action (Verb) on a specific resource.

### Main Authorization Modes
- **RBAC (Role-Based Access Control):** Role-based access control (most recommended)
- **ABAC (Attribute-Based Access Control):** Attribute-based access control
- **Node Authorization:** Special-purpose authorization that restricts the permissions of the kubelet
- **Webhook:** A method that asks an external service to check permissions

---

## 3. Admission Control

For requests that have passed authentication and authorization, this performs a final check that they comply with the cluster's policies, and modifies the data (Mutating) or rejects the request (Validating) as needed.

- **Mutating Admission Webhook:** Modifies the request content (e.g., sidecar injection)
- **Validating Admission Webhook:** Validates the request content (e.g., resource limit checks)

---

## Summary

| Stage | Role | Result |
|------|------|------|
| **Authentication (AuthN)** | Identity verification | Identifies User/Group |
| **Authorization (AuthZ)** | Permission check | Allow/Deny decision |
| **Admission** | Policy review | Accept/modify/reject the request |

**Through these 3 layers of security, the Kubernetes cluster is safely protected.**
