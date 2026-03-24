# Prometheus Operator 와 Grafana Operator 설치 실습

실제 Operator 를 설치하고 사용하는 실습 가이드입니다.

---

## 개요

```
┌─────────────────────────────────────────────────────────────┐
│          Prometheus Operator + Grafana Operator             │
└─────────────────────────────────────────────────────────────┘

목적:
  - Kubernetes 에서 모니터링 시스템 구축
  - Operator 를 통한 자동화된 관리
  - 메트릭 수집 (Prometheus) + 시각화 (Grafana)

구성 요소:
  ┌─────────────────────────────────────────┐
  │  Prometheus Operator                    │
  │  - Prometheus 서버 자동 관리            │
  │  - ServiceMonitor 로 자동 타겟 발견     │
  │  - Alertmanager 관리                    │
  │                                         │
  │  Grafana Operator                       │
  │  - Grafana 인스턴스 자동 관리           │
  │  - DataSource 자동 설정                 │
  │  - Dashboard 자동 프로비저닝            │
  └─────────────────────────────────────────┘

전체 흐름:
  애플리케이션 → ServiceMonitor → Prometheus → Grafana
```

---

## 1 단계: 네임스페이스 생성

```bash
# 모니터링용 네임스페이스 생성
kubectl create namespace monitoring

# 확인
kubectl get namespaces | grep monitoring
# NAME          STATUS   AGE
# monitoring    Active   10s
```

---

## 2 단계: Prometheus Operator 설치

### 방법 1: Helm 차트 사용 (권장)

```bash
# Prometheus Community Helm 차트 저장소 추가
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# kube-prometheus-stack 설치 (Prometheus Operator 포함)
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.service.type=ClusterIP \
  --set grafana.service.type=ClusterIP \
  --set alertmanager.service.type=ClusterIP

# 출력:
# NAME: prometheus
# LAST DEPLOYED: Mon Jan 15 10:00:00 2024
# NAMESPACE: monitoring
# STATUS: deployed
# REVISION: 1
```

### 방법 2: Operator SDK 로 직접 설치

```bash
# Prometheus Operator GitHub 에서 매니페스트 다운로드
PROMETHEUS_VERSION="v0.70.0"

# Operator 설치
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/${PROMETHEUS_VERSION}/bundle.yaml

# 확인
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-operator
# NAME                                   READY   STATUS    RESTARTS   AGE
# prometheus-operator-6d4f5b6c7d-abc12   1/1     Running   0          1m
```

### Prometheus Operator 확인

```bash
# Operator Pod 확인
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-operator

# CRD 확인
kubectl get crd | grep prometheus
# 출력:
# alertmanagers.monitoring.coreos.com
# podmonitors.monitoring.coreos.com
# prometheuses.monitoring.coreos.com
# prometheusrules.monitoring.coreos.com
# servicemonitors.monitoring.coreos.com
# thanosrulers.monitoring.coreos.com

# Operator 로그 확인
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus-operator
```

---

## 3 단계: Prometheus 인스턴스 생성

### Prometheus CR 생성

```yaml
# prometheus-instance.yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: k8s
  namespace: monitoring
  labels:
    app: prometheus
spec:
  # Prometheus 버전
  version: v2.47.0
  
  # 리소스 설정
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  
  # 저장소 설정
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: standard
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
  
  # ServiceMonitor 선택
  serviceMonitorSelector:
    matchLabels:
      release: prometheus
  
  # PodMonitor 선택
  podMonitorSelector: {}
  
  # Prometheus 규칙
  ruleSelector: {}
  
  # 서비스 포트
  portName: web-http
  
  # 레플리카 수
  replicas: 1
  
  # 보안 컨텍스트
  securityContext:
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
```

```bash
# Prometheus 인스턴스 생성
kubectl apply -f prometheus-instance.yaml

# 확인
kubectl get prometheus -n monitoring
# NAME   VERSION   REPLICAS   READY   AGE
# k8s    v2.47.0   1          1       10s

# Prometheus Pod 확인
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
# NAME                        READY   STATUS    RESTARTS   AGE
# prometheus-k8s-0            2/2     Running   0          1m
```

