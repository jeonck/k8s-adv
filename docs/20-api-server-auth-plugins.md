# API Server 요청 처리 플러그인

Kubernetes API Server 가 요청을 처리하는 3 단계 플러그인 (Authentication, Authorization, Admission Control) 에 대해 알아봅니다.

---

## API Server 요청 처리 파이프라인

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes API Server 요청 처리 흐름               │
└─────────────────────────────────────────────────────────────┘

kubectl 요청
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Authentication Plugin (인증 플러그인)                   │
│     - "누구인가?" 확인                                     │
│     - 인증서, 토큰, 비밀번호 등 검증                        │
│     - 실패: 401 Unauthorized                               │
└─────────────────────────────────────────────────────────────┘
    │
    │ 인증 성공 (사용자 정보 추출)
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Authorization Plugin (인가 플러그인)                    │
│     - "무엇을 할 수 있는가?" 확인                          │
│     - RBAC, ABAC, Webhook 등 검증                          │
│     - 실패: 403 Forbidden                                  │
└─────────────────────────────────────────────────────────────┘
    │
    │ 인가 성공 (권한 확인)
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Admission Control (어드미션 컨트롤)                     │
│     - "요구사항을 만족하는가?" 확인                        │
│     - Mutating Webhook (수정)                              │
│     - Validating Webhook (검증)                            │
│     - 실패: 403 Forbidden                                  │
└─────────────────────────────────────────────────────────────┘
    │
    │ 모든 검증 통과
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. etcd 연산                                               │
│     - 데이터 저장/조회/수정/삭제                           │
│     - 200 OK + 결과 반환                                   │
└─────────────────────────────────────────────────────────────┘
```

### 전체 흐름 상세

```
┌─────────────────────────────────────────────────────────────┐
│          API Server 요청 처리 상세 흐름                     │
└─────────────────────────────────────────────────────────────┘

HTTP Request (HTTPS 6443)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: Authentication (인증)                             │
│  ─────────────────────────────                              │
│  플러그인 순서:                                             │
│  1. X509 (클라이언트 인증서)                                │
│  2. Token (ServiceAccount, 정적 토큰)                       │
│  3. BasicAuth (레거시)                                      │
│  4. OIDC (OpenID Connect)                                   │
│  5. Webhook (외부 인증)                                     │
│  6. Anonymous (익명, 마지막)                                │
│                                                             │
│  성공 시:                                                   │
│  - 사용자 이름 추출 (CN)                                    │
│  - 그룹 추출 (O)                                            │
│  - 추가 속성 (UID, 등)                                      │
│                                                             │
│  실패 시:                                                   │
│  - 401 Unauthorized 반환                                    │
│  - 요청 처리 중단                                           │
└─────────────────────────────────────────────────────────────┘
         │
         │ 인증 성공
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: Authorization (인가)                              │
│  ─────────────────────────────                              │
│  플러그인 순서:                                             │
│  1. Node (kubelet 전용)                                     │
│  2. RBAC (Role-Based Access Control)                        │
│  3. Webhook (외부 인가)                                     │
│  4. AlwaysAllow (모든 요청 허용)                            │
│                                                             │
│  확인 항목:                                                 │
│  - 사용자/그룹 권한                                         │
│  - 리소스 접근 권한                                         │
│  - 동사 (verbs) 권한                                        │
│                                                             │
│  실패 시:                                                   │
│  - 403 Forbidden 반환                                       │
│  - 요청 처리 중단                                           │
└─────────────────────────────────────────────────────────────┘
         │
         │ 인가 성공
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: Admission Control (어드미션 컨트롤)               │
│  ────────────────────────────────                           │
│  순서:                                                      │
│  1. Mutating Admission Webhook (수정)                       │
│     - 요청 내용 변경 가능                                   │
│     - 예: 사이드카 인젝션, 기본값 설정                      │
│                                                             │
│  2. Validating Admission Webhook (검증)                     │
│     - 요청 내용 검증만 (변경 불가)                          │
│     - 예: 정책 준수 확인, 이름 규칙 검증                    │
│                                                             │
│  3. Built-in Admission Controllers (내장)                   │
│     - NamespaceLifecycle                                  │
│     - LimitRanger                                         │
│     - ResourceQuota                                       │
│     - ServiceAccount                                      │
│     - 등 20+ 개                                           │
│                                                             │
│  실패 시:                                                   │
│  - 403 Forbidden 반환                                       │
│  - 요청 처리 중단                                           │
└─────────────────────────────────────────────────────────────┘
         │
         │ 모든 검증 통과
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 4: etcd 연산                                         │
│  ───────────────                                            │
│  - 데이터 저장 (Create)                                     │
│  - 데이터 조회 (Get, List)                                  │
│  - 데이터 수정 (Update, Patch)                              │
│  - 데이터 삭제 (Delete)                                     │
│                                                             │
│  성공 시:                                                   │
│  - 200 OK + 결과 반환                                       │
│  - 201 Created (생성 시)                                    │
│  - 204 No Content (삭제 시)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 1 단계: Authentication Plugin (인증 플러그인)

