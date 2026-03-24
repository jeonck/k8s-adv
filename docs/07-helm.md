# Helm - Kubernetes 패키지 관리자

Helm 은 Kubernetes 애플리케이션을 정의하고, 설치하고, 업그레이드하기 위한 패키지 관리자입니다.

## Helm 이란?

Helm 은 Kubernetes 리소스를 템플릿화하고, 버전 관리하며, 재사용 가능한 패키지로 배포할 수 있게 해주는 CNCF 졸업 프로젝트입니다.

## 주요 개념

| 용어 | 설명 |
|------|------|
| **Chart** | Helm 패키지 (템플릿, 설정, 의존성 포함) |
| **Release** | 클러스터에 배포된 Chart 의 인스턴스 |
| **Repository** | Chart 를 호스팅하는 서버 |
| **Values** | Chart 에 전달하는 사용자 정의 설정 |

## Helm 아키텍처

```
┌─────────────────┐
│     Helm CLI    │
│  (사용자 명령)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Chart Repo     │      │  Kubernetes     │
│  (저장소)       │      │  Cluster        │
│                 │      │  ┌───────────┐  │
│  - bitnami/     │      │  │ Release   │  │
│  - prometheus/  │──────│→ │ (배포)    │  │
│  - grafana/     │      │  └───────────┘  │
└─────────────────┘      └─────────────────┘
```

## Chart 디렉토리 구조

```
my-chart/
├── Chart.yaml          # Chart 메타데이터 (이름, 버전, 설명)
├── values.yaml         # 기본 설정 값
├── values-prod.yaml    # 프로덕션 환경 설정
├── charts/             # 서브 차트 (의존성)
├── templates/          # Kubernetes 매니페스트 템플릿
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── _helpers.tpl    # 템플릿 헬퍼 함수
└── README.md
```

## 주요 Helm 명령어

### 저장소 관리

```bash
# 저장소 추가
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Chart 검색
helm search repo nginx
helm search hub wordpress
```

### Chart 설치

```bash
helm install my-release bitnami/nginx
helm install my-app ./my-chart -f values-prod.yaml
```

### Release 관리

```bash
helm list                    # 설치된 Release 목록
helm status my-release       # Release 상태 확인
helm upgrade my-release bitnami/nginx --set image.tag=1.25
helm rollback my-release 1   # 이전 버전으로 롤백
helm uninstall my-release    # Release 삭제
```

### Chart 개발

```bash
helm create my-chart         # 새 Chart 스캐폴딩
helm lint ./my-chart         # Chart 문법 검사
helm template ./my-chart     # 템플릿 렌더링 확인
helm package ./my-chart      # Chart 패키징 (.tgz)
```

## values.yaml 예시

```yaml
replicaCount: 3

image:
  repository: nginx
  tag: "1.25"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
```

## 템플릿 예시 (templates/deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-deployment
  labels:
    app: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 80
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

## Helm 사용 장점

- **재사용성:** 하나의 Chart 로 여러 환경 (dev/staging/prod) 에 배포 가능
- **버전 관리:** Release 히스토리를 통해 롤백 및 감사 가능
- **의존성 관리:** 서브 차트를 통해 복잡한 애플리케이션 구성 가능
- **템플릿 엔진:** Go 템플릿을 사용한 동적 manifest 생성
- **커뮤니티 Chart:** Artifact Hub 에서 수천 개의 검증된 Chart 사용 가능

## Artifact Hub

[Artifact Hub](https://artifacthub.io) 에서 다양한 Helm Charts 를 검색하고 설치할 수 있습니다.

```bash
# Prometheus 설치 예시
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```
