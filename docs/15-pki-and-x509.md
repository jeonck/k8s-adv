# PKI 와 X.509 인증서

공개키 기반구조 (PKI) 와 X.509 인증서에 대해 알아봅니다.

---

## PKI (Public Key Infrastructure) 란?

### 개념

PKI는 공개키 암호화 기술을 안전하게 사용하기 위한 기반 구조입니다. "이 공개키가 정말로 해당 도메인의 주인의 것인가?"라는 질문에 대해 신뢰할 수 있는 제3자(CA)가 보증하는 시스템입니다.

### PKI 의 구성 요소

| 구성 요소 | 역할 | 비고 |
|-----------|------|------|
| **CA (인증 기관)** | 인증서 발급, 서명, 관리 | DigiCert, Let's Encrypt 등 |
| **RA (등록 기관)** | 신청자 신원 확인, 도메인 검증 | CA를 대신하여 심사 수행 |
| **인증서 저장소** | 발급된 인증서 저장 및 공개 | 누구나 열람 가능 |
| **CRL (폐기 목록)** | 유출/만료 전 폐기된 인증서 목록 | CA가 정기적으로 발행 |
| **OCSP (온라인 상태 프로토콜)** | 실시간 인증서 유효성 조회 | CRL보다 빠른 응답 제공 |
| **최종 사용자 (End Entity)** | 인증서 소유자 (서버, 개인) | 키 쌍 생성 및 개인키 보관 |

### PKI 동작 흐름

<div class="mermaid">
sequenceDiagram
    participant U as 사용자 (User)
    participant CA as 인증 기관 (CA/RA)
    participant R as 저장소 (Repository)
    
    Note over U: Step 1: 키 쌍 생성 (공개키/개인키)
    U->>CA: Step 2: 인증서 신청 (CSR 전달)
    Note over CA: Step 3: 신원 확인 및 도메인 검증
    Note over CA: Step 4: CA 개인키로 인증서 서명
    CA->>U: Step 5: 발급된 인증서 전달
    CA->>R: Step 6: 발급/폐기 정보 업데이트
</div>

---

## X.509 인증서 규격

### 1. X.509 란?

X.509는 PKI에서 사용하는 디지털 인증서의 표준 규격입니다. IETF의 RFC 5280에 상세히 정의되어 있으며, 우리가 사용하는 거의 모든 SSL/TLS 인증서가 이 규격을 따릅니다.

### 2. 인증서 내부 구조 (V3)

| 필드명 | 설명 | 예시 |
|--------|------|------|
| **Version** | 인증서 버전 (현재 V3) | v3 (2) |
| **Serial Number** | CA가 부여한 고유 번호 | 0a:1b:2c... |
| **Signature Algorithm** | 서명에 사용된 알고리즘 | sha256WithRSAEncryption |
| **Issuer** | 발급자(CA) 정보 | CN=DigiCert Global Root CA |
| **Validity** | 유효 기간 | 2024-01-01 ~ 2025-01-01 |
| **Subject** | 소유자 정보 (도메인 등) | CN=*.google.com |
| **Subject Public Key Info** | 소유자 공개키 및 알고리즘 | RSA (2048 bit), 공개키 값 |
| **Extensions (V3)** | 추가 확장 정보 (SAN 등) | Subject Alternative Name |

### 3. 주요 확장 필드 (Extensions)

- **Key Usage:** 공개키의 용도 (Digital Signature, Key Encipherment 등)
- **Subject Alternative Name (SAN):** 하나의 인증서로 여러 도메인을 보호할 때 사용 (중요!)
- **Basic Constraints:** 이 인증서가 다른 인증서를 발급할 수 있는 CA인지 여부

---

## 인증서 인코딩 및 확장자

### 1. 인코딩 방식

| 방식 | 설명 | 특징 |
|------|------|------|
| **DER** | 이진(Binary) 인코딩 | 컴퓨터가 읽기 좋음, 메모장으로 확인 불가 |
| **PEM** | Base64 텍스트 인코딩 | 사람이 읽기 좋음, `-----BEGIN CERTIFICATE-----`로 시작 |

### 2. 주요 확장자 구분

- **.crt, .cer:** 인증서 파일 (주로 PEM 또는 DER)
- **.key:** 개인키 파일 (절대 유출 금지)
- **.csr:** 인증서 서명 요청 파일
- **.pfx, .p12:** 인증서와 개인키를 하나로 합친 파일 (암호 보호)

---

## Kubernetes 에서의 활용

Kubernetes의 모든 컴포넌트(kube-apiserver, kubelet, etcd 등)는 서로 통신할 때 X.509 인증서를 사용하여 상대방을 확인하고 데이터를 암호화합니다.

- **Client Certificate:** 사용자가 API Server에 접속할 때 신원 증명용으로 사용
- **Server Certificate:** API Server가 자신의 신원을 클라이언트에게 증명할 때 사용

**PKI 구조와 X.509 규격을 이해하면 Kubernetes의 인증서 기반 보안 체계를 완벽히 파악할 수 있습니다.**
