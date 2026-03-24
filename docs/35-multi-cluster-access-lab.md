# 멀티 클러스터 접속 설정 실습

원격 Kubernetes 클러스터 (remote-k8s) 를 로컬 kubeconfig 에 등록하고 접속하는 실습을 진행합니다.

---

## 실습 개요

```
┌─────────────────────────────────────────────────────────────┐
│          멀티 클러스터 접속 설정                            │
└─────────────────────────────────────────────────────────────┘

목적:
  - 원격 클러스터 (remote-k8s) 를 로컬 kubeconfig 에 등록
  - 여러 클러스터를 쉽게 전환하며 사용
  - 사용자별 네임스페이스 접근 제어 확인

환경:
  - 로컬 클러스터: kubernetes (172.31.1.10:6443)
  - 원격 클러스터: remote-k8s (k8s-remote.example.com:6443)
  - 사용자: guest (guest-ns 네임스페이스 제한)
```

---

## 1 단계: 원격 클러스터 인증서 파일 확인

### 인증서 파일 위치

```bash
# 원격 클러스터 인증서 디렉토리로 이동
[root@k8s-cp ~]# cd ~/lab/auth/remote-k8s

# 파일 목록 확인
[root@k8s-cp remote-k8s]# ls -l

# 출력:
-rw-r--r-- 1 root root 1107 Mar 10 21:07 ca.crt
-rw-r--r-- 1 root root 1127 Mar 10 21:07 guest.crt
-rw-r--r-- 1 root root 1700 Mar 10 21:07 guest.key
```

### 파일 설명

```
┌─────────────────────────────────────────────────────────────┐
│          인증서 파일 설명                                   │
└─────────────────────────────────────────────────────────────┘

1. ca.crt (Root CA 인증서)
   - remote-k8s 클러스터의 Root CA 인증서
   - 서버 인증서 검증용
   - 클라이언트가 서버를 신뢰하는지 확인

2. guest.crt (클라이언트 인증서)
   - guest 사용자 인증서
   - remote-k8s 클러스터가 발급
   - CN=guest, O=guest-group 등 포함

3. guest.key (클라이언트 개인키)
   - guest 사용자 개인키
   - 절대 공유 금지
   - chmod 600 권한 설정 권장
```

---

## 2 단계: Root CA 인증서 정보 확인

### CA 인증서 상세 확인

```bash
# Root CA 인증서 정보 확인
[root@k8s-cp remote-k8s]# openssl x509 -text -noout -in ca.crt
```

### 출력 예시

```
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 01:ab:cd:ef:12:34:56:78
        Signature Algorithm: sha256WithRSAEncryption
    Issuer: CN = remote-k8s-ca
              ↑
              └─ remote-k8s 클러스터 CA
    Validity:
        Not Before: Mar 10 00:00:00 2024 GMT
        Not After:  Mar 10 00:00:00 2034 GMT
              ↑
              └─ 10 년 유효기간
    Subject: CN = remote-k8s-ca
              ↑
              └─ 자기 서명 (Root CA)
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
```

### 주요 확인 항목

```
┌─────────────────────────────────────────────────────────────┐
│          CA 인증서 확인 항목                                │
└─────────────────────────────────────────────────────────────┘

✓ Issuer = Subject (자기 서명)
✓ CA:TRUE (CA 인증서)
✓ Key Usage: Certificate Sign, CRL Sign
✓ 유효기간: 10 년
✓ CN: remote-k8s-ca (클러스터 식별자)
```

---

## 3 단계: 클라이언트 인증서 정보 확인

### guest 인증서 상세 확인

```bash
# guest 클라이언트 인증서 정보 확인
[root@k8s-cp remote-k8s]# openssl x509 -text -noout -in guest.crt
```

### 출력 예시