### 인증 플러그인 순서

```
┌─────────────────────────────────────────────────────────────┐
│              인증 플러그인 처리 순서                        │
└─────────────────────────────────────────────────────────────┘

API Server 가 인증 플러그인을 순차적으로 실행:

1. X509 (클라이언트 인증서)
   ┌─────────────────────────────────────────┐
   │  - TLS 클라이언트 인증서 검증           │
   │  - CA 인증서로 서명 확인                │
   │  - CN → 사용자 이름                     │
   │  - O → 그룹                             │
   │  - 성공 시: 사용자 정보 반환            │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

2. Token (토큰 인증)
   ┌─────────────────────────────────────────┐
   │  - ServiceAccount 토큰 (JWT)            │
   │  - 정적 토큰 (static-token.csv)         │
   │  - 토큰 서명 검증                       │
   │  - 성공 시: 사용자 정보 반환            │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

3. BasicAuth (기본 인증, 레거시)
   ┌─────────────────────────────────────────┐
   │  - 사용자명/비밀번호                    │
   │  - static-password.csv 파일             │
   │  - Kubernetes 1.19 부터 제거됨          │
   └─────────────────────────────────────────┘

4. OIDC (OpenID Connect)
   ┌─────────────────────────────────────────┐
   │  - 외부 인증 제공자 (Google, Okta 등)   │
   │  - JWT 토큰 검증                        │
   │  - 성공 시: 사용자 정보 반환            │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

5. Webhook (외부 인증)
   ┌─────────────────────────────────────────┐
   │  - 외부 인증 서버에 HTTP 요청           │
   │  - 사용자 정의 인증 로직                │
   │  - 성공 시: 사용자 정보 반환            │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

6. Anonymous (익명 인증, 마지막)
   ┌─────────────────────────────────────────┐
   │  - 모든 요청을 system:anonymous 로 처리 │
   │  - 기본 권한 없음                       │
   │  - 항상 "성공" (사용자만 익명으로)      │
   └─────────────────────────────────────────┘

핵심:
  - 첫 번째로 성공한 플러그인의 사용자 정보 사용
  - 모두 실패하면 401 Unauthorized
  - Anonymous 는 항상 성공 (권한은 별개)
```

### 인증 플러그인 설정 예시

