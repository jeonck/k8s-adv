---
title: "Lab Environment Setup"
weight: 100
slug: "10-lab-environment"
---

## AWS EC2 Instances

- **User:** root user
- **Region:** Seoul region (ap-northeast-2)
- **VPC:** default VPC
- **Security group:** default security group

## EC2 Instance Specs

| Instance name | vCPU | Memory |
|------------|------|--------|
| k8s-cp | 2 | 8 GB |
| k8s-w1 | 2 | 4 GB |
| k8s-w2 | 2 | 4 GB |

## Issuing an Access Key

Issue an access key for the root user.

---

## Creating AWS Resources with Terraform

### Edit the variables.tf File

File location: `<lab-home>/lab-setup`

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

# In a corporate environment with multiple IAM accounts, enter your own ID
# Leave it empty if you use a personal AWS account
variable "identity" {
  default = ""
}
```

### Generate an SSH Key Pair

```bash
[<lab-home>/lab-setup]$ ssh-keygen -t rsa -f edukey -N ""
```

### Create the EC2 Resources

```bash
[<lab-home>/lab-setup]$ terraform apply --auto-approve
```

### Connect over SSH with MobaXterm

Connect using the private key (`edukey`).

---

## Preparing the Lab Environment

### Verify cloud-init Completion

```bash
[root@k8s-cp ~]# tail -f /var/log/cloud-init-output.log
Cloud-init v. 24.4-7.el9.0.1 finished at Sat, 21 Feb 2026 04:30:39 +0000. Datasource DataSourceEc2Local. Up 176.70 seconds
```

### Extract the Lab Files

```bash
[root@k8s-cp ~]# tar xf lab.tar
```

### Set Private Key Permissions

```bash
[root@k8s-cp ~]# chmod 400 ~/.ssh/id_rsa
```

### Verify SSH Access to k8s-w1

```bash
[root@k8s-cp ~]# ssh k8s-w1
...(omitted)...
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
[root@k8s-w1 ~]# exit
logout
Connection to k8s-w1 closed.
```

### Verify SSH Access to k8s-w2

```bash
[root@k8s-cp ~]# ssh k8s-w2
...(omitted)...
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
[root@k8s-w2 ~]# exit
logout
Connection to k8s-w2 closed.
```

---

## Joining the Worker Nodes to the Cluster

### Check the Node Status and Install the Calico CNI

```bash
[root@k8s-cp ~]# kubectl get no
NAME     STATUS     ROLES           AGE   VERSION
k8s-cp   NotReady   control-plane   6m12s v1.34.3

[root@k8s-cp ~]# curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.31.3/manifests/calico.yaml
[root@k8s-cp ~]# mv calico.yaml calico_v3.31.3.yaml
[root@k8s-cp ~]# kubectl apply -f calico_v3.31.3.yaml
```

### Generate the Join Command

```bash
[root@k8s-cp ~]# kubeadm token create --print-join-command
kubeadm join 172.31.1.10:6443 --token njseik.wna0odfa83txmr2l \
  --discovery-token-ca-cert-hash sha256:ce6b8504ea710f82aeea8bf3acadd82df870544134de6de1339f19a446c03a1f
```

### Perform the Join on k8s-w1

```bash
[root@k8s-cp ~]# ssh k8s-w1
[root@k8s-w1 ~]# kubeadm join 172.31.1.10:6443 --token njseik.wna0odfa83txmr2l \
  --discovery-token-ca-cert-hash sha256:ce6b8504ea710f82aeea8bf3acadd82df870544134de6de1339f19a446c03a1f
...(omitted)...
[root@k8s-w1 ~]# exit
```

### Perform the Join on k8s-w2

```bash
[root@k8s-cp ~]# ssh k8s-w2
[root@k8s-w2 ~]# kubeadm join 172.31.1.10:6443 --token njseik.wna0odfa83txmr2l \
  --discovery-token-ca-cert-hash sha256:ce6b8504ea710f82aeea8bf3acadd82df870544134de6de1339f19a446c03a1f
...(omitted)...
[root@k8s-w2 ~]# exit
```

### Verify the Cluster Nodes

```bash
[root@k8s-cp ~]# kubectl get no
NAME     STATUS   ROLES           AGE    VERSION
k8s-cp   Ready    control-plane   6m12s  v1.34.3
k8s-w1   Ready    <none>          77s    v1.34.3
k8s-w2   Ready    <none>          69s    v1.34.3
```
