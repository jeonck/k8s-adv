# StatefulSet vs ReplicaSet - 상세 비교

Kubernetes 에서 Pod 를 관리하는 StatefulSet 과 ReplicaSet 은 서로 다른 목적과 특성을 가집니다.

## 기본 개념

### ReplicaSet

```
ReplicaSet 은 "동일한 Pod 를 여러 개 실행"하는 것이 목적입니다.

- 모든 Pod 가 완전히 동일
- 어느 Pod 나 교체 가능 (Cattle)
- 무상태 (Stateless) 애플리케이션용
- Deployment 에 의해 관리됨
```

### StatefulSet

```
StatefulSet 은 "고유한 정체성을 가진 Pod 를 관리"하는 것이 목적입니다.

- 각 Pod 가 고유한 ID 가짐
- 순서와 의존성 중요
- 상태 저장 (Stateful) 애플리케이션용
- 직접 관리
```

## 상세 비교 표

| 특성 | ReplicaSet (Deployment) | StatefulSet |
|------|------------------------|-------------|
| **Pod 이름** | 무작위 (`web-abc123`) | 순차적 (`mysql-0`, `mysql-1`) |
| **Pod 순서** | 병렬 생성/삭제 | 순차적 생성/삭제 |
| **네트워크 ID** | 예측 불가, 변경됨 | 안정적, 유지됨 |
| **저장소** | 모든 Pod 가 동일 PV 공유 | 각 Pod 마다 전용 PVC |
| **헤드리스 서비스** | 선택적 | 필수 |
| **사용 사례** | 웹서버, API, 프론트엔드 | DB, 캐시, 메시지큐 |
| **상태** | 무상태 (Stateless) | 상태 저장 (Stateful) |
| **확장** | 즉시 병렬 확장 | 순차적 확장 |
| **업데이트** | 롤링/블루그린 | 순차적 롤링 |
| **Pet/Cattle** | Cattle (가축) | Pet (애완동물) |

## 아키텍처 비교

### ReplicaSet (Deployment)

```
                    ┌─────────────────┐
                    │   Deployment    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   ReplicaSet    │
                    │  (desired: 3)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
   ┌─────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐
   │ Pod       │       │ Pod       │       │ Pod       │
   │ web-abc12 │       │ web-def34 │       │ web-ghi56 │
   │           │       │           │       │           │
   │  동일함   │       │  동일함   │       │  동일함   │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Service      │
                    │  (로드밸런싱)   │
                    └─────────────────┘
```

### StatefulSet

```
                    ┌─────────────────┐
                    │   StatefulSet   │
                    │  (desired: 3)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
   ┌─────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐
   │ Pod       │       │ Pod       │       │ Pod       │
   │ mysql-0   │       │ mysql-1   │       │ mysql-2   │
   │ (마스터)  │──────▶│ (슬레이브)│──────▶│ (슬레이브)│
   │           │       │           │       │           │
   │  PV-0     │       │  PV-1     │       │  PV-2     │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Headless Svc   │
                    │  (DNS 제공)     │
                    └─────────────────┘
```

## 실전 예시

### 1. ReplicaSet (Deployment) - 웹 애플리케이션

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
```

```bash
# 실행
kubectl apply -f deployment.yaml

# Pod 확인
kubectl get pods
# NAME                       READY   STATUS    RESTARTS   AGE
# web-app-6d4f5b6c7d-abc12   1/1     Running   0          1m
# web-app-6d4f5b6c7d-def34   1/1     Running   0          1m
# web-app-6d4f5b6c7d-ghi56   1/1     Running   0          1m

# 스케일링 (즉시, 병렬)
kubectl scale deployment web-app --replicas=5
# → 2 개 Pod 가 즉시 추가 생성됨

# Pod 삭제 (무작위 이름)
kubectl delete pod web-app-6d4f5b6c7d-abc12
# → 새 Pod: web-app-6d4f5b6c7d-jkl78 (완전히 다른 이름)
```

### 2. StatefulSet - MySQL 클러스터

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  labels:
    app: mysql
spec:
  ports:
  - port: 3306
    name: mysql
  clusterIP: None  # 헤드리스 서비스
  selector:
    app: mysql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

```bash
# 실행
kubectl apply -f statefulset.yaml

# Pod 확인 (순차적 이름)
kubectl get pods
# NAME     READY   STATUS    RESTARTS   AGE
# mysql-0  1/1     Running   0          2m
# mysql-1  1/1     Running   0          1m
# mysql-2  1/1     Running   0          1m

# DNS 확인 (안정적)
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- nslookup mysql-0.mysql
# Address 1: 10.244.1.5 mysql-0.mysql.default.svc.cluster.local

