# 인증서 정보 확인 (2/2) - 암호화 검증

Root CA 인증서의 공개키를 이용한 암호화 검증을 실습합니다.

---

## 암호화 검증 개요

비대칭키 암호화 방식의 핵심인 **'공개키로 암호화하고 개인키로 복호화한다'**는 원리를 Root CA 인증서를 통해 직접 검증해봅니다.

| 단계 | 작업 내용 | 수행 도구 |
|------|-----------|-----------|
| **1. 키 추출** | Root CA 인증서에서 공개키를 추출합니다. | OpenSSL |
| **2. 암호화** | 추출된 공개키로 텍스트 파일을 암호화합니다. | OpenSSL pkeyutl |
| **3. 검증** | 암호화된 파일이 읽을 수 없는 상태인지 확인합니다. | cat / hexeditor |
| **4. 복호화** | 오직 CA의 개인키(`ca.key`)로만 복호화됨을 확인합니다. | OpenSSL pkeyutl |

---

## 1. 실습 흐름도

<div class="mermaid">
sequenceDiagram
    participant P as 평문 (hello.txt)
    participant K as Root CA 공개키 (ca.pub)
    participant E as 암호문 (hello.enc)
    participant SK as Root CA 개인키 (ca.key)

    Note over P,K: 1. 공개키로 암호화
    P->>K: 평문 전달
    K-->>E: 암호화된 파일 생성
    
    Note over E,SK: 2. 개인키로 복호화
    E->>SK: 암호문 전달
    SK-->>P: 원본 평문 복원
</div>

---

## 2. 주요 명령어 요약

### 공개키 추출
인증서 파일(`.crt`)에서 암호화에 사용할 공개키 부분만 별도로 추출합니다.
```bash
openssl x509 -in /etc/kubernetes/pki/ca.crt -pubkey -noout > ca.pub
```

### 파일 암호화
추출한 공개키를 사용하여 일반 텍스트 파일을 암호화된 이진 데이터로 변환합니다.
```bash
openssl pkeyutl -encrypt -pubin -inkey ca.pub -in hello.txt -out hello.enc
```

### 파일 복호화
암호화된 파일을 오직 한 쌍인 개인키를 사용하여 다시 읽을 수 있는 텍스트로 복원합니다.
```bash
openssl pkeyutl -decrypt -inkey /etc/kubernetes/pki/ca.key -in hello.enc -out hello.dec
```

---

## 3. 결과 분석

- **암호화 성공:** `cat hello.enc` 명령 시 읽을 수 없는 깨진 문자들이 출력됩니다.
- **복호화 성공:** `cat hello.dec` 명령 시 원본인 "Hello World"가 정상적으로 출력됩니다.
- **결론:** 공개키는 누구나 가질 수 있지만, 이를 통해 암호화된 데이터는 오직 **개인키를 소유한 주체**만이 읽을 수 있음을 확인했습니다.

**이 원리는 Kubernetes의 모든 구성 요소가 API 서버와 안전하게 데이터를 주고받는 통신 보안의 근간이 됩니다.**
