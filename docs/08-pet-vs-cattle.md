# K8s 에서 Pet 과 Cattle 비유

Kubernetes 와 현대 인프라 관리에서 **Pet vs Cattle** 는 중요한 개념적 비유입니다.

## Pet (애완동물) vs Cattle (가축)

### Pet (애완동물) 방식

전통적인 서버 관리 방식입니다.

- **이름을 붙임:** `web-server-01`, `db-master` 등 고유한 이름
- **특별하게 관리:** 각 서버가 독특하고 대체 불가능
- **수동 복구:** 장애 시 직접 수리하고 복구
- **상태 저장:** 서버의 상태와 설정이 중요
- **희소성:** 서버가 귀하고 중요하게 여겨짐

```
# Pet 방식의 특징
- 서버에 장애 발생 → 긴급 대응 → 수리 시도
- "서버가 죽었다!" → 비상 소집
- 각 서버마다 고유한 설정과 역사
- 서버를 교체하는 것보다 수리하는 것이 우선
```

### Cattle (가축) 방식

Kubernetes 와 클라우드 네이티브 방식입니다.

- **번호로 식별:** `pod-abc123`, `instance-001` 등 일회성 식별자
- **표준화:** 모든 인스턴스가 동일하고 교체 가능
- **자동 복구:** 장애 시 새로 생성하고 교체
- **무상태 (Stateless):** 상태는 외부 저장소에 보관
- **대량 관리:** 개별 단위보다 집단이 중요

```
# Cattle 방식의 특징
- Pod 에 장애 발생 → 자동 삭제 → 새 Pod 생성
- "인스턴스가 죽었다" → 자동으로 대체
- 모든 Pod 는 동일한 이미지에서 생성
- 개체를 교체하는 것이 기본
```

## 비교 표

| 특성 | Pet (애완동물) | Cattle (가축) |
|------|---------------|--------------|
| **식별** | 고유한 이름 | 일회성 ID |
| **관리** | 수동 | 자동화 |
| **복구** | 수리 | 교체 |
| **상태** | 서버에 저장 | 외부 저장소 |
| **변경** | 직접 수정 | 이미지 재배포 |
| **장애 대응** | 긴급 수리 | 자동 재생성 |
| **중요도** | 개별 서버 | 전체 서비스 |
| **예시** | 전통적 물리서버 | Kubernetes Pod |

## Kubernetes 에서의 Cattle 철학

### Pod 는 일회성입니다

```yaml
# Pod 는 언제든지 삭제되고 재생성될 수 있음
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod  # 이 이름도 재사용될 뿐
spec:
  containers:
  - name: app
    image: myapp:1.0
```

```bash
# Pod 삭제 후 자동 재생성
kubectl delete pod my-app-pod
# → ReplicaSet 이 즉시 새 Pod 생성
# → 새 Pod 는 완전히 새로운 인스턴스
```

### 상태는 분리합니다

```yaml
# 상태는 PersistentVolume 에 저장
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: stateful-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: data-pvc  # 상태는 외부에 보관
```

### 설정은 이미지로 관리

```dockerfile
# Dockerfile - 모든 설정을 이미지에 포함
FROM nginx:1.25
COPY nginx.conf /etc/nginx/nginx.conf
COPY html/ /usr/share/nginx/html/
EXPOSE 80
```

```yaml
# Deployment - 동일한 Pod 를 여러 개 실행
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3  # 동일한 Pod 3 개
  template:
    spec:
      containers:
      - name: web
        image: myapp:1.0  # 모두 동일한 이미지
```

## 실제 시나리오 비교

### Pet 방식: 전통적 웹서버

```
1. web-server-01 에 문제 발생
2. 관리자가 SSH 로 접속
3. 로그 확인, 설정 수정, 서비스 재시작
4. "이번 달 세 번째 장애다..."
5. 서버를 오랫동안 유지하며 관리
```

### Cattle 방식: Kubernetes Pod

```
1. web-app-abc123 Pod 에 문제 발생
2. Kubernetes 가 자동 감지
3. 문제 Pod 삭제, 새 Pod 자동 생성 (xyz789)
4. "Pod 가 재생성되었습니다"
5. 서비스는 중단 없이 계속됨
```

## 왜 Cattle 방식인가?

### 1. 확장성

```bash
# 트래픽 증가 시 간단히 replicas 증가
kubectl scale deployment web-app --replicas=10
# → 동일한 Pod 10 개 즉시 생성
```

### 2. 일관성

```bash
# 모든 Pod 가 동일한 이미지에서 생성
# 환경 차이 없음 (dev = staging = production)
```

### 3. 자동화

```bash
# 셀프 힐링 (Self-healing)
# 장애 발생 시 자동 복구
```

### 4. 빠른 배포

```bash
# 새로운 버전으로 롤링 업데이트
kubectl set image deployment/web-app web=myapp:2.0
# → 순차적으로 Pod 교체
```

### 5. 재해 복구

```bash
# 전체 클러스터 손실 시
# 동일한 이미지로 새 클러스터에서 즉시 복구
```

## 전환 가이드: Pet → Cattle

### 1. 상태 분리

```
# Before (Pet)
- 서버 로컬 디스크에 데이터 저장
- 서버마다 다른 설정

# After (Cattle)
- 데이터는 외부 저장소 (DB, S3, PV)
- 설정은 ConfigMap/Secret
```

### 2. 자동화

```
# Before (Pet)
- 수동 서버 설정
- 직접 패치 및 업데이트

# After (Cattle)
- IaC (Terraform, Ansible)
- CI/CD 파이프라인
```

### 3. 모니터링

```
# Before (Pet)
- 서버별 개별 모니터링
- "서버가 살아있는가?"

# After (Cattle)
- 서비스 수준 모니터링
- "서비스가 정상적인가?"
```

### 4. 마인드셋

```
# Before (Pet)
- "이 서버를 어떻게 지키나?"

# After (Cattle)
- "이 서비스를 어떻게 유지하나?"
```

## 요약

```
┌─────────────────────────────────────────────────────┐
│  Pet (애완동물)         →      Cattle (가축)       │
│  ─────────────────            ──────────────────    │
│  이름 붙인 서버               번호 없는 Pod         │
│  수동 관리                    자동화                │
│  수리하고 유지                교체하고 재생성       │
│  서버가 중요                  서비스가 중요         │
│  전통적 인프라                Kubernetes/Cloud      │
└─────────────────────────────────────────────────────┘
```

**Kubernetes 는 Cattle 방식을 전제로 설계되었습니다.**

Pod 를 애완동물처럼 대우하지 마세요. 언제든지 교체할 수 있는 가축처럼 다루어야 합니다.
