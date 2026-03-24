# NFS Subdir External Provisioner YAML 분석

NFS 를 사용한 동적 볼륨 프로비저닝 YAML 파일을 분석합니다.

## 전체 구성

```
NFS Provisioner 구성 리소스:
1. StorageClass            - 동적 프로비저닝 설정
2. ServiceAccount          - Pod 의 신원
3. ClusterRole             - 클러스터 권한
4. ClusterRoleBinding      - 클러스터 권한 바인딩
5. Role                    - 네임스페이스 권한 (리더 선출)
6. RoleBinding             - 네임스페이스 권한 바인딩
7. Deployment              - 프로비저너 배포
8. 테스트 리소스
   - PersistentVolumeClaim
   - Pod
```

---

## 1. StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  archiveOnDelete: "false"
```

### 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `name` | nfs-client | StorageClass 이름 |
| `annotations` | is-default-class: "true" | **기본 StorageClass 로 설정** |
| `provisioner` | k8s-sigs.io/nfs-subdir-external-provisioner | 프로비저너 식별자 |
| `parameters.archiveOnDelete` | "false" | PV 삭제 시 백업 안 함 |

### 기본 StorageClass 란?

```yaml
# 기본 StorageClass 가 있으면:
# PVC 에서 storageClassName 을 생략해도 자동 사용됨

# 기본 StorageClass 가 없을 때:
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-claim
spec:
  storageClassName: nfs-client  # ← 명시적 지정 필요

# 기본 StorageClass 가 있을 때:
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-claim
spec:
  # storageClassName 생략 가능 (자동으로 nfs-client 사용)
```

### archiveOnDelete 파라미터

```yaml
parameters:
  archiveOnDelete: "false"
```

| 값 | 설명 |
|----|------|
| `"false"` | PV 삭제 시 NFS 에서 완전 삭제 |
| `"true"` | PV 삭제 시 NFS 에서 `archived-<pv-name>` 으로 이름 변경하여 보관 |

### NFS 디렉토리 구조

```
/nfs-share/dynamic-pv/
├── default-test-claim-pvc-12345/      # PVC 마다 디렉토리 생성
├── default-data-pvc-67890/
└── archived-default-old-pvc-11111/    # archiveOnDelete: true 일 때
```

---

## 2. ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner
  namespace: nfs
```

### 역할

- NFS 프로비저너 Pod 의 신원
- RBAC 권한과 연결

---

## 3. ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nfs-client-provisioner-runner
rules:
# 노드 정보 조회
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]

# PV 관리 (생성/삭제 포함)
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "delete"]

# PVC 관리 (업데이트 포함)
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "update"]

# StorageClass 조회
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]

# 이벤트 생성/업데이트
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "update", "patch"]
```

### 권한 상세 분석

#### PersistentVolume 권한

```yaml
resources: ["persistentvolumes"]
verbs: ["get", "list", "watch", "create", "delete"]
```

| 동사 | 용도 |
|------|------|
| `get, list, watch` | 기존 PV 조회 |
| `create` | 새 PV 생성 (PVC 요청 시) |
| `delete` | PV 삭제 (PVC 삭제 시) |

#### PersistentVolumeClaim 권한

```yaml
resources: ["persistentvolumeclaims"]
verbs: ["get", "list", "watch", "update"]
```

| 동사 | 용도 |
|------|------|
| `get, list, watch` | PVC 모니터링 |
| `update` | PVC 에 PV 바인딩 정보 업데이트 |

#### 왜 ClusterRole 인가?

```
PV 는 클러스터 전체 리소스 (네임스페이스 없음)
→ ClusterRole 필요

PVC 는 네임스페이스별 리소스
→ 하지만 모든 네임스페이스의 PVC 를 관리해야 함
→ ClusterRole 이 편리함
```

---

## 4. ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: run-nfs-client-provisioner
subjects:
- kind: ServiceAccount
  name: nfs-client-provisioner
  namespace: nfs
roleRef:
  kind: ClusterRole
  name: nfs-client-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
```

### 역할

- ClusterRole 의 권한을 ServiceAccount 에 바인딩

---

## 5. Role (리더 선출용)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-locking-nfs-client-provisioner
  namespace: nfs
