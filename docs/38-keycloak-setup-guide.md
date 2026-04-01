# Keycloak: 오픈소스 IAM 솔루션

Keycloak은 OIDC(OpenID Connect)와 OAuth 2.0 표준을 가장 강력하게 구현한 오픈소스 Identity and Access Management(IAM) 솔루션입니다.

---

## Keycloak 이란?

Keycloak은 직접 로그인 로직을 개발할 필요 없이, **"인증과 인가를 전담해주는 서버 소프트웨어"**를 통째로 제공합니다. Red Hat에서 주도적으로 개발하고 있어 엔터프라이즈 환경에서도 신뢰받는 도구입니다.

### 핵심 역할 비교

| 역할 | 설명 | 예시 |
|------|------|------|
| **Identity Provider** | 사용자 계정 정보를 관리하고 신원을 확인 | ID/PW 확인, 회원가입, 세션 관리 |
| **User Federation** | 기존 사내 시스템의 계정 정보와 연동 | LDAP, Active Directory(AD) 연결 |
| **Identity Brokering** | 외부 소셜 로그인 서비스와 연결 | Google, GitHub 로그인 연동 |
| **Single Sign-On (SSO)** | 한 번의 로그인으로 연결된 모든 앱 이용 | 사내 메일 로그인 시 그룹웨어도 자동 로그인 |

---

## Keycloak 아키텍처 및 SSO 흐름

Keycloak은 여러 서비스의 중앙에서 인증 허브 역할을 수행합니다.

<div class="mermaid">
graph TD
    User[사용자]
    KC[Keycloak IAM]
    App1[웹 애플리케이션 A]
    App2[모바일 앱 B]
    App3[Kubernetes API]
    LDAP[(사내 LDAP/AD)]

    User -- "1. 로그인 요청" --> KC
    KC -- "2. 계정 확인" --> LDAP
    KC -- "3. ID Token 발급" --> User
    
    User -- "4. Token 제출" --> App1
    User -- "4. Token 제출" --> App2
    User -- "4. Token 제출" --> App3
    
    App1 & App2 & App3 -- "5. Token 유효성 검증" --> KC
</div>

---

## 주요 기능 요약

1.  **표준 프로토콜 지원:** OpenID Connect, OAuth 2.0, SAML 2.0을 완벽히 지원합니다.
2.  **중앙 집중식 관리:** 관리자 콘솔을 통해 사용자, 권한, 클라이언트를 한곳에서 제어할 수 있습니다.
3.  **강력한 보안 설정:** MFA(다중 인증), 패스워드 정책, 세션 타임아웃 등을 손쉽게 설정합니다.
4.  **사용자 정의 UI:** 로그인 화면이나 테마를 기업 브랜딩에 맞춰 커스터마이징할 수 있습니다.

---

## Kubernetes 와의 시너지

Kubernetes API 서버는 OIDC 인증 방식을 기본적으로 지원합니다. Keycloak을 Kubernetes의 IdP로 설정하면 다음과 같은 이점이 있습니다.

- **사내 계정 통합:** 별도의 인증서 발급 없이 기존 회사 계정으로 `kubectl` 사용 가능
- **권한 관리 자동화:** Keycloak의 'Group' 정보를 Kubernetes 'RBAC'과 연동하여 권한 제어
- **보안 강화:** 단기 만료 토큰과 MFA를 통해 클러스터 접근 보안 수준 극대화

**Keycloak은 복잡한 인증 체계를 표준화하고 현대화하려는 모든 조직에게 최고의 선택지입니다.**
