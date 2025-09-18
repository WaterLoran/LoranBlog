# ArgoCD用于ToB私有化部署场景

**Argo CD 非常适合 ToB 私有化部署场景，并且其设计理念与这种离线环境的需求高度契合。**

许多金融、政务、军工、大型企业等对数据安全和网络隔离要求极高的客户，都在其完全离线的内网环境中成功部署和使用 Argo CD。

---

### 对于不能联网的情况，具体操作流程如下：

核心思路是：**将所有依赖的外部资源，全部搬运到内网环境中，并对其进行内网化改造和配置。**

#### 第一步：准备阶段 - 收集所有依赖资源

在一台可以联网的机器上（跳板机），准备好所有需要的文件。

1.  **获取 Argo CD 的安装文件**：
    *   最常用的方式是使用 Helm Chart。
    *   从官方仓库下载 Argo CD 的 Helm Chart 及其依赖的 Charts。
    ```bash
    # 添加 Argo CD Helm 仓库
    helm repo add argo https://argoproj.github.io/argo-helm
    helm repo update
    
    # 将 Chart 及其所有依赖打包到一个目录中
    helm pull argo/argocd --version <desired-version> --untar
    # 或者直接下载为 .tgz 包
    helm pull argo/argocd --version <desired-version>
    
    # 如果需要，下载依赖 Charts
    helm dependency build ./argocd
    ```

2.  **拉取所有所需的容器镜像**：
    *   这是最关键的一步。Argo CD 本身包含多个组件（API Server、Repo Server、Application Controller 等），每个组件都需要镜像。
    *   通过查看 Helm Chart 的 `values.yaml` 或 `Chart.yaml`，可以确定所有需要的镜像及其版本。
    *   使用 `docker pull` 或 `skopeo copy` 将所有镜像下载到本地。
    ```bash
    # 示例：拉取镜像
    docker pull quay.io/argoproj/argocd:<version>
    docker pull redis:<version>
    # ... 拉取所有其他需要的镜像
    ```
    *   **强烈建议**：编写一个脚本，批量拉取所有镜像，避免遗漏。

3.  **准备代码仓库（Git Repository）**：
    *   您的应用清单（Helm, Kustomize, YAML 等）必须在一个内网可以访问的 Git 仓库中（如 GitLab, Gitea 的私有化部署）。
    *   将您的应用程序代码仓库完整地克隆或同步到内网 Git 服务器上。

4.  **准备可选的 Helm 仓库**：
    *   如果您的应用依赖第三方 Helm Chart（如 nginx-ingress, redis-cluster 等），您也需要将这些 Charts 同步到内网的 Helm 仓库（如使用 ChartMuseum, Harbor 等）。

#### 第二步：搭建内网基础设施

在内网环境中搭建好必要的服务：

1.  **私有容器镜像仓库**：搭建一个 Harbor 或 Nexus Repository Manager，用于存放所有从外网拉取的镜像。
2.  **内网 Git 服务器**：搭建一个 GitLab 或 Gitea 实例，用于存放您的应用配置清单。
3.  **（可选）内网 Helm 仓库**：如上所述，用于存放第三方 Charts。

#### 第三步：向内网迁移资源

将通过物理方式（如移动硬盘）或指定的安全通道，将第一步中准备好的资源导入内网。

1.  **推送镜像到私有仓库**：
    *   为所有下载的镜像重新打上内网仓库的标签。
    ```bash
    docker tag quay.io/argoproj/argocd:<version> my-internal-registry.com/argoproj/argocd:<version>
    ```
    *   将所有镜像推送到内网镜像仓库。
    ```bash
    docker push my-internal-registry.com/argoproj/argocd:<version>
    ```

2.  **上传安装文件**：
    *   将下载好的 Helm Chart `.tgz` 包或目录上传到内网的部署机器上。

3.  **上传代码**：
    *   将应用代码推送到内网的 Git 服务器。

#### 第四步：离线安装和配置 Argo CD

1.  **使用 Helm 安装，并覆盖镜像地址**：
    *   创建一个自定义的 `values-offline.yaml` 文件，主要目的是覆盖所有镜像的拉取地址，指向您的内网仓库。
    ```yaml
    # values-offline.yaml
    global:
      image:
        repository: my-internal-registry.com/argoproj
        tag: <version>
      # 如果镜像不在 argoproj 路径下，如 redis，需要单独指定
      redis:
        image:
          repository: my-internal-registry.com/library/redis
          tag: <redis-version>
    
    # 如果还有其他组件，同样需要覆盖
    repoServer:
      image:
        repository: my-internal-registry.com/argoproj/argocd
        tag: <version>
    dex:
      image:
        repository: my-internal-registry.com/dexidp/dex
        tag: <dex-version>
    # ... 其他组件
    ```
    *   执行 Helm Install 命令：
    ```bash
    helm install argocd ./argocd -f values-offline.yaml -n argocd --create-namespace
    ```

2.  **配置 Argo CD**：
    *   通过 Port-forward 或 NodePort/LoadBalancer 服务访问 Argo CD API Server 的 UI 或 CLI。
    *   获取初始管理员密码（通常存在于 Secret 中，安装时 Helm Chart 会提示）。
    *   登录后，连接您的**内网 Git 仓库**：
        *   在 Argo CD 中设置 Repository（代码仓库）：填写内网 Git URL 和 SSH 私钥/用户名密码凭证。
        *   在 Argo CD 中设置 Cluster（集群）：通常就是本地集群，已经自动添加。

#### 第五步：创建应用（Application）

现在，您的 Argo CD 已经完全运行在内网环境中，可以像在线环境下一样使用：

1.  在 UI 或通过 CLI 创建 Application。
2.  **Source**：配置为您内网 Git 仓库中的应用 Manifest 路径。
3.  **Destination**：配置为您的内网 K8s 集群和命名空间。
4.  Sync Policy：根据需要选择手动或自动同步。

---

### 总结与最佳实践

*   **优势**：Argo CD 的声明式、GitOps 模式在离线环境中能极大地提高应用部署的可靠性、可审计性和一致性，非常适合 ToB 客户对稳定性和安全性的要求。
*   **镜像管理**：这是最繁琐但最重要的一步。建议使用工具（如 `skopeo`）编写自动化脚本来同步镜像，并定期检查更新。
*   **版本控制**：对所有离网资源（Argo CD 版本、Chart 版本、镜像版本）进行严格的版本记录和管理。
*   **备份**：定期备份 Argo CD 的配置数据（如 AppProject、Application 等 CRD 资源），这些资源本身也声明在 Git 中，所以备份 Git 仓库即可。

总之，虽然离线部署 Argo CD 的初始准备工作比在线部署更复杂，但整个过程是清晰且可行的，并且一旦搭建完成，其带来的收益非常显著。