```
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 02:bc:de:f1:23:45:67:89
        Signature Algorithm: sha256WithRSAEncryption
    Issuer: CN = remote-k8s-ca
              ↑
              └─ remote-k8s CA 가 서명!
    Validity:
        Not Before: Mar 10 00:00:00 2024 GMT
        Not After:  Mar 10 00:00:00 2025 GMT
              ↑
              └─ 1 년 유효기간
    Subject: CN = guest, O = guest-group
              ↑
              └─ 사용자 정보 (CN=username, O=group)
    Subject Public Key Info:
        Public Key Algorithm: rsaEncryption
            Public-Key: (2048 bit)
    X509v3 extensions:
        X509v3 Key Usage: critical
            Digital Signature, Key Encipherment
              ↑
              └─ 클라이언트 인증서 용도
        X509v3 Extended Key Usage:
            TLS Web Client Authentication
              ↑
              └─ 클라이언트 인증용
```

### 주요 확인 항목

```
┌─────────────────────────────────────────────────────────────┐
│          클라이언트 인증서 확인 항목                        │
└─────────────────────────────────────────────────────────────┘

✓ Issuer: remote-k8s-ca (신뢰할 수 있는 CA 가 서명)
✓ Subject: CN=guest (사용자 이름)
✓ Key Usage: Digital Signature, Key Encipherment
✓ Extended Key Usage: TLS Web Client Authentication
✓ 유효기간: 1 년
```

---

## 4 단계: 원격 클러스터 등록

### 클러스터 등록 명령어

```bash
# remote-k8s 클러스터를 kubeconfig 에 등록
[root@k8s-cp remote-k8s]# kubectl config set-cluster remote-k8s \
  --server=https://k8s-remote.example.com:6443 \
  --certificate-authority=ca.crt \
  --embed-certs

# 출력:
Cluster "remote-k8s" set.
```

### 옵션 설명

```
┌─────────────────────────────────────────────────────────────┐
│          kubectl config set-cluster 옵션                    │
└─────────────────────────────────────────────────────────────┘

--server=<URL>
  - 클러스터 API Server 엔드포인트
  - 예: https://k8s-remote.example.com:6443

--certificate-authority=<파일>
  - CA 인증서 파일 경로
  - 서버 인증서 검증용

--embed-certs
  - CA 인증서를 kubeconfig 에 임베드
  - 파일 경로 대신 데이터 직접 포함
  - kubeconfig 파일 이동 시 편리
```

### 등록된 클러스터 확인

```bash
# 등록된 클러스터 목록 확인
[root@k8s-cp remote-k8s]# kubectl config get-clusters

# 출력:
NAME
kubernetes
remote-k8s
  ↑
  └─ 새로 추가됨
```

---

## 5 단계: kubeconfig 파일 확인 (클러스터 등록 후)

### 전체 kubeconfig 확인

```bash
# kubeconfig 파일 내용 확인
[root@k8s-cp remote-k8s]# kubectl config view
```

### 출력 예시

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://k8s-remote.example.com:6443
  name: remote-k8s
  ↑
  └─ 새로 추가된 클러스터
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://172.31.1.10:6443
  name: kubernetes
  ↑
  └─ 기존 클러스터
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: DATA+OMITTED
    client-key-data: DATA+OMITTED
```

### 확인 사항

```
┌─────────────────────────────────────────────────────────────┐
│          클러스터 등록 후 확인                              │
└─────────────────────────────────────────────────────────────┘

✓ clusters 목록에 remote-k8s 추가됨
✓ server: https://k8s-remote.example.com:6443
✓ certificate-authority-data: DATA+OMITTED (보안으로 숨김)
✓ 기존 kubernetes 클러스터는 그대로 유지
```

---

## 6 단계: 사용자 Credential 등록

### 사용자 등록 명령어

```bash
# guest 사용자를 kubeconfig 에 등록
[root@k8s-cp remote-k8s]# kubectl config set-credentials remote-guest \
  --client-certificate=guest.crt \
  --client-key=guest.key

