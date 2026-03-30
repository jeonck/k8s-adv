# Kubernetes 에서 Machine User 와 Human User

Kubernetes 에서 사용자 (User) 는 Human User (사람) 와 Machine User (기계/서비스) 로 구분됩니다. 이 두 유형의 차이점과 사용 방법을 알아봅니다.

---

## 핵심 개념 비교

```
┌─────────────────────────────────────────────────────────────┐
│          Human User vs Machine User                         │
└─────────────────────────────────────────────────────────────┘

Human User (사람 사용자):
  - 개발자, 관리자, 운영팀 등 실제 사람
  - kubectl CLI 사용
  - 인증서 또는 OIDC 토큰으로 인증
  - 예: admin, developer, operator

Machine User (기계/서비스 사용자):
  - 애플리케이션, 서비스, 자동화 도구
  - ServiceAccount 토큰 사용
  - Pod 내부에서 API 접근
  - 예: myapp, ci-cd-pipeline, monitoring-agent

비유:
  Human User: 회사 직원 (사원증, 출퇴근)
  Machine User: 로봇/시스템 (API 키, 24 시간 작동)
```

### 비교 표

```
┌─────────────────────────────────────────────────────────────┐
│          Human User vs Machine User 상세 비교               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  Human User          │  Machine User                        │
│  (사람)              │  (기계/서비스)                       │
├──────────────────────┼──────────────────────────────────────┤
│  주체                │  주체                                │
│  개발자, 관리자      │  애플리케이션, 서비스, CI/CD         │
├──────────────────────┼──────────────────────────────────────┤
│  인증 방식           │  인증 방식                           │
│  - X.509 인증서      │  - ServiceAccount 토큰 (JWT)         │
│  - OIDC 토큰         │  - 토큰 자동 갱신                     │
│  - 정적 토큰         │  - Pod 에 자동 마운트                 │
├──────────────────────┼──────────────────────────────────────┤
│  식별자              │  식별자                              │
│  CN (Common Name)    │  system:serviceaccount:              │
│  예: CN=john         │      <namespace>:<name>              │
│  예: CN=admin        │  예: system:serviceaccount:          │
│                      │      default:myapp                   │
├──────────────────────┼──────────────────────────────────────┤
│  그룹                │  그룹                                │
│  O (Organization)    │  system:serviceaccounts              │
│  예: developers      │  system:serviceaccounts:<namespace>  │
│  예: admins          │                                      │
├──────────────────────┼──────────────────────────────────────┤
│  수명                │  수명                                │
│  장기 (1 년+)        │  단기 (토큰 자동 회전)               │
│  또는 OIDC (1 시간)  │  Pod 수명과 동일                     │
├──────────────────────┼──────────────────────────────────────┤
│  사용 사례           │  사용 사례                           │
│  - kubectl 명령      │  - Pod 내부 API 호출                 │
│  - 수동 작업         │  - 자동화 스크립트                   │
│  - 관리 작업         │  - CI/CD 파이프라인                  │
├──────────────────────┼──────────────────────────────────────┤
│  생성 방법           │  생성 방법                           │
│  - 인증서 발급       │  - ServiceAccount 리소스 생성        │
│  - OIDC 연동         │  - 토큰 자동 생성                    │
├──────────────────────┼──────────────────────────────────────┤
│  취소/폐기           │  취소/폐기                           │
│  - 인증서 폐기       │  - 토큰 무효화                       │
│  - OIDC 세션 종료    │  - Pod 삭제                          │
│  - RBAC 제거         │  - ServiceAccount 삭제               │
├──────────────────────┼──────────────────────────────────────┤
│  보안 고려사항       │  보안 고려사항                       │
│  - 개인키 보호       │  - 토큰 노출 방지                    │
│  - 정기적 갱신       │  - 최소 권한 원칙                    │
│  - MFA 권장          │  - 토큰 자동 회전                    │
└──────────────────────┴──────────────────────────────────────┘
```

---

## Human User (사람 사용자)

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│              Human User (사람 사용자)                       │
└─────────────────────────────────────────────────────────────┘

