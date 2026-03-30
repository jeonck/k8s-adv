# Kubernetes 인증서 보관 위치

Kubernetes 클러스터에서 인증서가 저장되는 위치와 관리 방법을 알아봅니다.

---

## 인증서 저장 위치 개요

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 인증서 저장 위치                        │
└─────────────────────────────────────────────────────────────┘

주요 저장 위치:

1. 마스터 노드 (Control Plane)
   /etc/kubernetes/pki/              # kubeadm 인증서
   /var/lib/kubelet/                 # kubelet 인증서
   /etc/kubernetes/                  # kubeconfig 파일

2. Worker 노드
   /var/lib/kubelet/                 # kubelet 인증서
   /etc/kubernetes/                  # kubeconfig 파일

3. etcd
   /etc/kubernetes/pki/etcd/         # etcd 인증서

4. Pod 내부 (ServiceAccount)
   /var/run/secrets/kubernetes.io/serviceaccount/  # 토큰

5. 사용자 (kubectl)
   ~/.kube/config                    # kubeconfig 파일
```

---

## 1. 마스터 노드 인증서

### /etc/kubernetes/pki/ (kubeadm)

```
┌─────────────────────────────────────────────────────────────┐
│          /etc/kubernetes/pki/                               │
└─────────────────────────────────────────────────────────────┘

kubeadm 으로 생성된 클러스터의 기본 인증서 디렉토리:

/etc/kubernetes/pki/
├── ca.crt                    # Kubernetes Root CA (공개키)
├── ca.key                    # Kubernetes Root CA (개인키) ★
├── ca.srl                    # 일련번호 (서명 카운터)
│
├── apiserver.crt             # API Server 서버 인증서
├── apiserver.key             # API Server 개인키
├── apiserver-kubelet-client.crt  # API Server → kubelet
├── apiserver-kubelet-client.key
│
├── controller-manager.crt    # controller-manager 클라이언트
├── controller-manager.key
├── scheduler.crt             # scheduler 클라이언트
├── scheduler.key
│
├── front-proxy-ca.crt        # Front Proxy CA
├── front-proxy-ca.key
├── front-proxy-client.crt    # Front Proxy 클라이언트
├── front-proxy-client.key
│
├── sa.pub                    # ServiceAccount 공개키
├── sa.key                    # ServiceAccount 개인키
│
└── etcd/
    ├── ca.crt                # etcd CA
    ├── ca.key
    ├── server.crt            # etcd 서버 인증서
    ├── server.key
    ├── peer.crt              # etcd 피어 인증서
    ├── peer.key
    ├── healthcheck-client.crt
    └── healthcheck-client.key

총 22 개 파일 (약 44KB)
```

### 각 인증서의 용도

```
┌─────────────────────────────────────────────────────────────┐
│          마스터 노드 인증서 용도                            │
└─────────────────────────────────────────────────────────────┘

1. ca.crt/key (Kubernetes Root CA)
   ┌─────────────────────────────────────────┐
   │  용도: 모든 인증서 서명 (Root CA)       │
   │  위치: /etc/kubernetes/pki/ca.crt      │
   │  보안: 최상위 (절대 유출 금지)         │
   │  유효기간: 10 년                        │
   └─────────────────────────────────────────┘

2. apiserver.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: API Server HTTPS 서버 인증서     │
   │  위치: /etc/kubernetes/pki/apiserver.* │
   │  SAN: IP, 도메인, kubernetes.default   │
   │  유효기간: 1 년                         │
   └─────────────────────────────────────────┘

3. apiserver-kubelet-client.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: API Server → kubelet 통신        │
   │  위치: /etc/kubernetes/pki/            │
   │  CN: kube-apiserver                    │
   │  O: system:masters                     │
   │  유효기간: 1 년                         │
   └─────────────────────────────────────────┘

4. controller-manager.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: controller-manager → API Server  │
   │  위치: /etc/kubernetes/pki/            │
   │  CN: system:kube-controller-manager    │
   │  O: system:kube-controller-manager     │
   │  유효기간: 1 년                         │
   └─────────────────────────────────────────┘

