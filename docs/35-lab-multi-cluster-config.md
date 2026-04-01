# 멀티 클러스터 접속 설정 실습

하나의 `kubectl` 도구로 여러 개의 독립적인 Kubernetes 클러스터를 관리하고 전환하는 방법을 실습합니다.

---

## 실습 개요

본 실습에서는 로컬 클러스터(`local-k8s`)와 원격 클러스터(`remote-k8s`)를 하나의 `kubeconfig` 파일에 등록하여 사용하는 과정을 다룹니다.

| 항목 | 로컬 클러스터 (Local) | 원격 클러스터 (Remote) |
|------|-----------------------|------------------------|
| **클러스터 이름** | `kubernetes` | `remote-k8s` |
| **API 서버 주소** | `https://172.31.1.10:6443` | `https://remote.example.com:6443` |
| **사용자** | `kubernetes-admin` | `guest-user` |
| **네임스페이스** | `default` | `guest-ns` |

---

## 멀티 클러스터 접속 아키텍처

`kubeconfig` 파일은 여러 개의 **Cluster**, **User**, **Context** 정보를 담고 있으며, Context를 전환함으로써 대상 클러스터를 바꿀 수 있습니다.

<div class="mermaid">
graph TD
    KC[~/.kube/config]
    KC --> C1[Cluster: local-k8s]
    KC --> C2[Cluster: remote-k8s]
    KC --> U1[User: admin]
    KC --> U2[User: guest]
    
    KC --> CTX1[Context: local-admin]
    KC --> CTX2[Context: remote-guest]
    
    CTX1 --> C1
    CTX1 --> U1
    CTX2 --> C2
    CTX2 --> U2
</div>

---

## 1단계: 원격 클러스터 정보 등록

가장 먼저 원격 클러스터의 API 서버 주소와 이를 검증할 Root CA 인증서를 등록합니다.

```bash
# 원격 클러스터 등록
kubectl config set-cluster remote-k8s \
  --server=https://remote.example.com:6443 \
  --certificate-authority=remote-ca.crt \
  --embed-certs=true
```

---

## 2단계: 사용자 인증 정보 등록

원격 클러스터에 접속할 때 사용할 사용자의 인증서와 개인키를 등록합니다.

```bash
# 원격 사용자 등록
kubectl config set-credentials guest-user \
  --client-certificate=guest.crt \
  --client-key=guest.key \
  --embed-certs=true
```

---

## 3단계: 컨텍스트(Context) 생성 및 전환

클러스터와 사용자를 연결하는 '컨텍스트'를 생성하고, 이를 활성화하여 실제 접속 대상을 변경합니다.

```bash
# 1. 컨텍스트 생성 (클러스터 + 사용자 + 기본 네임스페이스)
kubectl config set-context remote-context \
  --cluster=remote-k8s \
  --user=guest-user \
  --namespace=guest-ns

# 2. 컨텍스트 전환 (원격 클러스터로 접속 대상 변경)
kubectl config use-context remote-context

# 3. 현재 접속 정보 확인
kubectl config current-context
kubectl get pods
```

---

## 주요 팁

- **설정 확인:** `kubectl config view` 명령어로 현재 `kubeconfig`에 등록된 모든 정보를 확인할 수 있습니다.
- **빠른 전환:** `kubectx`나 `kubens`와 같은 오픈소스 도구를 사용하면 명령줄에서 훨씬 더 빠르게 클러스터와 네임스페이스를 전환할 수 있습니다.
- **보안 주의:** `kubeconfig` 파일에는 개인키 정보가 포함될 수 있으므로(embed-certs 사용 시), 파일 권한을 `600`으로 엄격히 제한해야 합니다.

**멀티 클러스터 설정을 마스터하면 개발, 스테이징, 운영 등 여러 환경의 Kubernetes 클러스터를 하나의 터미널에서 효율적으로 관리할 수 있습니다.**
