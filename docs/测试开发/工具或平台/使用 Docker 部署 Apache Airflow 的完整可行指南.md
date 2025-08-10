当然！以下是一份 **重新整理、清晰完整、可直接操作** 的：

---

# ✅ 使用 Docker 部署 Apache Airflow 的完整可行指南（适合本地开发 / 测试环境）

> 🎯 **目标：** 使用 Docker 快速部署 Apache Airflow，包括：
> - Web UI（http://localhost:8080）
> - 调度器（Scheduler）
> - 元数据库（PostgreSQL）
> - 初始化数据库 & 创建管理员用户
> - 支持加载自定义 DAGs（放到 ./dags/ 目录）

---

## 🧩 一、部署方式选择

| 方式                                 | 说明                                                         | 推荐指数 |
| ------------------------------------ | ------------------------------------------------------------ | -------- |
| **1. Docker Compose（推荐）**        | 一键启动所有服务（Airflow + PostgreSQL + Redis），简单、标准、易管理 | ⭐⭐⭐⭐⭐    |
| **2. 手动 Docker Run（不推荐新手）** | 自己运行多个容器，步骤繁琐，容易出错                         | ⭐⭐       |

> ✅ **本教程以 Docker Compose 方式为主，适合 99% 的本地开发 / 学习场景**

---

## 🛠️ 二、使用 Docker Compose 部署 Airflow（推荐 ✅）

### ✅ 步骤 1：准备文件夹

打开终端，创建一个项目文件夹并进入，例如：

```bash
mkdir airflow-docker-demo
cd airflow-docker-demo
```

---

### ✅ 步骤 2：创建 `docker-compose.yaml` 文件

创建一个名为 `docker-compose.yaml` 的文件，复制以下内容并保存：

```yaml
# docker-compose.yaml
version: '3.8'

x-airflow-common:
  &airflow-common
  image: apache/airflow:2.8.0
  environment:
    &airflow-common-env
    AIRFLOW__CORE__EXECUTOR: LocalExecutor
    AIRFLOW__CORE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@postgres/airflow
    AIRFLOW__CORE__FERNET_KEY: ''
    AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION: 'true'
    AIRFLOW__CORE__LOAD_EXAMPLES: 'false'  # 不加载官方示例DAG
    AIRFLOW__API__AUTH_BACKEND: 'airflow.api.auth.backend.basic_auth'
  volumes:
    - ./dags:/opt/airflow/dags
    - ./logs:/opt/airflow/logs
    - ./plugins:/opt/airflow/plugins
  user: "${AIRFLOW_UID:-50000}:${AIRFLOW_GID:-50000}"
  depends_on:
    postgres:
      condition: service_healthy
  restart: unless-stopped

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_USER: airflow
      POSTGRES_PASSWORD: airflow
      POSTGRES_DB: airflow
    volumes:
      - postgres-db-volume:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U airflow"]
      interval: 5s
      timeout: 5s
      retries: 5

  webserver:
    <<: *airflow-common
    command: webserver
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD-SHELL", "[ -f /opt/airflow/airflow-webserver.pid ]"]
      interval: 30s
      timeout: 30s
      retries: 3
    restart: unless-stopped

  scheduler:
    <<: *airflow-common
    command: scheduler
    restart: unless-stopped

volumes:
  postgres-db-volume:
```

---

### ✅ 步骤 3：创建必要的目录

在 `airflow-docker-demo` 目录下运行以下命令，创建 DAGs、日志、插件目录：

```bash
mkdir -p ./dags ./logs ./plugins
```

> ✅ `./dags/`：用于存放你的 Airflow DAG Python 文件  
> ✅ `./logs/`：Airflow 运行日志  
> ✅ `./plugins/`：可选，自定义插件

---

### ✅ 步骤 4：设置 Airflow 用户 UID（避免权限问题）

创建一个 `.env` 文件，内容如下：

```bash
# .env
AIRFLOW_UID=50000
```

---

### ✅ 步骤 5：启动所有服务

在项目目录下运行：

