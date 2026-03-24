# kubectl 이란?

kubectl 은 Kubernetes 클러스터와 상호작용하기 위한 명령줄 도구입니다.

## 기본 개념

kubectl 은 Kubernetes API 서버에 **REST 호출**을 수행하여 클러스터의 리소스를 관리합니다.

### kubectl 명령어 예시

```bash
kubectl get pods          # GET 요청 - 파드 목록 조회
kubectl create -f pod.yaml  # POST 요청 - 파드 생성
kubectl apply -f deploy.yaml  # PUT/PATCH 요청 - 리소스 업데이트
kubectl delete pod my-pod  # DELETE 요청 - 파드 삭제
```

## 동작 방식

- **REST API 호출:** Kubernetes API 서버 (kube-apiserver) 에 HTTP REST 요청을 전송
- **인증/인가:** kubeconfig 파일을 사용하여 클러스터 인증 및 권한 확인
- **리소스 관리:** Pod, Deployment, Service 등 Kubernetes 리소스 생성/조회/수정/삭제

### REST 호출 구조

```
kubectl → HTTPS REST API → kube-apiserver → etcd
```
