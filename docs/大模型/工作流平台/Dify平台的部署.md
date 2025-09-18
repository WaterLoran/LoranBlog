**Dify** 平台的部署。

Dify 是一个开源的 LLM 应用开发平台，其核心目标是让开发者能够快速、便捷地构建和部署基于大语言模型的应用程序。它提供了可视化的编排、推理、评估和部署功能，支持多种主流模型。

部署 Dify 有多种方式，适用于从本地开发测试到大规模生产环境的不同场景。

---

### 一、部署前准备

无论采用哪种部署方式，都需要确保你的环境满足以下基本要求：

1.  **硬件资源**：
    *   **CPU/Memory**: 至少 2 核 CPU 和 4 GiB 内存。如果计划运行大型模型（如 Llama 2 70B），需要更多资源。
    *   **GPU**（可选）：如需本地部署和推理大型模型，需要 NVIDIA GPU 及其驱动。Dify 支持 vLLM 和 TensorRT-LLM 等高性能推理后端。
    *   **磁盘空间**：至少 10 GB 可用空间，用于存放 Docker 镜像、数据库和模型文件（如果本地推理）。

2.  **软件环境**：
    *   **Docker** 和 **Docker Compose**：这是**最推荐**的部署方式，能解决绝大部分依赖问题。
    *   **Python**：如果你选择从源码部署，需要 Python 3.10+。
    *   **Git**：用于克隆代码库。

3.  **访问密钥（API Keys）**：
    *   准备好你需要连接的模型服务的 API Key，例如：
        *   OpenAI (GPT-4o, GPT-4-turbo)
        *   Anthropic (Claude 3)
        *   DeepSeek
        *   Moonshot
        *   阿里云通义千问
        *   百川智能
        *   等等...
    *   如果你打算使用本地模型，则需要准备好相应的模型文件（如从 Hugging Face 下载）。

---

### 二、推荐部署方式：使用 Docker Compose（最快最方便）

这是官方最推荐的方式，适用于绝大多数场景，包括生产环境。

**步骤如下：**

1.  **获取部署文件**
    使用 `git` 克隆仓库或直接下载 `docker-compose.yaml` 文件。

    ```bash
    git clone https://github.com/langgenius/dify.git
    cd dify/docker
    ```

2.  **（可选）配置环境变量**
    Docker Compose 默认会使用 `docker/.env` 文件中的配置。你可以根据需要修改它，例如：
    *   `DEBUG`： 设置调试模式。
    *   数据库密码等敏感信息（**生产环境必须修改！**）。
    对于初次体验，可以直接使用默认配置。

3.  **启动所有服务**
    在 `dify/docker` 目录下，执行一条命令即可启动所有依赖（PostgreSQL, Redis）和 Dify 本身：

    ```bash
    docker-compose up -d
    ```
    `-d` 参数表示在后台运行。

4.  **访问应用**
    服务启动完成后（可能需要几分钟初始化数据库），在浏览器中访问：
    *   **应用地址**: `http://你的服务器IP:80`
    *   **后台管理地址**: `http://你的服务器IP:80/console`

    首次访问会进入安装向导，你需要设置初始管理员账号和密码。

5.  **配置模型**
    登录后台管理界面 (`/console`) 后，进入 **“模型提供商”** 设置。
    *   填入你从第三方服务商处获得的 **API Key**（如 OpenAI）。
    *   测试连接是否成功。
    *   这样你的应用就可以使用这些模型了。

6.  **其他常用命令**
    *   **查看日志**: `docker-compose logs -f` （`-f` 表示持续跟踪）
    *   **停止服务**: `docker-compose down`
    *   **重启服务**: `docker-compose restart`

---

### 三、其他部署方式

#### 1. 从源代码部署（适合开发者和深度定制）

适用于想要修改 Dify 源码或为项目贡献代码的开发者。

