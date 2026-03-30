# 인증서 만료기간 확인 및 ConfigMap 정보

Kubernetes 클러스터의 인증서 만료기간을 확인하고 kubeadm-config ConfigMap 정보를 알아봅니다.

---

## 인증서 만료기간 확인

### kubeadm certs check-expiration

```bash
# 클러스터의 인증서 만료 기간 확인
[root@k8s-cp ~]# kubeadm certs check-expiration
```

### 명령어 설명

```
┌─────────────────────────────────────────────────────────────┐
│          kubeadm certs check-expiration                     │
└─────────────────────────────────────────────────────────────┘

용도:
  - kubeadm 이 관리하는 로컬 PKI 인증서 만료 확인
  - 클러스터 유지보수 필수 명령어
  - 정기적 실행 권장 (월 1 회)

공식 문서:
  https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
```

### 출력 예시

```bash
[root@k8s-cp ~]# kubeadm certs check-expiration

[check-expiration] Reading configuration from the cluster...
[check-expiration] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'

CERTIFICATE                EXPIRES                  RESOLUTIONS                AVAILABLE CERTAUTHORITIES
----------------           ----------------         -----------------          ---------------------
admin.conf                 Dec 31, 2024 23:59 UTC   29d                        kubernetes-ca
apiserver                  Dec 31, 2024 23:59 UTC   29d                        kubernetes-ca
apiserver-etcd-client      Dec 31, 2024 23:59 UTC   29d                        etcd-ca
apiserver-kubelet-client   Dec 31, 2024 23:59 UTC   29d                        kubernetes-ca
controller-manager.conf    Dec 31, 2024 23:59 UTC   29d                        kubernetes-ca
etcd-healthcheck-client    Dec 31, 2024 23:59 UTC   29d                        etcd-ca
etcd-peer                  Dec 31, 2024 23:59 UTC   29d                        etcd-ca
etcd-server                Dec 31, 2024 23:59 UTC   29d                        etcd-ca
front-proxy-client         Dec 31, 2024 23:59 UTC   29d                        front-proxy-ca
scheduler.conf             Dec 31, 2024 23:59 UTC   29d                        kubernetes-ca
```

### 출력 필드 설명

```
┌─────────────────────────────────────────────────────────────┐
│          출력 필드 설명                                     │
└─────────────────────────────────────────────────────────────┘

1. CERTIFICATE (인증서 이름)
   - 확인된 인증서 이름
   - 총 10 개 인증서 확인

2. EXPIRES (만료일)
   - 인증서 만료 날짜 및 시간 (UTC)
   - 현재 시간 기준 남은 시간 표시

3. RESOLUTIONS (해결 방법)
   - 만료까지 남은 일수
   - 30 일 이내면 경고
   - 7 일 이내면 긴급

4. AVAILABLE CERTAUTHORITIES (사용 가능한 인증기관)
   - 해당 인증서를 서명한 CA
   - kubernetes-ca: 주된 CA
   - etcd-ca: etcd 전용 CA
   - front-proxy-ca: front-proxy CA
```

### 인증서별 상세 설명

```
┌─────────────────────────────────────────────────────────────┐
│          인증서별 역할                                      │
└─────────────────────────────────────────────────────────────┘

1. admin.conf
   - 클러스터 관리자 kubeconfig
   - CN: kubernetes-admin, O: system:masters
   - 위치: /etc/kubernetes/admin.conf

2. apiserver
   - API Server 서버 인증서
   - SAN: 호스트명, 도메인, IP
   - 위치: /etc/kubernetes/pki/apiserver.crt

3. apiserver-etcd-client
   - API Server → etcd 클라이언트
   - 위치: /etc/kubernetes/pki/apiserver-etcd-client.crt

4. apiserver-kubelet-client
   - API Server → kubelet 클라이언트
   - 위치: /etc/kubernetes/pki/apiserver-kubelet-client.crt

5. controller-manager.conf
   - controller-manager kubeconfig
   - 위치: /etc/kubernetes/controller-manager.conf

6. etcd-healthcheck-client
   - etcd 헬스체크 클라이언트
   - 위치: /etc/kubernetes/pki/etcd/healthcheck-client.crt

7. etcd-peer
   - etcd 피어 간 통신
   - 위치: /etc/kubernetes/pki/etcd/peer.crt

8. etcd-server
   - etcd 서버 인증서
   - 위치: /etc/kubernetes/pki/etcd/server.crt

9. front-proxy-client
   - front-proxy 클라이언트
   - 위치: /etc/kubernetes/pki/front-proxy-client.crt

10. scheduler.conf
    - scheduler kubeconfig
    - 위치: /etc/kubernetes/scheduler.conf
```

