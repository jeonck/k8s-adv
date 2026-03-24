# Kubernetes API Server 인증서 접속 방식

Kubernetes API Server 에 안전하게 접속하기 위한 인증서 기반 인증 방식을 설명합니다.

## API Server 인증 개요

```
클라이언트 → API Server 접속 시:
1. 인증 (Authentication) - 누구인가?
2. 인가 (Authorization) - 무엇을 할 수 있는가?
3. 어드미션 컨트롤 (Admission Control) - 추가 검증
```

### 인증 방식 종류

| 방식 | 설명 | 사용 사례 |
|------|------|-----------|
| **클라이언트 인증서** | X.509 인증서 기반 | kubectl, 컴포넌트 간 통신 |
| **토큰 (ServiceAccount)** | JWT 토큰 기반 | Pod 내부에서 API 접근 |
| **Basic Auth** | 사용자/비밀번호 | 레거시 (권장 안 함) |
| **Bearer Token** | 정적 토큰 | CI/CD, 자동화 |

---

## 클라이언트 인증서 인증

### 동작 원리

```
┌─────────────────────────────────────────────────────────────┐
│              인증서 기반 인증 흐름                          │
└─────────────────────────────────────────────────────────────┘

1. 클라이언트 인증서 생성
   ┌─────────────────┐
   │  CA 인증서      │
   │  (root CA)      │
   └────────┬────────┘
            │ 서명
            ▼
   ┌─────────────────┐
   │  클라이언트     │
   │  인증서         │
   └────────┬────────┘
            │
2. API Server 접속
            ▼
   ┌─────────────────┐
   │  API Server     │
   │  (6443 포트)    │
   └────────┬────────┘
            │ TLS 핸드셰이크
            ▼
3. 인증서 검증
   - CA 인증서로 서명 확인
   - 유효기간 확인
   - CN/O 에서 사용자/그룹 추출
            ▼
4. 인증 성공/실패
```

### 인증서 구조

```yaml
# 클라이언트 인증서 필드
Subject:
  CN: admin              # Common Name (사용자명)
  O: system:masters      # Organization (그룹)
  
Issuer:
  CN: kubernetes-ca      # 발급 CA
  
Validity:
  Not Before: 2024-01-01
  Not After: 2025-01-01  # 유효기간 (1 년)
  
Public Key:
  Algorithm: RSA
  Size: 2048 bit
  
Signature:
  Algorithm: SHA256withRSA
```

### CN 과 O 의 역할

```yaml
# CN (Common Name)
CN: admin
→ 사용자 이름으로 인식됨
→ Kubernetes 사용자: admin

# O (Organization)
O: system:masters
→ 그룹 membership
→ system:masters 그룹은 클러스터 관리자 권한

# 여러 그룹 지정 가능
O: system:masters
O: developers
→ 사용자는 두 그룹 모두 소속
```

---

## 인증서 생성 방법

### 1. CA 인증서 확인

```bash
# 마스터 노드에서 CA 인증서 확인
ls -la /etc/kubernetes/pki/
# 총 44K
# drwxr-xr-x 2 root root 4096 Jan  1 00:00 .
# -rw-r--r-- 1 root root 1139 Jan  1 00:00 ca.crt
# -rw----- 1 root root 1675 Jan  1 00:00 ca.key
# -rw-r--r-- 1 root root 1151 Jan  1 00:00 apiserver.crt
# -rw----- 1 root root 1675 Jan  1 00:00 apiserver.key
```

### 2. 클라이언트 인증서 생성 (OpenSSL)

```bash
# 1 단계: 개인키 생성
openssl genrsa -out admin.key 2048

# 2 단계: CSR (Certificate Signing Request) 생성
openssl req -new -key admin.key -out admin.csr \
  -subj "/CN=admin/O=system:masters"

# 3 단계: CA 로 인증서 서명
openssl x509 -req -in admin.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out admin.crt \
  -days 365 \
  -sha256

# 인증서 확인
openssl x509 -in admin.crt -text -noout
```