5. scheduler.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: scheduler → API Server           │
   │  위치: /etc/kubernetes/pki/            │
   │  CN: system:kube-scheduler             │
   │  O: system:kube-scheduler              │
   │  유효기간: 1 년                         │
   └─────────────────────────────────────────┘

6. front-proxy-ca.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: 애그리게이션 레이어 CA           │
   │  위치: /etc/kubernetes/pki/            │
   │  독립된 CA (kube-apiserver 와 분리)    │
   │  유효기간: 10 년                        │
   └─────────────────────────────────────────┘

7. front-proxy-client.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: front-proxy → API Server         │
   │  위치: /etc/kubernetes/pki/            │
   │  CN: front-proxy-client                │
   │  유효기간: 1 년                         │
   └─────────────────────────────────────────┘

8. sa.pub/sa.key
   ┌─────────────────────────────────────────┐
   │  용도: ServiceAccount 토큰 서명         │
   │  위치: /etc/kubernetes/pki/            │
   │  RSA 키 쌍 (인증서 아님)               │
   │  유효기간: 영구 (수동 갱신)             │
   └─────────────────────────────────────────┘

9. etcd/ca.crt/key
   ┌─────────────────────────────────────────┐
   │  용도: etcd 전용 CA                     │
   │  위치: /etc/kubernetes/pki/etcd/       │
   │  독립된 CA (etcd 전용)                 │
   │  유효기간: 10 년                        │
   └─────────────────────────────────────────┘

10. etcd/server.crt/key
    ┌─────────────────────────────────────────┐
    │  용도: etcd HTTPS 서버 인증서           │
    │  위치: /etc/kubernetes/pki/etcd/       │
    │  SAN: localhost, 127.0.0.1, 노드 IP    │
    │  유효기간: 1 년                         │
    └─────────────────────────────────────────┘

11. etcd/peer.crt/key
    ┌─────────────────────────────────────────┐
    │  용도: etcd 피어 간 통신                │
    │  위치: /etc/kubernetes/pki/etcd/       │
    │  CN: peer                              │
    │  유효기간: 1 년                         │
    └─────────────────────────────────────────┘
```

### 인증서 확인 명령어

```bash
# 모든 인증서 목록
ls -la /etc/kubernetes/pki/

# CA 인증서 확인
openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout

# API Server 인증서 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout

# SAN 확인 (중요!)
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A1 "Subject Alternative Name"
# 출력:
# X509v3 Subject Alternative Name:
#   DNS:kubernetes, DNS:kubernetes.default, DNS:kubernetes.default.svc, 
#   DNS:kubernetes.default.svc.cluster.local, IP Address:10.96.0.1, 
#   IP Address:192.168.1.10

# 만료일 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates
# 출력:
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2025 GMT

# 개인키 확인 (매칭)
openssl rsa -in /etc/kubernetes/pki/apiserver.key -check -noout
# 출력: RSA key ok
```

---

## 2. kubelet 인증서

### /var/lib/kubelet/

```
┌─────────────────────────────────────────────────────────────┐
│          /var/lib/kubelet/                                  │
└─────────────────────────────────────────────────────────────┘

kubelet 이 사용하는 인증서:

/var/lib/kubelet/
├── pki/
│   ├── kubelet-client-current.pem  # 현재 사용 중인 인증서
│   ├── kubelet-client-2024-01-01-12-00-00.pem  # 이전 인증서
│   ├── kubelet-client-2024-02-01-12-00-00.pem
│   └── kubelet.key                 # 개인키 (고정)
│
├── kubeconfig                      # kubeconfig 파일
└── config.yaml                     # kubelet 설정

특징:
  - kubelet-client-current.pem 은 심볼릭 링크
  - 자동 회전 시 새 인증서 생성
  - 이전 인증서는 백업으로 보관
  - 개인키 (kubelet.key) 는 재사용
```

### kubelet 인증서 자동 회전

```bash
# kubelet 인증서 확인
ls -la /var/lib/kubelet/pki/

# 현재 사용 중인 인증서 (심볼릭 링크)
readlink /var/lib/kubelet/pki/kubelet-client-current.pem
# 출력: kubelet-client-2024-03-01-12-00-00.pem

