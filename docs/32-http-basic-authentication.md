# HTTP Basic Authentication

HTTP 기본 인증 (Basic Auth) 에 대해 알아봅니다.

---

## HTTP Basic Authentication 이란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          HTTP Basic Authentication                          │
└─────────────────────────────────────────────────────────────┘

정의:
  - HTTP 프로토콜 기반의 간단한 인증 방식
  - 사용자명 (username) 과 비밀번호 (password) 사용
  - RFC 7617 에 정의된 표준

특징:
  ✓ 구현이 간단함
  ✓ 모든 브라우저와 HTTP 클라이언트 지원
  ✓ base64 인코딩 사용 (암호화 아님!)
  ✗ HTTPS 와 함께 사용해야 안전함
  ✗ Kubernetes 1.19 부터 제거됨 (레거시)
```

---

## Basic Auth 동작 원리

### 인증 흐름

```
┌─────────────────────────────────────────────────────────────┐
│          Basic Auth 인증 흐름                               │
└─────────────────────────────────────────────────────────────┘

클라이언트                              서버
   │                                      │
   │  1. 리소스 요청 (인증 없음)          │
   │─────────────────────────────────────▶│
   │                                      │
   │  2. 401 Unauthorized 응답            │
   │  WWW-Authenticate: Basic             │
   │  realm="Protected Area"              │
   │◀─────────────────────────────────────│
   │                                      │
   │  3. 인증정보 포함 재요청             │
   │  Authorization: Basic base64(user:pass)
   │─────────────────────────────────────▶│
   │                                      │
   │  4. 인증 검증                         │
   │  - base64 디코딩                     │
   │  - 사용자명/비밀번호 확인            │
   │                                      │
   │  5. 인증 성공/실패                   │
   │  - 성공: 200 OK + 리소스             │
   │  - 실패: 401 Unauthorized            │
   │◀─────────────────────────────────────│
   └──────────────────────────────────────┘
```

---

## HTTP 헤더 예시

### 1. 초기 요청 (인증 없음)

```http
GET /protected/resource HTTP/1.1
Host: api.example.com
```

### 2. 서버 응답 (401 Unauthorized)

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Protected Area"
Content-Type: application/json

{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 3. 클라이언트 재요청 (인증정보 포함)

```http
GET /protected/resource HTTP/1.1
Host: api.example.com
Authorization: Basic aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=
```

### 4. 서버 응답 (인증 성공)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Success",
  "user": "honggildong"
}
```

---

## Authorization 헤더 상세

### 헤더 형식

```
┌─────────────────────────────────────────────────────────────┐
│          Authorization 헤더 형식                            │
└─────────────────────────────────────────────────────────────┘

형식:
  Authorization: Basic <base64-encoded-credentials>

credentials:
  username:password  (콜론으로 구분)

예시:
  사용자명: honggildong
  비밀번호: password123
  
  → "honggildong:password123"
  
  → base64 인코딩:
    aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=
  
  → 최종 헤더:
    Authorization: Basic aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=
```

### base64 인코딩 실습

```bash
# Linux/Mac 에서 base64 인코딩
echo -n "honggildong:password123" | base64

# 출력:
aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=

# base64 디코딩
echo "aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=" | base64 -d

# 출력:
honggildong:password123

# Python 에서 인코딩
python3 -c "import base64; print(base64.b64encode(b'honggildong:password123').decode())"

# 출력:
aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=

# curl 로 테스트
curl -u honggildong:password123 https://api.example.com/protected

# 또는 직접 헤더 지정
curl -H "Authorization: Basic aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=" \
  https://api.example.com/protected
```

---

## WWW-Authenticate 헤더

### 헤더 형식

```
┌─────────────────────────────────────────────────────────────┐
│          WWW-Authenticate 헤더                              │
└─────────────────────────────────────────────────────────────┘

형식:
  WWW-Authenticate: Basic realm="<영역이름>"

realm:
  - 보호된 영역의 이름
  - 브라우저에 표시되는 메시지
  - 사용자 인증서 저장 시 식별자로 사용

예시:
  WWW-Authenticate: Basic realm="Admin Area"
  WWW-Authenticate: Basic realm="API Access"
  WWW-Authenticate: Basic realm="Kubernetes API"
```

