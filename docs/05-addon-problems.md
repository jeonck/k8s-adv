# Add-on 컴포넌트 구성의 문제점

Kubernetes 의 Add-on 방식은 유연성을 제공하지만, 여러 문제점과 복잡성을 야기합니다.

## 1. 버전 호환성 문제

### Kubernetes 버전과의 호환성

각 Add-on 은 특정 Kubernetes 버전 범위에서만 동작합니다. 클러스터를 업그레이드할 때 모든 Add-on 의 호환성을 확인해야 합니다.

```bash
# 예: Calico v3.31 은 K8s 1.30+ 필요
# K8s 업그레이드 전 확인 사항
- CNI 플러그인 버전
- CSI 드라이버 버전
- CoreDNS 버전
- Ingress Controller 버전
```

### Add-on 간 상호 의존성

일부 Add-on 은 다른 Add-on 에 의존합니다. 예를 들어, Service Mesh 는 CNI 플러그인과 호환되어야 합니다.

## 2. 설정 복잡성

### 수동 설정 오류

각 Add-on 마다 설정 방식이 다르며, YAML 파일의 정확한 이해가 필요합니다.

```bash
# Calico 설치 시 고려사항
- IP 풀 설정 (CIDR)
- MTU 크기
- BGP vs IPIP 모드
- Typha 컴포넌트 설정 (대규모 클러스터)
```

### 환경별 차이

개발, 스테이징, 프로덕션 환경마다 다른 설정이 필요하며, 일관성 유지가 어렵습니다.

## 3. 유지보수 부담

### 업그레이드 관리

각 Add-on 의 업그레이드 주기가 다르며, 수동으로 관리해야 합니다.

```bash
# 업그레이드 체크리스트
□ CNI 드라이버 업데이트
□ CSI 드라이버 업데이트
□ Metrics Server 업데이트
□ CoreDNS 업데이트
□ Ingress Controller 업데이트
□ 모니터링 스택 업데이트
```

### 보안 패치

취약점이 발견되면 각 Add-on 을 개별적으로 패치해야 합니다.

## 4. 일관성 부족

### 설정 방식의 불일치

각 Add-on 이 다른 설정 방식을 사용합니다:

```
일부 Add-on: ConfigMap 기반
일부 Add-on: CLI 플래그 기반
일부 Add-on: 환경 변수 기반
일부 Add-on: 별도 CRD 기반
```

### 모니터링 통합 부재

각 Add-on 이 다른 방식으로 로그와 메트릭을 출력하여 통합 모니터링이 어렵습니다.

## 5. 리소스 경쟁

### 노드 리소스 경합

여러 Add-on 이 동일한 노드에서 실행되며 CPU, 메모리, 네트워크를 경쟁합니다.

```bash
# kube-system 네임스페이스 리소스 사용량 예시
NAMESPACE     CPU      MEMORY
kube-system   2.5 core 4Gi

Add-on 별 사용량:
- Calico:        200m CPU, 500Mi Memory
- CoreDNS:       300m CPU, 400Mi Memory
- Metrics Server: 100m CPU, 200Mi Memory
- Prometheus:    1.5 core, 2.5Gi Memory
```

## 6. 디버깅 어려움

### 문제 분리

클러스터 문제가 Kubernetes 코어의 문제인지, Add-on 의 문제인지 구분하기 어렵습니다.

### 로그 분산

각 Add-on 이 다른 위치에 로그를 저장하여 문제 추적이 어렵습니다.

## 7. 벤더 락인 (Vendor Lock-in)

### 클라우드 특화 Add-on

특정 클라우드의 CSI/CNI 를 사용하면 다른 클라우드로 이전이 어려워집니다.

```bash
# AWS 종속적 Add-on 예시
- aws-ebs-csi-driver
- aws-load-balancer-controller
- vpc-cni

# GCP 종속적 Add-on 예시
- gcp-compute-persistent-disk-csi-driver
- gke-gateway-controller
```

## 해결 방안

| 문제 | 해결 방안 |
|------|-----------|
| 버전 호환성 | Helm Chart, Operator 를 통한 버전 관리 |
| 설정 복잡성 | GitOps (ArgoCD, Flux) 를 통한 일관된 설정 |
| 유지보수 부담 | 자동화된 업그레이드 파이프라인 구축 |
| 일관성 부족 | 기업 표준 Chart 템플릿 정의 |
| 디버깅 어려움 | 중앙 집중식 로깅/모니터링 시스템 구축 |
| 벤더 락인 | 클라우드 중립적 Add-on 선택 (예: Cilium, Longhorn) |
