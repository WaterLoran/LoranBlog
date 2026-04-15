# Strands Agents接入不同模型的API

Strands Agents 的一大核心优势是其**模型无关（Model-Agnostic）** 的设计哲学[reference:0]。它提供了一个统一的接口，让你可以使用完全相同的 `Agent` 代码来调用不同的大语言模型（LLM），只需在初始化时替换不同的 `Model` 实例即可。这样，你的核心业务逻辑便能与底层的模型实现彻底解耦，增强了应用的灵活性与可维护性。

---

### 🎯 支持的模型提供商总览

Strands Agents 内置了对众多主流模型提供商的支持，下面是截至当前版本（`v1.21.0`）的完整列表[reference:1]：

| 提供商 (Provider)   | 说明                                                         | 所需依赖/配置              |
| :------------------ | :----------------------------------------------------------- | :------------------------- |
| **Amazon Bedrock**  | 默认提供者[reference:2]，通过AWS访问Claude, Llama等模型[reference:3] | AWS凭证、模型权限          |
| **Anthropic**       | 直接调用Anthropic的Claude系列模型[reference:4]               | `anthropic`包              |
| **Google Gemini**   | 支持Gemini模型，可集成Google搜索、代码执行等原生工具[reference:5] | `google-generativeai`包    |
| **OpenAI**          | 调用OpenAI的GPT系列模型[reference:6]                         | `openai`包                 |
| **LiteLLM**         | 统一接口，通过一个模型ID调用超100种LLM提供商[reference:7]    | `litellm`包                |
| **Ollama**          | 连接本地运行的Ollama服务，支持Llama, Mistral等开源模型[reference:8] | `ollama`包，本地Ollama服务 |
| **LlamaAPI**        | 通过官方API访问Llama模型[reference:9]                        | `llama-api-client`包       |
| **Writer**          | 访问Writer公司的模型[reference:10]                           | Writer API密钥             |
| **Cohere**          | 访问Cohere公司的模型[reference:11]                           | Cohere API密钥             |
| **Clova Studio**    | Naver Cloud的韩国特化模型[reference:12]                      | `strands-clova`包，API密钥 |
| **Llama.cpp**       | 连接本地运行的llama.cpp服务[reference:13]                    | 本地llama.cpp服务          |
| **自定义 (Custom)** | 接入任何其他API或自建模型[reference:14]                      | -                          |

> **注意**：对于除 `Bedrock` 以外的所有云服务提供商，你都需要提供API密钥或相应的认证信息[reference:15][reference:16]。

---

### 🔌 模型集成实战

#### 1. 统一的工作流

无论你选择哪个模型提供商，集成的代码流程都遵循一个统一的模式：
1.  **创建模型实例**：初始化特定提供商的 `Model` 对象。
2.  **配置模型**：设置 `model_id`、`temperature`、`max_tokens` 等参数。
3.  **实例化智能体**：将模型实例作为 `model` 参数传递给 `Agent`。

#### 2. 代码示例

**1. 使用 Amazon Bedrock（默认）**
```python
from strands import Agent
from strands.models import BedrockModel

# 创建Bedrock模型实例，不指定模型时SDK会使用默认配置
bedrock_model = BedrockModel(
    model_id="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    region_name="us-west-2",
    temperature=0.3,
    max_tokens=4096
)
agent = Agent(model=bedrock_model)
result = agent("什么是Agentic AI？")
```
> **注意**：你需要提前配置好AWS凭证并确保在所选区域（默认为 `us-west-2`）具有模型的访问权限[reference:17]。

**2. 使用 OpenAI**
```python
from strands import Agent
from strands.models.openai import OpenAIModel

openai_model = OpenAIModel(
    client_args={"api_key": "your-openai-api-key"},  # 建议通过环境变量设置
    model_id="gpt-4o",
    params={"max_tokens": 1000, "temperature": 0.7}
)
agent = Agent(model=openai_model)
result = agent("将'Hello, world!'翻译成法语")
```

**3. 使用 Google Gemini**
```python
from strands import Agent
from strands.models.gemini import GeminiModel
from google.genai import types

gemini_model = GeminiModel(
    client_args={"api_key": "your-gemini-api-key"},
    model_id="gemini-2.0-flash-exp",
    gemini_tools=[types.Tool(google_search=types.GoogleSearch())]  # 集成Google搜索
)
agent = Agent(model=gemini_model)
result = agent("今天有什么关于AI的重大新闻？")
```

