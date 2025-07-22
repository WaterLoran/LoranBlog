Apache Airflow 是一款用于编排、调度和监控工作流的开源工具，其部署方式灵活多样，可根据业务需求选择**单机部署**（测试/开发）、**分布式部署**（生产环境）或**容器化部署**（简化环境管理）。以下是详细的部署指南，涵盖主流方案及操作步骤：


---

## **一、部署前准备**
### **1. 核心组件理解**  
Airflow 由以下核心组件构成，部署时需重点关注：  
- **Web Server**：提供 Web 界面（默认端口 8080），用于创建 DAG、监控任务状态。  
- **Scheduler**：任务调度器（核心进程），负责解析 DAG 文件、触发任务执行。  
- **Executor**：任务执行器，决定任务如何运行（如本地、分布式、Kubernetes）。  
- **Worker**（可选）：执行具体任务的进程（仅当 Executor 为 Celery/Kubernetes 时需要）。  
- **Metadata Database**：存储 DAG 元数据、任务状态等（如 PostgreSQL/MySQL）。  


### **2. 环境要求**  
- **操作系统**：Linux（推荐 Ubuntu 20.04+/CentOS 7+）或 macOS（开发测试）。  
- **Python**：3.7~3.10（Airflow 2.6+ 支持 Python 3.11）。  
- **数据库**：PostgreSQL（推荐，生产环境首选）、MySQL（需 5.7+）或 SQLite（仅开发测试）。  
- **消息队列**（可选）：Redis（CeleryExecutor）或 RabbitMQ（CeleryExecutor 高级场景）。  


---

## **二、单机部署（开发/测试环境）**  
适合快速验证 DAG、学习 Airflow 基础功能，无需分布式支持。


### **方案1：原生安装（Linux/macOS）**  
#### **步骤1：安装依赖**  
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y python3-pip python3-dev libpq-dev postgresql

# CentOS/RHEL
sudo yum install -y python3 python3-pip python3-devel postgresql-devel
```

#### **步骤2：安装 Airflow**  
```bash
pip install apache-airflow[all]  # 安装完整包（含依赖）
```

#### **步骤3：初始化数据库**  
Airflow 默认使用 SQLite（开发测试），生产环境建议替换为 PostgreSQL：  
```bash
airflow db init  # 初始化 SQLite 数据库（默认路径：~/airflow/airflow.db）
```

#### **步骤4：启动服务**  
```bash
# 启动 Web Server（默认端口 8080）
airflow webserver -p 8080 &

# 启动 Scheduler（后台运行）
airflow scheduler &
```

#### **步骤5：验证部署**  
访问 `http://localhost:8080`，使用默认账号 `admin/admin` 登录，即可创建/管理 DAG。  


### **方案2：Docker 快速部署（推荐开发测试）**  
通过 Docker 镜像简化环境配置，适合新手或需要快速复现环境的场景。  

#### **步骤1：拉取官方镜像**  
```bash
docker pull apache/airflow:2.8.0  # 替换为最新版本
```

#### **步骤2：启动容器（SQLite 模式）**  
```bash
docker run -d -p 8080:8080 --name airflow apache/airflow:2.8.0 webserver -p 8080
```

#### **步骤3：初始化数据库（首次启动）**  
进入容器执行初始化命令：  
```bash
docker exec -it airflow bash
airflow db init  # 初始化数据库
exit  # 退出容器
```

#### **步骤4：启动 Scheduler（可选）**  
若需运行任务，需在容器内启动 Scheduler（或单独运行一个 Scheduler 容器）：  
```bash
docker exec -it airflow bash
airflow scheduler &  # 后台启动 Scheduler
```


---

## **三、分布式部署（生产环境）**  
生产环境需高可用性、任务并行执行能力，推荐使用 **CeleryExecutor** 或 **KubernetesExecutor**。


### **方案1：CeleryExecutor + Redis（分布式任务队列）**  
适用于多 Worker 节点的分布式任务执行，支持水平扩展。  


#### **步骤1：安装依赖**  
在所有节点（Web Server、Scheduler、Worker）安装 Airflow 及 Celery：  
```bash
pip install apache-airflow[celery,redis]  # 安装 Celery 和 Redis 支持
```

#### **步骤2：配置数据库（PostgreSQL）**  
生产环境推荐使用 PostgreSQL（性能优于 SQLite）：  
```bash
# 安装 PostgreSQL（Ubuntu）
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql

# 创建 Airflow 数据库用户和数据库
sudo -u postgres psql
CREATE USER airflow WITH PASSWORD 'airflow';
CREATE DATABASE airflow OWNER airflow;
\q
```

