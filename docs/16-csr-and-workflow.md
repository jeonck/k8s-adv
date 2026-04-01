# CSR (Certificate Signing Request) 과 인증서 요청

인증서 발급을 위한 CSR 생성과 인증서 요청 과정에 대해 알아봅니다.

---

## CSR (Certificate Signing Request) 이란?

### 개념

CSR(Certificate Signing Request)은 인증서 발급을 위해 인증 기관(CA)에 제출하는 요청서입니다. 공개키와 소유자 정보를 포함하며, 비유하자면 여권(인증서)을 발급받기 위해 정부(CA)에 제출하는 신청서와 같습니다.

### CSR 의 역할

| 역할 | 설명 | 비고 |
|------|------|------|
| **공개키 전달** | CA에게 내 공개키를 안전하게 전달 | 개인키는 포함하지 않음 |
| **소유자 정보 제공** | 도메인(CN), 조직(O), 국가(C) 등 정보 제공 | 신원 확인의 기초 |
| **인증서 속성 정의** | 키 용도(Key Usage), SAN(대체 이름) 등 정의 | 인증서의 상세 기능 결정 |

---

## CSR 생성 및 발급 과정

### 단계별 흐름

<div class="mermaid">
sequenceDiagram
    participant U as 사용자 (User)
    participant CA as 인증 기관 (CA)
    
    Note over U: Step 1: 개인키 생성 (private.key)
    Note over U: Step 2: CSR 생성 (공개키 + 소유자 정보)
    U->>CA: Step 3: CSR 제출 (인증 요청)
    Note over CA: Step 4: 정보 검증 및 승인
    Note over CA: Step 5: CA 개인키로 서명하여 인증서 생성
    CA->>U: Step 6: 발급된 인증서(certificate.crt) 전달
</div>

### 상세 생성 단계 (OpenSSL 예시)

1.  **개인키 생성:** `openssl genrsa -out private.key 2048`
    - 인증서의 기반이 되는 비밀키를 생성합니다. (가장 중요!)
2.  **CSR 생성:** `openssl req -new -key private.key -out request.csr -subj "/CN=example.com"`
    - 생성된 개인키를 바탕으로 공개키를 추출하고 소유자 정보를 결합하여 요청서를 만듭니다.
3.  **CA 제출:** 생성된 `request.csr` 파일을 CA에 전달하여 발급을 요청합니다.

---

## 주요 CSR 필드 (Subject)

인증서 신청 시 입력하는 소유자 정보의 주요 필드는 다음과 같습니다.

| 약어 | 필드명 | 설명 | 예시 |
|------|--------|------|------|
| **CN** | Common Name | 도메인 이름 또는 사용자명 | *.google.com, admin |
| **O** | Organization | 조직/회사 이름 | Google LLC, Kubernetes |
| **OU** | Organizational Unit | 부서 이름 | IT, Security |
| **L** | Locality | 시/군/구 | Mountain View, Seoul |
| **ST** | State | 도/광역시 | California, Seoul |
| **C** | Country | 국가 코드 (2자리) | US, KR |

---

## SAN (Subject Alternative Name) 의 중요성

현대 브라우저와 Kubernetes는 보안상의 이유로 **CN(Common Name) 대신 SAN 필드를 우선적으로 검증**합니다.

- **CN의 한계:** 하나의 인증서에 하나의 이름만 지정 가능
- **SAN의 장점:** 하나의 인증서에 여러 개의 도메인이나 IP 주소를 지정 가능
  - 예: `example.com`, `www.example.com`, `10.96.0.1` 등을 모두 포함

---

## Kubernetes 에서의 CSR

Kubernetes 클러스터 내부에서도 인증서 발급이 빈번하게 일어납니다.

1.  **kubelet 인증서:** 노드가 클러스터에 조인할 때 API Server에 CSR을 보냅니다.
2.  **사용자 추가:** 새로운 사용자를 만들 때 CSR 리소스를 생성하여 관리자의 승인을 받습니다.
3.  **Cert-manager:** Let's Encrypt 등을 통해 자동으로 CSR을 생성하고 인증서를 갱신합니다.

**CSR은 보안 통신을 위한 '신청서'이며, 이 과정을 이해하는 것은 Kubernetes의 보안 설정을 관리하는 데 필수적입니다.**