```bash
# API Server 인증 옵션 (kubeadm 설정)

# 1. X509 인증서
--client-ca-file=/etc/kubernetes/pki/ca.crt
--tls-cert-file=/etc/kubernetes/pki/apiserver.crt
--tls-private-key-file=/etc/kubernetes/pki/apiserver.key

# 2. ServiceAccount 토큰
--service-account-key-file=/etc/kubernetes/pki/sa.pub
--service-account-signing-key-file=/etc/kubernetes/pki/sa.key
--service-account-issuer=https://kubernetes.default.svc

# 3. OIDC 인증
--oidc-issuer-url=https://accounts.google.com
--oidc-client-id=kubernetes
--oidc-username-claim=email
--oidc-groups-claim=groups

# 4. Webhook 인증
--authentication-token-webhook-config-file=/etc/kubernetes/auth-webhook.conf

# 5. 익명 인증 비활성화
--anonymous-auth=false
```

### 인증 성공 시 추출 정보

```
┌─────────────────────────────────────────────────────────────┐
│              인증 성공 시 추출되는 정보                     │
└─────────────────────────────────────────────────────────────┘

인증서 기반 (X509):
  Subject: CN=john, O=developers, O=admins, UID=12345
  
  추출 정보:
    - username: john
    - groups: developers, admins
    - uid: 12345
    - extra: 추가 속성

토큰 기반 (ServiceAccount):
  JWT Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9...
  
  추출 정보:
    - username: system:serviceaccount:default:myapp
    - groups: system:serviceaccounts
    - namespace: default
    - serviceaccount: myapp

OIDC:
  JWT Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9...
  
  추출 정보:
    - username: john@example.com
    - groups: admins, developers
    - email: john@example.com
    - sub: 1234567890

이 정보는 이후 인가, 어드미션 컨트롤에서 사용됨
```

---

## 2 단계: Authorization Plugin (인가 플러그인)

### 인가 플러그인 순서

```
┌─────────────────────────────────────────────────────────────┐
│              인가 플러그인 처리 순서                        │
└─────────────────────────────────────────────────────────────┘

API Server 가 인가 플러그인을 순차적으로 실행:

1. Node Authorization
   ┌─────────────────────────────────────────┐
   │  - kubelet 요청 전용                    │
   │  - 노드 관련 작업 제한                  │
   │  - 자동 활성화                          │
   │  - 성공 시: 허용                        │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

2. RBAC (Role-Based Access Control)
   ┌─────────────────────────────────────────┐
   │  - 현재 표준 인가 방식                  │
   │  - Role, ClusterRole 확인               │
   │  - RoleBinding, ClusterRoleBinding 확인 │
   │  - 사용자/그룹 권한 검증                │
   │  - 성공 시: 허용                        │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

3. Webhook Authorization
   ┌─────────────────────────────────────────┐
   │  - 외부 인가 서버에 HTTP 요청           │
   │  - 사용자 정의 인가 로직                │
   │  - 성공 시: 허용/거부                   │
   │  - 실패 시: 다음 플러그인               │
   └─────────────────────────────────────────┘

4. AlwaysAllow (기본값)
   ┌─────────────────────────────────────────┐
   │  - 모든 요청 허용                       │
   │  - 개발/테스트용                        │
   │  - 프로덕션에서는 사용 금지             │
   │  - 항상 "허용"                          │
   └─────────────────────────────────────────┘

핵심:
  - 첫 번째로 결정 (Allow/Deny) 한 플러그인 결과 사용
  - 모두 통과하면 AlwaysAllow 가 허용
  - 하나라도 거부하면 403 Forbidden
```

### 인가 플러그인 설정 예시

```bash
# API Server 인가 옵션 (kubeadm 설정)

# 1. RBAC 활성화 (기본)
--authorization-mode=Node,RBAC

# 2. 여러 인가 모드 조합
--authorization-mode=Node,RBAC,Webhook

# 3. Webhook 인가 설정
--authorization-webhook-config-file=/etc/kubernetes/authz-webhook.conf

# 4. AlwaysAllow (테스트용, 프로덕션 금지!)
--authorization-mode=AlwaysAllow

# 5. AlwaysDeny (보안 테스트용)
--authorization-mode=AlwaysDeny
```

### RBAC 인가 확인 과정

