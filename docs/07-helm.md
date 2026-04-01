# Helm - Kubernetes 패키지 관리자

Helm은 Kubernetes 애플리케이션을 정의하고, 설치하고, 업그레이드하기 위한 **패키지 관리자**입니다.

---

## 1. Helm 이란?

Helm은 복잡한 Kubernetes 리소스들을 하나의 패키지(Chart)로 묶어서 관리할 수 있게 해주는 도구입니다. 리눅스의 `apt`나 `yum`, Node.js의 `npm`과 유사한 역할을 합니다.

### 주요 핵심 개념

| 용어 | 설명 | 비고 |
|------|------|------|
| **Chart** | Helm의 패키지 단위 | 템플릿, 설정 파일 모음 |
| **Release** | 클러스터에 설치된 Chart 인스턴스 | 동일 Chart를 여러 번 설치 가능 |
| **Repository** | Chart들이 저장되어 있는 서버 | Artifact Hub 등 |
| **Values** | 사용자가 주입하는 동적 설정값 | `values.yaml` |

---

## 2. Helm 동작 아키텍처

Helm CLI를 통해 원격 저장소에서 차트를 가져와 클러스터에 배포하는 흐름입니다.

<div class="mermaid">
graph LR
    User[사용자 / Helm CLI] -- "1. helm install" --> Cluster[Kubernetes Cluster]
    Repo[(Chart Repository)] -- "2. Fetch Chart" --> User
    User -- "3. Render Templates" --> Cluster
    Cluster -- "4. Create Objects" --> Release[Release Instance]
</div>

---

## 3. Chart 디렉토리 구조

Helm 차트는 다음과 같은 표준화된 디렉토리 구조를 가집니다.

```text
my-chart/
├── Chart.yaml          # 차트 정보 (이름, 버전 등)
├── values.yaml         # 기본 설정값
├── charts/             # 의존성이 있는 서브 차트들
├── templates/          # K8s 매니페스트 템플릿
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl    # 공통 템플릿 함수
└── README.md           # 도움말
```

---

## 4. 주요 명령어 요약

### 설치 및 관리
- **저장소 등록:** `helm repo add <이름> <URL>`
- **차트 검색:** `helm search repo <검색어>`
- **차트 설치:** `helm install <릴리스명> <차트명>`
- **릴리스 조회:** `helm list`
- **릴리스 업그레이드:** `helm upgrade <릴리스명> <차트명>`
- **릴리스 롤백:** `helm rollback <릴리스명> <버전>`
- **릴리스 삭제:** `helm uninstall <릴리스명>`

---

## 5. Helm 사용의 이점

1.  **템플릿화:** YAML 파일에 변수(`{{ .Values.name }}`)를 사용하여 환경(Dev/Prod)별로 다른 설정을 쉽게 적용할 수 있습니다.
2.  **버전 관리:** 배포 단위로 버전이 관리되어 장애 발생 시 즉각적인 **롤백**이 가능합니다.
3.  **의존성 해결:** 복잡한 앱에 필요한 여러 오픈소스(DB, Redis 등)를 서브 차트로 간단히 통합할 수 있습니다.
4.  **표준화:** 사내 배포 규격을 차트 형태로 공유하여 팀 간 배포 일관성을 유지할 수 있습니다.

**Helm은 현대적인 Kubernetes 운영에서 CI/CD 파이프라인의 핵심 도구로 자리 잡고 있습니다.**
