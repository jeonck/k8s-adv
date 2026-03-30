# 인증서 정보 확인 (2/2) - 암호화 검증

Root CA 인증서의 공개키를 이용한 암호화 검증을 실습합니다.

---

## 암호화 검증 개요

```
┌─────────────────────────────────────────────────────────────┐
│          암호화 검증 실습                                   │
└─────────────────────────────────────────────────────────────┘

목적:
  - Root CA 인증서에서 Public Key 추출
  - Public Key 로 데이터 암호화
  - 암호화된 데이터 전송
  - Private Key 로 복호화 (CA 만 가능)

시나리오:
  1. Root CA 공개키 추출
  2. 평문 파일 암호화
  3. 암호화된 파일 전달
  4. CA 개인키로만 복호화 가능
```

---

## 1. Root CA 공개키 추출

### 공개키 추출 명령어

```bash
# Root CA 인증서에서 공개키 추출
[root@k8s-cp ~]# openssl x509 -in /etc/kubernetes/pki/ca.crt \
  -pubkey -noout > ca.pub

# 추출된 공개키 확인
[root@k8s-cp ~]# cat ca.pub
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzgW7Nxo/TmOSYd6USkqw
~~~
SQIDAQAB
-----END PUBLIC KEY-----
```

---

## 2. Root CA 공개키로 텍스트 파일 암호화

### 평문 파일 생성

```bash
# 평문 파일 생성
[root@k8s-cp ~]# echo "Hello World" > hello.txt

# 파일 내용 확인
[root@k8s-cp ~]# cat hello.txt
Hello World
```

### 공개키로 암호화

```bash
# Root CA 공개키로 파일 암호화
[root@k8s-cp ~]# openssl pkeyutl -encrypt \
  -inkey ca.pub \
  -pubin \
  -in hello.txt \
  -out hello.enc

# 옵션 설명:
# -encrypt     : 암호화 모드
# -inkey ca.pub: 공개키 파일 지정
# -pubin       : 입력 키가 공개키임을 명시
# -in hello.txt: 암호화할 평문 파일
# -out hello.enc: 암호화된 출력 파일
```

### 암호화된 파일 확인

```bash
# 암호화된 파일 확인
[root@k8s-cp ~]# cat hello.enc
▒>i,f"▒;▒▒▒▒▒M;▒▒1▒...
# (이진 데이터 - 읽을 수 없음)
```

---

## 3. 암호화된 파일 전달

### ec2-user 에게 전달

```bash
# 암호화된 파일 복사
[root@k8s-cp ~]# cp hello.enc ~ec2-user/

# 전달 확인
[root@k8s-cp ~]# ls -la ~ec2-user/hello.enc
-rw-r--r-- 1 root root 256 Jan  1 00:00 /home/ec2-user/hello.enc
```

### ec2-user 는 복호화 불가

```bash
# ec2-user 으로 전환
[ec2-user@k8s-cp ~]$ ls -la hello.enc

# 복호화 시도 (실패 - 개인키 없음)
[ec2-user@k8s-cp ~]$ openssl pkeyutl -decrypt \
  -inkey ~/.ssh/id_rsa \
  -in hello.enc

# 오류: Key operation error: The input data is not valid
# ↑ SSH 개인키로는 복호화 불가!
```

**왜?**
- ec2-user 는 SSH 개인키만 가짐
- 복호화에는 Root CA 개인키 (`/etc/kubernetes/pki/ca.key`) 필요
- Root CA 개인키는 root 만 접근 가능 (chmod 600)

---

## 4. Root CA 개인키로 복호화 (검증)

### 개인키 위치 확인

```bash
# Root CA 개인키 확인 (root 만 접근 가능)
[root@k8s-cp ~]# ls -la /etc/kubernetes/pki/ca.key
-rw----- 1 root root 1675 Jan  1 00:00 /etc/kubernetes/pki/ca.key
```

### 복호화 수행

```bash
# Root CA 개인키로 복호화
[root@k8s-cp ~]# openssl pkeyutl -decrypt \
  -inkey /etc/kubernetes/pki/ca.key \
  -in hello.enc \
  -out hello.dec

# 복호화된 파일 확인
[root@k8s-cp ~]# cat hello.dec
Hello World

# 원본과 비교
[root@k8s-cp ~]# diff hello.txt hello.dec
# 출력 없음 = 동일함!
```

---

## 5. 암호화/복호화 흐름 정리

```
┌─────────────────────────────────────────────────────────────┐
│          암호화/복호화 전체 흐름                            │
└─────────────────────────────────────────────────────────────┘

1. Root CA 공개키 추출
   ca.crt → ca.pub (공개키)

2. 평문 파일 준비
   "Hello World" (12 바이트)

3. 공개키로 암호화
   hello.txt → hello.enc (256 바이트)

4. 암호화된 파일 전달
   ec2-user 에게 hello.enc 전달
   (ec2-user 는 복호화 불가)

5. Root CA 개인키로 복호화
   hello.enc → hello.dec ("Hello World" 복원)
```

### 키의 역할

```
┌─────────────────────────────────────────────────────────────┐
│          공개키 vs 개인키 역할                              │
└─────────────────────────────────────────────────────────────┘

공개키 (ca.pub):
  ✓ 암호화 전용
  ✓ 누구나 사용 가능
  ✓ 공개되어도 안전

개인키 (ca.key):
  ✓ 복호화 전용
  ✓ CA 만 보유
  ✓ 절대 공개 금지
  ✓ root 만 접근 가능 (chmod 600)
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 요약                                │
├─────────────────────────────────────────────────────────────┤
│  1. Root CA 공개키 추출                                     │
│     - openssl x509 -in ca.crt -pubkey -noout > ca.pub      │
│                                                             │
│  2. 공개키로 암호화                                         │
│     - openssl pkeyutl -encrypt -inkey ca.pub -pubin        │
│     - 평문 → 암호문 (256 바이트 고정 길이)                 │
│                                                             │
│  3. 암호화된 파일 전달                                      │
│     - ec2-user 에게 암호화된 파일 전달                     │
│     - ec2-user 는 복호화 불가 (개인키 없음)                │
│                                                             │
│  4. Root CA 개인키로 복호화                                 │
│     - openssl pkeyutl -decrypt -inkey ca.key               │
│     - 오직 CA 만 복호화 가능                               │
│                                                             │
│  5. RSA 암호화 원리                                         │
│     - 공개키로 암호화 → 개인키로 복호화                    │
│     - Kubernetes 도 이 원리로 인증서 서명/검증             │
│                                                             │
│  6. 보안성                                                  │
│     - 개인키 (ca.key) 는 root 만 접근 가능                 │
│     - ec2-user 는 절대 복호화 불가                         │
└─────────────────────────────────────────────────────────────┘
```

**RSA 공개키 암호화는 Root CA 공개키로 암호화하고, Root CA 개인키로만 복호화할 수 있습니다. 이 원리를 통해 Kubernetes 는 인증서 서명과 검증을 수행합니다.**
