# K8s CSI (Container Storage Interface) 의 철학

CSI 는 Kubernetes 가 저장소 벤더 중립성을 유지하기 위한 핵심 설계 철학입니다.

## CSI 란?

Container Storage Interface 는 컨테이너 오케스트레이션 시스템이 스토리지 시스템과 상호작용하기 위한 표준 인터페이스입니다.

## CSI 의 핵심 철학

### 1. 벤더 중립성 (Vendor Neutrality)

Kubernetes 코어에 특정 스토리지 벤더의 코드를 포함하지 않습니다. 대신 표준 인터페이스만 정의하고, 각 벤더가 자신의 CSI 드라이버를 제공합니다.

### 2. 분리된 책임 (Separation of Concerns)

```
┌─────────────────────┐
│   Kubernetes Core   │
│  (볼륨 관리 로직)   │
└──────────┬──────────┘
           │ CSI Interface
           ▼
┌─────────────────────┐
│  CSI Driver         │
│  (벤더별 구현)      │
│  - AWS EBS          │
│  - GCP PD           │
│  - Ceph             │
│  - NetApp           │
│  - Pure Storage     │
└─────────────────────┘
```

### 3. 플러그 가능성 (Pluggability)

새로운 스토리지 시스템을 추가할 때 Kubernetes 코어를 수정할 필요가 없습니다. CSI 드라이버만 개발하면 됩니다.

### 4. 일관된 인터페이스

모든 CSI 드라이버는 동일한 인터페이스를 구현합니다:

- `ControllerPublishVolume` - 볼륨을 노드에 연결
- `NodeStageVolume` - 볼륨을 노드에 스테이징
- `NodePublishVolume` - 볼륨을 Pod 에 마운트
- `NodeUnpublishVolume` - 볼륨 마운트 해제
- `ControllerDeleteVolume` - 볼륨 삭제

## CSI 사용 예시

### StorageClass 정의 (AWS EBS 예시)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
```

### PVC 에서 사용

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-claim
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-sc
  resources:
    requests:
      storage: 10Gi
```

## CSI 의 장점

- 스토리지 벤더는 Kubernetes 릴리스 주기와 무관하게 드라이버를 업데이트할 수 있음
- 사용자는 다양한 스토리지 옵션 중에서 선택할 수 있음
- Kubernetes 코어는 간결하게 유지됨
- 동일한 PVC YAML 로 다양한 스토리지 백엔드를 사용할 수 있음