정의:
  - 실제 사람 (개발자, 관리자, 운영팀)
  - kubectl CLI 를 통해 클러스터와 상호작용
  - 대화형 작업에 적합

주요 특징:
  ✓ 인증서 또는 OIDC 토큰 사용
  ✓ 장기 또는 단기 세션
  ✓ MFA (다중 인증) 가능
  ✓ 감사 로그에 사용자 이름 기록
```

### Human User 인증 방식

```
┌─────────────────────────────────────────────────────────────┐
│              Human User 인증 방식                           │
└─────────────────────────────────────────────────────────────┘

1. X.509 클라이언트 인증서 (가장 일반적)
   ┌─────────────────────────────────────────┐
   │  장점:                                  │
   │  - 안전한 인증                          │
   │  - 오프라인 인증 가능                   │
   │  - 긴 유효기간 (1 년+)                   │
   │                                         │
   │  단점:                                  │
   │  - 인증서 관리 필요                     │
   │  - 폐기/갱신 수동                       │
   │  - MFA 지원 안 됨                       │
   └─────────────────────────────────────────┘

2. OIDC (OpenID Connect) 토큰
   ┌─────────────────────────────────────────┐
   │  장점:                                  │
   │  - 외부 인증 제공자 (Google, Okta 등)   │
   │  - MFA 지원                             │
   │  - 자동 만료 (1 시간)                   │
   │  - 중앙 집중식 사용자 관리              │
   │                                         │
   │  단점:                                  │
   │  - 외부 의존성                          │
   │  - 설정 복잡                            │
   │  - 네트워크 필요                        │
   └─────────────────────────────────────────┘

3. 정적 토큰 (Static Token, 레거시)
   ┌─────────────────────────────────────────┐
   │  장점:                                  │
   │  - 간단한 설정                          │
   │                                         │
   │  단점:                                  │
   │  - 보안 취약 (권장 안 함)               │
   │  - Kubernetes 1.19 부터 제거됨          │
   └─────────────────────────────────────────┘
```

### Human User 생성 및 설정

#### 1. 인증서 기반 Human User

```bash
# 1. 개인키 생성
openssl genrsa -out john.key 2048

# 2. CSR 생성 (CN=사용자이름, O=그룹)
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
  --client-key=john.key \
  --embed-certs=true

# 5. 컨텍스트 생성
kubectl config set-context john-context \
  --cluster=kubernetes \
  --user=john \
  --namespace=default

# 6. 컨텍스트 전환
kubectl config use-context john-context

# 7. 권한 확인
kubectl auth whoami
# 출력: NAME: john, GROUPS: developers
```

#### 2. OIDC 기반 Human User

```bash
# 1. OIDC 인증 제공자 설정 (Google 예시)
# API Server 옵션 추가:
# --oidc-issuer-url=https://accounts.google.com
# --oidc-client-id=kubernetes
# --oidc-username-claim=email
# --oidc-groups-claim=groups

# 2. kubectl OIDC 로그인
kubectl oidc-login

# 또는 수동 토큰 설정:
kubectl config set-credentials john-oidc \
  --auth-provider=oidc \
  --auth-provider-arg=issuer-url=https://accounts.google.com \
  --auth-provider-arg=client-id=kubernetes \
  --auth-provider-arg=client-secret=SECRET \
  --auth-provider-arg=refresh-token=REFRESH_TOKEN

# 3. 컨텍스트 설정
kubectl config set-context john-oidc-context \
  --cluster=kubernetes \
  --user=john-oidc

# 4. 로그인 및 사용
kubectl config use-context john-oidc-context
kubectl get pods
# → 브라우저에서 인증 창 표시
```

### Human User 권한 부여

```yaml
# Human User 에게 권한 부여 (RBAC)

# 1. Role 생성 (네임스페이스 내 권한)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-manager
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "pods/exec"]
  verbs: ["get", "list", "create", "update", "delete"]

---
# 2. RoleBinding (사용자 연결)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: john-pod-manager
  namespace: default
subjects:
- kind: User
  name: john              # 인증서의 CN
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: developers        # 인증서의 O
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-manager
  apiGroup: rbac.authorization.k8s.io

