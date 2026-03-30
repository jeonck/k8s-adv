# 인증서 정보 확인 (1/2) - Root CA 와 API Server

Kubernetes 클러스터의 Root CA 인증서와 API Server 에서 사용하는 인증서 파일 정보를 확인합니다.

---

## 인증서 정보 확인 개요

```
┌─────────────────────────────────────────────────────────────┐
│          인증서 정보 확인                                   │
└─────────────────────────────────────────────────────────────┘

확인 항목:
  1. Root CA 인증서 정보
     - /etc/kubernetes/pki/ca.crt
     - 클러스터의 최상위 인증기관

  2. API Server 인증서 정보
     - /etc/kubernetes/pki/apiserver.crt
     - API Server 서버 인증서

  3. 두 인증서 관계 확인
     - API Server 인증서가 Root CA 로부터 서명받았는지 확인
     - 신뢰 체인 검증
```

---

## 1. Root CA 인증서 정보 확인

### Root CA 인증서 위치

```bash
# Root CA 인증서 확인
[root@k8s-cp ~]# ls -la /etc/kubernetes/pki/ca.*

# 출력:
-rw-r--r-- 1 root root 1139 Jan  1 00:00 /etc/kubernetes/pki/ca.crt
-rw----- 1 root root 1675 Jan  1 00:00 /etc/kubernetes/pki/ca.key
-rw-r--r-- 1 root root   41 Jan  1 00:00 /etc/kubernetes/pki/ca.srl
```

### Root CA 인증서 상세 확인

```bash
# Root CA 인증서 상세 정보 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout
```

### 출력 예시 및 분석

```
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 01:ab:cd:ef:12:34:56:78
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes-ca
                  ↑
                  └─ 발급자 (Root CA 는 자기 자신)
        Validity:
            Not Before: Jan  1 00:00:00 2024 GMT
            Not After:  Jan  1 00:00:00 2034 GMT
                  ↑
                  └─ 10 년 유효기간
        Subject: CN = kubernetes-ca
                  ↑
                  └─ 소유자 (Issuer 와 동일 = 자기 서명)
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:a1:b2:c3:d4:e5:f6:78:90:...
                    ...
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Certificate Sign, CRL Sign
                  ↑
                  └─ CA 만 사용 가능 (서명용)
            X509v3 Basic Constraints: critical
                CA:TRUE
                  ↑
                  └─ 명백한 CA 인증서
    Signature Algorithm: sha256WithRSAEncryption
    Signature:
        30:82:01:22:ab:cd:ef:...
```

### 주요 필드 설명

```
┌─────────────────────────────────────────────────────────────┐
│          Root CA 인증서 주요 필드                           │
└─────────────────────────────────────────────────────────────┘

1. Version: 3 (0x2)
   - X.509 버전 3 (현재 표준)
   - 확장 필드 지원

2. Serial Number: 01:ab:cd:ef:12:34:56:78
   - 인증서 일련번호 (고유 식별자)
   - CA 가 각 인증서에 부여

3. Signature Algorithm: sha256WithRSAEncryption
   - 서명 알고리즘
   - SHA-256 해시 + RSA 암호화

4. Issuer: CN = kubernetes-ca
   - 인증서 발급자
   - Root CA 는 자기 자신 (자기 서명)

5. Validity:
   - Not Before: 2024-01-01 (발급일)
   - Not After: 2034-01-01 (만료일)
   - 10 년 유효기간

6. Subject: CN = kubernetes-ca
   - 인증서 소유자
   - Root CA 는 Issuer 와 Subject 가 동일

7. Public Key: RSA 2048 bit
   - 공개키 알고리즘 및 크기
   - 2048 비트 이상 권장

8. Key Usage: Certificate Sign, CRL Sign
   - 이 키로 할 수 있는 작업
   - Certificate Sign: 다른 인증서 서명
   - CRL Sign: 폐기목록 서명
   - CA 만 가지는 특별한 권한

9. Basic Constraints: CA:TRUE
   - 이 인증서가 CA 인지 여부
   - TRUE = CA 인증서
```