### 3. kubeadm 을 사용한 생성

```bash
# kubeadm certs 명령으로 확인
kubeadm certs check-expiration

# 만료된 인증서 갱신
kubeadm certs renew admin.conf
kubeadm certs renew apiserver
kubeadm certs renew controller-manager
kubeadm certs renew scheduler
kubeadm certs renew etcd-server
kubeadm certs renew front-proxy-client
kubeadm certs renew apiserver-kubelet-client
```

---

## kubeconfig 파일

### kubeconfig 구조

```yaml
apiVersion: v1
kind: Config

# 클러스터 정보
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    server: https://192.168.1.10:6443
  name: kubernetes-admin

# 컨텍스트 (클러스터 + 사용자 + 네임스페이스)
contexts:
- context:
    cluster: kubernetes-admin
    user: kubernetes-admin
    namespace: default
  name: kubernetes-admin@kubernetes

# 현재 사용 컨텍스트
current-context: kubernetes-admin@kubernetes

# 사용자 정보
users:
- name: kubernetes-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ...
```

### kubeconfig 파일 위치

| 위치 | 설명 |
|------|------|
| `~/.kube/config` | 기본 kubeconfig 파일 |
| `$KUBECONFIG` | 환경 변수로 지정 |
| `--kubeconfig` | kubectl 명령어 옵션 |

### kubeconfig 생성

```bash
# CA 인증서 복사
cp /etc/kubernetes/pki/ca.crt ~/.kube/ca.crt

# kubeconfig 생성
kubectl config set-cluster kubernetes \
  --certificate-authority=~/.kube/ca.crt \
  --embed-certs=true \
  --server=https://192.168.1.10:6443

kubectl config set-credentials admin \
  --client-certificate=~/.kube/admin.crt \
  --client-key=~/.kube/admin.key \
  --embed-certs=true

kubectl config set-context default \
  --cluster=kubernetes \
  --user=admin \
  --namespace=default

kubectl config use-context default
```

---

## kubectl 인증서 기반 접속

### 접속 테스트

```bash
# kubeconfig 사용
kubectl get pods --kubeconfig=~/.kube/config

# 환경 변수 사용
export KUBECONFIG=~/.kube/config
kubectl get pods

# 인증서 직접 지정
kubectl get pods \
  --server=https://192.168.1.10:6443 \
  --certificate-authority=/etc/kubernetes/pki/ca.crt \
  --client-certificate=/home/user/.kube/admin.crt \
  --client-key=/home/user/.kube/admin.key
```

### 인증서 기반 접속 흐름

```
kubectl get pods
    │
    ├─ 1. kubeconfig 파일 읽기
    │   └─ 클러스터, 사용자, 컨텍스트 정보 추출
    │
    ├─ 2. TLS 연결 시작
    │   └─ server: https://192.168.1.10:6443
    │
    ├─ 3. 서버 인증서 검증
    │   ├─ certificate-authority 로 서명 확인
    │   └─ 유효기간 확인
    │
    ├─ 4. 클라이언트 인증서 전송
    │   ├─ client-certificate
    │   └─ client-key (서명용)
    │
    ├─ 5. API Server 인증
    │   ├─ CA 로 클라이언트 인증서 검증
    │   ├─ CN 에서 사용자명 추출 (admin)
    │   └─ O 에서 그룹 추출 (system:masters)
    │
    ├─ 6. RBAC 인가 확인
    │   └─ system:masters → cluster-admin 권한
    │
    └─ 7. 요청 처리 및 응답
        └─ Pod 목록 반환
```

---

## 컴포넌트 간 인증서 통신

### Kubernetes 컴포넌트 인증서

