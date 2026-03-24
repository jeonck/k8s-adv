# CustomResourceDefinition (CRD)

Kubernetes API 를 확장하여 사용자 정의 리소스를 생성하는 방법입니다.

---

## CRD 란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          CustomResourceDefinition (CRD)                     │
└─────────────────────────────────────────────────────────────┘

정의:
  - Kubernetes API 를 확장하는 방법
  - 사용자 정의 리소스 타입 생성
  - kubectl 로 관리 가능

목적:
  - Kubernetes 에 없는 리소스 타입 추가
  - 애플리케이션 특화 리소스 정의
  - Operator 패턴의 기반

비유:
  ┌─────────────────────────────────────────┐
  │  Kubernetes 기본 리소스:                │
  │  - Pod, Deployment, Service             │
  │  (기성복 - 모두 같은 것 사용)           │
  │                                         │
  │  CRD:                                   │
  │  - Database, Cache, Monitoring          │
  │  (맞춤복 - 내가 디자인하여 사용)        │
  └─────────────────────────────────────────┘
```

### CRD vs 기본 리소스

```
┌─────────────────────────────────────────────────────────────┐
│          CRD vs Kubernetes 기본 리소스                      │
└─────────────────────────────────────────────────────────────┘

Kubernetes 기본 리소스:
  ┌─────────────────────────────────────────┐
  │  - Pod                                  │
  │  - Deployment                           │
  │  - Service                              │
  │  - ConfigMap                            │
  │  - Secret                               │
  │  - 등...                                │
  │                                         │
  │  특징:                                  │
  │  - Kubernetes 에 내장됨                 │
  │  - 모든 클러스터에서 동일               │
  │  - 수정 불가                            │
  └─────────────────────────────────────────┘

CRD (사용자 정의 리소스):
  ┌─────────────────────────────────────────┐
  │  - Database                             │
  │  - RedisCluster                         │
  │  - MonitoringStack                      │
  │  - MyApplication                        │
  │  - 등... (무한정 생성 가능)             │
  │                                         │
  │  특징:                                  │
  │  - 사용자가 정의                        │
  │  - 클러스터별로 다름                    │
  │  - 수정/삭제 가능                       │
  └─────────────────────────────────────────┘
```

---

## 1 단계: 간단한 CRD 생성

### CRD YAML 정의

```yaml
# database-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  # 리소스 그룹과 버전
  group: example.com
  versions:
  - name: v1
    served: true             # 이 버전으로 서비스
    storage: true            # 이 버전을 기본 저장소
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              dbName:
                type: string
                description: 데이터베이스 이름
              port:
                type: integer
                description: 포트 번호
                minimum: 1
                maximum: 65535
              storageSize:
                type: string
                description: 저장소 크기
                pattern: "^\\d+(Gi|Mi)$"
              replicas:
                type: integer
                description: 복제본 수
                minimum: 1
                maximum: 10
  # 리소스 범위
  scope: Namespaced          # 네임스페이스 단위
  names:
    plural: databases        # 복수형 (kubectl get databases)
    singular: database       # 단수형
    kind: Database           # Kind 이름
    shortNames:              # 단축 이름
    - db
```

### CRD 적용

```bash
# CRD 생성
kubectl apply -f database-crd.yaml

# 출력:
# customresourcedefinition.apiextensions.k8s.io/databases.example.com created

# CRD 확인
kubectl get crd

# 출력:
# NAME                    CREATED AT
# databases.example.com   2024-01-15T10:00:00Z

# CRD 상세 정보
kubectl get crd databases.example.com -o yaml
```

### CRD 세부 확인

```bash
# CRD 상세 정보 확인
kubectl describe crd databases.example.com

# 출력:
# Name:   databases.example.com
# Group:  example.com
# Version: v1
# Served: True
# Storage: True
# Scope: Namespaced
# Names:
#   Plural:    databases
#   Singular:  database
#   Kind:      Database
#   Short Names:
#     db
```

---

## 2 단계: Custom Resource 생성

### Custom Resource YAML

```yaml
# my-database.yaml
apiVersion: example.com/v1
kind: Database
metadata:
  name: mysql-prod
  namespace: default
spec:
  dbName: production-db
  port: 3306
  storageSize: 10Gi
  replicas: 3
```

### Custom Resource 적용

```bash
# Custom Resource 생성
kubectl apply -f my-database.yaml

# 출력:
# database.example.com/mysql-prod created

# Custom Resource 목록
kubectl get databases

