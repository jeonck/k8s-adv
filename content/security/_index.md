---
cascade:
  type: docs
title: "인증 및 보안"
weight: 4
---

암호학 기초에서 시작해 PKI·TLS, Kubernetes 인증서 운영, 다양한 인증 방식(클라이언트 인증서, Webhook, OIDC)까지 5개 그룹으로 단계적으로 학습합니다.

1. **암호학 및 보안 기초** — 키, CA, PKI, TLS 핸드셰이크
2. **K8s 보안 아키텍처** — 인증/인가, API Server 플러그인
3. **인증서 관리 및 실무** — 인증서 위치, 확인, 갱신
4. **인증 메커니즘 실습** — mTLS, Webhook
5. **엔터프라이즈 IAM 통합** — OAuth 2.0, OIDC, Keycloak

## 1. 암호학 및 보안 기초 (Foundation)

{{< cards >}}
  {{< card link="13-crypto-basic-keys" title="대칭키와 비대칭키 - Kubernetes 인증 이해를 위한 기초" subtitle="Kubernetes 의 인증 방식을 이해하기 위해 암호화의 기본 개념인 대칭키와 비대칭키에 대해 알아봅니다." >}}
  {{< card link="14-ca-and-root-ca" title="인증서 발급 기관: Root CA 와 CA" subtitle="Kubernetes API Server 인증서 이해를 위한 인증서 발급 기관 (CA) 에 대해 알아봅니다." >}}
  {{< card link="15-pki-and-x509" title="PKI 와 X.509 인증서" subtitle="공개키 기반구조 (PKI) 와 X.509 인증서에 대해 알아봅니다." >}}
  {{< card link="16-csr-and-workflow" title="CSR (Certificate Signing Request) 과 인증서 요청" subtitle="인증서 발급을 위한 CSR 생성과 인증서 요청 과정에 대해 알아봅니다." >}}
  {{< card link="17-ssl-handshake-process" title="SSL/TLS 동작 절차" subtitle="SSL/TLS 동작 원리와 하이브리드 암호화 방식" >}}
  {{< card link="18-cert-trust-chain" title="인증서를 통한 신뢰할 수 있는 통신 절차" subtitle="인증서가 어떻게 안전한 통신을 보장하는지 단계별로 설명합니다." >}}
{{< /cards >}}

## 2. K8s 보안 아키텍처 (Architecture)

{{< cards >}}
  {{< card link="19-k8s-security-overview" title="Authentication 과 Authorization" subtitle="Kubernetes 보안의 핵심 개념인 인증(Authentication)과 인가(Authorization)에 대해 알아봅니다." >}}
  {{< card link="20-api-server-auth-plugins" title="API Server 요청 처리 플러그인" subtitle="API Server 요청 처리 3단계: 인증 · 인가 · Admission Control" >}}
  {{< card link="21-user-vs-serviceaccount" title="Kubernetes 에서 Machine User 와 Human User" subtitle="Kubernetes 에서 사용자(User)는 Human User(사람)와 Machine User(기계/서비스)로 구분됩니다." >}}
{{< /cards >}}

## 3. 인증서 관리 및 실무 (Operation)

