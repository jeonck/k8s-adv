# API Server 인증 플러그인을 Webhook 인증으로 변경하는 절차

Kubernetes API Server 의 인증 플러그인을 Webhook Token Authentication 으로 변경하는 절차를 설명합니다.

---

## 개요

```
┌─────────────────────────────────────────────────────────────┐
│          API Server 인증 플러그인 변경                      │
└─────────────────────────────────────────────────────────────┘

목적:
  - 기존 인증 방식에서 Webhook 인증으로 전환
  - 외부 인증 시스템 (LDAP, AD, JWT 등) 과 통합
  - 사용자 정의 인증 로직 구현

주의사항:
  ⚠️  클러스터 재시작 필요
  ⚠️  인증 설정 오류 시 클러스터 접근 불가
  ⚠️  테스트 클러스터에서 먼저 수행 권장
  ⚠️  백업 필수
```

---

## 1 단계: 현재 인증 설정 확인

### 현재 인증 플러그인 확인

```bash
# API Server Pod 확인
kubectl get pods -n kube-system -l component=kube-apiserver

# API Server 설정 확인 (kubeadm 클러스터)
cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep -i auth

# 출력 예시:
#   - --authorization-mode=Node,RBAC
#   - --client-ca-file=/etc/kubernetes/pki/ca.crt
#   - --service-account-key-file=/etc/kubernetes/pki/sa.pub
```

### 현재 사용 가능한 인증 방식 확인

```bash
# kube-apiserver --help 에서 인증 옵션 확인
kube-apiserver --help | grep -A5 "authentication"

# 주요 인증 옵션:
# --authentication-mode stringSlice
#     인증 방식 (Anonymous, BasicAuth, ClientCertificate, 
#     OIDC, RequestHeader, ServiceAccount, Webhook)
#     기본값: [ClientCertificate, ServiceAccount]
```

### 현재 접근 테스트

```bash
# 관리자로 정상 접근 확인
kubectl get pods -n kube-system

# 출력:
# NAME                            READY   STATUS    RESTARTS   AGE
# kube-apiserver-k8s-cp           1/1     Running   0          10d
# ...
```

---

## 2 단계: Webhook 인증 서버 준비

### Webhook 인증 서버 배포

```yaml
# webhook-auth-server.yaml
# 1. 네임스페이스 생성
apiVersion: v1
kind: Namespace
metadata:
  name: auth-system

---
# 2. TLS 인증서 Secret (미리 생성)
apiVersion: v1
kind: Secret
metadata:
  name: webhook-tls-certs
  namespace: auth-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>

---
# 3. JWT Secret
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secrets
  namespace: auth-system
type: Opaque
stringData:
  jwt-secret: "your-super-secret-key-change-in-production"

---
# 4. Webhook 서버 Deployment
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
# 5. Webhook 서버 Service
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
```

### Webhook 서버 배포 확인

```bash
# Webhook 서버 배포
kubectl apply -f webhook-auth-server.yaml

# Pod 상태 확인
kubectl get pods -n auth-system

# 출력:
# NAME                                   READY   STATUS    RESTARTS   AGE
# webhook-auth-server-6d4f5b6c7d-abc12   1/1     Running   0          1m
# webhook-auth-server-6d4f5b6c7d-def34   1/1     Running   0          1m

# Service 확인
kubectl get svc -n auth-system

# 출력:
# NAME                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
# webhook-auth-server   ClusterIP   10.96.100.50    <none>        443/TCP   1m

# Webhook 서버 테스트 (클러스터 내부에서)
kubectl run test --rm -it --image=curlimages/curl --restart=Never -- \
  curl -k https://webhook-auth-server.auth-system.svc/healthz

# 출력:
# {"status": "ok"}
```

---

## 3 단계: Webhook 설정 파일 생성

### kubeconfig 형식 설정 파일

