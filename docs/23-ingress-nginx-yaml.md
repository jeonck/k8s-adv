# Ingress-NGINX YAML 분석

Ingress-NGINX 컨트롤러 설치에 사용되는 YAML 파일을 분석합니다.

## 전체 구성

```
Ingress-NGINX 구성 리소스:
1. Namespace                 - 전용 네임스페이스
2. ServiceAccount (x2)       - Pod 의 신원
3. Role (x2)                 - 네임스페이스 권한
4. ClusterRole (x2)          - 클러스터 권한
5. RoleBinding (x2)          - 네임스페이스 권한 바인딩
6. ClusterRoleBinding (x2)   - 클러스터 권한 바인딩
7. ConfigMap                 - 컨트롤러 설정
8. Service (x2)              - 네트워크 엔드포인트
9. Deployment                - 컨트롤러 배포
10. Job (x2)                 - Webhook 인증서 생성/패치
11. IngressClass             - Ingress 클래스 정의
12. ValidatingWebhook        - Ingress 검증
```

---

## 1. Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  name: ingress-nginx
```

### 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `name` | ingress-nginx | Ingress-NGINX 전용 네임스페이스 |
| `labels` | app.kubernetes.io/* | Kubernetes 권장 라벨 표준 |

### 역할

- Ingress-NGINX 관련 리소스 격리
- 시스템 네임스페이스와 분리

---

## 2. ServiceAccount (x2)

### 2-1. 컨트롤러용

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/version: 1.11.3
  name: ingress-nginx
  namespace: ingress-nginx
automountServiceAccountToken: true
```

### 2-2. Webhook 인증서 생성용

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: admission-webhook
    app.kubernetes.io/version: 1.11.3
  name: ingress-nginx-admission
  namespace: ingress-nginx
automountServiceAccountToken: true
```

### automountServiceAccountToken

```yaml
automountServiceAccountToken: true
```

- Pod 에서 ServiceAccount 토큰 자동 마운트
- Kubernetes API 접근에 필요

---

## 3. Role (x2)

### 3-1. 컨트롤러용 Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
rules:
# 네임스페이스 조회
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get"]

# 기본 리소스 조회
- apiGroups: [""]
  resources: ["configmaps", "pods", "secrets", "endpoints"]
  verbs: ["get", "list", "watch"]

# 서비스 조회
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]

# Ingress 리소스 관리
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]

# Ingress 상태 업데이트
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses/status"]
  verbs: ["update"]

# IngressClass 조회
- apiGroups: ["networking.k8s.io"]
  resources: ["ingressclasses"]
  verbs: ["get", "list", "watch"]

# 리더 선출 (Leader Election)
- apiGroups: ["coordination.k8s.io"]
  resourceNames: ["ingress-nginx-leader"]
  resources: ["leases"]
  verbs: ["get", "update"]
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["create"]

# 이벤트 생성
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]

# 엔드포인트슬라이스 조회
- apiGroups: ["discovery.k8s.io"]
  resources: ["endpointslices"]
  verbs: ["list", "watch", "get"]
```

### 권한 요약

| 리소스 | 권한 | 용도 |
|--------|------|------|
| namespaces | get | 네임스페이스 정보 조회 |
| configmaps, pods, secrets, endpoints | get, list, watch | 기본 리소스 조회 |
| services | get, list, watch | 서비스 조회 |
| ingresses | get, list, watch | Ingress 리소스 모니터링 |
| ingresses/status | update | Ingress 상태 업데이트 |
| ingressclasses | get, list, watch | Ingress 클래스 조회 |
| leases | get, update, create | 리더 선출 (고가용성) |
| events | create, patch | 이벤트 기록 |
| endpointslices | list, watch, get | 엔드포인트 조회 |

---

