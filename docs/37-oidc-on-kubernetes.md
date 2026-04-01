# OpenID Connect (OIDC) 개념

OpenID Connect(OIDC)는 OAuth 2.0 프로토콜 위에 **신원 확인(Identity)** 레이어를 추가한 현대적인 인증 표준입니다.

---

## OpenID Connect 란?

OIDC는 "사용자가 누구인지"를 확인하는 인증(Authentication)을 위해 설계되었습니다. OAuth 2.0이 권한 부여에 집중한다면, OIDC는 그 기반 위에서 사용자의 프로필 정보를 안전하게 전달하는 역할을 합니다.

### OAuth 2.0 vs OpenID Connect 비교

| 구분 | OAuth 2.0 | OpenID Connect (OIDC) |
|------|-----------|-----------------------|
| **목적** | 권한 부여 (Authorization) | 신원 인증 (Authentication) |
| **핵심 질문** | "무엇을 할 수 있는가?" | "누구인가?" |
| **발급물** | Access Token (데이터 접근용) | **ID Token (사용자 정보 포함)** |
| **비유** | 특정 방의 출입 카드 | 사진이 부착된 신분증 |

> **공식:** OpenID Connect = OAuth 2.0 + Identity Layer

---

## OIDC의 핵심: ID Token

OIDC에서 가장 중요한 요소는 **ID Token**입니다. 이는 JSON Web Token(JWT) 형식을 따르며, 발급자(CA)에 의해 디지털 서명되어 위변조가 불가능합니다.

### ID Token 내부 구조 (JWT Claims)

| 클레임 | 의미 | 예시 |
|--------|------|------|
| **iss (Issuer)** | 토큰을 발급한 기관 (IdP) | `https://accounts.google.com` |
| **sub (Subject)** | 사용자의 고유 식별 ID | `1029384756` |
| **aud (Audience)** | 토큰을 사용할 대상 앱 | `my-k8s-cluster` |
| **exp (Expiration)** | 토큰 만료 시간 | `1672531200` |
| **email** | 사용자의 이메일 주소 | `user@example.com` |

---

## OIDC 인증 흐름 (Flow)

Kubernetes와 연동할 때 주로 사용되는 인증 흐름입니다.

<div class="mermaid">
sequenceDiagram
    participant U as 사용자
    participant K as kubectl (Client)
    participant I as Identity Provider (Google/Keycloak)
    participant A as API Server
    
    U->>K: 1. 로그인 요청 (kubectl oidc-login)
    K->>I: 2. 인증 및 권한 동의 요청
    U->>I: 3. ID/PW 입력 및 로그인
    I->>K: 4. ID Token + Access Token 발급
    K->>A: 5. API 요청 (Header에 ID Token 포함)
    Note over A: 6. IDP의 공개키로 Token 서명 검증
    A->>U: 7. 인증 성공 및 리소스 반환
</div>

---

## Kubernetes 가 OIDC 를 선호하는 이유

1.  **중앙 집중식 관리:** 퇴사자나 부서 이동 시 Kubernetes 설정을 건드리지 않고 IdP(Google, Okta 등)에서만 계정을 비활성화하면 즉시 차단됩니다.
2.  **보안성:** 인증서 방식과 달리 토큰의 유효 기간이 짧고(보통 1시간), MFA(다중 인증)를 강제할 수 있습니다.
3.  **사용자 편의성:** 사내에서 이미 사용하는 계정으로 Kubernetes에 로그인할 수 있습니다. (SSO 구현)

**OIDC는 엔터프라이즈 환경에서 Kubernetes 클러스터의 사용자 보안을 가장 현대적이고 안전하게 관리할 수 있는 표준 방식입니다.**
