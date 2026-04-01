# Kubernetes 의 Root CA 역할

Kubernetes 클러스터는 자체 Root CA 로서 동작하며, 클러스터 내부의 모든 인증서를 발급하고 관리합니다.

---

## Kubernetes 가 Root CA 로 동작하는 이유

Kubernetes가 외부 공개 CA(DigiCert 등)를 사용하지 않고 자체 CA를 운영하는 이유는 클러스터 내부 통신의 특수성 때문입니다.

| 구분 | 공개 CA (Let's Encrypt 등) | Kubernetes 자체 CA |
|------|----------------------------|--------------------|
| **용도** | 인터넷에 공개된 서비스용 | 클러스터 내부 컴포넌트 간 통신용 |
| **신뢰 범위** | 전 세계 모든 브라우저/기기 | 해당 Kubernetes 클러스터 내부 |
| **비용/시간** | 비용 발생 가능, 발급 대기 시간 | 무료, 자동화로 즉시 발급 |
| **유효기간** | 보통 90일 ~ 1년 | 기본 1년 (설정 가능) |
| **비유** | 국제 여권 | 사내 사원증 |

---

## Kubernetes CA 의 신뢰 범위

Kubernetes CA는 클러스터라는 울타리 안에서만 신뢰받는 '사설 인증 기관'입니다.

<div class="mermaid">
graph TD
    CA[Kubernetes Root CA<br/>ca.crt / ca.key] -- 서명/발급 --> AS[API Server 인증서]
    CA -- 서명/발급 --> KL[Kubelet 인증서]
    CA -- 서명/발급 --> ET[etcd 인증서]
    CA -- 서명/발급 --> CTL[Controller Manager 인증서]
    
    subgraph Cluster[Kubernetes Cluster 내부]
    AS
    KL
    ET
    CTL
    end
    
    User[외부 브라우저] -- "신뢰할 수 없음" --> AS
    Note right of User: 브라우저에 해당 CA가<br/>등록되어 있지 않음
</div>

---

## Kubernetes CA 구조 및 파일 위치

### 주요 인증서 파일 (kubeadm 기준)

Kubernetes의 핵심 인증서들은 마스터 노드의 `/etc/kubernetes/pki/` 디렉토리에 보관됩니다.

| 파일명 | 역할 | 설명 |
|--------|------|------|
| **ca.crt** | Root CA 인증서 | 모든 컴포넌트가 신뢰의 기점으로 사용하는 공개키 |
| **ca.key** | Root CA 개인키 | **절대 유출 금지.** 새로운 인증서 서명 시 사용 |
| **apiserver.crt** | API Server 서버 인증서 | 클라이언트가 API 서버 신원 확인 시 사용 |
| **apiserver-kubelet-client.crt** | API Server용 클라이언트 인증서 | API 서버가 kubelet에 접속할 때 사용 |
| **front-proxy-ca.crt** | 프록시용 Root CA | 확장 API 서버와의 통신을 위한 별도 CA |
| **sa.pub / sa.key** | ServiceAccount 서명용 키 | 인증서가 아닌 JWT 토큰 서명용 키 쌍 |

---

## Kubernetes 에서 인증서가 사용되는 흐름

1.  **클러스터 초기화:** `kubeadm init` 실행 시 `ca.key`와 `ca.crt`가 생성됩니다.
2.  **컴포넌트 발급:** 생성된 CA 키를 사용하여 `apiserver`, `scheduler` 등의 인증서를 자동으로 발급합니다.
3.  **상호 인증 (mTLS):** 예를 들어 `kube-scheduler`가 API 서버에 접속할 때, 서로 상대방의 인증서가 `ca.crt`에 의해 서명되었는지 확인하여 신뢰를 형성합니다.

**Kubernetes Root CA는 클러스터 보안의 뿌리이며, 이 CA를 통해 클러스터 내 모든 통신이 암호화되고 신뢰받게 됩니다.**
