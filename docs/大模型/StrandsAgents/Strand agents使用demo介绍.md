# Strand agents使用demo介绍

为帮助你快速上手，这里提供了一个从环境准备到工具集成，再到多智能体编排的完整示例。

整个示例围绕一个“用户支持代理”场景展开：该代理系统由一个**中心编排器**（Orchestrator）统一调度，根据用户问题类型，将其路由给负责**数学计算**或**文本处理**的专属“专家代理”来执行。

### 🛠️ 1. 环境准备

你需要完成以下准备工作：
*   **Python版本**：请确保你的环境是 `Python 3.10` 或更高版本[reference:0][reference:1]。
*   **安装SDK**：通过`pip`安装核心库和官方工具集。
    ```bash
    pip install strands-agents strands-agents-tools
    ```
    核心包提供了`Agent`类等基础功能[reference:2]，工具包则提供了`calculator`等内置工具，可直接使用[reference:3][reference:4]。

### 🤖 2. 基础示例：一个带工具的智能体

这个基础示例向你展示如何创建一个能直接使用工具的智能体。

```python
from strands import Agent
# 从官方工具包中导入一个内置的计算器工具
from strands_tools import calculator

# 1. 创建一个Agent，并将计算器工具交给他
# Agent会根据用户的提问，自主判断是否以及如何使用这个工具
agent = Agent(tools=[calculator])

# 2. 向Agent提问，这会触发模型自主决策和工具调用的内部循环
result = agent("帮我计算一下，如果我有 250 块钱，要分给 7 个人，每个人能得多少？")

# 3. 打印Agent的最终回答
print(result)
```

**▶️ 代码详解**

*   **`from strands_tools import calculator`**：导入了官方工具包中的一个内置计算器[reference:5]。
*   **`Agent(tools=[calculator])`**：初始化智能体，并将计算器作为其可用工具列表传入。这背后的核心理念是 **模型驱动编排 (Model-driven Orchestration)**：开发者只需为模型（Agent）定义角色（Prompt）和工具（Tools），AI模型便会自主决定如何规划和使用这些工具来解决问题。
*   **`agent("...")`**：这是触发**智能体循环 (Agentic Loop)** 的核心入口。循环持续运行，在收到用户的复杂问题后，模型会先进行推理（如“需要进行除法运算”），然后调用计算器工具执行运算，最后组织语言形成回答返回给用户[reference:6]。

### 🛠️ 3. 进阶示例：创建并使用自定义工具

除了使用内置工具，你还可以轻松地为智能体添加自定义功能。下面的例子展示如何创建一个专门用于统计文本中特定单词出现次数的工具。

```python
from strands import Agent, tool

# 1. 使用 @tool 装饰器定义一个自定义工具
# 函数名、参数名和函数的文档字符串（docstring）都会被模型用于理解该工具的功能
@tool
def count_word_occurrences(text: str, word: str) -> int:
    """
    统计一段文本中某个特定单词出现的次数。
    
    Args:
        text: 需要被搜索的文本内容。
        word: 需要被统计的目标单词。
    """
    return text.lower().split().count(word.lower())

# 2. 创建Agent，并将自定义工具加入工具列表
agent = Agent(
    tools=[count_word_occurrences],  # 这里可以传入多个工具
)

# 3. 测试智能体
query = "请帮我统计一下，在句子 'Strands Agents makes building agents easy and powerful. I love Strands Agents!' 中，'Strands' 这个词出现了几次？"
result = agent(query)
print(result)
```

**▶️ 代码详解**

*   **`@tool` 装饰器**：这是`strands`提供的核心装饰器，用于将普通的Python函数转换为Agent能够识别和调用的工具[reference:7]。函数的**文档字符串（docstring）** 对工具的功能和参数进行了自然语言描述，这是AI模型理解何时以及如何使用该工具的关键。
*   **自定义工具逻辑**：函数内部是你用Python实现的任何逻辑，这为智能体提供了极大的扩展性，使其能与任何API、数据库或本地系统进行交互。

### 🤝 4. 多智能体编排示例：路由器和专家