### 만료 임박 경고

```bash
# 만료 30 일 이내 인증서 있으면 경고 표시
[check-expiration] WARNING: Certificate "apiserver" expires in 29 days!

# 만료 7 일 이내면 긴급 경고
[check-expiration] CRITICAL: Certificate "apiserver" expires in 7 days!
```

### 수동 인증서 만료 확인

```bash
# openssl 로 직접 확인 (kubeadm 미사용 클러스터)
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates
# 출력:
# notBefore=Jan  1 00:00:00 2024 GMT
# notAfter=Dec 31 23:59:59 2024 GMT

# 모든 인증서 만료일 확인 (one-liner)
find /etc/kubernetes/pki -name "*.crt" -exec \
  openssl x509 -in {} -noout -subject -enddate \; 2>/dev/null

# 출력 예시:
# subject=CN = kubernetes-ca
# notAfter=Dec 31 23:59:59 2034 GMT
# subject=CN = kube-apiserver
# notAfter=Dec 31 23:59:59 2024 GMT
# ...
```

### 자동화 스크립트

```bash
#!/bin/bash
# cert-check.sh - 인증서 만료 확인 스크립트

echo "=== Kubernetes 인증서 만료 확인 ==="
echo ""

# kubeadm 사용 시
if command -v kubeadm &> /dev/null; then
    kubeadm certs check-expiration
else
    # kubeadm 미사용 시 openssl 로 확인
    echo "kubeadm 을 사용할 수 없습니다. openssl 로 확인합니다."
    echo ""
    
    for cert in /etc/kubernetes/pki/*.crt /etc/kubernetes/pki/etcd/*.crt; do
        if [ -f "$cert" ]; then
            subject=$(openssl x509 -in "$cert" -noout -subject 2>/dev/null | cut -d= -f2-)
            expiry=$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | cut -d= -f2)
            echo "$subject"
            echo "  만료: $expiry"
            echo ""
        fi
    done
fi

# 30 일 이내 만료되는 인증서 확인
echo "=== 30 일 이내 만료되는 인증서 ==="
kubeadm certs check-expiration 2>/dev/null | grep -E "^[a-z]" | while read line; do
    days=$(echo "$line" | awk '{print $3}' | sed 's/d//')
    if [ -n "$days" ] && [ "$days" -lt 30 ]; then
        echo "WARNING: $line"
    fi
done
```

---

## kubeadm-config ConfigMap 확인

### ConfigMap 정보 확인

```bash
# 클러스터의 인증서 정보 ConfigMap 확인
[root@k8s-cp ~]# kubectl -n kube-system get cm kubeadm-config -o yaml
```

### 출력 예시

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubeadm-config
  namespace: kube-system
  labels:
    app.kubernetes.io/managed-by: kubeadm
data:
  ClusterConfiguration: |
    apiServer:
      extraArgs:
        authorization-mode: Node,RBAC
      timeoutForControlPlane: 4m0s
    apiVersion: kubeadm.k8s.io/v1beta3
    certificatesDir: /etc/kubernetes/pki
    clusterName: kubernetes
    controllerManager: {}
    dns: {}
    etcd:
      local:
        dataDir: /var/lib/etcd
    imageRepository: registry.k8s.io
    kind: ClusterConfiguration
    kubernetesVersion: v1.31.4
    networking:
      dnsDomain: cluster.local
      serviceSubnet: 10.96.0.0/12
    scheduler: {}
  ClusterStatus: |
    apiEndpoints:
      k8s-cp:
        advertiseAddress: 172.31.1.10
        bindPort: 6443
    apiVersion: kubeadm.k8s.io/v1beta3
    kind: ClusterStatus
```

### ConfigMap 필드 설명

```
┌─────────────────────────────────────────────────────────────┐
│          kubeadm-config ConfigMap 필드                      │
└─────────────────────────────────────────────────────────────┘