```
┌─────────────────────────────────────────────────────────────┐
│              RBAC 인가 확인 과정                            │
└─────────────────────────────────────────────────────────────┘

요청: john 이 default 네임스페이스에서 파드 읽기

1. 사용자 정보 확인
   - username: john
   - groups: developers, admins

2. ClusterRoleBinding 확인
   ┌─────────────────────────────────────────┐
   │  ClusterRoleBinding 검색:               │
   │  - subjects 에 john 또는 developers 포함?│
   │                                         │
   │  예시:                                   │
   │  ClusterRoleBinding: view-cluster       │
   │  subjects:                               │
   │  - kind: Group                           │
   │    name: developers                      │
   │  roleRef:                                │
   │    kind: ClusterRole                     │
   │    name: view                            │
   │                                         │
   │  → 매칭됨! ClusterRole: view 확인       │
   └─────────────────────────────────────────┘

3. ClusterRole 권한 확인
   ┌─────────────────────────────────────────┐
   │  ClusterRole: view                      │
   │  rules:                                  │
   │  - apiGroups: [""]                       │
   │    resources: ["pods"]                   │
   │    verbs: ["get", "list", "watch"]       │
   │                                         │
   │  요청: get pods                          │
   │  → 권한 있음! (get 포함)                │
   └─────────────────────────────────────────┘

4. RoleBinding 확인 (네임스페이스 제한)
   ┌─────────────────────────────────────────┐
   │  default 네임스페이스의 RoleBinding 검색│
   │  - john 또는 developers 포함?           │
   │  - 제한 있는 경우 확인                  │
   └─────────────────────────────────────────┘

5. 인가 결과
   - 허용: 다음 단계 (Admission Control) 로
   - 거부: 403 Forbidden 반환
```

---

## 3 단계: Admission Control (어드미션 컨트롤)

### 어드미션 컨트롤러 순서

```
┌─────────────────────────────────────────────────────────────┐
│              어드미션 컨트롤러 처리 순서                    │
└─────────────────────────────────────────────────────────────┘

Kubernetes 1.16+ 기본 순서:

1. MutatingAdmissionWebhook (수정 웹훅)
   ┌─────────────────────────────────────────┐
   │  - 요청 내용 수정 가능                  │
   │  - 예: 사이드카 인젝션 (Istio)          │
   │  - 예: 기본값 자동 설정                 │
   │  - 예: 라벨 자동 추가                   │
   │                                         │
   │  수정 후: 변경된 객체가 다음 단계로 전달│
   └─────────────────────────────────────────┘

2. ValidatingAdmissionWebhook (검증 웹훅)
   ┌─────────────────────────────────────────┐
   │  - 요청 내용 검증만 (수정 불가)         │
   │  - 예: 정책 준수 확인                   │
   │  - 예: 이름 규칙 검증                   │
   │  - 예: 리소스 제한 확인                 │
   │                                         │
   │  실패 시: 403 Forbidden 반환            │
   └─────────────────────────────────────────┘

3. 내장 어드미션 컨트롤러 (20+ 개)
   ┌─────────────────────────────────────────┐
   │  순서:                                  │
   │  1. NamespaceLifecycle                  │
   │  2. LimitRanger                         │
   │  3. LimitPodHardAntiAffinityTopology    │
   │  4. PersistentVolumeClaimResize         │
   │  5. ResourceQuota                       │
   │  6. ServiceAccount                      │
   │  7. DefaultStorageClass                 │
   │  8. DefaultTolerationSeconds            │
   │  9. MutatingAdmissionPlugin             │
   │  10. ValidatingAdmissionPlugin          │
   │  11. StorageObjectInUseProtection       │
   │  12. RuntimeClass                       │
   │  13. CertificateApproval                │
   │  등...                                  │
   └─────────────────────────────────────────┘
```

### 주요 내장 어드미션 컨트롤러

