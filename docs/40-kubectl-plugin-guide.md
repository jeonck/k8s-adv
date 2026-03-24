# kubectl plugin 개발 가이드

kubectl plugin 은 kubectl 명령어를 확장하는 방법입니다.

---

## kubectl plugin 이란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          kubectl plugin                                     │
└─────────────────────────────────────────────────────────────┘

정의:
  - kubectl 명령어를 확장하는 방법
  - 사용자 정의 명령어 추가
  - 공식 kubectl 명령어처럼 사용

예시:
  kubectl get pods        # 공식 명령어
  kubectl rook-ceph ...   # plugin 명령어
  kubectl oidc-login ...  # plugin 명령어
  kubectl ns ...          # plugin 명령어
```

### plugin 명령어 규칙

```
┌─────────────────────────────────────────────────────────────┐
│          plugin 명령어 규칙                                 │
└─────────────────────────────────────────────────────────────┘

명명 규칙:
  - 파일명: kubectl-<plugin-name>
  - 실행: kubectl <plugin-name>

예시:
  파일명: kubectl-ns
  실행: kubectl ns
  
  파일명: kubectl-pod-logs
  실행: kubectl pod-logs
  
  파일명: kubectl-oidc-login
  실행: kubectl oidc-login
```

---

## 1 단계: 가장 간단한 plugin (Bash)

### plugin 생성

```bash
#!/bin/bash
# 파일명: kubectl-hello
# 위치: /usr/local/bin/kubectl-hello
# 권한: chmod +x /usr/local/bin/kubectl-hello

echo "Hello from kubectl plugin!"
```

### plugin 설치

```bash
# 스크립트 생성
cat <<'EOF' > /usr/local/bin/kubectl-hello
#!/bin/bash
echo "Hello from kubectl plugin!"
EOF

# 실행 권한 부여
chmod +x /usr/local/bin/kubectl-hello

# plugin 목록 확인
kubectl plugin list

# 출력:
# The following compatible plugins are available:
# /usr/local/bin/kubectl-hello
```

### plugin 사용

```bash
# plugin 실행
kubectl hello

# 출력:
# Hello from kubectl plugin!
```

---

## 2 단계: kubectl 명령어와 연동 (Bash)

### 네임스페이스 전환 plugin

```bash
#!/bin/bash
# 파일명: kubectl-ns
# 기능: 네임스페이스를 전환하고 확인

# 인자 확인
if [ -z "$1" ]; then
    echo "현재 네임스페이스: $(kubectl config view --minify -o jsonpath='{..namespace}')"
    echo "사용법: kubectl ns <namespace>"
    exit 0
fi

# 네임스페이스 설정
NAMESPACE=$1
kubectl config set-context --current --namespace=$NAMESPACE

# 결과 확인
echo "네임스페이스를 '$NAMESPACE' 로 변경했습니다."
kubectl config view --minify -o jsonpath='{..namespace}'
echo ""
kubectl get pods
```

### 설치 및 사용

```bash
# 스크립트 생성
cat <<'EOF' > /usr/local/bin/kubectl-ns
#!/bin/bash
if [ -z "$1" ]; then
    echo "현재 네임스페이스: $(kubectl config view --minify -o jsonpath='{..namespace}')"
    echo "사용법: kubectl ns <namespace>"
    exit 0
fi
NAMESPACE=$1
kubectl config set-context --current --namespace=$NAMESPACE
echo "네임스페이스를 '$NAMESPACE' 로 변경했습니다."
kubectl config view --minify -o jsonpath='{..namespace}'
echo ""
kubectl get pods
EOF

# 실행 권한 부여
chmod +x /usr/local/bin/kubectl-ns

# 사용 예시:
# 현재 네임스페이스 확인
kubectl ns

# 네임스페이스 변경
kubectl ns kube-system

# 출력:
# 네임스페이스를 'kube-system' 로 변경했습니다.
# default
#
# NAME                            READY   STATUS    RESTARTS   AGE
# coredns-xxxxx                   1/1     Running   0          10d
# ...
```

---

## 3 단계: 인자 처리 (Bash)

### Pod 로그 조회 plugin

```bash
#!/bin/bash
# 파일명: kubectl-plog
# 기능: Pod 로그를 쉽게 조회