```yaml
# /etc/kubernetes/webhook-auth-config.yaml

apiVersion: v1
kind: Config
clusters:
- name: webhook-auth-server
  cluster:
    # Webhook 서버 URL (클러스터 내부 DNS 사용)
    server: https://webhook-auth-server.auth-system.svc:443/authenticate
    
    # Webhook 서버 CA 인증서 (TLS 검증용)
    # 옵션 1: 파일 경로 지정
    certificate-authority: /etc/kubernetes/webhook-auth-cert.pem
    
    # 옵션 2: 인증서 데이터 직접 포함 (권장)
    # certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...

users:
- name: api-server
  user:
    # API Server 가 Webhook 서버에 보낼 클라이언트 인증서 (선택)
    # Webhook 서버가 API Server 를 인증할 때 사용
    # 옵션 1: 파일 경로 지정
    client-certificate: /etc/kubernetes/apiserver-webhook-client.crt
    client-key: /etc/kubernetes/apiserver-webhook-client.key
    
    # 옵션 2: 인증서 데이터 직접 포함
    # client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    # client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ...

contexts:
- context:
    cluster: webhook-auth-server
    user: api-server
  name: webhook-auth-context

current-context: webhook-auth-context
```

### Webhook CA 인증서 추출

```bash
# Webhook 서버 인증서에서 CA 추출
# 방법 1: Kubernetes CA 사용 시
cp /etc/kubernetes/pki/ca.crt /etc/kubernetes/webhook-auth-cert.pem

# 방법 2: Webhook 서버 자체 CA 사용 시
kubectl get secret webhook-tls-certs -n auth-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > /etc/kubernetes/webhook-auth-cert.pem
```

### 설정 파일 권한 설정

```bash
# 설정 파일 권한 설정 (중요!)
chmod 600 /etc/kubernetes/webhook-auth-config.yaml
chown root:root /etc/kubernetes/webhook-auth-config.yaml

# 인증서 권한 설정
chmod 600 /etc/kubernetes/webhook-auth-cert.pem
chown root:root /etc/kubernetes/webhook-auth-cert.pem
```

---

## 4 단계: API Server 설정 수정

### kube-apiserver Pod 매니페스트 수정

```bash
# 백업 (필수!)
cp /etc/kubernetes/manifests/kube-apiserver.yaml \
   /etc/kubernetes/manifests/kube-apiserver.yaml.backup.$(date +%Y%m%d-%H%M%S)

# 원본 파일 확인
cat /etc/kubernetes/manifests/kube-apiserver.yaml
```

### Webhook 인증 설정 추가

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml 수정

apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
  labels:
    component: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    image: registry.k8s.io/kube-apiserver:v1.31.4
    command:
    - kube-apiserver
    
    # 기존 인증 설정 (유지)
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-issuer=https://kubernetes.default.svc
    
    # Webhook Token Authentication 추가
    - --authentication-token-webhook-config-file=/etc/kubernetes/webhook-auth-config.yaml
    
    # Webhook 캐시 TTL (선택, 기본값: 2m)
    - --authentication-token-webhook-cache-ttl=2m
    
    # 인증 모드 명시적 설정 (선택)
    # ClientCertificate, ServiceAccount, Webhook 모두 사용
    # - --authentication-mode=ClientCertificate,ServiceAccount,Webhook
    
    # 기타 기존 설정 유지
    - --authorization-mode=Node,RBAC
    - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
    - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
    # ...
    
    volumeMounts:
    # 기존 마운트 유지
    - mountPath: /etc/kubernetes/pki
      name: k8s-certs
      readOnly: true
    
    # Webhook 설정 파일 마운트 추가
    - mountPath: /etc/kubernetes/webhook-auth-config.yaml
      name: webhook-auth-config
      readOnly: true
    
    # Webhook CA 인증서 마운트 추가
    - mountPath: /etc/kubernetes/webhook-auth-cert.pem
      name: webhook-auth-cert
      readOnly: true
    
    # ...
  
  volumes:
  # 기존 볼륨 유지
  - hostPath:
      path: /etc/kubernetes/pki
      type: DirectoryOrCreate
    name: k8s-certs
  
  # Webhook 설정 파일 볼륨 추가
  - hostPath:
      path: /etc/kubernetes/webhook-auth-config.yaml
      type: File
    name: webhook-auth-config
  
  # Webhook CA 인증서 볼륨 추가
  - hostPath:
      path: /etc/kubernetes/webhook-auth-cert.pem
      type: File
    name: webhook-auth-cert
  
  # ...
```

### 설정 적용

```bash
# 파일 수정 후 저장
# kubelet 이 자동으로 감지하고 API Server Pod 재시작

# Pod 상태 확인
kubectl get pods -n kube-system -l component=kube-apiserver

# 출력:
# NAME                   READY   STATUS    RESTARTS   AGE
# kube-apiserver-k8s-cp  1/1     Running   1          1m
#                        ↑
#                        재시작됨 (설정 변경으로)

