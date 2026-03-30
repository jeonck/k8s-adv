# API Server Webhook Token Authentication

Kubernetes API Server 의 Webhook Token Authentication 에 대해 알아봅니다.

---

## Webhook Token Authentication 이란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          Webhook Token Authentication                       │
└─────────────────────────────────────────────────────────────┘

정의:
  - API Server 가 인증을 외부 웹훅 서버에 위임
  - 사용자 정의 인증 로직 구현 가능
  - 기존 인증 시스템과 통합 가능

목적:
  - Kubernetes 기본 인증으로 처리할 수 없는 경우
  - 기존 LDAP, Active Directory, 사내 인증 시스템과 통합
  - 복잡한 인증 로직 구현
  - 멀티 클러스터 통합 인증
```

### 동작 원리

```
┌─────────────────────────────────────────────────────────────┐
│          Webhook Token Authentication 흐름                  │
└─────────────────────────────────────────────────────────────┘

kubectl                              API Server
  │                                      │
  │  1. 요청 (Bearer Token 포함)         │
  │─────────────────────────────────────▶│
  │                                      │
  │  2. TokenReview API 호출             │
  │     (외부 웹훅 서버로)                │
  │                                      │
  │         ┌────────────────────────┐   │
  │         │   Webhook Server       │   │
  │         │   (외부 인증 서버)     │   │
  │         │                        │   │
  │         │  - 토큰 검증           │   │
  │         │  - 사용자 정보 추출    │   │
  │         │  - 그룹 정보 추출      │   │
  │         └────────────────────────┘   │
  │                  ▲                   │
  │                  │                   │
  │  3. TokenReview 요청                 │
  │─────────────────▶│                   │
  │                                      │
  │  4. 인증 결과 응답                   │
  │     - authenticated: true/false      │
  │     - user: username                 │
  │     - groups: [group1, group2]       │
  │◀─────────────────│                   │
  │                                      │
  │  5. 인증 결과 반환                   │
  │◀─────────────────────────────────────│
  │                                      │
  │  6. 인증 성공 시 RBAC 인가           │
  │     (권한 확인 후 리소스 반환)       │
  └──────────────────────────────────────┘
```

---

## Webhook 설정

### API Server 설정

```bash
# kube-apiserver 설정에 Webhook 추가
# /etc/kubernetes/manifests/kube-apiserver.yaml

apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: registry.k8s.io/kube-apiserver:v1.31.4
    command:
    - kube-apiserver
    
    # Webhook Token Authentication 설정
    - --authentication-token-webhook-config-file=/etc/kubernetes/webhook-auth-config.yaml
    
    # Webhook 캐시 TTL (선택)
    - --authentication-token-webhook-cache-ttl=2m
    
    volumeMounts:
    - name: webhook-auth-config
      mountPath: /etc/kubernetes/webhook-auth-config.yaml
      readOnly: true
    - name: webhook-auth-cert
      mountPath: /etc/kubernetes/webhook-auth-cert.pem
      readOnly: true
  
  volumes:
  - name: webhook-auth-config
    hostPath:
      path: /etc/kubernetes/webhook-auth-config.yaml
  - name: webhook-auth-cert
    hostPath:
      path: /etc/kubernetes/webhook-auth-cert.pem
```

### Webhook 설정 파일

```yaml
# /etc/kubernetes/webhook-auth-config.yaml

apiVersion: v1
kind: Config
clusters:
- name: webhook-auth-server
  cluster:
    # 웹훅 서버 URL
    server: https://auth.example.com:8443/authenticate
    
    # 웹훅 서버 CA 인증서 (TLS 검증용)
    certificate-authority: /etc/kubernetes/webhook-auth-cert.pem
    
    # 또는 CA 인증서 직접 포함
    # certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...

users:
- name: api-server
  user:
    # API Server 가 웹훅 서버에 보낼 인증서 (선택)
    # 웹훅 서버가 API Server 를 인증할 때 사용
    client-certificate: /etc/kubernetes/apiserver-webhook-client.crt
    client-key: /etc/kubernetes/apiserver-webhook-client.key

contexts:
- context:
    cluster: webhook-auth-server
    user: api-server
  name: webhook-auth-context

current-context: webhook-auth-context
```

---

## TokenReview API

### TokenReview 요청 (API Server → Webhook)

```json
// API Server 가 Webhook 서버로 보내는 요청
POST /authenticate HTTP/1.1
Host: auth.example.com
Content-Type: application/json

