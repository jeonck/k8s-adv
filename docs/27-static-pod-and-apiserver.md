# Static Pod 와 API Server

Static Pod 의 개념과 API Server 와의 관계에 대해 알아봅니다.

---

## Static Pod 란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          Static Pod (정적 파드)                             │
└─────────────────────────────────────────────────────────────┘

정의:
  - API Server 가 관리하지 않는 Pod
  - kubelet 이 직접 관리하는 Pod
  - 특정 디렉토리의 Pod YAML 정의서를 감시
  - kubelet 이 직접 생성/관리

특징:
  ✓ API Server 를 통하지 않음
  ✓ kubelet 이 직접 감시 (file watch)
  ✓ YAML 파일 변경 시 자동 반영
  ✓ 클러스터 부트스트랩에 중요
  - Control Plane 컴포넌트 구동에 사용
```

### Static Pod vs 일반 Pod

```
┌─────────────────────────────────────────────────────────────┐
│          Static Pod vs 일반 Pod                             │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  Static Pod          │  일반 Pod                            │
├──────────────────────┼──────────────────────────────────────┤
│  관리 주체           │  관리 주체                           │
│  kubelet             │  API Server (kube-apiserver)         │
├──────────────────────┼──────────────────────────────────────┤
│  저장 위치           │  저장 위치                           │
│  파일 시스템         │  etcd                                │
│  (/etc/kubernetes/   │  (Kubernetes 데이터베이스)           │
│   manifests/)        │                                      │
├──────────────────────┼──────────────────────────────────────┤
│  생성 방법           │  생성 방법                           │
│  YAML 파일 배치      │  kubectl apply/create                │
│                      │  Deployment, DaemonSet 등            │
├──────────────────────┼──────────────────────────────────────┤
│  삭제 방법           │  삭제 방법                           │
│  YAML 파일 제거      │  kubectl delete                      │
├──────────────────────┼──────────────────────────────────────┤
│  감시 방식           │  감시 방식                           │
│  파일 시스템 감시    │  API Server 감시                     │
│  (inotify)           │  (etcd watch)                        │
├──────────────────────┼──────────────────────────────────────┤
│  사용처              │  사용처                              │
│  Control Plane       │  일반 워크로드                       │
│  (API Server, etcd)  │  (애플리케이션 Pod)                  │
├──────────────────────┼──────────────────────────────────────┤
│  이름 규칙           │  이름 규칙                           │
│  <노드이름>-<해시>   │  사용자가 지정                       │
│  예: k8s-cp-abc123   │  예: my-app-pod                      │
└──────────────────────┴──────────────────────────────────────┘
```

---

## Static Pod 동작 원리

### kubelet 의 Static Pod 감시

```
┌─────────────────────────────────────────────────────────────┐
│          Static Pod 동작 원리                               │
└─────────────────────────────────────────────────────────────┘

1. kubelet 시작
   ┌─────────────────────────────────────────┐
   │  kubelet 데몬 시작                     │
   │  --pod-manifest-path 옵션 또는          │
   │  config.yaml 에 staticPodPath 설정      │
   └─────────────────────────────────────────┘
           │
           ▼
2. 디렉토리 감시 시작
   ┌─────────────────────────────────────────┐
   │  /etc/kubernetes/manifests/ 감시 시작  │
   │  (inotify 사용)                         │
   │  파일 변경 실시간 감지                  │
   └─────────────────────────────────────────┘
           │
           ▼
3. YAML 파일 파싱
   ┌─────────────────────────────────────────┐
   │  디렉토리 내 *.yaml, *.yml 파일 읽기   │
   │  Pod 명세서 파싱                        │
   │  Pod 생성 정보 추출                     │
   └─────────────────────────────────────────┘
           │
           ▼
4. Pod 생성
   ┌─────────────────────────────────────────┐
   │  Pod 생성 (API Server 통하지 않음)     │
   │  컨테이너 런타임에 직접 요청            │
   │  (containerd, CRI-O 등)                 │
   └─────────────────────────────────────────┘
           │
           ▼
5. 지속적 감시
   ┌─────────────────────────────────────────┐
   │  파일 변경 감시                         │
   │  - 수정: Pod 업데이트                   │
   │  - 삭제: Pod 삭제                       │
   │  - 추가: Pod 생성                       │
   └─────────────────────────────────────────┘
```

### 파일 변경 감지

```
┌─────────────────────────────────────────────────────────────┐
│          Static Pod 파일 변경 감지                          │
└─────────────────────────────────────────────────────────────┘

시나리오 1: YAML 파일 추가
  /etc/kubernetes/manifests/ 에 새 YAML 파일 추가
       ↓
  kubelet 이 감지 (inotify)
       ↓
  YAML 파싱 및 Pod 생성
       ↓
  Pod 실행

