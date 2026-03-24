# API Server 에 Keycloak OIDC 설정 추가

Kubernetes API Server 에 Keycloak 을 Identity Provider 로 설정하는 실습을 진행합니다.

---

## 개요

```
┌─────────────────────────────────────────────────────────────┐
│          API Server + Keycloak OIDC 통합                    │
└─────────────────────────────────────────────────────────────┘

목적:
  - Keycloak 을 Kubernetes 의 Identity Provider 로 사용
  - OIDC 토큰으로 API Server 인증
  - 중앙 집중식 사용자 관리

환경:
  - Kubernetes: v1.31.4
  - Keycloak: 최신 버전
  - Keycloak URL: https://keycloak-172-31-1-200.nip.io
  - Realm: edu-realm
  - Client ID: kubernetes-client
```

---

## 1 단계: Keycloak OIDC 설정 정보 확인

### Keycloak Realm 정보

```bash
# Keycloak Realm 정보
Issuer URL: https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm

Client ID: kubernetes-client

Username Claim: preferred_username

Groups Claim: groups
```

### Keycloak CA 인증서 준비

```bash
# Keycloak 인증서 디렉토리 생성
mkdir -p /etc/kubernetes/pki/keycloak

# Keycloak CA 인증서 복사
# (Keycloak 서버에서 내보내거나 브라우저에서 추출)
cp keycloak.crt /etc/kubernetes/pki/keycloak/

# 인증서 확인
openssl x509 -in /etc/kubernetes/pki/keycloak/keycloak.crt \
  -text -noout | head -20
```

---

## 2 단계: API Server 설정 파일 수정

### kube-apiserver.yaml 백업

```bash
# Static Pod 설정 파일 백업 (필수!)
cp /etc/kubernetes/manifests/kube-apiserver.yaml \
   /etc/kubernetes/manifests/kube-apiserver.yaml.backup.$(date +%Y%m%d-%H%M%S)

# 백업 파일 확인
ls -la /etc/kubernetes/manifests/kube-apiserver.yaml.backup.*
```

### kube-apiserver.yaml 수정

```bash
# API Server 설정 파일 편집
vi /etc/kubernetes/manifests/kube-apiserver.yaml
```

### OIDC 설정 추가

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: registry.k8s.io/kube-apiserver:v1.31.4
    command:
    - kube-apiserver
    
    # 기존 인증 설정 (유지)
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-issuer=https://kubernetes.default.svc
    
    # 기존 네트워크 설정 (유지)
    - --service-cluster-ip-range=10.96.0.0/12
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    
    # ===== Keycloak OIDC 설정 추가 =====
    - --oidc-issuer-url=https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm
    - --oidc-client-id=kubernetes-client
    - --oidc-username-claim=preferred_username
    - --oidc-username-prefix=-
    - --oidc-groups-claim=groups
    - --oidc-ca-file=/etc/kubernetes/pki/keycloak/keycloak.crt
    # ===================================
    
    # 기타 기존 설정 유지
    - --authorization-mode=Node,RBAC
    - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
    - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
    # ...
    
    volumeMounts:
    # 기존 마운트 유지
    - mountPath: /etc/kubernetes/pki
      name: k8s-certs
      readOnly: true
    
    # Keycloak 인증서 마운트 추가
    - mountPath: /etc/kubernetes/pki/keycloak
      name: keycloak-certs
      readOnly: true
    # ...
  
  volumes:
  # 기존 볼륨 유지
  - hostPath:
      path: /etc/kubernetes/pki
      type: DirectoryOrCreate
    name: k8s-certs
  
  # Keycloak 인증서 볼륨 추가
  - hostPath:
      path: /etc/kubernetes/pki/keycloak
      type: DirectoryOrCreate
    name: keycloak-certs
  # ...
```

### OIDC 설정 옵션 설명

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC 설정 옵션 설명                                │
└─────────────────────────────────────────────────────────────┘

--oidc-issuer-url:
  - Keycloak Realm URL
  - 토큰 발급자 식별자
  - 예: https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm

--oidc-client-id:
  - Keycloak 에 등록된 클라이언트 ID
  - 예: kubernetes-client

--oidc-username-claim:
  - ID Token 에서 사용자 이름으로 사용할 클레임
  - preferred_username: Keycloak 의 선호 사용자명
  - email: 이메일 주소
  - sub: 고유 식별자
  - 예: preferred_username

--oidc-username-prefix:
  - 사용자 이름 접두사
  - "-": 접두사 없음 (권장)
  - "oidc:": oidc: 접두사 추가
  - 예: - (접두사 없음)

--oidc-groups-claim:
  - ID Token 에서 그룹 정보로 사용할 클레임
  - 예: groups

--oidc-ca-file:
  - Keycloak 인증서 검증용 CA 파일
  - 자체 서명 인증서 사용 시 필요
  - 예: /etc/kubernetes/pki/keycloak/keycloak.crt
```