# 출력:
# NAME          DBNAME        PORT   STORAGE   REPLICAS   AGE
# mysql-prod    production-db 3306   10Gi      3          10s

# 단축 이름 사용
kubectl get db

# 상세 정보
kubectl get db mysql-prod -o yaml

# 설명
kubectl describe db mysql-prod
```

### 여러 Custom Resource 생성

```yaml
# multiple-databases.yaml
---
apiVersion: example.com/v1
kind: Database
metadata:
  name: mysql-prod
  namespace: default
spec:
  dbName: production-db
  port: 3306
  storageSize: 10Gi
  replicas: 3

---
apiVersion: example.com/v1
kind: Database
metadata:
  name: redis-cache
  namespace: default
spec:
  dbName: redis-cache
  port: 6379
  storageSize: 5Gi
  replicas: 2

---
apiVersion: example.com/v1
kind: Database
metadata:
  name: postgres-analytics
  namespace: analytics
spec:
  dbName: analytics-db
  port: 5432
  storageSize: 50Gi
  replicas: 5
```

```bash
# 여러 리소스 동시 생성
kubectl apply -f multiple-databases.yaml

# 모든 네임스페이스에서 조회
kubectl get databases --all-namespaces

# 출력:
# NAMESPACE   NAME                DBNAME          PORT   STORAGE   REPLICAS
# default     mysql-prod          production-db   3306   10Gi      3
# default     redis-cache         redis-cache     6379   5Gi       2
# analytics   postgres-analytics  analytics-db    5432   50Gi      5
```

---

## 3 단계: CRD 스키마 검증

### 검증 규칙 추가

```yaml
# database-crd-validation.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        required:           # 필수 필드
        - spec
        properties:
          spec:
            type: object
            required:
            - dbName
            - port
            properties:
              dbName:
                type: string
                minLength: 1
                maxLength: 63
                pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'  # 소문자, 숫자, -
              port:
                type: integer
                minimum: 1
                maximum: 65535
              storageSize:
                type: string
                pattern: '^\\d+(Gi|Mi)$'  # Gi 또는 Mi 단위만
              replicas:
                type: integer
                minimum: 1
                maximum: 10
              backupEnabled:
                type: boolean
                default: false
              backupSchedule:
                type: string
                pattern: '^\\d+ \\*\\/\\d+ \\* \\* \\*$'  # cron 형식
          status:
            type: object
            properties:
              phase:
                type: string
                enum:
                - Pending
                - Running
                - Failed
              message:
                type: string
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
    - db
```

### 검증 테스트

```bash
# CRD 적용
kubectl apply -f database-crd-validation.yaml

# 유효한 리소스 생성 (성공)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: valid-db
spec:
  dbName: my-database
  port: 3306
  storageSize: 10Gi
  replicas: 3
EOF
# 출력: database.example.com/valid-db created

# 유효하지 않은 리소스 생성 (실패 - 포트 범위 초과)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: invalid-port
spec:
  dbName: my-database
  port: 70000  # 오류: 65535 초과
EOF
# 출력:
# Error from server (Invalid): error when creating "STDIN":
# Database.example.com "invalid-port" is invalid: spec.port: 
# Invalid value: 70000: spec.port in body should be less than or equal to 65535

# 유효하지 않은 리소스 생성 (실패 - 필수 필드 누락)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: missing-field
spec:
  port: 3306  # 오류: dbName 필수 필드 누락
EOF
# 출력:
# Error from server (Invalid): error when creating "STDIN":
# Database.example.com "missing-field" is invalid: spec.dbName: 
# Required value

# 유효하지 않은 리소스 생성 (실패 - 패턴 불일치)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: invalid-pattern
spec:
  dbName: MY_DATABASE!  # 오류: 대문자, 특수문자 불가
  port: 3306
