---
title: "NFS Subdir External Provisioner Setup Guide"
weight: 240
slug: "24-nfs-provisioner-yaml"
---

Learn how to implement Dynamic Provisioning of volumes in Kubernetes using an NFS server.

---

## 1. Resource Relationship Diagram

This shows the interactions among the main components that make up the NFS provisioner.

```mermaid
graph TD
    subgraph K8S_Cluster[Kubernetes Cluster]
        PVC[PersistentVolumeClaim] -- "1. Request" --> SC[StorageClass: nfs-client]
        SC -- "2. Watch" --> DEP[Deployment: nfs-provisioner]
        DEP -- "4. Create" --> PV[PersistentVolume]
        PV --- PVC
    end

    subgraph External_Storage[Remote Storage]
        DEP -- "3. Create directory" --> NFS[(NFS Server)]
    end

    RBAC[RBAC: SA / ClusterRole] --> DEP
```

### Roles of the Main Resources

| Component | Role | Notes |
|-----------|------|------|
| **StorageClass** | Defines which provisioner to use | Sets policies such as `archiveOnDelete` |
| **NFS Provisioner** | An agent that watches PVCs and creates the actual directories on the NFS server | Runs as a Deployment |
| **RBAC** | Permissions that let the provisioner control the cluster's PVs/PVCs | SA, ClusterRole, etc. |
| **NFS Server** | The external server where the actual data is stored | Requires IP and mount path |

---

## 2. Dynamic Provisioning Workflow

This is what happens internally when a user creates a PVC.

```mermaid
sequenceDiagram
    participant U as User
    participant P as NFS Provisioner
    participant S as NFS Server
    participant A as API Server
    
    U->>A: 1. Request PVC creation (specify StorageClass)
    P->>A: 2. Watch for new PVC creation
    P->>S: 3. Create a unique directory on the NFS server
    P->>A: 4. Create a PV containing the created path information
    A->>A: 5. Bind the PVC and PV (Bound)
    U->>A: 6. Mount and use the PVC in a Pod
```

---

## 3. Installation Verification and Test Summary

1.  **Check the provisioner status:** Use the `kubectl get pods -n nfs` command to verify the container is `Running`.
2.  **Create a PVC:** Apply the test `test-claim.yaml`.
3.  **Verify the binding:** It is successful when the `kubectl get pvc` result shows the `Bound` status.
4.  **Physical verification:** Check that a folder of the form `default-test-claim-pvc-xxx` has been created in the shared directory on the NFS server.

---

## 4. Summary

With the NFS Subdir External Provisioner, users do not need to create PVs manually; **simply creating a PVC automatically allocates a subdirectory on the NFS server**, which greatly improves operational efficiency.
