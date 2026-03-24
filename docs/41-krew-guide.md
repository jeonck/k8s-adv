# Krew: kubectl plugin 관리자

Krew 는 kubectl plugin 을 쉽게 설치하고 관리할 수 있는 패키지 관리자입니다.

---

## Krew 란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          Krew 란?                                           │
└─────────────────────────────────────────────────────────────┘

정의:
  - kubectl plugin 패키지 관리자
  - apt, yum, brew 와 유사
  - Kubernetes 공식 프로젝트 (sigs.k8s.io)

목적:
  - plugin 검색 및 설치 간편화
  - 버전 관리 자동화
  - plugin 업데이트 용이
  - 의존성 자동 해결

비유:
  ┌─────────────────────────────────────────┐
  │  apt/yum/brew for kubectl plugins       │
  │                                         │
  │  - apt install nginx                   │
  │  - krew install ns                     │
  │                                         │
  │  같은 개념!                            │
  └─────────────────────────────────────────┘
```

### Krew 를 사용해야 하는 이유

```
┌─────────────────────────────────────────────────────────────┐
│          Krew 사용 이유                                     │
└─────────────────────────────────────────────────────────────┘

Krew 없이 plugin 설치:
  1. GitHub 에서 소스 찾기
  2. 릴리스 페이지 이동
  3. OS 에 맞는 바이너리 다운로드
  4. 압축 해제
  5. $PATH 에 복사
  6. chmod +x
  7. 수동으로 업데이트 확인
  → 매우 번거로움!

Krew 사용 시:
  1. krew install ns
  → 끝!
  
  업데이트도:
  krew upgrade
  → 자동으로 모든 plugin 업데이트!
```

---

## 1 단계: Krew 설치

### macOS 설치

```bash
# Intel Mac
curl -LO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-darwin_amd64.tar.gz
tar zxvf krew-darwin_amd64.tar.gz

# Apple Silicon (M1/M2/M3)
curl -LO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-darwin_arm64.tar.gz
tar zxvf krew-darwin_arm64.tar.gz

# 설치
./krew-darwin_amd64 install krew

# 또는 ./krew-darwin_arm64 install krew

# 환경 변수 추가 (~/.zshrc 또는 ~/.bash_profile)
echo 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 확인
kubectl krew version
```

### Linux 설치

```bash
# Linux x86_64
curl -LO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-linux_amd64.tar.gz
tar zxvf krew-linux_amd64.tar.gz

# Linux ARM64
curl -LO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-linux_arm64.tar.gz
tar zxvf krew-linux_arm64.tar.gz

# 설치
./krew-linux_amd64 install krew

# 환경 변수 추가 (~/.bashrc)
echo 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 확인
kubectl krew version
```

### Windows 설치

```powershell
# PowerShell
$URL = "https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-windows_amd64.tar.gz"
Invoke-WebRequest -Uri $URL -OutFile krew.tar.gz
tar -xzf krew.tar.gz
.\krew-windows_amd64 install krew

# 환경 변수 추가
$env:Path += ";$HOME\.krew\bin"

# 확인
kubectl krew version
```

### 설치 확인

```bash
# Krew 버전 확인
kubectl krew version

# 출력 예시:
# OPTION            VALUE
# GitTag            v0.4.4
# GitCommit         1234567
# GoVersion         go1.21.0
# OS                darwin
# Arch              amd64

# Krew 도움말
kubectl krew --help
```

---

## 2 단계: 기본 사용법

### plugin 검색

```bash
# 모든 plugin 목록
kubectl krew search

# 특정 plugin 검색
kubectl krew search ns

# 출력 예시:
# NAME             DESCRIPTION                                            INSTALLED
# ns               Switch between Kubernetes namespaces smoothly        ✓
# ctx              Switch between contexts in your kubeconfig           ✓
# tree             Show a tree of resources owned by an object
```

### plugin 설치

```bash
# plugin 설치
kubectl krew install ns

# 출력 예시:
# Adding "default" plugin index from https://github.com/kubernetes-sigs/krew-index.git
# Installed plugin: ns
#   To use this plugin, type:
#     kubectl ns <namespace>

# 여러 개 동시 설치
kubectl krew install ns ctx who-can tree