### 브라우저 동작

```
┌─────────────────────────────────────────────────────────────┐
│          브라우저의 Basic Auth 처리                         │
└─────────────────────────────────────────────────────────────┘

1. 서버가 401 + WWW-Authenticate 응답
       ↓
2. 브라우저가 인증 다이얼로그 표시
   ┌─────────────────────────────────────────┐
   │  Authentication Required                │
   │                                         │
   │  A username and password are being      │
   │  requested to access the site.          │
   │                                         │
   │  Username: [____________]               │
   │  Password: [____________]               │
   │                                         │
   │       [ Cancel ]    [ Log In ]          │
   └─────────────────────────────────────────┘
       ↓
3. 사용자가 입력 후 로그인
       ↓
4. 브라우저가 자동으로 Authorization 헤더 추가
       ↓
5. 서버로 재요청
```

---

## Basic Auth 보안 문제점

### 주요 취약점

```
┌─────────────────────────────────────────────────────────────┐
│          Basic Auth 보안 문제점                             │
└─────────────────────────────────────────────────────────────┘

1. base64 는 암호화가 아님
   ┌─────────────────────────────────────────┐
   │  base64 는 인코딩만 할 뿐!              │
   │                                         │
   │  anyone can decode:                     │
   │  aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=       │
   │  ↓                                      │
   │  honggildong:password123                │
   │                                         │
   │  → 중간에 탈취되면 즉시 노출!           │
   └─────────────────────────────────────────┘

2. 매 요청마다 인증정보 전송
   ┌─────────────────────────────────────────┐
   │  GET /api/users HTTP/1.1                │
   │  Authorization: Basic ...               │
   │                                         │
   │  GET /api/posts HTTP/1.1                │
   │  Authorization: Basic ...               │
   │                                         │
   │  GET /api/comments HTTP/1.1             │
   │  Authorization: Basic ...               │
   │                                         │
   │  → 매번 같은 인증정보 반복 전송         │
   │  → 탈취 위험 증가                       │
   └─────────────────────────────────────────┘

3. 세션 관리 없음
   ┌─────────────────────────────────────────┐
   │  - 로그아웃 기능 없음                   │
   │  - 인증정보 수동 삭제 필요              │
   │  - 브라우저 캐시에 저장됨               │
   │  - 탭 닫아도 인증정보 유지              │
   └─────────────────────────────────────────┘

4. 비밀번호 변경 어려움
   ┌─────────────────────────────────────────┐
   │  - 서버에서 비밀번호 변경 시            │
   │  - 클라이언트가 수동으로 업데이트 필요  │
   │  - 자동 갱신 메커니즘 없음              │
   └─────────────────────────────────────────┘
```

### 보안 대책

```
┌─────────────────────────────────────────────────────────────┐
│          Basic Auth 보안 대책                               │
└─────────────────────────────────────────────────────────────┘

1. HTTPS 필수 사용
   ┌─────────────────────────────────────────┐
   │  ✓ HTTPS 사용: 암호화된 터널           │
   │  ✗ HTTP 사용: 평문 노출                │
   │                                         │
   │  항상 HTTPS 와 함께 사용!               │
   └─────────────────────────────────────────┘

2. 강력한 비밀번호 정책
   ┌─────────────────────────────────────────┐
   │  - 최소 12 자 이상                      │
   │  - 대소문자, 숫자, 특수문자 포함        │
   │  - 정기적 변경                          │
   └─────────────────────────────────────────┘

3. Rate Limiting
   ┌─────────────────────────────────────────┐
   │  - 브루트포스 공격 방지                 │
   │  - 분당 시도 횟수 제한                  │
   │  - 실패 시 계정 잠금                    │
   └─────────────────────────────────────────┘

4. 대안 사용 권장
   ┌─────────────────────────────────────────┐
   │  현대적인 인증 방식 사용:               │
   │  - Token-based (JWT)                    │
   │  - OAuth 2.0 / OIDC                     │
   │  - API Keys                             │
   └─────────────────────────────────────────┘
```

