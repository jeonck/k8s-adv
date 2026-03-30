# Kubernetes 의 Root CA 역할

Kubernetes 클러스터는 자체 Root CA 로서 동작하며, 클러스터 내부의 모든 인증서를 발급하고 관리합니다.

---

## Kubernetes 가 Root CA 로 동작하는 이유

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 가 자체 Root CA 를 사용하는 이유        │
└─────────────────────────────────────────────────────────────┘

질문: "왜 DigiCert 같은 공개 CA 를 사용하지 않을까?"

답변: 클러스터 내부 통신용이기 때문!

공개 CA (DigiCert, Let's Encrypt):
  - 인터넷에 공개된 서비스용
  - 외부 사용자가 신뢰할 수 있어야 함
  - 비용 발생 (EV, OV 인증서)
  - 발급 시간 소요 (검증 필요)

Kubernetes 자체 CA:
  - 클러스터 내부 통신용
  - 클러스터만 신뢰하면 됨
  - 무료 (자체 운영)
  - 즉시 발급 (자동화)
  - 짧은 유효기간 (1 년)

비유:
  공개 CA: 여권 (국제적 신뢰, 발급 비용/시간)
  자체 CA: 사원증 (회사 내부만 사용, 즉시 발급)
```

### Kubernetes CA 의 신뢰 범위

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 의 신뢰 범위                         │
└─────────────────────────────────────────────────────────────┘

신뢰 범위: 클러스터 내부만

┌─────────────────────────────────────────────────────────────┐
│  Kubernetes 클러스터                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Kubernetes Root CA                          │  │
│  │           (ca.crt / ca.key)                           │  │
│  │                    │                                  │  │
│  │         ┌──────────┼──────────┐                       │  │
│  │         │          │          │                       │  │
│  │         ▼          ▼          ▼                       │  │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │   │apiserver │ │ kubelet  │ │  etcd    │             │  │
│  │   │인증서    │ │ 인증서   │ │ 인증서   │             │  │
│  │   └──────────┘ └──────────┘ └──────────┘             │  │
│  │                                                       │  │
│  │  클러스터 내부 컴포넌트만 신뢰                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  외부 사용자는 신뢰할 수 없음                               │
│  (브라우저에 내장되지 않음)                                 │
└─────────────────────────────────────────────────────────────┘

사용처:
  ✓ API Server ↔ kubelet 통신
  ✓ API Server ↔ controller-manager 통신
  ✓ API Server ↔ scheduler 통신
  ✓ etcd 피어 간 통신
  ✓ kubectl ↔ API Server 통신
  ✗ 외부 웹사이트 접속 (불가능)
```

---

## Kubernetes CA 구조

### CA 인증서 위치

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 인증서 위치                          │
└─────────────────────────────────────────────────────────────┘

kubeadm 클러스터:
  /etc/kubernetes/pki/
  ├── ca.crt              # Kubernetes Root CA (공개키)
  ├── ca.key              # Kubernetes Root CA (개인키)
  ├── ca.srl              # 일련번호 (서명 카운터)
  │
  ├── apiserver.crt       # API Server 서버 인증서
  ├── apiserver.key       # API Server 개인키
  ├── apiserver-kubelet-client.crt  # API Server → kubelet
  ├── apiserver-kubelet-client.key
  │
  ├── controller-manager.crt
  ├── controller-manager.key
  ├── scheduler.crt
  ├── scheduler.key
  │
  ├── front-proxy-ca.crt  # Front Proxy CA (별도 CA)
  ├── front-proxy-ca.key
  ├── front-proxy-client.crt
  ├── front-proxy-client.key
  │
  ├── sa.pub              # ServiceAccount 공개키 (별도)
  ├── sa.key              # ServiceAccount 개인키
  │
  └── etcd/
      ├── ca.crt          # etcd 전용 CA (별도 CA)
      ├── ca.key
      ├── server.crt      # etcd 서버 인증서
      ├── server.key
      ├── peer.crt        # etcd 피어 인증서
      ├── peer.key
      ├── healthcheck-client.crt
      └── healthcheck-client.key

총 3 개의 CA:
  1. Kubernetes Root CA (ca.crt/key)
  2. Front Proxy CA (front-proxy-ca.crt/key)
  3. etcd CA (etcd/ca.crt/key)
```

### CA 인증서 확인

```bash
# Root CA 인증서 확인
openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout

# 출력 예시:
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 01:ab:cd:ef:12:34:56:78
        Signature Algorithm: sha256WithRSAEncryption
    Issuer: CN = kubernetes-ca
              ↑
              └─ 자기 서명 (Root CA)
    Validity:
        Not Before: Jan  1 00:00:00 2024 GMT
        Not After:  Jan  1 00:00:00 2034 GMT
              ↑
              └─ 10 년 유효기간 (CA 는 김)
    Subject: CN = kubernetes-ca
              ↑
              └─ Issuer 와 동일 (자기 서명)
    Subject Public Key Info:
        Public Key Algorithm: rsaEncryption
            Public-Key: (2048 bit)
    X509v3 extensions:
        X509v3 Key Usage: critical
            Certificate Sign, CRL Sign
              ↑
              └─ CA 만 사용 가능 (서명용)
        X509v3 Basic Constraints: critical
            CA:TRUE
              ↑
              └─ 명백한 CA 인증서

# 개인키 확인 (절대 공유 금지!)
openssl rsa -in /etc/kubernetes/pki/ca.key -check -noout
# 출력: RSA key ok
```

### CA 권한 (Key Usage)

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 의 Key Usage                         │
└─────────────────────────────────────────────────────────────┘

CA 인증서의 Key Usage:
  - Certificate Sign: 다른 인증서에 서명 가능
  - CRL Sign: 폐기목록에 서명 가능

이는 CA 만 가진 특별한 권한!

일반 서버 인증서:
  - Digital Signature: 데이터 서명
  - Key Encipherment: 키 암호화
  - CA:FALSE (서명 불가)

CA 인증서:
  - Certificate Sign: 인증서 서명 ★
  - CRL Sign: CRL 서명 ★
  - CA:TRUE ★

kubeadm 이 CA 생성 시 자동으로 설정:
  --key-usage "key encipherment,key agreement,digital signature"
  --key-usage "cert sign" (CA 만)
```

---

## Kubernetes CA 의 인증서 발급

### 인증서 발급 주체

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes 인증서 발급 주체                        │
└─────────────────────────────────────────────────────────────┘

1. kubeadm (클러스터 생성 시)
   ┌─────────────────────────────────────────┐
   │  - CA 생성 (ca.crt/key)                 │
   │  - 컴포넌트 인증서 발급                 │
   │  - API Server, etcd, controller 등      │
   │  - 수동 갱신 필요                       │
   └─────────────────────────────────────────┘

2. kube-controller-manager (자동 회전)
   ┌─────────────────────────────────────────┐
   │  - kubelet 인증서 자동 갱신             │
   │  - CSR API 를 통한 인증서 발급          │
   │  - 자동 회전 (1 년마다)                 │
   └─────────────────────────────────────────┘

3. CertificateSigningRequest API (수동)
   ┌─────────────────────────────────────────┐
   │  - 사용자 인증서 발급                   │
   │  - kubectl certificate approve          │
   │  - 수동 승인 필요                       │
   └─────────────────────────────────────────┘
```

### kubeadm 의 CA 생성

```bash
# kubeadm 이 클러스터 생성 시 CA 생성
kubeadm init

# 내부적으로 수행되는 작업:
# 1. CA 키 쌍 생성 (ca.crt/key)
# 2. API Server 인증서 발급
# 3. etcd 인증서 발급
# 4. controller-manager 인증서 발급
# 5. scheduler 인증서 발급
# 6. front-proxy CA 및 인증서 발급
# 7. ServiceAccount 키 쌍 생성 (sa.pub/key)

# 생성된 인증서 확인
ls -la /etc/kubernetes/pki/
# 총 44K
# -rw-r--r-- 1 root root 1139 Jan  1 00:00 ca.crt
# -rw----- 1 root root 1675 Jan  1 00:00 ca.key
# -rw-r--r-- 1 root root 1151 Jan  1 00:00 apiserver.crt
# ...
```

### kubelet 인증서 자동 회전

```
┌─────────────────────────────────────────────────────────────┐
│          kubelet 인증서 자동 회전                           │
└─────────────────────────────────────────────────────────────┘

kubelet 은 매년 인증서가 만료됨:
  - kubeadm 이 자동으로 갱신
  - kube-controller-manager 가 서명

자동 회전 과정:

1. kubelet 이 CSR 생성
   ┌─────────────────────────────────────────┐
   │  - 만료 90 일 전에 시작                 │
   │  - 새 키 쌍 생성                        │
   │  - CSR 생성 (CertificateSigningRequest) │
   └─────────────────────────────────────────┘

2. API Server 가 CSR 수신
   ┌─────────────────────────────────────────┐
   │  - CSR 을 etcd 에 저장                  │
   │  - kube-controller-manager 에 알림      │
   └─────────────────────────────────────────┘

3. kube-controller-manager 가 승인
   ┌─────────────────────────────────────────┐
   │  - 노드 존재 확인                       │
   │  - CA 개인키로 서명                     │
   │  - 새 인증서 발급                       │
   └─────────────────────────────────────────┘

4. kubelet 이 인증서 다운로드
   ┌─────────────────────────────────────────┐
   │  - CSR 상태 확인 (Approved)             │
   │  - 새 인증서 다운로드                   │
   │  - 기존 인증서 교체                     │
   └─────────────────────────────────────────┘

5. kubelet 재시작 없이 적용
   ┌─────────────────────────────────────────┐
   │  - 인증서 자동 로드                     │
   │  - 연결 유지                            │
   │  - 다운타임 없음                        │
   └─────────────────────────────────────────┘

설정 확인:
  kubelet --rotate-certificates=true (기본값)
  kube-controller-manager --cluster-signing-duration=8760h (1 년)
```

---

## CertificateSigningRequest (CSR) API

### CSR API 를 통한 인증서 발급

```
┌─────────────────────────────────────────────────────────────┐
│          CSR API 를 통한 인증서 발급                        │
└─────────────────────────────────────────────────────────────┘

Kubernetes 는 CSR API 를 통해 동적으로 인증서를 발급합니다.

흐름:
  1. 사용자가 CSR 생성
  2. Kubernetes 에 제출
  3. 관리자 승인 (kubectl certificate approve)
  4. CA 가 서명
  5. 인증서 발급

이것이 Kubernetes 가 Root CA 로서 동작하는 핵심 메커니즘!
```

### CSR 을 통한 사용자 인증서 발급

```bash
# 1. 개인키 생성
openssl genrsa -out developer.key 2048

# 2. CSR 생성
openssl req -new -key developer.key \
  -out developer.csr \
  -subj "/CN=developer/O=developers"

# 3. CSR 을 base64 로 인코딩
CSR_B64=$(cat developer.csr | base64 | tr -d '\n')

# 4. CertificateSigningRequest 리소스 생성
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: developer
spec:
  request: $CSR_B64
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000  # 1 년
  usages:
  - client auth
EOF

# 5. CSR 상태 확인
kubectl get csr
# NAME        AGE   SIGNERNAME                             REQUESTOR           CONDITION
# developer   10s   kubernetes.io/kube-apiserver-client    admin@example.com   Pending

# 6. 관리자 승인 (CA 가 서명)
kubectl certificate approve developer
# certificatesigningrequest.certificates.k8s.io developer approved

# 7. 인증서 추출
kubectl get csr developer -o jsonpath='{.status.certificate}' \
  | base64 --decode > developer.crt

# 8. 인증서 확인
openssl x509 -in developer.crt -text -noout
# Issuer: CN = kubernetes-ca  ← Kubernetes CA 가 서명!
# Subject: CN = developer, O = developers

# 9. kubeconfig 에 추가
kubectl config set-credentials developer \
  --client-certificate=developer.crt \
  --client-key=developer.key

# 10. 사용
kubectl config set-context developer-context \
  --cluster=kubernetes \
  --user=developer \
  --namespace=default
kubectl config use-context developer-context
```

### CSR 서명자 (Signer Names)

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CSR 서명자 (Signer Names)               │
└─────────────────────────────────────────────────────────────┘

Kubernetes 는 용도별 서명자를 구분합니다:

1. kubernetes.io/kube-apiserver-client
   - 클라이언트 인증서 (kubectl 용)
   - CN: 사용자 이름
   - O: 그룹
   - CA: Kubernetes Root CA

2. kubernetes.io/kube-apiserver-client-kubelet
   - kubelet 클라이언트 인증서
   - CN: system:node:<노드이름>
   - O: system:nodes
   - 자동 승인

3. kubernetes.io/kubelet-serving
   - kubelet 서버 인증서 (HTTPS)
   - SAN: 노드 IP, 호스트명
   - 수동 승인 필요

4. kubernetes.io/front-proxy-client
   - front-proxy 클라이언트 인증서
   - 애그리게이션 레이어용

5. kubernetes.io/legacy-unknown
   - 레거시 (사용 금지)

확인:
  kubectl get csr developer -o yaml
  # spec:
  #   signerName: kubernetes.io/kube-apiserver-client
```

---

## Kubernetes CA 의 신뢰 체인

### CA 신뢰 구성

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 신뢰 체인                            │
└─────────────────────────────────────────────────────────────┘

Kubernetes 클러스터 내부:

┌─────────────────────────────────────────────────────────────┐
│  Kubernetes Root CA (ca.crt)                                │
│  - CN: kubernetes-ca                                        │
│  - 자기 서명 (Root CA)                                      │
│  - 모든 컴포넌트가 신뢰                                     │
└─────────────────────────────────────────────────────────────┘
           │
           │ 서명
           ▼
┌─────────────────────────────────────────────────────────────┐
│  컴포넌트 인증서                                             │
│  - API Server 인증서                                        │
│  - kubelet 인증서                                           │
│  - controller-manager 인증서                                │
│  - scheduler 인증서                                         │
│  - etcd 인증서                                              │
│  - 사용자 인증서                                            │
└─────────────────────────────────────────────────────────────┘

신뢰 검증:
  1. API Server 가 kubelet 인증서 검증
     - ca.crt 로 서명 확인
     - CN 이 system:node:* 인지 확인
     - O 가 system:nodes 인지 확인

  2. kubelet 이 API Server 인증서 검증
     - ca.crt 로 서명 확인
     - CN 이 kube-apiserver 인지 확인

  3. kubectl 이 API Server 인증서 검증
     - ca.crt 로 서명 확인
     - SAN 에 API Server IP/도메인 포함 확인
```

### kubeconfig 의 CA 신뢰

```yaml
# kubeconfig 파일의 CA 설정
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    # ↑ Kubernetes Root CA (ca.crt 의 base64)
    server: https://192.168.1.10:6443
  name: kubernetes

# 이 CA 가 없으면:
# x509: certificate signed by unknown authority
# (알 수 없는 CA 가 서명한 인증서)

# CA 추출 방법:
# kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 --decode > ca.crt
```

### CA 번들 (CA Bundle)

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 번들                                 │
└─────────────────────────────────────────────────────────────┘

Kubernetes 는 여러 CA 를 사용합니다:

1. Kubernetes Root CA
   - 주된 CA
   - 대부분의 인증서 서명

2. Front Proxy CA
   - 애그리게이션 레이어용
   - 별도 CA 사용

3. etcd CA
   - etcd 전용 CA
   - etcd 피어 간 통신

4. ServiceAccount (별도)
   - 토큰 서명용
   - CA 는 아니지만 유사한 역할

클러스터 내부에서는 이 모든 CA 를 신뢰합니다.
```

---

## Kubernetes CA 보안

### CA 개인키 보호

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 개인키 보호                          │
└─────────────────────────────────────────────────────────────┘

CA 개인키 (ca.key) 는 클러스터의 최상위 비밀!

유출 시 위험:
  - 공격자가 임의 인증서 발급 가능
  - 관리자 인증서 위조 가능
  - 클러스터 완전 장악

보호 조치:
  1. 파일 권한 제한
     chmod 600 /etc/kubernetes/pki/ca.key
     chown root:root /etc/kubernetes/pki/ca.key

  2. 마스터 노드 접근 제한
     - SSH 키 기반 인증
     - 방화벽 규칙
     - 감사 로그

  3. 백업 암호화
     - etcd 백업과 함께 암호화 보관
     - 접근 제한된 저장소

  4. 정기적 감사
     - ca.key 접근 로그 확인
     - 이상 징후 탐지
```

### CA 인증서 갱신

```bash
# CA 인증서 만료 확인
kubeadm certs check-expiration

# CA 인증서는 10 년 유효 (기본)
# 만료 전에 갱신 필요

# CA 갱신 (복잡, 주의 필요!)
kubeadm certs renew ca

# 갱신 후:
# 1. 모든 컴포넌트 인증서 재발급 필요
# 2. kubelet 인증서 재발급
# 3. 모든 kubeconfig 업데이트
# 4. 클러스터 재시작 필요할 수 있음

# 권장:
# - 만료 6 개월 전부터 계획
# - 테스트 클러스터에서 먼저 수행
# - 백업 필수
```

### CA 분리 (CA Separation)

```
┌─────────────────────────────────────────────────────────────┐
│          CA 분리 (CA Separation)                            │
└─────────────────────────────────────────────────────────────┘

고급 보안: CA 를 분리하여 운영

오프라인 Root CA:
  ┌─────────────────────────────────────────┐
  │  - 네트워크 연결 없음 (에어갭)          │
  │  - 물리적 보안 (금고)                   │
  │  - HSM 사용                             │
  │  - 연간 1-2 회만 사용                   │
  │  - Intermediate CA 서명만               │
  └─────────────────────────────────────────┘
           │ 서명
           ▼
온라인 Intermediate CA:
  ┌─────────────────────────────────────────┐
  │  - Kubernetes 클러스터에 설치           │
  │  - 실제 인증서 발급                     │
  │  - 자동화                               │
  │  - 만료: 1-2 년                         │
  └─────────────────────────────────────────┘
           │ 서명
           ▼
최종 인증서:
  - API Server, kubelet, 사용자 등

장점:
  - Root CA 는 절대 노출 안 됨
  - Intermediate CA 유출 시 재발급만
  - 더 안전한 계층 구조

단점:
  - 운영 복잡
  - kubeadm 은 기본 지원 안 함
  - 수동 설정 필요
```

---

## Kubernetes CA vs 공개 CA

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA vs 공개 CA                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│  Kubernetes CA       │  공개 CA (DigiCert, Let's Encrypt)   │
├──────────────────────┼──────────────────────────────────────┤
│  용도                │  용도                                │
│  클러스터 내부 통신  │  인터넷 공개 서비스                  │
├──────────────────────┼──────────────────────────────────────┤
│  신뢰 범위           │  신뢰 범위                           │
│  클러스터만          │  전 세계 (브라우저 내장)             │
├──────────────────────┼──────────────────────────────────────┤
│  비용                │  비용                                │
│  무료 (자체 운영)    │  유료 (DV 는 무료도 있음)            │
├──────────────────────┼──────────────────────────────────────┤
│  발급 시간           │  발급 시간                           │
│  즉시 (자동)         │  수분~수일 (검증 필요)               │
├──────────────────────┼──────────────────────────────────────┤
│  유효기간            │  유효기간                            │
│  1 년 (컴포넌트)     │  90 일~2 년                           │
│  10 년 (Root CA)     │                                      │
├──────────────────────┼──────────────────────────────────────┤
│  갱신                │  갱신                                │
│  자동 (kubelet)      │  수동 (Certbot 등)                   │
├──────────────────────┼──────────────────────────────────────┤
│  예시                │  예시                                │
│  - API Server 인증서 │  - www.example.com 인증서            │
│  - kubelet 인증서    │  - API 게이트웨이 인증서             │
│  - kubectl 인증서    │  - Ingress 인증서 (외부용)           │
└──────────────────────┴──────────────────────────────────────┘

혼합 사용 사례:
  - 클러스터 내부: Kubernetes CA
  - Ingress (외부): 공개 CA (Let's Encrypt)
  - 둘 다 필요!
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Kubernetes 는 Root CA 로서 동작                         │
│     - 클러스터 내부 통신용 인증서 발급                     │
│     - /etc/kubernetes/pki/ca.crt 에 저장                   │
│     - 자기 서명 (Self-Signed) Root CA                      │
│                                                             │
│  2. CA 구조                                                 │
│     - Kubernetes Root CA (주된 CA)                         │
│     - Front Proxy CA (애그리게이션용)                      │
│     - etcd CA (etcd 전용)                                  │
│     - ServiceAccount (토큰 서명용)                         │
│                                                             │
│  3. 인증서 발급 메커니즘                                    │
│     - kubeadm: 클러스터 생성 시 일괄 발급                  │
│     - kube-controller-manager: kubelet 인증서 자동 회전    │
│     - CSR API: 사용자 인증서 동적 발급                     │
│                                                             │
│  4. CSR API                                                 │
│     - CertificateSigningRequest 리소스                     │
│     - kubectl certificate approve 로 승인                  │
│     - CA 가 서명하여 인증서 발급                           │
│                                                             │
│  5. 신뢰 체인                                               │
│     - 모든 컴포넌트가 ca.crt 신뢰                          │
│     - kubeconfig 에 CA 포함                                │
│     - 서명 검증으로 신원 확인                              │
│                                                             │
│  6. 보안                                                    │
│     - CA 개인키 (ca.key) 는 최상위 비밀                    │
│     - 파일 권한 제한 (chmod 600)                           │
│     - 정기적 갱신 (10 년)                                  │
│                                                             │
│  7. Kubernetes CA vs 공개 CA                                │
│     - Kubernetes CA: 내부용, 무료, 즉시                    │
│     - 공개 CA: 외부용, 유료, 검증 필요                     │
│     - 둘 다 사용하는 것이 일반적                           │
└─────────────────────────────────────────────────────────────┘
```

### Kubernetes CA 의 역할 정리

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes CA 의 역할                              │
└─────────────────────────────────────────────────────────────┘

1. 클러스터 내부 신뢰의 근원
   - 모든 컴포넌트 인증서 서명
   - 신원 확인의 기준

2. 자동 인증서 발급
   - kubelet 인증서 자동 갱신
   - CSR API 를 통한 동적 발급

3. 보안 경계
   - 클러스터 내부만 신뢰
   - 외부와 격리

4. 수명 주기 관리
   - 인증서 만료 관리
   - 자동 회전

Kubernetes 는 자체 Root CA 를 운영함으로써
외부 의존 없이 안전한 클러스터 통신을 보장합니다.
```

**Kubernetes 는 클러스터 내부용 Root CA 로서 동작하며, 모든 컴포넌트 인증서를 발급하고 관리합니다. 이는 외부 CA 와 독립적으로 클러스터 보안을 유지하는 핵심 메커니즘입니다.**