```
┌─────────────────────────────────────────────────────────────┐
│              컴포넌트 간 인증서 통신                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐     인증서     ┌─────────────┐
│  kubectl    │──────────────▶│  API Server │
│  (admin)    │◀──────────────│  (6443)     │
└─────────────┘     인증서     └──────┬──────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              인증서│           인증서│           인증서│
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │kube-controller│ │ kube-scheduler│ │    etcd       │
            │   -manager    │ │               │ │               │
            └───────────────┘ └───────────────┘ └───────────────┘
                    │                 │                 │
                    │                 │                 │
              인증서│           인증서│           인증서│
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │  API Server   │ │  API Server   │ │  API Server   │
            └───────────────┘ └───────────────┘ └───────────────┘
                                      │
                                인증서│
                                      ▼
                              ┌───────────────┐
                              │  kubelet      │
                              │  (각 노드)    │
                              └───────────────┘
```

### 주요 컴포넌트 인증서

| 컴포넌트 | 인증서 파일 | 용도 |
|----------|-------------|------|
| **API Server** | apiserver.crt | 서버 인증 (TLS) |
| **kubelet** | kubelet-client.crt | kubelet → API Server |
| **controller-manager** | system:kube-controller-manager.crt | controller-manager → API Server |
| **scheduler** | system:kube-scheduler.crt | scheduler → API Server |
| **etcd** | etcd/server.crt | etcd 서버 인증 |
| **etcd peer** | etcd/peer.crt | etcd 피어 간 통신 |
| **front-proxy** | front-proxy-client.crt | 애그리게이션 레이어 |

### kubelet 인증서

```bash
# kubelet kubeconfig 확인
cat /var/lib/kubelet/kubeconfig

# 출력 예시
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0t...
    server: https://192.168.1.10:6443
  name: default-cluster
contexts:
- context:
    cluster: default-cluster
    namespace: default
    user: default-auth
  name: default-context
current-context: default-context
users:
- name: default-auth
  user:
    client-certificate: /var/lib/kubelet/pki/kubelet-client-current.pem
    client-key: /var/lib/kubelet/pki/kubelet-client-current.pem
```

### kubelet 인증서 자동 회전

```yaml
# kubelet 설정 (--feature-gates)
--feature-gates=RotateKubeletServerCertificate=true

# kubelet 은 자동으로 인증서 갱신
# - 만료 10 일 전에 갱신 시작
# - CSR 생성 → API Server 승인 → 새 인증서 받음
```

---

## RBAC 과 인증서

### 인증서 → 사용자 → RBAC

```
인증서 CN/O
    │
    ▼
Kubernetes 사용자/그룹
    │
    ▼
ClusterRoleBinding / RoleBinding
    │
    ▼
ClusterRole / Role
    │
    ▼
권한 (verbs + resources)
```

### 예시: admin 사용자

```yaml
# 인증서
CN: admin
O: system:masters

# system:masters 그룹은 cluster-admin 역할에 바인딩됨
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:masters

# cluster-admin 은 모든 권한 가짐
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
- nonResourceURLs: ["*"]
  verbs: ["*"]
```

### 예시: 개발자 사용자

```bash
# 개발자 인증서 생성
openssl req -new -key developer.key -out developer.csr \
  -subj "/CN=developer/O=developers"

openssl x509 -req -in developer.csr \
  -CA ca.crt -CAkey ca.key \
  -out developer.crt -days 365
```

```yaml
# 개발자 권한 부여 (네임스페이스 제한)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: development
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: developers  # ← 인증서의 O 와 일치
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: developer-role
```

---

## 인증서 보안 모범 사례

### 1. 인증서 유효기간 관리

```bash
# 인증서 만료일 확인
openssl x509 -in admin.crt -noout -dates
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2025 GMT

# kubeadm 클러스터에서 만료일 확인
kubeadm certs check-expiration

# 권장 유효기간
# - 클라이언트 인증서: 1 년
# - 서버 인증서: 1 년
# - CA 인증서: 10 년
```

### 2. 개인키 보호

