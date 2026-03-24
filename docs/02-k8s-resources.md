# Kubernetes 리소스 맵

Kubernetes 는 다양한 리소스 객체를 사용하여 클러스터를 구성하고 애플리케이션을 실행합니다.

## 주요 리소스 계층

```
Cluster
└── Namespace
    ├── Workload Controllers
    │   ├── Deployment
    │   ├── StatefulSet
    │   ├── DaemonSet
    │   └── Job / CronJob
    ├── Pod (최소 실행 단위)
    │   └── Container(s)
    ├── Service (네트워킹)
    │   ├── ClusterIP
    │   ├── NodePort
    │   ├── LoadBalancer
    │   └── ExternalName
    ├── Config / Secret
    ├── Volume (저장소)
    └── RBAC (권한)
```

## 리소스 관계도

```
Deployment
└── ReplicaSet
    └── Pod(s)
        └── Container(s)

Service → Endpoints → Pod(s)

ConfigMap/Secret → Pod (환경변수 또는 볼륨으로 마운트)
```

## 주요 리소스 설명

| 리소스 | 역할 |
|--------|------|
| **Pod** | Kubernetes 의 최소 실행 단위 (하나 이상의 컨테이너) |
| **Deployment** | 무상태 애플리케이션 관리, 롤링 업데이트 지원 |
| **StatefulSet** | 상태 저장 애플리케이션 관리 (순서 보장, 안정적 식별자) |
| **DaemonSet** | 모든 노드에서 실행되어야 하는 Pod 관리 (로그 수집, 모니터링) |
| **Service** | Pod 에 대한 안정적인 네트워크 엔드포인트 제공 |
| **ConfigMap** | 설정 데이터를 저장 (키 - 값 쌍) |
| **Secret** | 민감한 데이터 저장 (비밀번호, 토큰, 키) |
| **PersistentVolume** | 클러스터의 영구 저장소 |
| **Namespace** | 리소스를 논리적으로 분리 (멀티테넌시 지원) |

## 리소스 확인 명령어

```bash
# 모든 리소스 타입 확인
kubectl api-resources

# 리소스 간 관계 확인
kubectl explain pod
kubectl explain deployment.spec

# 리소스 YAML 출력
kubectl get pod my-pod -o yaml
```
