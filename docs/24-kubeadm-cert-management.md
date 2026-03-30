# kubeadm init 인증서 생성 실습

kubeadm init 명령어 실행 시 생성되는 인증서들을 상세히 분석합니다.

---

## kubeadm init 명령어 분석

### 명령어 예시

```bash
[root@k8s-cp ~]# kubeadm init \
--kubernetes-version=v1.31.4 \
--apiserver-advertise-address=172.31.1.10 \
--apiserver-cert-extra-sans=jadeedu.com \
--cri-socket=unix:///run/containerd/containerd.sock
```

### 옵션 설명

```
┌─────────────────────────────────────────────────────────────┐
│          kubeadm init 옵션 설명                             │
└─────────────────────────────────────────────────────────────┘

1. --kubernetes-version=v1.31.4
   - 설치할 Kubernetes 버전
   - 해당 버전의 컨테이너 이미지 사용

2. --apiserver-advertise-address=172.31.1.10
   - API Server 가 리스닝할 IP 주소
   - 이 IP 가 인증서 SAN 에 포함됨
   - 마스터 노드의 실제 IP 사용

3. --apiserver-cert-extra-sans=jadeedu.com
   - API Server 인증서에 추가할 SAN (Subject Alternative Name)
   - 도메인 또는 IP 추가 가능
   - 여러 개 지정 시 쉼표로 구분: jadeedu.com,www.jadeedu.com

4. --cri-socket=unix:///run/containerd/containerd.sock
   - 컨테이너 런타임 소켓 경로
   - containerd 사용 시 지정
   - Docker 사용 시: unix:///var/run/dockershim.sock
```

---

## 인증서 생성 과정

### kubeadm init 출력 분석

```
[init] Using Kubernetes version: v1.31.4
~~~
[certs] Using certificateDir folder "/etc/kubernetes/pki"
```

**해석:**
- Kubernetes v1.31.4 사용
- 인증서는 `/etc/kubernetes/pki/` 디렉토리에 생성
- 모든 인증서가 이 폴더에 저장됨

---

### 1. CA (Certificate Authority) 생성

```
[certs] Generating "ca" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/ca.crt` - Kubernetes Root CA 인증서
- `/etc/kubernetes/pki/ca.key` - Kubernetes Root CA 개인키

**역할:**
- Kubernetes 클러스터의 최상위 인증기관
- 모든 다른 인증서에 서명
- 자기 서명 (Self-Signed) Root CA

**확인 명령어:**
```bash
# CA 인증서 확인
openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout

# 출력 예시:
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 01:ab:cd:ef:12:34:56:78
        Signature Algorithm: sha256WithRSAEncryption
    Issuer: CN = kubernetes-ca
              ↑
              └─ 자기 서명 (Issuer = Subject)
    Validity:
        Not Before: Jan  1 00:00:00 2024 GMT
        Not After:  Jan  1 00:00:00 2034 GMT
              ↑
              └─ 10 년 유효기간 (CA 는 김)
    Subject: CN = kubernetes-ca
    Subject Public Key Info:
        Public Key Algorithm: rsaEncryption
            Public-Key: (2048 bit)
    X509v3 extensions:
        X509v3 Key Usage: critical
            Certificate Sign, CRL Sign
              ↑
              └─ CA 만 사용 가능 (서명용)
        X509v3 Basic Constraints: critical
            CA:TRUE
```

---

### 2. API Server 인증서 생성

```
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names 
        [k8s-cp kubernetes kubernetes.default kubernetes.default.svc 
         kubernetes.default.svc.cluster.local] 
        and IPs [10.96.0.1 172.31.1.10]
```

**생성되는 파일:**
- `/etc/kubernetes/pki/apiserver.crt` - API Server 서버 인증서
- `/etc/kubernetes/pki/apiserver.key` - API Server 개인키

**SAN (Subject Alternative Name) 포함 항목:**

| 유형 | 값 | 설명 |
|------|-----|------|
| **DNS Names** | k8s-cp | 노드 호스트명 |
| | kubernetes | 기본 서비스명 |
| | kubernetes.default | default 네임스페이스 |
| | kubernetes.default.svc | svc 네임스페이스 |
| | kubernetes.default.svc.cluster.local | 전체 FQDN |
| **IP Addresses** | 10.96.0.1 | Kubernetes 서비스 IP |
| | 172.31.1.10 | --apiserver-advertise-address |

**--apiserver-cert-extra-sans 효과:**
```bash
# jadeedu.com 이 추가로 SAN 에 포함됨
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A2 "Subject Alternative Name"

# 출력:
# X509v3 Subject Alternative Name:
#   DNS:k8s-cp, DNS:kubernetes, DNS:kubernetes.default, 
#   DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local,
#   DNS:jadeedu.com,                    ← 추가됨!
#   IP Address:10.96.0.1, IP Address:172.31.1.10
```