### Prometheus Service 노출

```yaml
# prometheus-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus-service
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
    - name: web
      port: 9090
      targetPort: web-http
  selector:
    app.kubernetes.io/name: prometheus
```

```bash
# Service 생성
kubectl apply -f prometheus-service.yaml

# 포트포워딩으로 접근
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090

# 브라우저에서 접속
# http://localhost:9090
```

---

## 4 단계: ServiceMonitor 생성 (자동 타겟 발견)

### Kubernetes 컴포넌트 모니터링

```yaml
# servicemonitor-kubelet.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubelet
  namespace: monitoring
  labels:
    release: prometheus
spec:
  endpoints:
    - bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      honorLabels: true
      interval: 30s
      port: https-metrics
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
  jobLabel: k8s
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      k8s-app: kubelet
```

```bash
# ServiceMonitor 생성
kubectl apply -f servicemonitor-kubelet.yaml

# 확인
kubectl get servicemonitor -n monitoring
# NAME      AGE
# kubelet   10s
```

### 애플리케이션 모니터링

```yaml
# myapp-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp
  namespace: default
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: myapp
  namespaceSelector:
    matchNames:
      - default
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

```bash
# 애플리케이션 ServiceMonitor 생성
kubectl apply -f myapp-servicemonitor.yaml

# Prometheus 타겟 확인
# http://localhost:9090/targets
# myapp 타겟이 표시되어야 함
```

---

## 5 단계: Grafana Operator 설치

### Grafana Operator Helm 차트 설치

```bash
# Grafana Operator Helm 차트 저장소 추가
helm repo add grafana-operator https://grafana-operator.github.io/grafana-operator/helm-charts
helm repo update

# Grafana Operator 설치
helm install grafana-operator grafana-operator/grafana-operator \
  --namespace monitoring \
  --set rbac.create=true

# 출력:
# NAME: grafana-operator
# LAST DEPLOYED: Mon Jan 15 10:05:00 2024
# NAMESPACE: monitoring
# STATUS: deployed
# REVISION: 1
```

### Grafana Operator 확인

```bash
# Operator Pod 확인
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana-operator
# NAME                                READY   STATUS    RESTARTS   AGE
# grafana-operator-6d4f5b6c7d-abc12   1/1     Running   0          1m

# CRD 확인
kubectl get crd | grep grafana
# 출력:
# grafanas.integreatly.org
# grafanadashboards.integreatly.org
# grafanadatasources.integreatly.org
# grafanafolders.integreatly.org
# grafanaalertgroups.integreatly.org
```

---

## 6 단계: Grafana 인스턴스 생성

### Grafana CR 생성

```yaml
# grafana-instance.yaml
apiVersion: integreatly.org/v1beta1
kind: Grafana
metadata:
  name: grafana
  namespace: monitoring
  labels:
    app: grafana
spec:
  # 배포 설정
  deployment:
    replicas: 1
  
  # 리소스 설정
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  
  # 서비스 설정
  service:
    type: ClusterIP
  
  # ingress 설정 (선택)
  ingress:
    enabled: false
    # enabled: true
    # host: grafana.example.com
    # path: /
  
  # config 설정
  config:
    log:
      mode: console
    auth:
      disable_login_form: "false"
    security:
      admin_user: admin
      admin_password: admin123  # 실제 운영에서는 Secret 사용!
  
  # 대시보드 설정
  dashboardLabelSelector:
    - matchExpressions:
        - key: app
          operator: In
          values:
            - grafana
```

```bash
# Grafana 인스턴스 생성
kubectl apply -f grafana-instance.yaml

# 확인
kubectl get grafana -n monitoring
# NAME      AGE
# grafana   10s

# Grafana Pod 확인
kubectl get pods -n monitoring -l app=grafana
# NAME                       READY   STATUS    RESTARTS   AGE
# grafana-6d4f5b6c7d-abc12   1/1     Running   0          1m
```

### Grafana Service 노출

```yaml
# grafana-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: grafana-service
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 3000
      targetPort: 3000
  selector:
    app: grafana
