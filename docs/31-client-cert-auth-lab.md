# Kubernetes Client Certificate 인증 실습

일반 사용자 (honggildong) 에게 자신만의 네임스페이스에서만 애플리케이션을 배포하고 테스트할 수 있도록 환경을 구축합니다.

---

## 실습 개요

```
┌─────────────────────────────────────────────────────────────┐
│          Client Certificate 인증 실습                       │
└─────────────────────────────────────────────────────────────┘

목표:
  - 일반 사용자 honggildong 생성
  - honggildong 전용 네임스페이스 생성
  - 해당 네임스페이스에서만 작업 가능하도록 권한 제한
  - 다른 네임스페이스 접근 시 거부

사용 기술:
  - X.509 클라이언트 인증서
  - RBAC (Role-Based Access Control)
  - Namespace 격리
```

---

## 실습 환경

```
┌─────────────────────────────────────────────────────────────┐
│          실습 환경                                          │
└─────────────────────────────────────────────────────────────┘

마스터 노드: k8s-cp (172.31.1.10)
워커 노드: k8s-w1, k8s-w2

사용자:
  - admin: 클러스터 관리자 (기존)
  - honggildong: 일반 사용자 (신규 생성)

네임스페이스:
  - default: 기본 네임스페이스
  - kube-system: 시스템 네임스페이스
  - honggildong: honggildong 전용 네임스페이스 (신규 생성)
```

---

## 1 단계: CA 인증서 확인

### Root CA 인증서 위치 확인

```bash
# 마스터 노드 (k8s-cp) 에서 실행
[root@k8s-cp ~]# ls -la /etc/kubernetes/pki/ca.*

# 출력:
-rw-r--r-- 1 root root 1139 Jan  1 00:00 /etc/kubernetes/pki/ca.crt
-rw----- 1 root root 1675 Jan  1 00:00 /etc/kubernetes/pki/ca.key
```

### CA 인증서 유효기간 확인

```bash
# CA 인증서 만료일 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -noout -dates

# 출력:
notBefore=Jan  1 00:00:00 2024 GMT
notAfter=Jan  1 00:00:00 2034 GMT
# 10 년 유효
```

---

## 2 단계: honggildong 개인키 생성

### 개인키 생성

```bash
# 작업 디렉토리 생성
[root@k8s-cp ~]# mkdir -p ~/users/honggildong
[root@k8s-cp ~]# cd ~/users/honggildong

# 개인키 생성 (RSA 2048 비트)
[root@k8s-cp honggildong]# openssl genrsa \
  -out honggildong.key \
  2048

# 생성 확인
[root@k8s-cp honggildong]# ls -la honggildong.key
-rw------- 1 root root 1675 Jan  1 00:00 honggildong.key

# 개인키 권한 설정 (중요!)
[root@k8s-cp honggildong]# chmod 600 honggildong.key
```

---

## 3 단계: CSR (Certificate Signing Request) 생성

### CSR 생성

```bash
# CSR 생성
# CN: 사용자 이름, O: 그룹 (선택)
[root@k8s-cp honggildong]# openssl req \
  -new \
  -key honggildong.key \
  -out honggildong.csr \
  -subj "/CN=honggildong/O=honggildong-group"

# CSR 내용 확인
[root@k8s-cp honggildong]# openssl req \
  -in honggildong.csr \
  -text -noout | head -20

# 출력:
Certificate Request:
    Data:
        Version: 1 (0x0)
        Subject: CN = honggildong, O = honggildong-group
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
```

### CSR 필드 설명

```
┌─────────────────────────────────────────────────────────────┐
│          CSR Subject 필드 설명                              │
└─────────────────────────────────────────────────────────────┘

CN (Common Name):
  - 사용자 이름
  - Kubernetes 에서 사용자 식별자로 사용
  - 예: CN=honggildong → 사용자: honggildong

O (Organization):
  - 그룹 이름
  - Kubernetes 에서 그룹으로 인식
  - 예: O=honggildong-group → 그룹: honggildong-group
  - RBAC 에서 그룹 기반 권한 부여에 사용

OU (Organizational Unit): 선택
L (Locality): 선택
ST (State): 선택
C (Country): 선택
```

---

## 4 단계: CA 가 CSR 서명 (인증서 발급)

### CA 로 인증서 서명

