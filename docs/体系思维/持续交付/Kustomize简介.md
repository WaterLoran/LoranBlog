# Kustomize简介

它是 Kubernetes 原生配置管理的现代解决方案，其设计哲学与 Helm 完全不同，但目标一致：更好地管理 Kubernetes 的 YAML 文件。

### 一、Kustomize 是什么？

**Kustomize** 是一个专门为 Kubernetes 设计的、**无模板的（template-free）**、**声明式的** 配置管理工具。它的核心思想是 **“修补（Patching）”** 而不是“渲染”。

它不需要学习任何新的模板语法（如 Go Template），而是直接使用原始的 Kubernetes YAML 文件，通过一个名为 **`kustomization.yaml`** 的文件，来声明如何对这些基础 YAML 文件进行定制和组合，从而生成针对不同环境（开发、测试、生产）或不同目的的最终部署文件。

自 Kubernetes 1.14 版本起，`kustomize` 的功能已直接内置于 `kubectl` 中，可以通过 `kubectl -k` 命令使用，这使其成为了一个官方的、云原生生态圈的核心工具。

### 二、核心哲学：基线与覆盖 (Base & Overlays)

这是 Kustomize 最核心、最重要的概念。

*   **Base (基线)**：定义了一套**通用的、完整的**应用配置。它包含了所有环境都共享的资源配置，如 Deployment、Service、ConfigMap 等。`base` 本身是可以独立部署的。
*   **Overlay (覆盖)**：定义了基于某个 Base 的**差异化配置**。它本身并不包含完整的配置，只包含需要修改或新增的部分。Overlay 通过引用 Base 并应用各种“修补”来生成最终配置。

**一个生动的比喻：**
*   **Base** 就像一张**黑白线稿**，它是一幅完整但未上色的画。
*   **Overlay** 就像一张**透明的彩色滤片**，你把它覆盖在线稿上，只为画作的特定部分上色（修改配置）。
*   你可以为不同客户准备不同的“滤片”（Overlay），但底下的“线稿”（Base）始终是同一张。

### 三、核心功能与操作

所有功能都在 `kustomization.yaml` 文件中配置。

1.  **资源生成器 (Generators)**
    *   `resources`: 声明要组合哪些 Kubernetes YAML 文件。这是最常用的字段。
    ```yaml
    # base/kustomization.yaml
    apiVersion: kustomize.config.k8s.io/v1beta1
    kind: Kustomization
    resources:
    - deployment.yaml
    - service.yaml
    - configmap.yaml
    ```

2.  **转换器 (Transformers) - 实现“修补”**
    *   `namespace`: 为所有资源统一设置命名空间。
    *   `namePrefix` / `nameSuffix`: 为所有资源名称添加统一的前缀或后缀（例如 `dev-`, `-prod`）。
    *   `commonLabels` / `commonAnnotations`: 为所有资源添加统一的标签或注解。
    *   `images`: **修改镜像**。这是非常常用的功能，可以替换所有资源中指定的容器镜像的名称、标签或镜像库地址。
        ```yaml
        # overlays/prod/kustomization.yaml
        apiVersion: kustomize.config.k8s.io/v1beta1
        kind: Kustomization
        bases:
        - ../../base
        images:
        - name: my-app-api # 要查找的镜像名称
          newName: my-registry.com/prod/my-app-api # 新的镜像名（含仓库）
          newTag: v1.2.0-prod # 新的标签
        ```
    *   `patchesStrategicMerge` 和 `patchesJson6902`: **高级修补**。用于对 Base 中的特定文件进行更精细的修改。
        *   `patchesStrategicMerge`: 使用一个 YAML 片段（片段本身也是一个几乎合法的 K8s YAML）来覆盖 Base 中的配置。最常用。
        ```yaml
        # overlays/prod/patches/increase-replicas.yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: my-app-api # 必须匹配要修补的Deployment名称
        spec:
          replicas: 5 # 将base中replicas: 1的配置覆盖为5
        ```
        ```yaml
        # 然后在overlay的kustomization.yaml中引用
        patchesStrategicMerge:
        - patches/increase-replicas.yaml
        ```
    *   `configMapGenerator` / `secretGenerator`: 动态生成 ConfigMap 和 Secret，可以从文件、环境变量或文字值生成。
        ```yaml
        configMapGenerator:
        - name: app-config
          files:
            - config.properties
        ```

### 四、一个完整的项目结构示例

让我们通过一个为不同环境（dev/prod）部署应用的例子来理解 Kustomize 的工作流。

**项目目录结构：**
```
~/my-app-manifests/
├── base/
│   ├── kustomization.yaml  # 基线的定义文件
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml  # 开发环境的定制
    │   └── patches/
    │       └── dev-config.yaml
    └── prod/
        ├── kustomization.yaml  # 生产环境的定制
        ├── patches/
        │   ├── increase-replicas.yaml
        │   └── prod-config.yaml
        └── ingress.yaml        # 生产环境独有的Ingress资源
```

**1. Base 配置 (`base/`)**

