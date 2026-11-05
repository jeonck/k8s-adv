---
cascade:
  type: docs
title: "Use Cases"
weight: 7
---

Failures and internal behaviors you frequently encounter in the field, organized case by case. Follow along in the order symptom → cause → resolution.

## Top 7 Kubernetes Troubleshooting Use Cases

The most common Kubernetes failure signals, in the order you are likely to meet them:

| # | Use case | Document |
|---|----------|----------|
| 1 | How to Fix Kubernetes Node Not Ready | [Use Case 3](48-uc-node-not-ready) |
| 2 | How to Fix Kubernetes Node Disk Pressure | [Use Case 8](53-uc-node-disk-pressure) |
| 3 | Understanding Kubernetes CreateContainerError | [Use Case 9](54-uc-createcontainererror) |
| 4 | Understanding Kubernetes CreateContainerConfigError | [Use Case 10](55-uc-createcontainerconfigerror) |
| 5 | Understanding Kubernetes ImagePullBackOff | [Use Case 4](49-uc-imagepullbackoff) |
| 6 | Understanding Kubernetes RunContainerError | [Use Case 11](56-uc-runcontainererror) |
| 7 | Understanding Kubernetes OOMKilled | [Use Case 12](57-uc-oomkilled) |

## All Use Cases

{{< cards >}}
  {{< card link="46-uc-resource-quota" title="Use Case 1. How Kubernetes Enforces Resource Quota" subtitle="How ResourceQuota, which limits total resources and object counts per Namespace, is actually enforced." >}}
  {{< card link="47-uc-pod-deletion" title="Use Case 2. The Pod Deletion Process - Internal Behavior Analysis" subtitle="What happens internally when you run kubectl delete pod, and why graceful shutdown is needed." >}}
  {{< card link="48-uc-node-not-ready" title="Use Case 3. How to Resolve a Kubernetes Node NotReady" subtitle="A troubleshooting procedure that systematically narrows down why a Node becomes NotReady." >}}
  {{< card link="49-uc-imagepullbackoff" title="Use Case 4. Kubernetes ImagePullBackOff Explained" subtitle="Why a Pod goes from ErrImagePull to ImagePullBackOff, and how to fix it." >}}
  {{< card link="50-uc-architecture-crash-course" title="Use Case 5. Kubernetes Architecture Crash Course" subtitle="A one-stop tour of the components that make up a Kubernetes cluster and the flow in which requests are processed." >}}
  {{< card link="51-uc-daemonset-troubleshooting" title="Use Case 6. Troubleshooting an Unhealthy Kubernetes DaemonSet" subtitle="A DaemonSet runs one Pod on every node (or on each selected node); here is how to troubleshoot one that is unhealthy." >}}
  {{< card link="52-uc-pod-yaml-structure" title="Use Case 7. Analyzing the Structure of pod.yaml" subtitle="A field-by-field walkthrough of the Pod definition, the foundation of every Kubernetes manifest." >}}
  {{< card link="53-uc-node-disk-pressure" title="Use Case 8. How to Fix Kubernetes Node Disk Pressure" subtitle="Why the kubelet sets DiskPressure and evicts Pods, how to find what fills the disk, and how to fix and prevent it." >}}
  {{< card link="54-uc-createcontainererror" title="Use Case 9. Understanding Kubernetes CreateContainerError" subtitle="The container runtime failed to create the container: how to tell it apart from the look-alike statuses and fix it." >}}
  {{< card link="55-uc-createcontainerconfigerror" title="Use Case 10. Understanding Kubernetes CreateContainerConfigError" subtitle="The kubelet could not build the container configuration, usually because of a missing ConfigMap, Secret, or key." >}}
  {{< card link="56-uc-runcontainererror" title="Use Case 11. Understanding Kubernetes RunContainerError" subtitle="The container was created but its process could not start: entrypoint, permission, architecture, and mount problems." >}}
  {{< card link="57-uc-oomkilled" title="Use Case 12. Understanding Kubernetes OOMKilled" subtitle="Why containers are killed with exit code 137, and how to right-size memory limits." >}}
{{< /cards >}}