EOF
# 출력:
# Error from server (Invalid): error when creating "STDIN":
# Database.example.com "invalid-pattern" is invalid: spec.dbName: 
# Invalid value: "MY_DATABASE!": spec.dbName in body doesn't match the regex
```

---

## 4 단계: CRD 버전 관리

### 여러 버전 지원

```yaml
# database-crd-versions.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
  # v2 버전 (최신)
  - name: v2
    served: true           # 서비스됨
    storage: true          # 기본 저장소
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              dbName:
                type: string
              port:
                type: integer
              storageSize:
                type: string
              replicas:
                type: integer
              # v2 에서 추가된 필드
              highAvailability:
                type: boolean
              monitoring:
                type: object
                properties:
                  enabled:
                    type: boolean
                  interval:
                    type: integer
  
  # v1 버전 (레거시)
  - name: v1
    served: true           # 아직 서비스됨 (호환성)
    storage: false         # 기본 저장소 아님
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              dbName:
                type: string
              port:
                type: integer
              storageSize:
                type: string
              replicas:
                type: integer
    # v1 → v2 변환 설정
    subresources:
      status: {}
  
  # v1alpha1 버전 (사용 중단)
  - name: v1alpha1
    served: false          # 서비스 안됨
    storage: false         # 저장소 아님
    deprecated: true       # 사용 중단 표시
    deprecationWarning: "v1alpha1 is deprecated, use v2"
  
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
    - db
```

### 버전 관리 명령어

```bash
# CRD 적용
kubectl apply -f database-crd-versions.yaml

# 버전 확인
kubectl get crd databases.example.com -o jsonpath='{.spec.versions[*].name}'
# 출력: v2 v1 v1alpha1

# 저장 버전 확인
kubectl get crd databases.example.com -o jsonpath='{.spec.versions[?(@.storage==true)].name}'
# 출력: v2

# v1 으로 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: legacy-db
spec:
  dbName: legacy-database
  port: 3306
  storageSize: 10Gi
  replicas: 3
EOF

# v2 로 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v2
kind: Database
metadata:
  name: modern-db
spec:
  dbName: modern-database
  port: 3306
  storageSize: 10Gi
  replicas: 3
  highAvailability: true
  monitoring:
    enabled: true
    interval: 30
EOF

# v1alpha1 으로 생성 시도 (실패)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1alpha1
kind: Database
metadata:
  name: old-db
spec:
  dbName: old-database
EOF
# 출력:
# Error from server (BadRequest): error when creating "STDIN": 
# the server could not find the requested resource
```

---

## 5 단계: Subresources 사용

### Status 서브리소스

```yaml
# database-crd-status.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
  - name: v1
    served: true
    storage: true
    subresources:
      # Status 서브리소스 활성화
      status: {}
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              dbName:
                type: string
              port:
                type: integer
          status:
            type: object
            properties:
              phase:
                type: string
                enum:
                - Pending
                - Running
                - Failed
              message:
                type: string
              replicas:
                type: integer
              readyReplicas:
                type: integer
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
```

### Status 업데이트

```bash
# CRD 적용
kubectl apply -f database-crd-status.yaml

# 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: mysql-with-status
spec:
  dbName: mysql-db
  port: 3306
EOF

# Status 업데이트 (별도 명령어)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: mysql-with-status
status:
  phase: Running
  message: Database is ready
  replicas: 3
  readyReplicas: 3
EOF

# Status 포함 조회
kubectl get db mysql-with-status -o jsonpath='{.status}'
# 출력: {"phase":"Running","message":"Database is ready","replicas":3,"readyReplicas":3}

# Status 별도 조회
kubectl get db mysql-with-status -o jsonpath='{.status.phase}'
# 출력: Running

# 전체 정보 조회
kubectl describe db mysql-with-status
# 출력:
# Status:
#   Phase:           Running
#   Message:         Database is ready
#   Replicas:        3
#   Ready Replicas:  3
```

### Scale 서브리소스

```yaml
# database-crd-scale.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
  - name: v1
    served: true
    storage: true
    subresources:
      status: {}
      # Scale 서브리소스 활성화
      scale:
        specReplicasPath: .spec.replicas
        statusReplicasPath: .status.replicas
        labelSelectorPath: .status.labelSelector
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              replicas:
                type: integer
          status:
            type: object
            properties:
              replicas:
                type: integer
              labelSelector:
                type: string
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
```

### Scale 명령어 사용

```bash
# CRD 적용
kubectl apply -f database-crd-scale.yaml

# 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: scalable-db
spec:
  dbName: scalable-database
  replicas: 2
status:
  replicas: 2
  labelSelector: app=scalable-db
EOF

# Scale 명령어로 확장
kubectl scale db scalable-db --replicas=5

# 확인
kubectl get db scalable-db -o jsonpath='{.spec.replicas}'
# 출력: 5

# 자동 확장
kubectl autoscale db scalable-db --min=2 --max=10 --cpu-percent=80