```

```bash
# Service 생성
kubectl apply -f grafana-service.yaml

# 포트포워딩으로 접근
kubectl port-forward -n monitoring svc/grafana-service 3000:3000

# 브라우저에서 접속
# http://localhost:3000
# 로그인: admin / admin123
```

---

## 7 단계: DataSource 설정 (Prometheus 연결)

### GrafanaDataSource CR 생성

```yaml
# grafana-datasource.yaml
apiVersion: integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: prometheus-datasource
  namespace: monitoring
  labels:
    app: grafana
spec:
  # 어떤 Grafana 인스턴스에 적용할지
  instanceSelector:
    matchLabels:
      app: grafana
  
  # DataSource 설정
  datasource:
    name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus-service.monitoring.svc:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: "15s"
      httpMethod: POST
```

```bash
# DataSource 생성
kubectl apply -f grafana-datasource.yaml

# 확인
kubectl get grafanadatasource -n monitoring
# NAME                  AGE
# prometheus-datasource 10s

# Grafana 에서 확인
# http://localhost:3000/connections/datasources
# Prometheus DataSource 가 표시되어야 함
```

---

## 8 단계: Dashboard 자동 프로비저닝

### Kubernetes 클러스터 대시보드

```yaml
# k8s-cluster-dashboard.yaml
apiVersion: integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: k8s-cluster-dashboard
  namespace: monitoring
  labels:
    app: grafana
spec:
  # 어떤 Grafana 인스턴스에 적용할지
  instanceSelector:
    matchLabels:
      app: grafana
  
  # 대시보드 JSON (간소화된 예시)
  json: >
    {
      "annotations": {
        "list": []
      },
      "editable": true,
      "fiscalYearStartMonth": 0,
      "graphTooltip": 0,
      "id": null,
      "links": [],
      "liveNow": false,
      "panels": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-datasource"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  }
                ]
              },
              "unit": "short"
            }
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 0
          },
          "id": 1,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom"
            },
            "tooltip": {
              "mode": "single"
            }
          },
          "targets": [
            {
              "expr": "count(kube_pod_info)",
              "legendFormat": "Total Pods",
              "refId": "A"
            }
          ],
          "title": "Total Pods",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-datasource"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  }
                ]
              },
              "unit": "percent"
            }
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 0
          },
          "id": 2,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom"
            },
            "tooltip": {
              "mode": "single"
            }
          },
          "targets": [
            {
              "expr": "avg(rate(container_cpu_usage_seconds_total[5m])) * 100",
              "legendFormat": "CPU Usage",
              "refId": "A"
            }
          ],
          "title": "Cluster CPU Usage",
          "type": "timeseries"
        }
      ],
      "refresh": "30s",
      "schemaVersion": 38,
      "style": "dark",
      "tags": [
        "kubernetes"
      ],
      "templating": {
        "list": []
      },
      "time": {
        "from": "now-1h",
        "to": "now"
      },
      "timepicker": {},
      "timezone": "browser",
      "title": "Kubernetes Cluster Overview",
      "uid": "k8s-cluster-overview",
      "version": 1,
      "weekStart": ""
    }
```

```bash
# Dashboard 생성
kubectl apply -f k8s-cluster-dashboard.yaml

# 확인
kubectl get grafanadashboard -n monitoring
# NAME                    AGE
# k8s-cluster-dashboard   10s

# Grafana 에서 확인
# http://localhost:3000/dashboards
# "Kubernetes Cluster Overview" 대시보드가 표시되어야 함
```

### Grafana.com 에서 대시보드 가져오기

```yaml
# node-exporter-dashboard.yaml
apiVersion: integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: node-exporter-dashboard
  namespace: monitoring
  labels:
    app: grafana
spec:
  instanceSelector:
    matchLabels:
      app: grafana
  
  # Grafana.com 에서 대시보드 다운로드
  grafanaCom:
    id: "1860"  # Node Exporter Full 대시보드 ID
    revision: 1  # 리비전 번호
```

```bash
# Dashboard 생성
kubectl apply -f node-exporter-dashboard.yaml