# 설치 확인
kubectl plugin list
```

### plugin 사용

```bash
# 설치된 plugin 사용
kubectl ns kube-system

# 출력:
# namespace changed to "kube-system"

# 다른 plugin
kubectl ctx docker-desktop
kubectl tree deployment/nginx
```

### plugin 업데이트

```bash
# Krew 자체 업데이트
kubectl krew upgrade

# 특정 plugin 업데이트
kubectl krew upgrade ns

# 모든 plugin 업데이트
kubectl krew upgrade

# 출력 예시:
# Upgrading plugin: ns
# Upgraded plugin: ns
```

### plugin 제거

```bash
# plugin 제거
kubectl krew uninstall ns

# 확인
kubectl plugin list
```

---

## 3 단계: plugin 정보 확인

### plugin 상세 정보

```bash
# plugin 정보 확인
kubectl krew info ns

# 출력 예시:
# NAME: ns
# DESCRIPTION: Switch between Kubernetes namespaces smoothly
# VERSION: v1.1.0
# HOMEPAGE: https://github.com/ahmetb/kubectl-ns
# CAVEATS:
# \
#  | This plugin is a simple namespace switcher.
#  | It modifies your current context's namespace.
# /
# INSTALLED:
#  * default
```

### 설치된 plugin 목록

```bash
# 설치된 plugin 목록
kubectl krew info

# 또는
kubectl krew list

# 출력 예시:
# PLUGIN                            VERSION
# ctx                               v0.9.0
# ns                                v1.1.0
# oidc-login                        v1.30.0
# tree                              v0.9.0
# who-can                           v0.4.0
```

### plugin 인덱스 관리

```bash
# 인덱스 목록
kubectl krew index list

# 인덱스 추가
kubectl krew index add custom https://github.com/myorg/custom-index.git

# 인덱스 제거
kubectl krew index remove custom

# 인덱스 업데이트
kubectl krew index update
```

---

## 4 단계: 추천 plugin 모음

### 필수 plugin Top 10

```
┌─────────────────────────────────────────────────────────────┐
│          추천 kubectl plugin Top 10                         │
└─────────────────────────────────────────────────────────────┘

1. ns (namespace)
   krew install ns
   사용: kubectl ns kube-system
   설명: 네임스페이스 전환

2. ctx (context)
   krew install ctx
   사용: kubectl ctx docker-desktop
   설명: 컨텍스트 전환

3. oidc-login
   krew install oidc-login
   사용: kubectl oidc-login
   설명: OIDC 으로 로그인

4. tree
   krew install tree
   사용: kubectl tree deployment/nginx
   설명: 리소스 계층 구조 표시

5. who-can
   krew install who-can
   사용: kubectl who-can get pods
   설명: 권한 분석

6. debug
   krew install debug
   사용: kubectl debug pod/my-pod
   설명: Pod 디버깅

7. view-secret
   krew install view-secret
   사용: kubectl view-secret my-secret
   설명: Secret 디코딩

8. neat
   krew install neat
   사용: kubectl neat pod my-pod
   설명: YAML 정리

9. pv-mounter
   krew install pv-mounter
   사용: kubectl pv-mounter my-pv
   설명: PV 마운트

10. cost
    krew install cost
    사용: kubectl cost node
    설명: 리소스 비용 분석
```

### 보안 관련 plugin

```
┌─────────────────────────────────────────────────────────────┐
│          보안 관련 plugin                                   │
└─────────────────────────────────────────────────────────────┘

1. rbac-lookup
   krew install rbac-lookup
   사용: kubectl rbac-lookup
   설명: RBAC 권한 조회

2. view-audit-secret
   krew install view-audit-secret
   사용: kubectl view-audit-secret
   설명: 감사 로그 확인

3. modify-annotations
   krew install modify-annotations
   사용: kubectl modify-annotations
   설명: 어노테이션 수정

4. access-matrix
   krew install access-matrix
   사용: kubectl access-matrix
   설명: 접근 권한 매트릭스
```

### 모니터링 관련 plugin

```
┌─────────────────────────────────────────────────────────────┐
│          모니터링 관련 plugin                               │
└─────────────────────────────────────────────────────────────┘