---

## 3 단계: API Server 재시작 확인

### Static Pod 자동 재시작

```bash
# kube-apiserver.yaml 저장 후 kubelet 이 자동 감지
# API Server Pod 가 자동으로 재시작됨

# Pod 상태 확인
kubectl get pods -n kube-system -l component=kube-apiserver

# 출력 예시:
# NAME                   READY   STATUS    RESTARTS   AGE
# kube-apiserver-k8s-cp  1/1     Running   1          1m
#                        ↑
#                        RESTARTS 가 1 로 증가 (재시작됨)
```

### API Server 로그 확인

```bash
# API Server 로그에서 OIDC 설정 확인
kubectl logs -n kube-system -l component=kube-apiserver | grep -i oidc

# 출력 예시:
# I0101 00:00:00.000000       1 oidc.go:100] OIDC: Initializing...
# I0101 00:00:00.000000       1 oidc.go:150] OIDC: Issuer URL: https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm
# I0101 00:00:00.000000       1 oidc.go:200] OIDC: Client ID: kubernetes-client
# I0101 00:00:00.000000       1 oidc.go:250] OIDC: Username claim: preferred_username
# I0101 00:00:00.000000       1 oidc.go:300] OIDC: Groups claim: groups
# I0101 00:00:00.000000       1 oidc.go:350] OIDC: Successfully initialized
```

### kubectl 명령으로 정상 동작 확인

```bash
# 기존 관리자 인증서로 API Server 접속 확인
kubectl get pods -n kube-system

# 출력 예시:
# NAME                            READY   STATUS    RESTARTS   AGE
# kube-apiserver-k8s-cp           1/1     Running   1          2m
# kube-controller-manager-k8s-cp  1/1     Running   0          10d
# kube-scheduler-k8s-cp           1/1     Running   0          10d
# ...

# 성공 시: API Server 정상 동작
# 실패 시: 로그 확인 및 설정 검토
```

---

## 4 단계: Keycloak 클라이언트 설정

### Keycloak Client 생성

```
┌─────────────────────────────────────────────────────────────┐
│          Keycloak Client 설정                               │
└─────────────────────────────────────────────────────────────┘

1. Keycloak Admin Console 로그인
   - URL: https://keycloak-172-31-1-200.nip.io/admin
   - 관리자 계정으로 로그인

2. Clients 메뉴 → Create client

3. Client 설정:
   - Client ID: kubernetes-client
   - Client type: OpenID Connect
   - Capability config:
     ✓ Client authentication: ON
     ✓ Authorization: ON (선택)

4. Login settings:
   - Valid redirect URIs: 
     * https://keycloak-172-31-1-200.nip.io/*
   - Valid post logout redirect URIs:
     * https://keycloak-172-31-1-200.nip.io/*
   - Web origins:
     * +

5. Client authentication 설정:
   - Authentication flow: Standard flow
   - Direct access grants: ON (kubectl 용)
   - Service accounts roles: OFF

6. Credentials 탭:
   - Client Authenticator: Client Id and Secret
   - Secret: <비밀번호 기록>
   - (이 Secret 은 kubectl 설정에 사용)
```

### Role 매핑 설정

```
┌─────────────────────────────────────────────────────────────┐
│          Keycloak Role 매핑                                 │
└─────────────────────────────────────────────────────────────┘

1. Realm roles 생성:
   - kubernetes-admin
   - kubernetes-developer
   - kubernetes-viewer

2. User 에 role 할당:
   - 사용자 선택 → Role mapping → Assign role
   - 적절한 role 선택 (예: kubernetes-developer)

3. ID Token 에 groups 포함 설정:
   - Client scopes → groups → Mappers 추가
   - Name: groups
   - Mapper type: User Realm Role
   - Token claim name: groups
   - Claim JSON Type: String
   - Multivalued: ON
   - Add to ID token: ON
   - Add to access token: ON
```

---

## 5 단계: RBAC 설정 (Keycloak 그룹 연동)

### ClusterRole 생성

```yaml
# 관리자 역할
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubernetes-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
EOF

# 개발자 역할
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubernetes-developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
EOF

# 뷰어 역할
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubernetes-viewer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
EOF
```

### ClusterRoleBinding 생성 (Keycloak 그룹 연동)