# 확인
kubectl get grafanadashboard -n monitoring
# NAME                   AGE
# k8s-cluster-dashboard  5m
# node-exporter-dashboard 10s
```

---

## 9 단계: Alertmanager 설정 (선택)

### Alertmanager CR 생성

```yaml
# alertmanager.yaml
apiVersion: monitoring.coreos.com/v1
kind: Alertmanager
metadata:
  name: main
  namespace: monitoring
spec:
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: standard
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
  securityContext:
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
```

```bash
# Alertmanager 생성
kubectl apply -f alertmanager.yaml

# 확인
kubectl get alertmanager -n monitoring
# NAME   REPLICAS   AGE
# main   1          10s
```

### AlertmanagerConfig 설정

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
    
    route:
      group_by: ['alertname']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'email-notifications'
      routes:
        - match:
            severity: critical
          receiver: 'email-notifications'
    
    receivers:
      - name: 'email-notifications'
        email_configs:
          - to: admin@example.com
            from: alertmanager@example.com
            smarthost: smtp.example.com:587
            auth_username: alertmanager@example.com
            auth_identity: alertmanager@example.com
            auth_password: password
```

```bash
# Alertmanager 설정
kubectl apply -f alertmanager-config.yaml
```

---

## 10 단계: 전체 확인

### 설치된 리소스 확인

```bash
# 모든 모니터링 리소스 확인
kubectl get all -n monitoring

# 출력 예시:
# NAME                                READY   STATUS    RESTARTS   AGE
# pod/grafana-6d4f5b6c7d-abc12        1/1     Running   0          10m
# pod/grafana-operator-6d4f5b6c7d     1/1     Running   0          10m
# pod/prometheus-k8s-0                2/2     Running   0          10m
# pod/prometheus-operator-6d4f5b6c7d  1/1     Running   0          10m
# pod/alertmanager-main-0             2/2     Running   0          5m

# NAME                      TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
# service/grafana-service   ClusterIP   10.96.100.50   <none>        3000/TCP   10m
# service/prometheus-service ClusterIP  10.96.100.51   <none>        9090/TCP   10m

# NAME                           READY   AGE
# deployment.apps/grafana        1/1     10m
# deployment.apps/grafana-operator 1/1   10m

# NAME                                      DESIRED   CURRENT   READY   AGE
# statefulset.apps/prometheus-k8s          1         1         1       10m
# statefulset.apps/alertmanager-main       1         1         1       5m
```

### CRD 상태 확인

```bash
# Prometheus 관련 CRD
kubectl get prometheus -n monitoring
# NAME   VERSION   REPLICAS   READY   AGE
# k8s    v2.47.0   1          1       10m

kubectl get alertmanager -n monitoring
# NAME   REPLICAS   AGE
# main   1          5m

kubectl get servicemonitor -n monitoring
# NAME      AGE
# kubelet   10m
# myapp     5m

# Grafana 관련 CRD
kubectl get grafana -n monitoring
# NAME      AGE
# grafana   10m

kubectl get grafanadatasource -n monitoring
# NAME                  AGE
# prometheus-datasource 10m

kubectl get grafanadashboard -n monitoring
# NAME                   AGE
# k8s-cluster-dashboard  5m
# node-exporter-dashboard 1m
```

### Operator 로그 확인

```bash
# Prometheus Operator 로그
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus-operator

# Grafana Operator 로그
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana-operator

# Prometheus 로그
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus

# Grafana 로그
kubectl logs -n monitoring -l app=grafana
```

---

## 11 단계: 문제 해결

### 일반적인 문제

