# Operator 와 Custom Resource (CR) 관계

Operator 설치 후 Custom Resource 를 배포하는 이유와 CR 에 담기는 정보를 설명합니다.

---

## Operator 와 CR 의 관계

### 기본 개념

```
┌─────────────────────────────────────────────────────────────┐
│          Operator vs Custom Resource                        │
└─────────────────────────────────────────────────────────────┘

Operator:
  ┌─────────────────────────────────────────┐
  │  "운영 지식을 담은 자동화 로봇"         │
  │                                         │
  │  - 컨트롤러 (제어 로직)                 │
  │  - CRD (리소스 정의)                    │
  │  - 도메인 지식 (운영 로직)              │
  │                                         │
  │  예시: Database Operator                │
  │  - 데이터베이스 생성/관리 로직          │
  │  - 백업/복구 로직                       │
  │  - 업그레이드 로직                      │
  └─────────────────────────────────────────┘

Custom Resource (CR):
  ┌─────────────────────────────────────────┐
  │  "Operator 에게 주는 설정서/명령서"     │
  │                                         │
  │  - 구체적인 설정 값                     │
  │  - 원하는 상태 정의                     │
  │  - 인스턴스별 정보                      │
  │                                         │
  │  예시: my-mysql (CR)                    │
  │  - dbName: production-db                │
  │  - port: 3306                           │
  │  - storageSize: 100Gi                   │
  │  - replicas: 3                          │
  └─────────────────────────────────────────┘

관계:
  ┌─────────────────────────────────────────┐
  │  Operator = 공장 (설비/로봇/공정)       │
  │  CR     = 설계도/주문서                 │
  │                                         │
  │  1. 공장 (Operator) 먼저 건설           │
  │  2. 설계도 (CR) 제출                    │
  │  3. 공장서 제품 (Database) 생산         │
  └─────────────────────────────────────────┘
```

---

## 1. 왜 Operator 를 먼저 설치하는가?

### 이유 1: CRD 가 먼저 존재해야 함

```
┌─────────────────────────────────────────────────────────────┐
│          이유 1: CRD 가 먼저 존재해야 함                    │
└─────────────────────────────────────────────────────────────┘

문제:
  CR 을 생성하려면 해당 CRD 가 먼저 클러스터에 등록되어야 함

순서:
  1. Operator 설치
     └─ Operator 가 CRD 등록
        └─ databases.example.com CRD 생성
  
  2. CR 생성
     └─ databases.example.com 리소스 생성 가능

잘못된 순서:
  1. CR 생성 시도
     └─ 오류: "resource type not found"
        CRD 가 없어서 Kubernetes 가 인식 불가
  
  2. Operator 설치
     └─ 너무 늦음

예시:
  # 1. Operator 설치 (CRD 포함)
  kubectl apply -f operator.yaml
  
  # Operator 가 자동으로 CRD 등록
  # databases.example.com CRD 생성됨
  
  # 2. 이제 CR 생성 가능
  kubectl apply -f my-database.yaml
  # 성공!
  
  # 만약 순서가 반대라면:
  kubectl apply -f my-database.yaml
  # 오류: no matches for kind Database in version example.com/v1
```

### 이유 2: 컨트롤러가 실행 중이어야 함

```
┌─────────────────────────────────────────────────────────────┐
│          이유 2: 컨트롤러가 실행 중이어야 함                │
└─────────────────────────────────────────────────────────────┘

문제:
  CR 이 생성되어도 컨트롤러가 없으면 아무 일도 일어나지 않음

Operator 의 역할:
  ┌─────────────────────────────────────────┐
  │  CR 감시 → 해석 → 조치                 │
  │                                         │
  │  1. CR 생성 감지 (Watch)               │
  │  2. CR 스펙 해석 (Parse)               │
  │  3. 실제 리소스 생성 (Act)             │
  │     - Deployment 생성                   │
  │     - Service 생성                      │
  │     - ConfigMap 생성                    │
  │     - 등...                             │
  └─────────────────────────────────────────┘

잘못된 순서:
  1. CR 생성
     └─ CR 은 생성됨 (kubectl get crd 확인 가능)
  
  2. 하지만 컨트롤러가 없음
     └─ 아무 일도 일어나지 않음
     └─ 실제 Pod, Service 등 생성 안 됨
     └─ "Pending" 상태로 방치
  
  3. Operator 설치
     └─ 이제야 컨트롤러가 CR 감지
     └─ 실제 리소스 생성 시작

올바른 순서:
  1. Operator 설치
     └─ 컨트롤러 실행 시작
     └─ CR 감시 시작
  
  2. CR 생성
     └─ 컨트롤러가 즉시 감지
     └─ 실제 리소스 생성 시작
     └─ 애플리케이션 실행
```

