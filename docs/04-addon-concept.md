# K8s Add-on 개념의 중요성

Kubernetes 는 핵심 컴포넌트와 Add-on 을 명확히 분리하는 철학을 가지고 있습니다.

## Add-on 이란?

Add-on 은 Kubernetes 클러스터의 기능을 확장하지만, 핵심 동작에 필수적이지 않은 선택적 컴포넌트입니다.

## 주요 Add-on 예시

- **CNI 플러그인:** Calico, Flannel, Weave, Cilium (네트워킹)
- **CSI 드라이버:** AWS EBS, GCP PD, Ceph, NFS (저장소)
- **Ingress Controller:** Nginx, Traefik, HAProxy
- **모니터링:** Prometheus, Grafana
- **로그 수집:** Fluentd, Filebeat
- **DNS:** CoreDNS, kube-dns

## Add-on 개념이 중요한 이유

### 1. 유연성과 확장성

사용자는 자신의 요구사항에 맞는 Add-on 을 선택적으로 설치할 수 있습니다. 예를 들어, 네트워크 플러그인을 Calico 대신 Cilium 으로 교체할 수 있습니다.

### 2. 핵심과 부가기능 분리

Kubernetes 핵심 코드는 안정적으로 유지되면서, Add-on 은 독립적으로 발전할 수 있습니다. 이는 업그레이드와 유지보수를 용이하게 합니다.

### 3. 플러그 가능한 아키텍처

CNI, CSI, CRI 와 같은 표준 인터페이스를 통해 서드파티 벤더가 쉽게 통합할 수 있습니다.

### 4. 클라우드 중립성

특정 클라우드 제공자에 종속되지 않고, 다양한 환경에서 동일한 Kubernetes 를 사용할 수 있습니다.

## Add-on 예시 설치

```bash
# Calico CNI 설치
kubectl apply -f https://raw.githubusercontent.com/
  projectcalico/calico/v3.31.3/manifests/calico.yaml

# Add-on 확인
kubectl get pods -n kube-system
```
