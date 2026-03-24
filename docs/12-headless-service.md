# StatefulSet 에서 Headless Service 가 필요한 이유

StatefulSet 을 사용할 때 Headless Service 가 필수적인 이유를 자세히 살펴봅니다.

## Headless Service 란?

### 일반 Service vs Headless Service

```yaml
# 일반 Service (ClusterIP)
apiVersion: v1
kind: Service
metadata:
  name: normal-service
spec:
  type: ClusterIP
  clusterIP: 10.96.100.50  # ← 가상 IP 할당
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80

# 트래픽 흐름:
# Client → ClusterIP (10.96.100.50) → kube-proxy → Pod (로드밸런싱)
```

```yaml
# Headless Service
apiVersion: v1
kind: Service
metadata:
  name: headless-service
spec:
  clusterIP: None  # ← IP 를 할당하지 않음 (null)
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306

# 트래픽 흐름:
# Client → DNS 조회 → Pod 의 실제 IP (직접 접속)
```

### 핵심 차이점

| 특성 | 일반 Service | Headless Service |
|------|-------------|------------------|
| **ClusterIP** | 가상 IP 할당 | `None` (할당 안 함) |
| **로드밸런싱** | kube-proxy 가 라우팅 | 없음 (직접 접속) |
| **DNS 응답** | 단일 IP (ClusterIP) | 여러 IP (모든 Pod IP) |
| **사용 목적** | 트래픽 분산 | 개별 Pod 직접 접근 |

---

## StatefulSet 에 Headless Service 가 필요한 이유

### 이유 1: 안정적 네트워크 식별자 제공

```
StatefulSet 의 핵심 기능: 각 Pod 가 고유한 DNS 이름을 가짐

Pod 이름: mysql-0, mysql-1, mysql-2
DNS 이름: mysql-0.mysql.default.svc.cluster.local
         mysql-1.mysql.default.svc.cluster.local
         mysql-2.mysql.default.svc.cluster.local
         └──────┘ └─────┘
            │       │
            │       └─ Headless Service 이름
            │
            └─ Pod 인덱스
```

#### DNS 조회 과정

```bash
# 1. 일반 Service 로 DNS 조회
nslookup mysql.default.svc.cluster.local
# Name:   mysql.default.svc.cluster.local
# Address: 10.96.100.50  # ← 단일 ClusterIP 만 반환

# 2. Headless Service 로 DNS 조회
nslookup mysql.default.svc.cluster.local
# Name:   mysql.default.svc.cluster.local
# Address: 10.244.1.5   # ← mysql-0 의 실제 IP
# Name:   mysql.default.svc.cluster.local
# Address: 10.244.2.6   # ← mysql-1 의 실제 IP
# Name:   mysql.default.svc.cluster.local
# Address: 10.244.3.7   # ← mysql-2 의 실제 IP
# → 모든 Pod 의 IP 를 반환

# 3. 개별 Pod DNS 조회
nslookup mysql-0.mysql.default.svc.cluster.local
# Name:   mysql-0.mysql.default.svc.cluster.local
# Address: 10.244.1.5   # ← mysql-0 의 실제 IP
```

### 이유 2: Pod 간 직접 통신

```
일반 Service 를 사용하면:
Client → ClusterIP → kube-proxy → Pod
         │
         └─ 로드밸런싱 발생 (어느 Pod 로 갈지 모름)
         └─ mysql-0 에 연결하고 싶은데 mysql-2 로 갈 수 있음

Headless Service 를 사용하면:
Client → DNS 조회 → mysql-0 의 실제 IP → mysql-0 으로 직접 연결
         └─ 특정 Pod 를 정확히 지정 가능
```

#### MySQL 클러스터 예시

```yaml
# StatefulSet with Headless Service
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  clusterIP: None  # Headless
  selector:
    app: mysql
  ports:
  - port: 3306
    name: mysql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql  # ← 이 이름으로 DNS 생성
  replicas: 3
  template:
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

```bash
# mysql-0 (마스터) 에 직접 연결
mysql -h mysql-0.mysql -u root -p

# mysql-1 (슬레이브) 에 직접 연결
mysql -h mysql-1.mysql -u root -p

