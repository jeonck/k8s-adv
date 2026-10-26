---
title: "📅 Kubernetes 심화 과정 학습 커리큘럼"
weight: 0
slug: "00-curriculum"
---

본 과정은 단순한 사용법을 넘어, **동작 원리 분석, 암호학 기반 보안 설계, 커스텀 컨트롤러 개발** 등 고급 엔지니어가 되기 위한 필수 주제들을 다룹니다.

---

## 🧭 세부 커리큘럼 로드맵

| 단계 | 대주제 | 주요 상세 내용 | 관련 문서 및 실습 |
| :--- | :--- | :--- | :--- |
| **1단계** | **준비 & 기본** | 실습 인프라 구성, 기본 아키텍처 이해, `kubectl` 동작 원리 | 10-lab-environment, 01-kubectl, 02-k8s-resources |
| **2단계** | **워크로드 심화** | Pet vs Cattle 패러다임, StatefulSet 배포 모델, Headless Service 분석 | 08-pet-vs-cattle, 09-statefulset-pet, 12-headless-service |
| **3단계** | **암호학 및 보안** | CA 및 PKI 인프라 원리, TLS/SSL 핸드셰이크, 인증 체인 분석 | 13-crypto-basic-keys, 14-ca-and-root-ca, 17-ssl-handshake-process |
| **4단계** | **K8s 인증/인가** | mTLS 통신, Webhook Token 인증 구축, Keycloak & OIDC SSO 연동 | 30-mtls-communication, 34-lab-webhook-auth-setup, 39-lab-k8s-keycloak-oidc |
| **5단계** | **인증서 실무** | API Server 인증서 만료 확인, kubeadm을 통한 인증서 갱신, 인증 파일 관리 | 23-k8s-cert-file-locations, 28-cert-expiration-and-renew |
| **6단계** | **확장 및 Operator** | Custom Resource Definition(CRD) 설계, Operator 패턴 및 Reconcile 루프 개발 | 42-crd-guide, 43-operator-development, 44-operator-and-cr-relationship |
| **7단계** | **실전 에드온 실습** | Ingress, MetalLB LoadBalancer, NFS Provisioner, Prometheus/Grafana | 22-metallb-yaml, 23-ingress-nginx-yaml, 45-prometheus-grafana-operator-install |
| **8단계** | **Use Cases (운영/트러블슈팅)** | Resource Quota, Pod 삭제 과정, Node NotReady, ImagePullBackOff, 아키텍처, DaemonSet 장애, pod.yaml 구조 | 46-uc-resource-quota ~ 52-uc-pod-yaml-structure |

---

## 🎯 학습 목표 (Goal)

1.  **동작 원리의 명확한 이해**: API Server와 etcd 간의 상호작용 및 인증/인가 파이프라인의 핵심 구조를 규명합니다.
2.  **보안 인프라 설계 능력**: 클러스터 내/외부의 TLS 보안 통신을 구성하고 IAM 시스템과 연동하는 실무 역량을 배양합니다.
3.  **선언적 확장(Operator)**: CRD와 Go/Kubebuilder 기반으로 자체적인 운영 자동화 도구를 직접 설계할 수 있는 발판을 마련합니다.
