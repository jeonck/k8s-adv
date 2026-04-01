# Mutual TLS Authentication (mTLS)

Kubernetes 클러스터 내부 통신의 근간이 되는 상호 TLS 인증(mTLS)에 대해 알아봅니다.

---

## mTLS 란?

mTLS는 클라이언트와 서버가 **서로의 인증서를 확인하여 양방향으로 신원을 검증**하는 보안 프로토콜입니다. 일반적인 HTTPS(단방향 TLS)가 서버만 인증하는 것과 대조적입니다.

### 단방향 TLS vs 상호 TLS (mTLS) 비교

| 구분 | 단방향 TLS (일반 HTTPS) | 상호 TLS (mTLS) |
|------|-------------------------|-----------------|
| **인증 주체** | 서버만 자신을 증명함 | 클라이언트와 서버가 모두 증명함 |
| **인증서 제출** | 서버만 인증서 제출 | 둘 다 각자의 인증서 제출 |
| **주요 용도** | 일반 웹사이트 접속 | 컴포넌트 간 통신, API 보안 |
| **보안 수준** | 보통 (아이디/비번 병행) | 매우 높음 (기기/계정 기반) |

---

## mTLS 통신 흐름

mTLS 핸드셰이크는 일반 TLS 과정에 클라이언트 인증서 제출 및 검증 단계가 추가된 형태입니다.

```mermaid
sequenceDiagram
    participant C as 클라이언트 (kubectl/kubelet)
    participant S as 서버 (API Server)
    
    C->>S: 1. ClientHello (버전, 암호화 목록)
    S->>C: 2. ServerHello + 서버 인증서
    Note over C: 3. 서버 인증서 검증 (Root CA)
    S->>C: 4. Certificate Request (클라이언트 인증서 요청)
    C->>S: 5. 클라이언트 인증서 제출
    Note over S: 6. 클라이언트 인증서 검증 (Root CA)
    Note over C,S: 7. 암호화 키 교환 및 mTLS 세션 확립
    C<->>S: 8. 상호 인증된 상태로 보안 통신
```

---

## Kubernetes 에서의 mTLS 활용

Kubernetes는 'Zero Trust' 모델을 지향하며, 클러스터 내의 모든 핵심 통신에 mTLS를 강제합니다.

- **컨트롤 플레인 통신:** `kube-scheduler`, `kube-controller-manager`가 API 서버에 접속할 때 각자의 인증서를 사용하여 mTLS를 수행합니다.
- **노드 통신:** `kubelet`이 API 서버와 통신하거나, API 서버가 `kubelet`의 로그를 가져올 때 서로의 인증서를 확인합니다.
- **Service Mesh:** Istio, Linkerd와 같은 서비스 메시 도구들은 마이크로서비스 간의 모든 통신을 mTLS로 자동 암호화합니다.

---

## mTLS 의 주요 장점

1.  **신원 도용 방지:** 훔친 아이디나 비밀번호만으로는 접속이 불가능하며, 올바른 개인키와 인증서가 있어야만 합니다.
2.  **부인 방지:** 모든 통신 주체가 명확히 인증되므로, 어떤 컴포넌트가 어떤 요청을 했는지 확실히 추적할 수 있습니다.
3.  **중간자 공격(MITM) 차단:** 통신 양 끝단이 서로를 완벽히 식별하므로 중간에서 데이터를 가로채거나 위조하는 것이 불가능합니다.

**mTLS는 Kubernetes 클러스터의 '보안 성벽' 역할을 하며, 모든 구성 요소가 서로를 믿고 안전하게 대화할 수 있는 환경을 제공합니다.**
