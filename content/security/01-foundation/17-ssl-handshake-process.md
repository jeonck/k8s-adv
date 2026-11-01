---
title: "How SSL/TLS Works"
weight: 170
slug: "17-ssl-handshake-process"
---

A detailed explanation of how SSL (Secure Sockets Layer) and TLS (Transport Layer Security) work, including the hybrid encryption scheme.

---

## 1. Core Concept: Hybrid Encryption

SSL/TLS, the foundation of modern internet security, uses a **hybrid scheme** that combines the strengths of asymmetric and symmetric keys.

### Symmetric vs Asymmetric Key Comparison

| Category | Symmetric Key (AES, etc.) | Asymmetric Key (RSA, etc.) |
|------|-----------------|-------------------|
| **Speed** | **Very fast** (about 1000x) | Relatively slow |
| **Security** | Risk of interception during key delivery | Solves the key delivery problem (public-key based) |
| **Number of keys** | Grows rapidly as users increase (n(n-1)/2) | Only 1 key pair per user |
| **Main use** | **Encrypting actual data** | **Key exchange and identity verification** |

---

## 2. How Hybrid Encryption Works

The slow asymmetric key is used only for the initial connection; once a secure encrypted channel is established, it switches to the fast symmetric key.

```mermaid
graph TD
    subgraph Handshake_Phase["Handshake phase: uses asymmetric keys"]
    A[Certificate exchange and verification] --> B[Securely exchange the key secret]
    B --> C[Both sides generate the same session key]
    end
    
    subgraph Data_Phase["Data transfer phase: uses symmetric keys"]
    C --> D[Encrypted HTTP data transfer]
    D --> E[High-speed bulk data processing]
    end
    
    style Handshake_Phase fill:#f9f,stroke:#333
    style Data_Phase fill:#dfd,stroke:#333
```

### Understanding Through an Analogy
- **Asymmetric key:** An **armored vehicle** that transports the key (the symmetric key) to the vault (slow but extremely secure)
- **Symmetric key:** An **ordinary truck** that hauls cargo locked with that key (fast and efficient)

---

## 3. Why Is a Hybrid Approach Needed?

| Scenario | Problem | Result |
|----------|--------|------|
| **Using only symmetric keys** | The key can be intercepted by a hacker while being delivered | All communication content exposed |
| **Using only asymmetric keys** | Computation is too complex, so transferring large files is very slow | Practical web browsing impossible |
| **Using the hybrid approach** | Exchange keys safely with asymmetric keys, then communicate quickly with symmetric keys | **Both security and speed are achieved** |

---

## 4. History of SSL and TLS

SSL was originally developed by Netscape, and TLS is its standardized successor. Today, the security-hardened **TLS 1.2** and **TLS 1.3** are the ones mainly in use.

- **SSL 3.0 (1996):** Deprecated due to vulnerabilities
- **TLS 1.2 (2008):** The most widely used standard version today (2 RTT)
- **TLS 1.3 (2018):** The latest version, with stronger security and improved speed (1 RTT)

---

## 5. Detailed TLS Handshake Procedure

### TLS 1.2 Handshake (Traditional)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant S as Server

    Note over C,S: TCP connection complete (SYN, SYN-ACK, ACK)

    C->>S: ClientHello (TLS 1.2, Random, Cipher Suites)
    S->>C: ServerHello (TLS 1.2, Random, Selected Cipher)
    S->>C: Certificate (server certificate & CA chain)
    S->>C: ServerKeyExchange (DHE/ECDHE parameters)
    S->>C: ServerHelloDone

    C->>S: ClientKeyExchange (encrypted Premaster Secret)
    C->>S: ChangeCipherSpec (encrypting from now on!)
    C->>S: Finished (handshake verification)

    S->>C: ChangeCipherSpec (I'm encrypting too!)
    S->>C: Finished (handshake verification)

    Note over C,S: Handshake complete (2 RTT)
    C<->>S: Application Data (encrypted communication begins)
```

### TLS 1.3 Handshake (Latest, Simplified)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant S as Server

    Note over C,S: TCP connection complete

    C->>S: ClientHello (TLS 1.3, Random, Key Share)
    S->>C: ServerHello (Selected Cipher, Key Share)
    S->>C: Certificate & CertificateVerify
    S->>C: Finished
    
    C->>S: Finished

    Note over C,S: Handshake complete (1 RTT!)
    C<->>S: Application Data (encrypted communication begins)
```

---

## 6. Summary

SSL/TLS is a clever secure communication method that combines the **safety of asymmetric keys** with the **efficiency of symmetric keys**. Through this process, we can use the internet and the Kubernetes API with encrypted, authenticated connections.
