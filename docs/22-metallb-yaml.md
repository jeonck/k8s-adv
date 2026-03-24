# MetalLB YAML 분석

MetalLB 설치 및 설정에 사용되는 YAML 파일을 분석합니다.

## 전체 구성

```
MetalLB 구성 리소스:
1. 사용자 정의 리소스 (CRD)
   - IPAddressPool
   - L2Advertisement
   - BGPPeer, BGPAdvertisement
   - BFDProfile, Community
   - ServiceL2Status

2. RBAC 리소스
   - ServiceAccount (x2)
   - Role (x2)
   - ClusterRole (x2)
   - RoleBinding (x2)
   - ClusterRoleBinding (x2)

3. 애플리케이션 리소스
   - ConfigMap
   - Secret
   - Service
   - Deployment (Controller)
   - DaemonSet (Speaker)

4. Webhook
   - ValidatingWebhookConfiguration
```

---

## 1. 사용자 정의 리소스 설정

### 1-1. IPAddressPool

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ip-pool
  namespace: metallb-system
spec:
  addresses:
  - 172.31.1.200-172.31.1.250
```

#### 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `addresses` | 172.31.1.200-172.31.1.250 | 할당할 IP 주소 범위 |

#### 역할

- LoadBalancer Service 에 할당할 IP 주소 풀 정의
- 총 51 개 IP 사용 가능 (200~250)

#### IP 주소 지정 방식

```yaml
# CIDR 표기법도 사용 가능
addresses:
- 192.168.1.0/24      # 256 개 IP
- 10.0.0.1-10.0.0.10  # 명시적 범위
```

---

### 1-2. L2Advertisement

```yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - ip-pool
  interfaces:
  - eth0
```

#### 설명

| 필드 | 값 | 설명 |
|------|-----|------|
| `ipAddressPools` | ip-pool | 광고할 IP 풀 |
| `interfaces` | eth0 | 광고할 네트워크 인터페이스 |

#### 역할

- L2 (레이어 2) 모드를 통한 IP 광고 설정
- ARP 프로토콜을 사용하여 IP 주소 알림
- 특정 인터페이스 (eth0) 에서만 광고

#### L2 vs BGP

```
L2 모드:
- ARP 사용 (단순함)
- 단일 노드에서 IP 소유
- 빠른 페일오버
- 라우터 설정 불필요

BGP 모드:
- BGP 프로토콜 사용 (복잡함)
- ECMP 지원 (로드밸런싱)
- 네트워크 장비와 연동
- BGP 피어 설정 필요
```

---

## 2. Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/warn: privileged
  name: metallb-system
```

### Pod Security Standards

| 레이블 | 값 | 설명 |
|--------|-----|------|
| `audit` | privileged | 감사 로그만 기록 |
| `enforce` | privileged | 특권 모드 허용 |
| `warn` | privileged | 경고만 표시 |

### 역할

- MetalLB 전용 네임스페이스
- 특권 컨테이너 실행 필요 (네트워크 조작)

---

## 3. CustomResourceDefinitions (CRD)

MetalLB 는 6 개의 CRD 를 정의합니다.

### 3-1. BFDProfile

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: bfdprofiles.metallb.io
spec:
  group: metallb.io
  names:
    kind: BFDProfile
    plural: bfdprofiles
  scope: Namespaced
```

#### 역할

- BFD (Bidirectional Forwarding Detection) 세션 설정
- 네트워크 장애 빠른 감지

#### 주요 설정

```yaml
spec:
  detectMultiplier: 3        # 장애 감지 승수
  transmitInterval: 300      # 전송 간격 (ms)
  receiveInterval: 300       # 수신 간격 (ms)
  passiveMode: false         # 패시브 모드
```

---

### 3-2. BGPAdvertisement

```yaml
kind: CustomResourceDefinition
metadata:
  name: bgpadvertisements.metallb.io
```

#### 역할

- BGP 를 통한 IP 경로 광고 설정
- BGP 커뮤니티, 로컬 선호도 등 설정

#### 주요 설정

```yaml
spec:
  aggregationLength: 32      # IPv4 집계 길이
  communities:               # BGP 커뮤니티
  - "65000:100"
  localPref: 100             # 로컬 선호도
