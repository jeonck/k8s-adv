# Authentication 과 Authorization

Kubernetes 보안의 핵심 개념인 인증(Authentication)과 인가(Authorization)에 대해 알아봅니다.

---

## 핵심 개념 비교

| 구분 | Authentication (인증) | Authorization (인가) |
|------|-----------------------|----------------------|
| **핵심 질문** | "당신은 누구입니까?" (Who are you?) | "당신은 무엇을 할 수 있습니까?" (What can you do?) |
| **목적** | 신원 확인 | 권한 부여 및 리소스 접근 제어 |
| **비유** | 여권 검사, 회사 출입증 | 비자 발급, 특정 층 출입 권한 |
| **K8s 방식** | 인증서, 토큰, OIDC 등 | RBAC, ABAC, Node 등 |

---

## 보안 처리 흐름

Kubernetes API 서버로 들어오는 모든 요청은 다음의 3단계를 거칩니다.

<div class="mermaid">
flowchart TD
    Request[사용자 요청] --> AuthN{1. 인증 Authentication}
    AuthN -- 성공 --> AuthZ{2. 인가 Authorization}
    AuthN -- 실패 --> Deny1[401 Unauthorized]
    
    AuthZ -- 성공 --> Admit{3. Admission Control}
    AuthZ -- 실패 --> Deny2[403 Forbidden]
    
    Admit -- 승인 --> ETCD[(etcd 저장/수행)]
    Admit -- 거부 --> Deny3[403 Forbidden]
</div>

---

## 1. Authentication (인증)

요청한 주체가 누구인지 확인하는 과정입니다. Kubernetes는 자체적인 '사용자' 리소스를 가지지 않으며, 외부 인증 시스템이나 인증서를 통해 신원을 확인합니다.

### 주요 인증 방식
- **X.509 Client Certs:** 클라이언트 인증서를 통한 인증 (kubeadm 기본 방식)
- **Static Token File:** 정적 파일을 통한 토큰 인증
- **Bootstrap Tokens:** 클러스터 조인 시 사용하는 토큰
- **Service Account Tokens:** Pod 내에서 사용하는 자동 생성 토큰
- **OIDC (OpenID Connect):** 외부 IDP(Google, Okta 등)와 연동한 인증

---

## 2. Authorization (인가)

인증된 사용자가 특정 리소스에 대해 특정 작업(Verb)을 수행할 권한이 있는지 확인합니다.

### 주요 인가 모드
- **RBAC (Role-Based Access Control):** 역할 기반 접근 제어 (가장 권장됨)
- **ABAC (Attribute-Based Access Control):** 속성 기반 접근 제어
- **Node Authorization:** kubelet의 권한을 제한하는 특수 목적 인가
- **Webhook:** 외부 서비스에 권한 확인을 요청하는 방식

---

## 3. Admission Control

인증과 인가를 통과한 요청이 클러스터의 정책에 맞는지 최종적으로 검사하고 필요시 데이터를 수정(Mutating)하거나 거부(Validating)합니다.

- **Mutating Admission Webhook:** 요청 내용을 수정 (예: 사이드카 주입)
- **Validating Admission Webhook:** 요청 내용 검증 (예: 리소스 제한 체크)

---

## 요약

| 단계 | 역할 | 결과 |
|------|------|------|
| **인증 (AuthN)** | 신원 확인 | User/Group 식별 |
| **인가 (AuthZ)** | 권한 확인 | Allow/Deny 결정 |
| **Admission** | 정책 검수 | 요청 수락/수정/거부 |

**이 3단계 보안 계층을 통해 Kubernetes 클러스터는 안전하게 보호됩니다.**