# 스케일링 (순차적)
kubectl scale statefulset mysql --replicas=5
# → mysql-3 생성 후 mysql-4 생성 (순서대로)

# Pod 삭제 (동일한 이름으로 재생성)
kubectl delete pod mysql-0
# → 새 Pod: mysql-0 (동일한 이름, 동일한 PV 연결)
```

## 시나리오별 비교

### 시나리오 1: Pod 장애 복구

```
ReplicaSet:
1. web-abc123 Pod 장애 감지
2. 즉시 새 Pod 생성: web-def456
3. 로드밸런서가 새 Pod 로 트래픽 전달
4. 완료 시간: ~30 초

StatefulSet:
1. mysql-0 Pod 장애 감지
2. 새 Pod 생성: mysql-0 (동일한 이름)
3. 기존 PV 연결, 데이터 복구 확인
4. 완료 시간: 수 분 (데이터 양에 따라)
```

### 시나리오 2: 롤링 업데이트

```
ReplicaSet (Deployment):
kubectl set image deployment/web-app nginx=nginx:1.26

1. web-new-001 생성 (v1.26)
2. 헬스체크 통과
3. web-old-abc 삭제
4. 반복...
→ 다운타임 없음, 병렬 처리

StatefulSet:
kubectl set image statefulset/mysql mysql=mysql:8.4

1. mysql-2 업데이트 (마지막부터)
2. mysql-2 헬스체크
3. mysql-1 업데이트
4. mysql-1 헬스체크
5. mysql-0 업데이트 (마스터, 마지막)
→ 순차적, 시간 소요
```

### 시나리오 3: 스케일링

```
ReplicaSet:
kubectl scale deployment web-app --replicas=10

[web-001, web-002, web-003] → [web-001~010]
→ 7 개 Pod 가 동시에 생성 (즉시)

StatefulSet:
kubectl scale statefulset mysql --replicas=5

[mysql-0, mysql-1, mysql-2] → [mysql-0~4]
→ mysql-3 생성 → 완료 → mysql-4 생성 (순차)
```

## 선택 가이드

### ReplicaSet (Deployment) 을 사용할 때

```
✅ 웹 서버, API 서버
✅ 프론트엔드 애플리케이션
✅ 배치 처리 워커
✅ 마이크로서비스
✅ 캐시 (Redis - 클러스터 모드 아닐 때)

조건:
- 무상태 (Stateless)
- 모든 인스턴스가 동일
- 빠른 스케일링 필요
- 단순한 관리 원함
```

### StatefulSet 을 사용할 때

```
✅ 데이터베이스 (MySQL, PostgreSQL, MongoDB)
✅ 분산 캐시 (Redis Cluster)
✅ 메시지 큐 (Kafka, RabbitMQ)
✅ 분산 저장소 (Ceph, Elasticsearch)
✅ 복제가 필요한 애플리케이션

조건:
- 상태 저장 (Stateful)
- 고유한 ID 필요
- 순서와 의존성 중요
- 안정적 네트워크 ID 필요
```

## 결정 트리

```
애플리케이션 상태 저장?
│
├─ No → ReplicaSet (Deployment)
│
└─ Yes
    │
    ├─ 각 인스턴스가 동일한 데이터?
    │   │
    │   └─ Yes → ReplicaSet + 공유 저장소
    │
    └─ 각 인스턴스가 고유한 데이터?
        │
        ├─ No → ReplicaSet
        │
        └─ Yes → StatefulSet
            │
            ├─ 순서 중요?
            │   └─ Yes → StatefulSet (확인)
            │
            └─ 안정적 ID 필요?
                └─ Yes → StatefulSet (확인)
```

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    ReplicaSet vs StatefulSet                │
├─────────────────────────────────────────────────────────────┤
│  ReplicaSet (Deployment)         StatefulSet                │
│  ─────────────────────           ─────────────              │
│  • 무상태 애플리케이션            • 상태 저장 애플리케이션      │
│  • 모든 Pod 동일                 • 각 Pod 고유한 ID          │
│  • 병렬 처리                     • 순차적 처리              │
│  • 빠른 스케일링                 • 신중한 스케일링          │
│  • Cattle (가축)                 • Pet (애완동물)           │
│  • 웹서버, API                   • DB, 캐시, MQ             │
└─────────────────────────────────────────────────────────────┘
```

**핵심:** 
- **ReplicaSet** 은 "동일한 것을 여러 개"
- **StatefulSet** 은 "고유한 것을 순서대로"

애플리케이션의 특성에 따라 올바른 선택이 필요합니다.