rules:
- apiGroups: [""]
  resources: ["endpoints"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
```

### 리더 선출 (Leader Election) 이란?

```
프로비저너를 여러 개 실행할 때:
- 하나만 리더로 선출됨
- 리더만 실제 프로비저닝 수행
- 나머지 백업은 대기

단일 인스턴스라도:
- 리더 선출 메커니즘 사용
- 일관된 동작 보장
```

### Endpoints 를 사용하는 이유

```yaml
resources: ["endpoints"]
verbs: ["get", "list", "watch", "create", "update", "patch"]
```

- Kubernetes 는 Endpoints 를 리더 선출 락으로 사용
- 리더가 자신의 정보를 Endpoints 에 기록
- 다른 인스턴스가 확인하여 리더 존재 여부 파악

---

## 6. RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leader-locking-nfs-client-provisioner
  namespace: nfs
subjects:
- kind: ServiceAccount
  name: nfs-client-provisioner
  namespace: nfs
roleRef:
  kind: Role
  name: leader-locking-nfs-client-provisioner
  apiGroup: rbac.authorization.k8s.io
```

### 역할

- 리더 선출용 Role 을 ServiceAccount 에 바인딩

---

## 7. Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-client-provisioner
  labels:
    app: nfs-client-provisioner
  namespace: nfs
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
      - name: nfs-client-provisioner
        image: registry.k8s.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
        volumeMounts:
        - name: nfs-client-root
          mountPath: /persistentvolumes
        env:
        - name: PROVISIONER_NAME
          value: k8s-sigs.io/nfs-subdir-external-provisioner
        - name: NFS_SERVER
          value: 172.31.1.10
        - name: NFS_PATH
          value: /nfs-share/dynamic-pv
        volumes:
        - name: nfs-client-root
          nfs:
            server: 172.31.1.10
            path: /nfs-share/dynamic-pv
```

### 배포 전략: Recreate

```yaml
strategy:
  type: Recreate
```

| 전략 | 설명 |
|------|------|
| `Recreate` | 기존 Pod 를 완전히 삭제 후 새 Pod 생성 |
| `RollingUpdate` | 점진적으로 Pod 교체 (기본값) |

**왜 Recreate 인가?**

```
프로비저너는 동시 실행 시 충돌 가능
→ 한 번에 하나만 실행되어야 함
→ Recreate 전략으로 안전한 교체가 필요
```

### 컨테이너 환경 변수

```yaml
env:
- PROVISIONER_NAME: k8s-sigs.io/nfs-subdir-external-provisioner  # 식별자
- NFS_SERVER: 172.31.1.10        # NFS 서버 IP
- NFS_PATH: /nfs-share/dynamic-pv  # NFS 공유 경로
```

### NFS 볼륨 마운트

```yaml
volumeMounts:
- name: nfs-client-root
  mountPath: /persistentvolumes  # 컨테이너 내 마운트 경로

volumes:
- name: nfs-client-root
  nfs:
    server: 172.31.1.10          # NFS 서버
    path: /nfs-share/dynamic-pv  # NFS 공유 경로
```

### 동작 원리

```
1. PVC 생성됨
   ↓
2. 프로비저너가 감지
   ↓
3. NFS 서버에 디렉토리 생성
   /nfs-share/dynamic-pv/default-claim-pvc-xxxxx/
   ↓
4. PV 생성 및 PVC 와 바인딩
   ↓
5. Pod 가 PV 사용
```

---

## 8. 테스트 리소스

### 8-1. PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-claim
spec:
  storageClassName: nfs-client
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Mi
```

### 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `storageClassName` | nfs-client | 사용할 StorageClass |
| `accessModes` | ReadWriteMany | 여러 노드에서 동시 읽기/쓰기 |
| `storage` | 1Mi | 요청 크기 |

### 접근 모드

| 모드 | 설명 | NFS 지원 |
|------|------|----------|
| `ReadWriteOnce (RWO)` | 단일 노드에서 읽기/쓰기 | ✅ |
| `ReadOnlyMany (ROX)` | 여러 노드에서 읽기 전용 | ✅ |
| `ReadWriteMany (RWX)` | 여러 노드에서 읽기/쓰기 | ✅ |

### PVC 상태 변화

```
1. Pending → 프로비저너가 PV 생성 대기
2. Bound   → PV 생성 및 바인딩 완료
```

---

### 8-2. 테스트 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: test-pod
    image: busybox:stable
    command:
    - "/bin/sh"
    args:
    - "-c"
    - "touch /mnt/SUCCESS && exit 0 || exit 1"
    volumeMounts:
    - name: nfs-pvc
      mountPath: "/mnt"
  restartPolicy: "Never"
  volumes:
  - name: nfs-pvc
    persistentVolumeClaim:
      claimName: test-claim
```

### 테스트 목적

```bash
# Pod 가 성공하면:
# 1. PVC 가 정상적으로 바인딩됨
# 2. NFS 마운트가 작동함
# 3. 파일 쓰기가 가능함

# /mnt/SUCCESS 파일이 NFS 에 생성됨
# NFS 서버에서 확인:
# /nfs-share/dynamic-pv/default-test-claim-pvc-xxxxx/SUCCESS
```

### Pod 실행 흐름

```
1. Pod 스케줄링
   ↓
2. PVC 마운트 (NFS)
   ↓
3. touch /mnt/SUCCESS 실행
   ↓
4. 성공 시 exit 0
   ↓
5. Pod 완료 (Completed)
```

---

## 전체 설치 파일 구조

```
nfs-subdir-external-provisioner/
├── class.yaml         # StorageClass
├── rbac.yaml          # ServiceAccount, ClusterRole, ClusterRoleBinding, Role, RoleBinding
├── deployment.yaml    # Deployment
└── README.md
```

### class.yaml

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  archiveOnDelete: "false"
```

### rbac.yaml

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner
  namespace: nfs

# ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nfs-client-provisioner-runner
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "delete"]
# ... (나머지 권한)

# ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: run-nfs-client-provisioner
subjects:
- kind: ServiceAccount
  name: nfs-client-provisioner
  namespace: nfs
roleRef:
  kind: ClusterRole
  name: nfs-client-provisioner-runner

# Role (리더 선출)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-locking-nfs-client-provisioner
  namespace: nfs
rules:
- apiGroups: [""]
  resources: ["endpoints"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]

# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leader-locking-nfs-client-provisioner
  namespace: nfs
subjects:
- kind: ServiceAccount
  name: nfs-client-provisioner
  namespace: nfs
roleRef:
  kind: Role
  name: leader-locking-nfs-client-provisioner
```

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-client-provisioner
  namespace: nfs
spec:
  replicas: 1
  strategy:
    type: Recreate
  template:
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
      - name: nfs-client-provisioner
        image: registry.k8s.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
        env:
        - name: PROVISIONER_NAME
          value: k8s-sigs.io/nfs-subdir-external-provisioner
        - name: NFS_SERVER
          value: 172.31.1.10
        - name: NFS_PATH
          value: /nfs-share/dynamic-pv
        volumeMounts:
        - name: nfs-client-root
          mountPath: /persistentvolumes
      volumes:
      - name: nfs-client-root
        nfs:
          server: 172.31.1.10
          path: /nfs-share/dynamic-pv
```

---

## 리소스 관계도

```
┌─────────────────────────────────────────────────────────────┐
│           NFS Subdir External Provisioner 구성              │
└─────────────────────────────────────────────────────────────┘

Namespace: nfs
│
├─ RBAC
│  ├─ ServiceAccount: nfs-client-provisioner
│  ├─ ClusterRole: nfs-client-provisioner-runner
│  │  └─ PV, PVC, StorageClass, Events 관리 권한
│  ├─ ClusterRoleBinding: run-nfs-client-provisioner
│  ├─ Role: leader-locking-nfs-client-provisioner
│  │  └─ Endpoints (리더 선출) 권한
│  └─ RoleBinding: leader-locking-nfs-client-provisioner
│
├─ StorageClass: nfs-client (기본)
│  ├─ Provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
│  └─ Parameters: archiveOnDelete=false
│
├─ Deployment: nfs-client-provisioner
│  ├─ 이미지: nfs-subdir-external-provisioner:v4.0.2
│  ├─ 전략: Recreate
│  ├─ 환경 변수:
│  │  ├─ PROVISIONER_NAME
│  │  ├─ NFS_SERVER (172.31.1.10)
│  │  └─ NFS_PATH (/nfs-share/dynamic-pv)
│  └─ NFS 볼륨 마운트
│
└─ NFS 서버 (172.31.1.10:/nfs-share/dynamic-pv)
   └─ 동적 PV 디렉토리 생성
```