### Root CA 지문 (Fingerprint) 확인

```bash
# SHA-256 지문 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -fingerprint -sha256 -noout

# 출력:
# SHA256 Fingerprint=AB:CD:EF:12:34:56:78:90:...

# MD5 지문 확인 (레거시)
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -fingerprint -md5 -noout

# 출력:
# MD5 Fingerprint=12:34:56:78:90:AB:CD:EF:...
```

### Root CA 유효기간 확인

```bash
# 유효기간만 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -noout -dates

# 출력:
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2034 GMT

# 현재 시간과 함께 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -noout -dates -checkend 0

# 출력:
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Jan  1 00:00:00 2034 GMT
# Certificate will not expire
#   ↑
#   └─ 만료되지 않음

# 30 일 이내 만료 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -noout -checkend 2592000  # 30 일 (초 단위)

# 출력:
# Certificate will not expire
# 또는
# Certificate will expire
```

---

## 2. API Server 인증서 정보 확인

### API Server 인증서 위치

```bash
# API Server 인증서 확인
[root@k8s-cp ~]# ls -la /etc/kubernetes/pki/apiserver.*

# 출력:
-rw-r--r-- 1 root root 1151 Jan  1 00:00 /etc/kubernetes/pki/apiserver.crt
-rw----- 1 root root 1675 Jan  1 00:00 /etc/kubernetes/pki/apiserver.key
```

### API Server 인증서 상세 확인

```bash
# API Server 인증서 상세 정보 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -text -noout
```

### 출력 예시 및 분석

```
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 02:bc:de:f1:23:45:67:89
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes-ca
                  ↑
                  └─ Kubernetes Root CA 가 서명!
        Validity:
            Not Before: Jan  1 00:00:00 2024 GMT
            Not After:  Jan  1 00:00:00 2025 GMT
                  ↑
                  └─ 1 년 유효기간
        Subject: CN = kube-apiserver
                  ↑
                  └─ API Server 식별자
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:b2:c3:d4:e5:f6:78:90:...
                    ...
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
                  ↑
                  └─ 서버 인증서 용도
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
                  ↑
                  └─ HTTPS 서버용
            X509v3 Subject Alternative Name:
                DNS:k8s-cp, DNS:kubernetes, DNS:kubernetes.default,
                DNS:kubernetes.default.svc,
                DNS:kubernetes.default.svc.cluster.local,
                DNS:jadeedu.com,                    ← 추가 도메인
                IP Address:10.96.0.1, IP Address:172.31.1.10
                  ↑
                  └─ SAN (대체 이름) - 매우 중요!
    Signature Algorithm: sha256WithRSAEncryption
    Signature:
        30:82:01:22:ab:cd:ef:...
```

### 주요 필드 설명

```
┌─────────────────────────────────────────────────────────────┐
│          API Server 인증서 주요 필드                        │
└─────────────────────────────────────────────────────────────┘

1. Issuer: CN = kubernetes-ca
   - Kubernetes Root CA 가 서명
   - 신뢰 체인의 시작점

2. Subject: CN = kube-apiserver
   - API Server 식별자
   - 클라이언트가 확인하는 이름

3. Validity: 1 년
   - Not Before: 2024-01-01
   - Not After: 2025-01-01
   - 1 년 유효기간 (CA 는 10 년)

4. Key Usage: Digital Signature, Key Encipherment
   - Digital Signature: 데이터 서명
   - Key Encipherment: 키 암호화
   - 서버 인증서 표준 용도

5. Extended Key Usage: TLS Web Server Authentication
   - HTTPS 서버 인증서
   - 브라우저/클라이언트가 신뢰

6. Subject Alternative Name (SAN): ★중요★
   - DNS Names:
     - k8s-cp (노드 호스트명)
     - kubernetes (기본 서비스명)
     - kubernetes.default
     - kubernetes.default.svc
     - kubernetes.default.svc.cluster.local
     - jadeedu.com (--apiserver-cert-extra-sans 로 추가)
   - IP Addresses:
     - 10.96.0.1 (Kubernetes 서비스 IP)
     - 172.31.1.10 (--apiserver-advertise-address)

   클라이언트는 이 중 하나의 이름으로 접속해야 함!
```

