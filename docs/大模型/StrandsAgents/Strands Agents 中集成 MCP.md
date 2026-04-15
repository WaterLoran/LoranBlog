# Strands Agents 中集成 MCP

在 Strands Agents 中集成 MCP，只需几行代码就能为你的 AI 智能体接入成千上万个标准化工具[reference:0]。这通常遵循“创建客户端 -> 发现工具 -> 注入智能体”三步模式，Strands 负责处理所有通信细节，让你的智能体轻松获得外部能力。

### 🧠 什么是 MCP？

**MCP** 是专为 AI 智能体设计的开放协议，用于标准化地连接外部服务[reference:1]。它为智能体提供“万能插头”，通过统一接口访问**任何**MCP 服务器（第三方工具、数据库或API），无需为每个工具编写单独代码，且 Strands 会自动处理通信细节[reference:2]。

### ⚙️ 准备工作

1.  **确认环境**：需要 `Python 3.10` 或更高版本[reference:3]。
2.  **安装依赖**：
    ```bash
    pip install strands-agents strands-agents-tools mcp
    ```
    `strands-agents-tools` 提供了 `MCPClient`[reference:4], `mcp` 库提供了创建服务器和客户端的底层工具[reference:5]。

### 🔌 连接 MCP 服务器

Strands 的 `MCPClient` 支持多种连接方式[reference:6]，以覆盖不同的部署场景，最常用的是 Stdio 和 Streamable HTTP。

#### 1. Stdio 集成：连接本地进程

这种方式用于与本地 MCP 服务器进行通信，非常适合集成命令行工具、运行在本地的服务，或开发测试阶段。

```python
from mcp import StdioServerParameters, stdio_client
from strands import Agent
from strands.tools.mcp import MCPClient

# 1. 创建 MCP 客户端
# 通过 stdio_client 连接到一个通过标准输入输出通信的本地进程
# 这里的 'uvx' 用于运行 Python 包，args 指定了要运行的服务器包
mcp_client = MCPClient(
    lambda: stdio_client(
        StdioServerParameters(
            command="uvx",
            args=["awslabs.aws-documentation-mcp-server@latest"]
        )
    )
)

# 2. 在上下文中使用客户端，确保资源正确管理
with mcp_client:
    # 3. 发现工具：智能体运行时，会自动查询服务器，获取所有可用工具的元数据
    all_tools = mcp_client.list_tools_sync()
    # 4. 创建 Agent 并注入工具
    agent = Agent(tools=all_tools)

    # 5. 使用自然语言调用工具
    response = agent("请告诉我关于 Amazon Bedrock 的信息")
    print(response)
```

**代码解释**：
*   **`MCPClient`**：这是桥梁，负责管理与 MCP 服务器的连接[reference:7]。
*   **`StdioServerParameters`**：描述要启动的本地进程。`command="uvx"` 和 `args=["..."]` 告诉 Strands 如何启动这个服务器[reference:8]。
*   **上下文管理器 (`with mcp_client:`)**：确保连接被正确打开和关闭，是**必须**的使用模式[reference:9]。
*   **`list_tools_sync()`**：Strands 通过此方法自动发现服务器提供的所有工具，并将它们转换为 Agent 能直接使用的 `Tool` 对象[reference:10]。

#### 2. HTTP/SSE 集成：连接远程服务

如果你的 MCP 服务器部署在云端或通过网络访问，可以使用 HTTP 或 SSE (Server-Sent Events) 进行连接。

```python
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp.client.streamable_http import streamablehttp_client

MCP_SERVER_URL = "http://your-mcp-server.com/mcp"

# 1. 创建客户端，指定通过 HTTP 连接
mcp_client = MCPClient(
    lambda: streamablehttp_client(MCP_SERVER_URL)
)

with mcp_client:
    # 2. 发现并使用工具
    agent = Agent(tools=mcp_client.list_tools_sync())
    # agent 将能够使用该 MCP 服务器上暴露的所有工具
```