**확인 명령어:**
```bash
# API Server 인증서 SAN 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A1 "Subject Alternative Name"

# 유효기간 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2025 GMT (1 년)
```

---

### 3. API Server → kubelet 클라이언트 인증서

```
[certs] Generating "apiserver-kubelet-client" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/apiserver-kubelet-client.crt`
- `/etc/kubernetes/pki/apiserver-kubelet-client.key`

**역할:**
- API Server 가 kubelet 에 접속할 때 사용
- kubelet 은 이 인증서로 API Server 신원 확인
- CN: kube-apiserver, O: system:masters

**확인:**
```bash
openssl x509 -in /etc/kubernetes/pki/apiserver-kubelet-client.crt -text -noout | grep -E "Subject:|Issuer:"
# 출력:
# Issuer: CN = kubernetes-ca
# Subject: CN = kube-apiserver, O = system:masters
```

---

### 4. Front Proxy CA 생성

```
[certs] Generating "front-proxy-ca" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/front-proxy-ca.crt`
- `/etc/kubernetes/pki/front-proxy-ca.key`

**역할:**
- Kubernetes 애그리게이션 레이어용 별도 CA
- API Server 와 분리된 신뢰 체인
- 확장성을 위한 독립 CA

**확인:**
```bash
openssl x509 -in /etc/kubernetes/pki/front-proxy-ca.crt -text -noout | grep -E "Subject:|Not After"
# 출력:
# Issuer: CN = front-proxy-ca
# Subject: CN = front-proxy-ca
# Not After : Jan  1 00:00:00 2034 GMT (10 년)
```

---

### 5. Front Proxy Client 인증서

```
[certs] Generating "front-proxy-client" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/front-proxy-client.crt`
- `/etc/kubernetes/pki/front-proxy-client.key`

**역할:**
- front-proxy 가 API Server 에 접속할 때 사용
- 애그리게이션 레이어 통신

---

### 6. etcd CA 생성

```
[certs] Generating "etcd/ca" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/etcd/ca.crt`
- `/etc/kubernetes/pki/etcd/ca.key`

**역할:**
- etcd 전용 별도 CA
- etcd 클러스터 내부 통신용
- Kubernetes CA 와 분리 (독립적 신뢰 체인)

---

### 7. etcd 서버 인증서

```
[certs] Generating "etcd/server" certificate and key
[certs] etcd/server serving cert is signed for DNS names 
        [k8s-cp localhost] and IPs [172.31.1.10 127.0.0.1 ::1]
```

**생성되는 파일:**
- `/etc/kubernetes/pki/etcd/server.crt`
- `/etc/kubernetes/pki/etcd/server.key`

**SAN 포함 항목:**

| 유형 | 값 | 설명 |
|------|-----|------|
| **DNS Names** | k8s-cp | 노드 호스트명 |
| | localhost | 로컬 호스트 |
| **IP Addresses** | 172.31.1.10 | 노드 IP |
| | 127.0.0.1 | 로컬호스트 IPv4 |
| | ::1 | 로컬호스트 IPv6 |

**확인:**
```bash
openssl x509 -in /etc/kubernetes/pki/etcd/server.crt -text -noout | grep -A1 "Subject Alternative Name"
# 출력:
# X509v3 Subject Alternative Name:
#   DNS:k8s-cp, DNS:localhost, IP Address:172.31.1.10, 
#   IP Address:127.0.0.1, IP Address:0:0:0:0:0:0:0:1
```

---

### 8. etcd 피어 인증서

```
[certs] Generating "etcd/peer" certificate and key
[certs] etcd/peer serving cert is signed for DNS names 
        [k8s-cp localhost] and IPs [172.31.1.10 127.0.0.1 ::1]
```

**생성되는 파일:**
- `/etc/kubernetes/pki/etcd/peer.crt`
- `/etc/kubernetes/pki/etcd/peer.key`

**역할:**
- etcd 피어 간 통신용 (etcd 클러스터링)
- 여러 etcd 노드 간 암호화 통신

**SAN:**
- etcd/server 와 동일 (자기 자신 식별용)

---

### 9. etcd 헬스체크 클라이언트

```
[certs] Generating "etcd/healthcheck-client" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/etcd/healthcheck-client.crt`
- `/etc/kubernetes/pki/etcd/healthcheck-client.key`

**역할:**
- API Server 가 etcd 헬스체크 할 때 사용
- 클라이언트 인증서

