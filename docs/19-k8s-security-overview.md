# Authentication 과 Authorization

Kubernetes 보안의 핵심 개념인 인증 (Authentication) 과 인가 (Authorization) 에 대해 알아봅니다.

---

## 핵심 개념 비교

```
┌─────────────────────────────────────────────────────────────┐
│          Authentication vs Authorization                    │
└─────────────────────────────────────────────────────────────┘

Authentication (인증):
  "누구인가?" (Who are you?)
  
  - 사용자/시스템의 신원 확인
  - 아이디/비밀번호, 인증서, 토큰 등 사용
  - 예: 여권 검사, 지문 인증
  
Authorization (인가):
  "무엇을 할 수 있는가?" (What can you do?)
  
  - 권한 확인 및 부여
  - 리소스 접근 제어
  - 예: 비자 발급, 역할에 따른 접근 권한

비유:
  Authentication: 회사 출입증으로 신원 확인
  Authorization: 출입증의 권한에 따른 접근 제한
                   (사원: 로비만, 관리자: 모든 층)
```

### 관계도

```
┌─────────────────────────────────────────────────────────────┐
│          인증 → 인가 흐름                                   │
└─────────────────────────────────────────────────────────────┘

1. 인증 (Authentication)
   ┌─────────────────┐
   │  사용자 요청    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  신원 확인      │
   │  - 인증서       │
   │  - 토큰         │
   │  - 비밀번호     │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  사용자 식별    │
   │  (CN, username) │
   └────────┬────────┘
            │
            │ 인증 성공
            ▼
2. 인가 (Authorization)
   ┌─────────────────┐
   │  권한 확인      │
   │  - RBAC         │
   │  - ABAC         │
   │  - Node         │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  권한 부여      │
   │  - 읽기         │
   │  - 쓰기         │
   │  - 삭제         │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  리소스 접근    │
   │  허용/거부      │
   └─────────────────┘
```

---

## Authentication (인증)

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│              Authentication (인증)                          │
└─────────────────────────────────────────────────────────────┘

정의:
  - 요청한 주체가 누구인지 확인하는 과정
  - "당신은 누구입니까?"에 대한 답변
  - 신원 증명이 목적

Kubernetes 에서:
  - API Server 가 모든 요청을 인증
  - 인증되지 않은 요청은 401 Unauthorized 반환
  - 인증된 요청은 사용자 정보가 요청에 포함됨
```

### Kubernetes 인증 방식

```
┌─────────────────────────────────────────────────────────────┐
│              Kubernetes 인증 방식                           │
└─────────────────────────────────────────────────────────────┘

1. 클라이언트 인증서 (X.509 Certificate)
   ┌─────────────────────────────────────────┐
   │  - 가장 일반적이고 안전한 방식          │
   │  - CN (Common Name) → 사용자 이름       │
   │  - O (Organization) → 그룹 이름         │
   │  - 예: CN=admin, O=system:masters       │
   └─────────────────────────────────────────┘

2. 토큰 (Token)
   ┌─────────────────────────────────────────┐
   │  - ServiceAccount 토큰 (JWT)            │
   │  - 정적 토큰 (Static Token)             │
   │  - 예: kubectl 에서 --token 옵션       │
   └─────────────────────────────────────────┘

3. Basic Auth (비밀번호)
   ┌─────────────────────────────────────────┐
   │  - 사용자명/비밀번호                    │
   │  - 레거시 방식 (권장 안 함)             │
   │  - Kubernetes 1.19 부터 제거됨          │
   └─────────────────────────────────────────┘

4. OpenID Connect (OIDC)
   ┌─────────────────────────────────────────┐
   │  - 외부 인증 제공자 사용                │
   │  - Google, Microsoft, Okta 등           │
   │  - JWT 토큰 기반                        │
   └─────────────────────────────────────────┘

5. Webhook Token
   ┌─────────────────────────────────────────┐
   │  - 외부 인증 서버에 위임                │
   │  - 사용자 정의 인증 로직                │
   └─────────────────────────────────────────┘

6. Anonymous (익명)
   ┌─────────────────────────────────────────┐
   │  - 인증되지 않은 요청                   │
   │  - system:anonymous 사용자로 처리       │
   │  - 기본 권한 없음                       │
   └─────────────────────────────────────────┘
```

### 인증서 기반 인증 상세

```
┌─────────────────────────────────────────────────────────────┐
│              인증서 기반 인증                               │
└─────────────────────────────────────────────────────────────┘