```
┌─────────────────────────────────────────────────────────────┐
│              주요 내장 어드미션 컨트롤러                    │
└─────────────────────────────────────────────────────────────┘

1. NamespaceLifecycle
   ┌─────────────────────────────────────────┐
   │  - 삭제 중인 네임스페이스에 생성 방지   │
   │  - default, kube-system, kube-public   │
   │    보호된 네임스페이스 관리             │
   │  - 네임스페이스 존재 확인               │
   └─────────────────────────────────────────┘

2. LimitRanger
   ┌─────────────────────────────────────────┐
   │  - LimitRange 적용                      │
   │  - 컨테이너 기본/최대 리소스 설정       │
   │  - 요청 없으면 기본값 자동 추가         │
   └─────────────────────────────────────────┘

3. ResourceQuota
   ┌─────────────────────────────────────────┐
   │  - ResourceQuota 적용                   │
   │  - 네임스페이스 리소스 할당량 확인      │
   │  - 할당량 초과 시 거부                  │
   └─────────────────────────────────────────┘

4. ServiceAccount
   ┌─────────────────────────────────────────┐
   │  - ServiceAccount 자동 연결             │
   │  - 기본 ServiceAccount: default         │
   │  - 토큰 자동 마운트                     │
   └─────────────────────────────────────────┘

5. DefaultStorageClass
   ┌─────────────────────────────────────────┐
   │  - PVC 에 StorageClass 자동 설정        │
   │  - 기본 StorageClass 적용               │
   └─────────────────────────────────────────┘

6. PersistentVolumeClaimResize
   ┌─────────────────────────────────────────┐
   │  - PVC 크기 변경 허용/제한              │
   │  - StorageClass 설정에 따름             │
   └─────────────────────────────────────────┘
```

### 웹훅 어드미션 컨트롤러

```
┌─────────────────────────────────────────────────────────────┐
│              웹훅 어드미션 컨트롤러                         │
└─────────────────────────────────────────────────────────────┘

Mutating Webhook (수정):
  ┌─────────────────────────────────────────┐
  │  용도: 요청 내용 수정                   │
  │                                         │
  │  예시:                                  │
  │  - Istio 사이드카 인젝션                │
  │  - Pod 보안 정책 적용                   │
  │  - 기본 라벨/어노테이션 추가            │
  │  - 이미지 태그 자동 변환                │
  │                                         │
  │  수정 가능:                             │
  │  - spec (대부분)                        │
  │  - metadata.labels                      │
  │  - metadata.annotations                 │
  │                                         │
  │  수정 불가:                             │
  │  - kind, apiVersion                     │
  │  - metadata.name, namespace             │
  └─────────────────────────────────────────┘

Validating Webhook (검증):
  ┌─────────────────────────────────────────┐
  │  용도: 요청 내용 검증                   │
  │                                         │
  │  예시:                                  │
  │  - 이름 규칙 검증 (regex)               │
  │  - 필수 라벨 확인                       │
  │  - 이미지 레지스트리 제한               │
  │  - 보안 정책 검증                       │
  │                                         │
  │  검증만 가능 (수정 불가)                │
  │                                         │
  │  결과:                                  │
  │  - allowed: true → 계속                 │
  │  - allowed: false → 403 Forbidden       │
  └─────────────────────────────────────────┘
```

### 웹훅 설정 예시

```yaml
# MutatingWebhookConfiguration 예시
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: sidecar-injector.example.com
webhooks:
- name: sidecar-injector.example.com
  admissionReviewVersions: ["v1", "v1beta1"]
  sideEffects: None
  timeoutSeconds: 10
  failurePolicy: Fail  # 실패 시 요청 거부
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE"]
    resources: ["pods"]
  clientConfig:
    service:
      namespace: istio-system
      name: sidecar-injector
      path: /inject
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
  namespaceSelector:
    matchLabels:
      istio-injection: enabled

---
# ValidatingWebhookConfiguration 예시
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: policy-validator.example.com
webhooks:
- name: policy-validator.example.com
  admissionReviewVersions: ["v1", "v1beta1"]
  sideEffects: None
  timeoutSeconds: 10
  failurePolicy: Fail
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE", "UPDATE"]
    resources: ["pods"]
  clientConfig:
    service:
      namespace: policy-system
      name: policy-validator
      path: /validate
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
```