```bash
# CA 개인키로 CSR 서명 (인증서 발급)
# 유효기간: 365 일 (1 년)
[root@k8s-cp honggildong]# openssl x509 \
  -req \
  -in honggildong.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out honggildong.crt \
  -days 365 \
  -sha256

# 출력:
Signature ok
subject=CN = honggildong, O = honggildong-group
Getting CA Private Key
```

### 발급된 인증서 확인

```bash
# 인증서 상세 정보 확인
[root@k8s-cp honggildong]# openssl x509 \
  -in honggildong.crt \
  -text -noout | head -30

# 출력:
Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number: 03:ab:cd:ef:12:34:56:78
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes-ca
                  ↑
                  └─ Kubernetes Root CA 가 서명!
        Validity:
            Not Before: Jan  1 00:00:00 2024 GMT
            Not After:  Jan  1 00:00:00 2025 GMT
                  ↑
                  └─ 1 년 유효기간
        Subject: CN = honggildong, O = honggildong-group
                  ↑
                  └─ 사용자 정보
```

### 생성된 파일 목록

```bash
# honggildong 디렉토리 확인
[root@k8s-cp honggildong]# ls -la

# 출력:
총 20K
-rw-r--r-- 1 root root 1155 Jan  1 00:00 honggildong.crt  # 인증서
-rw-r--r-- 1 root root  989 Jan  1 00:00 honggildong.csr  # CSR
-rw------- 1 root root 1675 Jan  1 00:00 honggildong.key  # 개인키
```

---

## 5 단계: kubeconfig 파일 생성

### 클러스터 정보 설정

```bash
# kubeconfig 파일 생성
# 클러스터 정보 설정 (CA 인증서, API Server 엔드포인트)
[root@k8s-cp honggildong]# kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/ca.crt \
  --embed-certs=true \
  --server=https://172.31.1.10:6443 \
  --kubeconfig=honggildong.conf

# 출력:
Cluster "kubernetes" set.
```

### 사용자 정보 설정

```bash
# 사용자 정보 설정 (클라이언트 인증서, 개인키)
[root@k8s-cp honggildong]# kubectl config set-credentials honggildong \
  --client-certificate=/root/users/honggildong/honggildong.crt \
  --client-key=/root/users/honggildong/honggildong.key \
  --embed-certs=true \
  --kubeconfig=honggildong.conf

# 출력:
User "honggildong" set.
```

### 컨텍스트 설정

```bash
# 컨텍스트 설정 (클러스터 + 사용자 + 네임스페이스)
# 처음에는 default 네임스페이스로 설정
[root@k8s-cp honggildong]# kubectl config set-context honggildong-context \
  --cluster=kubernetes \
  --user=honggildong \
  --namespace=default \
  --kubeconfig=honggildong.conf

# 출력:
Context "honggildong-context" created.
```

### kubeconfig 파일 확인

```bash
# kubeconfig 파일 내용 확인
[root@k8s-cp honggildong]# cat honggildong.conf

# 출력 (요약):
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: LS0tLS1...
    server: https://172.31.1.10:6443
  name: kubernetes
users:
- name: honggildong
  user:
    client-certificate-data: LS0tLS1...
    client-key-data: LS0tLS1...
contexts:
- context:
    cluster: kubernetes
    user: honggildong
    namespace: default
  name: honggildong-context
current-context: honggildong-context
```

---

## 6 단계: honggildong 전용 네임스페이스 생성

### 네임스페이스 생성

```bash
# 관리자 권한으로 honggildong 전용 네임스페이스 생성
[root@k8s-cp ~]# kubectl create namespace honggildong

# 출력:
namespace/honggildong created

# 네임스페이스 확인
[root@k8s-cp ~]# kubectl get namespaces

# 출력:
NAME              STATUS   AGE
default           Active   10d
kube-system       Active   10d
kube-public       Active   10d
kube-node-lease   Active   10d
honggildong       Active   10s  ← 새로 생성됨
```

### honggildong kubeconfig 에 네임스페이스 업데이트

```bash
# honggildong 의 기본 네임스페이스를 honggildong 으로 변경
[root@k8s-cp honggildong]# kubectl config set-context honggildong-context \
  --cluster=kubernetes \
  --user=honggildong \
  --namespace=honggildong \
  --kubeconfig=honggildong.conf

# 출력:
Context "honggildong-context" modified.

# kubeconfig 확인
[root@k8s-cp honggildong]# kubectl config view \
  --kubeconfig=honggildong.conf \
  --minify

# 출력:
contexts:
- context:
    cluster: kubernetes
    namespace: honggildong  ← 변경됨
    user: honggildong
  name: honggildong-context
current-context: honggildong-context
```

