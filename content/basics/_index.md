---
cascade:
  type: docs
title: "Basic Theory"
weight: 3
---

Covers the foundational concepts for the advanced course, from how `kubectl` works to resource structure, cluster components, workloads (Pet vs Cattle, StatefulSet), package management (Helm), and API extension (CRD).

{{< cards >}}
  {{< card link="01-kubectl" title="What Is kubectl?" subtitle="kubectl is a command-line tool for interacting with a Kubernetes cluster." >}}
  {{< card link="02-k8s-resources" title="Kubernetes Resource Map" subtitle="Kubernetes combines many types of resource objects to build a cluster and run applications." >}}
  {{< card link="03-k8s-components" title="K8s Cluster Components" subtitle="A Kubernetes cluster consists of a control plane that handles management and worker nodes where the actual workloads run." >}}
  {{< card link="04-addon-concept" title="Why the Add-on Concept Matters in K8s" subtitle="Kubernetes has a philosophy of clearly separating core components from add-ons." >}}
  {{< card link="05-addon-problems" title="Problems with Add-on Component Setups" subtitle="Kubernetes' add-on approach provides flexibility, but it also introduces problems and complexity." >}}
  {{< card link="06-csi-philosophy" title="The Philosophy of K8s CSI (Container Storage Interface)" subtitle="CSI is a key standard specification that lets Kubernetes extend flexibly without being locked into a specific storage vendor." >}}
  {{< card link="07-helm" title="Helm - The Kubernetes Package Manager" subtitle="Helm is a package manager for defining, installing, and upgrading Kubernetes applications." >}}
  {{< card link="08-pet-vs-cattle" title="Pet vs Cattle: The Philosophy of Cloud Infrastructure" subtitle="Explore the Pet and Cattle analogy to understand the core design philosophy of cloud-native environments and Kubernetes." >}}
  {{< card link="09-statefulset-pet" title="StatefulSet - A K8s Resource with Pet-like Characteristics" subtitle="Kubernetes follows the Cattle philosophy by default, but StatefulSet is an exception with characteristics closer to a Pet." >}}
  {{< card link="10-statefulset-vs-replicaset" title="StatefulSet vs ReplicaSet - Detailed Comparison" subtitle="Compare StatefulSet and ReplicaSet, two core resources for managing groups of Pods in Kubernetes." >}}
  {{< card link="11-package-manager-background" title="Why Package Management Tools Emerged" subtitle="Starting from the problems with Kubernetes add-on component setups, see why package management tools like Helm became necessary." >}}
  {{< card link="12-headless-service" title="Why StatefulSet Needs a Headless Service" subtitle="Learn the key reason why a Headless Service, rather than a regular Service, is essential when running a StatefulSet." >}}
  {{< card link="42-crd-guide" title="CustomResourceDefinition (CRD)" subtitle="How to extend the Kubernetes API to create new, user-defined resource types." >}}
{{< /cards >}}