인증서 구조:
  ┌─────────────────────────────────────────┐
  │  Subject:                               │
  │    CN = admin                           │
  │    O = system:masters                   │
  │    OU = IT Department                   │
  │    C = KR                               │
  └─────────────────────────────────────────┘

Kubernetes 매핑:
  - CN → 사용자 이름 (username)
  - O → 그룹 이름 (groups)
  - OU → 추가 그룹

예시:
  인증서: CN=john, O=developers, O=admins
  
  Kubernetes 사용자:
    - username: john
    - groups: developers, admins

kubectl 설정:
  kubectl config set-credentials john \
    --client-certificate=admin.crt \
    --client-key=admin.key
```

### 인증 과정

```
┌─────────────────────────────────────────────────────────────┐
│              Kubernetes 인증 과정                           │
└─────────────────────────────────────────────────────────────┘

1. kubectl 요청
   $ kubectl get pods
   
2. kubeconfig 에서 인증 정보 읽기
   - client-certificate: admin.crt
   - client-key: admin.key

3. API Server 로 TLS 연결
   - HTTPS (6443 포트)
   - 클라이언트 인증서 전송

4. API Server 인증 처리
   - 인증서 서명 검증 (CA 인증서로)
   - 유효기간 확인
   - CN/O 추출

5. 인증 결과
   - 성공: 사용자 정보 (john, groups) 설정
   - 실패: 401 Unauthorized 반환

6. 인가로 이동
   - 인증된 사용자 정보로 권한 확인
```

### 인증 설정 예시

```yaml
# kubeconfig 파일 예시
apiVersion: v1
kind: Config

clusters:
- cluster:
    certificate-authority-data: LS0tLS1...
    server: https://192.168.1.10:6443
  name: kubernetes

users:
- name: admin
  user:
    client-certificate-data: LS0tLS1...
    client-key-data: LS0tLS1...

contexts:
- context:
    cluster: kubernetes
    user: admin
    namespace: default
  name: admin@kubernetes

current-context: admin@kubernetes
```

---

## Authorization (인가)

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│              Authorization (인가)                           │
└─────────────────────────────────────────────────────────────┘

정의:
  - 인증된 사용자가 무엇을 할 수 있는지 결정
  - "당신은 이 작업을 수행할 권한이 있는가?"
  - 접근 제어가 목적

Kubernetes 에서:
  - API Server 가 인증 후 인가 수행
  - 권한 없으면 403 Forbidden 반환
  - 여러 인가 모듈 동시 사용 가능
```

### Kubernetes 인가 모듈

```
┌─────────────────────────────────────────────────────────────┐
│              Kubernetes 인가 모듈                           │
└─────────────────────────────────────────────────────────────┘

1. Node Authorization
   - kubelet 요청 전용
   - 노드 관련 작업 제한
   - 자동 활성화

2. ABAC (Attribute-Based Access Control)
   - 속성 기반 접근 제어
   - JSON 정책 파일
   - 레거시 (권장 안 함)

3. RBAC (Role-Based Access Control) ★
   - 역할 기반 접근 제어
   - 현재 표준
   - Role, ClusterRole, RoleBinding, ClusterRoleBinding

4. Webhook
   - 외부 인가 서버에 위임
   - 사용자 정의 인가 로직

5. AlwaysAllow
   - 모든 요청 허용
   - 개발/테스트용

6. AlwaysDeny
   - 모든 요청 거부
   - 보안 테스트용
```

### RBAC (Role-Based Access Control)

```
┌─────────────────────────────────────────────────────────────┐
│              RBAC 구성 요소                                 │
└─────────────────────────────────────────────────────────────┘

1. Role (역할)
   - 네임스페이스 내 권한 정의
   - 리소스와 동작 (verbs) 지정
   
2. ClusterRole (클러스터 역할)
   - 클러스터 전체 권한 정의
   - 모든 네임스페이스 포함
   - 노드, PV 등 클러스터 리소스

3. RoleBinding (역할 바인딩)
   - Role 을 사용자/그룹에 연결
   - 네임스페이스 내 적용

4. ClusterRoleBinding (클러스터 역할 바인딩)
   - ClusterRole 을 사용자/그룹에 연결
   - 클러스터 전체 적용
```

### RBAC 예시

```yaml
# 1. Role 생성 (네임스페이스 내 권한)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

---
# 2. RoleBinding (사용자에게 권한 부여)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: john          # 인증서의 CN
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: developers    # 인증서의 O
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io

---
# 3. ClusterRole (클러스터 전체 권한)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-viewer
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]

---
# 4. ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: view-nodes
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: node-viewer
  apiGroup: rbac.authorization.k8s.io
```

