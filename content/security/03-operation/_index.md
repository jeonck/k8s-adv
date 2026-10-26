---
title: "3. 인증서 관리 및 실무 (Operation)"
weight: 3
---

{{< cards >}}
  {{< card link="22-k8s-root-ca-internal" title="Kubernetes 의 Root CA 역할" subtitle="Kubernetes 클러스터는 자체 Root CA 로서 동작하며, 클러스터 내부의 모든 인증서를 발급하고 관리합니다." >}}
  {{< card link="23-k8s-cert-file-locations" title="Kubernetes 인증서 보관 위치" subtitle="Kubernetes 클러스터에서 인증서가 저장되는 위치와 관리 방법을 알아봅니다." >}}
  {{< card link="24-kubeadm-cert-management" title="kubeadm init 인증서 생성 실습" subtitle="클러스터를 초기화할 때 사용하는 주요" >}}
  {{< card link="25-static-pod-auth-config" title="Static Pod 와 API Server" subtitle="Static Pod의 개념과 API Server와의 관계, 그리고 컨트롤 플레인 컴포넌트 구동 방식에 대해 알아봅니다." >}}
  {{< card link="26-inspect-cert-info-1" title="인증서 정보 확인 (1/2) - Root CA 와 API Server" subtitle="Kubernetes 클러스터의 Root CA 인증서와 API Server에서 사용하는 인증서 파일 정보를 확인합니다." >}}
  {{< card link="27-inspect-cert-info-2" title="인증서 정보 확인 (2/2) - 암호화 검증" subtitle="Root CA 인증서의 공개키를 이용한 암호화 검증을 실습합니다." >}}
  {{< card link="28-cert-expiration-and-renew" title="인증서 만료기간 확인 및 ConfigMap 정보" subtitle="Kubernetes 클러스터의 인증서 만료기간을 확인하고 kubeadm-config ConfigMap 정보를 알아봅니다." >}}
{{< /cards >}}
