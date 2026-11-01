---
cascade:
  type: docs
title: "Authentication and Security"
weight: 4
---

Starting from cryptography basics, learn step by step in 5 groups, through PKI and TLS and Kubernetes certificate operations, up to various authentication methods (client certificates, Webhook, OIDC).

1. **Cryptography and Security Fundamentals** — Keys, CA, PKI, TLS handshake
2. **K8s Security Architecture** — Authentication/authorization, API Server plugins
3. **Certificate Management and Practice** — Certificate locations, inspection, renewal
4. **Authentication Mechanism Labs** — mTLS, Webhook
5. **Enterprise IAM Integration** — OAuth 2.0, OIDC, Keycloak

## 1. Cryptography and Security Fundamentals (Foundation)

{{< cards >}}
  {{< card link="13-crypto-basic-keys" title="Symmetric and Asymmetric Keys - Fundamentals for Understanding Kubernetes Authentication" subtitle="Learn about symmetric and asymmetric keys, the basic concepts of cryptography, to understand Kubernetes authentication methods." >}}
  {{< card link="14-ca-and-root-ca" title="Certificate Authorities: Root CA and CA" subtitle="Learn about Certificate Authorities (CAs) to understand the Kubernetes API Server certificate." >}}
  {{< card link="15-pki-and-x509" title="PKI and X.509 Certificates" subtitle="Learn about Public Key Infrastructure (PKI) and X.509 certificates." >}}
  {{< card link="16-csr-and-workflow" title="CSR (Certificate Signing Request) and Certificate Requests" subtitle="Learn about creating a CSR and the certificate request process for issuing certificates." >}}
  {{< card link="17-ssl-handshake-process" title="SSL/TLS Operation Procedure" subtitle="How SSL/TLS works and the hybrid encryption approach" >}}
  {{< card link="18-cert-trust-chain" title="Trusted Communication Procedure Using Certificates" subtitle="A step-by-step explanation of how certificates guarantee secure communication." >}}
{{< /cards >}}

## 2. K8s Security Architecture (Architecture)

{{< cards >}}
  {{< card link="19-k8s-security-overview" title="Authentication and Authorization" subtitle="Learn about authentication (Authentication) and authorization (Authorization), the core concepts of Kubernetes security." >}}
  {{< card link="20-api-server-auth-plugins" title="API Server Request Processing Plugins" subtitle="The 3 stages of API Server request processing: Authentication · Authorization · Admission Control" >}}
  {{< card link="21-user-vs-serviceaccount" title="Machine Users and Human Users in Kubernetes" subtitle="In Kubernetes, users (User) are divided into Human Users (people) and Machine Users (machines/services)." >}}
{{< /cards >}}

## 3. Certificate Management and Practice (Operation)

{{< cards >}}
  {{< card link="22-k8s-root-ca-internal" title="The Role of the Root CA in Kubernetes" subtitle="A Kubernetes cluster operates as its own Root CA, issuing and managing all certificates inside the cluster." >}}
  {{< card link="23-k8s-cert-file-locations" title="Where Kubernetes Certificates Are Stored" subtitle="Learn where certificates are stored in a Kubernetes cluster and how to manage them." >}}
  {{< card link="24-kubeadm-cert-management" title="kubeadm init Certificate Generation Lab" subtitle="The main items used when initializing a cluster" >}}
  {{< card link="25-static-pod-auth-config" title="Static Pods and the API Server" subtitle="Learn about the concept of Static Pods, their relationship with the API Server, and how control plane components are started." >}}
  {{< card link="26-inspect-cert-info-1" title="Inspecting Certificate Information (1/2) - Root CA and API Server" subtitle="Inspect the information in the Root CA certificate and the certificate files used by the API Server in a Kubernetes cluster." >}}
  {{< card link="27-inspect-cert-info-2" title="Inspecting Certificate Information (2/2) - Encryption Verification" subtitle="Hands-on practice with encryption verification using the public key of the Root CA certificate." >}}
  {{< card link="28-cert-expiration-and-renew" title="Checking Certificate Expiration and ConfigMap Information" subtitle="Check the certificate expiration dates of a Kubernetes cluster and learn about the kubeadm-config ConfigMap." >}}
{{< /cards >}}

## 4. Authentication Mechanism Labs (Implementation)

{{< cards >}}
  {{< card link="29-client-cert-auth-concept" title="How to Connect to the Kubernetes API Server with Certificates" subtitle="Explains X.509 certificate-based authentication for securely connecting to the Kubernetes API Server." >}}
  {{< card link="30-mtls-communication" title="Mutual TLS Authentication (mTLS)" subtitle="Learn about mutual TLS authentication (mTLS), the foundation of communication inside a Kubernetes cluster." >}}
  {{< card link="31-lab-client-cert-auth" title="Kubernetes Client Certificate Authentication Lab" subtitle="A lab on building a certificate-based environment so that a regular user (honggildong) can work only in their own namespace." >}}
  {{< card link="32-http-basic-auth-deprecated" title="HTTP Basic Authentication" subtitle="Learn about the concept and characteristics of HTTP Basic Authentication (Basic Auth)." >}}
  {{< card link="33-webhook-token-auth-concept" title="API Server Webhook Token Authentication" subtitle="Learn about Webhook Token Authentication in the Kubernetes API Server." >}}
  {{< card link="34-lab-webhook-auth-setup" title="Procedure for Switching the API Server Authentication Plugin to Webhook Authentication" subtitle="A lab procedure for switching the Kubernetes API server authentication method to one based on an external Webhook server." >}}
{{< /cards >}}

## 5. Enterprise IAM Integration (Advanced)

{{< cards >}}
  {{< card link="35-lab-multi-cluster-config" title="Multi-Cluster Access Configuration Lab" subtitle="Practice managing and switching between multiple independent Kubernetes clusters with a single kubectl tool." >}}
  {{< card link="36-oauth2-fundamentals" title="OAuth 2.0 Concepts" subtitle="OAuth 2.0 is the most widely used authorization (Authorization) framework in modern web and mobile environments." >}}
  {{< card link="37-oidc-on-kubernetes" title="OpenID Connect (OIDC) Concepts" subtitle="OpenID Connect (OIDC) is a modern authentication standard that adds an identity (Identity) layer on top of the OAuth 2.0 protocol." >}}
  {{< card link="38-keycloak-setup-guide" title="Keycloak: An Open-Source IAM Solution" subtitle="An introduction to and installation of Keycloak, an open-source IAM that implements OIDC/OAuth 2.0" >}}
  {{< card link="39-lab-k8s-keycloak-oidc" title="Adding Keycloak OIDC Configuration to the API Server" subtitle="A lab on integrating the Kubernetes API server with Keycloak, an external IAM solution, to enable OpenID Connect (OIDC) authentication." >}}
{{< /cards >}}
