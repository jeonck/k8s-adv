# Operator 개발 가이드

Kubernetes Operator 를 개발하는 방법과 다양한 도구를 소개합니다.

---

## Operator 란?

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│          Kubernetes Operator                                │
└─────────────────────────────────────────────────────────────┘

정의:
  - Kubernetes 애플리케이션을 관리하는 방법
  - 컨트롤러 + CRD + 도메인 지식
  - 운영 지식을 코드로 구현

목적:
  - 복잡한 애플리케이션의 운영 자동화
  - 백업, 복구, 업그레이드 자동화
  - 인간 운영자의 지식을 인코딩

비유:
  ┌─────────────────────────────────────────┐
  │  수동 운영:                             │
  │  - 사람이 직접 모니터링                 │
  │  - 사람이 직접 백업                     │
  │  - 사람이 직접 복구                     │
  │                                         │
  │  Operator:                              │
  │  - 24 시간 자동 모니터링                │
  │  - 자동 백업/복구                       │
  │  - 자동 업그레이드                      │
  │                                         │
  │  "운영 지식을 담은 자동화 로봇"         │
  └─────────────────────────────────────────┘
```

### Operator 구성 요소

```
┌─────────────────────────────────────────────────────────────┐
│          Operator 구성 요소                                 │
└─────────────────────────────────────────────────────────────┘

Operator = 컨트롤러 + CRD + 도메인 지식

1. 컨트롤러 (Controller)
   - Kubernetes 리소스 감시
   - 원하는 상태와 현재 상태 비교
   - 필요시 조치 수행

2. CRD (CustomResourceDefinition)
   - 사용자 정의 리소스
   - 애플리케이션 설정 정의

3. 도메인 지식 (Domain Knowledge)
   - 애플리케이션 운영 지식
   - 백업 전략, 복구 절차
   - 업그레이드 절차

예시 (Database Operator):
  ┌─────────────────────────────────────────┐
  │  CRD: Database                          │
  │  - dbName, port, storageSize, replicas  │
  │                                         │
  │  컨트롤러:                              │
  │  - Pod 생성/관리                        │
  │  - 백업 스케줄링                        │
  │  - 장애 시 자동 복구                    │
  │  - 버전 업그레이드                      │
  │                                         │
  │  도메인 지식:                           │
  │  - 데이터베이스 백업 전략               │
  │  - 복제본 동기화 방법                   │
  │  - 업그레이드 절차                      │
  └─────────────────────────────────────────┘
```

---

## 1. CNCF Operator White Paper

### 공식 문서

```
┌─────────────────────────────────────────────────────────────┐
│          CNCF Operator White Paper                          │
└─────────────────────────────────────────────────────────────┘

문서:
  - 제목: Operator White Paper v1.0
  - URL: https://github.com/cncf/tag-app-delivery/blob/main/operator-wg/whitepaper/OperatorWhitePaper_v1-0.md
  - 발행: CNCF Operator Working Group

주요 내용:
  1. Operator 정의 및 개념
  2. Operator 패턴 설명
  3. 모범 사례
  4. 생태계 개요
  5. 도구 비교
```

### 컨트롤러 구현의 어려움

```
┌─────────────────────────────────────────────────────────────┐
│          컨트롤러 직접 구현의 어려움                        │
└─────────────────────────────────────────────────────────────┘

문제:
  "컨트롤러를 직접 구현하려면
   쿠버네티스의 저수준 API 를 알아야 함"

어려운 점:
  ┌─────────────────────────────────────────┐
  │  1. Kubernetes API 이해                 │
  │     - client-go 라이브러리              │
  │     - Informer, Lister                  │
  │     - Workqueue                         │
  │                                         │
  │  2. 리소스 감시 로직                    │
  │     - Watch 메커니즘                    │
  │     - 이벤트 핸들링                     │
  │     - 리소스 동기화                     │
  │                                         │
  │  3. 상태 관리                           │
  │     - Desired State vs Current State    │
  │     - Reconcile 로직                    │
  │     - 에러 처리 및 재시도               │
  │                                         │
  │  4. 보일러플레이트 코드                 │
  │     - 많은 양의 반복 코드               │
  │     - 설정 및 초기화                    │
  │     - 로깅 및 모니터링                  │
  └─────────────────────────────────────────┘

