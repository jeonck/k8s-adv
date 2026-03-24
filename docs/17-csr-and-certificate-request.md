# CSR (Certificate Signing Request) 과 인증서 요청

인증서 발급을 위한 CSR 생성과 인증서 요청 과정에 대해 알아봅니다.

---

## CSR (Certificate Signing Request) 이란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│              CSR (인증서 서명 요청)                         │
└─────────────────────────────────────────────────────────────┘

CSR (Certificate Signing Request):
  - 인증서 발급을 위해 CA 에 제출하는 요청서
  - 공개키와 소유자 정보를 포함
  - CA 가 이 정보를 바탕으로 인증서 발급

비유:
  - 여권 신청서와 유사
  - 신청서 (CSR) 에 사진 (공개키) 과 개인정보 (소유자 정보) 첨부
  - 정부 (CA) 가 심사 후 여권 (인증서) 발급
```

### CSR 의 역할

```
┌─────────────────────────────────────────────────────────────┐
│              CSR 의 역할                                    │
└─────────────────────────────────────────────────────────────┘

1. 공개키 전달
   ┌─────────────────────────────────────────┐
   │  - CA 에게 내 공개키를 전달             │
   │  - 개인키는 절대 포함 안 함 (보관)      │
   │  - CA 는 공개키로 인증서 생성           │
   └─────────────────────────────────────────┘

2. 소유자 정보 제공
   ┌─────────────────────────────────────────┐
   │  - 도메인 이름 (CN)                     │
   │  - 조직 정보 (O, OU)                    │
   │  - 위치 정보 (L, ST, C)                 │
   │  - 이메일 등                            │
   └─────────────────────────────────────────┘

3. 인증서 속성 정의
   ┌─────────────────────────────────────────┐
   │  - 키 용도 (Key Usage)                  │
   │  - SAN (대체 이름)                      │
   │  - 기타 확장 속성                       │
   └─────────────────────────────────────────┘
```

---

## CSR 생성 과정

### 단계별 생성 과정

```
┌─────────────────────────────────────────────────────────────┐
│              CSR 생성 과정                                  │
└─────────────────────────────────────────────────────────────┘

Step 1: 키 쌍 생성
  ┌─────────────────────────────────────────┐
  │  openssl genrsa -out private.key 2048   │
  │                                          │
  │  - 개인키 (private.key) 생성            │
  │  - 공개키는 이 파일에서 추출됨          │
  │  - 개인키는 안전하게 보관!              │
  └─────────────────────────────────────────┘
           │
           ▼
Step 2: CSR 생성
  ┌─────────────────────────────────────────┐
  │  openssl req -new -key private.key      │
  │            -out request.csr             │
  │            -subj "/CN=example.com"      │
  │                                          │
  │  - 개인키로 서명                        │
  │  - 공개키 포함                          │
  │  - 소유자 정보 입력                     │
  └─────────────────────────────────────────┘
           │
           ▼
Step 3: CA 에 제출
  ┌─────────────────────────────────────────┐
  │  - CA 웹사이트 업로드                   │
  │  - 또는 API 로 전송                     │
  │  - 신원 검증 대기                       │
  └─────────────────────────────────────────┘
           │
           ▼
Step 4: 인증서 발급
  ┌─────────────────────────────────────────┐
  │  - CA 가 CSR 정보 확인                  │
  │  - CA 개인키로 서명                     │
  │  - 인증서 (certificate.crt) 발급        │
  └─────────────────────────────────────────┘
```

---

## CSR 생성 실습

### 방법 1: 개인키와 CSR 동시 생성

```bash
# 가장 일반적인 방법
openssl req -new -newkey rsa:2048 \
  -nodes \
  -keyout server.key \
  -out server.csr \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=MyCompany/CN=www.example.com"

# 출력:
# Generating a RSA private key
# ........+++++
# writing new private key to 'server.key'
```

#### 옵션 설명

| 옵션 | 설명 |
|------|------|
| `-new` | 새 CSR 생성 |
| `-newkey rsa:2048` | 새 RSA 키 (2048 비트) 생성 |
| `-nodes` | 개인키 암호화 안 함 (No DES) |
| `-keyout` | 개인키 파일명 |
| `-out` | CSR 파일명 |
| `-subj` | 소유자 정보 (자동 입력) |

### 방법 2: 기존 개인키로 CSR 생성

```bash
# 이미 개인키가 있는 경우
openssl req -new \
  -key existing.key \
  -out request.csr \
  -subj "/C=KR/ST=Seoul/O=MyCompany/CN=www.example.com"
