---
title: "Certificate Authorities: Root CA and CA"
weight: 140
slug: "14-ca-and-root-ca"
---

Learn about Certificate Authorities (CAs) to understand the Kubernetes API Server certificate.

---

## Public Key Distribution and the Encryption Process

### 1. Does the receiver publish its public key?

Yes. A public key (Public Key) can, quite literally, be known to anyone.

- **For websites:** A web server (the receiver) distributes a certificate containing its public key to every user who connects, either in advance or immediately on request.
- **For individuals:** They register their public key on a key server or attach it to email signatures, so that others can retrieve and use it at any time.

### 2. Encryption → Decryption Process

```mermaid
sequenceDiagram
    participant S as "Receiver"
    participant R as "Sender"
    
    Note over S: Step 1: Generate key pair (public/private key)
    S->>R: Step 2: Distribute public key (publish to the world)
    Note over R: Step 3: Encrypt data with the receiver's public key
    R->>S: Step 4: Send encrypted data
    Note over S: Step 5: Decrypt data with private key (read the plaintext)
```

### 3. Hybrid Approach: Symmetric Key + Asymmetric Key

The reason asymmetric keys alone are not used is that they are 100-1000 times slower than symmetric keys, making them unsuitable for encrypting large amounts of data.

```mermaid
sequenceDiagram
    participant S as "Receiver"
    participant R as "Sender"
    
    Note over R: Step 1: Generate symmetric key (Session Key)
    Note over R: Step 2: Encrypt the symmetric key with the receiver's public key
    R->>S: Send encrypted symmetric key
    Note over S: Step 3: Decrypt the symmetric key with own private key
    Note over R,S: Step 4: High-speed encrypted communication with the shared symmetric key
```

---

## Digital Signature

### 1. Do you sign with the private key?

Yes. A digital signature is created with your own **Private Key**.

- **Encryption:** When others send to me (uses the receiver's public key)
- **Signing:** When I send to others (uses the sender's private key)

### 2. Signing and Verification Process

```mermaid
flowchart TD
    subgraph "Sender"
    D1["Original data"] --> H1["Hash function"]
    H1 --> HV1["Hash value"]
    HV1 --> S_SIG["Create signature - sender's private key"]
    end
    
    subgraph "Receiver"
    D2["Received data"] --> H2["Hash function"]
    H2 --> HV2["Hash value 1"]
    S_SIG -- "Pass signature" --> V["Verify signature - sender's public key"]
    V --> HV3["Hash value 2"]
    HV2 == "Compare" ==> HV3
    end
```

### 3. Purpose of Digital Signatures

- **Authentication:** Confirm who the sender is
- **Integrity:** Confirm the data was not forged or tampered with in transit
- **Non-repudiation:** The sender cannot deny having sent it

---

## Digital Certificate

### 1. The Problem of Public Key Trustworthiness

The biggest weakness of the asymmetric key approach is the question: **"Is this public key really Bob's?"** A hacker could impersonate Bob and give Alice their own public key.

### 2. The Role of a Certificate

A certificate is a document in which a **"trusted third party (CA)"** vouches for who owns a public key.

```mermaid
graph LR
    A["User"] -- "Is this public key genuine?" --> B("Digital certificate")
    B -- "Yes, I vouch for it" --> C["Certificate Authority (CA)"]
```

### 3. Components of a Certificate

| Item | Description |
|------|-------------|
| **Subject information** | Name, organization, domain, etc. |
| **Subject public key** | The public key used for encryption/verification |
| **Issuer information** | Information about the CA that issued the certificate |
| **Validity period** | Start and expiration dates |
| **Digital signature** | A signature created with the issuer's (CA's) private key |

---

## CA (Certificate Authority)

### 1. Definition of a CA

A Certificate Authority (CA) is a trusted organization that issues and manages digital certificates.

### 2. Root CA and Subordinate CA (Intermediate CA)

CAs form a hierarchy to build a chain of trust.

```mermaid
graph TD
    Root["Root CA - top-level authority"] --> Sub1["Intermediate CA 1"]
    Root --> Sub2["Intermediate CA 2"]
    Sub1 --> Cert1["User certificate A"]
    Sub1 --> Cert2["User certificate B"]
    Sub2 --> Cert3["Server certificate C"]
```

- **Root CA:** The top-level certificate authority that vouches for itself (Self-signed)
- **Intermediate CA:** A subordinate certificate authority to which the Root CA has delegated authority

### 3. Chain of Trust

The reason we can trust a website is that the following chain is connected.

1.  The browser has the **Root CA's public key** built in in advance
2.  The browser verifies the **subordinate CA's certificate** with the Root CA's public key
3.  The browser verifies the **website's certificate** with the verified subordinate CA's public key

---

## CAs in Kubernetes

Kubernetes builds and uses its own CA hierarchy to secure communication inside the cluster.

- **kube-ca:** The root of trust for the entire cluster
- **etcd-ca:** A dedicated CA for securing etcd communication
- **front-proxy-ca:** A CA for API Server proxy authentication

**Understanding the structure of certificates and CAs lets you clearly grasp Kubernetes' complex communication security settings.**