对于更复杂的任务，可以让多个智能体各司其职，由一个中心编排器统一调度。这是Strands Agents的核心优势之一。

```python
from strands import Agent, tool

# --- 1. 创建专用工具和专家智能体 ---
@tool
def add(a: float, b: float) -> float:
    """计算两个数的和。"""
    return a + b

# 数学专家智能体，专注于解决数学问题
math_expert = Agent(
    name="MathExpert",
    system_prompt="""你是一个数学专家。你的唯一职责是回答用户的数学计算问题。
    你会使用 add 等计算工具，并以清晰、准确的方式给出答案。
    如果你的工具无法处理，或者用户的问题不属于数学范畴，请诚实地说明。""",
    tools=[add]
)

@tool
def reverse_string(s: str) -> str:
    """反转一个字符串。"""
    return s[::-1]

# 文本专家智能体，专注于处理文本
text_expert = Agent(
    name="TextExpert",
    system_prompt="""你是一个文本处理专家。你的职责是处理与文本相关的任务，
    例如反转字符串、统计字数等。请使用提供的工具来高效完成任务。""",
    tools=[reverse_string]
)

# --- 2. 创建编排器智能体 (Orchestrator) ---
# 编排器将上述两个专家作为工具来使用，根据用户需求进行路由
orchestrator = Agent(
    name="Orchestrator",
    system_prompt="""你是一个智能路由编排器。你的唯一职责是分析用户的请求，
    并准确地将其分配给最合适的专家来处理。

    # 可用的专家
    - MathExpert: 专门处理所有数学和计算相关的问题。
    - TextExpert: 专门处理所有文本处理相关的任务，如反转字符串、统计字数等。

    # 任务
    1. 分析用户的请求，判断其属于数学问题还是文本问题。
    2. 将完整的用户请求原封不动地转发给选定的专家。
    3. 返回专家给出的结果。""",
    tools=[math_expert, text_expert]  # 关键：将其他Agent作为工具
)

# --- 3. 测试多智能体系统 ---
test_queries = [
    "我买了15元的苹果和23元的香蕉，一共花了多少钱？",
    "请将字符串 'Hello World!' 反转。",
    "给我讲个笑话。"
]

for query in test_queries:
    print(f"用户：{query}")
    response = orchestrator(query)
    print(f"编排器：{response}\n")
```

**▶️ 代码详解**

*   **`math_expert`和`text_expert`**：我们创建了两个职责明确的 **专家智能体**，它们分别配置了专属的工具（`add`和`reverse_string`）和指令，各自只关注自己的专业领域。
*   **`orchestrator`**：这是整个系统的“大脑”，即 **编排器 (Orchestrator)**。它的关键设置在于 `tools=[math_expert, text_expert]`，这意味着它将另外两个Agent **“作为工具”** 来调用，而不是直接去解决问题本身。这是一种强大的多智能体协作模式[reference:8][reference:9]。
*   **模型驱动路由**：编排器通过其`system_prompt`被赋予了“路由调度”的使命。当你向`orchestrator`提问时，它会自主分析用户意图（是数学问题还是文本问题），然后选择并调用合适的“专家”工具来处理，最后将结果返回给你。

### 📝 关键概念速览

*   **Agent 类**：Strands Agents 的核心，所有智能体功能的入口。通过参数如`tools`、`system_prompt`和`name`来定制行为[reference:10][reference:11]。
*   **`@tool` 装饰器**：将Python函数注册为Agent可调用的工具，是扩展智能体能力的关键。它的**文档字符串 (docstring)** 是模型理解工具用途的核心[reference:12]。
*   **模型驱动编排**：开发者只需定义智能体的角色（Prompt）和工具（Tools），AI模型便能自主规划并调用工具来完成任务。
*   **智能体循环 (Agentic Loop)**：Agent在每次被调用后内部运行的“感知-推理-行动”循环，是实现自主任务执行的基础。
*   **多智能体协作**：通过将Agent作为工具，可以轻松构建复杂的协作系统，实现 **路由器+专家（Router+Specialists）**、**图工作流（Graph Workflows）** 等多种高级模式。