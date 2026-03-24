# 실습 환경 구성

## AWS EC2 인스턴스

- **사용자:** 루트 사용자 (root)
- **리전:** 서울 리전 (ap-northeast-2)
- **VPC:** default VPC
- **Security Group:** default Security Group

## EC2 인스턴스 스펙

| 인스턴스명 | vCPU | Memory |
|------------|------|--------|
| k8s-cp | 2 | 8 GB |
| k8s-w1 | 2 | 4 GB |
| k8s-w2 | 2 | 4 GB |

## 액세스 키 발급

"root 사용자" 액세스 키 발급이 필요합니다.

---

## 테라폼을 이용한 AWS 리소스 생성

### variables.tf 파일 수정

파일 위치: `<실습홈>/lab-setup`

```hcl
variable "aws_region" {
  default = "ap-northeast-2"
}

variable "access_key" {
  default = ""
}

variable "secret_key" {
  default = ""
}

# 기업환경에서 여러 IAM 계정을 이용할 때 본인 ID 입력
# 개인 AWS 계정을 사용할때는 비워 놓으면 됨
variable "identity" {
  default = ""
}
```

### SSH Key-Pair 생성

```bash
[<실습홈>/lab-setup]$ ssh-keygen -t rsa -f edukey -N ""
```

### EC2 리소스 생성

```bash
[<실습홈>/lab-setup]$ terraform apply --auto-approve
```

### MobaXterm 을 이용한 SSH 접속

Private key(`edukey`) 를 이용하여 접속합니다.

---

## 실습환경 준비

### Cloud-init 완료 확인

```bash
[root@k8s-cp ~]# tail -f /var/log/cloud-init-output.log
Cloud-init v. 24.4-7.el9.0.1 finished at Sat, 21 Feb 2026 04:30:39 +0000. Datasource DataSourceEc2Local. Up 176.70 seconds
```

### 실습파일 압축 해제

```bash
[root@k8s-cp ~]# tar xf lab.tar
```

### Private Key 권한 설정

```bash
[root@k8s-cp ~]# chmod 400 ~/.ssh/id_rsa
```

### k8s-w1 SSH 접속 확인

```bash
[root@k8s-cp ~]# ssh k8s-w1
...(생략)...
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
[root@k8s-w1 ~]# exit
logout
Connection to k8s-w1 closed.
```

### k8s-w2 SSH 접속 확인

```bash
[root@k8s-cp ~]# ssh k8s-w2
...(생략)...
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
[root@k8s-w2 ~]# exit
logout
Connection to k8s-w2 closed.
```

---

## Worker Node 를 클러스터에 조인

### 클러스터 노드 정보 확인 및 Calico CNI 구성

```bash
[root@k8s-cp ~]# kubectl get no
NAME     STATUS     ROLES           AGE   VERSION
k8s-cp   NotReady   control-plane   6m12s v1.34.3

[root@k8s-cp ~]# curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.31.3/manifests/calico.yaml
[root@k8s-cp ~]# mv calico.yaml calico_v3.31.3.yaml
[root@k8s-cp ~]# kubectl apply -f calico_v3.31.3.yaml
```

### 조인 명령어 생성

```bash
[root@k8s-cp ~]# kubeadm token create --print-join-command
kubeadm join 172.31.1.10:6443 --token njseik.wna0odfa83txmr2l \
  --discovery-token-ca-cert-hash sha256:ce6b8504ea710f82aeea8bf3acadd82df870544134de6de1339f19a446c03a1f
```

### k8s-w1 에서 조인 수행

```bash
[root@k8s-cp ~]# ssh k8s-w1
[root@k8s-w1 ~]# kubeadm join 172.31.1.10:6443 --token njseik.wna0odfa83txmr2l \
  --discovery-token-ca-cert-hash sha256:ce6b8504ea710f82aeea8bf3acadd82df870544134de6de1339f19a446c03a1f
...(생략)...
[root@k8s-w1 ~]# exit
```

### k8s-w2 에서 조인 수행

```bash
[root@k8s-cp ~]# ssh k8s-w2
[root@k8s-w2 ~]# kubeadm join 172.31.1.10:6443 --token njseik.wna0odfa83txmr2l \
  --discovery-token-ca-cert-hash sha256:ce6b8504ea710f82aeea8bf3acadd82df870544134de6de1339f19a446c03a1f
...(생략)...
[root@k8s-w2 ~]# exit
```

### 클러스터 노드 정보 확인

```bash
[root@k8s-cp ~]# kubectl get no
NAME     STATUS   ROLES           AGE    VERSION
k8s-cp   Ready    control-plane   6m12s  v1.34.3
k8s-w1   Ready    <none>          77s    v1.34.3
k8s-w2   Ready    <none>          69s    v1.34.3
```