```
┌─────────────────────────────────────────────────────────────┐
│          일반적인 문제 및 해결                              │
└─────────────────────────────────────────────────────────────┘

문제 1: "CRD not found"
해결:
  - Operator 가 설치되었는지 확인
  kubectl get pods -n monitoring
  - CRD 가 등록되었는지 확인
  kubectl get crd | grep prometheus

문제 2: "ServiceMonitor 타겟이 표시되지 않음"
해결:
  - ServiceMonitor 의 label 이 Prometheus 와 일치하는지 확인
  - Service 의 port 이름이 맞는지 확인
  - Prometheus 가 ServiceMonitorSelector 를 확인

문제 3: "Grafana 에 DataSource 가 표시되지 않음"
해결:
  - GrafanaDatasource CR 의 instanceSelector 확인
  - Prometheus Service 가 접근 가능한지 확인
  kubectl get svc -n monitoring prometheus-service
  - Grafana Pod 로그 확인
  kubectl logs -n monitoring -l app=grafana

문제 4: "Dashboard 가 표시되지 않음"
해결:
  - GrafanaDashboard CR 의 instanceSelector 확인
  - JSON 형식이 올바른지 확인
  - label 이 Grafana 와 일치하는지 확인
```

### 디버그 명령어

```bash
# Prometheus 타겟 상태 확인
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090
# http://localhost:9090/targets

# Prometheus 쿼리 테스트
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090
# http://localhost:9090/graph
# Query: up

# Grafana 로그 상세 확인
kubectl logs -n monitoring -l app=grafana --tail=100

# Operator 로그 상세 확인
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana-operator --tail=100

# CRD 상세 정보
kubectl get crd prometheuses.monitoring.coreos.com -o yaml
kubectl get crd grafanas.integreatly.org -o yaml
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    설치 실습 요약                           │
├─────────────────────────────────────────────────────────────┤
│  1. 네임스페이스 생성                                       │
│     - kubectl create namespace monitoring                   │
│                                                             │
│  2. Prometheus Operator 설치                                │
│     - Helm: helm install prometheus prometheus-community/   │
│       kube-prometheus-stack                                 │
│     - 또는: kubectl apply -f bundle.yaml                    │
│                                                             │
│  3. Prometheus 인스턴스 생성                                │
│     - Prometheus CR 생성                                    │
│     - Service 로 노출                                       │
│                                                             │
│  4. ServiceMonitor 생성                                     │
│     - 자동 타겟 발견                                        │
│     - Kubernetes 컴포넌트 모니터링                          │
│                                                             │
│  5. Grafana Operator 설치                                   │
│     - Helm: helm install grafana-operator                   │
│       grafana-operator/grafana-operator                     │
│                                                             │
│  6. Grafana 인스턴스 생성                                   │
│     - Grafana CR 생성                                       │
│     - Service 로 노출                                       │
│                                                             │
│  7. DataSource 설정                                         │
│     - GrafanaDatasource CR 로 Prometheus 연결               │
│                                                             │
│  8. Dashboard 자동 프로비저닝                               │
│     - GrafanaDashboard CR 로 대시보드 생성                  │
│     - Grafana.com 에서 대시보드 가져오기                    │
│                                                             │
│  9. Alertmanager 설정 (선택)                                │
│     - Alertmanager CR 생성                                  │
│     - AlertmanagerConfig 로 알림 설정                       │
│                                                             │
│  10. 전체 확인                                              │
│      - kubectl get all -n monitoring                        │
│      - Prometheus: http://localhost:9090                    │
│      - Grafana: http://localhost:3000                       │
└─────────────────────────────────────────────────────────────┘
```

### 설치 순서 정리

```
┌─────────────────────────────────────────────────────────────┐
│          설치 순서                                          │
└─────────────────────────────────────────────────────────────┘

1. namespace monitoring 생성
         ↓
2. Prometheus Operator 설치 (Helm 또는 YAML)
         ↓
3. Prometheus CR 생성 (인스턴스)
         ↓
4. ServiceMonitor 생성 (타겟 발견)
         ↓
5. Grafana Operator 설치 (Helm)
         ↓
6. Grafana CR 생성 (인스턴스)
         ↓
7. GrafanaDatasource CR 생성 (Prometheus 연결)
         ↓
8. GrafanaDashboard CR 생성 (대시보드)
         ↓
9. Alertmanager 설정 (선택)
         ↓
10. 확인 및 문제 해결
```

**Prometheus Operator 와 Grafana Operator 를 사용하면 Kubernetes 에서 모니터링 시스템을 쉽게 구축하고 자동화할 수 있습니다. Helm 차트를 사용하면 더욱 간편하게 설치할 수 있습니다.**
