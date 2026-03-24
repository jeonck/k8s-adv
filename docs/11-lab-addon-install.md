# Add-on 컴포넌트 설치

Kubernetes 클러스터에 필수 Add-on 컴포넌트를 설치합니다.

## 1. Add-on 구성 파일 확인

```bash
[root@k8s-cp ~]# tree -L 2 ~/lab/add-on
/root/add-on
├── 01_metric-server
│   └── components.yaml
├── 02_dashboard
│   ├── dashboard-adminuser.yaml
│   └── kubernetes-dashboard.yaml
├── 03_metal-LB
│   ├── metallb-ippool.yaml
│   ├── metallb-l2advertisement.yaml
│   └── metallb-native.yaml
├── 04_ingress
│   └── ingress-nginx.yaml
└── 05_nfs-subdir-external-provisioner
    └── deploy
6 directories, 7 files
```

## 2. Metric Server 설치

Metric Server 는 클러스터 리소스 사용량 정보를 수집합니다.

```bash
# 설치
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/01_metric-server/components.yaml

# 설치 확인
[root@k8s-cp ~]# kubectl get pods -n kube-system | grep metrics-server
metrics-server-xxxxxxxxxx-xxxxx   1/1   Running   0   30s

# 노드 리소스 확인
[root@k8s-cp ~]# kubectl top nodes
NAME     CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
k8s-cp   250m         12%    2048Mi          51%
k8s-w1   180m         9%     1536Mi          38%
k8s-w2   160m         8%     1420Mi          35%
```

## 3. Kubernetes Dashboard 설치

웹 기반 UI 를 제공합니다.

```bash
# Dashboard 설치
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/02_dashboard/kubernetes-dashboard.yaml

# 관리자 사용자 생성
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/02_dashboard/dashboard-adminuser.yaml

# 토큰 발급
[root@k8s-cp ~]# kubectl -n kubernetes-dashboard create token admin-user
eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50...

# Dashboard 접속
[root@k8s-cp ~]# kubectl proxy
Starting to serve on 127.0.0.1:8001

# 브라우저에서 접속
http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## 4. MetalLB 설치

베어메탈 환경에서 LoadBalancer 타입 Service 를 지원합니다.

```bash
# MetalLB 설치
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/03_metal-LB/metallb-native.yaml

# MetalLB 설정 대기
[root@k8s-cp ~]# kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=component=controller \
  --timeout=120s

# IP Pool 설정 (클러스터 네트워크에 맞게 수정)
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/03_metal-LB/metallb-ippool.yaml

# L2 Advertisement 설정
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/03_metal-LB/metallb-l2advertisement.yaml

# 설치 확인
[root@k8s-cp ~]# kubectl get pods -n metallb-system
NAME                          READY   STATUS    RESTARTS   AGE
controller-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
speaker-xxxxx                 1/1     Running   0          2m
```

## 5. Ingress Controller 설치

외부 트래픽을 클러스터 내부 Service 로 라우팅합니다.

```bash
# Ingress Controller 설치
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/04_ingress/ingress-nginx.yaml

# 설치 확인
[root@k8s-cp ~]# kubectl get pods -n ingress-nginx
NAME                                        READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
ingress-nginx-defaultbackend-xxxxxxxxxx     1/1     Running   0          1m

# LoadBalancer IP 확인
[root@k8s-cp ~]# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.96.xxx.xxx   192.168.x.x   80:30xxx/TCP,443:30xxx/TCP   1m
```

## 6. NFS Subdir External Provisioner 설치

NFS 를 사용한 동적 볼륨 프로비저닝을 제공합니다.

```bash
# NFS Provisioner 설치
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/05_nfs-subdir-external-provisioner/deploy/

# StorageClass 확인
[root@k8s-cp ~]# kubectl get sc
NAME                    PROVISIONER                                     RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-client (default)    k8s-sigs.io/nfs-subdir-external-provisioner     Delete          Immediate           true                   30s

# PVC 테스트
[root@k8s-cp ~]# cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-test-claim
spec:
  storageClassName: nfs-client
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
EOF

# PVC 상태 확인
[root@k8s-cp ~]# kubectl get pvc
NAME             STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
nfs-test-claim   Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   1Gi        RWX            nfs-client     10s
```

## 7. 전체 Add-on 상태 확인

```bash
[root@k8s-cp ~]# kubectl get pods -A | grep -E 'metric|dashboard|metallb|ingress|nfs'

# 예상 출력 예시
kube-system           metrics-server-xxxxxxxxxx-xxxxx       1/1   Running   0   5m
kubernetes-dashboard  kubernetes-dashboard-xxxxxxxxxx       1/1   Running   0   4m
metallb-system        controller-xxxxxxxxxx-xxxxx           1/1   Running   0   3m
metallb-system        speaker-xxxxx                         1/1   Running   0   3m
ingress-nginx         ingress-nginx-controller-xxxxxxxxx    1/1   Running   0   2m
default               nfs-subdir-external-provisioner-xx    1/1   Running   0   1m
```

## 실습 정리

| Add-on | 목적 | 네임스페이스 |
|--------|------|--------------|
| Metric Server | 리소스 사용량 수집 (kubectl top) | kube-system |
| Dashboard | 웹 기반 UI | kubernetes-dashboard |
| MetalLB | LoadBalancer 지원 (베어메탈) | metallb-system |
| Ingress Controller | HTTP/S 트래픽 라우팅 | ingress-nginx |
| NFS Provisioner | 동적 NFS 볼륨 공급 | default |