```

---

### 3-3. BGPPeer

```yaml
kind: CustomResourceDefinition
metadata:
  name: bgppeers.metallb.io
```

#### 역할

- BGP 피어 (라우터) 설정
- v1beta1 과 v1beta2 버전 지원

#### 주요 설정 (v1beta2)

```yaml
spec:
  myASN: 65000               # 로컬 AS 번호
  peerASN: 65001             # 피어 AS 번호
  peerAddress: 192.168.1.1   # 피어 주소
  peerPort: 179              # BGP 포트
  bfdProfile: bfd-profile    # BFD 프로파일 참조
  ebgpMultiHop: false        # 멀티홝 여부
```

---

### 3-4. Community

```yaml
kind: CustomResourceDefinition
metadata:
  name: communities.metallb.io
```

#### 역할

- BGP 커뮤니티 별명 정의
- 재사용 가능한 커뮤니티 이름 매핑

#### 사용 예시

```yaml
spec:
  communities:
  - name: customer-a
    value: "65000:100"
  - name: customer-b
    value: "65000:200"
```

---

### 3-5. IPAddressPool

```yaml
kind: CustomResourceDefinition
metadata:
  name: ipaddresspools.metallb.io
```

#### 역할

- IP 주소 풀 정의
- 자동 할당, 우선순위, 네임스페이스 선택기 설정

#### 주요 설정

```yaml
spec:
  addresses:
  - 192.168.1.0/24
  autoAssign: true           # 자동 할당
  avoidBuggyIPs: true        # .0, .255 제외
  serviceAllocation:         # 서비스 할당 규칙
    priority: 10
    namespaces:
    - production
```

---

### 3-6. L2Advertisement

```yaml
kind: CustomResourceDefinition
metadata:
  name: l2advertisements.metallb.io
```

#### 역할

- L2 모드 IP 광고 설정
- 인터페이스, 노드 선택기 지정

#### 주요 설정

```yaml
spec:
  ipAddressPools:
  - pool-1
  interfaces:
  - eth0
  - eth1
  nodeSelectors:             # 특정 노드만
  - matchLabels:
      node-type: lb
```

---

### 3-7. ServiceL2Status

```yaml
kind: CustomResourceDefinition
metadata:
  name: servicel2statuses.metallb.io
```

#### 역할

- L2 모드 서비스 상태 모니터링
- 실제 트래픽을 받는 노드 및 인터페이스 표시

#### 상태 정보

```yaml
status:
  node: k8s-w1                      # 트래픽 받는 노드
  serviceName: my-service           # 서비스 이름
  serviceNamespace: default         # 네임스페이스
  interfaces:                       # 인터페이스 목록
  - name: eth0
```

---

## 4. RBAC 리소스

### 4-1. ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: metallb
  name: controller
  namespace: metallb-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: metallb
  name: speaker
  namespace: metallb-system
```

#### 역할

- **controller**: MetalLB 컨트롤러 Pod 신원
- **speaker**: MetalLB 스피커 Pod 신원 (각 노드에서 실행)

---

### 4-2. Role (컨트롤러)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: controller
  namespace: metallb-system
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: ["metallb.io"]
  resources: ["bgppeers", "bfdprofiles", "ipaddresspools", 
              "bgpadvertisements", "l2advertisements", "communities"]
  verbs: ["get", "list", "watch"]
```

#### 권한

- 시크릿 관리 (memberlist 용)
- MetalLB CRD 읽기

---

### 4-3. Role (Speaker)

```yaml
kind: Role
metadata:
  name: pod-lister
  namespace: metallb-system
rules:
- apiGroups: [""]
  resources: ["pods", "secrets", "configmaps"]
  verbs: ["list", "get", "watch"]
- apiGroups: ["metallb.io"]
  resources: ["bfdprofiles", "bgppeers", "l2advertisements", 
              "bgpadvertisements", "ipaddresspools", "communities"]
  verbs: ["get", "list", "watch"]