### 이유 3: RBAC 권한 설정

```
┌─────────────────────────────────────────────────────────────┐
│          이유 3: RBAC 권한 설정                             │
└─────────────────────────────────────────────────────────────┘

Operator 설치 시 함께 생성:
  ┌─────────────────────────────────────────┐
  │  ServiceAccount                         │
  │  - Operator 의 신원                     │
  │                                         │
  │  ClusterRole                            │
  │  - Operator 의 권한                     │
  │  - Pod 생성/수정/삭제                   │
  │  - Service 생성/수정/삭제               │
  │  - CRD 읽기/쓰기                        │
  │                                         │
  │  ClusterRoleBinding                     │
  │  - ServiceAccount 와 ClusterRole 연결   │
  └─────────────────────────────────────────┘

CR 이 먼저 생성되면:
  └─ Operator 가 권한 없음
  └─ CR 을 읽을 수 없음
  └─ 아무 조치도 취할 수 없음

올바른 순서:
  1. Operator 설치
     └─ ServiceAccount 생성
     └─ ClusterRole 생성
     └─ ClusterRoleBinding 생성
  
  2. CR 생성
     └─ Operator 가 권한으로 CR 읽기
     └─ 실제 리소스 생성
```

### 이유 4: 의존성 관리

```
┌─────────────────────────────────────────────────────────────┐
│          이유 4: 의존성 관리                                │
└─────────────────────────────────────────────────────────────┘

Operator 는 종종 다른 리소스에 의존:

예시 (Database Operator):
  ┌─────────────────────────────────────────┐
  │  Operator 가 필요로 하는 것:            │
  │  - Secret (비밀번호 저장)               │
  │  - StorageClass (저장소)                │
  │  - NetworkPolicy (네트워크)             │
  │  - 등...                                │
  └─────────────────────────────────────────┘

Operator 설치 시:
  └─ 필요한 의존성도 함께 설치
  └─ Secret 템플릿 생성
  └─ StorageClass 확인
  └─ 모든 준비 완료

CR 먼저 생성 시:
  └─ 의존성 없음
  └─ Secret 없음 (비밀번호 저장 불가)
  └─ StorageClass 없음 (저장소 할당 불가)
  └─ 실패!
```

---

## 2. CR 에 담기는 대표적인 정보

### CR 구조

```yaml
# 일반적인 CR 구조
apiVersion: example.com/v1          # API 그룹과 버전
kind: Database                       # 리소스 종류
metadata:
  name: my-database                  # 리소스 이름
  namespace: default                 # 네임스페이스
  labels:                            # 라벨 (선택)
    app: my-app
    environment: production
  annotations:                       # 어노테이션 (선택)
    description: "Production database"
spec:                                # ★ 원하는 상태 (핵심!)
  # 여기에 구체적인 설정 작성
status:                              # 현재 상태 (Operator 가 업데이트)
  # Operator 가 자동으로 업데이트
```

### spec 에 담기는 정보 (핵심!)

```
┌─────────────────────────────────────────────────────────────┐
│          spec 에 담기는 정보                                │
└─────────────────────────────────────────────────────────────┘

spec 은 "원하는 상태 (Desired State)"를 정의:
  - "이런 애플리케이션을 원한다"
  - "이런 설정으로 실행해라"
  - "이런 크기로 확장해라"
```

#### 1. 애플리케이션 식별 정보

```yaml
# 데이터베이스 종류와 버전
spec:
  # 데이터베이스 종류
  type: mysql              # mysql, postgresql, redis 등
  version: "8.0"           # 버전
  
  # 또는 이미지 직접 지정
  image: mysql:8.0.32      # 컨테이너 이미지
  imagePullPolicy: IfNotPresent
```

#### 2. 리소스 크기 및 용량

