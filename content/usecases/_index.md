---
cascade:
  type: docs
title: "Use Cases"
weight: 7
---

현업에서 자주 마주치는 장애 대응과 내부 동작을 사례별로 정리했습니다. 증상 → 원인 → 해결 순서로 따라가며 학습하세요.

{{< cards >}}
  {{< card link="46-uc-resource-quota" title="Use Case 1. Kubernetes 가 Resource Quota 를 적용하는 방법" subtitle="네임스페이스 단위로 리소스 총량과 오브젝트 개수를 제한하는 ResourceQuota 가 실제로 어떻게 강제되는지 살펴봅니다." >}}
  {{< card link="47-uc-pod-deletion" title="Use Case 2. Pod 삭제 과정 - 내부 동작 분석" subtitle="kubectl delete pod 실행 시 내부 동작과 Graceful Shutdown 이 필요한 이유" >}}
  {{< card link="48-uc-node-not-ready" title="Use Case 3. Kubernetes Node NotReady 해결 방법" subtitle="노드 상태가 NotReady 가 되는 원인을 체계적으로 좁혀가는 트러블슈팅 절차입니다." >}}
  {{< card link="49-uc-imagepullbackoff" title="Use Case 4. Kubernetes ImagePullBackOff 해설" subtitle="Pod 가 ErrImagePull → ImagePullBackOff 상태가 되는 이유와 해결법입니다." >}}
  {{< card link="50-uc-architecture-crash-course" title="Use Case 5. Kubernetes 아키텍처 속성 과정" subtitle="Kubernetes 클러스터를 구성하는 컴포넌트와 요청이 처리되는 흐름을 한 번에 훑어봅니다." >}}
  {{< card link="51-uc-daemonset-troubleshooting" title="Use Case 6. 비정상 Kubernetes DaemonSet 트러블슈팅" subtitle="DaemonSet 은 모든(또는 선택된) 노드에 Pod 를 1개씩 실행합니다." >}}
  {{< card link="52-uc-pod-yaml-structure" title="Use Case 7. pod.yaml 파일 구조 분석" subtitle="모든 Kubernetes 매니페스트의 기본이 되는 Pod 정의를 필드별로 나누어 살펴봅니다." >}}
{{< /cards >}}