결과:
  - 개발 시간 길어짐
  - 버그 발생 가능성 증가
  - 유지보수 어려움
  → 프레임워크/도구 사용 권장!
```

---

## 2. Operator SDK

### 개요

```
┌─────────────────────────────────────────────────────────────┐
│          Operator SDK (CoreOS/Red Hat)                      │
└─────────────────────────────────────────────────────────────┘

정보:
  - 제공: CoreOS (현 Red Hat)
  - URL: https://sdk.operatorframework.io/
  - GitHub: https://github.com/operator-framework/operator-sdk

특징:
  ✓ "쿠버네티스의 저수준 API" 기반
  ✓ Operator 개발에 특화된 프레임워크
  ✓ Go 언어로 구현
  ✓ Helm, Ansible 도 지원

요구사항:
  - Go 언어 기본 능력 필요
  - Kubernetes 기본 개념 이해
  - 컨트롤러 패턴 이해
```

### Operator SDK 설치

```bash
# macOS (Homebrew)
brew install operator-sdk

# Linux
curl -LO https://github.com/operator-framework/operator-sdk/releases/latest/download/operator-sdk_linux_amd64
chmod +x operator-sdk_linux_amd64
sudo mv operator-sdk_linux_amd64 /usr/local/bin/operator-sdk

# 확인
operator-sdk version

# 출력:
# operator-sdk version: v1.33.0
```

### Operator SDK 로 프로젝트 생성

```bash
# 새 프로젝트 생성
operator-sdk init --domain example.com --repo github.com/example/memcached-operator

# 출력:
# Writing kustomize manifests for you to edit...
# Next: define a resource with:
# $ operator-sdk create api

# API 생성
operator-sdk create api --group cache --version v1alpha1 --kind Memcached --resource --controller

# 출력:
# Writing kustomize manifests for you to edit...
# Created controllers/memcached_controller.go
# Created api/v1alpha1/memcached_types.go

# CRD 생성
make manifests

# 출력:
# ./bin/controller-gen crd paths="./..." output:crd:artifacts:config=config/crd/bases
```

### 프로젝트 구조

```
memcached-operator/
├── api/
│   └── v1alpha1/
│       ├── memcached_types.go      # CRD 타입 정의
│       ├── groupversion_info.go    # GroupVersion 정보
│       └── zz_generated.deepcopy.go # DeepCopy 코드
├── controllers/
│   └── memcached_controller.go     # 컨트롤러 로직
├── config/
│   ├── crd/                        # CRD YAML
│   ├── default/                    # Kustomize 기본
│   ├── manager/                    # 매니저 설정
│   ├── rbac/                       # RBAC 설정
│   └── samples/                    # 샘플 리소스
├── cmd/
│   └── main.go                     # 진입점
├── go.mod                          # Go 모듈
├── go.sum
├── Makefile                        # 빌드/테스트
└── Dockerfile                      # 컨테이너 이미지
```

### 컨트롤러 구현 예시

```go
// controllers/memcached_controller.go

package controllers

import (
    "context"
    "fmt"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    cachev1alpha1 "github.com/example/memcached-operator/api/v1alpha1"
)

// MemcachedReconciler reconciles a Memcached object
type MemcachedReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// Reconcile 메인 로직
func (r *MemcachedReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    // Memcached 리소스 조회
    memcached := &cachev1alpha1.Memcached{}
    err := r.Get(ctx, req.NamespacedName, memcached)
    if err != nil {
        if errors.IsNotFound(err) {
            // 리소스가 없으면 종료
            return ctrl.Result{}, nil
        }
        // 기타 오류
        return ctrl.Result{}, err
    }

    // Desired State: Deployment 생성
    dep := r.deploymentForMemcached(memcached)
    
    // 현재 Deployment 확인
    found := &appsv1.Deployment{}
    err = r.Get(ctx, types.NamespacedName{Name: dep.Name, Namespace: dep.Namespace}, found)
    
    if err != nil && errors.IsNotFound(err) {
        // Deployment 가 없으면 생성
        log.Info("Creating Deployment", "Deployment.Namespace", dep.Namespace, "Deployment.Name", dep.Name)
        err = r.Create(ctx, dep)
        if err != nil {
            return ctrl.Result{}, err
        }
        // 재조정
        return ctrl.Result{RequeueAfter: time.Minute}, nil
    } else if err != nil {
        return ctrl.Result{}, err
    }

    // Deployment 가 있으면 크기 확인
    size := memcached.Spec.Size
    if *found.Spec.Replicas != size {
        // 크기 조정
        found.Spec.Replicas = &size
        err = r.Update(ctx, found)
        if err != nil {
            return ctrl.Result{}, err
        }
        // 재조정
        return ctrl.Result{RequeueAfter: time.Minute}, nil
    }

    // Status 업데이트
    memcached.Status.Phase = "Ready"
    err = r.Status().Update(ctx, memcached)
    if err != nil {
        return ctrl.Result{}, err
    }

    // 다음 재조정 시간
    return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
}

