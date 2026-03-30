# OpenID Connect (OIDC) 개념

OpenID Connect 는 OAuth 2.0 기반의 신원 인증 프로토콜입니다.

---

## OpenID Connect 란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          OpenID Connect (OIDC)                              │
└─────────────────────────────────────────────────────────────┘

정의:
  - OAuth 2.0 기반의 신원 인증 (Identity) 레이어
  - OpenID Foundation 에서 표준화 (2014 년)
  - 단순한 인증을 위한 프로토콜

목적:
  - "누구인가?" (신원 확인)
  - OAuth 2.0 은 "무엇을 할 수 있는가?" (권한 부여)
  - 두 프로토콜은 함께 사용됨

주요 특징:
  ✓ ID Token (JWT 형식) 으로 신원 정보 제공
  ✓ 표준화된 클레임 (claims) 사용
  ✓ 여러 Identity Provider (IdP) 와 호환
  ✓ Google, Microsoft, Okta, Keycloak 등 지원
```

### OAuth 2.0 vs OpenID Connect

```
┌─────────────────────────────────────────────────────────────┐
│          OAuth 2.0 vs OpenID Connect                        │
└─────────────────────────────────────────────────────────────┘

OAuth 2.0:
  - 권한 부여 (Authorization) 프로토콜
  - "이 리소스에 접근할 권한이 있는가?"
  - Access Token 제공
  - 예: Google Calendar 읽기 권한

OpenID Connect:
  - 신원 인증 (Authentication) 프로토콜
  - "이 사용자가 누구인가?"
  - ID Token 제공
  - 예: 사용자의 이메일, 이름 확인

관계:
  ┌─────────────────────────────────────────┐
  │  OpenID Connect = OAuth 2.0 + Identity │
  │                                         │
  │  OIDC 는 OAuth 2.0 위에 구축됨         │
  │  (OIDC 는 OAuth 2.0 의 확장)            │
  └─────────────────────────────────────────┘
```

---

## OIDC 주요 구성 요소

### 1. ID Token

```
┌─────────────────────────────────────────────────────────────┐
│          ID Token                                           │
└─────────────────────────────────────────────────────────────┘

정의:
  - 사용자의 신원 정보가 담긴 토큰
  - JWT (JSON Web Token) 형식
  - Identity Provider 가 서명

주요 클레임 (claims):
  - sub (subject): 사용자 고유 식별자
  - name: 사용자 이름
  - email: 이메일 주소
  - iss (issuer): 토큰 발급자 (IdP)
  - aud (audience): 토큰 대상자 (클라이언트)
  - exp (expiration): 만료 시간
  - iat (issued at): 발급 시간

예시 (JWT 디코딩):
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",
  "aud": "kubernetes",
  "exp": 1640000000,
  "iat": 1639996400,
  "email": "honggildong@example.com",
  "email_verified": true,
  "name": "Hong Gil Dong"
}
```

### 2. Access Token

```
┌─────────────────────────────────────────────────────────────┐
│          Access Token                                       │
└─────────────────────────────────────────────────────────────┘

정의:
  - 리소스 접근 권한을 나타내는 토큰
  - OAuth 2.0 에서 사용
  - API 호출 시 사용

OIDC 에서의 역할:
  - UserInfo 엔드포인트 호출용
  - 사용자의 추가 정보 조회용
  - 선택적 (ID Token 만으로도 인증 가능)
```

### 3. UserInfo Endpoint

```
┌─────────────────────────────────────────────────────────────┐
│          UserInfo Endpoint                                  │
└─────────────────────────────────────────────────────────────┘

정의:
  - 사용자의 추가 정보를 제공하는 엔드포인트
  - Access Token 으로 보호됨
  - OAuth 2.0 보호 리소스

요청 예시:
  GET /userinfo HTTP/1.1
  Host: accounts.google.com
  Authorization: Bearer <Access Token>

응답 예시:
  {
    "sub": "1234567890",
    "name": "Hong Gil Dong",
    "email": "honggildong@example.com",
    "picture": "https://...",
    "groups": ["developers", "admins"]
  }