# 인증서 만료일 확인
openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -text -noout | grep "Not After"
# 출력: Not After : Mar  1 12:00:00 2025 GMT

# kubelet kubeconfig 확인
cat /var/lib/kubelet/kubeconfig
# apiVersion: v1
# clusters:
# - cluster:
#     certificate-authority-data: LS0tLS1...
#     server: https://192.168.1.10:6443
#   name: default-cluster
# users:
# - name: default-auth
#   user:
#     client-certificate: /var/lib/kubelet/pki/kubelet-client-current.pem
#     client-key: /var/lib/kubelet/pki/kubelet.key
```

### kubelet 인증서 회전 설정

```yaml
# kubelet 설정 (/var/lib/kubelet/config.yaml)
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
rotateCertificates: true          # 인증서 회전 활성화 (기본값)
serverTLSBootstrap: true          # 서버 인증서 부트스트랩
clusterDNS:
- 10.96.0.10
```

---

## 3. kubeconfig 파일

### /etc/kubernetes/*.conf

```
┌─────────────────────────────────────────────────────────────┐
│          /etc/kubernetes/*.conf                             │
└─────────────────────────────────────────────────────────────┘

마스터 노드의 kubeconfig 파일:

/etc/kubernetes/
├── admin.conf              # 관리자용 kubeconfig
├── controller-manager.conf # controller-manager 용
├── scheduler.conf          # scheduler 용
└── kubelet.conf            # kubelet 용 (참조: /var/lib/kubelet/kubeconfig)

각 파일의 용도:
  - admin.conf: 클러스터 관리자 접근 (system:masters)
  - controller-manager.conf: controller-manager 의 API Server 접근
  - scheduler.conf: scheduler 의 API Server 접근
  - kubelet.conf: kubelet 의 API Server 접근
```

### kubeconfig 구조

```yaml
# /etc/kubernetes/admin.conf 예시
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    # ↑ CA 인증서 (base64 인코딩)
    server: https://192.168.1.10:6443
  name: kubernetes

users:
- name: kubernetes-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    # ↑ 클라이언트 인증서 (base64 인코딩)
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ...
    # ↑ 클라이언트 개인키 (base64 인코딩)

contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
    namespace: default
  name: kubernetes-admin@kubernetes

current-context: kubernetes-admin@kubernetes
```

### kubeconfig 에서 인증서 추출

```bash
# admin.conf 에서 CA 추출
kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' \
  | base64 --decode > ca.crt

# admin.conf 에서 클라이언트 인증서 추출
kubectl config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' \
  | base64 --decode > admin.crt

# admin.conf 에서 클라이언트 키 추출
kubectl config view --raw -o jsonpath='{.users[0].user.client-key-data}' \
  | base64 --decode > admin.key

# 새 kubeconfig 생성
kubectl config --kubeconfig=new-config.conf set-cluster kubernetes \
  --certificate-authority=ca.crt \
  --embed-certs=true \
  --server=https://192.168.1.10:6443

kubectl config --kubeconfig=new-config.conf set-credentials admin \
  --client-certificate=admin.crt \
  --client-key=admin.key \
  --embed-certs=true

kubectl config --kubeconfig=new-config.conf set-context default \
  --cluster=kubernetes \
  --user=admin

kubectl config --kubeconfig=new-config.conf use-context default
```

---

## 4. Pod 내부 ServiceAccount 토큰

### /var/run/secrets/kubernetes.io/serviceaccount/

```
┌─────────────────────────────────────────────────────────────┐
│          Pod 내부 ServiceAccount 토큰                       │
└─────────────────────────────────────────────────────────────┘

모든 Pod 에 자동 마운트되는 디렉토리:

/var/run/secrets/kubernetes.io/serviceaccount/
├── token       # ServiceAccount JWT 토큰
├── ca.crt      # Kubernetes CA 인증서
└── namespace   # 네임스페이스 이름

자동 마운트:
  - Pod 생성 시 자동 마운트
  - 읽기 전용 (readOnly: true)
  - 모든 Pod 에 기본 제공
```

### Pod 내부에서 확인

```bash
# Pod 생성
kubectl run test-pod --image=busybox --command -- sleep 3600

# Pod 내부에서 토큰 확인
kubectl exec test-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
# 출력: eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwi...

# CA 인증서 확인
kubectl exec test-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
# 출력: -----BEGIN CERTIFICATE-----...

# 네임스페이스 확인
kubectl exec test-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/namespace
# 출력: default

# 토큰 디코딩 (JWT)
TOKEN=$(kubectl exec test-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq
# 출력:
# {
#   "iss": "kubernetes/serviceaccount",
#   "kubernetes.io/serviceaccount/namespace": "default",
#   "kubernetes.io/serviceaccount/secret.name": "default-token-xxxxx",
#   "kubernetes.io/serviceaccount/service-account.name": "default",
#   "sub": "system:serviceaccount:default:default"
# }
```

### ServiceAccount 토큰 비활성화

```yaml
# 토큰 자동 마운트 비활성화 (보안 권장)
apiVersion: v1
kind: Pod
metadata:
  name: no-sa-token
spec:
  automountServiceAccountToken: false  # 토큰 마운트 안 함
  containers:
  - name: app
    image: myapp:latest

# 또는 ServiceAccount 레벨에서 비활성화
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-sa
  namespace: default
automountServiceAccountToken: false
```

---

## 5. 사용자 kubeconfig

### ~/.kube/config

```
┌─────────────────────────────────────────────────────────────┐
│          ~/.kube/config (사용자 kubeconfig)                 │
└─────────────────────────────────────────────────────────────┘

사용자 (kubectl) 의 kubeconfig 파일:

~/.kube/config
├── clusters[0].cluster.certificate-authority-data  # CA 인증서
├── users[0].user.client-certificate-data           # 클라이언트 인증서
└── users[0].user.client-key-data                   # 클라이언트 개인키

또는 파일 참조:
├── clusters[0].cluster.certificate-authority: ~/.kube/ca.crt
├── users[0].user.client-certificate: ~/.kube/admin.crt
└── users[0].user.client-key: ~/.kube/admin.key
```

### kubeconfig 관리

```bash
# 현재 kubeconfig 위치 확인
echo $KUBECONFIG
# 비어있으면: ~/.kube/config 사용

# kubeconfig 백업
cp ~/.kube/config ~/.kube/config.backup

# kubeconfig 확인
kubectl config view

# 현재 컨텍스트 확인
kubectl config current-context

# 사용자 확인
kubectl config view --minify -o jsonpath='{.users[0].name}'

# 클러스터 확인
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'

# kubeconfig 병합
kubectl config view --flatten --merge > merged-config.yaml

# kubeconfig 정리 (불필요한 컨텍스트 제거)
kubectl config delete-context old-context
kubectl config delete-cluster old-cluster
kubectl config delete-user old-user
```

---

## 인증서 백업 및 복구

### 인증서 백업

```bash
# 1. 전체 pki 디렉토리 백업 (추천)
tar -czvf pki-backup-$(date +%Y%m%d).tar.gz \
  -C /etc/kubernetes pki/

# 2. 개별 인증서 백업
cp -r /etc/kubernetes/pki /backup/pki-$(date +%Y%m%d)

# 3. kubeconfig 백업
cp /etc/kubernetes/*.conf /backup/

# 4. kubelet 인증서 백업
cp -r /var/lib/kubelet/pki /backup/kubelet-pki-$(date +%Y%m%d)

# 5. etcd 백업 (별도)
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d).db
```

### 인증서 복구

```bash
# 1. pki 디렉토리 복구
tar -xzvf pki-backup-20240101.tar.gz -C /etc/kubernetes/

# 2. 권한 복구
chmod 600 /etc/kubernetes/pki/*.key
chmod 644 /etc/kubernetes/pki/*.crt
chown -R root:root /etc/kubernetes/pki/

# 3. kubelet 재시작
systemctl restart kubelet

# 4. API Server 재시작 (Pod 삭제)
kubectl -n kube-system delete pod -l component=kube-apiserver
```

---

## 인증서 만료 확인

### kubeadm 인증서 만료 확인

```bash
# 모든 인증서 만료일 확인
kubeadm certs check-expiration

# 출력 예시:
# [certs] Certificate "apiserver" will expire in 364d23h59m
# [certs] Certificate "apiserver-kubelet-client" will expire in 364d23h59m
# [certs] Certificate "front-proxy-client" will expire in 364d23h59m
# [certs] Certificate "etcd-server" will expire in 364d23h59m
# [certs] Certificate "etcd-peer" will expire in 364d23h59m
# [certs] Certificate "etcd-healthcheck-client" will expire in 364d23h59m
# [certs] Certificate "apiserver-etcd-client" will expire in 364d23h59m

# CA 인증서 만료일 (별도 확인)
openssl x509 -in /etc/kubernetes/pki/ca.crt -noout -dates
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2034 GMT  (10 년)
```

### 수동 인증서 만료 확인

```bash
# 모든 인증서 만료일 확인 (one-liner)
find /etc/kubernetes/pki -name "*.crt" -exec \
  openssl x509 -in {} -noout -subject -dates \;

# 출력 예시:
# subject=CN = kubernetes-ca
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2034 GMT
# subject=CN = kube-apiserver
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2025 GMT
# ...

# 30 일 이내 만료되는 인증서 찾기
find /etc/kubernetes/pki -name "*.crt" | while read cert; do
  expiry=$(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2)
  expiry_epoch=$(date -d "$expiry" +%s)
  now_epoch=$(date +%s)
  days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
  if [ $days_left -lt 30 ]; then
    echo "WARNING: $cert expires in $days_left days"
  fi
done
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. 마스터 노드 인증서                                      │
│     - /etc/kubernetes/pki/ (kubeadm)                       │
│     - ca.crt/key: Root CA (10 년)                          │
│     - apiserver.crt/key: API Server (1 년)                 │
│     - etcd/: etcd 전용 인증서                              │
│                                                             │
│  2. kubelet 인증서                                          │
│     - /var/lib/kubelet/pki/                                │
│     - kubelet-client-current.pem: 현재 인증서              │
│     - 자동 회전 (1 년마다)                                 │
│                                                             │
│  3. kubeconfig 파일                                         │
│     - /etc/kubernetes/*.conf (컴포넌트용)                  │
│     - ~/.kube/config (사용자용)                            │
│     - 인증서 데이터 포함 또는 참조                         │
│                                                             │
│  4. Pod 내부 ServiceAccount                                 │
│     - /var/run/secrets/kubernetes.io/serviceaccount/       │
│     - token: JWT 토큰                                       │
│     - ca.crt: CA 인증서                                    │
│     - namespace: 네임스페이스                              │
│                                                             │
│  5. 인증서 관리                                             │
│     - 백업: tar 로 전체 pki 디렉토리                       │
│     - 만료 확인: kubeadm certs check-expiration            │
│     - 갱신: kubeadm certs renew                            │
│                                                             │
│  6. 보안                                                    │
│     - 개인키 권한: chmod 600                               │
│     - CA 개인키: 절대 유출 금지                            │
│     - 정기적 감사: 분기별 인증서 확인                      │
└─────────────────────────────────────────────────────────────┘
```

### 인증서 위치 빠른 참조

```
┌─────────────────────────────────────────────────────────────┐
│          인증서 위치 빠른 참조                              │
└─────────────────────────────────────────────────────────────┘

마스터 노드:
  /etc/kubernetes/pki/ca.crt          # Root CA
  /etc/kubernetes/pki/apiserver.crt   # API Server
  /etc/kubernetes/pki/etcd/ca.crt     # etcd CA

Worker 노드:
  /var/lib/kubelet/pki/               # kubelet 인증서
  /var/lib/kubelet/kubeconfig         # kubelet kubeconfig

사용자:
  ~/.kube/config                      # kubectl kubeconfig

Pod 내부:
  /var/run/secrets/kubernetes.io/serviceaccount/token  # SA 토큰

백업:
  tar -czvf pki-backup.tar.gz -C /etc/kubernetes pki/

만료 확인:
  kubeadm certs check-expiration
  openssl x509 -in cert.crt -noout -dates
```

**Kubernetes 인증서는 /etc/kubernetes/pki/, /var/lib/kubelet/pki/, ~/.kube/config, Pod 내부에 저장됩니다. 정기적 백업과 만료 확인이 필수입니다.**
