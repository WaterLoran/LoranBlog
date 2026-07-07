# Graphify的入门使用

Graphify 是一款能将包含代码、文档、图片等多种文件的文件夹，一键转化为可查询、持久化知识图谱的本地优先工具。它能与多种 AI 编程助手深度集成，并显著降低 AI 查询时的 Token 消耗。

下面是完整的安装和初始化流程。

### ⚙️ 前置要求与安装指南

Graphify 是一个 Python 工具，安装与初始化需在终端执行。

*   **环境准备**：确保你的系统已安装 **Python 3.10 或更高版本**。
*   **基础安装**：打开终端，使用 pip 安装即可。
    ```bash
    pip install graphifyy
    ```
    > 请**注意**：PyPI 上的包名是 `graphifyy`（末尾是两个 'y'），但安装后，所有操作的命令依然是 `graphify`。

*   **初始化（注册到 AI 助手）**：安装核心包后，需将其注册到你的 AI 编程助手才能使用 `/graphify` 命令。**请先进入你的项目文件夹**，然后根据助手类型执行对应命令。

| AI 编程助手                 | 初始化命令                             |
| :-------------------------- | :------------------------------------- |
| **Claude Code (Linux/Mac)** | `graphify install`                     |
| **Claude Code (Windows)**   | `graphify install --platform windows`  |
| **Cursor**                  | `graphify cursor install`              |
| **Codex**                   | `graphify install --platform codex`    |
| **OpenCode**                | `graphify install --platform opencode` |
| **OpenClaw**                | `graphify install --platform claw`     |
| **Factory Droid**           | `graphify install --platform droid`    |

*   **验证安装**：执行以下命令，看到版本信息即表示安装成功。若提示找不到命令，可尝试用 `python -m graphify --version` 或 `python -m graphify --help`。
    ```bash
    graphify --version
    ```

### 🧩 安装解析工具（按需）

Graphify 默认支持代码结构解析，但处理 PDF、Office 文档等需要安装额外的依赖。可以根据需求选择安装：

| 功能类别           | 安装命令                          | 用途说明                                    |
| :----------------- | :-------------------------------- | :------------------------------------------ |
| **PDF**            | `pip install "graphifyy[pdf]"`    | 解析 PDF 论文或文档                         |
| **Office**         | `pip install "graphifyy[office]"` | 解析 Word (`.docx`) 和 Excel (`.xlsx`) 文件 |
| **视频/音频**      | `pip install "graphifyy[video]"`  | 转录视频和音频文件                          |
| **SQL 数据库**     | `pip install "graphifyy[sql]"`    | 提取数据库 schema                           |
| **MCP 服务**       | `pip install "graphifyy[mcp]"`    | 安装 MCP 服务器，供其他 Agent 使用          |
| **图数据库导出**   | `pip install "graphifyy[neo4j]"`  | 将知识图谱直接注入 Neo4j                    |
| **SVG 渲染**       | `pip install "graphifyy[svg]"`    | 导出静态的 SVG 格式图谱                     |
| **高级社区发现**   | `pip install "graphifyy[leiden]"` | 使用 Leiden 算法进行更高级的社区发现        |
| **文件监控**       | `pip install "graphifyy[watch]"`  | 启用文件监控和自动重建功能                  |
| **一次性安装全部** | `pip install "graphifyy[all]"`    | 安装所有可选的依赖包                        |

### 🚀 核心命令详解

Graphify 的命令主要分为两类：在 AI 助手中使用的**技能命令** (`/graphify`) 和在终端使用的**CLI 命令** (`graphify`)。

#### 💬 技能命令 (`/graphify`)

在 AI 编程助手的对话框中输入以下命令，即可构建和探索知识图谱。

**1. 构建和管理图谱**

| 命令                         | 说明                                                       |
| :--------------------------- | :--------------------------------------------------------- |
| `/graphify .`                | 在当前目录构建知识图谱。首次运行会扫描所有文件并生成报告。 |
| `/graphify <path>`           | 为指定路径（如 `./my-project`）构建图谱。                  |
| `/graphify . --update`       | **增量更新**：只重新分析有变更的文件，速度很快。           |
| `/graphify . --mode deep`    | **深度模式**：让 AI 进行更激进的推断，发现更多隐藏的关联。 |
| `/graphify . --cluster-only` | **仅重新聚类**：在现有图谱上重新运行社区发现算法。         |
| `/graphify . --directed`     | 构建有向图，保留实体间关系的方向性。                       |
| `/graphify . --watch`        | **监视模式**：自动监听文件变化并实时更新图谱。             |