{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "metadata": {
    "name": "token-review-12345"
  },
  "spec": {
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9..."
  }
}
```

### TokenReview 응답 (Webhook → API Server)

```json
// Webhook 서버가 API Server 로 반환하는 응답
HTTP/1.1 200 OK
Content-Type: application/json

{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "status": {
    "authenticated": true,
    "user": {
      "username": "honggildong",
      "uid": "1001",
      "groups": [
        "developers",
        "system:authenticated"
      ],
      "extra": {
        "department": ["engineering"],
        "employee-id": ["12345"]
      }
    }
  }
}
```

### TokenReview 응답 필드

```
┌─────────────────────────────────────────────────────────────┐
│          TokenReview 응답 필드                              │
└─────────────────────────────────────────────────────────────┘

status:
  authenticated: boolean
    - true: 인증 성공
    - false: 인증 실패
  
  user:
    username: string
      - Kubernetes 사용자 이름
      - RBAC 에서 사용됨
      - 필수 필드 (authenticated: true 일 때)
    
    uid: string (선택)
      - 사용자 고유 식별자
      - 임의 문자열 가능
    
    groups: []string (선택)
      - 사용자 소속 그룹
      - system:authenticated 자동 포함 권장
      - RBAC 에서 그룹 기반 권한 부여에 사용
    
    extra: map[string][]string (선택)
      - 추가 사용자 정보
      - 어드미션 컨트롤러에서 사용 가능
      - 예: 부서, 사번, 역할 등

error: string (선택)
  - 인증 실패 시 오류 메시지
```

---

## Webhook 서버 구현

### Python Flask 예시

```python
#!/usr/bin/env python3
# webhook-auth-server.py

from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# LDAP 서버 설정 (예시)
LDAP_SERVER = os.environ.get('LDAP_SERVER', 'ldap://ldap.example.com')
LDAP_BASE_DN = os.environ.get('LDAP_BASE_DN', 'dc=example,dc=com')

@app.route('/authenticate', methods=['POST'])
def authenticate():
    """
    Kubernetes API Server 로부터 TokenReview 요청 처리
    """
    # 요청 데이터 파싱
    data = request.get_json()
    
    if not data or 'spec' not in data:
        return jsonify({
            'apiVersion': 'authentication.k8s.io/v1',
            'kind': 'TokenReview',
            'status': {
                'authenticated': False,
                'error': 'Invalid request'
            }
        }), 400
    
    # 토큰 추출
    token = data['spec'].get('token', '')
    
    if not token:
        return jsonify({
            'apiVersion': 'authentication.k8s.io/v1',
            'kind': 'TokenReview',
            'status': {
                'authenticated': False,
                'error': 'Token not provided'
            }
        }), 401
    
    # 토큰 검증 (예: LDAP, 데이터베이스, JWT 등)
    user_info = verify_token(token)
    
    if user_info:
        # 인증 성공
        return jsonify({
            'apiVersion': 'authentication.k8s.io/v1',
            'kind': 'TokenReview',
            'status': {
                'authenticated': True,
                'user': {
                    'username': user_info['username'],
                    'uid': user_info.get('uid', ''),
                    'groups': user_info.get('groups', ['system:authenticated']),
                    'extra': user_info.get('extra', {})
                }
            }
        }), 200
    else:
        # 인증 실패
        return jsonify({
            'apiVersion': 'authentication.k8s.io/v1',
            'kind': 'TokenReview',
            'status': {
                'authenticated': False,
                'error': 'Invalid token'
            }
        }), 401

def verify_token(token):
    """
    토큰 검증 함수
    실제 구현에서는 LDAP, 데이터베이스, JWT 검증 등 수행
    """
    # 예시: JWT 토큰 검증
    try:
        import jwt
        
        # JWT 디코딩 (서명 검증 포함)
        payload = jwt.decode(
            token,
            key=os.environ.get('JWT_SECRET', 'secret-key'),
            algorithms=['HS256']
        )
        
        # 사용자 정보 추출
        return {
            'username': payload.get('sub'),
            'uid': payload.get('uid', ''),
            'groups': payload.get('groups', ['system:authenticated']),
            'extra': {
                'email': [payload.get('email', '')],
                'department': [payload.get('department', '')]
            }
        }
    except jwt.InvalidTokenError:
        return None
    
    # 또는 LDAP 인증 예시:
    # try:
    #     conn = ldap.initialize(LDAP_SERVER)
    #     conn.simple_bind_s(f"uid={username},{LDAP_BASE_DN}", password)
    #     # LDAP 에서 사용자 정보 조회
    #     return {
    #         'username': username,
    #         'groups': ['developers', 'system:authenticated']
    #     }
    # except ldap.LDAPError:
    #     return None