```

### 방법 3: 대화형으로 정보 입력

```bash
# 대화형으로 정보 입력 (권장)
openssl req -new \
  -key server.key \
  -out server.csr

# 출력:
# You are about to be asked to enter information that will be incorporated
# into your certificate request.
# -----
# Country Name (2 letter code) [AU]:KR          ← 국가 코드 입력
# State or Province Name (full name) [Some-State]:Seoul  ← 도/광역시
# Locality Name (eg, city) []:Seoul             ← 도시
# Organization Name (eg, company) [My Company]:MyCompany  ← 조직명
# Organizational Unit Name (eg, section) []:IT Department ← 부서
# Common Name (eg, YOUR name) []:www.example.com  ← 도메인 (가장 중요!)
# Email Address []:admin@example.com            ← 이메일

# Please enter the following 'extra' attributes
# to be sent with your certificate request
# A challenge password []:                      ← 비밀번호 (선택, 엔터)
# An optional company name []:                  ← 회사명 (선택, 엔터)
```

### 방법 4: SAN 포함 CSR 생성

```bash
# SAN (Subject Alternative Name) 포함 CSR 생성
# 여러 도메인을 하나의 인증서로 보호

cat > openssl.cnf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = KR
ST = Seoul
L = Seoul
O = MyCompany
CN = www.example.com

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = www.example.com
DNS.2 = example.com
DNS.3 = mail.example.com
DNS.4 = shop.example.com
EOF

# CSR 생성
openssl req -new -newkey rsa:2048 \
  -nodes \
  -keyout server.key \
  -out server.csr \
  -config openssl.cnf \
  -extensions req_ext

# CSR 확인 (SAN 포함 여부)
openssl req -in server.csr -text -noout | grep -A1 "Subject Alternative Name"
```

---

## CSR 내용 확인

### CSR 구조 확인

```bash
# CSR 내용 상세 확인
openssl req -in server.csr -text -noout

# 출력 예시:
Certificate Request:
    Data:
        Version: 1 (0x0)
        Subject: C=KR, ST=Seoul, L=Seoul, O=MyCompany, CN=www.example.com
              ↑
              └─ 소유자 정보 (Distinguished Name)
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:a1:b2:c3:d4:e5:f6:78:90:...
                    ...
                Exponent: 65537 (0x10001)
                      ↑
                      └─ 공개키 (RSA 지수)
        Attributes:
            Requested Extensions:
                X509v3 Subject Alternative Name:
                    DNS:www.example.com, DNS:example.com, DNS:mail.example.com
                      ↑
                      └─ SAN (대체 이름)
    Signature Algorithm: sha256WithRSAEncryption
              ↑
              └─ 서명 알고리즘
    Signature:
        30:82:01:22:ab:cd:ef:...
              ↑
              └─ 개인키로 서명한 값 (위조 방지)
```

### CSR 해시값 확인

```bash
# CSR 지문 (Fingerprint) 확인
openssl req -in server.csr -fingerprint -noout

# 출력:
# SHA256 Fingerprint=AB:CD:EF:12:34:56:78:90:...

# MD5 지문 (레거시)
openssl req -in server.csr -fingerprint -md5 -noout
```

---

## CA 에 CSR 제출

### Let's Encrypt (Certbot) 예시

```bash
# Certbot 을 사용한 자동 인증서 발급
# CSR 도 자동 생성됨

certbot certonly --webroot \
  -w /var/www/html \
  -d www.example.com \
  -d example.com

# 출력:
# IMPORTANT NOTES:
# - Congratulations! Your certificate and chain have been saved at:
#   /etc/letsencrypt/live/www.example.com/fullchain.pem
#   Your key file has been saved at:
#   /etc/letsencrypt/live/www.example.com/privkey.pem
```

### 수동 CSR 제출 (상업용 CA)

```
1. DigiCert, Sectigo 등 상업용 CA 웹사이트 접속

2. 인증서 유형 선택
   - SSL/TLS 인증서
   - DV / OV / EV 선택

3. CSR 붙여넣기
   ┌─────────────────────────────────────────┐
   │  CSR 입력란:                            │
   │  ┌─────────────────────────────────┐   │
   │  │ -----BEGIN CERTIFICATE REQUEST-----│  │
   │  │ MIICijCCAXICAQAwRTELMAkGA1UEBhMCS1IxDjAMBgNVBAgMBVNlb3VsMQ4w   │
   │  │ DAYDVQQHDAVTZW91bDEVMBMGA1UECgwMTXlDb21wYW55MRgwFgYDVQQD   │
   │  │ ... (중략) ...                    │   │
   │  │ -----END CERTIFICATE REQUEST-----  │   │
   │  └─────────────────────────────────┘   │
   └─────────────────────────────────────────┘

