---
cascade:
  type: docs
title: "Use Cases"
weight: 7
---

Failure responses and internal behaviors that you frequently encounter in the field, organized case by case. Follow along in the order symptom → cause → resolution.

{{< cards >}}
  {{< card link="46-uc-resource-quota" title="Use Case 1. How Kubernetes Enforces Resource Quota" subtitle="We look at how ResourceQuota, which limits total resources and object counts per namespace, is actually enforced." >}}
  {{< card link="47-uc-pod-deletion" title="Use Case 2. The Pod Deletion Process - Internal Behavior Analysis" subtitle="What happens internally when you run kubectl delete pod, and why Graceful Shutdown is needed" >}}
  {{< card link="48-uc-node-not-ready" title="Use Case 3. How to Resolve a Kubernetes Node NotReady" subtitle="A troubleshooting procedure that systematically narrows down the causes of a node becoming NotReady." >}}
  {{< card link="49-uc-imagepullbackoff" title="Use Case 4. Kubernetes ImagePullBackOff Explained" subtitle="Why a Pod goes from ErrImagePull to ImagePullBackOff, and how to fix it." >}}
  {{< card link="50-uc-architecture-crash-course" title="Use Case 5. Kubernetes Architecture Crash Course" subtitle="A one-stop tour of the components that make up a Kubernetes cluster and the flow in which requests are processed." >}}
  {{< card link="51-uc-daemonset-troubleshooting" title="Use Case 6. Troubleshooting an Unhealthy Kubernetes DaemonSet" subtitle="A DaemonSet runs one Pod on every (or each selected) node." >}}
  {{< card link="52-uc-pod-yaml-structure" title="Use Case 7. Analyzing the Structure of pod.yaml" subtitle="We examine the Pod definition, the basis of every Kubernetes manifest, field by field." >}}
{{< /cards >}}