### 3-2. Webhook 용 Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ingress-nginx-admission
  namespace: ingress-nginx
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "create"]
```

### 역할

- Webhook 인증서 시크릿 생성 및 조회

---

## 4. ClusterRole (x2)

### 4-1. 컨트롤러용 ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ingress-nginx
rules:
# 클러스터 전체 리소스 조회
- apiGroups: [""]
  resources: ["configmaps", "endpoints", "nodes", "pods", "secrets", "namespaces"]
  verbs: ["list", "watch"]

# 노드 조회
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get"]

# 서비스 조회
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]

# Ingress 리소스 관리
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]

# 이벤트 생성
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]

# Ingress 상태 업데이트
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses/status"]
  verbs: ["update"]

# IngressClass 조회
- apiGroups: ["networking.k8s.io"]
  resources: ["ingressclasses"]
  verbs: ["get", "list", "watch"]

# 엔드포인트슬라이스 조회
- apiGroups: ["discovery.k8s.io"]
  resources: ["endpointslices"]
  verbs: ["list", "watch", "get"]

# 리스 조회
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["list", "watch"]
```

### ClusterRole vs Role 차이

| 범위 | Role | ClusterRole |
|------|------|-------------|
| **적용 범위** | 네임스페이스 내 | 클러스터 전체 |
| **사용 목적** | 네임스페이스 리소스 | 노드, 네임스페이스 등 클러스터 리소스 |

---

### 4-2. Webhook 용 ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ingress-nginx-admission
rules:
- apiGroups: ["admissionregistration.k8s.io"]
  resources: ["validatingwebhookconfigurations"]
  verbs: ["get", "update"]
```

### 역할

- ValidatingWebhookConfiguration 업데이트

---

## 5. RoleBinding & ClusterRoleBinding

### 5-1. RoleBinding (x2)

```yaml
# 컨트롤러용
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
roleRef:
  kind: Role
  name: ingress-nginx
subjects:
- kind: ServiceAccount
  name: ingress-nginx
  namespace: ingress-nginx

# Webhook 용
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ingress-nginx-admission
  namespace: ingress-nginx
roleRef:
  kind: Role
  name: ingress-nginx-admission
subjects:
- kind: ServiceAccount
  name: ingress-nginx-admission
  namespace: ingress-nginx
```

### 5-2. ClusterRoleBinding (x2)

```yaml
# 컨트롤러용
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ingress-nginx
roleRef:
  kind: ClusterRole
  name: ingress-nginx
subjects:
- kind: ServiceAccount
  name: ingress-nginx
  namespace: ingress-nginx

# Webhook 용
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ingress-nginx-admission
roleRef:
  kind: ClusterRole
  name: ingress-nginx-admission
subjects:
- kind: ServiceAccount
  name: ingress-nginx-admission
  namespace: ingress-nginx
```

---

## 6. ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  allow-snippet-annotations: "false"
```

### 설정 설명

| 설정 | 값 | 설명 |
|------|-----|------|
| `allow-snippet-annotations` | "false" | 스니펫 주석 허용 안 함 (보안) |

### 보안 고려사항

```yaml
# CVE-2021-25742 대응
# allow-snippet-annotations: "true" 일 경우
# 악의적인 nginx 설정 주입 가능

# 예시 (악의적 주석):
# nginx.ingress.kubernetes.io/configuration-snippet: |
#   set $secret $http_authorization;
#   proxy_set_header X-Secret $secret;
```

### 기타 주요 설정 옵션

```yaml
data:
  # SSL/TLS 설정
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:..."
  
  # 타임아웃 설정
  proxy-connect-timeout: "10"
  proxy-read-timeout: "60"
  proxy-send-timeout: "60"
  
  # 리소스 제한
  max-worker-connections: "1024"
  
  # 로깅 설정
  access-log-path: "/var/log/nginx/access.log"
  error-log-path: "/var/log/nginx/error.log"
  
  # 기타
  use-forwarded-headers: "true"
  compute-full-forwarded-for: "true"
```

---

## 7. Service (x2)

### 7-1. 컨트롤러 Service (LoadBalancer)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: http
    name: http
    port: 80
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: ingress-nginx
```

### 중요 설정 설명

#### externalTrafficPolicy: Local

```yaml
externalTrafficPolicy: Local
```

| 값 | 설명 | 장단점 |
|----|------|--------|
| `Cluster` | 모든 Pod 로 트래픽 분산 | IP 보존 안됨, 균등 분산 |
| `Local` | 로컬 Pod 로만 트래픽 | **IP 보존됨**, 불균형 가능 |

```
Cluster 모드:
Client → Node1 → Pod(Node3)  # 소스 IP 변경