### 인가 과정

```
┌─────────────────────────────────────────────────────────────┐
│              Kubernetes 인가 과정                           │
└─────────────────────────────────────────────────────────────┘

1. 인증된 요청 수신
   - 사용자: john
   - 그룹: developers, admins
   - 작업: GET /api/v1/namespaces/default/pods

2. 인가 모듈 순차적 확인
   ┌─────────────────────────────────────────┐
   │  1. Node Authorization                  │
   │     - kubelet 요청? → 확인              │
   │     - 아님 → 다음 모듈                  │
   │                                         │
   │  2. RBAC                                │
   │     - Role/ClusterRole 확인             │
   │     - RoleBinding/ClusterRoleBinding    │
   │     - 권한 있음? → 허용               │
   │     - 권한 없음? → 다음 모듈            │
   │                                         │
   │  3. Webhook (설정된 경우)               │
   │     - 외부 서버에 문의                  │
   │                                         │
   │  4. AlwaysAllow/AlwaysDeny              │
   │     - 기본 정책                         │
   └─────────────────────────────────────────┘

3. 결과 반환
   - 권한 있음: 200 OK + 리소스 반환
   - 권한 없음: 403 Forbidden
```

---

## 인증 vs 인가 비교

### 상세 비교

```
┌─────────────────────────────────────────────────────────────┐
│          Authentication vs Authorization 상세 비교          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  Authentication      │  Authorization                       │
│  (인증)              │  (인가)                              │
├──────────────────────┼──────────────────────────────────────┤
│  질문                │  질문                                │
│  "누구인가?"         │  "무엇을 할 수 있는가?"              │
├──────────────────────┼──────────────────────────────────────┤
│  목적                │  목적                                │
│  신원 확인           │  권한 부여                           │
├──────────────────────┼──────────────────────────────────────┤
│  시점                │  시점                                │
│  인가 전 (1 단계)    │  인증 후 (2 단계)                    │
├──────────────────────┼──────────────────────────────────────┤
│  실패 응답           │  실패 응답                           │
│  401 Unauthorized    │  403 Forbidden                       │
├──────────────────────┼──────────────────────────────────────┤
│  Kubernetes 구성     │  Kubernetes 구성                     │
│  - 인증서            │  - Role                              │
│  - 토큰              │  - ClusterRole                       │
│  - kubeconfig        │  - RoleBinding                       │
│                      │  - ClusterRoleBinding                │
├──────────────────────┼──────────────────────────────────────┤
│  확인 항목           │  확인 항목                           │
│  - 인증서 유효기간   │  - verbs (get, list, create...)      │
│  - CA 서명           │  - resources (pods, deployments...)  │
│  - CN/O              │  - apiGroups                         │
├──────────────────────┼──────────────────────────────────────┤
│  예시                │  예시                                │
│  - 여권 검사         │  - 비자 발급                         │
│  - 아이디/비밀번호   │  - 역할에 따른 접근                  │
│  - 지문/얼굴 인증   │  - 관리자/일반 사용자                │
└──────────────────────┴──────────────────────────────────────┘
```

### 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 요청 처리 흐름                          │
└─────────────────────────────────────────────────────────────┘

kubectl get pods
       │
       ▼
┌─────────────────┐
│  1. 인증        │
│  (Authentication)│
│                 │
│  - 인증서 확인  │
│  - 토큰 검증    │
│  - 사용자 추출  │
└────────┬────────┘
         │
         │ 인증 실패
         ├─────────────▶ 401 Unauthorized
         │
         │ 인증 성공
         ▼
┌─────────────────┐
│  2. 인가        │
│  (Authorization)│
│                 │
│  - RBAC 확인    │
│  - 권한 검증    │
│  - RoleBinding  │
└────────┬────────┘
         │
         │ 인가 실패
         ├─────────────▶ 403 Forbidden
         │
         │ 인가 성공
         ▼
┌─────────────────┐
│  3. 실행        │
│  (Admission)    │
│                 │
│  - Validating   │
│  - Mutating     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. 응답        │
│  200 OK         │
│  + Pod 목록     │
└─────────────────┘
```

---

## 실습 예제

### 인증서 기반 사용자 생성

```bash
# 1. 개인키 생성
openssl genrsa -out john.key 2048

# 2. CSR 생성
openssl req -new -key john.key \
  -out john.csr \
  -subj "/CN=john/O=developers"

