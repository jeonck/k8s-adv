---
title: "Use Case 3. Resolving a Kubernetes Node in NotReady State"
weight: 480
slug: "48-uc-node-not-ready"
---

> 📎 Reference: <https://lnkd.in/gdH9SVuN>

A troubleshooting procedure that systematically narrows down why a Node goes into the `NotReady` state.

---

## 1. What Is NotReady?

A Node is `NotReady` when its kubelet fails to report its status (Lease/NodeStatus) to the API server periodically, or when the reported **Ready condition is False or Unknown**. After a grace period (40 seconds by default), the node lifecycle controller marks the Node as `NotReady` and later evicts the Pods on that Node.

```mermaid
flowchart TD
    A["NotReady Node found"] --> B{"kubectl describe node<br/>Check Conditions"}
    B -->|Unknown: Kubelet stopped posting| C["Check kubelet / Node connectivity"]
    B -->|MemoryPressure / DiskPressure / PIDPressure| D["Relieve resource pressure"]
    B -->|NetworkUnavailable| E["Check CNI"]
    C --> F{systemctl status kubelet}
    F -->|inactive| G["Restart kubelet / check configuration"]
    F -->|active| H["Check container runtime, certificates, API server connectivity"]
```

---

## 2. Step-by-Step Checks

### Step 1. Check the Conditions
```bash
kubectl get nodes
kubectl describe node <node> | sed -n '/Conditions/,/Addresses/p'
kubectl get events --field-selector involvedObject.name=<node>
```

### Step 2. Log in to the Node and check the kubelet
```bash
systemctl status kubelet
journalctl -u kubelet -n 100 --no-pager
```

### Step 3. Check the container runtime
```bash
systemctl status containerd
crictl ps
crictl info
```

### Step 4. Check for resource pressure
```bash
df -h        # DiskPressure (/var/lib/kubelet, /var/lib/containerd)
free -m      # MemoryPressure
```

### Step 5. Network, CNI, and certificates
```bash
ls /etc/cni/net.d/
kubectl get pods -n kube-system -o wide | grep <node>
openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -dates
curl -k https://<apiserver>:6443/healthz
```

---

## 3. Common Causes

| Symptom (Log/Condition) | Cause | Action |
|--------------------|------|------|
| `Kubelet stopped posting node status` | kubelet is not running | `systemctl restart kubelet`, check logs |
| `container runtime is down` | Container runtime failure (e.g., containerd) | Restart the runtime |
| `DiskPressure=True` | Disk usage exceeds the eviction threshold | Clean up images/logs (`crictl rmi --prune`) |
| `MemoryPressure=True` | Node is low on memory | Move workloads, adjust memory limits |
| `cni plugin not initialized` | CNI plugin not installed or misconfigured | Check the CNI DaemonSet |
| `x509: certificate has expired` | kubelet certificate has expired | Renew the certificate (see doc 28) |
| swap enabled | kubelet fails to start | Run `swapoff -a` and edit `/etc/fstab` |

---

## 4. Verification After Recovery

```bash
kubectl uncordon <node>      # Uncordon the Node if you had cordoned it
kubectl get nodes -w
```

> If the Node cannot be recovered, run `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data` and then replace the Node.