### SAN (Subject Alternative Name) 확인

```bash
# SAN 만 추출하여 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -text | grep -A1 "Subject Alternative Name"

# 출력:
# X509v3 Subject Alternative Name:
#   DNS:k8s-cp, DNS:kubernetes, DNS:kubernetes.default,
#   DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local,
#   DNS:jadeedu.com,
#   IP Address:10.96.0.1, IP Address:172.31.1.10
```

### API Server 개인키 확인

```bash
# 개인키 유효성 확인
[root@k8s-cp ~]# openssl rsa -in /etc/kubernetes/pki/apiserver.key \
  -check -noout

# 출력:
# RSA key ok

# 개인키 지문 확인 (보안 감사용)
[root@k8s-cp ~]# openssl rsa -in /etc/kubernetes/pki/apiserver.key \
  -fingerprint -sha256 -noout

# 출력:
# SHA256 Fingerprint=12:34:56:78:90:AB:CD:EF:...
```

---

## 3. 두 인증서 관계 확인 (신뢰 체인 검증)

### API Server 인증서가 Root CA 로부터 서명받았는지 확인

```bash
# Root CA 로 API Server 인증서 검증
[root@k8s-cp ~]# openssl verify -CAfile /etc/kubernetes/pki/ca.crt \
  /etc/kubernetes/pki/apiserver.crt

# 출력:
# /etc/kubernetes/pki/apiserver.crt: OK
#   ↑
#   └─ Root CA 가 서명한 유효한 인증서!
```

### 검증 실패 시나리오

```bash
# 잘못된 CA 로 검증 시도
[root@k8s-cp ~]# openssl verify -CAfile /wrong/ca.crt \
  /etc/kubernetes/pki/apiserver.crt

# 출력:
# /etc/kubernetes/pki/apiserver.crt: verification failed
# error 20 at 0 depth lookup: unable to get local issuer certificate
#   ↑
#   └─ 발급 CA 를 찾을 수 없음
```

### 상세 검증 과정

```bash
# 1. Root CA 공개키 추출
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -noout -pubkey > ca-public.key

# 2. API Server 인증서 서명 추출
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -text | grep -A2 "Signature Algorithm"

# 출력:
# Signature Algorithm: sha256WithRSAEncryption
# Signature:
#     30:82:01:22:ab:cd:ef:...

# 3. 서명 복호화 (개념적)
# Root CA 공개키로 API Server 인증서 서명 복호화
# → 해시값 1 추출

# 4. API Server 인증서 해시 계산
# API Server 인증서 내용으로 SHA-256 해시 계산
# → 해시값 2 생성

# 5. 해시값 비교
# 해시값 1 == 해시값 2
# → 일치하면 서명 유효!
```

### Issuer 와 Subject 관계 확인

```bash
# Root CA 의 Subject 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -noout -subject

# 출력:
# subject=CN = kubernetes-ca

# API Server 인증서의 Issuer 확인
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -issuer

# 출력:
# issuer=CN = kubernetes-ca
#   ↑
#   └─ Root CA 의 Subject 와 일치!

# 두 값이 일치해야 신뢰 체인이 연결됨
```

### 신뢰 체인 시각화

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 신뢰 체인                               │
└─────────────────────────────────────────────────────────────┘