```

### 4. Discovery Document

```
┌─────────────────────────────────────────────────────────────┐
│          Discovery Document (.well-known/openid-configuration)
└─────────────────────────────────────────────────────────────┘

정의:
  - IdP 의 설정 정보를 제공하는 JSON 문서
  - 표준화된 경로: /.well-known/openid-configuration
  - 클라이언트가 자동으로 설정 발견 가능

주요 정보:
  - issuer: IdP 식별자
  - authorization_endpoint: 인증 요청 엔드포인트
  - token_endpoint: 토큰 발급 엔드포인트
  - userinfo_endpoint: 사용자 정보 엔드포인트
  - jwks_uri: 공개키 세트 URI
  - id_token_signing_alg_values_supported: 지원 서명 알고리즘

예시 (Google OIDC Discovery):
  https://accounts.google.com/.well-known/openid-configuration
  
  {
    "issuer": "https://accounts.google.com",
    "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_endpoint": "https://oauth2.googleapis.com/token",
    "userinfo_endpoint": "https://openidconnect.googleapis.com/v1/userinfo",
    "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
    ...
  }
```

---

## OIDC 인증 흐름

### Authorization Code Flow

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC Authorization Code Flow                       │
└─────────────────────────────────────────────────────────────┘

가장 일반적인 OIDC 인증 흐름:

1. 사용자 → 클라이언트: "로그인" 클릭
2. 클라이언트 → IdP: 인증 요청
   GET /authorize?
     response_type=code&
     client_id=<client_id>&
     redirect_uri=<redirect_uri>&
     scope=openid%20email%20profile&
     state=<random_state>&
     nonce=<random_nonce>

3. IdP → 사용자: 로그인 페이지 표시
4. 사용자 → IdP: 아이디/비밀번호 입력
5. IdP → 클라이언트: 인증 코드 리디렉션
   GET /callback?
     code=<authorization_code>&
     state=<random_state>

6. 클라이언트 → IdP: 토큰 요청
   POST /token
   grant_type=authorization_code&
   code=<authorization_code>&
   redirect_uri=<redirect_uri>&
   client_id=<client_id>&
   client_secret=<client_secret>

7. IdP → 클라이언트: 토큰 응답
   {
     "id_token": "<JWT_ID_TOKEN>",
     "access_token": "<ACCESS_TOKEN>",
     "refresh_token": "<REFRESH_TOKEN>",
     "token_type": "Bearer",
     "expires_in": 3600
   }

8. 클라이언트: ID Token 검증 및 파싱
   - 서명 검증 (IdP 공개키로)
   - 클레임 추출 (sub, email, name 등)
   - 사용자 세션 생성

9. 클라이언트 → 사용자: 로그인 성공
```

### 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC 인증 흐름 다이어그램                          │
└─────────────────────────────────────────────────────────────┘

사용자        클라이언트          IdP (Google 등)
  │                │                    │
  │  1. 로그인     │                    │
  │───────────────▶│                    │
  │                │                    │
  │                │  2. 인증 요청      │
  │                │───────────────────▶│
  │                │                    │
  │  3. 로그인 페이지                   │
  │◀───────────────────────────────────│
  │                │                    │
  │  4. 로그인 정보                   │
  │───────────────────────────────────▶│
  │                │                    │
  │                │  5. 인증 코드      │
  │                │◀───────────────────│
  │                │                    │
  │                │  6. 토큰 요청      │
  │                │───────────────────▶│
  │                │                    │
  │                │  7. ID Token,     │
  │                │     Access Token   │
  │                │◀───────────────────│
  │                │                    │
  │                │  8. ID Token 검증  │
  │                │     (서명, 클레임) │
  │                │                    │
  │  9. 로그인 성공│                    │
  │◀───────────────│                    │
  └──────────────────────────────────────┘