---

## 7 단계: Role 생성 (네임스페이스 내 권한)

### Role YAML 파일 생성

```bash
# honggildong 의 Role 생성
# honggildong 네임스페이스 내에서 Pod, Deployment, Service 관리 권한
cat <<EOF > /root/honggildong-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: honggildong
  name: honggildong-admin
rules:
# Pod 관리 권한
- apiGroups: [""]
  resources: ["pods", "pods/log", "pods/exec"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Deployment 관리 권한
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Service 관리 권한
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# ConfigMap, Secret 관리 권한
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Job 관리 권한
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
EOF
```

### Role 적용

```bash
# Role 생성
[root@k8s-cp ~]# kubectl apply -f /root/honggildong-role.yaml

# 출력:
role.rbac.authorization.k8s.io/honggildong-admin created

# Role 확인
[root@k8s-cp ~]# kubectl get role -n honggildong

# 출력:
NAME               CREATED AT
honggildong-admin  2024-01-01T00:00:00Z

# Role 상세 내용 확인
[root@k8s-cp ~]# kubectl get role honggildong-admin -n honggildong -o yaml
```

### Role 권한 설명

```
┌─────────────────────────────────────────────────────────────┐
│          honggildong-admin Role 권한                        │
└─────────────────────────────────────────────────────────────┘

허용된 리소스:
  ✓ pods, pods/log, pods/exec
  ✓ deployments, replicasets
  ✓ services, endpoints
  ✓ configmaps, secrets
  ✓ jobs, cronjobs

허용된 동작 (verbs):
  ✓ get: 리소스 조회
  ✓ list: 리소스 목록 조회
  ✓ watch: 리소스 변경 감시
  ✓ create: 리소스 생성
  ✓ update: 리소스 업데이트
  ✓ patch: 리소스 부분 수정
  ✓ delete: 리소스 삭제

제한된 리소스:
  ✗ nodes (클러스터 리소스)
  ✗ namespaces (클러스터 리소스)
  ✗ persistentvolumes (클러스터 리소스)
  ✗ clusterroles (클러스터 권한)
  ✗ 다른 네임스페이스의 리소스
```

---

## 8 단계: RoleBinding 생성 (사용자 연결)

### RoleBinding YAML 파일 생성

```bash
# honggildong 사용자를 Role 에 바인딩
cat <<EOF > /root/honggildong-rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: honggildong-admin-binding
  namespace: honggildong
subjects:
# honggildong 사용자에게 권한 부여
- kind: User
  name: honggildong          # 인증서의 CN 과 일치해야 함
  apiGroup: rbac.authorization.k8s.io
# honggildong-group 그룹에게도 권한 부여 (선택)
- kind: Group
  name: honggildong-group    # 인증서의 O 와 일치해야 함
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: honggildong-admin    # 위에서 생성한 Role
  apiGroup: rbac.authorization.k8s.io
EOF
```

### RoleBinding 적용

```bash
# RoleBinding 생성
[root@k8s-cp ~]# kubectl apply -f /root/honggildong-rolebinding.yaml

# 출력:
rolebinding.rbac.authorization.k8s.io/honggildong-admin-binding created

# RoleBinding 확인
[root@k8s-cp ~]# kubectl get rolebinding -n honggildong

# 출력:
NAME                           ROLE                    AGE
honggildong-admin-binding      Role/honggildong-admin  10s

# RoleBinding 상세 내용 확인
[root@k8s-cp ~]# kubectl get rolebinding honggildong-admin-binding \
  -n honggildong -o yaml
```

---

## 9 단계: honggildong 권한 테스트

### honggildong kubeconfig 로 접속 테스트

```bash
# honggildong 권한으로 현재 사용자 확인
[root@k8s-cp ~]# kubectl auth whoami \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
ATTRIBUTES                                                                  VALUE
Name:                         honggildong
Groups:                         honggildong-group, system:authenticated
```

### honggildong 네임스페이스에서 Pod 생성 테스트

```bash
# honggildong 네임스페이스에서 Pod 생성 (성공해야 함)
[root@k8s-cp ~]# kubectl run nginx \
  --image=nginx:1.25 \
  --namespace=honggildong \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
pod/nginx created

# Pod 확인
[root@k8s-cp ~]# kubectl get pods \
  --namespace=honggildong \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
NAME    READY   STATUS    RESTARTS   AGE
nginx   1/1     Running   0          10s
```