시나리오 2: YAML 파일 수정
  YAML 파일 내용 수정 (예: 이미지 버전 변경)
       ↓
  kubelet 이 감지
       ↓
  Pod 업데이트 (재시작)
       ↓
  새 이미지로 Pod 재실행

시나리오 3: YAML 파일 삭제
  YAML 파일 삭제
       ↓
  kubelet 이 감지
       ↓
  Pod 삭제
       ↓
  컨테이너 종료
```

---

## Static Pod 디렉토리

### 기본 디렉토리

```
┌─────────────────────────────────────────────────────────────┐
│          Static Pod 디렉토리                                │
└─────────────────────────────────────────────────────────────┘

기본 경로:
  /etc/kubernetes/manifests/

kubeadm 클러스터:
  - kubeadm 이 자동으로 사용
  - Control Plane 컴포넌트 정의서 저장
  - 마스터 노드에만 존재

확인:
  ls -la /etc/kubernetes/manifests/
```

### 디렉토리 내용물

```bash
# Static Pod 디렉토리 확인
[root@k8s-cp ~]# ls -la /etc/kubernetes/manifests/

# 출력 예시:
총 32K
drwxr-xr-x 2 root root 4096 Jan  1 00:00 .
drwxr-xr-x 3 root root 4096 Jan  1 00:00 ..
-rw-r--r-- 1 root root 3.5K Jan  1 00:00 etcd.yaml
-rw-r--r-- 1 root root 7.2K Jan  1 00:00 kube-apiserver.yaml
-rw-r--r-- 1 root root 3.8K Jan  1 00:00 kube-controller-manager.yaml
-rw-r--r-- 1 root root 2.5K Jan  1 00:00 kube-scheduler.yaml
```

### Control Plane Static Pod

```
/etc/kubernetes/manifests/ 에 있는 4 가지 주요 Pod:

1. kube-apiserver.yaml
   - Kubernetes API Server
   - 클러스터의 프론트엔드
   - 모든 API 요청 처리

2. etcd.yaml
   - etcd 데이터베이스
   - 클러스터 상태 저장
   - 키 - 값 저장소

3. kube-controller-manager.yaml
   - 컨트롤러 매니저
   - 다양한 컨트롤러 실행
   - 클러스터 상태 관리

4. kube-scheduler.yaml
   - 스케줄러
   - Pod 를 적절한 노드에 배치
   - 리소스 최적화

이 4 개는 Static Pod 로 실행됨!
```

---

## Static Pod 설정

### kubelet 설정 확인

```bash
# kubelet 이 사용하는 Static Pod 경로 확인
# 방법 1: kubelet 서비스 파일 확인
cat /etc/systemd/system/kubelet.service.d/10-kubeadm.conf

# 출력 예시:
Environment="KUBELET_CONFIG_ARGS=--config=/var/lib/kubelet/config.yaml"
Environment="KUBELET_SYSTEM_PODS_ARGS=--pod-manifest-path=/etc/kubernetes/manifests"

# --pod-manifest-path 옵션 확인
# 이 경로가 Static Pod 디렉토리
```

### kubelet config.yaml 확인

```bash
# kubelet 설정 파일 확인
cat /var/lib/kubelet/config.yaml

# 출력 예시:
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
...
staticPodPath: /etc/kubernetes/manifests
  ↑
  └─ Static Pod 디렉토리 설정
...
```

### kubelet 설정 변경

```yaml
# /var/lib/kubelet/config.yaml 수정
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
address: 0.0.0.0
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 0s
    cacheUnauthorizedTTL: 0s
cgroupDriver: systemd
clusterDNS:
- 10.96.0.10
clusterName: kubernetes
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
...
staticPodPath: /etc/kubernetes/manifests  # ← 이 경로 변경 가능
...
```

### kubelet 재시작

```bash
# 설정 변경 후 kubelet 재시작
systemctl daemon-reload
systemctl restart kubelet

# 상태 확인
systemctl status kubelet

# 로그 확인
journalctl -u kubelet -f
```

---

## Static Pod 관리

### Static Pod 확인

```bash
# Static Pod 확인 (kubectl 로)
kubectl get pods -n kube-system

# 출력 예시:
NAME                            READY   STATUS    RESTARTS   AGE
etcd-k8s-cp                     1/1     Running   0          10m
kube-apiserver-k8s-cp           1/1     Running   0          10m
kube-controller-manager-k8s-cp  1/1     Running   0          10m
kube-scheduler-k8s-cp           1/1     Running   0          10m

