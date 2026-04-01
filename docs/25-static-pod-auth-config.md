# Static Pod 와 API Server

Static Pod의 개념과 API Server와의 관계, 그리고 컨트롤 플레인 컴포넌트 구동 방식에 대해 알아봅니다.

---

## Static Pod 란?

Static Pod는 API 서버의 개입 없이 **kubelet이 직접 관리하는 특수한 Pod**입니다. 주로 클러스터의 핵심 컴포넌트(API Server, etcd 등)를 구동하는 데 사용됩니다.

### Static Pod vs 일반 Pod 비교

| 구분 | Static Pod | 일반 Pod |
|------|------------|----------|
| **관리 주체** | kubelet (로컬 노드 데몬) | API Server (Control Plane) |
| **저장 위치** | 로컬 파일 시스템 (`/etc/kubernetes/manifests/`) | etcd (클러스터 데이터베이스) |
| **생성 방법** | 특정 디렉토리에 YAML 파일 배치 | `kubectl apply`, Deployment 등 |
| **삭제 방법** | 로컬 YAML 파일 삭제 | `kubectl delete` 명령 수행 |
| **주요 용도** | 컨트롤 플레인 컴포넌트 구동 | 일반 애플리케이션 워크로드 |
| **이름 규칙** | `<Pod이름>-<노드이름>` | 사용자 지정 또는 컨트롤러 부여 |

---

## Static Pod 동작 원리

kubelet은 설정된 특정 디렉토리를 실시간으로 감시하며 Pod의 생명주기를 관리합니다.

<div class="mermaid">
flowchart TD
    Dir[/etc/kubernetes/manifests/] -- "파일 감시(inotify)" --> Kubelet[kubelet 데몬]
    Kubelet -- "YAML 파싱" --> Runtime[Container Runtime]
    Runtime -- "컨테이너 생성" --> Pod[Static Pod 실행]
    
    subgraph ControlPlane[마스터 노드 컴포넌트]
    Pod1[kube-apiserver]
    Pod2[kube-controller-manager]
    Pod3[kube-scheduler]
    Pod4[etcd]
    end
</div>

1.  **디렉토리 감시:** kubelet은 `--pod-manifest-path`에 지정된 디렉토리를 감시합니다.
2.  **자동 생성/갱신:** 해당 디렉토리에 YAML 파일이 추가되면 즉시 Pod를 생성하고, 파일이 수정되면 Pod를 재시작하여 변경사항을 반영합니다.
3.  **Mirror Pod:** kubelet은 Static Pod의 상태를 API 서버에 보고하기 위해 'Mirror Pod'를 생성하여 `kubectl get pods` 명령으로 상태를 확인할 수 있게 합니다. (단, 삭제는 로컬 파일 삭제로만 가능)

---

## API Server 와의 관계

Kubernetes 클러스터에서 가장 먼저 실행되어야 하는 컴포넌트는 API Server입니다. 하지만 API Server가 있어야 Pod를 띄울 수 있는 '닭과 달걀' 문제가 발생합니다.

- **해결책:** API Server 자체를 **Static Pod**로 구성합니다.
- **부팅 순서:** 시스템 시작 시 `kubelet`이 먼저 뜨고 -> 로컬 디렉토리의 `kube-apiserver.yaml`을 읽어 -> API Server 컨테이너를 구동합니다.

---

## 실습: Static Pod 설정 확인

마스터 노드에서 kubelet이 어느 디렉토리를 보고 있는지 확인하는 방법입니다.

```bash
# kubelet 설정에서 staticPodPath 확인
grep staticPodPath /var/lib/kubelet/config.yaml

# 출력 결과 예시
# staticPodPath: /etc/kubernetes/manifests
```

**Static Pod는 클러스터의 '심장'인 컨트롤 플레인을 깨우는 핵심 메커니즘이며, 이를 통해 Kubernetes는 스스로를 구동하는 자가 관리(Self-hosting) 능력을 갖게 됩니다.**
