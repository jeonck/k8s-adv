---
title: "Operator and Custom Resource (CR) Relationship"
weight: 440
slug: "44-operator-and-cr-relationship"
---

Understand how an Operator and a Custom Resource (CR) interact to manage applications in a Kubernetes environment.

---

## 1. Core Concepts and Analogy

The easiest way to understand the relationship between an Operator and a CR is to think of a **'factory'** and an **'order form'**.

| Item | Concept | Analogy | Main Components |
|------|------|------|---------------|
| **Operator** | Automation software that embeds operational knowledge | **A factory with management robots** | Controller, CRD, domain knowledge |
| **Custom Resource** | A user-defined resource instance | **A customer's order form (blueprint)** | Defines the desired state (spec) |

```mermaid
graph TD
    User[User] -- "1. Submit order form (CR)" --> API[K8s API Server]
    API -- "2. Detect create event" --> OP[Operator / Controller]
    
    subgraph Operator_Logic
    OP -- "3. Interpret spec" --> Reconcile{Reconcile Loop}
    Reconcile -- "4. Create actual resources" --> Real[Pods, Services, PVCs]
    Real -- "5. Feed back current state" --> Reconcile
    end
    
    Reconcile -- "6. Update status" --> API
```

---

## 2. Why Must the Operator Be Installed First?

Here are 4 reasons why the Operator must already be running before you deploy a CR to the cluster.

1.  **CRD registration:** Kubernetes must first be told about the definition (CRD) so that it can recognize a new resource type (e.g., `kind: MySQL`).
2.  **Controller activation:** When an order form (CR) arrives, the 'brain (Controller)' that reads it and launches the actual Pods must already be waiting.
3.  **RBAC permissions:** The permissions (Role/Binding) the Operator needs to create Pods and Services on your behalf must be set up first.
4.  **Dependency preparation:** The Operator first sets up the basic infrastructure needed to run the app, such as a Secret for storing passwords and storage settings.

---

## 3. What a CR Contains (spec vs status)

Through `spec`, the user states the **"desired state"**, and through `status`, the Operator reports the **"current state"**.

| Field | Role | Typical Contents |
|------|------|----------------|
| **spec** | Defined by the user (Desired) | Version, Replicas, resources (CPU/Mem), backup schedule, ports, etc. |
| **status** | Recorded by the Operator (Current) | Number of running Pods, access address (Endpoint), last backup time, error messages, etc. |

---

## 4. Summary: Wrapping Up with Analogies

- **Operator = Apartment complex management office:** The office must be established (installed) first so that staff (controllers) and equipment (permissions) are ready.
- **CR = Move-in application:** Only after the management office opens can you submit an application, get assigned a unit number (name), and receive a key (Service).

**If you submit an application (CR) without a management office (Operator), that application is just a scrap of paper no one reads.**