# Static Pod 이름 규칙:
# <컴포넌트이름>-<노드이름>
# 예: kube-apiserver-k8s-cp
```

### Static Pod 상세 확인

```bash
# Static Pod 상세 정보
kubectl get pod etcd-k8s-cp -n kube-system -o yaml

# 출력에서 확인:
# spec:
#   nodeName: k8s-cp
#   ...
# metadata:
#   annotations:
#     kubernetes.io/config.source: file  ← 파일 소스!
#     kubernetes.io/config.seen: "2024-01-01T00:00:00Z"
```

### Static Pod 수정

```bash
# Static Pod 수정 방법 1: YAML 파일 직접 수정 (권장)
vi /etc/kubernetes/manifests/kube-apiserver.yaml

# 수정 후 kubelet 이 자동 감지하여 재시작
# kubectl restart 불필요!

# 확인
kubectl get pod -n kube-system -l component=kube-apiserver
```

```bash
# Static Pod 수정 방법 2: kubectl edit (비권장)
kubectl edit pod kube-apiserver-k8s-cp -n kube-system

# 주의: 이 변경은 일시적!
# YAML 파일과 다르면 kubelet 이 원래대로 복원
```

### Static Pod 삭제

```bash
# Static Pod 삭제 방법: YAML 파일 제거
rm /etc/kubernetes/manifests/kube-scheduler.yaml

# kubelet 이 감지하여 자동 삭제
kubectl get pod -n kube-system
# kube-scheduler-k8s-cp 사라짐!

# 복구: YAML 파일 다시 복사
cp /etc/kubernetes/manifests/kube-scheduler.yaml.bak \
   /etc/kubernetes/manifests/kube-scheduler.yaml
```

---

## Static Pod 와 API Server 관계

### API Server 가 Static Pod 인 이유

```
┌─────────────────────────────────────────────────────────────┐
│          API Server 가 Static Pod 인 이유                   │
└─────────────────────────────────────────────────────────────┘

질문: "왜 API Server 는 Static Pod 일까?"

답변: "닭이 먼저냐, 달걀이 먼저냐 문제!"

문제:
  1. 일반 Pod 는 API Server 가 관리함
  2. 그런데 API Server 가 다운되면?
  3. Pod 를 관리할 수 없음!
  4. API Server 를 다시 시작할 수도 없음!

해결:
  - API Server 를 Static Pod 로 실행
  - kubelet 이 직접 관리 (API Server 불필요)
  - API Server 다운 시 kubelet 이 자동 재시작
  - 클러스터 자기 치유 가능

비유:
  API Server = 회사 대표
  Static Pod = 이사가 직접 관리 (대표 없어도 회사 운영)
  일반 Pod = 직원이 관리 (대표 지시 필요)
```

### Control Plane 컴포넌트 관계

```
┌─────────────────────────────────────────────────────────────┐
│          Control Plane 컴포넌트 관계                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Static Pod (kubelet 직접 관리)                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ kube-         │  │ etcd          │  │ kube-         │   │
│  │ apiserver     │  │               │  │ controller-   │   │
│  │               │  │               │  │ manager       │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  ┌───────────────┐                                          │
│  │ kube-         │                                          │
│  │ scheduler     │                                          │
│  └───────────────┘                                          │
│                                                             │
│  모두 /etc/kubernetes/manifests/ 에 YAML 정의               │
└─────────────────────────────────────────────────────────────┘

관계:
  - kube-apiserver: etcd 와 통신 (클러스터 상태 저장)
  - etcd: API Server 만 접근 (보안)
  - controller-manager: API Server 통해 클러스터 관리
  - scheduler: API Server 통해 Pod 스케줄링

모두 Static Pod 로 실행되므로 API Server 없이도 부트스트랩 가능!
```

### 부트스트랩 과정

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 클러스터 부트스트랩                     │
└─────────────────────────────────────────────────────────────┘

1. kubelet 시작
   ┌─────────────────────────────────────────┐
   │  kubelet 데몬 시작                     │
   │  Static Pod 디렉토리 감시 시작          │
   └─────────────────────────────────────────┘
           │
           ▼
2. etcd Pod 생성
   ┌─────────────────────────────────────────┐
   │  etcd.yaml 감지                        │
   │  etcd Pod 생성 (Static Pod)            │
   │  etcd 클러스터 시작                     │
   └─────────────────────────────────────────┘
           │
           ▼
3. kube-apiserver Pod 생성
   ┌─────────────────────────────────────────┐
   │  kube-apiserver.yaml 감지              │
   │  API Server Pod 생성 (Static Pod)      │
   │  API Server 시작, etcd 와 연결          │
   └─────────────────────────────────────────┘
           │
           ▼
4. controller-manager Pod 생성
   ┌─────────────────────────────────────────┐
   │  kube-controller-manager.yaml 감지     │
   │  controller-manager Pod 생성           │
   │  API Server 통해 클러스터 관리 시작     │
   └─────────────────────────────────────────┘
           │
           ▼
5. scheduler Pod 생성
   ┌─────────────────────────────────────────┐
   │  kube-scheduler.yaml 감지              │
   │  scheduler Pod 생성                    │
   │  Pod 스케줄링 시작                     │
   └─────────────────────────────────────────┘
           │
           ▼
6. 클러스터 정상 운영
   ┌─────────────────────────────────────────┐
   │  API Server 정상 운영                  │
   │  이제 일반 Pod 도 관리 가능             │
   │  kubectl 사용 가능                     │
   └─────────────────────────────────────────┘

핵심:
  Static Pod 가 없으면 API Server 시작 불가!
  API Server 가 없으면 일반 Pod 관리 불가!
```

