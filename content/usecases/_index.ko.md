---
cascade:
  type: docs
title: "Use Cases"
weight: 7
---

현업에서 자주 마주치는 장애 대응과 내부 동작을 사례별로 정리했습니다. 증상 → 원인 → 해결 순서로 따라가며 학습하세요.

## Kubernetes 트러블슈팅 Top 7 Use Case

가장 자주 만나는 Kubernetes 장애 신호를 마주치는 순서대로 정리했습니다.

| # | Use Case | 문서 |
|---|----------|------|
| 1 | Kubernetes Node Not Ready 해결 방법 | [Use Case 3](48-uc-node-not-ready) |
| 2 | Kubernetes Node Disk Pressure 해결 방법 | [Use Case 8](53-uc-node-disk-pressure) |
| 3 | Kubernetes CreateContainerError 이해하기 | [Use Case 9](54-uc-createcontainererror) |
| 4 | Kubernetes CreateContainerConfigError 이해하기 | [Use Case 10](55-uc-createcontainerconfigerror) |
| 5 | Kubernetes ImagePullBackOff 이해하기 | [Use Case 4](49-uc-imagepullbackoff) |
| 6 | Kubernetes RunContainerError 이해하기 | [Use Case 11](56-uc-runcontainererror) |
| 7 | Kubernetes OOMKilled 이해하기 | [Use Case 12](57-uc-oomkilled) |

## 전체 Use Case

{{< cards >}}
  {{< card link="46-uc-resource-quota" title="Use Case 1. Kubernetes 가 Resource Quota 를 적용하는 방법" subtitle="네임스페이스 단위로 리소스 총량과 오브젝트 개수를 제한하는 ResourceQuota 가 실제로 어떻게 강제되는지 살펴봅니다." >}}
  {{< card link="47-uc-pod-deletion" title="Use Case 2. Pod 삭제 과정 - 내부 동작 분석" subtitle="kubectl delete pod 실행 시 내부 동작과 Graceful Shutdown 이 필요한 이유" >}}
  {{< card link="48-uc-node-not-ready" title="Use Case 3. Kubernetes Node NotReady 해결 방법" subtitle="노드 상태가 NotReady 가 되는 원인을 체계적으로 좁혀가는 트러블슈팅 절차입니다." >}}
  {{< card link="49-uc-imagepullbackoff" title="Use Case 4. Kubernetes ImagePullBackOff 해설" subtitle="Pod 가 ErrImagePull → ImagePullBackOff 상태가 되는 이유와 해결법입니다." >}}
  {{< card link="50-uc-architecture-crash-course" title="Use Case 5. Kubernetes 아키텍처 속성 과정" subtitle="Kubernetes 클러스터를 구성하는 컴포넌트와 요청이 처리되는 흐름을 한 번에 훑어봅니다." >}}
  {{< card link="51-uc-daemonset-troubleshooting" title="Use Case 6. 비정상 Kubernetes DaemonSet 트러블슈팅" subtitle="DaemonSet 은 모든(또는 선택된) 노드에 Pod 를 1개씩 실행합니다." >}}
  {{< card link="52-uc-pod-yaml-structure" title="Use Case 7. pod.yaml 파일 구조 분석" subtitle="모든 Kubernetes 매니페스트의 기본이 되는 Pod 정의를 필드별로 나누어 살펴봅니다." >}}
  {{< card link="53-uc-node-disk-pressure" title="Use Case 8. Kubernetes Node Disk Pressure 해결 방법" subtitle="kubelet 이 DiskPressure 를 설정하고 Pod 를 evict 하는 이유, 디스크를 채우는 원인 찾기, 해결과 예방 방법입니다." >}}
  {{< card link="54-uc-createcontainererror" title="Use Case 9. Kubernetes CreateContainerError 이해하기" subtitle="컨테이너 런타임이 컨테이너를 생성하지 못한 경우로, 비슷한 상태와 구분하는 법과 해결 방법입니다." >}}
  {{< card link="55-uc-createcontainerconfigerror" title="Use Case 10. Kubernetes CreateContainerConfigError 이해하기" subtitle="kubelet 이 컨테이너 설정을 구성하지 못한 경우로, 대개 ConfigMap, Secret 또는 키가 없을 때 발생합니다." >}}
  {{< card link="56-uc-runcontainererror" title="Use Case 11. Kubernetes RunContainerError 이해하기" subtitle="컨테이너는 생성됐지만 프로세스를 시작하지 못한 경우: 엔트리포인트, 권한, 아키텍처, 마운트 문제입니다." >}}
  {{< card link="57-uc-oomkilled" title="Use Case 12. Kubernetes OOMKilled 이해하기" subtitle="컨테이너가 종료 코드 137 로 종료되는 이유와 메모리 limit 을 적정하게 산정하는 방법입니다." >}}
{{< /cards >}}
