# WorkFlow的智能体协作方式

如果说 **Graph** 是严格按照乐谱演奏的交响乐团，**Swarm** 是即兴配合的爵士乐队，那 **Workflow** 就像一个高效、标准化的**自动化流水线**。

在Strands中，**Workflow** 是一种**非内置**的、通过链式调用智能体实现的模式[reference:0]。你可以把它理解为在智能体上套了一层轻量级的、开发者主导的控制逻辑。它不是一个内置的、拥有复杂生命周期管理的类，而是直接在你的代码中组织与执行[reference:1]。

它的核心是**确定性**的：一旦定义了执行顺序，就会严格按照这个顺序执行，不存在智能体自主判断分支或动态交接控制权的情况。

### 📖 核心概念与关键差异

为了让你更直观地理解Workflow的特质，我整理了它与Graph、Swarm在核心维度的对比：

| 特性维度           | **Workflow**                                                 | **Graph**                                                  | **Swarm**                                                    |
| :----------------- | :----------------------------------------------------------- | :--------------------------------------------------------- | :----------------------------------------------------------- |
| **🎯 核心概念**     | 预定义的任务依赖图（DAG），一次性执行[reference:2]           | 由LLM决定分支的结构化流程图                                | 自主交接任务的动态协作团队[reference:3]                      |
| **🏗️ 结构定义**     | 由开发者在代码中定义所有任务及其依赖[reference:4]            | 开发者预先定义所有节点和边[reference:5]                    | 开发者提供一个智能体池，路径由智能体自己决定[reference:6]    |
| **🔀 执行流程**     | **确定性与并行**：流程完全固定，独立任务可并行执行[reference:7] | **受控动态**：流程遵循图结构，但路径由LLM决策[reference:8] | **顺序与自主**：智能体自主执行并决定将控制权移交给谁[reference:9] |
| **🔄 是否支持循环** | **不支持**。Workflow是无环的[reference:10]                   | **支持**。可以设计反馈循环[reference:11]                   | **支持**。通过自主交接实现[reference:12]                     |
| **📡 状态共享机制** | **通过输出传递**：下游任务的输入来自上游任务的输出[reference:13] | **共享状态对象**，所有节点均可读写[reference:14]           | **共享上下文**，包含所有历史记录和知识贡献[reference:15]     |

**💎 选择建议**：根据你的需求选择最合适的模式。
*   **需要简单、线性、步骤明确的自动化流程？** → 选择 **Workflow**，它能让代码清晰且易于维护。
*   **需要复杂的分支判断和并行处理？** → 选择 **Graph**，它的确定性流程让你能完全掌控。
*   **处理开放性的协作问题，需要动态涌现的智能？** → 选择 **Swarm**，让智能体自主交接任务，更灵活。

Workflow特别适合构建工具链、执行固定顺序的数据处理或报告生成等任务。它简单直接，易于理解和调试。

### 💻 实战演练：构建一个三阶段Workflow

下面，我们就以官方文档中的“研究助理”为例，构建一个由 **研究员(Researcher)** → **分析师(Analyst)** → **撰稿人(Writer)** 三个智能体组成的Workflow[reference:16]。

> 为了确保信息流的纯净，我们通常会为每个智能体单独创建一个`CallbackHandler`来抑制其默认的输出日志，确保用户只看到最终报告[reference:17]。

```python
from strands import Agent
from strands.handlers import CallbackHandler

# 1. 创建三个各司其职的智能体
researcher = Agent(
    name="Researcher",
    system_prompt="你是一名研究员，负责收集关于给定主题的核心事实和关键信息。请简要列出要点。"
)

analyst = Agent(
    name="Analyst",
    system_prompt="你是一名数据分析师。你的任务是基于输入信息，撰写一份简洁、清晰的分析报告。"
)

writer = Agent(
    name="Writer",
    system_prompt="你是一名报告撰写员。你的任务是基于分析结果，写出一份结构完整、措辞专业的正式报告。"
)

# 2. 定义编排函数
def run_research_workflow(topic: str) -> str:
    """
    该函数体现了Workflow的确定性编排逻辑：
    研究员 -> 分析师 -> 撰稿人
    """
    print(f"🚀 开始处理任务：'{topic}'")
    
    print("📚 阶段 1/3：研究员正在收集信息...")
    research_result = researcher(topic)
    
    print("📊 阶段 2/3：分析师正在分析信息...")
    analysis_result = analyst(research_result)
    
    print("✍️ 阶段 3/3：撰稿人正在撰写报告...")
    final_report = writer(analysis_result)
    
    print("✅ 任务完成！")
    return final_report

# 3. 执行Workflow
final_report = run_research_workflow("人工智能在医疗诊断中的最新应用")
print("\n" + "="*30)
print("最终报告：")
print(final_report)
```

**代码解析**：
*   **确定性执行流**：`run_research_workflow` 函数严格定义了三个步骤的顺序，这完美体现了Workflow的核心——**开发者主导**的控制逻辑。
*   **信息流传递**：`researcher` 的输出直接作为 `analyst` 的输入，后者的输出又作为 `writer` 的输入。这就是Workflow中的状态共享机制——**通过输出传递**[reference:18]。
*   **用户界面友好**：通过`print`语句，用户可以看到清晰的阶段性反馈，而不是智能体内部复杂的思考过程，提升了交互体验。

### 🛠️ 进阶：使用内置工具实现并行Workflow

除了手动编排，Strands Agents还提供了一个`workflow`工具，它能根据任务间的依赖关系自动处理**并行执行**[reference:19]，这是Graph模式的核心优势。

```python
from strands import Agent
from strands.tools import workflow
import time

# 创建三个独立的智能体
weather_agent = Agent(name="WeatherAgent", system_prompt="你是一个天气查询助手。")
news_agent = Agent(name="NewsAgent", system_prompt="你是一个新闻摘要助手。")
stock_agent = Agent(name="StockAgent", system_prompt="你是一个股票行情助手。")

@workflow
def process_city(city: str) -> dict:
    """
    使用workflow装饰器，让不相互依赖的Agent并行执行。
    """
    # 定义任务字典，键为任务名，值为一个元组 (智能体, 参数)
    tasks = {
        "weather": (weather_agent, f"{city}的天气如何？"),
        "news": (news_agent, f"关于{city}的最新新闻"),
        "stock": (stock_agent, f"{city}的本地上市公司股价"),
    }
    # 使用 workflow 工具执行
    return workflow(tasks)

# 执行Workflow，天气、新闻、股票查询将同时进行
result = process_city("深圳")
print(result)
```
**代码解析**：
*   **`@workflow`装饰器**：将函数标记为一个并行任务工作流。
*   **自动并行**：`tasks`字典中定义了三个任务，因为它们之间没有相互依赖，`workflow`工具会自动并行执行它们，极大提升了效率。
*   **结构化结果**：`workflow`工具返回一个字典，键与`tasks`中的键一一对应，方便你处理每个任务的结果。

**💎 总结**：Workflow 模式是你用代码直接书写的轻量级流水线，它以**确定性、线性的流程**见长。如果需要复杂的分支与状态共享，Graph 是更好的选择；而 Swarm 则更适合需要智能体自主交接、动态协作的开放性问题。掌握这三种模式，你就能在不同场景下灵活地构建高效的多智能体系统。