1. ClusterConfiguration (클러스터 구성)
   - 클러스터 전체 설정 정보
   - kubeadm init 시 사용된 옵션 저장
   
   주요 필드:
   - apiServer: API Server 설정
   - certificatesDir: 인증서 디렉토리 (/etc/kubernetes/pki)
   - clusterName: 클러스터 이름 (kubernetes)
   - kubernetesVersion: Kubernetes 버전 (v1.31.4)
   - imageRepository: 컨테이너 이미지 저장소
   - networking: 네트워킹 설정
     - dnsDomain: cluster.local
     - serviceSubnet: 10.96.0.0/12
   - etcd: etcd 설정
     - dataDir: /var/lib/etcd

2. ClusterStatus (클러스터 상태)
   - 클러스터 현재 상태 정보
   - 노드 정보 포함
   
   주요 필드:
   - apiEndpoints: API 엔드포인트 목록
     - k8s-cp: 노드 이름
       - advertiseAddress: 172.31.1.10
       - bindPort: 6443
```

### 주요 설정 항목 상세

```yaml
# API Server 설정
apiServer:
  extraArgs:
    authorization-mode: Node,RBAC  # 인가 모드
  timeoutForControlPlane: 4m0s     # 제어_plane 타임아웃

# 인증서 디렉토리
certificatesDir: /etc/kubernetes/pki
# ← 모든 인증서가 이 디렉토리에 저장됨

# 클러스터 이름
clusterName: kubernetes

# Kubernetes 버전
kubernetesVersion: v1.31.4

# 이미지 저장소
imageRepository: registry.k8s.io
# ← 컨테이너 이미지를 이 저장소에서 다운로드

# 네트워킹 설정
networking:
  dnsDomain: cluster.local      # 기본 DNS 도메인
  serviceSubnet: 10.96.0.0/12   # 서비스 IP 범위
  podSubnet: 10.244.0.0/16      # Pod IP 범위 (CNI 에 따라 다름)

# etcd 설정
etcd:
  local:
    dataDir: /var/lib/etcd      # etcd 데이터 디렉토리

# 컨트롤 플레인 노드 정보
apiEndpoints:
  k8s-cp:                       # 노드 이름
    advertiseAddress: 172.31.1.10  # 광고할 IP
    bindPort: 6443              # API Server 포트
```

### ConfigMap 활용

```bash
# 1. 현재 클러스터 설정 확인
kubectl -n kube-system get cm kubeadm-config -o yaml

# 2. 특정 필드만 추출
# Kubernetes 버전 확인
kubectl -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | \
  grep kubernetesVersion

# API Server 추가 인자 확인
kubectl -n kube-system get cm kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | \
  grep -A5 extraArgs

# 3. 설정 백업
kubectl -n kube-system get cm kubeadm-config -o yaml > kubeadm-config-backup.yaml

# 4. 설정 수정 (권장 안 함 - 직접 수정 대신 kubeadm 사용)
# kubeadm config edit 사용 권장
kubeadm config view  # 현재 설정 보기
```

### kubeadm config 명령어

```bash
# 현재 설정 보기
kubeadm config view

# 출력 예시:
apiServer:
  extraArgs:
    authorization-mode: Node,RBAC
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
...

# 설정을 YAML 로 내보내기
kubeadm config view -o yaml > current-config.yaml

# 설정에서 이미지 목록 보기
kubeadm config images list

# 출력 예시:
# registry.k8s.io/kube-apiserver:v1.31.4
# registry.k8s.io/kube-controller-manager:v1.31.4
# registry.k8s.io/kube-scheduler:v1.31.4
# registry.k8s.io/kube-proxy:v1.31.4
# registry.k8s.io/etcd:3.5.15-0
# registry.k8s.io/coredns/coredns:1.11.1
# registry.k8s.io/pause:3.9
```

---

## 인증서 갱신

### 인증서 갱신 명령어

```bash
# 모든 인증서 갱신
kubeadm certs renew all

# 개별 인증서 갱신
kubeadm certs renew apiserver
kubeadm certs renew apiserver-kubelet-client
kubeadm certs renew controller-manager.conf
kubeadm certs renew scheduler.conf
kubeadm certs renew etcd-server
kubeadm certs renew etcd-peer
kubeadm certs renew etcd-healthcheck-client
kubeadm certs renew apiserver-etcd-client
kubeadm certs renew front-proxy-client
kubeadm certs renew admin.conf
```

### 갱신 후 작업

```bash
# 1. 인증서 갱신
kubeadm certs renew all