```bash
# 개인키 권한 설정
chmod 600 admin.key
chown root:root admin.key

# 절대 공유하지 않음
# .git 에 커밋하지 않음
# 암호화하여 보관
```

### 3. CA 인증서 보안

```bash
# CA 개인키는 오프라인 보관 권장
# - USB 에 저장하여 금고 보관
# - HSM(Hardware Security Module) 사용
# - 접근 로그 기록

# CA 키로 서명할 때만 일시적으로 연결
```

### 4. 인증서 폐기

```bash
# 인증서 폐기 필요 상황:
# - 개인키 유출
# - 사용자 권한 박탈
# - 만료 전 교체

# CSR 기반 인증서는 API Server 에서 폐기 가능
kubectl delete csr <csr-name>

# 수동 발급 인증서는 CRL(인증서 폐기 목록) 필요
```

### 5. 감사 로깅

```yaml
# API Server 감사 설정
--audit-log-path=/var/log/kubernetes/audit.log
--audit-log-maxage=30
--audit-log-maxbackup=10
--audit-log-maxsize=100

# 인증서 기반 접속은 모두 로그에 기록됨
# - 사용자 (CN)
# - 그룹 (O)
# - 수행한 작업
```

---

## 문제 해결

### 인증서 만료

```bash
# 증상
kubectl get pods
# Unable to connect to the server: x509: certificate has expired or is not yet valid

# 해결: kubeadm 인증서 갱신
kubeadm certs renew apiserver
kubeadm certs renew apiserver-kubelet-client
kubeadm certs renew controller-manager
kubeadm certs renew scheduler
kubeadm certs renew etcd-server
kubeadm certs renew front-proxy-client

# 관련 Pod 재시작
kubectl -n kube-system delete pod -l component=kube-apiserver
kubectl -n kube-system delete pod -l component=kube-controller-manager
kubectl -n kube-system delete pod -l component=kube-scheduler
```

### CN/O 불일치

```bash
# 증상
kubectl get pods
# Error from server (Forbidden): pods is forbidden

# 인증서 정보 확인
openssl x509 -in admin.crt -noout -subject
# subject=CN = developer, O = developers

# RBAC 확인
kubectl get clusterrolebinding -o yaml | grep -A5 developers
```

### CA 불일치

```bash
# 증상
kubectl get pods
# Unable to connect to the server: x509: certificate signed by unknown authority

# 원인: kubeconfig 의 CA 와 API Server 의 CA 가 다름

# 해결: kubeconfig 재생성
kubeadm kubeconfig user --client-name=admin > admin.conf
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│              API Server 인증서 접속 요약                    │
├─────────────────────────────────────────────────────────────┤
│  1. 인증서 기반 인증은 가장 안전한 방식                     │
│     - X.509 인증서 사용                                     │
│     - TLS 암호화 통신                                       │
│                                                             │
│  2. CN 은 사용자명, O 는 그룹                               │
│     - CN: admin → 사용자 admin                              │
│     - O: system:masters → 관리자 그룹                       │
│                                                             │
│  3. kubeconfig 에 인증서 정보 저장                          │
│     - cluster: 서버 URL, CA 인증서                          │
│     - user: 클라이언트 인증서, 개인키                       │
│     - context: 클러스터 + 사용자 + 네임스페이스             │
│                                                             │
│  4. 모든 컴포넌트 간 통신은 인증서로 보호                   │
│     - API Server ↔ kubelet                                  │
│     - API Server ↔ controller-manager                       │
│     - API Server ↔ scheduler                                │
│     - API Server ↔ etcd                                     │
│                                                             │
│  5. 보안 모범 사례 준수                                     │
│     - 정기적 만료일 확인                                    │
│     - 개인키 엄격 보호                                      │
│     - CA 키 오프라인 보관                                   │
│     - 감사 로그 활성화                                      │
└─────────────────────────────────────────────────────────────┘
```

**인증서 기반 인증은 Kubernetes 보안의 핵심입니다. 올바른 이해와 관리가 필수적입니다.**