# 확인
kubectl get hpa
```

---

## 6 단계: Additional Printer Columns

### 출력 형식 커스터마이징

```yaml
# database-crd-printer.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
  - name: v1
    served: true
    storage: true
    # 추가 출력 열 설정
    additionalPrinterColumns:
    - name: DBName
      type: string
      jsonPath: .spec.dbName
      description: 데이터베이스 이름
    - name: Port
      type: integer
      jsonPath: .spec.port
      description: 포트 번호
    - name: Storage
      type: string
      jsonPath: .spec.storageSize
      description: 저장소 크기
    - name: Replicas
      type: integer
      jsonPath: .spec.replicas
      description: 복제본 수
    - name: Phase
      type: string
      jsonPath: .status.phase
      description: 상태
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
      description: 생성 시간
    subresources:
      status: {}
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              dbName:
                type: string
              port:
                type: integer
              storageSize:
                type: string
              replicas:
                type: integer
          status:
            type: object
            properties:
              phase:
                type: string
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
    - db
```

### 커스텀 출력 확인

```bash
# CRD 적용
kubectl apply -f database-crd-printer.yaml

# 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Database
metadata:
  name: mysql-prod
spec:
  dbName: production-db
  port: 3306
  storageSize: 10Gi
  replicas: 3
status:
  phase: Running
EOF

# 기본 출력 (커스텀 열 포함)
kubectl get db

# 출력:
# NAME          DBNAME        PORT   STORAGE   REPLICAS   PHASE    AGE
# mysql-prod    production-db 3306   10Gi      3          Running  10s

# 특정 열만 출력
kubectl get db -o custom-columns=NAME:.metadata.name,DB:.spec.dbName,PHASE:.status.phase

# 출력:
# NAME          DBNAME        PHASE
# mysql-prod    production-db Running

# Wide 출력
kubectl get db -o wide

# 출력:
# NAME          DBNAME        PORT   STORAGE   REPLICAS   PHASE    AGE   DBNAME
# mysql-prod    production-db 3306   10Gi      3          Running  10s   production-db
```

---

## 7 단계: CRD 관리

### CRD 목록 및 확인

```bash
# 모든 CRD 목록
kubectl get crd

# 특정 CRD 상세 정보
kubectl get crd databases.example.com -o yaml

# CRD 설명
kubectl describe crd databases.example.com

# CRD 의 모든 버전 확인
kubectl get crd databases.example.com -o jsonpath='{.spec.versions[*].name}'

# 저장 버전 확인
kubectl get crd databases.example.com -o jsonpath='{.spec.versions[?(@.storage==true)].name}'
```

### CRD 삭제

```bash
# CRD 삭제 (Custom Resource 도 함께 삭제됨)
kubectl delete crd databases.example.com

# 확인
kubectl get crd
kubectl get db  # 오류: resource not found

# CRD 와 리소스 따로 삭제
kubectl delete db --all      # 먼저 리소스 삭제
kubectl delete crd databases.example.com  # 그 다음 CRD 삭제
```

### CRD 백업 및 복원

```bash
# CRD 백업
kubectl get crd databases.example.com -o yaml > database-crd-backup.yaml

# CRD 복원
kubectl apply -f database-crd-backup.yaml

# 모든 CRD 백업
kubectl get crd -o yaml > all-crds-backup.yaml

# 모든 CRD 복원
kubectl apply -f all-crds-backup.yaml
```

---

## 8 단계: CRD 실전 예제

### RedisCluster CRD

```yaml
# redis-cluster-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: redisclusters.database.example.com
spec:
  group: database.example.com
  versions:
  - name: v1
    served: true
    storage: true
    subresources:
      status: {}
    additionalPrinterColumns:
    - name: Masters
      type: integer
      jsonPath: .spec.masters
    - name: Replicas
      type: integer
      jsonPath: .spec.replicas
    - name: Phase
      type: string
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required:
            - masters
            properties:
              masters:
                type: integer
                minimum: 1
                maximum: 10
              replicas:
                type: integer
                minimum: 0
                maximum: 10
              version:
                type: string
                default: "7.0"
              resources:
                type: object
                properties:
                  requests:
                    type: object
                    properties:
                      cpu:
                        type: string
                      memory:
                        type: string
                  limits:
                    type: object
                    properties:
                      cpu:
                        type: string
                      memory:
                        type: string
              persistence:
                type: object
                properties:
                  enabled:
                    type: boolean
                  size:
                    type: string
          status:
            type: object
            properties:
              phase:
                type: string
                enum:
                - Initializing
                - Ready
                - Failed
              masters:
                type: integer
              replicas:
                type: integer
              message:
                type: string
  scope: Namespaced
  names:
    plural: redisclusters
    singular: rediscluster
    kind: RedisCluster
    shortNames:
    - redis