Root CA (ca.crt)
│
│  Subject: CN = kubernetes-ca
│  Issuer: CN = kubernetes-ca (자기 서명)
│  Key Usage: Certificate Sign, CRL Sign
│  CA:TRUE
│
│  서명
│  (CA 개인키로)
│
▼
API Server 인증서 (apiserver.crt)
│
│  Subject: CN = kube-apiserver
│  Issuer: CN = kubernetes-ca ← Root CA 와 연결!
│  Key Usage: Digital Signature, Key Encipherment
│  Extended Key Usage: TLS Web Server Authentication
│  SAN: k8s-cp, kubernetes, 10.96.0.1, 172.31.1.10, ...
│
▼
클라이언트 (kubectl, kubelet, 등)
   │
   │ Root CA 로 검증
   │ "이 인증서가 kubernetes-ca 로부터 서명받았는가?"
   │
   └─ YES → 신뢰함!
```

---

## 4. 인증서 정보 비교

### Root CA vs API Server 인증서

```
┌─────────────────────────────────────────────────────────────┐
│          Root CA vs API Server 인증서 비교                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  Root CA             │  API Server                          │
├──────────────────────┼──────────────────────────────────────┤
│  파일: ca.crt        │  파일: apiserver.crt                 │
├──────────────────────┼──────────────────────────────────────┤
│  Subject:            │  Subject:                            │
│  CN = kubernetes-ca  │  CN = kube-apiserver                 │
├──────────────────────┼──────────────────────────────────────┤
│  Issuer:             │  Issuer:                             │
│  CN = kubernetes-ca  │  CN = kubernetes-ca                  │
│  (자기 서명)         │  (Root CA 가 서명)                   │
├──────────────────────┼──────────────────────────────────────┤
│  유효기간: 10 년     │  유효기간: 1 년                     │
├──────────────────────┼──────────────────────────────────────┤
│  Key Usage:          │  Key Usage:                          │
│  Certificate Sign    │  Digital Signature                   │
│  CRL Sign            │  Key Encipherment                    │
├──────────────────────┼──────────────────────────────────────┤
│  Basic Constraints:  │  Basic Constraints:                  │
│  CA:TRUE             │  CA:FALSE                            │
├──────────────────────┼──────────────────────────────────────┤
│  용도: 다른 인증서   │  용도: HTTPS 서버                    │
│  서명 (CA)           │  인증 (서버)                         │
└──────────────────────┴──────────────────────────────────────┘
```

### 인증서 체인 확인

```bash
# 두 인증서의 관계 확인 스크립트
cat <<'EOF' > check-cert-chain.sh
#!/bin/bash

CA_CERT="/etc/kubernetes/pki/ca.crt"
APISERVER_CERT="/etc/kubernetes/pki/apiserver.crt"

echo "=== Root CA 정보 ==="
openssl x509 -in $CA_CERT -noout -subject -issuer -dates
echo ""

echo "=== API Server 인증서 정보 ==="
openssl x509 -in $APISERVER_CERT -noout -subject -issuer -dates
echo ""

echo "=== 신뢰 체인 검증 ==="
openssl verify -CAfile $CA_CERT $APISERVER_CERT
echo ""

echo "=== SAN 확인 ==="
openssl x509 -in $APISERVER_CERT -noout -text | grep -A1 "Subject Alternative Name"
EOF

chmod +x check-cert-chain.sh
./check-cert-chain.sh
```

---

## 5. 실습: 인증서 정보 확인

### 전체 인증서 정보 확인 스크립트

```bash
#!/bin/bash
# check-all-certs.sh - 모든 인증서 정보 확인

PKI_DIR="/etc/kubernetes/pki"

echo "=== Kubernetes 인증서 정보 확인 ==="
echo ""

# Root CA 확인
echo "1. Root CA 인증서"
echo "-------------------"
openssl x509 -in $PKI_DIR/ca.crt -noout \
  -subject -issuer -dates -fingerprint -sha256
echo ""

# API Server 인증서 확인
echo "2. API Server 인증서"
echo "-------------------"
openssl x509 -in $PKI_DIR/apiserver.crt -noout \
  -subject -issuer -dates
echo "SAN:"
openssl x509 -in $PKI_DIR/apiserver.crt -noout -text | \
  grep -A1 "Subject Alternative Name" | tail -n1
echo ""

# 신뢰 체인 검증
echo "3. 신뢰 체인 검증"
echo "-------------------"
openssl verify -CAfile $PKI_DIR/ca.crt $PKI_DIR/apiserver.crt
echo ""

