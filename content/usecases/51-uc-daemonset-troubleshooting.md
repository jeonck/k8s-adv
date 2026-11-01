---
title: "Use Case 6. Troubleshooting an Unhealthy DaemonSet"
weight: 510
slug: "51-uc-daemonset-troubleshooting"
---

> 📎 Reference: <https://lnkd.in/geGgkXKe>

A DaemonSet runs **one Pod on every (or each selected) node**. It is used for log collectors, CNI plugins, monitoring agents, and the like, so a problem has a wide blast radius.

---

## 1. Read the Numbers First

```bash
kubectl get ds -A
# NAME        DESIRED  CURRENT  READY  UP-TO-DATE  AVAILABLE  NODE SELECTOR
```

| Field | Meaning |
|------|------|
| `DESIRED` | Number of Nodes that should run the Pod |
| `CURRENT` | Number of DaemonSet Pods that exist |
| `READY` | Number of Pods in the Ready state |
| `UP-TO-DATE` | Number of Pods updated to the latest template |

`DESIRED ≠ CURRENT` → a **scheduling** problem; `CURRENT ≠ READY` → a **Pod startup/probe** problem.

```mermaid
flowchart TD
    A["DaemonSet abnormal"] --> B{"DESIRED vs CURRENT"}
    B -->|Mismatch| C["Node selector / taints and tolerations / insufficient resources"]
    B -->|Match| D{READY?}
    D -->|Low| E["describe pod / logs: CrashLoop, Probe failure, ImagePull"]
    D -->|Normal| F{UP-TO-DATE?}
    F -->|Low| G["RollingUpdate stalled: maxUnavailable, previously updated Pod unhealthy"]
```

---

## 2. Checks by Cause

### (1) Some Nodes have no Pod
```bash
kubectl describe ds <name> -n <ns>
kubectl get nodes --show-labels
kubectl describe node <node> | grep -i taint
```
- **Taint**: Tainted Nodes such as control plane Nodes require matching `tolerations`
- **nodeSelector / nodeAffinity** mismatch
- Insufficient Node resources (a DaemonSet Pod must also satisfy its resource requests)

```yaml
spec:
  template:
    spec:
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
```

### (2) Pod is in CrashLoopBackOff or Not Ready
```bash
kubectl logs <pod> -n <ns> --previous
kubectl describe pod <pod> -n <ns>
```
- Permission or path problems with `hostPath`, or `hostNetwork`/`privileged` settings
- Port conflicts (when using `hostPort` or `hostNetwork`)
- Liveness or readiness probe misconfiguration

### (3) Rollout is stuck
```bash
kubectl rollout status ds/<name> -n <ns>
kubectl rollout history ds/<name> -n <ns>
```
- Check `updateStrategy.rollingUpdate.maxUnavailable` (default 1)
- If the Pod on one Node stays Not Ready, the rollout cannot proceed to the next Node
- With the `OnDelete` strategy, Pods are updated only when you delete them manually

```bash
kubectl rollout undo ds/<name> -n <ns>
```

---

## 3. Troubleshooting Cases

### Case 1. Only the control plane Node has no Pod (Taint)

- **Symptom**: There are 5 Nodes (1 control plane + 4 workers) but `DESIRED=4, CURRENT=4`. The log collector cannot collect control plane logs.
- **Diagnosis**
  ```bash
  kubectl describe node cp-1 | grep -i taint
  # Taints: node-role.kubernetes.io/control-plane:NoSchedule
  ```
- **Cause**: The DaemonSet does not tolerate the `NoSchedule` taint on the control plane Node.
- **Fix**: Add `tolerations` and run `kubectl apply`, then confirm that `DESIRED` and `CURRENT` increase to 5.

### Case 2. CrashLoopBackOff on only one Node (hostPath / permissions)

- **Symptom**: `READY` is `DESIRED-1`. Only the Pod on one node is in `CrashLoopBackOff`.
- **Diagnosis**
  ```bash
  kubectl get pods -n logging -o wide | grep -v Running
  kubectl logs <pod> -n logging --previous
  # open /var/log/containers: permission denied  (or no such file or directory)
  ```
- **Cause**: The container runtime on that Node uses a different path (`/var/log/pods`), or SELinux/AppArmor blocks `hostPath` access.
- **Fix**: Make the Node configuration consistent or fix the mount path, and adjust `securityContext` if needed. Suspect OS or runtime differences between Nodes first.

### Case 3. Pod is Pending on a newly added Node (insufficient resources)

- **Symptom**: Right after scaling out Nodes, the DaemonSet Pod is `Pending` because regular workloads have already filled the Node.
- **Diagnosis**
  ```bash
  kubectl describe pod <pod> | grep -A5 Events
  # 0/1 nodes are available: 1 Insufficient cpu.
  ```
- **Cause**: A DaemonSet Pod must also satisfy its `requests` to be scheduled. Regular Pods claimed the capacity first.
- **Fix**: Setting `priorityClassName: system-node-critical` on the agent lets it preempt lower-priority Pods and get scheduled. Lowering the resource requests is another option.

### Case 4. Rolling update stops midway

- **Symptom**: `UP-TO-DATE` is stuck at 3, and `rollout status` keeps waiting.
- **Diagnosis**
  ```bash
  kubectl rollout status ds/node-agent -n monitoring
  kubectl get pods -n monitoring -o wide     # Check for Not Ready among the new-version Pods
  ```
- **Cause**: The readiness probe of the new image fails (bad configuration value) → and because `maxUnavailable` is 1, the rollout cannot proceed to the next node.
- **Fix**: Recover immediately with `kubectl rollout undo ds/node-agent -n monitoring`, then fix the configuration. For large clusters, specify a percentage such as `maxUnavailable: 10%`.

### Case 5. Pod fails to start due to a hostPort conflict

- **Symptom**: On some Nodes the Pod stays `Pending` or keeps failing, with port-related messages in its events.
- **Diagnosis**
  ```bash
  kubectl describe pod <pod> | grep -i "port"
  # didn't have free ports for the requested pod ports
  ss -ltnp | grep :9100        # Check directly on the Node
  ```
- **Cause**: A process on the Node (e.g., a manually installed node_exporter) or another DaemonSet already uses the same port.
- **Fix**: Stop the existing process or change the port. Conflicts are especially likely when using `hostNetwork`.

### Case 6. Node drain hangs

- **Symptom**: `kubectl drain` makes no progress because of DaemonSet Pods.
- **Cause/Fix**: DaemonSet Pods are recreated immediately even if deleted, so they must be skipped during the drain.
  ```bash
  kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
  ```

---

## 4. Checklist

- [ ] Compare the `DESIRED`, `CURRENT`, and `READY` numbers
- [ ] Check the taints, labels, and resources of the problem Node
- [ ] Check the `describe` Events and `logs --previous` of the problem Pod
- [ ] PriorityClass setting (consider `system-node-critical` for important agents)
- [ ] Update strategy and `maxUnavailable` settings
