# Krew - kubectl plugin 매니저 가이드

Krew는 `kubectl` 플러그인을 발견하고, 설치하고, 관리하기 위한 공식 패키지 관리자입니다.

---

## 1. Krew 란?

Krew는 리눅스의 `apt`, `yum` 또는 macOS의 `brew`와 유사한 역할을 수행하는 **kubectl 전용 플러그인 관리 도구**입니다.

### 핵심 개념

- **표준화:** 모든 플러그인을 동일한 방식으로 설치하고 업데이트할 수 있습니다.
- **공식 허브:** 수백 개의 검증된 커뮤니티 플러그인을 제공합니다.
- **멀티 플랫폼:** Linux, macOS, Windows를 모두 지원합니다.

<div class="mermaid">
graph LR
    Krew[Krew CLI] -- "1. search/install" --> Index[Krew Plugin Index]
    Index -- "2. Download" --> Krew
    Krew -- "3. Register to PATH" --> Kubectl[kubectl plugin list]
</div>

---

## 2. Krew 사용의 장점

| 구분 | 수동 설치 (Manual) | Krew 사용 |
|------|--------------------|-----------|
| **검색** | GitHub 등을 직접 뒤져야 함 | `kubectl krew search`로 즉시 검색 |
| **설치** | 파일 복사, 권한 부여 수동 작업 | `kubectl krew install <name>` 끝 |
| **업데이트** | 새 버전 확인 후 다시 설치 | `kubectl krew upgrade`로 일괄 업데이트 |
| **제거** | 파일 위치 찾아 직접 삭제 | `kubectl krew uninstall <name>` |

---

## 3. 추천 kubectl 플러그인 (Top 5)

| 플러그인 이름 | 주요 기능 | 설치 명령어 |
|---------------|-----------|------------|
| **ns** | 네임스페이스를 쉽고 빠르게 전환 | `kubectl krew install ns` |
| **ctx** | 여러 클러스터 컨텍스트를 빠르게 전환 | `kubectl krew install ctx` |
| **oidc-login** | Keycloak 등 OIDC 인증 자동화 | `kubectl krew install oidc-login` |
| **tree** | 리소스 간의 계층 구조를 시각화 | `kubectl krew install tree` |
| **who-can** | 특정 동작을 할 수 있는 권한자 분석 | `kubectl krew install who-can` |

---

## 4. 핵심 명령어 요약

- **인덱스 업데이트:** `kubectl krew update`
- **플러그인 검색:** `kubectl krew search <키워드>`
- **플러그인 설치:** `kubectl krew install <이름>`
- **설치된 목록:** `kubectl krew list`
- **플러그인 업그레이드:** `kubectl krew upgrade`
- **플러그인 제거:** `kubectl krew uninstall <이름>`

---

## 5. 결론

Krew를 사용하면 `kubectl`의 기본 기능을 넘어선 강력한 관리 도구들을 클릭 몇 번으로 클러스터 운영 환경에 즉시 통합할 수 있습니다. 숙련된 Kubernetes 운영자라면 필수적으로 사용해야 하는 도구입니다.