# 출력:
User "remote-guest" set.
```

### 옵션 설명

```
┌─────────────────────────────────────────────────────────────┐
│          kubectl config set-credentials 옵션                │
└─────────────────────────────────────────────────────────────┘

--client-certificate=<파일>
  - 클라이언트 인증서 파일
  - 사용자 신원 증명용

--client-key=<파일>
  - 클라이언트 개인키 파일
  - 인증서 서명용 (절대 공유 금지)

--embed-certs (선택)
  - 인증서/키를 kubeconfig 에 임베드
  - 파일 경로 대신 데이터 직접 포함
```

### 등록된 사용자 확인

```bash
# 등록된 사용자 목록 확인
[root@k8s-cp remote-k8s]# kubectl config get-users

# 출력:
NAME
remote-guest
  ↑
  └─ 새로 추가됨
kubernetes-admin
  ↑
  └─ 기존 사용자
```

---

## 7 단계: kubeconfig 파일 확인 (사용자 등록 후)

### 전체 kubeconfig 확인

```bash
# kubeconfig 파일 내용 확인
[root@k8s-cp remote-k8s]# kubectl config view
```

### 출력 예시

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://k8s-remote.example.com:6443
  name: remote-k8s
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://172.31.1.10:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: remote-guest
  user:
    client-certificate: /root/lab/auth/remote-k8s/guest.crt
    client-key: /root/lab/auth/remote-k8s/guest.key
    ↑
    └─ 파일 경로로 참조 (임베드 안 함)
- name: kubernetes-admin
  user:
    client-certificate-data: DATA+OMITTED
    client-key-data: DATA+OMITTED
```

### 확인 사항

```
┌─────────────────────────────────────────────────────────────┐
│          사용자 등록 후 확인                                │
└─────────────────────────────────────────────────────────────┘

✓ users 목록에 remote-guest 추가됨
✓ client-certificate: 파일 경로로 참조
✓ client-key: 파일 경로로 참조
✓ kubernetes-admin 은 데이터 임베드 (DATA+OMITTED)
```

---

## 8 단계: 컨텍스트 등록

### 컨텍스트 생성 명령어

```bash
# remote-guest-context 컨텍스트 생성
[root@k8s-cp remote-k8s]# kubectl config set-context remote-guest-context \
  --cluster=remote-k8s \
  --user=remote-guest \
  --namespace=guest-ns

# 출력:
Context "remote-guest-context" created.
```

### 옵션 설명

```
┌─────────────────────────────────────────────────────────────┐
│          kubectl config set-context 옵션                    │
└─────────────────────────────────────────────────────────────┘

--cluster=<클러스터이름>
  - 사용할 클러스터
  - 예: remote-k8s

--user=<사용자이름>
  - 사용할 사용자 credential
  - 예: remote-guest

--namespace=<네임스페이스>
  - 기본 네임스페이스
  - 예: guest-ns
  - 생략 시 default 네임스페이스 사용
```

### 컨텍스트 전환

```bash
# remote-guest-context 로 전환
[root@k8s-cp remote-k8s]# kubectl config use-context remote-guest-context

# 출력:
Switched to context "remote-guest-context".
```

### 등록된 컨텍스트 확인

```bash
# 컨텍스트 목록 확인
[root@k8s-cp remote-k8s]# kubectl config get-contexts

# 출력:
CURRENT   NAME                       CLUSTER       AUTHINFO       NAMESPACE
*         remote-guest-context       remote-k8s    remote-guest   guest-ns
          kubernetes-admin@kubernetes kubernetes   kubernetes-admin
          ↑
          └─ 현재 사용 중인 컨텍스트 (*)
```

---

## 9 단계: kubeconfig 파일 확인 (컨텍스트 등록 후)

### 전체 kubeconfig 확인

```bash
# kubeconfig 파일 내용 확인
[root@k8s-cp remote-k8s]# kubectl config view
```

### 출력 예시

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://k8s-remote.example.com:6443
  name: remote-k8s
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://172.31.1.10:6443
  name: kubernetes