{{< cards >}}
  {{< card link="22-k8s-root-ca-internal" title="Kubernetes 의 Root CA 역할" subtitle="Kubernetes 클러스터는 자체 Root CA 로서 동작하며, 클러스터 내부의 모든 인증서를 발급하고 관리합니다." >}}
  {{< card link="23-k8s-cert-file-locations" title="Kubernetes 인증서 보관 위치" subtitle="Kubernetes 클러스터에서 인증서가 저장되는 위치와 관리 방법을 알아봅니다." >}}
  {{< card link="24-kubeadm-cert-management" title="kubeadm init 인증서 생성 실습" subtitle="클러스터를 초기화할 때 사용하는 주요" >}}
  {{< card link="25-static-pod-auth-config" title="Static Pod 와 API Server" subtitle="Static Pod의 개념과 API Server와의 관계, 그리고 컨트롤 플레인 컴포넌트 구동 방식에 대해 알아봅니다." >}}
  {{< card link="26-inspect-cert-info-1" title="인증서 정보 확인 (1/2) - Root CA 와 API Server" subtitle="Kubernetes 클러스터의 Root CA 인증서와 API Server에서 사용하는 인증서 파일 정보를 확인합니다." >}}
  {{< card link="27-inspect-cert-info-2" title="인증서 정보 확인 (2/2) - 암호화 검증" subtitle="Root CA 인증서의 공개키를 이용한 암호화 검증을 실습합니다." >}}
  {{< card link="28-cert-expiration-and-renew" title="인증서 만료기간 확인 및 ConfigMap 정보" subtitle="Kubernetes 클러스터의 인증서 만료기간을 확인하고 kubeadm-config ConfigMap 정보를 알아봅니다." >}}
{{< /cards >}}

## 4. 인증 메커니즘 실습 (Implementation)

{{< cards >}}
  {{< card link="29-client-cert-auth-concept" title="Kubernetes API Server 인증서 접속 방식" subtitle="Kubernetes API Server 에 안전하게 접속하기 위한 X.509 인증서 기반 인증 방식을 설명합니다." >}}
  {{< card link="30-mtls-communication" title="Mutual TLS Authentication (mTLS)" subtitle="Kubernetes 클러스터 내부 통신의 근간이 되는 상호 TLS 인증(mTLS)에 대해 알아봅니다." >}}
  {{< card link="31-lab-client-cert-auth" title="Kubernetes Client Certificate 인증 실습" subtitle="일반 사용자(honggildong)가 자신만의 네임스페이스에서만 작업을 수행할 수 있도록 인증서 기반의 환경을 구축하는 실습입니다." >}}
  {{< card link="32-http-basic-auth-deprecated" title="HTTP Basic Authentication" subtitle="HTTP 기본 인증 (Basic Auth)의 개념과 특징에 대해 알아봅니다." >}}
  {{< card link="33-webhook-token-auth-concept" title="API Server Webhook Token Authentication" subtitle="Kubernetes API Server의 Webhook Token Authentication 에 대해 알아봅니다." >}}
  {{< card link="34-lab-webhook-auth-setup" title="API Server 인증 플러그인을 Webhook 인증으로 변경하는 절차" subtitle="Kubernetes API 서버의 인증 방식을 외부 웹훅(Webhook) 서버 기반으로 전환하는 실습 절차입니다." >}}
{{< /cards >}}

## 5. 엔터프라이즈 IAM 통합 (Advanced)

{{< cards >}}
  {{< card link="35-lab-multi-cluster-config" title="멀티 클러스터 접속 설정 실습" subtitle="하나의 kubectl 도구로 여러 개의 독립적인 Kubernetes 클러스터를 관리하고 전환하는 방법을 실습합니다." >}}
  {{< card link="36-oauth2-fundamentals" title="OAuth 2.0 개념 정리" subtitle="OAuth 2.0은 현대 웹과 모바일 환경에서 가장 널리 쓰이는 권한 부여(Authorization) 프레임워크입니다." >}}
  {{< card link="37-oidc-on-kubernetes" title="OpenID Connect (OIDC) 개념" subtitle="OpenID Connect(OIDC)는 OAuth 2.0 프로토콜 위에 신원 확인(Identity) 레이어를 추가한 현대적인 인증 표준입니다." >}}
  {{< card link="38-keycloak-setup-guide" title="Keycloak: 오픈소스 IAM 솔루션" subtitle="OIDC/OAuth 2.0 을 구현한 오픈소스 IAM, Keycloak 소개와 설치" >}}
  {{< card link="39-lab-k8s-keycloak-oidc" title="API Server 에 Keycloak OIDC 설정 추가" subtitle="Kubernetes API 서버를 외부 IAM 솔루션인 Keycloak과 연동하여 OpenID Connect(OIDC) 인증을 활성화하는 실습입니다." >}}
{{< /cards >}}