# 다른 인증서들도 확인
echo "4. 기타 인증서 만료일"
echo "-------------------"
for cert in $PKI_DIR/*.crt $PKI_DIR/etcd/*.crt; do
    if [ -f "$cert" ]; then
        name=$(basename $cert)
        expiry=$(openssl x509 -in $cert -noout -enddate 2>/dev/null | cut -d= -f2)
        echo "$name: $expiry"
    fi
done
```

### 출력 예시

```
=== Kubernetes 인증서 정보 확인 ===

1. Root CA 인증서
-------------------
subject=CN = kubernetes-ca
issuer=CN = kubernetes-ca
notBefore=Jan  1 00:00:00 2024 GMT
notAfter=Jan  1 00:00:00 2034 GMT
sha256 Fingerprint=AB:CD:EF:12:34:56:78:90:...

2. API Server 인증서
-------------------
subject=CN = kube-apiserver
issuer=CN = kubernetes-ca
notBefore=Jan  1 00:00:00 2024 GMT
notAfter=Jan  1 00:00:00 2025 GMT
SAN:
  DNS:k8s-cp, DNS:kubernetes, DNS:kubernetes.default,
  DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local,
  DNS:jadeedu.com, IP Address:10.96.0.1, IP Address:172.31.1.10

3. 신뢰 체인 검증
-------------------
/etc/kubernetes/pki/apiserver.crt: OK

4. 기타 인증서 만료일
-------------------
ca.crt: Jan  1 00:00:00 2034 GMT
apiserver.crt: Jan  1 00:00:00 2025 GMT
apiserver-kubelet-client.crt: Jan  1 00:00:00 2025 GMT
front-proxy-ca.crt: Jan  1 00:00:00 2034 GMT
front-proxy-client.crt: Jan  1 00:00:00 2025 GMT
etcd/ca.crt: Jan  1 00:00:00 2034 GMT
etcd/server.crt: Jan  1 00:00:00 2025 GMT
etcd/peer.crt: Jan  1 00:00:00 2025 GMT
etcd/healthcheck-client.crt: Jan  1 00:00:00 2025 GMT
apiserver-etcd-client.crt: Jan  1 00:00:00 2025 GMT
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Root CA 인증서                                          │
│     - 위치: /etc/kubernetes/pki/ca.crt                     │
│     - 자기 서명 (Subject = Issuer)                         │
│     - 유효기간: 10 년                                      │
│     - Key Usage: Certificate Sign, CRL Sign                │
│     - CA:TRUE                                              │
│                                                             │
│  2. API Server 인증서                                       │
│     - 위치: /etc/kubernetes/pki/apiserver.crt              │
│     - Issuer: CN = kubernetes-ca (Root CA 가 서명)         │
│     - Subject: CN = kube-apiserver                         │
│     - 유효기간: 1 년                                       │
│     - SAN: 호스트명, 도메인, IP 포함                       │
│                                                             │
│  3. 신뢰 체인 검증                                          │
│     - openssl verify -CAfile ca.crt apiserver.crt          │
│     - 출력: OK → 유효한 신뢰 체인                          │
│     - API Server 인증서가 Root CA 로부터 서명받았음        │
│                                                             │
│  4. 주요 확인 명령어                                        │
│     - openssl x509 -in cert.crt -text -noout (상세 정보)   │
│     - openssl x509 -in cert.crt -noout -dates (유효기간)   │
│     - openssl x509 -in cert.crt -noout -subject (소유자)   │
│     - openssl x509 -in cert.crt -noout -issuer (발급자)    │
│     - openssl verify -CAfile ca.crt server.crt (검증)      │
└─────────────────────────────────────────────────────────────┘
```

**Root CA 인증서와 API Server 인증서의 관계를 이해하는 것은 Kubernetes 보안의 기본입니다. 신뢰 체인 검증을 통해 인증서의 유효성을 항상 확인하세요.**