4. 추가 정보 입력
   - 조직 정보 (OV, EV 용)
   - 연락처 정보
   - 결제 정보

5. 신원 검증 대기
   - DV: 이메일/DNS 확인 (수 분)
   - OV: 전화 확인 (1-3 일)
   - EV: 서류 심사 (3-7 일)

6. 인증서 다운로드
   - certificate.crt
   - ca-bundle.crt (중간 CA)
```

---

## CSR 과 개인키 관계

### CSR 에 포함된 정보 vs 포함되지 않은 정보

```
┌─────────────────────────────────────────────────────────────┐
│              CSR 에 포함된 정보                             │
└─────────────────────────────────────────────────────────────┘

포함됨:
  ✓ 공개키 (Public Key)
  ✓ 소유자 정보 (Subject DN)
  ✓ SAN (대체 이름)
  ✓ 키 용도 (Key Usage)
  ✓ 서명 (개인키로 생성)

포함 안 됨:
  ✗ 개인키 (Private Key) - 절대 포함 안 됨!
  ✗ CA 정보
  ✗ 유효기간
  ✗ CA 서명
```

### CSR 검증 (개인키와 일치하는지)

```bash
# CSR 과 개인키가 일치하는지 확인

# 1. CSR 의 공개키 해시값
openssl req -in server.csr -noout -pubkey | openssl md5
# 출력: MD5(stdin)= abcd1234...

# 2. 개인키의 공개키 해시값
openssl rsa -in server.key -pubout | openssl md5
# 출력: MD5(stdin)= abcd1234...

# 두 값이 일치해야 함!
# 다르면 → CSR 과 개인키가 다른 쌍!
```

### CSR 과 인증서 관계

```
┌─────────────────────────────────────────────────────────────┐
│              CSR → 인증서 변환                              │
└─────────────────────────────────────────────────────────────┘

CSR (요청서):
  ┌─────────────────────────────────────────┐
  │  Subject: CN=www.example.com            │
  │  Public Key: 00:a1:b2:c3:...            │
  │  SAN: www.example.com, example.com      │
  │  Signature: (개인키로 서명)             │
  └─────────────────────────────────────────┘
           │
           │ CA 가 검토 및 서명
           ▼

인증서 (결과물):
  ┌─────────────────────────────────────────┐
  │  Issuer: CN=DigiCert CA                 │
  │  Subject: CN=www.example.com            │
  │  Public Key: 00:a1:b2:c3:... (동일)     │
  │  SAN: www.example.com, example.com      │
  │  Validity: 2024-01-01 ~ 2025-01-01     │
  │  Signature: (CA 개인키로 서명)          │
  └─────────────────────────────────────────┘

핵심:
  - CSR 의 공개키와 정보가 인증서에 그대로 포함됨
  - CA 서명이 추가됨
  - 유효기간이 추가됨
```

---

## CSR 생성 시 주의사항

### 1. Common Name (CN) 설정

```bash
# 잘못된 예
-subj "/CN=localhost"
# → 공개 웹사이트가 아닌 경우에만 사용

# 올바른 예
-subj "/CN=www.example.com"
# → 실제 도메인 사용

# SAN 함께 사용 (권장)
-subj "/CN=www.example.com" \
-addext "subjectAltName=DNS:www.example.com,DNS:example.com"
```

### 2. 개인키 보안

```bash
# 개인키 권한 설정
chmod 600 server.key
chown root:root server.key

# 절대 공유하지 않음
# Git 에 커밋하지 않음 (.gitignore 에 추가)
# 백업은 암호화하여 보관
```

### 3. 키 길이

```bash
# RSA 2048 비트 (최소, 권장)
openssl genrsa -out server.key 2048

# RSA 4096 비트 (더 안전, 느림)
openssl genrsa -out server.key 4096

# ECDSA P-256 (현대적, 빠름)
openssl ecparam -genkey -name prime256v1 -out server.key

# ECDSA P-384 (더 안전)
openssl ecparam -genkey -name secp384r1 -out server.key
```

### 4. SAN 필수 (현대 브라우저)

```bash
# 2020 년 이후 모든 브라우저는 SAN 필수
# CN 만 있으면 경고 표시