---

## Static Pod 실습

### Static Pod 생성

```yaml
# 1. Static Pod YAML 생성
cat <<EOF > /etc/kubernetes/manifests/static-nginx.yaml
apiVersion: v1
kind: Pod
metadata:
  name: static-nginx
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
EOF

# 2. kubelet 이 자동 감지하여 생성
# 몇 초 기다리면...

# 3. Pod 확인
kubectl get pod static-nginx -n default

# 출력:
# NAME           READY   STATUS    RESTARTS   AGE
# static-nginx   1/1     Running   0          10s
```

### Static Pod 수정

```yaml
# YAML 파일 수정
vi /etc/kubernetes/manifests/static-nginx.yaml

# 이미지 버전 변경
spec:
  containers:
  - name: nginx
    image: nginx:1.26  # ← 버전 업그레이드

# 저장하면 kubelet 이 자동 감지하여 재시작!
# kubectl restart 불필요
```

### Static Pod 삭제

```bash
# YAML 파일 제거
rm /etc/kubernetes/manifests/static-nginx.yaml

# kubelet 이 감지하여 자동 삭제
kubectl get pod static-nginx
# 출력: Error from server (NotFound): pods "static-nginx" not found
```

### Static Pod 로그 확인

```bash
# Static Pod 로그 확인 (kubectl 사용)
kubectl logs static-nginx -n default

# 또는 journalctl 로 kubelet 로그 확인
journalctl -u kubelet -f | grep static-nginx
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Static Pod                                              │
│     - API Server 가 아닌 kubelet 이 직접 관리              │
│     - 파일 시스템의 YAML 정의서 감시                        │
│     - /etc/kubernetes/manifests/ (기본 경로)               │
│                                                             │
│  2. Static Pod vs 일반 Pod                                  │
│     - Static: kubelet, 파일, YAML 배치                     │
│     - 일반: API Server, etcd, kubectl apply                │
│                                                             │
│  3. 동작 원리                                               │
│     - kubelet 이 inotify 로 파일 감시                      │
│     - 변경 감지 시 자동 생성/수정/삭제                     │
│     - API Server 불필요                                     │
│                                                             │
│  4. 주요 사용처                                             │
│     - Control Plane 컴포넌트                               │
│     - kube-apiserver, etcd, controller-manager, scheduler  │
│     - 클러스터 부트스트랩에 필수                            │
│                                                             │
│  5. API Server 가 Static Pod 인 이유                        │
│     - "닭이 먼저냐, 달걀이 먼저냐" 문제 해결               │
│     - API Server 없이도 자기 시작 가능                     │
│     - 클러스터 자기 치유                                   │
│                                                             │
│  6. 관리 방법                                               │
│     - 생성: YAML 파일을 manifests/ 에 배치                 │
│     - 수정: YAML 파일 수정 (자동 반영)                     │
│     - 삭제: YAML 파일 제거 (자동 삭제)                     │
│     - 확인: kubectl get pods -n kube-system                │
└─────────────────────────────────────────────────────────────┘
```

### Static Pod 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          Static Pod 체크리스트                              │
└─────────────────────────────────────────────────────────────┘

□ Static Pod 디렉토리 확인
  ls -la /etc/kubernetes/manifests/

□ Control Plane Pod 상태 확인
  kubectl get pods -n kube-system

□ Static Pod YAML 백업
  cp -r /etc/kubernetes/manifests /backup/

□ kubelet 설정 확인
  cat /var/lib/kubelet/config.yaml | grep staticPodPath

□ Static Pod 로그 확인
  kubectl logs -n kube-system -l component=kube-apiserver
```

**Static Pod 은 Kubernetes 의 자기 부트스트랩 메커니즘입니다. API Server 를 포함한 Control Plane 컴포넌트가 Static Pod 으로 실행되므로, 클러스터는 외부 의존 없이 자가 치유가 가능합니다.**