```yaml
# 컴퓨팅 리소스
spec:
  # CPU/Memory
  resources:
    requests:
      cpu: 500m            # 요청 CPU (0.5 코어)
      memory: 512Mi        # 요청 메모리 (512MB)
    limits:
      cpu: 1000m           # 최대 CPU (1 코어)
      memory: 1Gi          # 최대 메모리 (1GB)
  
  # 저장소
  storage:
    size: 100Gi            # 저장소 크기
    storageClass: fast-ssd # StorageClass 이름
    accessModes:
      - ReadWriteOnce
```

#### 3. 복제본 및 확장 설정

```yaml
# 고가용성 및 확장
spec:
  # 복제본 수
  replicas: 3              # Pod 복제본 수
  
  # 고가용성 설정
  highAvailability:
    enabled: true          # HA 활성화
    minReplicas: 2         # 최소 복제본
    maxReplicas: 10        # 최대 복제본
  
  # 자동 확장
  autoScaling:
    enabled: true
    targetCPUUtilization: 80  # 목표 CPU 사용률
    targetMemoryUtilization: 80  # 목표 메모리 사용률
```

#### 4. 네트워크 설정

```yaml
# 네트워크 구성
spec:
  # 포트
  port: 3306               # 서비스 포트
  
  # 서비스 타입
  serviceType: ClusterIP   # ClusterIP, NodePort, LoadBalancer
  
  # Ingress 설정
  ingress:
    enabled: true
    host: db.example.com
    tls:
      enabled: true
      secretName: db-tls-secret
  
  # 네트워크 정책
  networkPolicy:
    enabled: true
    allowedNamespaces:
      - default
      - app-namespace
    allowedCIDRs:
      - 10.0.0.0/8
```

#### 5. 보안 설정

```yaml
# 보안 구성
spec:
  # 인증 정보
  credentials:
    rootPasswordSecret: mysql-root-password  # Secret 이름
    userName: app-user
    userPasswordSecret: mysql-app-password
  
  # 암호화
  encryption:
    enabled: true
    tlsSecret: mysql-tls
  
  # 보안 컨텍스트
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
```

#### 6. 백업 및 복구 설정

```yaml
# 백업 구성
spec:
  backup:
    enabled: true
    schedule: "0 2 * * *"        # 매일 오전 2 시 (cron)
    retentionDays: 30            # 백업 보관 기간
    
    # 백업 저장소
    storage:
      type: s3                   # s3, gcs, azure, local
      bucket: my-backups
      prefix: mysql/prod
      secret: s3-credentials
    
    # 백업 타입
    backupType: full             # full, incremental, differential
```

#### 7. 모니터링 설정

```yaml
# 모니터링 구성
spec:
  monitoring:
    enabled: true
    
    # Prometheus
    prometheus:
      enabled: true
      scrapeInterval: 30s        # 수집 간격
    
    # 메트릭
    metrics:
      enabled: true
      port: 9104                 # 메트릭 포트
    
    # 알림
    alerting:
      enabled: true
      rules:
        - alert: DatabaseDown
          expr: mysql_up == 0
          for: 5m
```

#### 8. 업그레이드 전략

```yaml
# 업그레이드 구성
spec:
  upgrade:
    # 자동 업그레이드
    autoUpgrade: false           # 자동 업그레이드 여부
    
    # 업그레이드 전략
    strategy: RollingUpdate      # RollingUpdate, Recreate
    
    # 롤링 업데이트 설정
    rollingUpdate:
      maxSurge: 1                # 최대 추가 Pod
      maxUnavailable: 0          # 최대 사용 불가 Pod
    
    # 버전 핀
    targetVersion: "8.0.32"      # 목표 버전
```

#### 9. 고급 설정

```yaml
# 고급 구성
spec:
  # 설정 오버라이드
  config:
    override: |
      [mysqld]
      max_connections = 1000
      innodb_buffer_pool_size = 2G
      log_bin = /var/log/mysql/mysql-bin.log
  
  # 초기화 스크립트
  initScripts:
    - name: init-db
      configMap: my-init-scripts
  
  # 사이드카 컨테이너
  sidecars:
    - name: proxy
      image: proxy:1.0
      ports:
        - containerPort: 8080
  
  # Pod 어피니티
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: disktype
                operator: In
                values:
                  - ssd
```

