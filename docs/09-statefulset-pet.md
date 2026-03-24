# StatefulSet - Pet 적 특성을 가진 K8s 리소스

Kubernetes 는 기본적으로 **Cattle** 철학을 따르지만, **StatefulSet** 은 예외적으로 **Pet** 에 가까운 특성을 가집니다.

## 왜 StatefulSet 은 Pet 인가?

### 1. 고유한 식별자

```yaml
# Deployment (Cattle) - 모든 Pod 가 동일
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
```

```bash
# Deployment Pod 이름 - 무작위, 교체 가능
web-abc123-xyz
web-def456-uvw
web-ghi789-rst
# → 모두 동일하게 취급, 순서 없음
```

```yaml
# StatefulSet (Pet) - 각 Pod 가 고유한 정체성
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  template:
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
```

```bash
# StatefulSet Pod 이름 - 순차적, 예측 가능
mysql-0  # 항상 첫 번째, 마스터
mysql-1  # 항상 두 번째, 슬레이브
mysql-2  # 항상 세 번째, 슬레이브
# → 각 Pod 가 고유한 역할과 정체성
```

### 2. 안정적 네트워크 식별자

```bash
# Deployment - Pod 재생성 시 DNS 변경
web-abc123 → web-def456
# → 새 Pod 는 완전히 다른 이름

# StatefulSet - Pod 재생성 시 DNS 유지
mysql-0.mysql.default.svc.cluster.local
# → mysql-0 이 삭제되고 재생성되어도 동일한 DNS
# → 다른 Pod 들은 여전히 mysql-0 으로 접속
```

### 3. 순차적 배포 및 스케일링

```bash
# Deployment - 병렬 생성/삭제
kubectl scale deployment web --replicas=5
# → 5 개 Pod 가 동시에 생성

# StatefulSet - 순차적 생성/삭제
kubectl scale statefulset mysql --replicas=5
# → mysql-0, mysql-1, mysql-2, mysql-3, mysql-4 순서로 생성
# → 삭제 시 역순: mysql-4, mysql-3, mysql-2, mysql-1, mysql-0
```

### 4. 영구 저장소 연결

```yaml
# StatefulSet - 각 Pod 마다 전용 PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-mysql-0  # mysql-0 전용
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-mysql-1  # mysql-1 전용
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 10Gi
```

```bash
# Pod 삭제 후 재생성 시에도 동일한 PV 재연결
kubectl delete pod mysql-0
# → 새 mysql-0 이 생성되면 data-mysql-0 PV 가 자동으로 마운트
# → 데이터 유지됨
```

## StatefulSet 이 Pet 같은 이유

| 특성 | 설명 | Pet 유사성 |
|------|------|-----------|
| **고유한 이름** | `pod-0`, `pod-1` 등 순차적 네이밍 | ✅ 이름 붙인 서버 |
| **안정적 ID** | 재생성되어도 동일한 식별자 유지 | ✅ 개별 식별 |
| **순서 보장** | 생성/삭제 순서가 중요 | ✅ 순차적 관리 |
| **상태 저장** | 각 Pod 가 전용 저장소 보유 | ✅ 상태 유지 |
| **역할 분리** | 마스터/슬레이브 등 역할 고정 | ✅ 특수한 목적 |
| **수동 개입** | 장애 시 자동 교체보다 복구 우선 | ✅ 수리 중심 |

## StatefulSet 사용 사례

### 1. 데이터베이스 클러스터

```yaml
# MySQL Galera Cluster
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql-galera
spec:
  serviceName: mysql
  replicas: 3
  template:
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        # mysql-0: 마스터, mysql-1/2: 슬레이브
        command:
        - /bin/bash
        - -c
        - |
          if [ "$POD_NAME" = "mysql-0" ]; then
            # mysql-0 은 마스터로 시작
            exec mysqld --server-id=0
          else
            # 나머지는 슬레이브로 시작
            exec mysqld --server-id=${POD_NAME: -1}
          fi
```

### 2. 분산 캐시 (Redis Cluster)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis
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
        # redis-0 ~ redis-5: 각기 다른 노드 ID
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

### 3. 메시지 큐 (Kafka)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka
  replicas: 3
  template:
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.5.0
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        # kafka-0, kafka-1, kafka-2: 각기 다른 브로커 ID
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: zookeeper:2181
        - name: KAFKA_ADVERTISED_LISTENERS
          value: PLAINTEXT://$(POD_NAME).kafka:9092
```

## Pet vs Cattle vs StatefulSet

```
┌─────────────────────────────────────────────────────────────┐
│                     스펙트럼                                │
│                                                             │
│  Pure Pet    ←→    StatefulSet    ←→    Pure Cattle        │
│  (전통서버)        (K8s 예외)          (K8s 기본)           │
│                                                             │
│  ● 수동 관리       ● 자동화 + 순서     ● 완전 자동화        │
│  ● 고유 이름       ● 예측 가능 이름    ● 무작위 이름        │
│  ● 상태 저장       ● 상태 저장         ● 무상태             │
│  ● 수리 중심       ● 복구 중심         ● 교체 중심          │
│                                                             │
│  예: 물리서버       예: DB 클러스터     예: 웹 애플리케이션  │
└─────────────────────────────────────────────────────────────┘
```

## StatefulSet 의 한계와 주의점

### 1. 완전한 Pet 은 아님

```bash
# StatefulSet 도 일부 Cattle 특성 유지
kubectl delete pod mysql-0
# → Pod 는 자동 재생성됨 (수동 복구 아님)
# → 하지만 동일한 ID 와 저장소 유지
```

### 2. 복잡성

```bash
# Deployment: 간단함
kubectl apply -f deployment.yaml

# StatefulSet: 추가 구성 필요
# - Headless Service 필요
# - PV/PVC 사전 준비 또는 StorageClass 필요
# - 초기화 순서 고려
```

### 3. 운영 오버헤드

```
StatefulSet 사용 시 고려사항:
□ 데이터 백업 전략
□ 장애 복구 절차
□ 업그레이드 순서
□ 스케일링 계획
□ 모니터링 (각 Pod 별 상태)
```

## 요약

### StatefulSet 이 Pet 인 이유

```
1. 고유한 정체성 (mysql-0, mysql-1, mysql-2)
2. 안정적 식별자 (재생성되어도 동일 이름)
3. 순서와 의존성 (순차적 생성/삭제)
4. 상태 유지 (각 Pod 마다 전용 저장소)
5. 역할 고정 (마스터/슬레이브 등)
```

### 하지만 완전한 Pet 은 아님

```
- 자동 재생성 (Cattle 특성)
- 선언적 관리 (Cattle 특성)
- 표준화된 이미지 (Cattle 특성)
```

**StatefulSet 은 "관리되는 Pet" 또는 "Cattle 옷을 입은 Pet"이라고 할 수 있습니다.**

Kubernetes 는 StatefulSet 을 통해 상태 저장 애플리케이션도 실행할 수 있지만, 가능한 무상태 (Stateless) 아키텍처를 사용하는 것이 K8s 철학에 부합합니다.
