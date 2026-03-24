# K8s 클러스터 구성 컴포넌트

Kubernetes 클러스터는 Control Plane 과 Worker Node 로 구성됩니다.

## Control Plane (관리 영역)

| 컴포넌트 | 역할 |
|----------|------|
| **kube-apiserver** | 클러스터의 프론트엔드, REST API 제공, 인증/인가 처리 |
| **etcd** | 클러스터 상태와 설정을 저장하는 분산 키 - 값 저장소 |
| **kube-scheduler** | Pod 를 적절한 노드에 스케줄링 |
| **kube-controller-manager** | 컨트롤러들을 실행 (Node, Replication, Endpoint, Namespace 등) |
| **cloud-controller-manager** | 클라우드 제공자 API 와 연동 (선택적) |

## Worker Node (작업 영역)

| 컴포넌트 | 역할 |
|----------|------|
| **kubelet** | 노드에서 실행되는 에이전트, Pod lifecycle 관리 |
| **kube-proxy** | 네트워크 프록시, Service 트래픽 라우팅 |
| **Container Runtime** | 컨테이너 실행 (containerd, CRI-O, Docker Engine 등) |

## 클러스터 아키텍처

```
┌─────────────────────────────────────────┐
│           Control Plane                 │
│  ┌─────────────┐  ┌──────────────────┐ │
│  │ kube-       │  │ etcd             │ │
│  │ apiserver   │  │ (저장소)         │ │
│  └──────┬──────┘  └──────────────────┘ │
│         │                               │
│  ┌──────┴──────┐  ┌──────────────────┐ │
│  │ kube-       │  │ kube-controller  │ │
│  │ scheduler   │  │ -manager         │ │
│  └─────────────┘  └──────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
   ┌────▼────┐ ┌──▼───┐ ┌──▼────┐
   │Worker 1 │ │Worker│ │Worker │
   │  Node   │ │  2   │ │  3    │
   │ ┌─────┐ │ │ ┌──┐ │ │ ┌──┐  │
   │ │kube │ │ │ │  │ │ │  │  │
   │ │let  │ │ │ │  │ │ │  │  │
   │ └──┬──┘ │ │ │  │ │ │  │  │
   │ ┌──▼──┐ │ │ │  │ │ │  │  │
   │ │Pod  │ │ │ │  │ │ │  │  │
   │ │(s)  │ │ │ │  │ │ │  │  │
   │ └─────┘ │ │ │  │ │ │  │  │
   └─────────┘ └────┘ └─────┘
```
