---
title: "K8s Cluster Components"
weight: 30
slug: "03-k8s-components"
---

A Kubernetes cluster consists of a **Control Plane** that handles management and **Worker Nodes** where the actual workloads run.

---

## 1. Control Plane (Management Layer)

| Component | Role |
|----------|------|
| **kube-apiserver** | The central gateway of the cluster. Handles all requests and is responsible for authentication and authorization |
| **etcd** | A key-value store that holds all cluster state, acting as the cluster's "brain" |
| **kube-scheduler** | The scheduler that decides which node a newly created Pod should be placed on |
| **kube-controller-manager** | A collection of controllers that manage cluster state such as nodes, replicas, and endpoints |

---

## 2. Worker Node (Workload Layer)

| Component | Role |
|----------|------|
| **kubelet** | The agent that runs on each node. Ensures containers run according to the Pod spec |
| **kube-proxy** | Manages network rules on the node and routes traffic to Services |
| **Container Runtime** | The software that actually runs containers (containerd, CRI-O, etc.) |

---

## 3. Overall Architecture Diagram

This architecture shows the interactions between components at a glance.

```mermaid
graph TD
    subgraph CP[Control Plane]
        API[kube-apiserver]
        ETCD[(etcd)]
        SCHED[kube-scheduler]
        KCM[kube-controller-manager]

        API <--> ETCD
        API --- SCHED
        API <--> KCM
    end

    subgraph Node1[Worker Node 1]
        K1[kubelet]
        P1[kube-proxy]
        Pod1[Pods]
        K1 --- Pod1
    end

    subgraph Node2[Worker Node 2]
        K2[kubelet]
        P2[kube-proxy]
        Pod2[Pods]
        K2 --- Pod2
    end

    API <==> K1
    API <==> K2
    Admin[Administrator / kubectl] -- "Send commands" --> API
```

**The components are tightly interconnected and work together, centered on the API server, to maintain the cluster's declarative Desired State.**