```

---

## OIDC 클레임 (Claims)

### 표준 클레임

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC 표준 클레임                                   │
└─────────────────────────────────────────────────────────────┘

등록 클레임 (Registered Claims):
  - iss (issuer): 토큰 발급자
  - sub (subject): 사용자 고유 식별자 ★
  - aud (audience): 토큰 대상자
  - exp (expiration time): 만료 시간
  - nbf (not before): 사용 시작 시간
  - iat (issued at): 발급 시간
  - jti (JWT ID): 토큰 고유 식별자

공개 클레임 (Public Claims):
  - name: 사용자 이름
  - given_name: 이름
  - family_name: 성
  - middle_name: 중간 이름
  - nickname: 별명
  - preferred_username: 선호 사용자명
  - profile: 프로필 페이지 URL
  - picture: 프로필 사진 URL
  - website: 웹사이트 URL
  - email: 이메일 주소 ★
  - email_verified: 이메일 인증 여부
  - gender: 성별
  - birthdate: 생일
  - zoneinfo: 시간대
  - locale: 로케일
  - phone_number: 전화번호
  - phone_number_verified: 전화번호 인증 여부
  - address: 주소
  - updated_at: 정보 업데이트 시간

Kubernetes 에서 주로 사용하는 클레임:
  - sub: Kubernetes 사용자 이름으로 매핑
  - email: 사용자 식별용
  - groups: Kubernetes 그룹으로 매핑
```

### 클레임 예시 (ID Token)

```json
{
  "iss": "https://accounts.google.com",
  "sub": "108123456789012345678",
  "aud": "kubernetes",
  "exp": 1640000000,
  "iat": 1639996400,
  "email": "honggildong@example.com",
  "email_verified": true,
  "name": "Hong Gil Dong",
  "given_name": "Gil Dong",
  "family_name": "Hong",
  "picture": "https://lh3.googleusercontent.com/...",
  "locale": "ko",
  "groups": [
    "developers",
    "admins",
    "k8s-users"
  ]
}
```

---

## Kubernetes 와 OIDC

### Kubernetes OIDC 인증

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes OIDC 인증                               │
└─────────────────────────────────────────────────────────────┘

Kubernetes 는 OIDC 를 통한 사용자 인증을 지원합니다:

1. 사용자가 IdP 에서 ID Token 획득
2. kubectl 에 토큰 설정
3. kubectl 이 API Server 에 토큰 포함 요청
4. API Server 가 토큰 검증
5. 토큰의 클레임으로 사용자/그룹 식별
6. RBAC 으로 권한 확인
7. 요청 처리
```

### API Server OIDC 설정

```bash
# kube-apiserver 설정 옵션

# OIDC IdP 엔드포인트
--oidc-issuer-url=https://accounts.google.com

# 클라이언트 ID
--oidc-client-id=kubernetes

# 클라이언트 시크릿 (선택, 공개 클라이언트는 불필요)
--oidc-client-secret=<client_secret>

# 사용자 이름 클레임 (기본값: sub)
--oidc-username-claim=email

# 사용자 이름 접두사 (기본값: https://oidc.example.com#)
--oidc-username-prefix=-

# 그룹 클레임 (기본값: groups)
--oidc-groups-claim=groups

# 그룹 접두사 (기본값: oidc:)
--oidc-groups-prefix=oidc:

# 필수 클레임 (선택)
--oidc-required-claim=audience=kubernetes

# CA 인증서 (자체 서명 IdP 용)
--oidc-ca-file=/etc/kubernetes/oidc-ca.crt
```

### kubectl OIDC 설정

```bash
# OIDC 토큰으로 kubectl 설정

# 1. 토큰 획득 (IdP 에서)
# Google 예시:
# https://accounts.google.com/o/oauth2/v2/auth?
#   response_type=token&
#   client_id=kubernetes&
#   redirect_uri=urn:ietf:wg:oauth:2.0:oob&
#   scope=openid%20email%20profile

# 2. 토큰으로 사용자 설정
kubectl config set-credentials oidc-user \
  --auth-provider=oidc \
  --auth-provider-arg=idp-issuer-url=https://accounts.google.com \
  --auth-provider-arg=client-id=kubernetes \
  --auth-provider-arg=client-secret=<secret> \
  --auth-provider-arg=id-token=<id_token> \
  --auth-provider-arg=refresh-token=<refresh_token>