---
# 3. ClusterRoleBinding (클러스터 전체 권한)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-viewers
subjects:
- kind: Group
  name: viewers           # 모든 viewer 그룹 사용자
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: view
  apiGroup: rbac.authorization.k8s.io
```

### Human User 관리 모범 사례

```
┌─────────────────────────────────────────────────────────────┐
│          Human User 관리 모범 사례                          │
└─────────────────────────────────────────────────────────────┘

1. 그룹 기반 권한 부여
   ✓ 직접 사용자 대신 그룹에 권한 부여
   ✓ 예: CN=john, O=developers → developers 그룹에 권한
   ✓ 장점: 사용자 변경 시 그룹만 수정

2. 정기적 권한 검토
   ✓ 분기별 권한 감사
   ✓ 퇴사자 권한 즉시 제거
   ✓ 최소 권한 원칙 적용

3. 인증서 관리
   ✓ 유효기간 1 년 이하
   ✓ 자동 갱신 프로세스
   ✓ 폐기된 인증서 즉시 CRL 등록

4. OIDC 사용 (권장)
   ✓ 중앙 집중식 사용자 관리
   ✓ MFA 지원
   ✓ 자동 만료 (보안)
   ✓ 세션 관리

5. 감사 로깅
   ✓ 모든 kubectl 명령 로그
   ✓ 사용자별 활동 추적
   ✓ 이상 징후 탐지
```

---

## Machine User (기계/서비스 사용자)

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          Machine User (기계/서비스 사용자)                  │
└─────────────────────────────────────────────────────────────┘

정의:
  - 애플리케이션, 서비스, 자동화 도구
  - Pod 내부에서 Kubernetes API 와 상호작용
  - ServiceAccount 로 구현

주요 특징:
  ✓ ServiceAccount 토큰 (JWT) 사용
  ✓ Pod 에 자동 마운트
  ✓ 토큰 자동 갱신/회전
  ✓ 네임스페이스별 격리
```

### ServiceAccount 구조

```
┌─────────────────────────────────────────────────────────────┐
│              ServiceAccount 구조                            │
└─────────────────────────────────────────────────────────────┘

ServiceAccount 리소스:
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: myapp
    namespace: default
  secrets:
  - name: myapp-token-xxxxx

자동 생성되는 시크릿:
  apiVersion: v1
  kind: Secret
  metadata:
    name: myapp-token-xxxxx
    annotations:
      kubernetes.io/service-account.name: myapp
  type: kubernetes.io/service-account-token
  data:
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9...  # JWT 토큰
    ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...

Pod 에 자동 마운트:
  /var/run/secrets/kubernetes.io/serviceaccount/
  ├── token      # ServiceAccount 토큰
  ├── ca.crt     # CA 인증서
  └── namespace  # 네임스페이스 이름
```

### Machine User 식별자

```
┌─────────────────────────────────────────────────────────────┐
│              Machine User 식별자                            │
└─────────────────────────────────────────────────────────────┘

ServiceAccount 의 사용자 이름:
  system:serviceaccount:<namespace>:<name>

예시:
  ServiceAccount: myapp (namespace: default)
  → 사용자 이름: system:serviceaccount:default:myapp

  ServiceAccount: ci-cd (namespace: cicd)
  → 사용자 이름: system:serviceaccount:cicd:ci-cd

ServiceAccount 의 그룹:
  - system:serviceaccounts (모든 ServiceAccount)
  - system:serviceaccounts:<namespace> (네임스페이스별)

예시:
  default 네임스페이스의 모든 ServiceAccount:
  → 그룹: system:serviceaccounts:default
```

### Machine User 생성 및 사용

#### 1. 기본 ServiceAccount 사용

```yaml
# Pod 은 기본적으로 'default' ServiceAccount 사용
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: app
    image: myapp:latest
  # serviceAccountName 생략 시 'default' 사용

# Pod 내부에서 토큰 접근
kubectl exec my-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
# 출력: eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9...
```

#### 2. 커스텀 ServiceAccount 생성

```yaml
# 1. ServiceAccount 생성
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: default
  labels:
    app: myapp

---
# 2. Pod 에서 사용
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  serviceAccountName: myapp  # 커스텀 ServiceAccount 지정
  containers:
  - name: app
    image: myapp:latest
```