contexts:
- context:
    cluster: remote-k8s
    namespace: guest-ns
    user: remote-guest
  name: remote-guest-context
  ↑
  └─ 새로 추가된 컨텍스트
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: remote-guest-context
  ↑
  └─ 현재 사용 중인 컨텍스트
kind: Config
preferences: {}
users:
- name: remote-guest
  user:
    client-certificate: /root/lab/auth/remote-k8s/guest.crt
    client-key: /root/lab/auth/remote-k8s/guest.key
- name: kubernetes-admin
  user:
    client-certificate-data: DATA+OMITTED
    client-key-data: DATA+OMITTED
```

### 확인 사항

```
┌─────────────────────────────────────────────────────────────┐
│          컨텍스트 등록 후 확인                              │
└─────────────────────────────────────────────────────────────┘

✓ contexts 목록에 remote-guest-context 추가됨
✓ cluster: remote-k8s
✓ user: remote-guest
✓ namespace: guest-ns
✓ current-context: remote-guest-context (현재 사용 중)
```

---

## 10 단계: 원격 클러스터 접속 테스트

### 리소스 조회

```bash
# remote-k8s 클러스터의 guest-ns 네임스페이스에서 리소스 조회
[root@k8s-cp remote-k8s]# kubectl get all

# 출력:
NAME                          READY   STATUS    RESTARTS   AGE
pod/nginx-77c7f8f4c-rcqvs     1/1     Running   0          2m4s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx     1/1     1            1           2m4s

NAME                                DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-77c7f8f4c     1         1         1       2m4s
```

### 확인 사항

```
┌─────────────────────────────────────────────────────────────┐
│          원격 클러스터 접속 테스트                          │
└─────────────────────────────────────────────────────────────┘

✓ guest-ns 네임스페이스의 리소스 조회 성공
✓ nginx Pod 실행 중
✓ nginx Deployment 실행 중
✓ guest 사용자는 guest-ns 네임스페이스만 접근 가능
```

### 다른 네임스페이스 접근 제한 테스트

```bash
# default 네임스페이스 접근 시도 (거부되어야 함)
[root@k8s-cp remote-k8s]# kubectl get pods -n default

# 출력:
Error from server (Forbidden): pods is forbidden: 
User "guest" cannot list resource "pods" in API group "" in the namespace "default"
          ↑
          └─ 접근 거부! 예상된 동작

# kube-system 네임스페이스 접근 시도 (거부되어야 함)
[root@k8s-cp remote-k8s]# kubectl get pods -n kube-system

# 출력:
Error from server (Forbidden): pods is forbidden: 
User "guest" cannot list resource "pods" in API group "" in the namespace "kube-system"
          ↑
          └─ 접근 거부! 예상된 동작
```

---

## 11 단계: kube-ps1 설치 (선택)

### kube-ps1 이란?

```
┌─────────────────────────────────────────────────────────────┐
│          kube-ps1                                           │
└─────────────────────────────────────────────────────────────┘

정의:
  - Kubernetes prompt for bash and zsh
  - GitHub: https://github.com/jonmosco/kube-ps1
  - 현재 Kubernetes 컨텍스트와 네임스페이스를 프롬프트에 표시

기능:
  ✓ 현재 컨텍스트 표시
  ✓ 현재 네임스페이스 표시
  ✓ 컨텍스트 전환 시 자동 업데이트
  ✓ 멀티 클러스터 환경에서 유용
```

### kube-ps1 설치

```bash
# kube-ps1 클론
[root@k8s-cp ~]# cd
[root@k8s-cp ~]# git clone https://github.com/jonmosco/kube-ps1.git

# 스크립트 복사
[root@k8s-cp ~]# cp kube-ps1/kube-ps1.sh /usr/local/bin/

# 쉘 설정에 추가
[root@k8s-cp ~]# echo "source /usr/local/bin/kube-ps1.sh" >> /etc/profile
[root@k8s-cp ~]# echo "PS1='[\u@\h:\w \$(kube_ps1)]\\$ '" >> /etc/profile

