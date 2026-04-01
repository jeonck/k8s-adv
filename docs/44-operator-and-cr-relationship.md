# Operator 와 Custom Resource (CR) 관계

Kubernetes 환경에서 Operator와 Custom Resource(CR)가 어떻게 상호작용하며 애플리케이션을 관리하는지 이해합니다.

---

## 1. 핵심 개념 및 비유

Operator와 CR의 관계를 가장 쉽게 이해하는 방법은 **'공장'**과 **'주문서'**의 관계로 보는 것입니다.

| 항목 | 개념 | 비유 | 주요 구성 요소 |
|------|------|------|---------------|
| **Operator** | 운영 지식을 담은 자동화 소프트웨어 | **관리 로봇이 있는 공장** | Controller, CRD, 도메인 지식 |
| **Custom Resource** | 사용자가 정의한 리소스 인스턴스 | **고객의 주문서(설계도)** | 원하는 상태(spec) 정의 |

<div class="mermaid">
graph TD
    User[사용자] -- "1. 주문서(CR) 제출" --> API[K8s API Server]
    API -- "2. 생성 이벤트 감지" --> OP[Operator / Controller]
    
    subgraph Operator_Logic
    OP -- "3. spec 해석" --> Reconcile{Reconcile Loop}
    Reconcile -- "4. 실제 리소스 생성" --> Real[Pods, Services, PVCs]
    Real -- "5. 현재 상태 피드백" --> Reconcile
    end
    
    Reconcile -- "6. status 업데이트" --> API
</div>

---

## 2. 왜 Operator 를 먼저 설치해야 하는가?

클러스터에 CR을 배포하기 전에 반드시 Operator가 실행 중이어야 하는 4가지 이유입니다.

1.  **CRD 등록:** Kubernetes가 새로운 리소스 타입(예: `kind: MySQL`)을 인식할 수 있도록 정의서(CRD)를 먼저 알려줘야 합니다.
2.  **컨트롤러 활성화:** 주문서(CR)가 들어왔을 때 이를 읽고 실제 Pod를 띄울 '두뇌(Controller)'가 이미 대기하고 있어야 합니다.
3.  **RBAC 권한:** Operator가 Pod나 Service를 대신 만들 수 있도록 필요한 권한(Role/Binding)이 먼저 설정되어야 합니다.
4.  **의존성 준비:** 비밀번호 저장용 Secret이나 저장소 설정 등 앱 실행에 필요한 기초 인프라를 Operator가 먼저 구성해둡니다.

---

## 3. CR 에 담기는 정보 (spec vs status)

사용자는 `spec`을 통해 **"원하는 상태"**를 말하고, Operator는 `status`를 통해 **"현재 상태"**를 보고합니다.

| 필드 | 역할 | 주요 담기는 내용 |
|------|------|----------------|
| **spec** | 사용자 정의 (Desired) | 버전, 복제본(Replicas), 리소스(CPU/Mem), 백업 스케줄, 포트 등 |
| **status** | Operator 기록 (Current) | 현재 실행 중인 Pod 수, 접속 주소(Endpoint), 마지막 백업 시간, 에러 메시지 등 |

---

## 4. 요약: 비유로 정리하기

- **Operator = 아파트 단지 관리사무소:** 설립(설치)이 먼저 되어야 직원(컨트롤러)과 장비(권한)가 준비됩니다.
- **CR = 입주 신청서:** 관리사무소가 문을 연 뒤에 신청서를 내야 동호수(name)를 배정받고 열쇠(Service)를 받을 수 있습니다.

**관리사무소(Operator) 없이 신청서(CR)만 내면, 그 신청서는 아무도 읽지 않는 종이 조각에 불과합니다.**