1. top
   (기본 포함)
   사용: kubectl top pods
   설명: 리소스 사용량

2. prometheus
   krew install prometheus
   사용: kubectl prometheus
   설명: Prometheus 쿼리

3. grafana
   krew install grafana
   사용: kubectl grafana
   설명: Grafana 대시보드

4. node-problem-detector
   krew install node-problem-detector
   사용: kubectl node-problem-detector
   설명: 노드 문제 감지
```

---

## 5 단계: plugin 개발 및 배포

### plugin 구조

```
┌─────────────────────────────────────────────────────────────┐
│          plugin 디렉토리 구조                               │
└─────────────────────────────────────────────────────────────┘

my-plugin/
├── README.md              # plugin 설명
├── krew.yaml              # Krew 매니페스트
├── bin/
│   ├── kubectl-my-plugin  # Linux 바이너리
│   ├── kubectl-my-plugin.exe  # Windows 바이너리
│   └── kubectl-my-plugin-darwin  # macOS 바이너리
└── assets/
    └── ...                # 추가 파일
```

### krew.yaml 예시

```yaml
# krew.yaml
apiVersion: krew.googlecontainertools.github.com/v1alpha2
kind: Plugin
metadata:
  name: my-plugin
spec:
  version: {{ .TagName }}
  homepage: https://github.com/myorg/kubectl-my-plugin
  platforms:
  - selector:
      matchLabels:
        os: darwin
        arch: amd64
    uri: https://github.com/myorg/kubectl-my-plugin/releases/download/{{ .TagName }}/kubectl-my-plugin-darwin-amd64.tar.gz
    sha256: ""
    bin: kubectl-my-plugin
  - selector:
      matchLabels:
        os: linux
        arch: amd64
    uri: https://github.com/myorg/kubectl-my-plugin/releases/download/{{ .TagName }}/kubectl-my-plugin-linux-amd64.tar.gz
    sha256: ""
    bin: kubectl-my-plugin
  shortDescription: My custom kubectl plugin
  description: |
    This is a custom kubectl plugin that does something useful.
    It can be used for various purposes.
```

### plugin 배포

```bash
# 1. GitHub 릴리스 생성
# 2. krew.yaml 작성
# 3. krew-index 에 PR 제출
# 4. 리뷰 승인 후 인덱스에 추가

# 로컬 테스트
kubectl krew install --manifest=krew.yaml --archive=plugin.tar.gz
```

---

## 6 단계: Krew 관리

### Krew 업데이트

```bash
# Krew 자체 업데이트
kubectl krew upgrade

# 출력:
# Upgrading krew...
# Krew has been upgraded to version v0.4.4
```

### Krew 재설치

```bash
# Krew 재설치
kubectl krew upgrade

# 또는 수동 재설치
rm -rf ~/.krew
# (설치 단계 다시 수행)
```

### Krew 설정

```bash
# Krew 설정 확인
kubectl krew info

# Krew 캐시 정리
kubectl krew cache clean

# Krew 버전 확인
kubectl krew version
```

---

## 문제 해결

### 일반적인 오류

```
┌─────────────────────────────────────────────────────────────┐
│          일반적인 오류 및 해결                              │
└─────────────────────────────────────────────────────────────┘

오류 1: "plugin not found"
해결:
  - plugin 이름 확인
  - krew search 로 검색
  - 인덱스 업데이트: krew index update

오류 2: "permission denied"
해결:
  - $PATH 확인
  - KREW_ROOT 환경 변수 확인
  - sudo 없이 설치

오류 3: "plugin already installed"
해결:
  - 이미 설치됨: krew list 로 확인
  - 업데이트: krew upgrade <plugin>
  - 재설치: krew uninstall <plugin> && krew install <plugin>

오류 4: "checksum mismatch"
해결:
  - 네트워크 문제: 다시 시도
  - 캐시 정리: krew cache clean
  - 수동 다운로드 확인
```

### 디버그 모드

```bash
# 상세 로그로 실행
KREW_VERBOSE=1 krew install ns