### status 에 담기는 정보 (Operator 가 업데이트)

```
┌─────────────────────────────────────────────────────────────┐
│          status 에 담기는 정보                              │
└─────────────────────────────────────────────────────────────┘

status 는 Operator 가 자동으로 업데이트:
  - "현재 상태는 이렇다"
  - "몇 개가 실행 중이다"
  - "에러가 발생했다"
  - 사용자는 읽기만 가능 (수정 불가)
```

#### status 예시

```yaml
status:
  # 전체 상태
  phase: Running               # Pending, Running, Failed, etc.
  
  # 복제본 상태
  replicas: 3                  # 원하는 복제본 수
  readyReplicas: 3             # 준비된 복제본 수
  availableReplicas: 3         # 사용 가능한 복제본 수
  
  # 현재 버전
  currentVersion: "8.0.32"
  
  # 엔드포인트
  endpoint:
    host: mysql.default.svc.cluster.local
    port: 3306
  
  # 백업 상태
  backup:
    lastBackupTime: "2024-01-15T02:00:00Z"
    lastBackupStatus: Success
    nextBackupTime: "2024-01-16T02:00:00Z"
  
  # 조건 (Conditions)
  conditions:
    - type: Ready
      status: "True"
      lastTransitionTime: "2024-01-15T10:00:00Z"
      reason: AllReplicasReady
      message: All replicas are ready
    
    - type: BackupEnabled
      status: "True"
      lastTransitionTime: "2024-01-15T10:00:00Z"
      reason: BackupConfigured
      message: Backup is configured successfully
  
  # 메시지
  message: Database is running successfully
```

---

## 3. 전체 예제: MySQL Operator 와 CR

### Operator 설치 (먼저)

```yaml
# 1. Operator 설치
# mysql-operator.yaml

---
apiVersion: v1
kind: Namespace
metadata:
  name: mysql-operator

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: mysqls.database.example.com
spec:
  group: database.example.com
  versions:
    - name: v1
      served: true
      storage: true
      subresources:
        status: {}
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                replicas:
                  type: integer
                storageSize:
                  type: string
                version:
                  type: string
                backup:
                  type: object
            status:
              type: object
  scope: Namespaced
  names:
    plural: mysqls
    singular: mysql
    kind: MySQL
    shortNames:
      - mysql

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-operator
  namespace: mysql-operator
spec:
  replicas: 1
  selector:
    matchLabels:
      name: mysql-operator
  template:
    metadata:
      labels:
        name: mysql-operator
    spec:
      serviceAccountName: mysql-operator
      containers:
        - name: operator
          image: example/mysql-operator:v1.0.0
```

```bash
# Operator 설치
kubectl apply -f mysql-operator.yaml

# 확인
kubectl get pods -n mysql-operator
# NAME                              READY   STATUS    RESTARTS   AGE
# mysql-operator-6d4f5b6c7d-abc12   1/1     Running   0          1m

kubectl get crd
# NAME                    CREATED AT
# mysqls.database.example.com   2024-01-15T10:00:00Z
```

### CR 배포 (나중에)

```yaml
# 2. CR 생성 (Operator 설치 후!)
# my-mysql.yaml

apiVersion: database.example.com/v1
kind: MySQL
metadata:
  name: production-mysql
  namespace: default
  labels:
    app: production
    environment: prod
spec:
  # 애플리케이션 식별
  version: "8.0.32"
  
  # 리소스 크기
  replicas: 3
  storageSize: 100Gi
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  
  # 네트워크
  port: 3306
  serviceType: ClusterIP
  
  # 보안
  credentials:
    rootPasswordSecret: mysql-root-password
  
  # 백업
  backup:
    enabled: true
    schedule: "0 2 * * *"
    retentionDays: 30
  
  # 모니터링
  monitoring:
    enabled: true
```

```bash
# CR 생성 (Operator 가 실행 중인 상태에서)
kubectl apply -f my-mysql.yaml

# 확인
kubectl get mysql
# NAME               REPLICAS   STATUS    AGE
# production-mysql   3          Running   10s

kubectl get mysql production-mysql -o yaml
# spec 과 status 모두 확인 가능

kubectl describe mysql production-mysql
# 상세 정보 확인
```