// deploymentForMemcached Deployment 생성
func (r *MemcachedReconciler) deploymentForMemcached(m *cachev1alpha1.Memcached) *appsv1.Deployment {
    replicas := m.Spec.Size
    
    dep := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      m.Name,
            Namespace: m.Namespace,
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{"app": m.Name},
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{"app": m.Name},
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{{
                        Name:  "memcached",
                        Image: "memcached:1.6",
                        Ports: []corev1.ContainerPort{{
                            ContainerPort: 11211,
                        }},
                    }},
                },
            },
        },
    }
    
    // Owner 설정 (Memcached 가 삭제되면 Deployment 도 삭제)
    ctrl.SetControllerReference(m, dep, r.Scheme)
    
    return dep
}

// SetupWithManager 컨트롤러 등록
func (r *MemcachedReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&cachev1alpha1.Memcached{}).
        Owns(&appsv1.Deployment{}).
        Complete(r)
}
```

### CRD 타입 정의

```go
// api/v1alpha1/memcached_types.go

package v1alpha1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MemcachedSpec Memcached 리소스 스펙
type MemcachedSpec struct {
    // Size is the size of the memcached deployment
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=10
    Size *int32 `json:"size"`
    
    // Port is the port for memcached
    Port int32 `json:"port,omitempty"`
    
    // Image is the memcached image
    Image string `json:"image,omitempty"`
}