---

## Basic Auth vs Token Auth

### 비교 표

```
┌─────────────────────────────────────────────────────────────┐
│          Basic Auth vs Token Auth                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  Basic Auth          │  Token Auth (JWT 등)                 │
├──────────────────────┼──────────────────────────────────────┤
│  인증정보            │  인증정보                            │
│  username:password   │  JWT token                           │
├──────────────────────┼──────────────────────────────────────┤
│  전송 방식           │  전송 방식                           │
│  매 요청마다         │  매 요청마다                         │
├──────────────────────┼──────────────────────────────────────┤
│  인코딩              │  인코딩                              │
│  base64              │  base64 (JWT)                        │
├──────────────────────┼──────────────────────────────────────┤
│  유효기간            │  유효기간                            │
│  없음 (수동 취소)    │  있음 (자동 만료)                    │
├──────────────────────┼──────────────────────────────────────┤
│  세션 관리           │  세션 관리                           │
│  서버에 상태 없음    │  서버에 상태 없음 (stateless)        │
├──────────────────────┼──────────────────────────────────────┤
│  권한 세분화         │  권한 세분화                         │
│  어려움              │  쉬움 (claims 에 포함)               │
├──────────────────────┼──────────────────────────────────────┤
│  로그아웃            │  로그아웃                            │
│  어려움 (브라우저)   │  쉬움 (토큰 폐기)                    │
├──────────────────────┼──────────────────────────────────────┤
│  보안성              │  보안성                              │
│  낮음 (base64)       │  높음 (서명 + 만료)                  │
├──────────────────────┼──────────────────────────────────────┤
│  사용처              │  사용처                              │
│  레거시, 간단한 API  │  현대적 API, 마이크로서비스          │
└──────────────────────┴──────────────────────────────────────┘
```

---

## Kubernetes 와 Basic Auth

### Kubernetes 에서 Basic Auth 사용 (레거시)

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes Basic Auth (레거시)                     │
└─────────────────────────────────────────────────────────────┘

Kubernetes 1.18 까지 지원:
  - 정적 비밀번호 파일 사용
  - --basic-auth-file 옵션

설정 예시 (kube-apiserver):
  --basic-auth-file=/etc/kubernetes/basic-auth.csv

basic-auth.csv 파일:
  password123,honggildong,1001
  admin456,admin,1000

형식:
  password,username,uid

Kubernetes 1.19 에서 제거됨:
  - 보안 문제
  - 현대적인 인증方式으로 대체
  - ServiceAccount, OIDC, 인증서 사용 권장
```

### 현대적인 Kubernetes 인증

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 현대적 인증 방식                        │
└─────────────────────────────────────────────────────────────┘

1. 클라이언트 인증서 (X.509)
   - 가장 안전한 방식
   - kubeadm 기본 인증
   - CN, O 로 사용자/그룹 식별

2. ServiceAccount 토큰
   - Pod 내부 API 접근용
   - JWT 토큰 사용
   - 자동 마운트

3. OIDC (OpenID Connect)
   - 외부 인증 제공자
   - Google, Microsoft, Okta 등
   - JWT 토큰 기반

4. Webhook Token
   - 외부 인증 서버 위임
   - 사용자 정의 인증 로직

Basic Auth 는 더 이상 사용 금지!
```

---

## 실습: Basic Auth 테스트

### Python 으로 Basic Auth 서버

