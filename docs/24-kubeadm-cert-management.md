# kubeadm init 인증서 생성 실습

`kubeadm init` 명령어 실행 시 생성되는 인증서들을 상세히 분석합니다.

---

## kubeadm init 옵션 상세 분석

클러스터를 초기화할 때 사용하는 주요 옵션들이 인증서 생성에 어떤 영향을 미치는지 알아봅니다.

| 옵션명 | 설명 | 인증서 영향 |
|--------|------|-------------|
| `--kubernetes-version` | 설치할 Kubernetes 버전 지정 | 해당 버전 규격에 맞는 인증서 생성 |
| `--apiserver-advertise-address` | API Server가 통신에 사용할 IP 주소 | **인증서 SAN 필드에 해당 IP 추가** |
| `--apiserver-cert-extra-sans` | 추가로 등록할 도메인 또는 IP | **인증서 SAN 필드에 사용자 정의 주소 추가** |
| `--cri-socket` | 컨테이너 런타임 소켓 경로 지정 | (직접적인 인증서 영향 없음) |

---

## 인증서 생성 단계별 분석

`kubeadm init` 실행 시 출력되는 로그를 통해 인증서 생성 과정을 추적할 수 있습니다.

### 1. CA (Certificate Authority) 생성
가장 먼저 클러스터의 신뢰 기점이 되는 Root CA를 생성합니다.

```text
[certs] Generating "ca" certificate and key
```

- **생성 파일:** `/etc/kubernetes/pki/ca.crt`, `ca.key`
- **유효 기간:** 보통 10년
- **특징:** 자기 서명(Self-Signed) 인증서이며, 이후 생성되는 모든 인증서의 부모가 됩니다.

### 2. API Server 인증서 발급
생성된 CA를 사용하여 API 서버용 인증서를 발급합니다.

```text
[certs] Generating "apiserver" certificate and key
```

- **생성 파일:** `/etc/kubernetes/pki/apiserver.crt`, `apiserver.key`
- **유효 기간:** 1년
- **중요 포인트:** `--apiserver-cert-extra-sans` 옵션으로 준 값들이 이 인증서의 **Subject Alternative Name(SAN)** 필드에 포함됩니다.

### 3. 기타 컴포넌트 인증서
그 외 컨트롤 플레인 컴포넌트 및 에코시스템을 위한 인증서들이 차례로 생성됩니다.

<div class="mermaid">
graph TD
    CA[Root CA 생성<br/>ca.crt / ca.key] --> AS[API Server 인증서]
    CA --> CM[Controller Manager 인증서]
    CA --> SC[Scheduler 인증서]
    CA --> KP[Kube Proxy 인증서]
    
    subgraph ETCD[etcd 전용 영역]
    ECA[etcd CA 생성] --> ES[etcd Server 인증서]
    end
</div>

---

## 인증서 정보 확인 실습

생성된 인증서가 올바른 정보를 담고 있는지 OpenSSL 명령어로 확인해봅니다.

```bash
# API Server 인증서의 SAN 정보 확인
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | grep -A 1 "Subject Alternative Name"

# 출력 예시
# X509v3 Subject Alternative Name: 
#    DNS:kubernetes, DNS:kubernetes.default, IP Address:10.96.0.1, IP Address:172.31.1.10, DNS:jadeedu.com
```

**`kubeadm init` 과정에서 생성되는 인증서들의 관계를 이해하면 클러스터 초기 구성 시 발생할 수 있는 네트워크 및 인증 문제를 사전에 방지할 수 있습니다.**