# 설정 적용
[root@k8s-cp ~]# source /etc/profile
```

### kube-ps1 프롬프트 예시

```
┌─────────────────────────────────────────────────────────────┐
│          kube-ps1 프롬프트 예시                             │
└─────────────────────────────────────────────────────────────┘

remote-guest-context 사용 중:
[root@k8s-cp kube-ps1 (⎈|remote-guest-context:guest-ns)]#
              ↑            ↑
              │            └─ 네임스페이스
              └─ 컨텍스트

kubernetes-admin 사용 중:
[root@k8s-cp:~ (⎈|kubernetes-admin@kubernetes:N/A)]#
              ↑            ↑
              │            └─ 네임스페이스 (N/A = default)
              └─ 컨텍스트

기호 설명:
⎈ - Kubernetes 헬름 (방향키)
```

### 컨텍스트 전환 테스트

```bash
# kubernetes-admin@kubernetes 로 전환
[root@k8s-cp:~ (⎈|remote-guest-context:guest-ns)]# kubectl config use-context kubernetes-admin@kubernetes

# 출력:
Switched to context "kubernetes-admin@kubernetes".

# 프롬프트 확인
[root@k8s-cp:~ (⎈|kubernetes-admin@kubernetes:N/A)]#
  ↑
  └─ 자동으로 업데이트됨!
```

---

## 12 단계: 멀티 사용자 환경에서 kube-ps1

### honggildong 계정 확인

```bash
# honggildong 계정으로 전환
[root@k8s-cp:~ (⎈|kubernetes-admin@kubernetes:N/A)]# su - honggildong

# 프롬프트 확인
[honggildong@k8s-cp:~ (⎈|honggildong-context:N/A)]$
  ↑
  └─ honggildong 의 컨텍스트 표시됨

# 종료
[honggildong@k8s-cp:~ (⎈|honggildong-context:N/A)]$ exit
```

### multiuser 계정 확인

```bash
# multiuser 계정으로 전환
[root@k8s-cp:~ (⎈|kubernetes-admin@kubernetes:N/A)]# su - multiuser

# 프롬프트 확인
[multiuser@k8s-cp:~ (⎈|tom-context:N/A)]$
  ↑
  └─ multiuser 의 컨텍스트 표시됨

# 종료
[multiuser@k8s-cp:~ (⎈|tom-context:N/A)]$ exit
```

### tester 계정 확인

```bash
# tester 계정으로 전환
[root@k8s-cp:~ (⎈|kubernetes-admin@kubernetes:N/A)]# su - tester

# 프롬프트 확인
[tester@k8s-cp:~ (⎈|tester-context:N/A)]$
  ↑
  └─ tester 의 컨텍스트 표시됨

# 종료
[tester@k8s-cp:~ (⎈|tester-context:N/A)]$ exit
```

### tom 계정 확인

```bash
# tom 계정으로 전환
[root@k8s-cp:~ (⎈|kubernetes-admin@kubernetes:N/A)]# su - tom

# 프롬프트 확인
[tom@k8s-cp:~ (⎈|tom-context:N/A)]$
  ↑
  └─ tom 의 컨텍스트 표시됨

# 종료
[tom@k8s-cp:~ (⎈|tom-context:N/A)]$ exit
```

---

## 13 단계: kube-ps1 활성/비활성 명령어

### 명령어 목록

```
┌─────────────────────────────────────────────────────────────┐
│          kube-ps1 활성/비활성 명령어                        │
└─────────────────────────────────────────────────────────────┘

kubeon
  - 이 쉘에서 kube-ps1 활성화
  - 글로벌 설정보다 우선

kubeon -g
  - kube-ps1 을 글로벌하게 활성화
  - 모든 쉘 세션에 적용

kubeoff
  - 이 쉘에서 kube-ps1 비활성화
  - 글로벌 설정보다 우선