### Deployment 생성 테스트

```bash
# Deployment 생성 (성공해야 함)
cat <<EOF | kubectl apply \
  -f - \
  --namespace=honggildong \
  --kubeconfig=/root/users/honggildong/honggildong.conf
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: honggildong
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
EOF

# 출력:
deployment.apps/web-app created

# Deployment 확인
kubectl get deployments \
  --namespace=honggildong \
  --kubeconfig=/root/users/honggildong/honggildong.conf
```

---

## 10 단계: 다른 네임스페이스 접근 제한 테스트

### default 네임스페이스 접근 시도 (거부되어야 함)

```bash
# default 네임스페이스에서 Pod 목록 조회 시도
[root@k8s-cp ~]# kubectl get pods \
  --namespace=default \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
Error from server (Forbidden): pods is forbidden: 
User "honggildong" cannot list resource "pods" 
in API group "" in the namespace "default"
          ↑
          └─ 접근 거부! 예상된 동작
```

### kube-system 네임스페이스 접근 시도 (거부되어야 함)

```bash
# kube-system 네임스페이스에서 Pod 목록 조회 시도
[root@k8s-cp ~]# kubectl get pods \
  --namespace=kube-system \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
Error from server (Forbidden): pods is forbidden: 
User "honggildong" cannot list resource "pods" 
in API group "" in the namespace "kube-system"
          ↑
          └─ 접근 거부! 예상된 동작
```

### 클러스터 리소스 접근 시도 (거부되어야 함)

```bash
# 노드 목록 조회 시도 (클러스터 리소스)
[root@k8s-cp ~]# kubectl get nodes \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
Error from server (Forbidden): nodes is forbidden: 
User "honggildong" cannot list resource "nodes" at the cluster scope
          ↑
          └─ 접근 거부! 예상된 동작

# 네임스페이스 목록 조회 시도 (클러스터 리소스)
[root@k8s-cp ~]# kubectl get namespaces \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
Error from server (Forbidden): namespaces is forbidden: 
User "honggildong" cannot list resource "namespaces" at the cluster scope
          ↑
          └─ 접근 거부! 예상된 동작
```

---

## 11 단계: 권한 확인 명령어

### can-i 명령어로 권한 확인

```bash
# honggildong 네임스페이스에서 Pod 생성 권한 확인
[root@k8s-cp ~]# kubectl auth can-i create pods \
  --namespace=honggildong \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력: yes

# default 네임스페이스에서 Pod 생성 권한 확인
[root@k8s-cp ~]# kubectl auth can-i create pods \
  --namespace=default \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력: no

# 노드 목록 조회 권한 확인 (클러스터 리소스)
[root@k8s-cp ~]# kubectl auth can-i list nodes \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력: no

# 모든 권한 확인
[root@k8s-cp ~]# kubectl auth can-i --list \
  --namespace=honggildong \
  --kubeconfig=/root/users/honggildong/honggildong.conf

# 출력:
Resources                                       Non-Resource URLs   Resource Names   Verbs
pods                                            []                  []               [get list watch create update patch delete]
pods/log                                        []                  []               [get list watch create update patch delete]
pods/exec                                       []                  []               [get list watch create update patch delete]
deployments.apps                                []                  []               [get list watch create update patch delete]
services                                        []                  []               [get list watch create update patch delete]
...
```

---

## 12 단계: honggildong 에게 kubeconfig 파일 전달

### kubeconfig 파일 복사

```bash
# honggildong 사용자에게 kubeconfig 파일 전달
# 실제 환경에서는 scp, 이메일, 안전한 파일 공유 수단 사용

# 예: ec2-user 홈디렉토리에 복사
[root@k8s-cp ~]# cp /root/users/honggildong/honggildong.conf \
  /home/ec2-user/

# 권한 설정
[root@k8s-cp ~]# chown ec2-user:ec2-user /home/ec2-user/honggildong.conf
[root@k8s-cp ~]# chmod 600 /home/ec2-user/honggildong.conf
```

### honggildong 사용 가이드