// MemcachedStatus Memcached 리소스 상태
type MemcachedStatus struct {
    // Phase is the current phase
    Phase string `json:"phase,omitempty"`
    
    // Message is a human-readable message
    Message string `json:"message,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Memcached is the Schema for the memcacheds API
type Memcached struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   MemcachedSpec   `json:"spec,omitempty"`
    Status MemcachedStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// MemcachedList contains a list of Memcached
type MemcachedList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []Memcached `json:"items"`
}

func init() {
    SchemeBuilder.Register(&Memcached{}, &MemcachedList{})
}
```

### 빌드 및 배포

```bash
# 로컬에서 실행 (테스트)
make run

# Docker 이미지 빌드
make docker-build IMG=example/memcached-operator:v0.0.1

# 이미지 푸시
make docker-push IMG=example/memcached-operator:v0.0.1

# Kubernetes 에 배포
make deploy IMG=example/memcached-operator:v0.0.1

# CRD 설치
make install

# 샘플 리소스 생성
kubectl apply -f config/samples/cache_v1alpha1_memcached.yaml

# Operator 확인
kubectl get pods -n memcached-operator-system
```

---

## 3. 기타 Operator 작성 도구

### 도구 비교

```
┌─────────────────────────────────────────────────────────────┐
│          Operator 작성 도구 비교                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────┬──────────┬──────────┬─────────────────┐
│  도구               │  언어    │  난이도  │  특징           │
├─────────────────────┼──────────┼──────────┼─────────────────┤
│  Operator SDK       │  Go      │  중      │  공식, 풍부    │
│  Kubebuilder        │  Go      │  중      │ 軽量，핵심     │
│  Helm Operator      │  YAML    │  하      │  Helm 차트 기반│
│  Ansible Operator   │  YAML    │  하      │  Ansible 기반  │
│  Kopf               │  Python  │  중      │  Pythonic      │
│  Java Operator SDK  │  Java    │  중      │  Java/Kotlin   │
│  Kube-rs            │  Rust    │  상      │  Rust, 안전    │
│  KubeOps            │  .NET    │  중      │  C#, .NET      │
│  Charmed Operator   │  Python  │  중      │  Juju 통합     │
│  shell-operator     │  Shell   │  하      │  Shell 스크립트│
│  Metacontroller     │  YAML    │  중      │  WebHooks 직접 │
│  Mast               │  Go      │  중      │  경량          │
└─────────────────────┴──────────┴──────────┴─────────────────┘
```

### 도구별 상세

#### 1. Kubebuilder

```
┌─────────────────────────────────────────────────────────────┐
│          Kubebuilder                                        │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://book.kubebuilder.io/
  - GitHub: https://github.com/kubernetes-sigs/kubebuilder
  - 제공: Kubernetes SIGs

특징:
  ✓ Operator SDK 의 기반
  ✓ 軽量하고 핵심 기능만
  ✓ Go 언어 전용
  ✓ controller-runtime 사용

장점:
  - 빠르고 가볍다
  - Kubernetes 공식 프로젝트
  - 문서화가 잘 되어있다

단점:
  - Go 만 지원
  - Helm/Ansible 지원 없음
```

#### 2. Helm Operator

```
┌─────────────────────────────────────────────────────────────┐
│          Helm Operator                                      │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://sdk.operatorframework.io/docs/building-operators/helm/
  - 제공: Operator SDK

특징:
  ✓ Helm 차트를 Operator 로
  ✓ YAML 만으로 작성
  ✓ Go 코드 불필요

예시:
  operator-sdk create api --group cache --version v1alpha1 \
    --kind Memcached --helm-chart=memcached --helm-chart-repo=stable

장점:
  - Helm 지식이 있으면 쉬움
  - Go 코드 작성 불필요
  - 빠른 개발

단점:
  - 복잡한 로직 구현 어려움
  - Helm 차트 의존성
```

#### 3. Ansible Operator

```
┌─────────────────────────────────────────────────────────────┐
│          Ansible Operator                                   │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://sdk.operatorframework.io/docs/building-operators/ansible/
  - 제공: Operator SDK

특징:
  ✓ Ansible Playbook 을 Operator 로
  ✓ YAML 만으로 작성
  ✓ 풍부한 Ansible 모듈

예시:
  operator-sdk create api --group cache --version v1alpha1 \
    --kind Memcached --ansible

장점:
  - Ansible 지식이 있으면 쉬움
  - 풍부한 모듈 활용
  - Go 코드 작성 불필요

단점:
  - Ansible 런타임 오버헤드
  - 복잡한 상태 관리 어려움
```

#### 4. Kopf (Kubernetes Operator Pythonic Framework)

```
┌─────────────────────────────────────────────────────────────┐
│          Kopf (Python)                                      │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://kopf.readthedocs.io/
  - GitHub: https://github.com/nolar/kopf
  - 언어: Python

특징:
  ✓ Python 으로 Operator 작성
  ✓ 데코레이터 기반
  ✓ 비동기 지원

예시:
  import kopf

  @kopf.on.create('myapp.example.com', 'v1', 'myapps')
  def on_create(spec, meta, status, logger, **kwargs):
      logger.info(f"Creating MyApp: {meta.name}")
      # 생성 로직

  @kopf.on.update('myapp.example.com', 'v1', 'myapps')
  def on_update(spec, meta, status, logger, **kwargs):
      logger.info(f"Updating MyApp: {meta.name}")
      # 업데이트 로직

장점:
  - Python 으로 작성 (접근성 좋음)
  - 데코레이터로 간결
  - 비동기 처리 지원

단점:
  - Python 런타임 필요
  - Go 보다 성능 낮음
```

#### 5. Java Operator SDK

```
┌─────────────────────────────────────────────────────────────┐
│          Java Operator SDK                                  │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://javaoperatorsdk.io/
  - GitHub: https://github.com/java-operator-sdk/java-operator-sdk
  - 언어: Java/Kotlin

특징:
  ✓ Java/Kotlin 으로 Operator 작성
  ✓ Spring Boot 통합
  ✓ 어노테이션 기반

예시:
  @Controller
  public class MyController implements Reconciler<MyResource> {
      @Override
      public UpdateControl<MyResource> reconcile(MyResource resource) {
          // 리콘실 로직
          return UpdateControl.updateStatus(resource);
      }
  }

장점:
  - Java/Kotlin 개발자에게 친숙
  - Spring Boot 와 통합
  - 타입 안전성

단점:
  - JVM 런타임 오버헤드
  - Go 보다 무거움
```

#### 6. Kube-rs (Rust)

```
┌─────────────────────────────────────────────────────────────┐
│          Kube-rs (Rust)                                     │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://kube.rs/
  - GitHub: https://github.com/kube-rs/kube
  - 언어: Rust

특징:
  ✓ Rust 로 Operator 작성
  ✓ 타입 안전성
  ✓ 높은 성능

예시:
  use kube::api::{Api, ResourceExt};
  
  #[tokio::main]
  async fn main() -> Result<(), Box<dyn Error>> {
      let client = Client::try_default().await?;
      let apis: Api<MyResource> = Api::default_namespaced(client);
      
      // 리콘실 로직
      Ok(())
  }

장점:
  - 높은 성능
  - 타입 안전성
  - 메모리 안전

단점:
  - Rust 학습 곡선
  - 생태계가 작음
```

#### 7. KubeOps (.NET)

```
┌─────────────────────────────────────────────────────────────┐
│          KubeOps (.NET Operator SDK)                        │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://buehler.github.io/dotnet-operator-sdk/
  - GitHub: https://github.com/buehler/dotnet-operator-sdk
  - 언어: C#/.NET

특징:
  ✓ C# 으로 Operator 작성
  ✓ .NET Core 기반
  ✓ 어노테이션 기반

예시:
  [EntityDefinition("v1", "MyResource")]
  public class MyResource : CustomKubernetesEntity
  {
      public MyResourceSpec Spec { get; set; }
      public MyResourceStatus Status { get; set; }
  }
  
  public class Controller : IEntityController<MyResource>
  {
      public Task Reconcile(MyResource entity)
      {
          // 리콘실 로직
          return Task.CompletedTask;
      }
  }

장점:
  - C# 개발자에게 친숙
  - .NET 생태계 활용
  - 타입 안전성

단점:
  - .NET 런타임 오버헤드
  - 상대적으로 새로운 프로젝트
```

#### 8. Charmed Operator Framework

```
┌─────────────────────────────────────────────────────────────┐
│          Charmed Operator Framework                         │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://juju.is/operator-sdk
  - 제공: Canonical (Ubuntu)
  - 언어: Python

특징:
  ✓ Juju 와 통합
  ✓ Python 기반
  ✓ Charm 개념

장점:
  - Juju 생태계 활용
  - Python 으로 작성
  - 운영 패턴 표준화

단점:
  - Juju 의존성
  - 상대적으로 새로운 생태계
```

#### 9. Shell-operator

```
┌─────────────────────────────────────────────────────────────┐
│          Shell-operator                                     │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://github.com/flant/shell-operator
  - 제공: Flant
  - 언어: Shell/Bash

특징:
  ✓ Shell 스크립트로 Operator 작성
  ✓ 매우 간단
  ✓ 빠른 프로토타이핑

예시:
  #!/bin/bash
  
  case "$OPERATOR_TYPE" in
      "Synchronization")
          echo "Synchronizing..."
          ;;
      "Event")
          echo "Event: $OPERATOR_EVENT"
          ;;
  esac

장점:
  - Shell 스크립트만 작성
  - 매우 간단
  - 빠른 개발

단점:
  - 복잡한 로직 어려움
  - Shell 의 한계
  - 프로덕션 사용 주의
```

#### 10. Metacontroller

```
┌─────────────────────────────────────────────────────────────┐
│          Metacontroller                                     │
└─────────────────────────────────────────────────────────────┘

정보:
  - URL: https://metacontroller.github.io/metacontroller/
  - GitHub: https://github.com/metacontroller/metacontroller
  - 언어: any (Webhook)

특징:
  ✓ WebHooks 직접 구현
  ✓ 언어 무관
  ✓ 경량

장점:
  - 어떤 언어든 사용 가능
  - 경량
  - 유연함

단점:
  - WebHook 직접 구현
  - 추가 설정 필요
  - 복잡할 수 있음
```

---

## 4. 도구 선택 가이드

### 선택 기준

```
┌─────────────────────────────────────────────────────────────┐
│          Operator 도구 선택 가이드                          │
└─────────────────────────────────────────────────────────────┘

팀의 기술 스택:
  - Go 개발 가능? → Operator SDK, Kubebuilder
  - Python 개발 가능? → Kopf, Charmed Operator
  - Java 개발 가능? → Java Operator SDK
  - .NET 개발 가능? → KubeOps
  - Rust 개발 가능? → Kube-rs
  - Helm 지식 있음? → Helm Operator
  - Ansible 지식 있음? → Ansible Operator
  - Shell 만 가능? → Shell-operator

복잡도:
  - 간단한 자동화? → Helm Operator, Ansible Operator
  - 중간 복잡도? → Operator SDK, Kopf
  - 복잡한 로직? → Operator SDK (Go)

성능:
  - 고성능 필요? → Operator SDK (Go), Kube-rs (Rust)
  - 일반적인 성능? → 기타 도구

생태계:
  - 풍부한 라이브러리? → Operator SDK, Kubebuilder
  - 특정 생태계 통합? → Charmed (Juju), Java (Spring)
```

### 추천 시나리오

```
┌─────────────────────────────────────────────────────────────┐
│          시나리오별 추천 도구                               │
└─────────────────────────────────────────────────────────────┘

시나리오 1: "Go 개발 가능, 프로덕션용 Operator"
  → Operator SDK 또는 Kubebuilder
  이유: 가장 성숙, 풍부한 문서, 좋은 성능

시나리오 2: "Helm 차트 이미 있음, Go 코드 쓰기 싫음"
  → Helm Operator
  이유: Helm 차트를 그대로 사용, YAML 만 작성

시나리오 3: "Python 개발자, 빠른 프로토타이핑"
  → Kopf
  이유: Python 으로 빠르게 작성, 데코레이터 기반

시나리오 4: "기업 환경, Java 기반"
  → Java Operator SDK
  이유: Java/Kotlin 개발자 활용, Spring 통합

시나리오 5: "Ansible 플레이북 이미 있음"
  → Ansible Operator
  이유: 기존 Ansible 자산 활용

시나리오 6: "최고 성능, 타입 안전성"
  → Kube-rs (Rust)
  이유: Rust 의 성능과 안전성

시나리오 7: ".NET 환경, C# 개발자"
  → KubeOps
  이유: C# 으로 작성, .NET 생태계
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    Operator 개발 요약                       │
├─────────────────────────────────────────────────────────────┤
│  1. CNCF Operator White Paper                               │
│     - Operator 정의 및 모범 사례                           │
│     - 컨트롤러 직접 구현은 저수준 API 필요                 │
│                                                             │
│  2. Operator SDK (추천)                                     │
│     - CoreOS/Red Hat 제공                                  │
│     - Go 언어 기반                                         │
│     - Helm, Ansible 도 지원                                │
│     - 프로젝트 생성 → API 생성 → 구현 → 빌드               │
│                                                             │
│  3. 기타 도구                                               │
│     - Kubebuilder: Go, 軽量한 핵심                         │
│     - Helm Operator: YAML, Helm 차트 기반                  │
│     - Ansible Operator: YAML, Ansible 기반                 │
│     - Kopf: Python, 데코레이터                             │
│     - Java Operator SDK: Java/Kotlin                       │
│     - Kube-rs: Rust, 고성능                                │
│     - KubeOps: .NET, C#                                    │
│     - Charmed Operator: Python, Juju                       │
│     - Shell-operator: Shell, 간단함                        │
│     - Metacontroller: WebHooks, 언어무관                   │
│                                                             │
│  4. 도구 선택 가이드                                        │
│     - 팀 기술 스택에 따라 선택                             │
│     - 복잡도에 따라 선택                                   │
│     - 성능 요구사항에 따라 선택                            │
│     - Go 가능하면 Operator SDK 추천                        │
└─────────────────────────────────────────────────────────────┘
```

### Operator 개발 체크리스트

```
┌─────────────────────────────────────────────────────────────┐
│          Operator 개발 체크리스트                           │
└─────────────────────────────────────────────────────────────┘

□ 도구 선택 (팀 기술 스택, 복잡도, 성능)
□ CRD 정의 (리소스 스펙, 상태)
□ 컨트롤러 로직 구현 (Reconcile)
□ RBAC 설정 (필요 권한)
□ 테스트 (단위, 통합)
□ Docker 이미지 빌드
□ 배포 매니페스트
□ 문서화 (사용법, 예시)
□ 모니터링 (메트릭, 로그)
□ 업그레이드 전략
```

**Operator 개발은 Kubernetes 애플리케이션 운영을 자동화하는 강력한 방법입니다. Operator SDK 를 사용하면 Go 로 안정적이고 성숙한 Operator 를 개발할 수 있습니다. 팀의 기술 스택에 맞는 도구를 선택하세요.**