kubeoff -g
  - kube-ps1 을 글로벌하게 비활성화
  - 모든 쉘 세션에 적용
```

### 사용 예시

```bash
# 현재 쉘에서 kube-ps1 비활성화
[root@k8s-cp ~]# kubeoff

# 프롬프트 확인 (kube-ps1 제거됨)
[root@k8s-cp ~]#

# 현재 쉘에서 kube-ps1 활성화
[root@k8s-cp ~]# kubeon

# 프롬프트 확인 (kube-ps1 추가됨)
[root@k8s-cp ~ (⎈|kubernetes-admin@kubernetes:N/A)]#
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    실습 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. 인증서 파일 확인                                        │
│     - ca.crt: Root CA 인증서                               │
│     - guest.crt: 클라이언트 인증서                         │
│     - guest.key: 클라이언트 개인키                         │
│                                                             │
│  2. 인증서 정보 확인                                        │
│     - openssl x509 -text -noout -in <파일>                 │
│     - Issuer, Subject, 유효기간 확인                       │
│                                                             │
│  3. 클러스터 등록                                           │
│     - kubectl config set-cluster remote-k8s                │
│     - --server, --certificate-authority, --embed-certs     │
│                                                             │
│  4. 사용자 등록                                             │
│     - kubectl config set-credentials remote-guest          │
│     - --client-certificate, --client-key                   │
│                                                             │
│  5. 컨텍스트 등록                                           │
│     - kubectl config set-context remote-guest-context      │
│     - --cluster, --user, --namespace                       │
│                                                             │
│  6. 컨텍스트 전환                                           │
│     - kubectl config use-context remote-guest-context      │
│                                                             │
│  7. 접속 테스트                                             │
│     - kubectl get all (guest-ns 네임스페이스)              │
│     - 다른 네임스페이스 접근 제한 확인                     │
│                                                             │
│  8. kube-ps1 설치 (선택)                                    │
│     - 프롬프트에 컨텍스트/네임스페이스 표시                │
│     - 멀티 클러스터 환경에서 유용                          │
└─────────────────────────────────────────────────────────────┘
```

### kubeconfig 최종 상태

```yaml
# 최종 kubeconfig 파일 구조
apiVersion: v1
clusters:
- name: remote-k8s              # 원격 클러스터
  cluster:
    server: https://k8s-remote.example.com:6443
- name: kubernetes              # 로컬 클러스터
  cluster:
    server: https://172.31.1.10:6443

users:
- name: remote-guest            # 원격 클러스터 사용자
  user:
    client-certificate: guest.crt
    client-key: guest.key
- name: kubernetes-admin        # 로컬 클러스터 사용자
  user:
    client-certificate-data: ...
    client-key-data: ...

contexts:
- name: remote-guest-context    # 원격 클러스터 컨텍스트
  context:
    cluster: remote-k8s
    user: remote-guest
    namespace: guest-ns
- name: kubernetes-admin@kubernetes  # 로컬 클러스터 컨텍스트
  context:
    cluster: kubernetes
    user: kubernetes-admin

current-context: remote-guest-context  # 현재 사용 중인 컨텍스트
```

### 멀티 클러스터 환경 장점

```
┌─────────────────────────────────────────────────────────────┐
│          멀티 클러스터 환경 장점                            │
└─────────────────────────────────────────────────────────────┘

✓ 하나의 kubeconfig 로 여러 클러스터 관리
✓ kubectl config use-context 로 빠른 전환
✓ 사용자별 네임스페이스 접근 제어
✓ kube-ps1 로 현재 상태 시각적 확인
✓ 실수 방지 (잘못된 클러스터에 작업 방지)
```

**멀티 클러스터 설정을 통해 여러 Kubernetes 클러스터를 효율적으로 관리할 수 있습니다. kube-ps1 을 사용하면 현재 컨텍스트와 네임스페이스를 항상 확인할 수 있어 실수를 방지할 수 있습니다.**