#### **步骤3：配置 Airflow 连接**  
修改 `airflow.cfg`（或通过环境变量），指定数据库和 Executor：  
```ini
[core]
executor = CeleryExecutor
sql_alchemy_conn = postgresql+psycopg2://airflow:airflow@localhost:5432/airflow

[celery]
broker_url = redis://localhost:6379/0  # Redis 作为消息代理
result_backend = redis://localhost:6379/0  # 结果存储
```

#### **步骤4：启动各组件**  
- **Web Server**（1 个节点）：  
  ```bash
  airflow webserver -p 8080
  ```
- **Scheduler**（1 个或多个节点，高可用）：  
  ```bash
  airflow scheduler
  ```
- **Worker**（多个节点，横向扩展）：  
  ```bash
  airflow celery worker -c 4  # -c 指定并发数
  ```


### **方案2：KubernetesExecutor（云原生部署）**  
适合大规模集群，通过 Kubernetes 动态创建 Pod 执行任务，支持弹性扩缩容。  


#### **步骤1：部署 Kubernetes 集群**  
需提前搭建 Kubernetes 集群（如 minikube、k3s 或云厂商托管服务）。  

#### **步骤2：安装 Airflow Helm Chart**  
使用 Helm 快速部署 Airflow 到 Kubernetes：  
```bash
# 添加 Airflow Helm 仓库
helm repo add airflow https://airflow.apache.org
helm repo update

# 创建 values.yaml 配置文件（自定义参数）
cat <<EOF > airflow-values.yaml
executor: KubernetesExecutor
webserver:
  service:
    type: LoadBalancer  # 或 NodePort（内网访问）
  defaultUser:
    password: "airflow"
    email: "admin@example.com"
postgresql:
  enabled: true  # 启用内置 PostgreSQL（或使用外部数据库）
redis:
  enabled: true  # 启用内置 Redis（或使用外部）
kubernetes:
  namespace: airflow  # 自定义命名空间
EOF

# 部署 Airflow
helm install airflow airflow/airflow -f airflow-values.yaml
```

#### **步骤3：验证部署**  
```bash
# 查看 Pod 状态
kubectl get pods -n airflow

# 访问 Web UI（通过负载均衡器 IP 或 NodePort）
```


---

## **四、生产环境优化**  
### **1. 高可用性（HA）**  
- **Scheduler**：部署多个 Scheduler 实例（需共享元数据库），避免单点故障。  
- **Web Server**：通过负载均衡器（如 Nginx）暴露多个 Web Server 实例。  
- **数据库**：使用 PostgreSQL 主从复制或云数据库（如 AWS RDS）保证数据持久化。  


### **2. 监控与日志**  
- **Prometheus + Grafana**：集成 Airflow 的 Prometheus Exporter，监控任务执行状态、资源使用率。  
- **ELK Stack**：收集 Airflow 日志（`/usr/local/airflow/logs`），通过 Elasticsearch 存储、Kibana 可视化。  


### **3. 安全加固**  
- **认证授权**：启用 OAuth2、LDAP 或 SSO（如 Google Identity），替代默认的 `admin/admin` 账号。  
- **网络隔离**：通过 Kubernetes NetworkPolicy 或防火墙限制 Airflow 组件的网络访问。  


---

## **五、常见问题排查**  
### **1. Web Server 无法启动**  
- **端口冲突**：检查 8080 端口是否被其他进程占用（`lsof -i:8080`）。  
- **数据库连接失败**：确认 `sql_alchemy_conn` 配置正确（如 PostgreSQL 用户名/密码/地址）。  


### **2. 任务无法触发**  
- **Scheduler 未运行**：检查 Scheduler 进程是否存活（`ps aux | grep airflow scheduler`）。  
- **DAG 解析失败**：查看 Scheduler 日志（`/usr/local/airflow/logs/scheduler`），确认 DAG 文件语法正确。  


### **3. Celery Worker 无响应**  
- **消息队列连接失败**：检查 `broker_url` 配置（如 Redis 地址是否正确）。  
- **资源不足**：Worker 节点内存/CPU 不足时，可通过 `-c` 参数调整并发数。  


---

## **总结**  
- **开发测试**：推荐 Docker 单机部署（快速启动）或原生安装（灵活调试）。  
- **生产环境**：优先选择 CeleryExecutor（分布式任务）或 KubernetesExecutor（云原生弹性）。  
- **关键优化**：高可用性（多 Scheduler）、监控（Prometheus/Grafana）、安全（认证/网络隔离）。  

# 通过合理选择部署方案，Airflow 能够稳定支撑企业级工作流调度需求。