# 3. 컨텍스트 설정
kubectl config set-context oidc-context \
  --cluster=kubernetes \
  --user=oidc-user

# 4. 컨텍스트 전환
kubectl config use-context oidc-context

# 5. 토큰으로 API 호출
kubectl get pods
```

### RBAC 연동

```yaml
# OIDC 사용자에게 RBAC 권한 부여

# 1. ClusterRole 생성
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: oidc-developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]

---
# 2. ClusterRoleBinding 생성
# OIDC 그룹 (oidc:developers) 에 권한 부여
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-developer-binding
subjects:
- kind: Group
  name: oidc:developers  # OIDC groups 클레임 + 접두사
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: oidc-developer
  apiGroup: rbac.authorization.k8s.io
```

---

## 주요 Identity Provider

### Google

```
┌─────────────────────────────────────────────────────────────┐
│          Google OIDC                                        │
└─────────────────────────────────────────────────────────────┘

Issuer URL:
  https://accounts.google.com

Discovery Document:
  https://accounts.google.com/.well-known/openid-configuration

Authorization Endpoint:
  https://accounts.google.com/o/oauth2/v2/auth

Token Endpoint:
  https://oauth2.googleapis.com/token

UserInfo Endpoint:
  https://openidconnect.googleapis.com/v1/userinfo

JWKS URI:
  https://www.googleapis.com/oauth2/v3/certs

주요 클레임:
  - sub: Google 계정 고유 ID
  - email: Gmail 주소
  - name: Google 계정 이름
  - picture: 프로필 사진
```

### Microsoft Azure AD

```
┌─────────────────────────────────────────────────────────────┐
│          Microsoft Azure AD OIDC                            │
└─────────────────────────────────────────────────────────────┘

Issuer URL:
  https://login.microsoftonline.com/{tenant-id}/v2.0

Discovery Document:
  https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration

Authorization Endpoint:
  https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize

Token Endpoint:
  https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token

주요 클레임:
  - sub: Azure AD 객체 ID
  - email: Office 365 이메일
  - name: 사용자 이름
  - groups: Azure AD 그룹 (설정 필요)
```

### Okta

```
┌─────────────────────────────────────────────────────────────┐
│          Okta OIDC                                          │
└─────────────────────────────────────────────────────────────┘

Issuer URL:
  https://{your-okta-domain}.okta.com/oauth2/default

Discovery Document:
  https://{your-okta-domain}.okta.com/oauth2/default/.well-known/openid-configuration

주요 클레임:
  - sub: Okta 사용자 ID
  - email: Okta 프로필 이메일
  - name: Okta 프로필 이름
  - groups: Okta 그룹 (설정 필요)

특징:
  - 커스텀 클레임 추가 가능
  - 그룹 매핑 유연함
  - 엔터프라이즈 기능 풍부
```

### Keycloak (오픈소스)

```
┌─────────────────────────────────────────────────────────────┐
│          Keycloak OIDC                                      │
└─────────────────────────────────────────────────────────────┘

Issuer URL:
  https://{your-keycloak-domain}/auth/realms/{realm-name}

Discovery Document:
  https://{your-keycloak-domain}/auth/realms/{realm-name}/.well-known/openid-configuration

주요 클레임:
  - sub: Keycloak 사용자 ID
  - email: 사용자 이메일
  - name: 사용자 이름
  - groups: Keycloak 역할/그룹

특징:
  - 오픈소스 (무료)
  - 자체 운영 가능
  - LDAP/AD 연동
  - 커스텀 클레임 자유도 높음