```yaml
# 관리자 그룹 바인딩
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-kubernetes-admin
subjects:
- kind: Group
  name: kubernetes-admin  # Keycloak 그룹 이름
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: kubernetes-admin
  apiGroup: rbac.authorization.k8s.io
EOF

# 개발자 그룹 바인딩
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-kubernetes-developer
subjects:
- kind: Group
  name: kubernetes-developer  # Keycloak 그룹 이름
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: kubernetes-developer
  apiGroup: rbac.authorization.k8s.io
EOF

# 뷰어 그룹 바인딩
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-kubernetes-viewer
subjects:
- kind: Group
  name: kubernetes-viewer  # Keycloak 그룹 이름
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: kubernetes-viewer
  apiGroup: rbac.authorization.k8s.io
EOF
```

---

## 6 단계: kubectl OIDC 설정

### kubectl 설정 (Keycloak 토큰 사용)

```bash
# 1. Keycloak 에서 토큰 획득
# (Keycloak Admin Console 또는 API 사용)

TOKEN=$(curl -X POST \
  "https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=kubernetes-client" \
  -d "client_secret=<client-secret>" \
  -d "username=honggildong" \
  -d "password=<password>" \
  -d "grant_type=password" | jq -r '.id_token')

# 2. kubectl 에 사용자 설정
kubectl config set-credentials honggildong-oidc \
  --auth-provider=oidc \
  --auth-provider-arg=idp-issuer-url=https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm \
  --auth-provider-arg=client-id=kubernetes-client \
  --auth-provider-arg=client-secret=<client-secret> \
  --auth-provider-arg=id-token=$TOKEN \
  --auth-provider-arg=refresh-token=<refresh-token>

# 3. 컨텍스트 설정
kubectl config set-context honggildong-oidc-context \
  --cluster=kubernetes \
  --user=honggildong-oidc

# 4. 컨텍스트 전환
kubectl config use-context honggildong-oidc-context

# 5. API Server 접속 테스트
kubectl get pods

# 6. 사용자 정보 확인
kubectl auth whoami
```

### OIDC 토큰 검증

```bash
# ID Token 디코딩 (jwt.io 또는 명령어)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq

# 출력 예시:
{
  "iss": "https://keycloak-172-31-1-200.nip.io/auth/realms/edu-realm",
  "sub": "12345678-1234-1234-1234-123456789012",
  "aud": "kubernetes-client",
  "exp": 1640000000,
  "iat": 1639996400,
  "preferred_username": "honggildong",
  "email": "honggildong@example.com",
  "groups": [
    "kubernetes-developer",
    "offline_access"
  ]
}

# 확인 사항:
# ✓ preferred_username: honggildong (사용자 이름)
# ✓ groups: kubernetes-developer (RBAC 그룹과 일치)
# ✓ aud: kubernetes-client (Client ID 와 일치)
# ✓ iss: Keycloak Realm URL
```

---

## 7 단계: 테스트 및 검증

### OIDC 인증 테스트

```bash
# 1. 관리자 권한 테스트
kubectl config use-context honggildong-oidc-context

# 2. 파드 조회 (권한 있음)
kubectl get pods -n default
# 성공 예상

# 3. 파드 생성 (권한 있음)
kubectl run nginx --image=nginx:1.25
# 성공 예상

# 4. 네임스페이스 생성 (권한 없음 - 개발자)
kubectl create namespace test
# 실패 예상: Forbidden

# 5. 사용자 정보 확인
kubectl auth whoami
# 출력:
# ATTRIBUTES                                                                  VALUE
# Name:                         honggildong
# Groups:                         kubernetes-developer, system:authenticated
```

### API Server 로그 확인

```bash
# OIDC 인증 로그 확인
kubectl logs -n kube-system -l component=kube-apiserver | grep -i "oidc\|authentication"

# 출력 예시:
# I0101 00:00:00.000000       1 oidc.go:400] OIDC: Token validated successfully
# I0101 00:00:00.000000       1 oidc.go:450] OIDC: User: honggildong, Groups: [kubernetes-developer]
# I0101 00:00:00.000000       1 authentication.go:100] Successfully authenticated user: honggildong
```

---

## 문제 해결

### 일반적인 오류