```bash
# 1. 克隆代码
git clone https://github.com/langgenius/dify.git
cd dify

# 2. 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# 3. 安装依赖
pip install -r requirements.txt

# 4. 创建 .env 文件并配置
cp .env.example .env
# 使用文本编辑器修改 .env 文件，设置数据库连接、API密钥等。

# 5. 启动数据库和Redis（需要已安装Docker）
cd docker
docker-compose -f docker-compose.middleware.yaml up -d
cd ..

# 6. 初始化数据库
python manage.py create_db
python manage.py migrate

# 7. 启动应用
python manage.py runserver --host 0.0.0.0 --port 80
```

#### 2. 使用 Kubernetes 部署（适合云原生和生产环境）

对于熟悉 K8s 的团队，可以使用官方提供的 Helm Chart 进行部署，便于扩缩容和管理。

```bash
# 添加 Helm 仓库
helm repo add dify https://langgenius.github.io/dify-helm
helm repo update

# 安装部署
helm install my-dify dify/dify -n dify --create-namespace
```

你需要提前准备好 `values.yaml` 文件来覆盖默认配置，例如设置数据库连接、Ingress 规则等。

#### 3. 云市场一键部署（最简单）

许多云服务商将 Dify 集成到了其市场应用中，可以直接一键部署到云服务器上。
*   **阿里云**: 在云市场搜索 “Dify”。
*   **腾讯云**: 在轻量应用服务器或云市场应用中寻找。
*   **AWS/Azure/GCP**: 在其 Marketplace 中也可能找到对应的镜像。

这种方式省去了手动配置的麻烦，但可能不是最新版本。

---

### 四、生产环境部署注意事项

1.  **安全**：
    *   **务必修改**默认的数据库密码和 Redis 密码。
    *   使用强密码管理管理员账户。
    *   通过配置反向代理（如 Nginx）启用 **HTTPS**。
    *   合理配置防火墙，只开放必要的端口（如 80, 443）。

2.  **持久化存储**：
    *   确保 PostgreSQL 数据库的数据目录被挂载到宿主机或云存储上，避免容器重启后数据丢失。
    *   Docker Compose 部署中，默认已经配置了名为 `dify-pg-data` 和 `dify-redis-data` 的卷来实现持久化。

3.  **性能与扩缩容**：
    *   如果用户量增长，可以考虑：
        *   为 `api` 和 `worker` 服务配置多个副本（在 Docker Compose 或 K8s 中）。
        *   使用更高性能的数据库（如云数据库 RDS）和 Redis（如云内存数据库）。
        *   对于推理，使用性能更好的模型 API 或本地推理后端（如 vLLM）。

4.  **备份**：
    *   定期备份 PostgreSQL 数据库。Dify 的所有核心数据（应用、对话记录等）都存储在库中。

5.  **更新升级**：
    *   关注项目的 Release 页面。升级时，通常是拉取最新的 Docker 镜像，然后重新执行 `docker-compose up -d`。

### 总结

| 部署方式              | 适用场景                   | 难度     | 推荐度                 |
| :-------------------- | :------------------------- | :------- | :--------------------- |
| **Docker Compose**    | **所有场景**，从测试到生产 | **简单** | ⭐⭐⭐⭐⭐ **（极力推荐）** |
| **源码部署**          | 开发、二次开发、贡献代码   | 中等     | ⭐⭐⭐                    |
| **Kubernetes (Helm)** | 大规模、云原生生产环境     | 困难     | ⭐⭐⭐⭐ （对运维有要求）  |
| **云市场镜像**        | 快速体验，不关心最新版本   | 非常简单 | ⭐⭐⭐                    |

对于绝大多数用户，**直接使用 Docker Compose 进行部署**是最佳选择，它能以最小的代价获得一个功能完整、易于维护的 Dify 环境。部署完成后，你就可以在直观的 Web 界面上开始创建和发布你的 AI 智能体（Agent）和应用程序了。