**2. 导出和集成**

| 命令                                             | 说明                                                        |
| :----------------------------------------------- | :---------------------------------------------------------- |
| `/graphify . --svg`                              | 额外导出一个静态的 `.svg` 格式图谱文件。                    |
| `/graphify . --graphml`                          | 导出 `.graphml` 格式文件，可在 Gephi 等专业工具中使用。     |
| `/graphify . --neo4j`                            | 生成一个 `cypher.txt` 脚本，用于将图谱导入 Neo4j 图数据库。 |
| `/graphify . --neo4j-push bolt://localhost:7687` | 直接将图谱推送到正在运行的 Neo4j 数据库实例。               |
| `/graphify . --mcp`                              | 启动 MCP 标准输入/输出服务器，供其他 AI Agent 访问图谱。    |
| `/graphify . --wiki`                             | 生成一个可供 AI 智能体抓取的维基页面。                      |
| `/graphify . --obsidian`                         | 将知识图谱导出为 Obsidian 笔记库。                          |

**3. 查询和探索**

| 命令                                       | 说明                                                         |
| :----------------------------------------- | :----------------------------------------------------------- |
| `/graphify query "你的问题"`               | **广度优先查询**：根据问题在图谱中进行广度优先遍历，返回广泛的相关上下文。 |
| `/graphify query "你的问题" --dfs`         | **深度优先查询**：使用深度优先遍历，追踪一条特定的关联路径。 |
| `/graphify query "你的问题" --budget 1500` | **限制Token预算**：将回答的Token数量限制为1500。             |
| `/graphify path "节点A" "节点B"`           | **查找最短路径**：找出两个概念节点之间的最短关联路径。       |
| `/graphify explain "节点名"`               | **节点解释**：用通俗语言解释图谱中某个节点代表的含义。       |

**4. 内容添加**

| 命令                                       | 说明                                                   |
| :----------------------------------------- | :----------------------------------------------------- |
| `/graphify add <URL>`                      | 将指定URL的内容下载到 `./raw` 文件夹，并自动更新图谱。 |
| `/graphify add <URL> --author "姓名"`      | 添加URL内容时，标注其作者信息。                        |
| `/graphify add <URL> --contributor "姓名"` | 添加URL内容时，标注图谱贡献者信息。                    |

#### 💻 CLI 命令 (`graphify`)

在终端中使用 `graphify` 命令，主要用于系统设置和性能评估。

| 命令                              | 说明                                                         |
| :-------------------------------- | :----------------------------------------------------------- |
| `graphify --help`                 | 显示所有可用的命令和帮助信息。                               |
| `graphify --version`              | 查看 Graphify 的当前版本号。                                 |
| `graphify benchmark [graph_path]` | 运行性能基准测试，评估知识图谱相对于全文件读取的Token压缩效率。 |
| `graphify claude install`         | 注册一个 `PreToolUse` 钩子，让 Claude 在回答前优先查阅图谱，而非直接搜索文件。 |

### 💡 实用技巧与最佳实践

*   **输出的文件**：图谱构建完成后，所有产物都在项目根目录下的 `graphify-out/` 文件夹中。
    *   **`graph.html`**：**交互式可视化图谱**，可在浏览器中直接打开、拖拽和探索。
    *   **`GRAPH_REPORT.md`**：**文本摘要报告**，包含核心节点、意外连接和推荐问题。
    *   **`graph.json`**：**持久化的图谱数据**，是后续所有查询和增量更新的基础。
    *   **`cache/`**：缓存文件夹，用于追踪文件变更状态。

*   **两种运行模式**：了解其两阶段流程有助于更好地使用。
    1.  **确定性解析 (AST)**：处理代码文件时，完全在本地进行，**不消耗任何 API Token**。
    2.  **语义提取 (LLM)**：处理 PDF、图片等非代码文件时，会调用 AI 模型进行理解，**需消耗 API 额度**。

*   **信任但有验证**：Graphify 通过标签标注信息来源的**置信度**，这有助于评估其可靠性。
    *   `EXTRACTED` (高)：关系直接从代码中明确解析，可信度高。
    *   `INFERRED` (中)：关系由AI模型根据上下文推断得出。
    *   `AMBIGUOUS` (低)：关系不确定，需要人工复核。

*   **故障排查**：如果在 Windows 系统上提示找不到 `graphify` 命令，可以将 Python 的 Scripts 目录（通常是 `%APPDATA%\Python\PythonXY\Scripts`）手动添加到系统的环境变量 `PATH` 中。