```
┌─────────────────────────────────────────────────────────────┐
│          일반적인 오류 및 해결                              │
└─────────────────────────────────────────────────────────────┘

오류 1: "x509: certificate signed by unknown authority"
해결:
  - --oidc-ca-file 옵션 확인
  - Keycloak 인증서 파일 경로 확인
  - 인증서 파일 권한 확인 (chmod 644)

오류 2: "oidc: failed to verify id token signature"
해결:
  - Keycloak 의 공개키 확인
  - --oidc-issuer-url 정확히 설정
  - Keycloak 과 API Server 시간 동기화 확인

오류 3: "forbidden: User \"honggildong\" cannot..."
해결:
  - RBAC 설정 확인 (ClusterRoleBinding)
  - Keycloak groups claim 설정 확인
  - ID Token 에 groups 클레임 포함 확인

오류 4: API Server 가 시작되지 않음
해결:
  - 백업 파일로 복구: cp kube-apiserver.yaml.backup.* kube-apiserver.yaml
  - 로그 확인: journalctl -u kubelet -f
  - OIDC 설정 주석 처리하고 단계별 확인
```

### 설정 검증 스크립트

```bash
#!/bin/bash
# verify-oidc.sh

echo "=== OIDC 설정 검증 ==="

# 1. API Server 설정 확인
echo "1. API Server OIDC 설정 확인"
grep -i "oidc" /etc/kubernetes/manifests/kube-apiserver.yaml

# 2. API Server Pod 상태 확인
echo -e "\n2. API Server Pod 상태"
kubectl get pods -n kube-system -l component=kube-apiserver

# 3. Keycloak 인증서 확인
echo -e "\n3. Keycloak 인증서 확인"
openssl x509 -in /etc/kubernetes/pki/keycloak/keycloak.crt -noout -subject -issuer

# 4. OIDC 로그 확인
echo -e "\n4. OIDC 관련 로그"
kubectl logs -n kube-system -l component=kube-apiserver | grep -i oidc | tail -10

echo -e "\n=== 검증 완료 ==="
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. API Server 설정                                         │
│     - /etc/kubernetes/manifests/kube-apiserver.yaml 수정   │
│     - Static Pod 이므로 저장 시 자동 재시작                │
│     - OIDC 설정 6 개 옵션 추가                              │
│                                                             │
│  2. OIDC 설정 옵션                                          │
│     - --oidc-issuer-url: Keycloak Realm URL                │
│     - --oidc-client-id: kubernetes-client                  │
│     - --oidc-username-claim: preferred_username            │
│     - --oidc-username-prefix: - (없음)                     │
│     - --oidc-groups-claim: groups                          │
│     - --oidc-ca-file: Keycloak CA 인증서                   │
│                                                             │
│  3. Keycloak 설정                                           │
│     - Client 생성 (kubernetes-client)                      │
│     - Role 매핑 (kubernetes-admin/developer/viewer)        │
│     - ID Token 에 groups 클레임 포함                       │
│                                                             │
│  4. RBAC 설정                                               │
│     - ClusterRole: 권한 정의                               │
│     - ClusterRoleBinding: Keycloak 그룹과 연동             │
│                                                             │
│  5. kubectl 설정                                            │
│     - OIDC 토큰으로 사용자 설정                            │
│     - 컨텍스트 전환                                        │
│     - API Server 접속 테스트                               │
│                                                             │
│  6. 검증                                                    │
│     - kubectl get pods (정상 동작 확인)                    │
│     - kubectl auth whoami (사용자 정보 확인)               │
│     - API Server 로그 (OIDC 초기화 확인)                   │
└─────────────────────────────────────────────────────────────┘
```

### 설정 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          OIDC 설정 체크리스트                               │
└─────────────────────────────────────────────────────────────┘

□ Keycloak Realm 생성 (edu-realm)
□ Keycloak Client 생성 (kubernetes-client)
□ Keycloak CA 인증서 추출 (/etc/kubernetes/pki/keycloak/keycloak.crt)
□ API Server 설정 백업
□ API Server OIDC 설정 추가 (6 개 옵션)
□ volumeMounts 에 keycloak-certs 추가
□ volumes 에 keycloak-certs 추가
□ API Server 재시작 확인 (kubectl get pods -n kube-system)
□ API Server 로그 확인 (OIDC 초기화 메시지)
□ kubectl 명령으로 정상 동작 확인
□ Keycloak Role 매핑 설정
□ Kubernetes RBAC 설정 (ClusterRole/Binding)
□ kubectl OIDC 설정
□ 인증 테스트 (권한 있는 작업/없는 작업)
```

**Keycloak OIDC 를 API Server 에 설정하면 중앙 집중식 사용자 관리와 강력한 인증 기능을 Kubernetes 에 통합할 수 있습니다. Static Pod 설정 파일 수정 후 저장하면 자동으로 재시작되어 적용됩니다.**