# mysql-2 (슬레이브) 에 직접 연결
mysql -h mysql-2.mysql -u root -p

# 각 Pod 가 고유한 역할을 수행 (마스터/슬레이브)
```

### 이유 3: 데이터 복제 토폴로지 구현

```
MySQL Galera Cluster 토폴로지:

         ┌─────────────┐
         │  mysql-0    │  ← 마스터 (쓰기 전용)
         │  (Master)   │
         └──────┬──────┘
                │ 복제
         ┌──────┴──────┐
         ▼             ▼
  ┌─────────────┐ ┌─────────────┐
  │  mysql-1    │ │  mysql-2    │
  │  (Slave)    │ │  (Slave)    │
  └─────────────┘ └─────────────┘
       읽기 전용        읽기 전용

# 각 Pod 는 고정된 역할:
# - mysql-0: 항상 마스터
# - mysql-1: 항상 슬레이브 1
# - mysql-2: 항상 슬레이브 2
```

#### 복제 설정

```bash
# mysql-0 (마스터) 설정
# 다른 Pod 들이 mysql-0.mysql 로 연결하여 복제

# mysql-1 (슬레이브) 설정
CHANGE MASTER TO
  MASTER_HOST='mysql-0.mysql',
  MASTER_USER='replication',
  MASTER_PASSWORD='password';

# mysql-2 (슬레이브) 설정
CHANGE MASTER TO
  MASTER_HOST='mysql-0.mysql',
  MASTER_USER='replication',
  MASTER_PASSWORD='password';

# Headless Service 가 없으면:
# - mysql-0.mysql DNS 가 해결되지 않음
# - ClusterIP 는 가상 IP 라 특정 Pod 를 지칭할 수 없음
```

### 이유 4: Pod 재생성 시 동일한 네트워크 ID 유지

```
StatefulSet Pod 삭제 및 재생성 시나리오:

1. mysql-0 Pod 삭제
   kubectl delete pod mysql-0

2. 새 mysql-0 Pod 생성 (동일한 이름)
   StatefulSet 이 자동으로 mysql-0 재생성

3. 네트워크 ID 유지
   - DNS: mysql-0.mysql (동일)
   - IP: 변경될 수 있음 (새 Pod)
   - 하지만 DNS 는 동일하게 유지

4. 다른 Pod 들은 여전히 mysql-0.mysql 로 접속
   - IP 는 자동으로 업데이트됨 (DNS)
   - 설정 변경 불필요
```

#### DNS 업데이트 과정

```
Before (mysql-0 IP: 10.244.1.5):
mysql-0.mysql → 10.244.1.5

mysql-0 삭제 후 재생성 (새 IP: 10.244.1.10):
mysql-0.mysql → 10.244.1.10

CoreDNS 가 자동으로 업데이트:
- Endpoints 객체가 새 IP 로 업데이트
- DNS 조회 시 새 IP 반환
```

---

## 동작 원리

### Kubernetes DNS (CoreDNS) 동작

```yaml
# Endpoints 객체 (Headless Service)
apiVersion: v1
kind: Endpoints
metadata:
  name: mysql
subsets:
- addresses:
  - ip: 10.244.1.5    # mysql-0
    targetRef:
      name: mysql-0
  - ip: 10.244.2.6    # mysql-1
    targetRef:
      name: mysql-1
  - ip: 10.244.3.7    # mysql-2
    targetRef:
      name: mysql-2
  ports:
  - port: 3306
```

```
DNS 조회 과정:

1. Client 가 mysql.default.svc.cluster.local 조회

2. CoreDNS 가 Endpoints 객체 확인

3. 모든 Pod IP 반환:
   mysql.default.svc.cluster.local → 
     - 10.244.1.5 (mysql-0)
     - 10.244.2.6 (mysql-1)
     - 10.244.3.7 (mysql-2)

4. 개별 Pod 조회:
   mysql-0.mysql.default.svc.cluster.local → 10.244.1.5
   mysql-1.mysql.default.svc.cluster.local → 10.244.2.6
   mysql-2.mysql.default.svc.cluster.local → 10.244.3.7
```

### StatefulSet 과 Endpoints 연동

```
StatefulSet Controller
        │
        │ Pod 생성/삭제 감지
        ▼