```bash
docker-compose up -d
```

> ⏳ 这会拉取镜像（Airflow、PostgreSQL），然后启动以下服务：
> - PostgreSQL（数据库）
> - Airflow Webserver（端口 8080）
> - Airflow Scheduler（后台调度 DAG）

---

## ✅ 三、初始化数据库 & 创建管理员用户

这是关键步骤！Airflow 第一次运行时，元数据库是空的，必须初始化。

### ✅ 步骤 1：初始化数据库

运行以下命令进入 webserver 容器并初始化数据库：

```bash
docker exec -it airflow-docker-webserver-1 airflow db init
```

> 📌 提示：
> - 容器名称可能是 `airflow-webserver-1` 或类似，如果你不确定，先运行：
>   ```bash
>   docker ps
>   ```
>   找到 IMAGE 为 `apache/airflow:2.8.0`，COMMAND 包含 `webserver` 的那个容器，替换上面命令中的容器名。

✅ 成功后你会看到：

```text
Initialization done
```

---

### ✅ 步骤 2：创建管理员用户（用于登录 Web UI）

运行以下命令创建一个默认的管理员账号：

```bash
docker exec -it airflow-docker-webserver-1 airflow users create \
  --username admin \
  --firstname admin \
  --lastname admin \
  --role Admin \
  --email 1696746432@qq.com \
  --password Admin@123
```

> ✅ 你可以自定义：
> - 用户名、邮箱
> - 密码（比如设为 `123456` 或更复杂的）

---

## ✅ 四、访问 Airflow Web UI

打开浏览器，访问：

```
http://localhost:8080
```

🔐 **登录信息：**
- 用户名：`admin`
- 密码：你刚才创建时设置的（如 `123456`）

---

## ✅ 五、添加自定义 DAG（可选）

把你自己写的 Airflow DAG 文件（Python 脚本）放到 `./dags/` 目录下，例如：

```bash
# 示例：创建一个简单的 DAG 文件
nano ./dags/hello_world.py
```

内容可以参考官方教程的简单 DAG，例如：

```python
# ./dags/hello_world.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def say_hello():
    print("Hello, Airflow!")

with DAG(
    dag_id="hello_world_dag",
    start_date=datetime(2024, 1, 1),
    schedule_interval=None,
    catchup=False,
) as dag:
    task = PythonOperator(
        task_id="say_hello_task",
        python_callable=say_hello,
    )
```

> ✅ DAG 放入 `./dags/` 后，Airflow 会自动加载，你可以在 Web UI 的 DAGs 列表中看到它！

---

## 🧹 六、停止 & 清理

### 停止服务：

```bash
docker-compose down
```

### 停止并删除所有数据（包括数据库！慎用）：

```bash
docker-compose down --volumes
```

> ⚠️ 加了 `--volumes` 会删除 PostgreSQL 数据，也就是 Airflow 的元数据（用户、DAG状态等）都会丢失。仅用于重置环境。

---

## 📁 七、项目目录结构示意

你的项目文件夹 (`airflow-docker-demo`) 应该类似这样：

```
airflow-docker-demo/
├── docker-compose.yaml
├── .env
├── dags/
│   └── hello_world.py      # 你的 DAG 文件
├── logs/                   # Airflow 日志
├── plugins/                # （可选）自定义插件
```

---

## ✅ 八、总结（一句话）

> 使用 Docker Compose 可以快速、简单地部署一个包含 Web UI、调度器、数据库的 Apache Airflow 环境，只需初始化数据库、创建用户，即可通过 http://localhost:8080 访问并管理你的 DAG 工作流！

---

## ✅ 附加资源推荐

- [Apache Airflow 官方文档](https://airflow.apache.org/docs/)
- [Airflow 官方教程（编写第一个 DAG）](https://airflow.apache.org/docs/apache-airflow/stable/tutorial.html)
- 如你想要：
  - 使用 MySQL 替代 PostgreSQL
  - 使用 CeleryExecutor（分布式）
  - 使用 Redis、Flower 监控
  - 部署到云服务器 / K8s