---

## 요청 처리 예시

### Pod 생성 요청 처리

```
┌─────────────────────────────────────────────────────────────┐
│          Pod 생성 요청 처리 흐름                            │
└─────────────────────────────────────────────────────────────┘

kubectl apply -f pod.yaml
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Authentication (인증)                                   │
│  - kubectl 이 admin.crt 인증서 사용                        │
│  - API Server 가 CA 로 검증                                 │
│  - CN=admin, O=system:masters 추출                         │
│  - 인증 성공 → 사용자: admin, 그룹: system:masters         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Authorization (인가)                                    │
│  - RBAC 확인                                                │
│  - ClusterRoleBinding: system:masters 확인                 │
│  - ClusterRole: system:masters (모든 권한)                 │
│  - 인가 성공 → 파드 생성 권한 있음                         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Admission Control (어드미션 컨트롤)                     │
│                                                             │
│  3.1 MutatingWebhook                                        │
│  - Istio 사이드카 인젝션 확인                              │
│  - 네임스페이스에 istio-injection: enabled 라벨?           │
│  - 예: Envoy 사이드카 컨테이너 추가                        │
│                                                             │
│  3.2 ValidatingWebhook                                      │
│  - Pod 보안 정책 검증                                      │
│  - privileged: false 확인                                  │
│  - runAsNonRoot: true 확인                                 │
│                                                             │
│  3.3 내장 컨트롤러                                          │
│  - NamespaceLifecycle: 네임스페이스 존재 확인              │
│  - LimitRanger: LimitRange 적용                            │
│  - ResourceQuota: 할당량 확인                              │
│  - ServiceAccount: 기본 ServiceAccount 연결                │
│  - DefaultStorageClass: 기본 StorageClass 적용             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. etcd 연산                                               │
│  - Pod 객체 저장                                             │
│  - 201 Created 반환                                         │
│  - Pod 정보 반환                                            │
└─────────────────────────────────────────────────────────────┘
```

### 인증/인가 실패 시나리오

```
┌─────────────────────────────────────────────────────────────┐
│          인증/인가 실패 시나리오                            │
└─────────────────────────────────────────────────────────────┘

시나리오 1: 인증 실패 (유효하지 않은 인증서)
  kubectl get pods --certificate=invalid.crt
  
  → X509 플러그인: CA 서명 없음
  → Token 플러그인: 토큰 없음
  → ... 모든 플러그인 실패
  → Anonymous: system:anonymous (권한 없음)
  → RBAC: 권한 없음
  → 결과: 401 Unauthorized
  → 메시지: "x509: certificate signed by unknown authority"

시나리오 2: 인가 실패 (권한 없음)
  kubectl get pods --as=developer
  
  → Authentication: developer 사용자 인증 성공
  → Authorization: RBAC 확인
  → RoleBinding 검색: developer 그룹 없음
  → ClusterRoleBinding 검색: 권한 없음
  → 결과: 403 Forbidden
  → 메시지: "pods is forbidden: User "developer" cannot list resource "pods""

시나리오 3: 어드미션 실패 (정책 위반)
  kubectl apply -f privileged-pod.yaml
  
  → Authentication: 성공
  → Authorization: 성공
  → ValidatingWebhook: Pod 보안 정책 위반
  → privileged: true (금지됨)
  → 결과: 403 Forbidden
  → 메시지: "Privileged containers are not allowed"
```

---

## API Server 플러그인 설정

### kubeadm 설정

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml

apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: registry.k8s.io/kube-apiserver:v1.29.0
    command:
    - kube-apiserver
    
    # 인증 플러그인 설정
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-issuer=https://kubernetes.default.svc
    - --oidc-issuer-url=https://accounts.google.com
    - --oidc-client-id=kubernetes
    - --anonymous-auth=false
    
    # 인가 플러그인 설정
    - --authorization-mode=Node,RBAC
    
    # 어드미션 컨트롤러 설정
    - --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,ResourceQuota,MutatingAdmissionWebhook,ValidatingAdmissionWebhook
    - --disable-admission-plugins=AlwaysAllow
    - --admission-control-config-file=/etc/kubernetes/admission-control.yaml
    
    # 웹훅 설정
    - --authentication-token-webhook-config-file=/etc/kubernetes/auth-webhook.conf
    - --authorization-webhook-config-file=/etc/kubernetes/authz-webhook.conf
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. API Server 요청 처리 3 단계                             │
│     Authentication → Authorization → Admission Control      │
│                                                             │
│  2. Authentication Plugin (인증)                            │
│     - "누구인가?" 확인                                     │
│     - 순서: X509 → Token → OIDC → Webhook → Anonymous      │
│     - 실패: 401 Unauthorized                               │
│     - 추출: username, groups, uid                          │
│                                                             │
│  3. Authorization Plugin (인가)                             │
│     - "무엇을 할 수 있는가?" 확인                          │
│     - 순서: Node → RBAC → Webhook → AlwaysAllow            │
│     - 실패: 403 Forbidden                                  │
│     - 확인: Role, ClusterRole, Binding                     │
│                                                             │
│  4. Admission Control (어드미션 컨트롤)                     │
│     - "요구사항을 만족하는가?" 확인                        │
│     - 순서: Mutating Webhook → Validating Webhook → 내장  │
│     - 실패: 403 Forbidden                                  │
│     - 수정/검증: 정책, 제한, 기본값                        │
│                                                             │
│  5. 주요 내장 컨트롤러                                      │
│     - NamespaceLifecycle, LimitRanger, ResourceQuota       │
│     - ServiceAccount, DefaultStorageClass                  │
│                                                             │
│  6. 웹훅 어드미션                                           │
│     - Mutating: 수정 가능 (사이드카 인젝션)                │
│     - Validating: 검증만 (정책 준수)                       │
│                                                             │
│  7. 전체 흐름                                               │
│     kubectl → 인증 → 인가 → 어드미션 → etcd → 응답         │
└─────────────────────────────────────────────────────────────┘
```

### 3 단계 보안 계층

```
┌─────────────────────────────────────────────────────────────┐
│          API Server 3 단계 보안 계층                        │
└─────────────────────────────────────────────────────────────┘

1 단계: Authentication (입장 확인)
  ┌─────────────────────────────────────────┐
  │  "초대장이 있나요?"                     │
  │  - 인증서/토큰 확인                     │
  │  - 신원 확인                            │
  │  - 실패: 입장 불가 (401)                │
  └─────────────────────────────────────────┘
            ↓
2 단계: Authorization (권한 확인)
  ┌─────────────────────────────────────────┐
  │  "이곳에 접근할 권한이 있나요?"         │
  │  - Role/ClusterRole 확인                │
  │  - 권한 검증                            │
  │  - 실패: 접근 불가 (403)                │
  └─────────────────────────────────────────┘
            ↓
3 단계: Admission Control (규칙 확인)
  ┌─────────────────────────────────────────┐
  │  "규칙을 지키고 있나요?"                │
  │  - 정책 검증                            │
  │  - 제한 확인                            │
  │  - 실패: 요청 거부 (403)                │
  └─────────────────────────────────────────┘
            ↓
etcd 저장

이 3 단계 보안 계층이 Kubernetes 클러스터를 안전하게 보호합니다.
```

**API Server 는 Authentication, Authorization, Admission Control 3 단계 플러그인으로 모든 요청을 검증합니다. 각 단계는 독립적이며 순차적으로 실행됩니다.**