Endpoints Controller
        │
        │ Endpoints 객체 업데이트
        ▼
CoreDNS
        │
        │ DNS 레코드 업데이트
        ▼
Client
        │
        │ 최신 IP 로 접속
        ▼
Pod
```

---

## 비교: Service 타입별 StatefulSet 사용

### ClusterIP + StatefulSet (잘못된 구성)

```yaml
# ❌ 잘못된 예
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  type: ClusterIP
  clusterIP: 10.96.100.50  # 가상 IP
  selector:
    app: mysql

# 문제점:
# 1. mysql-0.mysql DNS 가 생성되지 않음
# 2. ClusterIP 는 로드밸런싱 (특정 Pod 지정 불가)
# 3. 마스터/슬레이브 구분 불가
# 4. Pod 간 복제 설정 불가
```

### Headless Service + StatefulSet (올바른 구성)

```yaml
# ✅ 올바른 예
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  clusterIP: None  # Headless
  selector:
    app: mysql

# 장점:
# 1. mysql-0.mysql DNS 생성됨
# 2. 특정 Pod 직접 접속 가능
# 3. 마스터/슬레이브 역할 고정
# 4. Pod 간 복제 설정 가능
```

### 일반 Service 도 함께 사용하는 경우

```yaml
# Headless Service (Pod 간 통신용)
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
  - port: 3306
    name: mysql

# 일반 Service (클라이언트 접속용)
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  type: ClusterIP
  selector:
    app: mysql
  ports:
  - port: 3306
    name: mysql

# 사용법:
# - Pod 간 복제: mysql-0.mysql-headless, mysql-1.mysql-headless
# - 클라이언트 접속: mysql (로드밸런싱)
```

---

## 실제 사용 예시

### Redis Cluster

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
spec:
  clusterIP: None  # Headless
  selector:
    app: redis
  ports:
  - port: 6379
    name: redis
    targetPort: 6379
  - port: 16379
    name: bus
    targetPort: 16379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6
  template:
    spec:
      containers:
      - name: redis
        image: redis:7.0
        command:
        - redis-server
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - /data/nodes.conf

# 각 노드:
# redis-cluster-0.redis-cluster ~ redis-cluster-5.redis-cluster
# → 6 개 노드가 클러스터 형성
```

### Kafka

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-headless
spec:
  clusterIP: None
  selector:
    app: kafka
  ports:
  - port: 9092
    name: broker
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka-headless
  replicas: 3
  template:
    spec:
      containers:
      - name: kafka
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        # kafka-headless-0, kafka-headless-1, kafka-headless-2
        # 각 브로커가 고유한 ID 를 가짐

# 프로듀서/컨슈머는 특정 브로커로 직접 연결 가능
```

---

## 요약

### Headless Service 가 필요한 이유

```
┌─────────────────────────────────────────────────────────────┐
│  StatefulSet + Headless Service 필수                        │
├─────────────────────────────────────────────────────────────┤
│  1. 안정적 네트워크 식별자                                  │
│     - mysql-0.mysql, mysql-1.mysql 등 고유 DNS              │
│     - Pod 재생성되어도 동일한 DNS 유지                     │
│                                                             │
│  2. Pod 간 직접 통신                                        │
│     - 로드밸런싱 없이 특정 Pod 로 직접 연결                │
│     - 마스터/슬레이브 역할 고정                            │
│                                                             │
│  3. 데이터 복제 토폴로지                                    │
│     - 마스터 → 슬레이브 복제 경로 설정                     │
│     - 각 Pod 가 고정된 역할 수행                           │
│                                                             │
│  4. Endpoints 연동                                          │
│     - Pod IP 변경 시 자동 업데이트                         │
│     - DNS 를 통한 최신 IP 제공                             │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 정리

```
StatefulSet = 고유한 정체성을 가진 Pod 관리
     ↓
고유한 DNS 이름 필요
     ↓
Headless Service (clusterIP: None)
     ↓
안정적 네트워크 식별자 제공
     ↓
Pod 간 직접 통신 및 복제 가능
```

**Headless Service 는 StatefulSet 이 제 기능을 하기 위한 필수 인프라입니다.**