if __name__ == '__main__':
    # HTTPS 로 실행 (TLS 필수)
    app.run(
        host='0.0.0.0',
        port=8443,
        ssl_cert='/etc/webhook/server.crt',
        ssl_key='/etc/webhook/server.key'
    )
```

### Node.js Express 예시

```javascript
// webhook-auth-server.js

const express = require('express');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

app.post('/authenticate', (req, res) => {
    const token = req.body.spec?.token;
    
    if (!token) {
        return res.json({
            apiVersion: 'authentication.k8s.io/v1',
            kind: 'TokenReview',
            status: {
                authenticated: false,
                error: 'Token not provided'
            }
        });
    }
    
    // JWT 토큰 검증
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        
        // 인증 성공
        res.json({
            apiVersion: 'authentication.k8s.io/v1',
            kind: 'TokenReview',
            status: {
                authenticated: true,
                user: {
                    username: payload.sub,
                    uid: payload.uid || '',
                    groups: payload.groups || ['system:authenticated'],
                    extra: {
                        email: [payload.email || ''],
                        department: [payload.department || '']
                    }
                }
            }
        });
    } catch (err) {
        // 인증 실패
        res.status(401).json({
            apiVersion: 'authentication.k8s.io/v1',
            kind: 'TokenReview',
            status: {
                authenticated: false,
                error: 'Invalid token'
            }
        });
    }
});

// HTTPS 서버 시작
const options = {
    key: fs.readFileSync('/etc/webhook/server.key'),
    cert: fs.readFileSync('/etc/webhook/server.crt')
};

https.createServer(options, app).listen(8443, () => {
    console.log('Webhook auth server running on https://0.0.0.0:8443');
});
```

---

## Webhook 서버 배포

### Kubernetes 에 Webhook 서버 배포

```yaml
# webhook-auth-server.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: auth-system

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-auth-server
  namespace: auth-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webhook-auth-server
  template:
    metadata:
      labels:
        app: webhook-auth-server
    spec:
      containers:
      - name: webhook-auth-server
        image: myregistry/webhook-auth-server:v1.0
        ports:
        - containerPort: 8443
          name: https
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: webhook-secrets
              key: jwt-secret
        - name: LDAP_SERVER
          value: "ldap://ldap.example.com"
        - name: LDAP_BASE_DN
          value: "dc=example,dc=com"
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/webhook
          readOnly: true
        livenessProbe:
          httpsGet:
            path: /healthz
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpsGet:
            path: /ready
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: tls-certs
        secret:
          secretName: webhook-tls-certs

---
apiVersion: v1
kind: Service
metadata:
  name: webhook-auth-server
  namespace: auth-system
spec:
  selector:
    app: webhook-auth-server
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
  type: ClusterIP

---
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secrets
  namespace: auth-system
type: Opaque
stringData:
  jwt-secret: "your-secret-key-here"

---
apiVersion: v1
kind: Secret
metadata:
  name: webhook-tls-certs
  namespace: auth-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

---

## Webhook 인증서 설정

### Webhook 서버 인증서 생성

```bash
# 1. Webhook 서버 개인키 생성
openssl genrsa -out webhook-server.key 2048

# 2. CSR 생성
openssl req -new -key webhook-server.key \
  -out webhook-server.csr \
  -subj "/CN=webhook-auth-server.auth-system.svc"

# 3. Kubernetes CA 로 서명 (또는 자체 CA)
openssl x509 -req -in webhook-server.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out webhook-server.crt \
  -days 365 \
  -sha256 \
  -extfile <(cat <<EOF
subjectAltName = DNS:webhook-auth-server.auth-system.svc,DNS:webhook-auth-server.auth-system.svc.cluster.local
EOF
)

# 4. Kubernetes Secret 으로 생성
kubectl create secret tls webhook-tls-certs \
  --cert=webhook-server.crt \
  --key=webhook-server.key \
  -n auth-system
```

### API Server 가 Webhook 인증서 신뢰 설정

```bash
# Webhook 서버 CA 인증서를 API Server 가 신뢰하도록 설정
# 옵션 1: Kubernetes CA 사용 시 별도 설정 불필요

# 옵션 2: 자체 CA 사용 시
# webhook-auth-config.yaml 에 CA 인증서 지정
cat <<EOF > /etc/kubernetes/webhook-auth-config.yaml
apiVersion: v1
kind: Config
clusters:
- name: webhook-auth-server
  cluster:
    server: https://webhook-auth-server.auth-system.svc:443/authenticate
    certificate-authority-data: $(base64 -w0 webhook-ca.crt)
users:
- name: api-server
contexts:
- context:
    cluster: webhook-auth-server
    user: api-server
  name: webhook-auth-context
current-context: webhook-auth-context
EOF
```