```

### RedisCluster 사용

```bash
# CRD 적용
kubectl apply -f redis-cluster-crd.yaml

# RedisCluster 생성
cat <<EOF | kubectl apply -f -
apiVersion: database.example.com/v1
kind: RedisCluster
metadata:
  name: my-redis
spec:
  masters: 3
  replicas: 3
  version: "7.0"
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  persistence:
    enabled: true
    size: 10Gi
EOF

# 확인
kubectl get redis

# 출력:
# NAME       MASTERS   REPLICAS   PHASE         AGE
# my-redis   3         3          Initializing  10s

# 상세 정보
kubectl describe redis my-redis
```

### MonitoringStack CRD

```yaml
# monitoring-stack-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: monitoringstacks.monitoring.example.com
spec:
  group: monitoring.example.com
  versions:
  - name: v1
    served: true
    storage: true
    subresources:
      status: {}
    additionalPrinterColumns:
    - name: Prometheus
      type: string
      jsonPath: .spec.prometheus.enabled
    - name: Grafana
      type: string
      jsonPath: .spec.grafana.enabled
    - name: Phase
      type: string
      jsonPath: .status.phase
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              prometheus:
                type: object
                properties:
                  enabled:
                    type: boolean
                  retention:
                    type: string
                  storageSize:
                    type: string
              grafana:
                type: object
                properties:
                  enabled:
                    type: boolean
                  adminPassword:
                    type: string
              alertmanager:
                type: object
                properties:
                  enabled:
                    type: boolean
          status:
            type: object
            properties:
              phase:
                type: string
  scope: Namespaced
  names:
    plural: monitoringstacks
    singular: monitoringstack
    kind: MonitoringStack
    shortNames:
    - monstack
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    CRD 요약                                 │
├─────────────────────────────────────────────────────────────┤
│  1. CRD 란?                                                 │
│     - Kubernetes API 확장 방법                              │
│     - 사용자 정의 리소스 타입 생성                          │
│     - kubectl 로 관리 가능                                  │
│                                                             │
│  2. CRD 생성                                                │
│     - apiVersion: apiextensions.k8s.io/v1                   │
│     - kind: CustomResourceDefinition                        │
│     - spec.group, spec.versions, spec.names 정의            │
│                                                             │
│  3. Custom Resource                                         │
│     - apiVersion: <group>/<version>                         │
│     - kind: <Kind>                                          │
│     - kubectl apply 로 생성                                 │
│                                                             │
│  4. 스키마 검증                                             │
│     - OpenAPI v3 스키마                                     │
│     - required, type, pattern, minimum/maximum              │
│     - 유효하지 않은 리소스 생성 방지                        │
│                                                             │
│  5. 버전 관리                                               │
│     - multiple versions 지원                                │
│     - served, storage 플래그                                │
│     - deprecated, deprecationWarning                        │
│                                                             │
│  6. Subresources                                            │
│     - status: 상태 업데이트                                 │
│     - scale: kubectl scale 명령어                           │
│                                                             │
│  7. Additional Printer Columns                              │
│     - kubectl get 출력 커스터마이징                         │
│     - jsonPath 로 필드 지정                                 │
│                                                             │
│  8. CRD 관리                                                │
│     - get, describe, delete                                 │
│     - 백업 및 복원                                          │
│                                                             │
│  9. 실전 예제                                               │
│     - RedisCluster CRD                                      │
│     - MonitoringStack CRD                                   │
└─────────────────────────────────────────────────────────────┘
```

### CRD 개발 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          CRD 개발 체크리스트                                │
└─────────────────────────────────────────────────────────────┘

□ 그룹 이름: 도메인 형식 (example.com)
□ 버전: v1, v2 등 (storage: true 하나만)
□ Scope: Namespaced 또는 Cluster
□ Names: plural, singular, kind, shortNames
□ 스키마: OpenAPI v3 검증 규칙
□ Status: subresources.status 활성화
□ 출력: additionalPrinterColumns 설정
□ 문서화: CRD 에 description 추가
□ 테스트: 유효/무효 리소스 생성 테스트
□ 백업: CRD YAML 백업
```

**CRD 는 Kubernetes 를 확장하는 강력한 도구입니다. Operator 와 함께 사용하면 복잡한 애플리케이션을 Kubernetes 네이티브하게 관리할 수 있습니다.**