Local 모드:
Client → Node1 → Pod(Node1)  # 소스 IP 보존
```

#### ipFamilyPolicy

```yaml
ipFamilies:
- IPv4
ipFamilyPolicy: SingleStack
```

| 정책 | 설명 |
|------|------|
| `SingleStack` | 단일 IP 스택 (IPv4 또는 IPv6) |
| `PreferDualStack` | 듀얼스택 선호 |
| `RequireDualStack` | 듀얼스택 필수 |

#### appProtocol

```yaml
appProtocol: http   # HTTP 프로토콜
appProtocol: https  # HTTPS 프로토콜
```

- Kubernetes 1.20+ 에서 사용
- 서비스 메쉬 (Istio 등) 와 호환

---

### 7-2. Webhook Service (ClusterIP)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller-admission
  namespace: ingress-nginx
spec:
  type: ClusterIP
  ports:
  - appProtocol: https
    name: https-webhook
    port: 443
    targetPort: webhook
  selector:
    app.kubernetes.io/component: controller
```

### 역할

- Validating Webhook 엔드포인트 제공
- 내부 클러스터 통신용

---

## 8. Deployment - 컨트롤러

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  minReadySeconds: 0
  revisionHistoryLimit: 10
  strategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
  template:
    spec:
      containers:
      - args:
        - /nginx-ingress-controller
        - --publish-service=$(POD_NAMESPACE)/ingress-nginx-controller
        - --election-id=ingress-nginx-leader
        - --controller-class=k8s.io/ingress-nginx
        - --ingress-class=nginx
        - --configmap=$(POD_NAMESPACE)/ingress-nginx-controller
        - --validating-webhook=:8443
        - --validating-webhook-certificate=/usr/local/certificates/cert
        - --validating-webhook-key=/usr/local/certificates/key
        - --enable-metrics=false
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: LD_PRELOAD
          value: /usr/local/lib/libmimalloc.so
        image: registry.k8s.io/ingress-nginx/controller:v1.11.3@sha256:d56f135b6462cfc476447cfe564b83a45e8bb7da2774963b00d12161112270b7
        imagePullPolicy: IfNotPresent
        lifecycle:
          preStop:
            exec:
              command:
              - /wait-shutdown
        livenessProbe:
          failureThreshold: 5
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
        name: controller
        ports:
        - containerPort: 80
          name: http
        - containerPort: 443
          name: https
        - containerPort: 8443
          name: webhook
        resources:
          requests:
            cpu: 100m
            memory: 90Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - NET_BIND_SERVICE
            drop:
            - ALL
          readOnlyRootFilesystem: false
          runAsNonRoot: true
          runAsUser: 101
        volumeMounts:
        - mountPath: /usr/local/certificates/
          name: webhook-cert
          readOnly: true
      serviceAccountName: ingress-nginx
      terminationGracePeriodSeconds: 300
      volumes:
      - name: webhook-cert
        secret:
          secretName: ingress-nginx-admission
```

### 컨테이너 인수 (args)

| 인수 | 설명 |
|------|------|
| `/nginx-ingress-controller` | 실행 바이너리 |
| `--publish-service` | LoadBalancer Service 참조 (외부 IP 광고) |
| `--election-id` | 리더 선출용 ID |
| `--controller-class` | 컨트롤러 클래스 식별자 |
| `--ingress-class=nginx` | 기본 Ingress 클래스 |
| `--configmap` | 설정 ConfigMap 참조 |
| `--validating-webhook=:8443` | Webhook 포트 |
| `--validating-webhook-certificate` | Webhook 인증서 경로 |
| `--validating-webhook-key` | Webhook 키 경로 |
| `--enable-metrics=false` | 메트릭스 비활성화 |

### 환경 변수

```yaml
env:
- POD_NAME         # Pod 이름 (필드 참조)
- POD_NAMESPACE    # 네임스페이스 (필드 참조)
- LD_PRELOAD       # 메모리 할당자 (성능 최적화)
```

### Lifecycle Hook

```yaml
lifecycle:
  preStop:
    exec:
      command:
      - /wait-shutdown