# SAN 포함 CSR 생성 (반드시!)
openssl req -new -key server.key \
  -out server.csr \
  -subj "/CN=www.example.com" \
  -addext "subjectAltName=DNS:www.example.com,DNS:example.com"
```

---

## CSR 관련 문제 해결

### 1. CSR 과 개인키 불일치

```bash
# 증상: 인증서 설치 시 "키가 일치하지 않습니다" 오류

# 확인:
openssl req -in server.csr -noout -pubkey | openssl md5
openssl rsa -in server.key -pubout | openssl md5

# 해결:
# - CSR 과 개인키를 다시 생성
# - 또는 기존 개인키로 새 CSR 생성
```

### 2. SAN 누락

```bash
# 증상: 브라우저에서 "이 인증서는 유효하지 않습니다"

# 확인:
openssl req -in server.csr -text -noout | grep -A1 "Subject Alternative Name"

# 해결:
# - SAN 포함하여 새 CSR 생성
# - CA 에 재발급 요청
```

### 3. CN 과 SAN 불일치

```bash
# 증상: 일부 구형 클라이언트에서 경고

# 확인:
openssl req -in server.csr -text -noout

# 해결:
# - CN 과 SAN 을 일치시킴
# - 또는 SAN 에 CN 포함
```

### 4. 키 길이 부족

```bash
# 증상: CA 가 CSR 거부 (1024 비트 등)

# 확인:
openssl req -in server.csr -text -noout | grep "Public-Key"
# 출력: Public-Key: (1024 bit) ← 너무 짧음!

# 해결:
# - 2048 비트 이상으로 새 CSR 생성
openssl req -new -newkey rsa:2048 \
  -keyout server.key -out server.csr
```

---

## Kubernetes 에서 CSR 사용

### Kubernetes CSR 리소스

```yaml
# Kubernetes 에서 CSR 생성 및 승인
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: my-user
spec:
  request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0K...
    # base64 인코딩된 CSR
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages:
  - client auth
```

### kubectl 로 CSR 생성

```bash
# 1. 개인키 생성
openssl genrsa -out myuser.key 2048

# 2. CSR 생성
openssl req -new -key myuser.key \
  -out myuser.csr \
  -subj "/CN=myuser/O=developers"

# 3. CSR 을 base64 로 인코딩
CSR_B64=$(cat myuser.csr | base64 | tr -d '\n')

# 4. Kubernetes CSR 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: myuser
spec:
  request: $CSR_B64
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF

# 5. CSR 승인
kubectl certificate approve myuser

# 6. 인증서 추출
kubectl get csr myuser -o jsonpath='{.status.certificate}' \
  | base64 --decode > myuser.crt

# 7. kubeconfig 에 추가
kubectl config set-credentials myuser \
  --client-certificate=myuser.crt \
  --client-key=myuser.key
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. CSR (Certificate Signing Request)                       │
│     - 인증서 발급을 위해 CA 에 제출하는 요청서              │
│     - 공개키와 소유자 정보 포함                             │
│     - 개인키는 절대 포함 안 함                              │
│                                                             │
│  2. CSR 생성 방법                                           │
│     - openssl req -new -key 개인키 -out CSR                 │
│     - 대화형 또는 -subj 로 자동 입력                        │
│     - SAN 포함 권장 (현대 브라우저 필수)                    │
│                                                             │
│  3. CSR 구조                                                │
│     - Subject: 소유자 정보 (CN, O, OU, L, ST, C)            │
│     - Public Key: 공개키                                    │
│     - Extensions: SAN, Key Usage 등                         │
│     - Signature: 개인키로 서명 (위조 방지)                  │
│                                                             │
│  4. CA 에 제출                                              │
│     - Let's Encrypt: 자동 (Certbot)                         │
│     - 상업용 CA: 웹사이트에 수동 제출                       │
│     - 신원 검증 후 인증서 발급                              │
│                                                             │
│  5. 주의사항                                                │
│     - CN 은 실제 도메인으로                                 │
│     - 개인키 보안 (chmod 600)                               │
│     - 키 길이 2048 비트 이상                                │
│     - SAN 필수 포함                                         │
│                                                             │
│  6. Kubernetes CSR                                          │
│     - CertificateSigningRequest 리소스 사용                 │
│     - kubectl certificate approve 로 승인                   │
│     - 사용자 인증서 발급에 사용                               │
└─────────────────────────────────────────────────────────────┘
```

**CSR 은 인증서 발급의 첫 단계입니다. 올바르게 생성하고 안전하게 관리하는 것이 중요합니다.**