**代码解释**：
*   这里的关键是使用 `streamablehttp_client` 替代了 `stdio_client`。
*   `MCP_SERVER_URL` 是远程 MCP 服务的地址。这使得你的智能体可以轻松集成由团队其他成员或第三方提供的标准化工具服务[reference:11]。

### 🤖 实践案例：构建一个试题小助手

这个例子会构建一个完整的流程：创建一个提供试题的 MCP 服务器，然后让 Strands 智能体连接到它。

#### 步骤 1: 创建 MCP 服务器 (quiz_server.py)

首先，我们创建一个简单的 MCP 服务器，它提供一个获取试题的工具。

```python
# quiz_server.py
from mcp.server import FastMCP
import random

# 创建一个 FastMCP 服务器实例
mcp = FastMCP("Quiz Service", host="0.0.0.0", port=8080)

# 试题库
QUESTIONS = {
    "python": {
        "question": "Python 中，用于定义函数的正确关键字是什么？",
        "options": ["func", "def", "function", "define"],
        "answer": "def"
    },
    "cloud": {
        "question": "以下哪项是 AWS 提供的对象存储服务？",
        "options": ["EC2", "Lambda", "S3", "RDS"],
        "answer": "S3"
    }
}

# 使用 @mcp.tool() 装饰器暴露一个工具函数
@mcp.tool()
def get_quiz(topic: str) -> str:
    """
    根据指定主题获取一个测验题目。
    
    Args:
        topic: 主题名称，可选值为 "python" 或 "cloud"
    """
    if topic not in QUESTIONS:
        return f"抱歉，没有找到关于 '{topic}' 的题目。"
    
    q_data = QUESTIONS[topic]
    options_text = "\n".join([f"- {opt}" for opt in q_data["options"]])
    return f"题目：{q_data['question']}\n选项：\n{options_text}"

# 运行服务器
if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

#### 步骤 2: 创建 Strands 智能体并连接服务器 (quiz_agent.py)

接下来，创建智能体，让它连接刚才启动的 MCP 服务器并使用其工具。

```python
# quiz_agent.py
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp.client.streamable_http import streamablehttp_client

# 1. 连接到 MCP 服务器
mcp_client = MCPClient(
    lambda: streamablehttp_client("http://localhost:8080/mcp")
)

with mcp_client:
    # 2. 获取服务器提供的所有工具（这里就是 get_quiz）
    tools_from_mcp = mcp_client.list_tools_sync()
    
    # 3. 创建 Agent 并加载这些 MCP 工具
    agent = Agent(tools=tools_from_mcp)

    # 4. 现在，Agent 就能理解并调用 get_quiz 工具了
    response = agent("能给我出一道关于 Python 的题目吗？")
    print(response)
```

#### 运行与测试

1.  在一个终端窗口启动服务器：`python quiz_server.py`。
2.  在另一个终端窗口运行智能体：`python quiz_agent.py`。

你的智能体会理解你的请求，调用 `get_quiz` 工具，并将获取到的题目呈现给你。

### ⚠️ 关键注意事项

*   **生命周期管理**：所有与 MCP 服务器的交互**必须**在 `with mcp_client:` 的上下文管理器内部进行。这是保证连接正常建立和关闭的关键[reference:12]。
*   **本地开发**：对于本地开发，`stdio` 连接非常方便，因为它无需网络配置。`FastMCP` 也支持 `stdio`，只需在 `run` 方法中设置 `transport="stdio"`。
*   **部署**：在生产环境，通常将 MCP 服务器作为独立服务部署，智能体则通过 `streamablehttp_client` 与其连接。
*   **高级功能**：除了工具调用，Strands 的 MCP 客户端还支持列出和读取服务器上的资源，这为更复杂的应用场景（如访问文件或数据库）提供了可能[reference:13]。

通过以上方式，你可以用标准化的接口，为你的智能体高效地接入和管理各类工具。