```

- Pod 종료 시 연결 드레이닝 대기
- 우아한 종료 (Graceful Shutdown)

### 프로브

```yaml
livenessProbe:
  httpGet:
    path: /healthz      # 생존 체크
    port: 10254
  failureThreshold: 5   # 5 회 실패 시 재시작
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /healthz      # 준비 상태 체크
    port: 10254
  failureThreshold: 3   # 3 회 실패 시 트래픽 제거
```

### 보안 컨텍스트

```yaml
securityContext:
  allowPrivilegeEscalation: false    # 권한 상승 불가
  capabilities:
    add:
    - NET_BIND_SERVICE               # 1024 미만 포트 바인딩 허용
    drop:
    - ALL                            # 기타 모든 capability 제거
  runAsNonRoot: true                 # 루트 사용자 불가
  runAsUser: 101                     # nginx 사용자
  seccompProfile:
    type: RuntimeDefault             # 기본 seccomp 프로파일
```

### 리소스 요청

```yaml
resources:
  requests:
    cpu: 100m      # 0.1 코어 보장
    memory: 90Mi   # 90MB 보장
```

### 배포 전략

```yaml
strategy:
  rollingUpdate:
    maxUnavailable: 1  # 최대 1 개 Pod 만 사용 불가
  type: RollingUpdate
```

### 종료 대기 시간

```yaml
terminationGracePeriodSeconds: 300  # 5 분
```

- 긴 대기 시간: 기존 연결 처리 완료

---

## 9. Job (x2) - Webhook 인증서 생성

### 9-1. 인증서 생성 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ingress-nginx-admission-create
  namespace: ingress-nginx
spec:
  template:
    spec:
      containers:
      - args:
        - create
        - --host=ingress-nginx-controller-admission,ingress-nginx-controller-admission.$(POD_NAMESPACE).svc
        - --namespace=$(POD_NAMESPACE)
        - --secret-name=ingress-nginx-admission
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.4.4
        name: create
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 65532
      restartPolicy: OnFailure
      serviceAccountName: ingress-nginx-admission
```

### 역할

- Webhook 인증서 자동 생성
- Self-signed 인증서 생성

### 생성되는 시크릿

```yaml
# ingress-nginx-admission 시크릿
apiVersion: v1
kind: Secret
metadata:
  name: ingress-nginx-admission
data:
  ca.crt: <CA 인증서>
  tls.crt: <서버 인증서>
  tls.key: <서버 키>
```

---

### 9-2. Webhook 패치 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ingress-nginx-admission-patch
  namespace: ingress-nginx
spec:
  template:
    spec:
      containers:
      - args:
        - patch
        - --webhook-name=ingress-nginx-admission
        - --namespace=$(POD_NAMESPACE)
        - --patch-mutating=false
        - --secret-name=ingress-nginx-admission
        - --patch-failure-policy=Fail
        image: registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.4.4
        name: patch
      restartPolicy: OnFailure
      serviceAccountName: ingress-nginx-admission
```

### 역할

- ValidatingWebhookConfiguration 업데이트
- 생성된 인증서로 CA 번들 패치

### 패치 내용

```yaml
# WebhookConfiguration 의 CABundle 업데이트
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: ingress-nginx-admission
webhooks:
- clientConfig:
    caBundle: <생성된 CA 인증서>
```

---

## 10. IngressClass

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
spec:
  controller: k8s.io/ingress-nginx
```

### 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `name` | nginx | Ingress 클래스 이름 |
| `controller` | k8s.io/ingress-nginx | 컨트롤러 식별자 |

### 역할

- Ingress 리소스와 컨트롤러 연결
- 여러 Ingress 컨트롤러 공존 가능

### 사용 예시

```yaml
# Ingress 리소스에서 참조
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  ingressClassName: nginx  # ← 이 클래스 사용
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port: 80
```

---

## 11. ValidatingWebhookConfiguration

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: ingress-nginx-admission
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: ingress-nginx-controller-admission
      namespace: ingress-nginx
      path: /networking/v1/ingresses
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: validate.nginx.ingress.kubernetes.io
  rules:
  - apiGroups: ["networking.k8s.io"]
    apiVersions: ["v1"]
    operations: ["CREATE", "UPDATE"]
    resources: ["ingresses"]
  sideEffects: None