# 3. 인증서 발급 (CA 사용)
openssl x509 -req -in john.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out john.crt \
  -days 365

# 4. kubeconfig 에 사용자 추가
kubectl config set-credentials john \
  --client-certificate=john.crt \
  --client-key=john.key

# 5. 컨텍스트 생성
kubectl config set-context john-context \
  --cluster=kubernetes \
  --user=john \
  --namespace=default

# 6. 컨텍스트 전환
kubectl config use-context john-context

# 7. 권한 테스트
kubectl get pods
# 권한 없으면: Error from server (Forbidden)
```

### RBAC 권한 부여

```bash
# 1. Role 생성 (파드 읽기 권한)
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
EOF

# 2. RoleBinding 생성 (john 에게 권한 부여)
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: john
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
EOF

# 3. 권한 확인
kubectl auth can-i get pods --as john
# 출력: yes

kubectl auth can-i create pods --as john
# 출력: no

# 4. john 으로 파드 조회
kubectl get pods --as john
# 성공!

# 5. john 으로 파드 생성
kubectl run test --image=nginx --as john
# 실패: Error from server (Forbidden)
```

### 인증서 기반 인가 흐름 확인

```bash
# 1. 현재 사용자 확인
kubectl config view --minify -o jsonpath='{.users[0].name}'
# 출력: admin

# 2. 현재 컨텍스트 확인
kubectl config current-context
# 출력: admin@kubernetes

# 3. 권한 확인 (관리자)
kubectl auth can-i '*' '*'
# 출력: yes (관리자는 모든 권한)

# 4. 일반 사용자로 전환
kubectl config use-context john-context

# 5. 권한 확인 (일반 사용자)
kubectl auth can-i get pods
# 출력: yes

kubectl auth can-i create pods
# 출력: no

# 6. 관리자 컨텍스트로 복귀
kubectl config use-context admin@kubernetes
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Authentication (인증)                                   │
│     - "누구인가?" 확인                                     │
│     - 인증서, 토큰, 비밀번호 등 사용                        │
│     - Kubernetes: X.509 인증서 (CN, O)                     │
│     - 실패 시: 401 Unauthorized                            │
│                                                             │
│  2. Authorization (인가)                                    │
│     - "무엇을 할 수 있는가?" 확인                          │
│     - RBAC 이 표준 (Role, ClusterRole, Binding)            │
│     - 실패 시: 403 Forbidden                               │
│                                                             │
│  3. 처리 순서                                               │
│     인증 (Authentication) → 인가 (Authorization) → 실행    │
│                                                             │
│  4. Kubernetes RBAC                                         │
│     - Role: 네임스페이스 내 권한                           │
│     - ClusterRole: 클러스터 전체 권한                      │
│     - RoleBinding: 사용자 ←→ Role 연결                     │
│     - ClusterRoleBinding: 사용자 ←→ ClusterRole 연결       │
│                                                             │
│  5. 인증서 → 사용자 매핑                                    │
│     - CN (Common Name) → 사용자 이름                       │
│     - O (Organization) → 그룹 이름                         │
│     - 예: CN=john, O=developers → 사용자: john, 그룹: developers│
│                                                             │
│  6. 권한 확인 명령어                                        │
│     kubectl auth can-i <verb> <resource> --as <user>       │
│     예: kubectl auth can-i create pods --as john           │
└─────────────────────────────────────────────────────────────┘
```

### 인증과 인가의 관계

```
┌─────────────────────────────────────────────────────────────┐
│          인증과 인가는 보안의 두 기둥                       │
└─────────────────────────────────────────────────────────────┘

인증 없이 인가만:
  ❌ 누구인지 모르는데 권한을 줄 수 없음
  ❌ 보안 구멍 발생

인가 없이 인증만:
  ❌ 누구인지는 알지만 아무거나 다 함
  ❌ 보안 의미 없음

올바른 보안:
  ✓ 인증 (신원 확인) → 인가 (권한 부여)
  ✓ 최소 권한 원칙 (필요한 권한만 부여)
  ✓ 정기적 권한 검토

Kubernetes 보안의 기본:
  1. 강력한 인증 (인증서 기반)
  2. 세밀한 인가 (RBAC)
  3. 감사 로깅 (Admission Webhook)
```

**인증은 "누구인가"를 확인하고, 인가는 "무엇을 할 수 있는가"를 결정합니다. 둘 다 Kubernetes 보안에 필수적입니다.**