# 도움말
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    echo "사용법: kubectl plog <pod-name> [-n namespace] [-f]"
    echo ""
    echo "옵션:"
    echo "  -n, --namespace   네임스페이스 (기본값: default)"
    echo "  -f, --follow      로그 실시간 추적"
    echo "  -h, --help        도움말 표시"
    exit 0
fi

# 기본값
NAMESPACE="default"
FOLLOW=""
POD_NAME=""

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -f|--follow)
            FOLLOW="-f"
            shift
            ;;
        -*)
            echo "알 수 없는 옵션: $1"
            exit 1
            ;;
        *)
            POD_NAME="$1"
            shift
            ;;
    esac
done

# Pod 이름 확인
if [ -z "$POD_NAME" ]; then
    echo "Error: Pod 이름이 필요합니다."
    echo "사용법: kubectl plog <pod-name> [-n namespace] [-f]"
    exit 1
fi

# 로그 조회
echo "=== Pod: $POD_NAME, Namespace: $NAMESPACE ==="
kubectl logs $POD_NAME -n $NAMESPACE $FOLLOW
```

### 사용 예시

```bash
# 설치
cat <<'EOF' > /usr/local/bin/kubectl-plog
#!/bin/bash
# (위 스크립트 내용)
EOF
chmod +x /usr/local/bin/kubectl-plog

# 사용 예시:
# 기본 로그 조회
kubectl plog nginx-pod

# 네임스페이스 지정
kubectl plog nginx-pod -n kube-system

# 실시간 로그 추적
kubectl plog nginx-pod -f

# 네임스페이스 + 실시간
kubectl plog nginx-pod -n kube-system -f

# 도움말
kubectl plog --help
```

---

## 4 단계: JSON 출력 처리 (Bash + jq)

### Pod 정보 요약 plugin

```bash
#!/bin/bash
# 파일명: kubectl-podinfo
# 기능: Pod 정보를 요약하여 표시

# jq 설치 확인
if ! command -v jq &> /dev/null; then
    echo "Error: jq 가 설치되어 있지 않습니다."
    echo "설치: sudo apt-get install jq (Ubuntu)"
    echo "      brew install jq (Mac)"
    exit 1
fi

# 인자 확인
if [ -z "$1" ]; then
    echo "사용법: kubectl podinfo <pod-name> [-n namespace]"
    exit 1
fi

POD_NAME=$1
NAMESPACE="default"

# 네임스페이스 옵션 처리
if [ "$2" == "-n" ]; then
    NAMESPACE=$3
fi

