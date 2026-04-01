# 인증서 만료기간 확인 및 ConfigMap 정보

Kubernetes 클러스터의 인증서 만료기간을 확인하고 `kubeadm-config` ConfigMap 정보를 알아봅니다.

---

## 인증서 만료기간 확인

Kubernetes 클러스터 유지보수에서 가장 중요한 작업 중 하나는 인증서 만료일을 관리하는 것입니다.

### 만료 확인 명령어
```bash
kubeadm certs check-expiration
```

### 출력 필드 상세 설명

| 필드명 | 설명 | 비고 |
|--------|------|------|
| **CERTIFICATE** | 확인 대상 인증서 이름 | 총 10여 개의 핵심 인증서 확인 |
| **EXPIRES** | 인증서가 만료되는 정확한 날짜와 시간 | UTC 기준 |
| **RESOLUTIONS** | 만료까지 남은 일수 (D-Day) | 30일 이내일 경우 주의 필요 |
| **AVAILABLE CA** | 해당 인증서를 발급(서명)한 기관 | kubernetes-ca, etcd-ca 등 |

---

## 주요 인증서별 역할 요약

| 인증서 이름 | 주요 역할 | 위치 |
|-------------|-----------|------|
| **admin.conf** | 클러스터 관리자(kubectl) 인증 정보 | `/etc/kubernetes/admin.conf` |
| **apiserver** | API Server의 서버 신원 증명 | `/etc/kubernetes/pki/apiserver.crt` |
| **etcd-server** | etcd 데이터베이스 서버 인증 | `/etc/kubernetes/pki/etcd/server.crt` |
| **scheduler.conf** | 스케줄러가 API 서버에 접속할 때 사용 | `/etc/kubernetes/scheduler.conf` |

---

## 인증서 갱신 (Renew)

만료가 임박한 인증서는 `kubeadm` 명령어로 간단히 갱신할 수 있습니다.

<div class="mermaid">
flowchart LR
    Check[만료 확인<br/>check-expiration] --> Decision{30일 미만?}
    Decision -- Yes --> Renew[인증서 갱신<br/>certs renew all]
    Renew --> Restart[컴포넌트 재시작<br/>Static Pod 자동 재시작]
    Decision -- No --> Wait[정기 점검 대기]
</div>

### 갱신 명령어 예시
```bash
# 모든 인증서 일괄 갱신
kubeadm certs renew all

# 특정 인증서만 갱신 (예: apiserver)
kubeadm certs renew apiserver
```

---

## kubeadm-config ConfigMap

`kubeadm`은 클러스터 초기화 시 사용된 설정 정보를 `kube-system` 네임스페이스의 ConfigMap에 저장해둡니다. 인증서 갱신 시 이 정보를 참조합니다.

```bash
# 설정 정보 확인 명령어
kubectl -n kube-system get cm kubeadm-config -o yaml
```

**인증서 만료는 클러스터 전체 중단(Outage)으로 이어질 수 있으므로, `check-expiration` 명령어를 통한 정기적인 점검이 필수적입니다.**