```bash
# honggildong 사용자에게 전달할 사용 가이드

# 1. kubeconfig 파일을 ~/.kube/ 에 복사
mkdir -p ~/.kube
cp honggildong.conf ~/.kube/config

# 2. 현재 컨텍스트 확인
kubectl config current-context
# 출력: honggildong-context

# 3. 현재 네임스페이스 확인
kubectl config view --minify -o jsonpath='{..namespace}'
# 출력: honggildong

# 4. Pod 생성
kubectl run nginx --image=nginx:1.25

# 5. Pod 확인
kubectl get pods

# 6. Deployment 생성
kubectl create deployment web --image=nginx:1.25

# 7. Service 생성
kubectl expose deployment web --port=80 --type=ClusterIP

# 주의: honggildong 네임스페이스에서만 작업 가능!
# 다른 네임스페이스 접근 시 Forbidden 오류 발생
```

---

## 13 단계: 정리 및 확인

### 생성된 리소스 확인

```bash
# honggildong 관련 리소스 확인

# 1. 네임스페이스
kubectl get namespace honggildong

# 2. Role
kubectl get role honggildong-admin -n honggildong

# 3. RoleBinding
kubectl get rolebinding honggildong-admin-binding -n honggildong

# 4. honggildong 네임스페이스의 Pod
kubectl get pods -n honggildong

# 5. honggildong 네임스페이스의 Deployment
kubectl get deployments -n honggildong
```

### 인증서 만료일 확인

```bash
# honggildong 인증서 만료일 확인
openssl x509 -in /root/users/honggildong/honggildong.crt \
  -noout -dates

# 출력:
notBefore=Jan  1 00:00:00 2024 GMT
notAfter=Jan  1 00:00:00 2025 GMT
# 1 년 후 만료

# 만료 30 일 전 알림 스크립트 (예시)
#!/bin/bash
EXPIRY=$(openssl x509 -in /root/users/honggildong/honggildong.crt \
  -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
    echo "WARNING: honggildong 인증서가 $DAYS_LEFT 일 후 만료됩니다!"
    echo "인증서를 갱신하세요."
fi
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    실습 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. CA 인증서로 honggildong 인증서 발급                     │
│     - 개인키 생성 (openssl genrsa)                         │
│     - CSR 생성 (openssl req)                               │
│     - CA 서명 (openssl x509)                               │
│                                                             │
│  2. kubeconfig 파일 생성                                   │
│     - 클러스터 정보 설정                                   │
│     - 사용자 정보 설정 (인증서, 개인키)                    │
│     - 컨텍스트 설정 (네임스페이스: honggildong)            │
│                                                             │
│  3. RBAC 설정                                              │
│     - Role 생성 (honggildong 네임스페이스 내 권한)         │
│     - RoleBinding 생성 (사용자 honggildong 연결)           │
│                                                             │
│  4. 권한 테스트                                             │
│     - honggildong 네임스페이스: 성공                       │
│     - default/kube-system 네임스페이스: Forbidden          │
│     - 클러스터 리소스 (nodes, namespaces): Forbidden       │
│                                                             │
│  5. 결과                                                    │
│     - honggildong 은 자신의 네임스페이스에서만 작업 가능   │
│     - 다른 네임스페이스 접근 차단                          │
│     - 클러스터 관리 권한 없음                              │
└─────────────────────────────────────────────────────────────┘
```

### 실습 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          실습 체크리스트                                    │
└─────────────────────────────────────────────────────────────┘

□ CA 인증서 확인
  /etc/kubernetes/pki/ca.crt, ca.key

□ honggildong 개인키 생성
  openssl genrsa -out honggildong.key 2048

□ honggildong CSR 생성
  openssl req -new -key honggildong.key -out honggildong.csr

□ honggildong 인증서 발급
  openssl x509 -req -in honggildong.csr -CA ca.crt -CAkey ca.key

□ kubeconfig 파일 생성
  kubectl config set-cluster/user/context

□ honggildong 네임스페이스 생성
  kubectl create namespace honggildong

□ Role 생성
  kubectl apply -f honggildong-role.yaml

□ RoleBinding 생성
  kubectl apply -f honggildong-rolebinding.yaml

□ 권한 테스트 (honggildong 네임스페이스)
  kubectl run nginx --namespace=honggildong (성공)

□ 권한 테스트 (다른 네임스페이스)
  kubectl get pods --namespace=default (Forbidden)

□ kubeconfig 파일 전달
  cp honggildong.conf /home/ec2-user/
```

**Client Certificate 인증을 통해 사용자별로 네임스페이스를 격리하고, RBAC 으로 세밀한 권한을 제어할 수 있습니다. 이는 멀티테넌시 Kubernetes 클러스터의 기본 보안 모델입니다.**
