---
title: "Installing Add-on Components"
weight: 110
slug: "11-lab-addon-install"
---

Install the essential Add-on components on the Kubernetes cluster.

## 1. Check the Add-on Configuration Files

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

## 2. Install Metric Server

Metric Server collects cluster resource usage information.

```bash
# Install
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/01_metric-server/components.yaml

# Verify the installation
[root@k8s-cp ~]# kubectl get pods -n kube-system | grep metrics-server
metrics-server-xxxxxxxxxx-xxxxx   1/1   Running   0   30s

# Check node resources
[root@k8s-cp ~]# kubectl top nodes
NAME     CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
k8s-cp   250m         12%    2048Mi          51%
k8s-w1   180m         9%     1536Mi          38%
k8s-w2   160m         8%     1420Mi          35%
```

## 3. Install Kubernetes Dashboard

Provides a web-based UI.

```bash
# Install Dashboard
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/02_dashboard/kubernetes-dashboard.yaml

# Create an admin user
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/02_dashboard/dashboard-adminuser.yaml

# Issue a token
[root@k8s-cp ~]# kubectl -n kubernetes-dashboard create token admin-user
eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50...

# Access the Dashboard
[root@k8s-cp ~]# kubectl proxy
Starting to serve on 127.0.0.1:8001

# Access from a browser
http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## 4. Install MetalLB

Supports LoadBalancer-type Services in bare-metal environments.

```bash
# Install MetalLB
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/03_metal-LB/metallb-native.yaml

# Wait for MetalLB to be ready
[root@k8s-cp ~]# kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=component=controller \
  --timeout=120s

# Configure the IP Pool (adjust to match your cluster network)
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/03_metal-LB/metallb-ippool.yaml

# Configure the L2 Advertisement
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/03_metal-LB/metallb-l2advertisement.yaml

# Verify the installation
[root@k8s-cp ~]# kubectl get pods -n metallb-system
NAME                          READY   STATUS    RESTARTS   AGE
controller-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
speaker-xxxxx                 1/1     Running   0          2m
```

## 5. Install the Ingress Controller

Routes external traffic to Services inside the cluster.

```bash
# Install the Ingress Controller
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/04_ingress/ingress-nginx.yaml

# Verify the installation
[root@k8s-cp ~]# kubectl get pods -n ingress-nginx
NAME                                        READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
ingress-nginx-defaultbackend-xxxxxxxxxx     1/1     Running   0          1m

# Check the LoadBalancer IP
[root@k8s-cp ~]# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.96.xxx.xxx   192.168.x.x   80:30xxx/TCP,443:30xxx/TCP   1m
```

## 6. Install the NFS Subdir External Provisioner

Provides dynamic volume provisioning using NFS.

```bash
# Install the NFS Provisioner
[root@k8s-cp ~]# kubectl apply -f ~/lab/add-on/05_nfs-subdir-external-provisioner/deploy/

# Check the StorageClass
[root@k8s-cp ~]# kubectl get sc
NAME                    PROVISIONER                                     RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-client (default)    k8s-sigs.io/nfs-subdir-external-provisioner     Delete          Immediate           true                   30s

# Test with a PVC
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