### Operator 의 동작

```
┌─────────────────────────────────────────────────────────────┐
│          CR 생성 후 Operator 의 동작                        │
└─────────────────────────────────────────────────────────────┘

1. CR 감지 (Watch)
   └─ MySQL CR 생성 이벤트 감지

2. CR 해석 (Parse)
   └─ spec 읽기:
      - replicas: 3
      - storageSize: 100Gi
      - version: 8.0.32
      - backup.enabled: true

3. 실제 리소스 생성 (Act)
   ├─ StatefulSet 생성 (3 복제본)
   ├─ Service 생성 (포트 3306)
   ├─ PersistentVolumeClaim 생성 (100Gi)
   ├─ Secret 생성 (비밀번호)
   ├─ CronJob 생성 (백업)
   └─ ServiceMonitor 생성 (모니터링)

4. 상태 업데이트 (Status)
   └─ status 업데이트:
      - phase: Running
      - replicas: 3
      - readyReplicas: 3
      - message: MySQL is running

5. 지속적 감시 (Reconcile)
   └─ 5 분마다 상태 확인
      - Pod 죽었으면 재생성
      - 설정 변경되면 업데이트
      - 백업 시간되면 백업 실행
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    Operator 와 CR 요약                      │
├─────────────────────────────────────────────────────────────┤
│  1. Operator 를 먼저 설치하는 이유                          │
│     - CRD 가 먼저 존재해야 CR 생성 가능                    │
│     - 컨트롤러가 실행 중이어야 CR 처리 가능                │
│     - RBAC 권한이 먼저 설정되어야 함                       │
│     - 의존성 (Secret, StorageClass) 준비                   │
│                                                             │
│  2. CR 에 담기는 정보 (spec)                                │
│     - 애플리케이션 식별 (type, version, image)             │
│     - 리소스 크기 (CPU, Memory, Storage)                   │
│     - 복제본 및 확장 (replicas, autoScaling)               │
│     - 네트워크 (port, serviceType, ingress)                │
│     - 보안 (credentials, encryption)                       │
│     - 백업 (schedule, retention, storage)                  │
│     - 모니터링 (prometheus, metrics, alerting)             │
│     - 업그레이드 (strategy, targetVersion)                 │
│     - 고급 설정 (config, sidecars, affinity)               │
│                                                             │
│  3. status 에 담기는 정보 (Operator 가 업데이트)            │
│     - phase (전체 상태)                                    │
│     - replicas (복제본 상태)                               │
│     - conditions (상세 조건)                               │
│     - endpoint (접속 정보)                                 │
│     - backup (백업 상태)                                   │
│                                                             │
│  4. 전체 흐름                                               │
│     Operator 설치 → CRD 등록 → CR 생성 → 리소스 생성       │
└─────────────────────────────────────────────────────────────┘
```

### 비유로 정리

```
┌─────────────────────────────────────────────────────────────┐
│                    비유로 정리                              │
└─────────────────────────────────────────────────────────────┘

Operator = 아파트 단지 관리사무소
CR     = 입주 계약서

순서:
  1. 관리사무소 먼저 설립 (Operator 설치)
     - 직원 채용 (컨트롤러 실행)
     - 권한 부여 (RBAC 설정)
     - 장비 구비 (의존성 준비)
  
  2. 입주 계약서 작성 (CR 생성)
     - 동호수: 101 동 101 호 (name, namespace)
     - 평수: 34 평 (storageSize)
     - 주차공간: 2 대 (resources)
     - 관리비 자동이체 (backup)
     - CCTV 설치 (monitoring)
  
  3. 관리사무소가 처리
     - 문키 발급 (Service 생성)
     - 주차카드 발급 (Ingress 설정)
     - 관리비 청구 (Backup 실행)
     - 상태 업데이트 (status 업데이트)

관리사무소 없이 계약서만 있으면?
  → 아무도 처리 안 해줌!
  → 관리사무소가 먼저 있어야 함!
```

**Operator 는 CRD 와 컨트롤러를 포함하므로 먼저 설치해야 합니다. CR 은 Operator 에게 주는 구체적인 설정서로, 애플리케이션의 원하는 상태 (spec) 를 정의하며, Operator 가 실제 리소스를 생성하고 상태 (status) 를 업데이트합니다.**