**4. 使用本地 Ollama**
```python
from strands import Agent
from strands.models.ollama import OllamaModel

ollama_model = OllamaModel(
    host="http://localhost:11434",  # 确保Ollama服务已启动
    model_id="llama3"
)
agent = Agent(model=ollama_model)
result = agent("什么是本地部署大语言模型？")
```

---

### 🛠️ 高级集成：构建生产级系统

#### 1. 动态模型切换：使用 `create_model` 工厂函数

如果你的应用需要在不同场景下使用不同模型，或者希望根据配置文件动态选择，可以使用工具包提供的 `create_model` 工厂函数[reference:18]。它支持通过环境变量或显式参数来创建模型实例[reference:19]。

```python
from strands.tools import create_model

# 基于提供商名称创建模型（也可通过环境变量 STRANDS_PROVIDER 配置）
model = create_model(model_provider="openai") # 可选: "bedrock", "anthropic", "ollama"等

agent = Agent(model=model)
```

#### 2. 自定义模型提供者

要接入官方尚未支持的模型，你可以创建自定义的模型提供者。这需要继承 `strands.models.Model` 类并实现其抽象方法[reference:20]。

```python
from strands.models import Model
from strands.types import Messages, SystemPrompt, ToolSpec, StreamEvent
from typing import List, AsyncGenerator
import aiohttp

class MyCustomModel(Model):
    def __init__(self, api_key: str, model_id: str = "my-custom-model", **config):
        super().__init__(**config)
        self.api_key = api_key
        self.model_id = model_id
        # 可以在此处设置更多的配置参数

    async def stream(
        self,
        messages: Messages,
        tools: List[ToolSpec],
        system_prompt: SystemPrompt
    ) -> AsyncGenerator[StreamEvent, None]:
        """核心方法，必须实现为异步生成器，负责与模型API通信并产生事件流"""
        # 1. 将Strands内部的消息格式化为你的模型API所需的格式
        # 2. 发送请求
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.my-custom-model.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model_id, "messages": self._format_messages(messages)}
            ) as response:
                # 3. 解析响应，并产生 StreamEvent 对象
                async for chunk in response.content:
                    yield StreamEvent(text=chunk.decode())
```
> **注意**：`stream` 方法是模型集成的核心。如果使用同步客户端，建议将其包装在线程中执行，以避免阻塞异步事件循环[reference:21]。

#### 3. 自定义HTTP客户端与高级网络配置

对于 OpenAI 和 Gemini 等模型，你可以传入一个预先配置好的 `httpx.AsyncClient` 实例，以实现更精细的网络控制，如设置代理、超时和连接池[reference:22]。

```python
import httpx
from strands.models.openai import OpenAIModel

# 创建一个带有代理和超时配置的自定义客户端
custom_client = httpx.AsyncClient(
    proxy="http://your-proxy:8080",
    timeout=httpx.Timeout(60.0, connect=5.0)
)
model = OpenAIModel(model_id="gpt-4o-mini", client=custom_client)
```

#### 4. 基于钩子的智能重试机制

在生产环境中，网络抖动或速率限制可能导致模型调用失败。你可以利用 `AfterModelCallEvent` 钩子，实现自定义的智能重试逻辑[reference:23]。下面的示例展示了遇到服务不可用错误时进行指数退避重试。

```python
from strands.hooks import AfterModelCallEvent, HookProvider

class RetryOnServiceUnavailable(HookProvider):
    def __init__(self, max_retries=3):
        self.max_retries = max_retries
        self.retry_count = 0

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(AfterModelCallEvent, self.handle_retry)

    async def handle_retry(self, event: AfterModelCallEvent):
        if event.exception and "ServiceUnavailable" in str(event.exception):
            if self.retry_count < self.max_retries:
                self.retry_count += 1
                event.retry = True  # 告诉框架重试此次调用
                await asyncio.sleep(2 ** self.retry_count)  # 指数退避
            else:
                self.retry_count = 0
        else:
            self.retry_count = 0
```

### 🚀 部署与最佳实践

*   **默认行为**：如果创建 `Agent` 时不指定 `model` 参数，Strands Agents 会默认使用 Amazon Bedrock 并调用一个默认的 Claude 模型[reference:24]。
*   **本地开发**：对于测试或无需云端大模型的场景，**Ollama** 提供了极佳的开发体验。
*   **环境变量管理凭证**：切勿在代码中硬编码API密钥。务必使用环境变量或AWS IAM角色等安全方式管理凭证[reference:25]。
*   **选择合适的模型**：根据任务复杂度和对延迟、成本的要求，在强大的旗舰模型（如Claude 3.5 Sonnet、GPT-4o）与轻快、经济的模型（如Claude Haiku、Gemini Flash）之间进行权衡。