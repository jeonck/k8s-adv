# StatefulSet 에서 Headless Service 가 필요한 이유

StatefulSet을 운영할 때 왜 일반 서비스가 아닌 **Headless Service**가 필수적인지 핵심 이유를 알아봅니다.

---

## 1. Headless Service 란?

일반적인 서비스와 달리 `clusterIP: None` 설정을 통해 가상 IP를 할당받지 않는 서비스입니다.

| 특성 | 일반 Service (ClusterIP) | Headless Service |
|------|-------------------------|------------------|
| **가상 IP (VIP)** | 할당됨 (예: 10.96.0.10) | **없음 (None)** |
| **로드밸런싱** | kube-proxy가 여러 Pod로 분산 | 없음 (클라이언트가 직접 선택) |
| **DNS 응답** | 단일 ClusterIP 반환 | **연결된 모든 Pod의 IP 목록 반환** |
| **주 용도** | 일반적인 트래픽 분산 | 개별 Pod에 직접 접근 (Stateful) |

---

## 2. 왜 StatefulSet에 필수인가?

### 이유 1: 고유한 DNS 주소(Stable Network ID) 제공
StatefulSet의 각 Pod는 번호가 붙은 고유한 이름을 가집니다. Headless Service와 결합하면 각 Pod는 고정된 DNS 주소를 갖게 됩니다.

<div class="mermaid">
graph LR
    H[Headless Service]
    H --- P0[mysql-0.mysql.svc]
    H --- P1[mysql-1.mysql.svc]
    H --- P2[mysql-2.svc]
    
    subgraph IPs
    P0 --> IP0[10.244.1.5]
    P1 --> IP1[10.244.2.8]
    P2 --> IP2[10.244.3.12]
    end
</div>

- **장점:** `mysql-0`이 재시작되어 IP가 바뀌더라도, DNS 이름(`mysql-0.mysql`)은 그대로 유지되어 다른 Pod들이 중단 없이 통신할 수 있습니다.

### 이유 2: 마스터/슬레이브 역할 구분 및 직접 통신
일반 서비스는 랜덤하게 트래픽을 보내기 때문에 "쓰기 작업을 위해 마스터(`mysql-0`)에게만 접속"하는 것이 불가능합니다.

- **Headless 방식:** 클라이언트가 DNS 조회를 통해 마스터 Pod의 주소를 직접 알아내고 그곳으로만 통신할 수 있습니다.

### 이유 3: 데이터 복제 토폴로지 구성
분산 DB(Kafka, MongoDB, MySQL 등)는 노드 간에 서로를 명확히 알고 데이터를 복제해야 합니다.

- **복제 흐름:** "나는 1번이고, 나의 데이터 부모는 0번이다"라는 정의가 가능해집니다.

---

## 3. 동작 원리 요약

<div class="mermaid">
sequenceDiagram
    participant C as Client (App)
    participant D as CoreDNS
    participant S as Headless Service
    
    C->>D: 1. mysql 서비스 주소 뭐야?
    D->>S: 2. Endpoints 확인
    S-->>D: 3. Pod A, B, C의 IP 목록 전달
    D-->>C: 4. [10.1.1.1, 10.1.1.2, 10.1.1.3] 반환
    C->>C: 5. (선택) 나는 mysql-0(10.1.1.1)로 갈래
    C->>C: 6. 직접 연결 시도
</div>

---

## 4. 핵심 정리

1.  **예측 가능성:** Pod 이름과 DNS 주소를 예측할 수 있게 해줍니다.
2.  **직접 접근:** 로드밸런서라는 장벽 없이 Pod와 1:1로 대화하게 해줍니다.
3.  **안정성:** Pod가 죽었다 살아나도 동일한 이름으로 찾을 수 있게 해줍니다.

**Headless Service는 StatefulSet이 단순한 컨테이너 묶음을 넘어, '정체성'을 가진 클러스터 시스템으로 동작하게 만드는 핵심 인프라입니다.**