```

---

## OIDC 장단점

### 장점

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC 장점                                          │
└─────────────────────────────────────────────────────────────┘

1. 중앙 집중식 인증
   - 단일 IdP 에서 모든 사용자 관리
   - 비밀번호 변경 시 모든 서비스 자동 반영
   - 계정 폐기 시 모든 접근 즉시 차단

2. 강력한 보안
   - IdP 가 전문적인 인증 관리
   - MFA (다중 인증) 지원
   - 이상 징후 탐지

3. 사용자 경험
   - 싱글 사인온 (SSO)
   - 별도 비밀번호 기억 불필요
   - 빠른 로그인

4. 표준 프로토콜
   - 다양한 IdP 와 호환
   - 벤더 락인 최소화
   - 라이브러리 풍부

5. Kubernetes 연동
   - RBAC 과 자연스럽게 통합
   - 그룹 기반 권한 부여
   - 감사 로그에 사용자 정보 기록
```

### 단점

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC 단점                                          │
└─────────────────────────────────────────────────────────────┘

1. 복잡도
   - 설정이 상대적으로 복잡
   - IdP 설정 + Kubernetes 설정
   - 디버깅 어려움

2. 외부 의존성
   - IdP 장애 시 인증 불가
   - 네트워크 연결 필요
   - 오프라인 사용 불가

3. 토큰 관리
   - 토큰 만료 처리 필요
   - 리프레시 토큰 관리
   - 토큰 폐기 메커니즘

4. 초기 설정 비용
   - IdP 등록/설정
   - 클라이언트 등록
   - RBAC 정책 정의
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. OpenID Connect (OIDC)                                   │
│     - OAuth 2.0 기반의 신원 인증 프로토콜                  │
│     - ID Token (JWT) 으로 사용자 신원 확인                 │
│     - "누구인가?"에 대한 답변                              │
│                                                             │
│  2. 주요 구성 요소                                          │
│     - ID Token: 사용자 신원 정보 (JWT)                     │
│     - Access Token: 리소스 접근 권한                       │
│     - UserInfo Endpoint: 추가 사용자 정보                  │
│     - Discovery Document: IdP 설정 정보                    │
│                                                             │
│  3. 인증 흐름 (Authorization Code Flow)                     │
│     - 인증 요청 → 로그인 → 인증 코드 → 토큰 → 검증         │
│     - 9 단계 프로세스                                      │
│                                                             │
│  4. 주요 클레임                                             │
│     - sub: 사용자 고유 식별자                              │
│     - email: 이메일 주소                                   │
│     - name: 사용자 이름                                    │
│     - groups: 소속 그룹                                    │
│                                                             │
│  5. Kubernetes 연동                                         │
│     - API Server OIDC 설정                                 │
│     - kubectl auth-provider 설정                           │
│     - RBAC 과 통합 (그룹 기반 권한)                        │
│                                                             │
│  6. 주요 Identity Provider                                  │
│     - Google, Microsoft Azure AD, Okta, Keycloak           │
│                                                             │
│  7. 장점                                                    │
│     - 중앙 집중식 인증, 강력한 보안, SSO, 표준화           │
│                                                             │
│  8. 단점                                                    │
│     - 복잡도, 외부 의존성, 토큰 관리, 초기 설정 비용       │
└─────────────────────────────────────────────────────────────┘
```

### OIDC vs 다른 인증 방식

```
┌─────────────────────────────────────────────────────────────┐
│          인증 방식 비교                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│  방식           │  OIDC    │  인증서  │  Webhook │  Basic   │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  인증 수단      │  ID Token│  X.509   │  커스텀  │  ID/PW   │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  중앙 관리      │  ✓       │  ✗       │  ✓/✗     │  ✗       │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  SSO            │  ✓       │  ✗       │  ✗       │  ✗       │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  MFA 지원       │  ✓       │  ✗       │  ✓/✗     │  ✗       │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  설정 복잡도    │  중간    │  낮음    │  높음    │  낮음    │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  외부 의존성    │  있음    │  없음    │  있음    │  없음    │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│  Kubernetes    │  ✓       │  ✓       │  ✓       │  ✗       │
│  지원           │          │          │          │  (제거)  │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

**OpenID Connect 는 현대적인 인증 표준으로, 중앙 집중식 관리와 강력한 보안을 제공합니다. Kubernetes 와 연동하여 엔터프라이즈급 인증 체계를 구축할 수 있습니다.**