# Pod 정보 조회
POD_INFO=$(kubectl get pod $POD_NAME -n $NAMESPACE -o json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Pod '$POD_NAME' 을 (를) 찾을 수 없습니다."
    exit 1
fi

# 정보 추출
echo "=== Pod Information ==="
echo ""
echo "Name:         $(echo $POD_INFO | jq -r '.metadata.name')"
echo "Namespace:    $(echo $POD_INFO | jq -r '.metadata.namespace')"
echo "Status:       $(echo $POD_INFO | jq -r '.status.phase')"
echo "Node:         $(echo $POD_INFO | jq -r '.spec.nodeName')"
echo "Start Time:   $(echo $POD_INFO | jq -r '.status.startTime')"
echo ""
echo "Containers:"
echo $POD_INFO | jq -r '.spec.containers[] | "  - \(.name): \(.image)"'
echo ""
echo "Conditions:"
echo $POD_INFO | jq -r '.status.conditions[] | "  - \(.type): \(.status)"'
```

### 사용 예시

```bash
# 설치 (jq 필요)
# Mac: brew install jq
# Ubuntu: sudo apt-get install jq

cat <<'EOF' > /usr/local/bin/kubectl-podinfo
#!/bin/bash
# (위 스크립트 내용)
EOF
chmod +x /usr/local/bin/kubectl-podinfo

# 사용 예시:
kubectl podinfo nginx-pod

# 출력:
# === Pod Information ===
#
# Name:         nginx-pod
# Namespace:    default
# Status:       Running
# Node:         k8s-w1
# Start Time:   2024-01-15T10:00:00Z
#
# Containers:
#   - nginx: nginx:1.25
#
# Conditions:
#   - Initialized: True
#   - Ready: True
#   - ContainersReady: True
#   - PodScheduled: True
```

---

## 5 단계: Python plugin

### Python plugin 예시

```python
#!/usr/bin/env python3
# 파일명: kubectl-podstatus
# 기능: Pod 상태를 표로 표시

import subprocess
import json
import sys

def get_pods(namespace="default"):
    """kubectl 로 Pod 정보 가져오기"""
    cmd = ["kubectl", "get", "pods", "-n", namespace, "-o", "json"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    
    return json.loads(result.stdout)

def print_pod_table(pods_data):
    """Pod 정보를 표로 출력"""
    items = pods_data.get('items', [])
    
    if not items:
        print("No pods found.")
        return
    
    # 헤더
    print(f"{'NAME':<30} {'STATUS':<10} {'RESTARTS':<10} {'AGE':<10}")
    print("-" * 60)
    
    # Pod 정보 출력
    for pod in items:
        name = pod['metadata']['name']
        status = pod['status']['phase']
        restarts = sum(c.get('restartCount', 0) for c in pod['status'].get('containerStatuses', []))
        age = pod['metadata']['creationTimestamp']
        
        print(f"{name:<30} {status:<10} {restarts:<10} {age:<10}")

def main():
    # 인자 처리
    namespace = "default"
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "-n" and len(sys.argv) > 2:
            namespace = sys.argv[2]
    
    # Pod 정보 가져오기
    pods_data = get_pods(namespace)
    
    # 표 출력
    print(f"=== Pods in namespace: {namespace} ===\n")
    print_pod_table(pods_data)

if __name__ == "__main__":
    main()
```

### 설치 및 사용

```bash
# Python 스크립트 생성
cat <<'EOF' > /usr/local/bin/kubectl-podstatus
#!/usr/bin/env python3
# (위 스크립트 내용)
EOF

# 실행 권한 부여
chmod +x /usr/local/bin/kubectl-podstatus

# 사용 예시:
kubectl podstatus

# 출력:
# === Pods in namespace: default ===
#
# NAME                           STATUS     RESTARTS   AGE
# nginx-pod                      Running    0          2024-01-15T10:00:00Z
# redis-pod                      Running    2          2024-01-14T10:00:00Z

# 네임스페이스 지정
kubectl podstatus -n kube-system
```

---

## 6 단계: Go plugin (고급)

### Go plugin 예시

```go
// 파일명: kubectl-count
// 기능: 리소스 개수 세기

package main

import (
    "encoding/json"
    "fmt"
    "os"
    "os/exec"
)

type ResourceList struct {
    Items []map[string]interface{} `json:"items"`
}

func main() {
    if len(os.Args) < 2 {
        fmt.Println("Usage: kubectl count <resource-type> [-n namespace]")
        os.Exit(1)
    }
    
    resource := os.Args[1]
    namespace := "default"
    
    // 네임스페이스 옵션 처리
    for i := 2; i < len(os.Args); i++ {
        if os.Args[i] == "-n" && i+1 < len(os.Args) {
            namespace = os.Args[i+1]
        }
    }
    
    // kubectl 실행
    cmd := exec.Command("kubectl", "get", resource, "-n", namespace, "-o", "json")
    output, err := cmd.Output()
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        os.Exit(1)
    }
    
    // JSON 파싱
    var resources ResourceList
    if err := json.Unmarshal(output, &resources); err != nil {
        fmt.Printf("Error parsing JSON: %v\n", err)
        os.Exit(1)
    }
    
    // 결과 출력
    fmt.Printf("Namespace: %s\n", namespace)
    fmt.Printf("Resource:  %s\n", resource)
    fmt.Printf("Count:     %d\n", len(resources.Items))
}
```

### 컴파일 및 설치

```bash
# Go 코드 컴파일
go build -o kubectl-count kubectl-count.go

# 설치
sudo mv kubectl-count /usr/local/bin/
sudo chmod +x /usr/local/bin/kubectl-count

# 사용 예시:
kubectl count pods

# 출력:
# Namespace: default
# Resource:  pods
# Count:     5

kubectl count deployments -n kube-system

# 출력:
# Namespace: kube-system
# Resource:  deployments
# Count:     2
```

---

## plugin 관리

### plugin 목록 확인

```bash
# 설치된 plugin 목록
kubectl plugin list

# 출력:
# The following compatible plugins are available:
# /usr/local/bin/kubectl-hello
# /usr/local/bin/kubectl-ns
# /usr/local/bin/kubectl-plog
# /usr/local/bin/kubectl-podinfo
# /usr/local/bin/kubectl-podstatus
# /usr/local/bin/kubectl-count
```

### plugin 경로 확인

```bash
# plugin 이 검색되는 경로
kubectl plugin list --short

# plugin 이 검색되는 디렉토리:
# - /usr/local/bin
# - ~/bin
# - $PATH 의 모든 디렉토리
```

### plugin 제거

```bash
# plugin 삭제
sudo rm /usr/local/bin/kubectl-hello

# 삭제 확인
kubectl plugin list
```

---

## 인기 kubectl plugin 모음

### 추천 plugin

```
┌─────────────────────────────────────────────────────────────┐
│          인기 kubectl plugin                                │
└─────────────────────────────────────────────────────────────┘

1. kubectl-ns
   - 네임스페이스 전환
   - 설치: krew install ns
   - 사용: kubectl ns kube-system

2. kubectl-oidc-login
   - OIDC 인증으로 로그인
   - 설치: krew install oidc-login
   - 사용: kubectl oidc-login

3. kubectl-tree
   - 리소스 계층 구조 표시
   - 설치: krew install tree
   - 사용: kubectl tree deployment/my-app

4. kubectl-who-can
   - 권한 분석
   - 설치: krew install who-can
   - 사용: kubectl who-can get pods

5. kubectl-debug
   - Pod 디버깅
   - 설치: krew install debug
   - 사용: kubectl debug pod/my-pod

6. kubectl-rook-ceph
   - Rook Ceph 관리
   - 설치: krew install rook-ceph
   - 사용: kubectl rook-ceph health
```

### Krew (kubectl plugin 관리자)

```bash
# Krew 설치 (Mac)
curl -LO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-darwin_amd64.tar.gz
tar zxvf krew-darwin_amd64.tar.gz
./krew-darwin_amd64 install krew

# Krew 설치 (Linux)
curl -LO https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-linux_amd64.tar.gz
tar zxvf krew-linux_amd64.tar.gz
./krew-linux_amd64 install krew

# plugin 설치
kubectl krew install ns
kubectl krew install oidc-login
kubectl krew install tree

# plugin 업데이트
kubectl krew upgrade

# 설치된 plugin 목록
kubectl krew info
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    kubectl plugin 요약                      │
├─────────────────────────────────────────────────────────────┤
│  1. plugin 규칙                                             │
│     - 파일명: kubectl-<plugin-name>                         │
│     - 실행: kubectl <plugin-name>                           │
│     - 위치: $PATH 어딘가                                   │
│     - 권한: 실행 가능 (chmod +x)                            │
│                                                             │
│  2. 간단한 Bash plugin                                      │
│     - kubectl-hello: 인사하기                              │
│     - kubectl-ns: 네임스페이스 전환                        │
│     - kubectl-plog: Pod 로그 조회                          │
│                                                             │
│  3. 고급 plugin                                             │
│     - kubectl-podinfo: JSON 처리 (jq 사용)                 │
│     - kubectl-podstatus: Python plugin                     │
│     - kubectl-count: Go plugin                             │
│                                                             │
│  4. plugin 관리                                             │
│     - 목록: kubectl plugin list                            │
│     - 설치: 파일 복사 + chmod +x                           │
│     - 제거: 파일 삭제                                      │
│                                                             │
│  5. Krew 사용                                               │
│     - plugin 관리자                                        │
│     - 쉬운 설치/업데이트                                   │
│     - 추천 plugin: ns, oidc-login, tree                    │
└─────────────────────────────────────────────────────────────┘
```

### plugin 개발 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          plugin 개발 체크리스트                             │
└─────────────────────────────────────────────────────────────┘

□ 파일명: kubectl-<이름> 형식인가?
□ 위치: $PATH 에 있는 디렉토리인가?
□ 권한: 실행 가능 (chmod +x) 한가?
□ 도움말: -h, --help 옵션이 있는가?
□ 오류 처리: 인자 없을 때 사용법 표시하는가?
□ kubectl 연동: kubectl 명령어를 사용하는가?
□ 테스트: 실제 실행이 되는가?
□ 문서화: 사용법이 명확한가?
```

**kubectl plugin 은 kubectl 명령어를 쉽게 확장할 수 있는 방법입니다. Bash, Python, Go 등 어떤 언어로도 개발할 수 있으며, $PATH 에만 있으면 자동으로 인식됩니다.**