#### 3. Pod 내부에서 API 호출

```bash
# Pod 내부에서 Kubernetes API 호출 예시

# 1. 토큰 읽기
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# 2. 네임스페이스 읽기
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)

# 3. CA 인증서 경로
CA_CERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# 4. API 호출 (파드 목록 조회)
curl --cacert $CA_CERT \
  -H "Authorization: Bearer $TOKEN" \
  https://kubernetes.default.svc/api/v1/namespaces/$NAMESPACE/pods

# 5. Python 예시 (kubernetes-client)
from kubernetes import client, config

# Pod 내부에서 자동 설정
config.load_incluster_config()

v1 = client.CoreV1Api()
pods = v1.list_namespaced_pod(namespace="default")
for pod in pods.items:
    print(pod.metadata.name)
```

### Machine User 권한 부여

```yaml
# Machine User 에게 권한 부여 (RBAC)

# 1. ServiceAccount 생성
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: default

---
# 2. Role 생성 (파드 읽기 권한)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader-role
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]

---
# 3. RoleBinding (ServiceAccount 연결)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: ServiceAccount
  name: pod-reader        # ServiceAccount 이름
  namespace: default      # 네임스페이스
roleRef:
  kind: Role
  name: pod-reader-role
  apiGroup: rbac.authorization.k8s.io

---
# 4. Pod 에서 사용
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: pod-reader
  containers:
  - name: app
    image: myapp:latest
```

### Machine User 관리 모범 사례

```
┌─────────────────────────────────────────────────────────────┐
│          Machine User 관리 모범 사례                        │
└─────────────────────────────────────────────────────────────┘

1. 전용 ServiceAccount 사용
   ✓ 애플리케이션별 전용 ServiceAccount 생성
   ✓ 'default' ServiceAccount 사용 금지
   ✓ 명확한 이름명명 (myapp, ci-cd, monitoring)

2. 최소 권한 원칙
   ✓ 필요한 권한만 부여
   ✓ ClusterRole 대신 Role 사용 (네임스페이스 제한)
   ✓ 읽기 전용 권한 먼저 시도

3. 토큰 보안
   ✓ 토큰 노출 방지 (로그, Git 에 커밋 안 함)
   ✓ 토큰 자동 회전 활용 (Kubernetes 1.21+)
   ✓ 불필요한 토큰 마운트 방지 (automountServiceAccountToken: false)

4. 네임스페이스 격리
   ✓ 애플리케이션별 네임스페이스 분리
   ✓ 네임스페이스별 ServiceAccount 사용
   ✓ 교차 네임스페이스 접근 제한

5. 감사 및 모니터링
   ✓ ServiceAccount 사용 로그
   ✓ 이상한 API 호출 탐지
   ✓ 정기적 권한 검토
```

---

## Human User vs Machine User 비교 실습

### 사용자 식별

```bash
# Human User 확인
kubectl config view --minify -o jsonpath='{.users[0].name}'
# 출력: john (CN 값)

# 현재 사용자 정보
kubectl auth whoami
# 출력:
# NAME: john
# GROUPS: developers, system:authenticated

# Machine User (ServiceAccount) 확인
kubectl get serviceaccount -n default
# NAME      SECRETS   AGE
# default   0         10d
# myapp     1         5d

# ServiceAccount 의 사용자 이름
# system:serviceaccount:default:myapp
```

### 권한 확인

```bash
# Human User 권한 확인
kubectl auth can-i get pods --as john
# 출력: yes

kubectl auth can-i create deployments --as john
# 출력: no

# Machine User 권한 확인
kubectl auth can-i get pods \
  --as system:serviceaccount:default:myapp
# 출력: yes

kubectl auth can-i delete pods \
  --as system:serviceaccount:default:myapp
# 출력: no
```

### 토큰 비교

```bash
# Human User (인증서 기반)
# - kubeconfig 에 인증서 경로 저장
# - TLS 핸드셰이크 시 인증서 사용
cat ~/.kube/config
# users:
# - name: john
#   user:
#     client-certificate-data: LS0tLS1...
#     client-key-data: LS0tLS1...

# Machine User (토큰 기반)
# - Pod 내부에 토큰 파일 마운트
kubectl exec my-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
# eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwi...
# (JWT 토큰, Base64 디코딩 가능)
```