# 2. 만료일 재확인
kubeadm certs check-expiration

# 3. 관련 Pod 재시작 (새 인증서 로드)
# API Server
kubectl -n kube-system delete pod -l component=kube-apiserver

# controller-manager
kubectl -n kube-system delete pod -l component=kube-controller-manager

# scheduler
kubectl -n kube-system delete pod -l component=kube-scheduler

# etcd
kubectl -n kube-system delete pod -l component=etcd

# 4. kubelet 재시작
systemctl restart kubelet

# 5. 연결 확인
kubectl get nodes
kubectl get pods -n kube-system
```

### 자동 갱신 스크립트

```bash
#!/bin/bash
# cert-renew.sh - 인증서 자동 갱신 스크립트

echo "=== Kubernetes 인증서 갱신 ==="
echo ""

# 만료 30 일 이내 인증서 확인
EXPIRING=$(kubeadm certs check-expiration 2>/dev/null | \
  grep -E "^[a-z]" | awk '$3 < 30 {print $1}')

if [ -z "$EXPIRING" ]; then
    echo "만료 임박 인증서가 없습니다."
    exit 0
fi

echo "다음 인증서가 곧 만료됩니다:"
echo "$EXPIRING"
echo ""

# 확인 후 갱신
read -p "인증서를 갱신하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "인증서 갱신 중..."
    kubeadm certs renew all
    
    echo "관련 Pod 재시작 중..."
    kubectl -n kube-system delete pod -l component=kube-apiserver
    kubectl -n kube-system delete pod -l component=kube-controller-manager
    kubectl -n kube-system delete pod -l component=kube-scheduler
    kubectl -n kube-system delete pod -l component=etcd
    
    echo "kubelet 재시작 중..."
    systemctl restart kubelet
    
    echo "완료!"
    
    # 재확인
    echo ""
    echo "=== 갱신 후 확인 ==="
    kubeadm certs check-expiration
fi
```

---

## 정기적 유지보수 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 인증서 유지보수 체크리스트              │
└─────────────────────────────────────────────────────────────┘

매월:
  □ kubeadm certs check-expiration 실행
  □ 30 일 이내 만료 인증서 확인
  □ ConfigMap 백업 (kubeadm-config)

분기별:
  □ 모든 인증서 만료일 확인 (openssl)
  □ kubeconfig 파일 백업
  □ CA 개인키 보안 확인 (chmod 600)

반기별:
  □ 인증서 갱신 테스트 (테스트 클러스터)
  □ 백업 복구 테스트
  □ 감사 로그 확인

연간:
  □ CA 인증서 만료일 확인 (10 년)
  □ 전체 클러스터 백업
  □ 보안 감사
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. 인증서 만료 확인                                        │
│     - kubeadm certs check-expiration                       │
│     - 10 개 인증서 자동 확인                                │
│     - 30 일 이내 만료 시 경고                              │
│                                                             │
│  2. kubeadm-config ConfigMap                                │
│     - 클러스터 구성 정보 저장                              │
│     - ClusterConfiguration: 설정 정보                      │
│     - ClusterStatus: 상태 정보                             │
│     - kubectl -n kube-system get cm kubeadm-config -o yaml │
│                                                             │
│  3. 인증서 갱신                                             │
│     - kubeadm certs renew all                              │
│     - 갱신 후 Pod 재시작 필요                              │
│     - kubelet 재시작 필요                                  │
│                                                             │
│  4. 정기적 유지보수                                         │
│     - 매월: 만료 확인                                      │
│     - 분기별: 백업 및 보안 확인                            │
│     - 연간: CA 만료 확인 (10 년)                           │
│                                                             │
│  5. 중요 명령어                                             │
│     - kubeadm certs check-expiration                       │
│     - kubeadm certs renew all                              │
│     - kubectl -n kube-system get cm kubeadm-config -o yaml │
│     - kubeadm config view                                  │
│     - kubeadm config images list                           │
└─────────────────────────────────────────────────────────────┘
```

**인증서 만료 확인은 클러스터 유지보수의 기본입니다. 정기적으로 kubeadm certs check-expiration 를 실행하고, kubeadm-config ConfigMap 으로 설정을 관리하세요.**
