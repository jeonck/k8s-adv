# API Server 에 Keycloak OIDC 설정 추가

Kubernetes API 서버를 외부 IAM 솔루션인 Keycloak과 연동하여 **OpenID Connect(OIDC)** 인증을 활성화하는 실습입니다.

---

## 실습 개요

본 실습에서는 API 서버가 Keycloak에서 발급한 ID Token을 신뢰하고, 이를 통해 사용자를 식별하도록 설정합니다.

| 항목 | 상세 정보 | 비고 |
|------|-----------|------|
| **Issuer URL** | `https://keycloak.example.com/auth/realms/edu` | 토큰 발급 기관 주소 |
| **Client ID** | `kubernetes-cluster` | Keycloak에 등록된 클라이언트 ID |
| **Username Claim** | `preferred_username` | 토큰 내 사용자 이름 필드 |
| **Groups Claim** | `groups` | 토큰 내 그룹 정보 필드 |

---

## OIDC 연동 아키텍처

<div class="mermaid">
sequenceDiagram
    participant U as 사용자
    participant K as kubectl (oidc-login)
    participant KC as Keycloak IdP
    participant AS as API Server
    
    U->>K: 1. 로그인 시도
    K->>KC: 2. 인증 요청
    KC-->>U: 3. 로그인 화면 (ID/PW 입력)
    KC->>K: 4. ID Token 발급
    K->>AS: 5. Token과 함께 요청 전송
    Note over AS: 6. Issuer URL 접속하여 공개키 획득
    Note over AS: 7. 공개키로 Token 서명 검증
    AS-->>U: 8. 최종 승인 및 결과 반환
</div>

---

## 1단계: API Server OIDC 옵션 추가

마스터 노드의 `kube-apiserver.yaml` 파일에 Keycloak 정보를 등록합니다.

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    ...
    # OIDC 설정 추가
    - --oidc-issuer-url=https://keycloak.example.com/auth/realms/edu
    - --oidc-client-id=kubernetes-cluster
    - --oidc-username-claim=preferred_username
    - --oidc-groups-claim=groups
    - --oidc-ca-file=/etc/kubernetes/pki/keycloak-ca.crt # Keycloak TLS 검증용
```

---

## 2단계: RBAC 권한 매핑

Keycloak 사용자가 인증에 성공해도 권한이 없으면 작업을 수행할 수 없습니다. Keycloak의 그룹명을 기반으로 Kubernetes 권한을 할당합니다.

```yaml
# keycloak-admin-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-admin-group
subjects:
- kind: Group
  name: "/kubernetes-admins" # Keycloak에서 전달받은 그룹명
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

---

## 주의사항

1.  **시간 동기화:** API 서버와 Keycloak 서버 간의 시간이 맞지 않으면 토큰의 `iat` 또는 `exp` 검증에서 실패할 수 있습니다. (NTP 필수)
2.  **HTTPS 필수:** OIDC는 보안을 위해 반드시 HTTPS(TLS) 환경에서 동작해야 합니다.
3.  **Client ID 확인:** Keycloak 설정의 `Client ID`와 API 서버의 `--oidc-client-id` 값이 정확히 일치해야 합니다.

**Keycloak 연동을 완료하면 클러스터 내부의 개별 인증서 관리 부담에서 벗어나, 기업 차원의 중앙 집중식 계정 관리가 가능해집니다.**
