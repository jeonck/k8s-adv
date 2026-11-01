---
cascade:
  type: docs
title: "기초 이론"
weight: 3
---

`kubectl` 동작 방식부터 리소스 구조, 클러스터 컴포넌트, 워크로드(Pet vs Cattle, StatefulSet), 패키지 관리(Helm), API 확장(CRD)까지 심화 과정의 토대가 되는 개념을 다룹니다.

{{< cards >}}
  {{< card link="01-kubectl" title="kubectl 이란?" subtitle="kubectl 은 Kubernetes 클러스터와 상호작용하기 위한 명령줄 도구입니다." >}}
  {{< card link="02-k8s-resources" title="Kubernetes 리소스 맵" subtitle="Kubernetes는 다양한 리소스 객체를 유기적으로 결합하여 클러스터를 구성하고 애플리케이션을 실행합니다." >}}
  {{< card link="03-k8s-components" title="K8s 클러스터 구성 컴포넌트" subtitle="Kubernetes 클러스터는 관리를 담당하는 Control Plane과 실제 워크로드가 실행되는 Worker Node로 구성됩니다." >}}
  {{< card link="04-addon-concept" title="K8s Add-on 개념의 중요성" subtitle="Kubernetes 는 핵심 컴포넌트와 Add-on 을 명확히 분리하는 철학을 가지고 있습니다." >}}
  {{< card link="05-addon-problems" title="Add-on 컴포넌트 구성의 문제점" subtitle="Kubernetes 의 Add-on 방식은 유연성을 제공하지만, 여러 문제점과 복잡성을 야기합니다." >}}
  {{< card link="06-csi-philosophy" title="K8s CSI (Container Storage Interface) 의 철학" subtitle="CSI는 Kubernetes가 특정 저장소 벤더에 종속되지 않고 유연하게 확장할 수 있도록 만든 핵심 표준 규격입니다." >}}
  {{< card link="07-helm" title="Helm - Kubernetes 패키지 관리자" subtitle="Helm은 Kubernetes 애플리케이션을 정의하고, 설치하고, 업그레이드하기 위한 패키지 관리자입니다." >}}
  {{< card link="08-pet-vs-cattle" title="Pet vs Cattle: 클라우드 인프라의 철학" subtitle="클라우드 네이티브 환경과 Kubernetes의 핵심 설계 사상을 이해하기 위한 Pet(애완동물)과 Cattle(가축) 비유에 대해 알아봅니다." >}}
  {{< card link="09-statefulset-pet" title="StatefulSet - Pet 적 특성을 가진 K8s 리소스" subtitle="Kubernetes는 기본적으로 Cattle(가축) 철학을 따르지만, StatefulSet은 예외적으로 Pet(애완동물)에 가까운 특성을 가집니다." >}}
  {{< card link="10-statefulset-vs-replicaset" title="StatefulSet vs ReplicaSet - 상세 비교" subtitle="Kubernetes에서 Pod를 대량으로 관리하는 두 가지 핵심 리소스인 StatefulSet과 ReplicaSet의 차이점을 분석합니다." >}}
  {{< card link="11-package-manager-background" title="패키지 관리 도구의 출현 배경" subtitle="Kubernetes Add-On 컴포넌트 구성의 문제점에서부터 Helm과 같은 패키지 관리 도구가 왜 필요하게 되었는지 살펴봅니다." >}}
  {{< card link="12-headless-service" title="StatefulSet 에서 Headless Service 가 필요한 이유" subtitle="StatefulSet을 운영할 때 왜 일반 서비스가 아닌 Headless Service가 필수적인지 핵심 이유를 알아봅니다." >}}
  {{< card link="42-crd-guide" title="CustomResourceDefinition (CRD)" subtitle="Kubernetes API를 확장하여 사용자가 직접 정의한 새로운 리소스 타입을 만드는 방법입니다." >}}
{{< /cards >}}