---

### 10. API Server → etcd 클라이언트

```
[certs] Generating "apiserver-etcd-client" certificate and key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/apiserver-etcd-client.crt`
- `/etc/kubernetes/pki/apiserver-etcd-client.key`

**역할:**
- API Server 가 etcd 에 접속할 때 사용
- etcd 는 이 인증서로 API Server 확인

---

### 11. ServiceAccount 키 쌍

```
[certs] Generating "sa" key and public key
```

**생성되는 파일:**
- `/etc/kubernetes/pki/sa.key` - ServiceAccount 개인키
- `/etc/kubernetes/pki/sa.pub` - ServiceAccount 공개키

**역할:**
- ServiceAccount 토큰 (JWT) 서명용
- 인증서가 아닌 키 쌍 (RSA)
- 토큰 서명과 검증에 사용

**특징:**
```bash
# RSA 키 확인
openssl rsa -in /etc/kubernetes/pki/sa.key -check -noout
# RSA key ok

# 공개키 확인
openssl rsa -in /etc/kubernetes/pki/sa.key -pubout
# -----BEGIN PUBLIC KEY-----
# ...
```

---

## 생성된 인증서 전체 목록

### 디렉토리 구조

```
/etc/kubernetes/pki/
├── ca.crt                    # Kubernetes Root CA
├── ca.key
├── apiserver.crt             # API Server 서버
├── apiserver.key
├── apiserver-kubelet-client.crt  # API Server → kubelet
├── apiserver-kubelet-client.key
├── front-proxy-ca.crt        # Front Proxy CA
├── front-proxy-ca.key
├── front-proxy-client.crt    # Front Proxy Client
├── front-proxy-client.key
├── sa.key                    # ServiceAccount 키
├── sa.pub
└── etcd/
    ├── ca.crt                # etcd CA
    ├── ca.key
    ├── server.crt            # etcd 서버
    ├── server.key
    ├── peer.crt              # etcd 피어
    ├── peer.key
    ├── healthcheck-client.crt  # etcd 헬스체크
    └── healthcheck-client.key
```

### 파일 목록 확인

```bash
# 모든 인증서 목록
ls -la /etc/kubernetes/pki/

# 출력 예시:
# 총 44K
# drwxr-xr-x 2 root root 4096 Jan  1 00:00 .
# drwxr-xr-x 3 root root 4096 Jan  1 00:00 ..
# -rw-r--r-- 1 root root 1139 Jan  1 00:00 ca.crt
# -rw----- 1 root root 1675 Jan  1 00:00 ca.key
# -rw-r--r-- 1 root root 1151 Jan  1 00:00 apiserver.crt
# -rw----- 1 root root 1675 Jan  1 00:00 apiserver.key
# -rw-r--r-- 1 root root 1155 Jan  1 00:00 apiserver-kubelet-client.crt
# -rw----- 1 root root 1675 Jan  1 00:00 apiserver-kubelet-client.key
# -rw-r--r-- 1 root root 1078 Jan  1 00:00 front-proxy-ca.crt
# -rw----- 1 root root 1675 Jan  1 00:00 front-proxy-ca.key
# -rw-r--r-- 1 root root 1103 Jan  1 00:00 front-proxy-client.crt
# -rw----- 1 root root 1675 Jan  1 00:00 front-proxy-client.key
# -rw------- 1 root root 1675 Jan  1 00:00 sa.key
# -rw-r--r-- 1 root root  451 Jan  1 00:00 sa.pub
# drwxr-xr-x 2 root root 4096 Jan  1 00:00 etcd
```

### etcd 인증서 목록

```bash
ls -la /etc/kubernetes/pki/etcd/

# 출력 예시:
# 총 32K
# drwxr-xr-x 2 root root 4096 Jan  1 00:00 .
# -rw-r--r-- 1 root root 1139 Jan  1 00:00 ca.crt
# -rw----- 1 root root 1675 Jan  1 00:00 ca.key
# -rw-r--r-- 1 root root 1159 Jan  1 00:00 server.crt
# -rw----- 1 root root 1675 Jan  1 00:00 server.key
# -rw-r--r-- 1 root root 1159 Jan  1 00:00 peer.crt
# -rw----- 1 root root 1675 Jan  1 00:00 peer.key
# -rw-r--r-- 1 root root 1159 Jan  1 00:00 healthcheck-client.crt
# -rw----- 1 root root 1675 Jan  1 00:00 healthcheck-client.key
```

---

## SAN 추가 옵션 실습

### 여러 도메인 추가

