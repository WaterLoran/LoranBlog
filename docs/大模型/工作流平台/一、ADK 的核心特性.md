ADK简介及其例子
Google Agent Development Kit (ADK) 是 Google 在 2025 年 4 月 Google Cloud Next 大会上正式发布的开源智能体开发框架。它是一个**代码优先**的 Python/Java/Go 工具包，旨在简化从简单对话机器人到复杂多智能体系统的构建、评估和部署流程。

简单来说，ADK 解决的是"如何让 AI 不仅能对话，还能调用工具、规划任务、协同工作"的问题。

---

## 一、ADK 的核心特性

| 特性               | 说明                                                         |
| ------------------ | ------------------------------------------------------------ |
| **代码优先**       | 用 Python/Java 直接定义 Agent 逻辑、工具和编排，便于版本控制和测试 |
| **多语言支持**     | Python、Java (含 Kotlin 兼容)、Go，未来计划扩展              |
| **模型无关**       | 优化支持 Gemini，同时兼容 OpenAI、Anthropic、Ollama 等 200+ 模型 |
| **丰富的工具生态** | 预置 Google Search、代码执行、MCP 协议支持，可自定义函数工具 |
| **多智能体编排**   | 支持顺序、并行、循环、子 Agent 等多种协作模式                |
| **内置开发 UI**    | 开箱即用的 Web 调试界面，可视化追踪 Agent 的思考过程和工具调用 |
| **无缝部署**       | 本地开发后一键部署到 Cloud Run 或 Vertex AI Agent Engine     |
| **A2A 协议**       | 支持 Agent 间标准化通信，可跨服务远程调用                    |

---

## 二、常见使用场景

### 1. 智能客服与助手
构建企业级问答机器人，集成内部知识库、API 和文档，自动回答用户问题。例如 Revolgy 公司的 Google Cloud Summit Assistant，能够回答关于会议议程、Google Cloud 文档等问题。

### 2. 旅行规划助手
结合地图 API、天气 API、酒店预订等工具，让 Agent 自动规划行程、推荐景点和住宿。

### 3. 多智能体协作系统
模拟真实团队分工——管理 Agent 负责任务分配，工程师 Agent 执行任务，测试 Agent 验证结果，实现自动化项目管理。

### 4. 信息检索与处理
让 Agent 联网搜索、分析文档、总结内容，并返回带引用的答案。ADK 内置 Google Search 工具，开箱即用。

### 5. 代码生成与调试
Agent 可以生成代码、执行代码（支持 Docker 或 Vertex AI 沙箱）、审查输出并迭代优化。

---

## 三、安装与快速上手

### 环境要求
- Python 3.9+
- Google Cloud 项目（使用 Gemini 时需要）或 Gemini API Key

### 安装步骤

```bash
# 1. 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 2. 安装 ADK
pip install google-adk

# 3. 创建项目目录结构
mkdir my_agent
cd my_agent
touch __init__.py agent.py .env
```

### 配置 .env 文件
```bash
# 使用 Gemini API Key（推荐快速上手）
GOOGLE_GENAI_USE_VERTEXAI=FALSE
GOOGLE_API_KEY="your_gemini_api_key"

# 或使用 Vertex AI（需要 GCP 项目）
# GOOGLE_GENAI_USE_VERTEXAI=TRUE
# GOOGLE_CLOUD_PROJECT="your-project-id"
# GOOGLE_CLOUD_LOCATION="us-central1"
```

### 编写第一个 Agent

**agent.py**：
```python
import datetime
from zoneinfo import ZoneInfo
from google.adk.agents import Agent

# 定义一个工具：获取天气
def get_weather(city: str) -> dict:
    """获取指定城市的天气信息
    
    Args:
        city: 城市名称
    """
    if city.lower() == "new york":
        return {
            "status": "success",
            "report": "纽约天气晴朗，温度 25°C"
        }
    else:
        return {
            "status": "error",
            "error_message": f"暂无 {city} 的天气信息"
        }

# 定义一个工具：获取当前时间
def get_current_time(city: str) -> dict:
    """获取指定城市的当前时间"""
    if city.lower() == "new york":
        tz = ZoneInfo("America/New_York")
        now = datetime.datetime.now(tz)
        return {
            "status": "success",
            "report": f"{city} 当前时间: {now.strftime('%Y-%m-%d %H:%M:%S')}"
        }
    else:
        return {
            "status": "error",
            "error_message": f"暂无 {city} 的时区信息"
        }

# 创建 Agent
root_agent = Agent(
    name="weather_time_agent",
    model="gemini-2.0-flash",  # 可用 gemini-2.5-flash 等
    description="一个可以查询天气和时间的智能助手",
    instruction="你是一个助手，可以帮助用户查询城市的天气和当前时间。",
    tools=[get_weather, get_current_time]
)
```

