# OAuth 2.0 개념 정리

OAuth 2.0은 현대 웹과 모바일 환경에서 가장 널리 쓰이는 **권한 부여(Authorization) 프레임워크**입니다. "인증은 사용자가 직접 하고, 애플리케이션은 제한된 권한만 위임받는다"는 것이 핵심입니다.

---

## 핵심 철학

> **"인증(Authentication)은 사용자가 수행하고, 권한 부여(Authorization)는 클라이언트가 받는다."**

이 문장은 OAuth 2.0의 존재 이유를 가장 잘 설명합니다. 사용자의 소중한 비밀번호를 제3의 앱에 알려주지 않고도, 그 앱이 나를 대신해 특정 데이터(예: 구글 캘린더 읽기)에 접근할 수 있게 해줍니다.

---

## 인증(AuthN) vs 권한 부여(AuthZ)

| 구분 | 인증 (Authentication) | 권한 부여 (Authorization) |
|------|-----------------------|--------------------------|
| **질문** | "당신은 누구입니까?" | "무엇을 할 수 있습니까?" |
| **목적** | 신원 확인 | 리소스 접근 권한 획득 |
| **수단** | ID/PW, 생체 인증, OTP | **Access Token** |
| **주체** | 사용자 (User) | 애플리케이션 (Client) |

---

## OAuth 2.0의 4가지 역할 (Roles)

OAuth 2.0 프로토콜에는 서로 다른 책임을 가진 4가지 주체가 등장합니다.

<div class="mermaid">
graph TD
    User[Resource Owner<br/>사용자]
    Client[Client<br/>애플리케이션]
    AuthServer[Authorization Server<br/>권한 서버]
    ResServer[Resource Server<br/>데이터 서버]

    User -- "1. 나 로그인 할게" --> AuthServer
    AuthServer -- "2. 인증됨, 권한 증표 발급" --> Client
    Client -- "3. 증표(Token)로 데이터 요청" --> ResServer
    ResServer -- "4. 데이터 제공" --> Client
</div>

1.  **Resource Owner (사용자):** 데이터의 주인입니다. (예: 구글 계정 소유자)
2.  **Client (애플리케이션):** 사용자의 데이터에 접근하려는 앱입니다. (예: 일정 관리 앱)
3.  **Authorization Server (권한 서버):** 사용자를 인증하고 Access Token을 발급하는 서버입니다. (예: Google OAuth 서버)
4.  **Resource Server (리소스 서버):** 사용자의 실제 데이터가 저장된 서버입니다. (예: Google Calendar API)

---

## 대표적인 권한 부여 승인 방식 (Grant Types)

| 방식 | 특징 | 주요 사용처 |
|------|------|------------|
| **Authorization Code** | 보안이 가장 강력함 (Code 교환 방식) | 일반적인 웹 서버 애플리케이션 |
| **Implicit** | 단순하지만 보안에 취약 (제거 추세) | 자바스크립트 기반 단일 페이지 앱(SPA) |
| **Resource Owner Password** | 사용자 비번을 직접 받음 (비권장) | 신뢰할 수 있는 퍼스트 파티 앱 |
| **Client Credentials** | 사용자 없이 앱끼리 통신 | 서버 간 API 통신 (M2M) |

**OAuth 2.0은 단순히 로그인을 대신해주는 도구가 아니라, 안전하게 권한을 위임하고 관리하는 거대한 보안 프레임워크입니다.**