```bash
# 여러 도메인 추가 (쉼표로 구분)
kubeadm init \
  --apiserver-cert-extra-sans=jadeedu.com,www.jadeedu.com,api.jadeedu.com

# 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A3 "Subject Alternative Name"
# 출력:
# X509v3 Subject Alternative Name:
#   DNS:k8s-cp, DNS:kubernetes, DNS:kubernetes.default, 
#   DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local,
#   DNS:jadeedu.com, DNS:www.jadeedu.com, DNS:api.jadeedu.com,
#   IP Address:10.96.0.1, IP Address:172.31.1.10
```

### IP 주소 추가

```bash
# IP 주소 추가 (IP:접두사 사용)
kubeadm init \
  --apiserver-cert-extra-sans=jadeedu.com,IP:192.168.1.100

# 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A3 "Subject Alternative Name"
# 출력:
# X509v3 Subject Alternative Name:
#   DNS:..., IP Address:192.168.1.100  ← 추가됨!
```

---

## 인증서 유효기간

### 기본 유효기간

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 인증서 유효기간                         │
└─────────────────────────────────────────────────────────────┘

CA 인증서 (10 년):
  - ca.crt/key
  - front-proxy-ca.crt/key
  - etcd/ca.crt/key

컴포넌트 인증서 (1 년):
  - apiserver.crt/key
  - apiserver-kubelet-client.crt/key
  - front-proxy-client.crt/key
  - etcd/server.crt/key
  - etcd/peer.crt/key
  - etcd/healthcheck-client.crt/key
  - apiserver-etcd-client.crt/key

ServiceAccount 키 (영구):
  - sa.key/sa.pub (만료 없음, 수동 갱신)
```

### 유효기간 확인

```bash
# CA 인증서 유효기간 (10 년)
openssl x509 -in /etc/kubernetes/pki/ca.crt -noout -dates
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2034 GMT

# API Server 인증서 유효기간 (1 년)
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2025 GMT

# 모든 인증서 만료일 확인 (kubeadm)
kubeadm certs check-expiration
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. kubeadm init 시 11 개 인증서 자동 생성                  │
│     - Kubernetes Root CA                                   │
│     - API Server 인증서 (SAN 포함)                         │
│     - Front Proxy CA 및 클라이언트                         │
│     - etcd CA 및 서버/피어/클라이언트                      │
│     - ServiceAccount 키 쌍                                 │
│                                                             │
│  2. SAN (Subject Alternative Name)                          │
│     - 기본: k8s-cp, kubernetes, 10.96.0.1, 노드 IP         │
│     - 추가: --apiserver-cert-extra-sans 옵션               │
│     - 도메인 및 IP 추가 가능                               │
│                                                             │
│  3. 인증서 위치                                             │
│     - /etc/kubernetes/pki/ (주된 디렉토리)                 │
│     - /etc/kubernetes/pki/etcd/ (etcd 전용)                │
│                                                             │
│  4. 유효기간                                               │
│     - CA: 10 년                                            │
│     - 컴포넌트: 1 년                                       │
│     - ServiceAccount: 영구 (수동 갱신)                     │
│                                                             │
│  5. 3 개의 독립 CA                                          │
│     - Kubernetes Root CA (주된 CA)                         │
│     - Front Proxy CA (애그리게이션)                        │
│     - etcd CA (etcd 전용)                                  │
│                                                             │
│  6. 보안                                                    │
│     - 개인키 권한: 600 (rw-------)                         │
│     - CA 개인키: 절대 유출 금지                            │
│     - 정기적 만료 확인 필요                                │
└─────────────────────────────────────────────────────────────┘
```

### kubeadm init 인증서 생성 흐름

```
kubeadm init
    │
    ▼
1. CA 생성 (Root of Trust)
    │
    ├─ 2. API Server 인증서 서명
    │   └─ SAN: 호스트명, 도메인, IP
    │
    ├─ 3. API Server → kubelet 클라이언트 서명
    │
    ├─ 4. Front Proxy CA 생성
    │   └─ 5. Front Proxy Client 서명
    │
    ├─ 6. etcd CA 생성
    │   ├─ 7. etcd 서버 인증서 서명
    │   ├─ 8. etcd 피어 인증서 서명
    │   ├─ 9. etcd 헬스체크 클라이언트 서명
    │   └─ 10. API Server → etcd 클라이언트 서명
    │
    └─ 11. ServiceAccount 키 쌍 생성

모든 인증서가 /etc/kubernetes/pki/ 에 저장됨
```

**kubeadm init 은 클러스터 운영에 필요한 모든 인증서를 자동으로 생성하고 관리합니다. SAN 추가 옵션으로 도메인 및 IP 를 확장할 수 있습니다.**