# API Server 로그 확인
kubectl logs -n kube-system -l component=kube-apiserver | grep -i webhook

# 출력:
# I0101 00:00:00.000000       1 webhook.go:100] Using webhook token authentication
# I0101 00:00:00.000000       1 webhook.go:150] Webhook auth server configured: https://webhook-auth-server.auth-system.svc:443/authenticate
```

---

## 5 단계: 인증 테스트

### 기존 인증 방식 테스트 (ClientCertificate)

```bash
# 관리자 인증서로 정상 접근 확인
kubectl get pods -n kube-system

# 출력:
# NAME                   READY   STATUS    RESTARTS   AGE
# kube-apiserver-k8s-cp  1/1     Running   1          5m
# ...

# 성공: 기존 ClientCertificate 인증은 계속 작동
```

### Webhook 인증 테스트 (JWT Token)

```bash
# JWT 토큰 생성
cat <<EOF > generate-token.sh
#!/bin/bash
SECRET="your-super-secret-key-change-in-production"
HEADER=\$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
PAYLOAD=\$(echo -n '{"sub":"honggildong","uid":"1001","groups":["developers","system:authenticated"],"iat":'$(date +%s)'}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SIGNATURE=\$(echo -n "\$HEADER.\$PAYLOAD" | openssl dgst -sha256 -hmac "\$SECRET" -binary | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
echo "\$HEADER.\$PAYLOAD.\$SIGNATURE"
EOF

chmod +x generate-token.sh
TOKEN=$(./generate-token.sh)

# 토큰으로 API Server 접속
kubectl --token="$TOKEN" get pods -n default

# 출력:
# NAME    READY   STATUS    RESTARTS   AGE
# nginx   1/1     Running   0          10m

# 사용자 정보 확인
kubectl auth whoami --token="$TOKEN"

# 출력:
# ATTRIBUTES                                                                  VALUE
# Name:                         honggildong
# Groups:                         developers, system:authenticated
```

### 잘못된 토큰 테스트

```bash
# 잘못된 토큰으로 접근 시도
kubectl --token="invalid-token" get pods

# 출력:
# Error from server (Unauthorized): Unauthorized
# ↑
# Webhook 서버가 인증 거부

# API Server 로그 확인
kubectl logs -n kube-system -l component=kube-apiserver | grep -i "unauthorized"

# 출력:
# W0101 00:00:00.000000       1 authentication.go:65] Unable to authenticate the request: invalid token
```

---

## 6 단계: 인증 모드 확인

### 활성화된 인증 모드 확인

```bash
# API Server 설정 확인
kubectl get pods -n kube-system -l component=kube-apiserver \
  -o jsonpath='{.items[0].spec.containers[0].command}' | tr ',' '\n' | grep auth

# 출력:
# --authentication-token-webhook-config-file=/etc/kubernetes/webhook-auth-config.yaml
# --authentication-token-webhook-cache-ttl=2m
# --client-ca-file=/etc/kubernetes/pki/ca.crt
# --service-account-key-file=/etc/kubernetes/pki/sa.pub
```

### 인증 플러그인 순서 확인

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 인증 플러그인 순서                      │
└─────────────────────────────────────────────────────────────┘

Kubernetes 는 여러 인증 플러그인을 순차적으로 시도:

1. ClientCertificate (인증서 기반)
   - kubectl 이 admin.crt/key 사용
   - 가장 우선순위가 높음

2. ServiceAccount Token
   - Pod 내부에서 자동 마운트된 토큰
   - JWT 형식

3. Webhook Token
   - 외부 Webhook 서버로 인증 위임
   - JWT, LDAP, 사용자 정의 토큰 등

4. Anonymous (마지막)
   - system:anonymous 사용자
   - 기본 권한 없음

순서 변경:
  --authentication-mode=Webhook,ClientCertificate,ServiceAccount
  (권장 안 함 - 기본 순서 사용)
```

---

## 7 단계: 문제 해결

### API Server 가 Webhook 서버에 연결できない

```bash
# 1. Webhook 서버 상태 확인
kubectl get pods -n auth-system -l app=webhook-auth-server

# 2. Webhook 서버 로그 확인
kubectl logs -n auth-system -l app=webhook-auth-server

# 3. API Server 에서 Webhook 서버 연결 테스트
kubectl run test --rm -it --image=curlimages/curl --restart=Never --namespace=kube-system -- \
  curl -k https://webhook-auth-server.auth-system.svc/authenticate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"spec":{"token":"test"}}'

# 4. API Server 로그 확인
kubectl logs -n kube-system -l component=kube-apiserver | grep -i webhook

# 오류 예시:
# E0101 00:00:00.000000       1 webhook.go:200] Webhook auth server connection failed: dial tcp 10.96.100.50:443: connect: connection refused
```

### 인증 설정 오류 복구

```bash
# API Server 가 시작되지 않는 경우
# 1. 백업 파일로 복구
cp /etc/kubernetes/manifests/kube-apiserver.yaml.backup.* \
   /etc/kubernetes/manifests/kube-apiserver.yaml

# 2. kubelet 재시작
systemctl restart kubelet

# 3. API Server Pod 확인
kubectl get pods -n kube-system -l component=kube-apiserver

# 4. 로그 확인
kubectl logs -n kube-system -l component=kube-apiserver
```

### Webhook 인증 비활성화 (롤백)

```bash
# 1. API Server 매니페스트에서 Webhook 설정 제거
vi /etc/kubernetes/manifests/kube-apiserver.yaml

# 제거할 줄:
# - --authentication-token-webhook-config-file=/etc/kubernetes/webhook-auth-config.yaml
# - --authentication-token-webhook-cache-ttl=2m

# 제거할 volumeMounts:
# - mountPath: /etc/kubernetes/webhook-auth-config.yaml
#   name: webhook-auth-config
# - mountPath: /etc/kubernetes/webhook-auth-cert.pem
#   name: webhook-auth-cert

# 제거할 volumes:
# - hostPath:
#     path: /etc/kubernetes/webhook-auth-config.yaml
#   name: webhook-auth-config
# - hostPath:
#     path: /etc/kubernetes/webhook-auth-cert.pem
#   name: webhook-auth-cert

# 2. 저장하면 kubelet 이 자동 재시작

# 3. Webhook 서버 삭제 (선택)
kubectl delete -f webhook-auth-server.yaml
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    절차 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. 현재 인증 설정 확인                                     │
│     - kubectl get pods -n kube-system                      │
│     - cat /etc/kubernetes/manifests/kube-apiserver.yaml    │
│                                                             │
│  2. Webhook 인증 서버 준비                                  │
│     - Deployment, Service 배포                             │
│     - TLS 인증서 설정                                      │
│     - 헬스체크 확인                                        │
│                                                             │
│  3. Webhook 설정 파일 생성                                  │
│     - kubeconfig 형식                                      │
│     - certificate-authority 설정                           │
│     - 권한 설정 (chmod 600)                                │
│                                                             │
│  4. API Server 설정 수정                                    │
│     - 백업 필수!                                           │
│     - --authentication-token-webhook-config-file 추가      │
│     - volumeMounts, volumes 추가                           │
│                                                             │
│  5. 인증 테스트                                             │
│     - 기존 ClientCertificate 인증 확인                     │
│     - Webhook Token 인증 확인 (JWT)                        │
│     - 잘못된 토큰 거부 확인                                │
│                                                             │
│  6. 인증 모드 확인                                          │
│     - 여러 인증 방식 동시 사용 가능                        │
│     - 순차적 인증 시도                                     │
│                                                             │
│  7. 문제 해결                                               │
│     - Webhook 서버 상태 확인                               │
│     - API Server 로그 확인                                 │
│     - 백업 파일로 롤백 가능                                │
└─────────────────────────────────────────────────────────────┘
```

### 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          Webhook 인증 설정 체크리스트                       │
└─────────────────────────────────────────────────────────────┘

□ Webhook 인증 서버 배포 완료
□ TLS 인증서 설정 완료
□ Webhook 설정 파일 생성 (/etc/kubernetes/webhook-auth-config.yaml)
□ CA 인증서 추출 완료
□ 설정 파일 권한 설정 (chmod 600)
□ API Server 매니페스트 백업
□ API Server 매니페스트 수정
□ API Server Pod 재시작 확인
□ 기존 ClientCertificate 인증 작동 확인
□ Webhook Token 인증 작동 확인
□ 잘못된 토큰 거부 확인
□ API Server 로그 이상 없음
□ 롤백 절차 확인 (백업 파일)
```

**Webhook 인증으로 변경하면 외부 인증 시스템과 통합할 수 있지만, 설정 오류 시 클러스터 접근이 불가능해질 수 있습니다. 반드시 백업하고 테스트 클러스터에서 먼저 수행하세요.**