```

#### 권한

- Pod, 시크릿, ConfigMap 조회
- MetalLB CRD 읽기

---

### 4-4. ClusterRole (컨트롤러)

```yaml
kind: ClusterRole
metadata:
  name: metallb-system:controller
rules:
- apiGroups: [""]
  resources: ["services", "namespaces", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["services/status"]
  verbs: ["update"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
- apiGroups: ["admissionregistration.k8s.io"]
  resources: ["validatingwebhookconfigurations", "mutatingwebhookconfigurations"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: ["apiextensions.k8s.io"]
  resources: ["customresourcedefinitions"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
```

#### 권한

- 클러스터 전체 서비스/네임스페이스/노드 조회
- 서비스 상태 업데이트 (LoadBalancer IP 할당)
- 이벤트 생성
- Webhook 설정 관리
- CRD 관리

---

### 4-5. ClusterRole (Speaker)

```yaml
kind: ClusterRole
metadata:
  name: metallb-system:speaker
rules:
- apiGroups: ["metallb.io"]
  resources: ["servicel2statuses", "servicel2statuses/status"]
  verbs: ["*"]
- apiGroups: [""]
  resources: ["services", "endpoints", "nodes", "namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["discovery.k8s.io"]
  resources: ["endpointslices"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
```

#### 권한

- ServiceL2Status 전체 권한
- 서비스, 엔드포인트, 노드 조회
- 엔드포인트슬라이스 조회
- 이벤트 생성

---

### 4-6. RoleBinding & ClusterRoleBinding

```yaml
# RoleBinding - 컨트롤러
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: controller
  namespace: metallb-system
roleRef:
  kind: Role
  name: controller
subjects:
- kind: ServiceAccount
  name: controller
  namespace: metallb-system

# RoleBinding - Speaker
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-lister
  namespace: metallb-system
roleRef:
  kind: Role
  name: pod-lister
subjects:
- kind: ServiceAccount
  name: speaker
  namespace: metallb-system

# ClusterRoleBinding - 컨트롤러
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: metallb-system:controller
roleRef:
  kind: ClusterRole
  name: metallb-system:controller
subjects:
- kind: ServiceAccount
  name: controller
  namespace: metallb-system

# ClusterRoleBinding - Speaker
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: metallb-system:speaker
roleRef:
  kind: ClusterRole
  name: metallb-system:speaker
subjects:
- kind: ServiceAccount
  name: speaker
  namespace: metallb-system
```

---

## 5. ConfigMap & Secret

### 5-1. ConfigMap - 제외 인터페이스

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metallb-excludel2
  namespace: metallb-system
data:
  excludel2.yaml: |
    announcedInterfacesToExclude: 
      ["^docker.*", "^cbr.*", "^dummy.*", "^virbr.*", "^lxcbr.*", 
       "^veth.*", "^lo$", "^cali.*", "^tunl.*", "^flannel.*", 
       "^kube-ipvs.*", "^cni.*", "^nodelocaldns.*"]
```

#### 역할

- L2 광고에서 제외할 네트워크 인터페이스 패턴 정의
- 가상 인터페이스, 컨테이너 네트워크 제외

---

### 5-2. Secret - Webhook 인증서

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: metallb-webhook-cert
  namespace: metallb-system
```

#### 역할

- Webhook 서버 TLS 인증서 저장

---

### 5-3. Secret - Memberlist

```yaml
# 컨트롤러 간 통신을 위한 시크릿 (자동 생성)
apiVersion: v1
kind: Secret
metadata:
  name: memberlist
  namespace: metallb-system
```

#### 역할

- 컨트롤러 간 클러스터 통신 암호화

---

## 6. Service

### 6-1. Webhook Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: metallb-webhook-service
  namespace: metallb-system
spec:
  ports:
  - port: 443
    targetPort: 9443
  selector:
    component: controller
```

#### 역할

- Webhook 검증 엔드포인트 제공

---

## 7. Deployment - Controller

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: metallb
    component: controller
  name: controller
  namespace: metallb-system
spec:
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: metallb
      component: controller
  template:
    metadata:
      annotations:
        prometheus.io/port: "7472"
        prometheus.io/scrape: "true"
      labels:
        app: metallb
        component: controller
    spec:
      containers:
      - args:
        - --port=7472
        - --log-level=info
        - --tls-min-version=VersionTLS12
        env:
        - name: METALLB_ML_SECRET_NAME
          value: memberlist
        - name: METALLB_DEPLOYMENT
          value: controller
        image: quay.io/metallb/controller:v0.14.8
        livenessProbe:
          httpGet:
            path: /metrics
            port: monitoring
          initialDelaySeconds: 10
          periodSeconds: 10
        name: controller
        ports:
        - containerPort: 7472
          name: monitoring
        - containerPort: 9443
          name: webhook-server
        readinessProbe:
          httpGet:
            path: /metrics
            port: monitoring
          initialDelaySeconds: 10
          periodSeconds: 10
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["all"]
          readOnlyRootFilesystem: true
        volumeMounts:
        - mountPath: /tmp/k8s-webhook-server/serving-certs
          name: cert
          readOnly: true
      securityContext:
        fsGroup: 65534
        runAsNonRoot: true
        runAsUser: 65534
      serviceAccountName: controller
      terminationGracePeriodSeconds: 0
      volumes:
      - name: cert
        secret:
          secretName: metallb-webhook-cert
```

### 컨테이너 설정

| 설정 | 값 | 설명 |
|------|-----|------|
| `image` | quay.io/metallb/controller:v0.14.8 | 컨트롤러 이미지 |
| `--port` | 7472 | 메트릭스 포트 |
| `--log-level` | info | 로그 레벨 |
| `--tls-min-version` | VersionTLS12 | 최소 TLS 버전 |

### 프로브

```yaml
livenessProbe:
  httpGet:
    path: /metrics
    port: monitoring
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /metrics
    port: monitoring
  initialDelaySeconds: 10
  periodSeconds: 10
```

### 보안 컨텍스트

```yaml
securityContext:
  allowPrivilegeEscalation: false    # 권한 상승 불가
  capabilities:
    drop: ["all"]                    # 모든 capability 제거
  readOnlyRootFilesystem: true       # 읽기 전용 파일시스템
  runAsNonRoot: true                 # 루트 사용자 불가
  runAsUser: 65534                   # nobody 사용자
```

### 환경 변수

```yaml
env:
- name: METALLB_ML_SECRET_NAME     # Memberlist 시크릿 이름
  value: memberlist
- name: METALLB_DEPLOYMENT         # 디플로이먼트 이름
  value: controller
```

### 역할

- LoadBalancer Service 모니터링
- IP 주소 할당
- CRD 관리
- Webhook 검증

---

## 8. DaemonSet - Speaker

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app: metallb
    component: speaker
  name: speaker
  namespace: metallb-system
spec:
  selector:
    matchLabels:
      app: metallb
      component: speaker
  template:
    metadata:
      annotations:
        prometheus.io/port: "7472"
        prometheus.io/scrape: "true"
      labels:
        app: metallb
        component: speaker
    spec:
      containers:
      - args:
        - --port=7472
        - --log-level=info
        env:
        - name: METALLB_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: METALLB_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: METALLB_HOST
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        - name: METALLB_ML_BIND_ADDR
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: METALLB_ML_LABELS
          value: app=metallb,component=speaker
        - name: METALLB_ML_SECRET_KEY_PATH
          value: /etc/ml_secret_key
        image: quay.io/metallb/speaker:v0.14.8
        livenessProbe:
          httpGet:
            path: /metrics
            port: monitoring
          initialDelaySeconds: 10
          periodSeconds: 10
        name: speaker
        ports:
        - containerPort: 7472
          name: monitoring
        - containerPort: 7946
          name: memberlist-tcp
        - containerPort: 7946
          name: memberlist-udp
          protocol: UDP
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - NET_RAW                    # RAW 소켓 필요 (ARP/BGP)
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - mountPath: /etc/ml_secret_key
          name: memberlist
          readOnly: true
        - mountPath: /etc/metallb
          name: metallb-excludel2
          readOnly: true
      hostNetwork: true                  # 호스트 네트워크 사용
      serviceAccountName: speaker
      terminationGracePeriodSeconds: 2
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
        operator: Exists
      volumes:
      - name: memberlist
        secret:
          secretName: memberlist
      - configMap:
          name: metallb-excludel2
        name: metallb-excludel2
```

### 중요 설정

| 설정 | 값 | 설명 |
|------|-----|------|
| `hostNetwork` | true | 호스트 네트워크 직접 사용 |
| `terminationGracePeriodSeconds` | 2 | 빠른 종료 (2 초) |
| `capabilities.add` | NET_RAW | RAW 소켓 권한 (ARP/BGP) |

### 환경 변수 (Pod 정보)

```yaml
env:
- METALLB_NODE_NAME        # 노드 이름
- METALLB_POD_NAME         # Pod 이름
- METALLB_HOST             # 호스트 IP
- METALLB_ML_BIND_ADDR     # Memberlist 바인딩 주소
- METALLB_ML_LABELS        # Memberlist 라벨
- METALLB_ML_SECRET_KEY_PATH  # Memberlist 키 경로
```

### Tolerations

```yaml
tolerations:
- key: node-role.kubernetes.io/master        # 마스터 노드 허용
  effect: NoSchedule
- key: node-role.kubernetes.io/control-plane # 컨트롤러 플레인 허용
  effect: NoSchedule
```

### 역할

- 각 노드에서 실행 (DaemonSet)
- L2 모드: ARP 광고
- BGP 모드: BGP 세션 유지
- 서비스 상태 업데이트

---

## 9. ValidatingWebhookConfiguration

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: metallb-webhook-configuration
webhooks:
- name: bgppeersvalidationwebhook.metallb.io
  clientConfig:
    service:
      name: metallb-webhook-service
      namespace: metallb-system
      path: /validate-metallb-io-v1beta2-bgppeer
  rules:
  - apiGroups: ["metallb.io"]
    apiVersions: ["v1beta2"]
    operations: ["CREATE", "UPDATE"]
    resources: ["bgppeers"]
  failurePolicy: Fail
  admissionReviewVersions: ["v1"]
  
- name: bfdprofilevalidationwebhook.metallb.io
  rules:
  - operations: ["CREATE", "DELETE"]
    resources: ["bfdprofiles"]
    
- name: bgpadvertisementvalidationwebhook.metallb.io
  rules:
  - operations: ["CREATE", "UPDATE"]
    resources: ["bgpadvertisements"]
    
- name: communityvalidationwebhook.metallb.io
  rules:
  - operations: ["CREATE", "UPDATE"]
    resources: ["communities"]
    
- name: ipaddresspoolvalidationwebhook.metallb.io
  rules:
  - operations: ["CREATE", "UPDATE"]
    resources: ["ipaddresspools"]
    
- name: l2advertisementvalidationwebhook.metallb.io
  rules:
  - operations: ["CREATE", "UPDATE"]
    resources: ["l2advertisements"]
```

### Webhook 검증 대상

| Webhook | 리소스 | 작업 |
|---------|--------|------|
| bgppeersvalidation | BGPPeer | CREATE, UPDATE |
| bfdprofilevalidation | BFDProfile | CREATE, DELETE |
| bgpadvertisementvalidation | BGPAdvertisement | CREATE, UPDATE |
| communityvalidation | Community | CREATE, UPDATE |
| ipaddresspoolvalidation | IPAddressPool | CREATE, UPDATE |
| l2advertisementvalidation | L2Advertisement | CREATE, UPDATE |

### FailurePolicy

```yaml
failurePolicy: Fail
```

- Webhook 오류 시 요청 거부
- 안전한 설정 강제

---

## 리소스 관계도

```
┌─────────────────────────────────────────────────────────────┐
│                    MetalLB 구성                             │
└─────────────────────────────────────────────────────────────┘

Namespace: metallb-system
│
├─ CRDs (6 개)
│  ├─ IPAddressPool      - IP 주소 풀 정의
│  ├─ L2Advertisement    - L2 광고 설정
│  ├─ BGPPeer            - BGP 피어 설정
│  ├─ BGPAdvertisement   - BGP 광고 설정
│  ├─ BFDProfile         - BFD 프로파일
│  └─ Community          - BGP 커뮤니티
│
├─ Controller (Deployment)
│  ├─ ServiceAccount: controller
│  ├─ Role/ClusterRole: 컨트롤러 권한
│  ├─ 이미지: quay.io/metallb/controller:v0.14.8
│  ├─ 포트: 7472(메트릭스), 9443(webhook)
│  └─ 역할: IP 할당, CRD 관리, Webhook
│
├─ Speaker (DaemonSet - 모든 노드)
│  ├─ ServiceAccount: speaker
│  ├─ ClusterRole: 스피커 권한
│  ├─ 이미지: quay.io/metallb/speaker:v0.14.8
│  ├─ hostNetwork: true
│  ├─ capabilities: NET_RAW
│  └─ 역할: ARP/BGP 광고, 상태 업데이트
│
├─ 설정 리소스
│  ├─ ConfigMap: metallb-excludel2 (제외 인터페이스)
│  ├─ Secret: metallb-webhook-cert (Webhook 인증서)
│  └─ Secret: memberlist (컨트롤러 간 통신)
│
├─ 사용자 설정 (예시)
│  ├─ IPAddressPool: ip-pool (172.31.1.200-250)
│  └─ L2Advertisement: l2-advertisement (eth0)
│
└─ Webhook
   ├─ Service: metallb-webhook-service
   └─ ValidatingWebhookConfiguration (6 개 검증기)
```

---

## 설치 확인

```bash
# MetalLB 설치
kubectl apply -f metallb-native.yaml

# IP Pool 및 광고 설정
kubectl apply -f metallb-ippool.yaml
kubectl apply -f metallb-l2advertisement.yaml

# Pod 상태 확인
kubectl get pods -n metallb-system
# NAME                         READY   STATUS    RESTARTS   AGE
# controller-xxxxxxxxxx-xxxx   1/1     Running   0          1m
# speaker-xxxxx                1/1     Running   0          1m

# CRD 확인
kubectl get crd | grep metallb
# bgppeers.metallb.io
# ipaddresspools.metallb.io
# l2advertisements.metallb.io
# ...

# IP Pool 확인
kubectl get ipaddresspool -n metallb-system
# NAME      AUTO ASSIGN   AVOID BUGGY IPS   ADDRESSES
# ip-pool   true          false             172.31.1.200-172.31.1.250

# L2 광고 확인
kubectl get l2advertisement -n metallb-system
# NAME              IP ADDRESS POOLS   INTERFACES
# l2-advertisement  ["ip-pool"]        ["eth0"]
```

---

## 요약

| 카테고리 | 리소스 | 개수 |
|----------|--------|------|
| **CRD** | BFDProfile, BGPPeer, BGPAdvertisement, Community, IPAddressPool, L2Advertisement, ServiceL2Status | 7 |
| **Namespace** | metallb-system | 1 |
| **ServiceAccount** | controller, speaker | 2 |
| **Role** | controller, pod-lister | 2 |
| **ClusterRole** | controller, speaker | 2 |
| **RoleBinding** | controller, pod-lister | 2 |
| **ClusterRoleBinding** | controller, speaker | 2 |
| **ConfigMap** | metallb-excludel2 | 1 |
| **Secret** | webhook-cert, memberlist | 2 |
| **Service** | webhook-service | 1 |
| **Deployment** | controller | 1 |
| **DaemonSet** | speaker | 1 |
| **ValidatingWebhook** | 6 개 검증기 | 1 |
| **사용자 리소스** | IPAddressPool, L2Advertisement | 2 |
| **총계** | | **27** |

**MetalLB 는 베어메탈 Kubernetes 클러스터에 LoadBalancer 기능을 제공하는 네트워킹 컴포넌트입니다.**
