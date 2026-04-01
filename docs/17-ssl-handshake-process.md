# SSL/TLS 동작 절차

SSL(Secure Sockets Layer)과 TLS(Transport Layer Security)의 동작 원리와 하이브리드 암호화 방식에 대해 상세히 설명합니다.

---

## 1. 핵심 개념: 하이브리드 암호화 방식

현대 인터넷 보안의 근간인 SSL/TLS는 비대칭키와 대칭키의 장점만을 결합한 **하이브리드 방식**을 사용합니다.

### 대칭키 vs 비대칭키 비교

| 구분 | 대칭키 (AES 등) | 비대칭키 (RSA 등) |
|------|-----------------|-------------------|
| **속도** | **매우 빠름** (약 1000배) | 상대적으로 느림 |
| **보안성** | 키 배송 시 탈취 위험 | 키 배송 문제 해결 (공개키 기반) |
| **키 개수** | 사용자 증가 시 기하급수적 증가 | 사용자당 1쌍의 키만 필요 |
| **주 용도** | **실제 데이터 암호화** | **키 교환 및 신원 확인** |

---

## 2. 하이브리드 암호화 동작 원리

처음 연결 시에만 느린 비대칭키를 사용하고, 안전하게 암호화 통로가 확보되면 빠른 대칭키로 전환합니다.

<div class="mermaid">
graph TD
    subgraph Handshake_Phase[핸드셰이크 단계: 비대칭키 사용]
    A[인증서 교환 및 검증] --> B[대칭키 암호값 전달]
    B --> C[양측 동일한 세션키 생성]
    end
    
    subgraph Data_Phase[데이터 전송 단계: 대칭키 사용]
    C --> D[HTTP 데이터 암호화 전송]
    D --> E[고속 대량 데이터 처리]
    end
    
    style Handshake_Phase fill:#f9f,stroke:#333
    style Data_Phase fill:#dfd,stroke:#333
</div>

### 비유를 통한 이해
- **비대칭키:** 귀중한 금고 열쇠(대칭키)를 운반하는 **특수 장갑차** (느리지만 매우 안전함)
- **대칭키:** 열쇠로 열 수 있는 컨테이너를 운반하는 **일반 트럭** (빠르고 효율적임)

---

## 3. 왜 하이브리드 방식이 필요한가?

| 시나리오 | 문제점 | 결과 |
|----------|--------|------|
| **대칭키만 사용 시** | 키를 전달하는 과정에서 해커에게 탈취당할 수 있음 | 모든 통신 내용 노출 |
| **비대칭키만 사용 시** | 연산이 너무 복잡하여 대용량 파일 전송 시 속도가 매우 느림 | 실용적인 웹 브라우징 불가능 |
| **하이브리드 사용 시** | 비대칭키로 키를 안전하게 주고받고, 대칭키로 빠르게 통신 | **안전성과 속도 모두 확보** |

---

## 4. SSL 과 TLS 의 역사

SSL은 Netscape사에서 처음 만든 명칭이며, 이를 표준화한 것이 TLS입니다. 현재는 보안이 강화된 **TLS 1.2**와 **TLS 1.3**이 주로 사용됩니다.

- **SSL 3.0 (1996):** 취약점으로 인해 더 이상 사용하지 않음
- **TLS 1.2 (2008):** 현재 가장 널리 쓰이는 표준 버전 (2 RTT)
- **TLS 1.3 (2018):** 최신 버전, 보안 강화 및 속도 개선 (1 RTT)

---

## 5. TLS 핸드셰이크 상세 절차

### TLS 1.2 핸드셰이크 (전통적 방식)

<div class="mermaid">
sequenceDiagram
    autonumber
    participant C as 클라이언트
    participant S as 서버

    Note over C,S: TCP 연결 완료 (SYN, SYN-ACK, ACK)

    C->>S: ClientHello (TLS 1.2, Random, Cipher Suites)
    S->>C: ServerHello (TLS 1.2, Random, Selected Cipher)
    S->>C: Certificate (서버 인증서 & CA 체인)
    S->>C: ServerKeyExchange (DHE/ECDHE 파라미터)
    S->>C: ServerHelloDone

    C->>S: ClientKeyExchange (암호화된 Premaster Secret)
    C->>S: ChangeCipherSpec (이제부터 암호화!)
    C->>S: Finished (핸드셰이크 검증)

    S->>C: ChangeCipherSpec (나도 암호화!)
    S->>C: Finished (핸드셰이크 검증)

    Note over C,S: 핸드셰이크 완료 (2 RTT)
    C<->>S: Application Data (암호화 통신 시작)
</div>

### TLS 1.3 핸드셰이크 (최신, 단순화)

<div class="mermaid">
sequenceDiagram
    autonumber
    participant C as 클라이언트
    participant S as 서버

    Note over C,S: TCP 연결 완료

    C->>S: ClientHello (TLS 1.3, Random, Key Share)
    S->>C: ServerHello (Selected Cipher, Key Share)
    S->>C: Certificate & CertificateVerify
    S->>C: Finished
    
    C->>S: Finished

    Note over C,S: 핸드셰이크 완료 (1 RTT!)
    C<->>S: Application Data (암호화 통신 시작)
</div>

---

## 6. 요약

SSL/TLS는 **비대칭키의 안전성**과 **대칭키의 효율성**을 결합한 지혜로운 보안 통신 방법입니다. 이 과정을 통해 우리는 피싱 사이트의 위협으로부터 벗어나 안전하게 인터넷과 Kubernetes API를 이용할 수 있습니다.