**__init__.py**：
```python
from . import agent
```

### 启动调试界面

```bash
# 在 my_agent 的父目录执行
adk web
```

访问 `http://localhost:8000`，选择你的 Agent，即可在 Web 界面中对话和调试。

---

## 四、进阶示例：多智能体系统

下面是一个简单的多智能体系统，包含一个协调者 Agent 和两个专业 Agent：

```python
from google.adk.agents import LlmAgent

# 定义专业 Agent
greeter = LlmAgent(
    name="greeter",
    model="gemini-2.0-flash",
    instruction="你是一个友好的接待员，欢迎用户并简单介绍服务。"
)

task_executor = LlmAgent(
    name="task_executor", 
    model="gemini-2.0-flash",
    instruction="你是一个任务执行者，负责完成用户的具体任务。"
)

# 定义协调者 Agent（通过 sub_agents 组合）
coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-2.0-flash",
    description="我负责协调接待员和任务执行者",
    sub_agents=[greeter, task_executor]  # 子 Agent 列表
)
```

ADK 还支持**顺序 Agent（SequentialAgent）**、**并行 Agent（ParallelAgent）**、**循环 Agent（LoopAgent）** 等编排模式。

---

## 五、最佳实践与建议

1. **工具设计**：为每个函数工具编写清晰的 docstring，说明功能、参数和返回值，这帮助 LLM 理解如何正确调用。

2. **指令优化**：使用 Prompt Engineering 技术为 Agent 编写详细的 instruction，明确输入输出格式和行为边界。

3. **调试技巧**：善用 `adk web` 开发 UI，查看 Agent 的事件日志、工具调用轨迹和 Token 消耗。

4. **部署路径**：
   - 本地测试：`adk api_server` 启动 FastAPI 服务
   - 生产部署：容器化后部署到 Cloud Run，或使用 Vertex AI Agent Engine 托管

5. **生态集成**：
   - 需要联网搜索：使用内置 `google_search` 工具
   - 需要代码执行：使用 `CodeExecutor` 或 `AgentEngineSandboxCodeExecutor`
   - 需要 MCP 协议：支持 MCP Server 集成

---

## 六、与你的 RAG 场景结合

结合你之前提到的 Git + Markdown + RAGFlow 的场景，你可以：

1. **用 ADK 作为 Agent 编排层**：处理用户意图识别、多轮对话、工具路由
2. **将 RAGFlow API 封装为 ADK 工具**：让 Agent 能够调用 RAGFlow 的检索接口获取文档内容
3. **实现"问文档 + 联网补充 + 生成答案"的复合能力**

示例工具封装：
```python
import requests

def ragflow_search(query: str) -> str:
    """在知识库中搜索相关内容
    
    Args:
        query: 搜索查询
    """
    response = requests.post(
        "http://ragflow-server/api/v1/retrieval",
        json={"question": query, "dataset_ids": ["your_dataset_id"], "top_k": 3}
    )
    results = response.json()
    return "\n".join([r["content"] for r in results.get("data", [])])

# 在 Agent 中使用
root_agent = Agent(
    name="knowledge_agent",
    model="gemini-2.0-flash",
    tools=[ragflow_search],
    instruction="你是知识助手，可以搜索知识库回答用户问题。"
)
```

---

## 七、资源链接

- 官方文档：[google.github.io/adk-docs](https://google.github.io/adk-docs)
- GitHub (Python) ：[github.com/google/adk-python](https://github.com/google/adk-python)
- 示例库：[github.com/google/adk-samples](https://github.com/google/adk-samples)
- 社区扩展：[adk-python-community](https://github.com/google/adk-python-community)

如果你有更具体的场景（比如结合 RAGFlow 做企业知识问答），我可以帮你设计更详细的 Agent 架构。