# 출력:
# I0101 00:00:00.000000   12345 installation.go:100] Installing plugin ns...
# I0101 00:00:00.000000   12345 download.go:50] Downloading from https://...
# I0101 00:00:00.000000   12345 install.go:80] Installing...
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    Krew 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Krew 란?                                                │
│     - kubectl plugin 패키지 관리자                          │
│     - apt/yum/brew 와 유사                                  │
│     - Kubernetes 공식 프로젝트                              │
│                                                             │
│  2. 설치                                                    │
│     - macOS: krew-darwin_amd64.tar.gz                      │
│     - Linux: krew-linux_amd64.tar.gz                       │
│     - Windows: krew-windows_amd64.tar.gz                   │
│     - PATH 에 추가 필요                                     │
│                                                             │
│  3. 기본 사용법                                             │
│     - 검색: krew search                                    │
│     - 설치: krew install <plugin>                          │
│     - 업데이트: krew upgrade                               │
│     - 제거: krew uninstall <plugin>                        │
│                                                             │
│  4. 추천 plugin                                             │
│     - ns: 네임스페이스 전환                                 │
│     - ctx: 컨텍스트 전환                                    │
│     - oidc-login: OIDC 로그인                               │
│     - tree: 리소스 계층 구조                                │
│     - who-can: 권한 분석                                    │
│                                                             │
│  5. plugin 개발                                             │
│     - krew.yaml 작성                                       │
│     - GitHub 릴리스                                         │
│     - krew-index 에 PR                                     │
│                                                             │
│  6. 관리                                                    │
│     - 목록: krew list                                      │
│     - 정보: krew info <plugin>                             │
│     - 업데이트: krew upgrade                               │
│     - 캐시 정리: krew cache clean                          │
└─────────────────────────────────────────────────────────────┘
```

### Krew 명령어 치트시트

```
┌─────────────────────────────────────────────────────────────┐
│          Krew 명령어 치트시트                               │
└─────────────────────────────────────────────────────────────┘

설치/제거:
  krew install <plugin>           # plugin 설치
  krew uninstall <plugin>         # plugin 제거
  krew upgrade                    # 모든 plugin 업데이트
  krew upgrade <plugin>           # 특정 plugin 업데이트

검색/조회:
  krew search                     # 모든 plugin 검색
  krew search <keyword>           # 키워드로 검색
  krew list                       # 설치된 plugin 목록
  krew info <plugin>              # plugin 상세 정보

인덱스 관리:
  krew index list                 # 인덱스 목록
  krew index add <name> <URL>     # 인덱스 추가
  krew index remove <name>        # 인덱스 제거
  krew index update               # 인덱스 업데이트

기타:
  krew version                    # 버전 확인
  krew cache clean                # 캐시 정리
  krew help                       # 도움말
```

### Krew vs 수동 설치 비교

```
┌─────────────────────────────────────────────────────────────┐
│          Krew vs 수동 설치                                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────────────────────┐
│  Krew            │  수동 설치                              │
├──────────────────┼──────────────────────────────────────────┤
│  설치: 1 초      │  설치: 5 분                             │
│  krew install ns │  GitHub → Download → Extract → Copy     │
├──────────────────┼──────────────────────────────────────────┤
│  업데이트: 자동  │  업데이트: 수동 확인                     │
│  krew upgrade    │  매번 GitHub 확인 필요                   │
├──────────────────┼──────────────────────────────────────────┤
│  제거: 간단      │  제거: 파일 찾아서 삭제                  │
│  krew uninstall  │  어디에 설치했는지 기억 필요             │
├──────────────────┼──────────────────────────────────────────┤
│  검색: 가능      │  검색: GitHub 에서 직접                  │
│  krew search     │  수동 검색                               │
├──────────────────┼──────────────────────────────────────────┤
│  의존성: 자동    │  의존성: 수동 해결                       │
│  해결            │  직접 확인                               │
└──────────────────┴──────────────────────────────────────────┘

결론: Krew 사용이 훨씬 편리합니다!
```

**Krew 는 kubectl plugin 을 쉽게 설치하고 관리할 수 있는 공식 패키지 관리자입니다. plugin 검색, 설치, 업데이트, 제거를 한 줄 명령어로 처리할 수 있으므로 반드시 사용해야 합니다.**