```

### 설정 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `admissionReviewVersions` | v1 | AdmissionReview 버전 |
| `failurePolicy` | Fail | 검증 실패 시 요청 거부 |
| `matchPolicy` | Equivalent | 동등한 리소스도 매칭 |
| `sideEffects` | None | 사이드 이펙트 없음 |

### 검증 항목

- Ingress 규칙 유효성 검사
- 주석 (annotation) 검증
- 경로 충돌 검사
- TLS 설정 검증

---

## 리소스 관계도

```
┌─────────────────────────────────────────────────────────────┐
│                Ingress-NGINX 구성                           │
└─────────────────────────────────────────────────────────────┘

Namespace: ingress-nginx
│
├─ RBAC
│  ├─ ServiceAccount: ingress-nginx (컨트롤러)
│  ├─ ServiceAccount: ingress-nginx-admission (Webhook)
│  ├─ Role (x2), ClusterRole (x2)
│  └─ RoleBinding (x2), ClusterRoleBinding (x2)
│
├─ Controller (Deployment)
│  ├─ 이미지: ingress-nginx/controller:v1.11.3
│  ├─ 포트: 80(HTTP), 443(HTTPS), 8443(Webhook)
│  ├─ ConfigMap: ingress-nginx-controller
│  └─ Service: LoadBalancer (외부 트래픽)
│
├─ Webhook 인증서 (Job x2)
│  ├─ ingress-nginx-admission-create (생성)
│  ├─ ingress-nginx-admission-patch (패치)
│  └─ Secret: ingress-nginx-admission
│
├─ Service (x2)
│  ├─ ingress-nginx-controller (LoadBalancer)
│  └─ ingress-nginx-controller-admission (ClusterIP)
│
├─ IngressClass: nginx
│  └─ controller: k8s.io/ingress-nginx
│
└─ ValidatingWebhookConfiguration
   └─ validate.nginx.ingress.kubernetes.io
```

---

## 설치 확인

```bash
# Ingress-NGINX 설치
kubectl apply -f ingress-nginx.yaml

# Pod 상태 확인
kubectl get pods -n ingress-nginx
# NAME                                        READY   STATUS    RESTARTS   AGE
# ingress-nginx-controller-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# ingress-nginx-admission-create-xxxxx        0/1     Completed 0          2m
# ingress-nginx-admission-patch-xxxxx         0/1     Completed 0          2m

# Service 확인
kubectl get svc -n ingress-nginx
# NAME                                 TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
# ingress-nginx-controller             LoadBalancer   10.96.xxx.xxx  192.168.x.x   80:3xxxx/TCP,443:3xxxx/TCP
# ingress-nginx-controller-admission   ClusterIP      10.96.xxx.xxx  <none>        443/TCP

# IngressClass 확인
kubectl get ingressclass
# NAME    CONTROLLER                       AGE
# nginx   k8s.io/ingress-nginx             2m

# 테스트 Ingress 생성
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: test.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-service
            port: 80
EOF

# Ingress 확인
kubectl get ingress
# NAME            CLASS   HOSTS             ADDRESS        PORTS   AGE
# test-ingress    nginx   test.example.com  192.168.x.x    80      1m
```

---

## 요약

| 카테고리 | 리소스 | 개수 |
|----------|--------|------|
| **Namespace** | ingress-nginx | 1 |
| **ServiceAccount** | controller, admission | 2 |
| **Role** | controller, admission | 2 |
| **ClusterRole** | controller, admission | 2 |
| **RoleBinding** | controller, admission | 2 |
| **ClusterRoleBinding** | controller, admission | 2 |
| **ConfigMap** | controller 설정 | 1 |
| **Service** | controller, admission | 2 |
| **Deployment** | controller | 1 |
| **Job** | create, patch | 2 |
| **IngressClass** | nginx | 1 |
| **ValidatingWebhook** | admission | 1 |
| **총계** | | **17** |

**Ingress-NGINX 는 Kubernetes Ingress 리소스를 구현하는 가장 널리 사용되는 컨트롤러입니다.**