---

## 설치 및 테스트

```bash
# 1. NFS 서버 설정 (선행 작업)
# NFS 서버에서:
[root@nfs-server ~]# mkdir -p /nfs-share/dynamic-pv
[root@nfs-server ~]# chmod 777 /nfs-share/dynamic-pv
[root@nfs-server ~]# echo "/nfs-share *(rw,sync,no_root_squash)" >> /etc/exports
[root@nfs-server ~]# exportfs -ar
[root@nfs-server ~]# systemctl enable nfs-server
[root@nfs-server ~]# systemctl start nfs-server

# 2. 네임스페이스 생성
kubectl create namespace nfs

# 3. RBAC 및 Deployment 설치
kubectl apply -f rbac.yaml
kubectl apply -f deployment.yaml
kubectl apply -f class.yaml

# 4. 설치 확인
kubectl get pods -n nfs
# NAME                      READY   STATUS    RESTARTS   AGE
# nfs-client-provisioner    1/1     Running   0          1m

kubectl get sc
# NAME         PROVISIONER                                    AGE
# nfs-client   k8s-sigs.io/nfs-subdir-external-provisioner    1m (default)

# 5. 테스트 PVC 생성
kubectl apply -f test-claim.yaml

# 6. PVC 상태 확인
kubectl get pvc
# NAME         STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# test-claim   Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   1Mi        RWX            nfs-client     10s

# 7. 테스트 Pod 실행
kubectl apply -f test-pod.yaml

# 8. Pod 상태 확인
kubectl get pod test-pod
# NAME       READY   STATUS      RESTARTS   AGE
# test-pod   0/1     Completed   0          30s

# 9. NFS 서버에서 파일 확인
[root@nfs-server ~]# ls -la /nfs-share/dynamic-pv/
# default-test-claim-pvc-xxxxx/
#   └── SUCCESS
```

---

## 동적 프로비저닝 흐름

```
1. 사용자 PVC 생성
   ┌─────────────────────────────┐
   │  PersistentVolumeClaim      │
   │  storageClassName: nfs-client│
   │  storage: 10Gi              │
   └──────────────┬──────────────┘
                  │
                  ▼
2. 프로비저너 감지
   ┌─────────────────────────────┐
   │  nfs-client-provisioner     │
   │  (PVC watch 중)             │
   └──────────────┬──────────────┘
                  │
                  ▼
3. NFS 디렉토리 생성
   ┌─────────────────────────────┐
   │  NFS 서버                   │
   │  /nfs-share/dynamic-pv/     │
   │    └─ default-claim-xxx/    │
   └──────────────┬──────────────┘
                  │
                  ▼
4. PV 생성 및 바인딩
   ┌─────────────────────────────┐
   │  PersistentVolume           │
   │  nfsVolume:                 │
   │    server: 172.31.1.10      │
   │    path: /nfs-share/...     │
   └──────────────┬──────────────┘
                  │
                  ▼
5. PVC Bound 상태
   ┌─────────────────────────────┐
   │  PVC ←→ PV 바인딩 완료      │
   └──────────────┬──────────────┘
                  │
                  ▼
6. Pod 에서 사용
   ┌─────────────────────────────┐
   │  Pod                        │
   │  volumes:                   │
   │    - persistentVolumeClaim: │
   │        claimName: claim     │
   └─────────────────────────────┘
```

---

## 요약

| 리소스 | 개수 | 용도 |
|--------|------|------|
| StorageClass | 1 | 동적 프로비저닝 설정 (기본) |
| ServiceAccount | 1 | Pod 신원 |
| ClusterRole | 1 | PV/PVC 관리 권한 |
| ClusterRoleBinding | 1 | 클러스터 권한 바인딩 |
| Role | 1 | 리더 선출 권한 |
| RoleBinding | 1 | 네임스페이스 권한 바인딩 |
| Deployment | 1 | 프로비저너 배포 |
| **총계** | **7** | |

### 테스트 리소스

| 리소스 | 용도 |
|--------|------|
| PersistentVolumeClaim | PVC 생성 테스트 |
| Pod | NFS 마운트 및 쓰기 테스트 |

**NFS Subdir External Provisioner 는 NFS 를 백엔드로 사용하여 동적 PV 를 제공하는 경량 솔루션입니다.**