```python
#!/usr/bin/env python3
# basic-auth-server.py

from http.server import HTTPServer, BaseHTTPRequestHandler
import base64

class BasicAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Authorization 헤더 확인
        auth_header = self.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Basic '):
            self.send_response(401)
            self.send_header('WWW-Authenticate', 'Basic realm="Test Area"')
            self.end_headers()
            self.wfile.write(b'Authentication required')
            return
        
        # base64 디코딩
        try:
            encoded = auth_header.split(' ')[1]
            decoded = base64.b64decode(encoded).decode('utf-8')
            username, password = decoded.split(':', 1)
        except:
            self.send_response(401)
            self.send_header('WWW-Authenticate', 'Basic realm="Test Area"')
            self.end_headers()
            self.wfile.write(b'Invalid authentication')
            return
        
        # 사용자 검증
        if username == 'honggildong' and password == 'password123':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f'Hello, {username}!'.encode())
        else:
            self.send_response(401)
            self.send_header('WWW-Authenticate', 'Basic realm="Test Area"')
            self.end_headers()
            self.wfile.write(b'Invalid credentials')
    
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), BasicAuthHandler)
    print('Server running on http://localhost:8000')
    server.serve_forever()
```

### 테스트

```bash
# 서버 실행
python3 basic-auth-server.py

# 다른 터미널에서 테스트

# 1. 인증 없이 요청
curl http://localhost:8000/protected
# 출력: Authentication required

# 2. 잘못된 인증정보
curl -u honggildong:wrongpassword http://localhost:8000/protected
# 출력: Invalid credentials

# 3. 올바른 인증정보
curl -u honggildong:password123 http://localhost:8000/protected
# 출력: Hello, honggildong!

# 4. Authorization 헤더 직접 지정
curl -H "Authorization: Basic aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=" \
  http://localhost:8000/protected
# 출력: Hello, honggildong!
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. HTTP Basic Authentication                               │
│     - 사용자명/비밀번호 기반 인증                          │
│     - RFC 7617 표준                                        │
│     - 구현 간단, 모든 브라우저 지원                        │
│                                                             │
│  2. Authorization 헤더                                      │
│     - 형식: Basic <base64-encoded-credentials>             │
│     - credentials: username:password                       │
│     - 예: Basic aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=           │
│                                                             │
│  3. WWW-Authenticate 헤더                                   │
│     - 서버가 401 응답시 포함                               │
│     - 형식: Basic realm="<영역이름>"                       │
│     - 브라우저 인증 다이얼로그 트리거                      │
│                                                             │
│  4. 보안 문제점                                             │
│     - base64 는 암호화 아님 (인코딩만)                     │
│     - 매 요청마다 인증정보 전송                            │
│     - 세션 관리 없음                                       │
│     - 반드시 HTTPS 와 함께 사용                            │
│                                                             │
│  5. Kubernetes 와 Basic Auth                                │
│     - 1.18 까지 지원 (레거시)                              │
│     - 1.19 에서 제거됨                                     │
│     - 인증서, ServiceAccount, OIDC 사용 권장               │
│                                                             │
│  6. 현대적인 대안                                           │
│     - Token-based (JWT)                                    │
│     - OAuth 2.0 / OIDC                                     │
│     - API Keys                                             │
└─────────────────────────────────────────────────────────────┘
```

### Basic Auth 헤더 예시 정리

```
┌─────────────────────────────────────────────────────────────┐
│          Basic Auth 헤더 예시                               │
└─────────────────────────────────────────────────────────────┘

요청 (인증 없음):
  GET /api/resource HTTP/1.1
  Host: api.example.com

응답 (401):
  HTTP/1.1 401 Unauthorized
  WWW-Authenticate: Basic realm="API Access"

요청 (인증 포함):
  GET /api/resource HTTP/1.1
  Host: api.example.com
  Authorization: Basic aG9uZ2dpbGRvbmc6cGFzc3dvcmQxMjM=

응답 (200):
  HTTP/1.1 200 OK
  Content-Type: application/json
  
  {"status": "success"}
```

**HTTP Basic Authentication 은 간단하지만 보안에 취약합니다. 반드시 HTTPS 와 함께 사용해야 하며, 현대적인 애플리케이션에서는 JWT, OAuth 2.0 등의 대안을 사용하는 것이 좋습니다.**