---

## 실습: JWT Token 인증

### JWT 토큰 생성 스크립트

```bash
#!/bin/bash
# generate-jwt-token.sh

# JWT 토큰 생성 (HS256)
# payload 에 사용자 정보 포함

USERNAME="honggildong"
UID="1001"
GROUPS='["developers","system:authenticated"]'
EMAIL="honggildong@example.com"
DEPARTMENT="engineering"
SECRET="your-secret-key"

# 헤더
HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# 페이로드
PAYLOAD=$(cat <<EOF | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n'
{
  "sub": "$USERNAME",
  "uid": "$UID",
  "groups": $GROUPS,
  "email": "$EMAIL",
  "department": "$DEPARTMENT",
  "iat": $(date +%s),
  "exp": $(($(date +%s) + 3600))
}
EOF
)

# 서명
SIGNATURE=$(echo -n "$HEADER.$PAYLOAD" | \
  openssl dgst -sha256 -hmac "$SECRET" -binary | \
  base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# JWT 토큰
TOKEN="$HEADER.$PAYLOAD.$SIGNATURE"

echo "JWT Token:"
echo "$TOKEN"
echo ""
echo "사용 방법:"
echo "kubectl --token=$TOKEN get pods"
```

### kubectl 로 테스트

```bash
# 토큰 생성
TOKEN=$(./generate-jwt-token.sh | grep "^eyJ" | head -1)

# 토큰으로 API Server 접속
kubectl --token="$TOKEN" get pods

# 출력:
# NAME    READY   STATUS    RESTARTS   AGE
# nginx   1/1     Running   0          10m

# 토큰 정보 확인
kubectl auth whoami --token="$TOKEN"

# 출력:
# ATTRIBUTES                                                                  VALUE
# Name:                         honggildong
# Groups:                         developers, system:authenticated
```

---

## Webhook 인증 설정 확인

### API Server 로그 확인

```bash
# API Server 로그에서 Webhook 인증 확인
kubectl logs -n kube-system -l component=kube-apiserver | grep -i webhook

# 출력 예시:
# I0101 00:00:00.000000       1 webhook.go:100] Using webhook token authentication
# I0101 00:00:00.000000       1 webhook.go:150] Webhook auth server responded: authenticated=true, user=honggildong
```

### Webhook 서버 로그 확인

```bash
# Webhook 서버 로그 확인
kubectl logs -n auth-system -l app=webhook-auth-server

# 출력 예시:
# POST /authenticate - 200 - authenticated: honggildong
# POST /authenticate - 401 - error: Invalid token
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Webhook Token Authentication                            │
│     - API Server 가 인증을 외부 웹훅 서버에 위임           │
│     - 사용자 정의 인증 로직 구현 가능                      │
│     - 기존 인증 시스템 (LDAP, AD 등) 과 통합               │
│                                                             │
│  2. TokenReview API                                         │
│     - API Server → Webhook: 토큰 검증 요청                 │
│     - Webhook → API Server: 인증 결과 응답                 │
│     - 응답: authenticated, user, groups, extra             │
│                                                             │
│  3. Webhook 설정                                            │
│     - API Server: --authentication-token-webhook-config-file│
│     - kubeconfig 형식: cluster, user, context              │
│     - TLS 필수 (HTTPS)                                     │
│                                                             │
│  4. Webhook 서버 구현                                       │
│     - TokenReview 요청 처리                                │
│     - 토큰 검증 (JWT, LDAP, DB 등)                         │
│     - TokenReview 응답 반환                                │
│                                                             │
│  5. Webhook 서버 배포                                       │
│     - Kubernetes Deployment 로 배포                        │
│     - Service 로 노출 (ClusterIP)                          │
│     - TLS 인증서 설정                                      │
│                                                             │
│  6. 사용 사례                                               │
│     - LDAP/Active Directory 통합                           │
│     - JWT 토큰 기반 인증                                     │
│     - 사내 인증 시스템 통합                                │
│     - 멀티 클러스터 통합 인증                              │
└─────────────────────────────────────────────────────────────┘
```

**Webhook Token Authentication 은 Kubernetes 가 외부 인증 시스템과 통합할 수 있게 해줍니다. LDAP, JWT, 사내 인증 시스템 등과 연동하여 유연한 인증 체계를 구축할 수 있습니다.**