*   `base/deployment.yaml`: 定义应用，使用一个通用的镜像 `my-app:latest`，副本数为 1。
*   `base/configmap.yaml`: 包含通用的配置。
*   `base/kustomization.yaml`:
    ```yaml
    apiVersion: kustomize.config.k8s.io/v1beta1
    kind: Kustomization
    resources: # 声明基线包含哪些资源
    - deployment.yaml
    - service.yaml
    - configmap.yaml
    ```

**2. 开发环境 Overlay (`overlays/dev/`)**

*   `overlays/dev/kustomization.yaml`:
    ```yaml
    apiVersion: kustomize.config.k8s.io/v1beta1
    kind: Kustomization
    bases:
    - ../../base  # 引用基线
    
    # 开发环境的特定修改
    namePrefix: dev-  # 所有资源名加前缀，如 dev-my-app-deployment
    commonLabels:
      env: dev
    images:
    - name: my-app  # 找到base里叫my-app的镜像
      newTag: latest-dev # 只修改标签，使用开发标签的镜像
    patchesStrategicMerge:
    - patches/dev-config.yaml # 应用一个补丁来修改ConfigMap
    ```

**3. 生产环境 Overlay (`overlays/prod/`)**

*   `overlays/prod/kustomization.yaml`:
    ```yaml
    apiVersion: kustomize.config.k8s.io/v1beta1
    kind: Kustomization
    bases:
    - ../../base
    
    namePrefix: prod-
    commonLabels:
      env: prod
    namespace: production # 将所有资源部署到production命名空间
    images:
    - name: my-app
      newName: my-registry.com/prod/my-app # 使用生产环境的私有镜像库
      newTag: v1.2.0 # 使用稳定的版本标签
    patchesStrategicMerge:
    - patches/increase-replicas.yaml # 将副本数扩到5
    - patches/prod-config.yaml       # 使用生产环境的配置
    resources: # 生产环境需要额外的资源，如Ingress
    - ingress.yaml
    ```

### 五、如何使用？

1.  **预览生成的 YAML（干跑）**：
    这是 Kustomize 最大的优点之一，可以在真正部署前看到最终生成的配置，非常安全。
    ```bash
    # 查看开发环境的最终配置
    kubectl kustomize overlays/dev/
    
    # 或者使用原生kustomize命令
    kustomize build overlays/dev/
    ```

2.  **直接部署**：
    使用内置的 `kubectl -k` 命令，它会先构建（build）再应用（apply）。
    ```bash
    # 部署到开发环境
    kubectl apply -k overlays/dev/
    
    # 部署到生产环境
    kubectl apply -k overlays/prod/
    ```

### 六、Kustomize vs. Helm：如何选择？

| 特性         | Kustomize                                     | Helm                                       |
| :----------- | :-------------------------------------------- | :----------------------------------------- |
| **哲学**     | **声明式、无模板、修补**                      | **命令式、模板化、打包**                   |
| **学习曲线** | **低**，只需懂原生 K8s YAML                   | **中**，需要学习 Go Template 和 Chart 结构 |
| **核心概念** | Base & Overlays                               | Charts & Values.yaml                       |
| **参数化**   | 弱。主要通过文件修补和变量替换（`vars`）      | **极强**。通过 `values.yaml` 动态渲染模板  |
| **包管理**   | **无**。更适合管理内部应用的配置              | **有**。是成熟的包管理工具，适合应用分发   |
| **安全性**   | **高**。干跑(`kubectl kustomize`)可见最终配置 | **中**。模板渲染后不易直接审查最终输出     |
| **适用场景** | **管理同一应用的多环境差异**                  | **分发软件包、支持高度参数化部署**         |

### 七、总结：Kustomize 如何解决您的痛点

| 您的痛点             | Kustomize 的解决方案                                         |
| :------------------- | :----------------------------------------------------------- |
| **手动修改YAML易错** | **杜绝手动修改**。通过 Overlay 以声明式的方式描述差异，基础配置永远不变。 |
| **环境配置不一致**   | **Base 保证通用性，Overlay 管理差异性**。开发、测试、生产环境源于同一份可信的 Base。 |
| **缺少检查机制**     | **`kubectl kustomize` 提供完美的预检机制**。在应用前可以清晰看到最终生成的 YAML，确认无误后再部署。 |
| **部署流程标准化**   | 目录结构和 `kustomization.yaml` 文件本身就是标准。部署命令极其简单统一：`kubectl apply -k <overlay-path>`。 |

**给您的建议：**
对于您的 ToB 交付场景，**Kustomize 是一个极佳的选择**。您可以为您的产品维护一个优秀的、通用的 **`base`**。然后，为**每个客户**创建一个 **`overlay`**（例如 `overlays/customer-a`, `overlays/customer-b`）。

在这个客户的 Overlay 中，您可以通过 `images` 字段指定客户专用的镜像仓库和标签，通过 `patches` 修改客户的特定配置（如资源限制、环境变量），通过 `ingress.yaml` 定义客户独有的域名。

最终，交付给客户的是一整套清晰、可审计的声明式文件，而不是需要手动修改的散装 YAML，彻底实现了部署的标准化和自动化。