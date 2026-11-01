---
title: "📅 Kubernetes Advanced Course Curriculum"
weight: 0
slug: "00-curriculum"
---

Going beyond simple usage, this course covers the essential topics for becoming an advanced engineer: **an in-depth analysis of how Kubernetes works, cryptography-based security design, and custom controller development**.

---

## 🧭 Detailed Curriculum Roadmap

| Stage | Main topic | Key details | Related docs and labs |
| :--- | :--- | :--- | :--- |
| **Stage 1** | **Preparation & Basics** | Building the lab infrastructure, understanding the basic architecture, how `kubectl` works | 10-lab-environment, 01-kubectl, 02-k8s-resources |
| **Stage 2** | **Advanced Workloads** | Pet vs Cattle paradigm, StatefulSet deployment model, Headless Service analysis | 08-pet-vs-cattle, 09-statefulset-pet, 12-headless-service |
| **Stage 3** | **Cryptography & Security** | CA and PKI principles, TLS/SSL handshake, authentication chain analysis | 13-crypto-basic-keys, 14-ca-and-root-ca, 17-ssl-handshake-process |
| **Stage 4** | **K8s Authentication/Authorization** | mTLS communication, setting up webhook token authentication, Keycloak & OIDC SSO integration | 30-mtls-communication, 34-lab-webhook-auth-setup, 39-lab-k8s-keycloak-oidc |
| **Stage 5** | **Certificates in Practice** | Checking API server certificate expiration, renewing certificates with kubeadm, managing authentication files | 23-k8s-cert-file-locations, 28-cert-expiration-and-renew |
| **Stage 6** | **Extension & Operator** | CustomResourceDefinition (CRD) design, developing Operators and the reconcile loop | 42-crd-guide, 43-operator-development, 44-operator-and-cr-relationship |
| **Stage 7** | **Hands-on Add-on Labs** | Ingress, MetalLB LoadBalancer, NFS Provisioner, Prometheus/Grafana | 22-metallb-yaml, 23-ingress-nginx-yaml, 45-prometheus-grafana-operator-install |
| **Stage 8** | **Use Cases (Operations/Troubleshooting)** | ResourceQuota, Pod deletion process, Node NotReady, ImagePullBackOff, architecture, DaemonSet failures, pod.yaml structure | 46-uc-resource-quota ~ 52-uc-pod-yaml-structure |

---

## 🎯 Learning Goals

1.  **A clear understanding of how things work**: Understand how the API server and etcd interact and how the authentication/authorization pipeline works.
2.  **Security infrastructure design skills**: Build practical skills for configuring TLS-secured communication inside and outside the cluster and integrating the cluster with IAM systems.
3.  **Declarative extension (Operator)**: Lay the groundwork for building your own operations-automation tools based on CRDs and Go/Kubebuilder.
