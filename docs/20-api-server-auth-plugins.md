# API Server 요청 처리 플러그인

Kubernetes API Server 가 요청을 처리하는 3 단계 플러그인 (Authentication, Authorization, Admission Control) 에 대해 알아봅니다.

---

## API Server 요청 처리 파이프라인

Kubernetes API 서버로 들어오는 모든 HTTP 요청은 다음의 엄격한 보안 단계를 순차적으로 거칩니다.

<div class="mermaid">
flowchart TD
    Request[HTTP Request / kubectl 요청] --> AuthN[1. Authentication 인증]
    AuthN -- "401 Unauthorized" --> Deny1[요청 거부]
    AuthN -- "인증 성공 (User/Group 추출)" --> AuthZ[2. Authorization 인가]
    
    AuthZ -- "403 Forbidden" --> Deny2[요청 거부]
    AuthZ -- "인가 성공 (권한 확인 완료)" --> Admission[3. Admission Control 어드미션]
    
    Admission -- "403 Forbidden" --> Deny3[요청 거부]
    Admission -- "최종 승인" --> ETCD[(4. etcd 연산 및 결과 반환)]
</div>

---

## 단계별 상세 흐름

### Stage 1: Authentication (인증)
"요청자가 누구인가?"를 확인하는 단계입니다. API 서버는 설정된 여러 인증 플러그인을 순서대로 실행하며, 하나라도 성공하면 사용자를 식별합니다.

| 플러그인 유형 | 설명 | 주요 사용처 |
|---------------|------|------------|
| **X.509 Client Certs** | 클라이언트 인증서의 CN/O 필드 확인 | 관리자, kubelet 통신 |
| **Static Token File** | 서버의 정적 파일에 저장된 토큰 확인 | 테스트, 레거시 환경 |
| **ServiceAccount** | Pod 내에 마운트된 JWT 토큰 확인 | 애플리케이션(Pod) 인증 |
| **OIDC** | 외부 IDP (Google, Okta 등) 토큰 확인 | 엔터프라이즈 통합 인증 |
| **Webhook** | 외부 서비스에 인증 요청 위임 | 커스텀 인증 시스템 연동 |
| **Anonymous** | 앞선 모든 인증 실패 시 익명 사용자로 처리 | 상태 체크(Healthz) 등 |

---

### Stage 2: Authorization (인가)
인증된 사용자가 "해당 리소스에 대해 특정 작업을 할 권한이 있는가?"를 확인합니다.

| 인가 모드 | 설명 | 비고 |
|-----------|------|------|
| **Node** | kubelet이 자신에게 할당된 리소스만 접근하도록 제한 | 특수 목적 인가 |
| **RBAC** | 역할(Role)과 바인딩(Binding)을 통한 권한 관리 | **가장 권장되는 방식** |
| **Webhook** | 외부 서비스에 권한 확인(Allow/Deny) 요청 | 커스텀 권한 시스템 |
| **ABAC** | 파일 기반의 속성 접근 제어 | 관리의 어려움으로 비권장 |
| **AlwaysAllow** | 모든 요청을 무조건 허용 | 보안 위험 (테스트용) |

---

### Stage 3: Admission Control (어드미션 컨트롤)
인증과 인가를 통과한 요청이 "클러스터의 정책과 요구사항을 만족하는가?"를 최종 검사합니다.

1.  **Mutating Admission:** 요청 데이터를 수정하거나 기본값을 채워넣습니다. (예: Sidecar 주입)
2.  **Validating Admission:** 요청 데이터가 올바른지 검증하고 거부 여부를 결정합니다. (예: Resource Quota 체크)

---

## 요약

| 단계 | 주요 역할 | 실패 시 반환 코드 |
|------|-----------|-------------------|
| **Authentication** | 신원 확인 (Who) | 401 Unauthorized |
| **Authorization** | 권한 확인 (What) | 403 Forbidden |
| **Admission** | 정책 검수 (Policy) | 403 Forbidden |

**API Server의 파이프라인 구조를 이해하면 클러스터 보안의 병목 지점이나 설정 오류를 정확히 진단할 수 있습니다.**