---

## 사용 사례별 권장

```
┌─────────────────────────────────────────────────────────────┐
│          사용 사례별 권장 사용자 유형                       │
└─────────────────────────────────────────────────────────────┘

개발자 작업:
  ✓ Human User (인증서 또는 OIDC)
  ✓ kubectl CLI 사용
  ✓ 그룹 기반 권한 (developers, admins)

CI/CD 파이프라인:
  ✓ Machine User (ServiceAccount)
  ✓ Jenkins, GitLab CI 등
  ✓ 최소 권한 (배포만 가능)

애플리케이션:
  ✓ Machine User (ServiceAccount)
  ✓ Pod 내부 API 호출
  ✓ 네임스페이스 제한

모니터링 도구:
  ✓ Machine User (ServiceAccount)
  ✓ Prometheus, Grafana
  ✓ 읽기 전용 권한

비상 대응:
  ✓ Human User (관리자 인증서)
  ✓ break-glass 접근
  ✓ 감사 로그 강화
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Human User (사람 사용자)                                │
│     - 개발자, 관리자, 운영팀                               │
│     - 인증서 또는 OIDC 토큰                                 │
│     - kubectl CLI 사용                                     │
│     - CN (사용자), O (그룹) 으로 식별                       │
│     - 장기 세션 또는 자동 만료                             │
│                                                             │
│  2. Machine User (기계/서비스 사용자)                       │
│     - 애플리케이션, 서비스, CI/CD                          │
│     - ServiceAccount 토큰 (JWT)                             │
│     - Pod 내부 API 호출                                    │
│     - system:serviceaccount:<ns>:<name> 식별               │
│     - 토큰 자동 회전                                       │
│                                                             │
│  3. 주요 차이점                                             │
│     - 인증 방식: 인증서/OIDC vs ServiceAccount 토큰        │
│     - 수명: 장기 vs 단기 (자동 회전)                       │
│     - 사용처: kubectl vs Pod 내부                          │
│     - 관리: 수동 vs 자동                                   │
│                                                             │
│  4. 모범 사례                                               │
│     - Human: 그룹 기반 권한, OIDC 사용, 정기 감사          │
│     - Machine: 전용 SA, 최소 권한, 네임스페이스 격리       │
│                                                             │
│  5. 보안 권고                                               │
│     - 두 유형 모두 최소 권한 원칙 적용                     │
│     - 정기적 권한 검토                                     │
│     - 감사 로그 활성화                                     │
│     - 불필요한 권한 즉시 제거                              │
└─────────────────────────────────────────────────────────────┘
```

### Human User vs Machine User 선택 가이드

```
┌─────────────────────────────────────────────────────────────┐
│          사용자 유형 선택 가이드                            │
└─────────────────────────────────────────────────────────────┘

질문 1: 누가/무엇이 Kubernetes 와 상호작용하나요?
  ├─ 사람 (개발자, 관리자)
  │   └─ Human User 사용 (인증서/OIDC)
  │
  └─ 애플리케이션/서비스
      └─ Machine User 사용 (ServiceAccount)

질문 2: 어떻게 상호작용하나요?
  ├─ kubectl CLI
  │   └─ Human User
  │
  └─ Pod 내부 API 호출
      └─ Machine User

질문 3: 얼마나 오래 사용하나요?
  ├─ 장기 (수개월~수년)
  │   ├─ Human: 인증서 (1 년)
  │   └─ Machine: ServiceAccount (Pod 수명)
  │
  └─ 단기 (수분~수시간)
      └─ Human: OIDC (1 시간 세션)

질문 4: 어디서 사용하나요?
  ├─ 개발자 노트북
  │   └─ Human User
  │
  └─ Kubernetes 클러스터 내부
      └─ Machine User
```

**Human User 는 사람용 (인증서/OIDC), Machine User 는 서비스용 (ServiceAccount) 입니다. 각각의 특성에 맞는 인증方式和 권한 관리가 필요합니다.**
