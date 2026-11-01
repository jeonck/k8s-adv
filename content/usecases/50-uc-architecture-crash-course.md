---
title: "Use Case 5. Kubernetes Architecture Crash Course"
weight: 500
slug: "50-uc-architecture-crash-course"
---

> 📎 Reference: <https://lnkd.in/gseEj3wD>

A quick overview of the components that make up a Kubernetes cluster and how requests are processed. (For details, see the 03-k8s-components document.)

---

## 1. The Big Picture

```mermaid
graph TB
    subgraph CP[Control Plane]
        API[kube-apiserver]
        ETCD[(etcd)]
        SCH[kube-scheduler]
        CM[kube-controller-manager]
        CCM[cloud-controller-manager]
    end
    subgraph N1[Worker Node]
        KL[kubelet]
        KP[kube-proxy]
        CR[Container Runtime]
        PODS[Pods]
    end
    U[kubectl / Client] --> API
    API <--> ETCD
    SCH --> API
    CM --> API
    CCM --> API
    KL --> API
    KL --> CR
    CR --> PODS
    KP --> PODS
```

---

## 2. Component Roles

### Control Plane

| Component | Role |
|----------|------|
| **kube-apiserver** | The center of all communication. Provides authentication, authorization, admission control, and the REST API. The **only** component that talks to etcd |
| **etcd** | A distributed key-value store that holds cluster state (Raft consensus) |
| **kube-scheduler** | Places unassigned Pods on suitable nodes (filtering → scoring) |
| **kube-controller-manager** | Runs controller loops such as Deployment, ReplicaSet, Node, and Job |
| **cloud-controller-manager** | Integrates with the cloud provider's load balancers, nodes, and routes |

### Worker Node

| Component | Role |
|----------|------|
| **kubelet** | The node agent. Runs and monitors containers according to the PodSpec, and reports status |
| **kube-proxy** | Implements a Service's virtual IP with iptables/IPVS rules |
| **Container Runtime** | containerd, CRI-O, etc. Integrates with the kubelet through the CRI |

---

## 3. What Happens in a Single `kubectl apply`

```mermaid
sequenceDiagram
    participant U as kubectl
    participant A as API Server
    participant E as etcd
    participant C as Controller Manager
    participant S as Scheduler
    participant K as kubelet
    U->>A: Create Deployment
    A->>E: Store
    C->>A: (Watch) Create ReplicaSet
    C->>A: (Watch) Create Pod (no nodeName)
    S->>A: (Watch) Bind Pod to a node
    K->>A: (Watch) Detect Pod on my node
    K->>K: Start container via container runtime
    K->>A: Report Pod status
```

The core principle is **declarative desired state + a watch-based reconcile loop**.

---

## 4. Points to Remember

- Components do not talk to each other directly; they exchange state **only through the API server**.
- etcd failure = loss of cluster control → backups and an HA setup are essential.
- Add-ons (CoreDNS, CNI, Metrics Server, etc.) run on top of the cluster as Pods.
