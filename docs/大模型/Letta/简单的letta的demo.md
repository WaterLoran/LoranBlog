# 简单的letta的demo

这里为你准备了一个基于 **Letta Python SDK** 的代码示例，它清晰地展示了如何创建一个“有状态”的AI助手。这个助手会在对话中动态更新它对用户的记忆。

### 🔧 第一步：安装与配置

在开始前，请确保已安装必要的Python库，并设置好你的API密钥。

1.  **安装 Letta Python SDK**：在终端中运行以下命令：
    ```bash
    pip install letta-client
    ```
    如果你想使用本地的嵌入模型，可以安装额外的依赖项：
    ```bash
    pip install 'letta-client[local]'
    ```

2.  **获取并设置 API Key**：
    *   前往 [Letta Cloud](https://app.letta.com/api-keys) 注册并获取你的 `LETTA_API_KEY`[reference:0]。
    *   为了方便，你可以将其设置为环境变量：
        ```bash
        export LETTA_API_KEY="your_api_key_here"
        ```
        在代码中直接使用这个变量，可以避免明文保存密钥[reference:1]。

### 💻 第二步：完整代码示例

创建一个Python文件（例如 `my_letta_agent.py`），并写入以下代码：

```python
from letta_client import Letta

# 1. 初始化客户端
client = Letta(api_key="YOUR_LETTA_API_KEY")  # 建议使用环境变量替代硬编码

# 2. 创建一个有状态的Agent
agent_state = client.agents.create(
    model="openai/gpt-4o-mini",  # 指定模型
    embedding="openai/text-embedding-3-small",  # 指定嵌入模型
    memory_blocks=[  # 配置记忆块
        {
            "label": "human",
            "value": "The human's name is Chad. They like vibe coding.",  # 初始的人类信息
        },
        {
            "label": "persona",
            "value": "My name is Sam, a helpful assistant.",  # 定义Agent自身角色
        },
    ],
    tools=["web_search", "run_code"],  # 为Agent配备工具
)

# 打印Agent的唯一标识符
print(f"Agent created with ID: {agent_state.id}")

# 3. 发送第一条用户消息
response = client.agents.messages.create(
    agent_id=agent_state.id,
    messages=[
        {"role": "user", "content": "Hey, nice to meet you, my name is Brad."}
    ],
)

# 4. 打印Agent的回复
for message in response.messages:
    print(f"{message.role}: {message.content}")

# 5. 查看并验证Agent的记忆是否已更新
human_block = client.agents.blocks.retrieve(agent_id=agent_state.id, block_label="human")
print(f"\n[Updated Memory Block 'human']: {human_block.value}")
```

### 📝 第三步：代码逐行解释

我们来一步步拆解这段代码，看看它是如何让AI拥有“记忆”的。

*   **导入与初始化**:
    ```python
    from letta_client import Letta
    client = Letta(api_key="YOUR_LETTA_API_KEY")
    ```
    从 `letta_client` 库导入 `Letta` 类，并用你的API密钥初始化客户端，这是与Letta平台交互的入口点。

*   **创建有状态的Agent (`client.agents.create`)**:
    ```python
    agent_state = client.agents.create(...)
    ```
    这是最核心的部分，它创建了一个“有状态”的Agent。我们为它配置了三个关键要素[reference:2]：
    *   **`model`**: 指定Agent使用的AI模型，这里是 `gpt-4o-mini`。
    *   **`embedding`**: 指定用于处理记忆的嵌入模型。
    *   **`memory_blocks`**: 这是Letta实现记忆的关键。我们定义了两个记忆块[reference:3]：
        *   `human` 块：存储关于用户的信息。初始值是“The human's name is Chad. They like vibe coding.”。
        *   `persona` 块：存储Agent自身的角色设定。
    *   **`tools`**: 赋予Agent调用外部工具的能力，如 `web_search` 和 `run_code`，这让它能完成更复杂的任务。

*   **发送消息并触发记忆更新 (`client.agents.messages.create`)**:
    ```python
    response = client.agents.messages.create(...)
    ```
    我们向Agent发送一条消息，并提供了一个新的信息：“Hey, nice to meet you, my name is Brad.”[reference:4]。Letta Agent的核心能力在于，**它会自主判断这条消息中的信息是否重要，并决定是否、以及如何更新自己的记忆**[reference:5]。

*   **验证记忆更新 (`client.agents.blocks.retrieve`)**:
    ```python
    human_block = client.agents.blocks.retrieve(...)
    print(...)
    ```
    在对话结束后，我们通过 `retrieve` 方法主动获取 `human` 记忆块的内容，来验证Agent是否真的“记住”了用户叫Brad这件事[reference:6]。

### 🧠 第四步：关键概念详解

*   **“有状态”Agent (Stateful Agent)**
    与每次对话都“重置”的传统聊天机器人不同，Letta创建的Agent是“有状态”的。这意味着它能跨越多轮对话，记住用户说过的话、自己的决定和行动，从而实现真正个性化的交互[reference:7]。

*   **记忆块 (Memory Blocks)**
    这是Letta记忆机制的基础。你可以把记忆块想象成Agent的“笔记本”，里面分类记录了各类信息，比如 `human`、`persona` 等[reference:8]。这些信息会持久化地保存在Agent的上下文中。Agent不仅能读取，还能通过调用工具来**自主决定何时编辑或更新**这些记忆块[reference:9]。

*   **自主记忆编辑**
    这是Letta最智能的部分。当Agent收到用户消息（“我叫Brad”）时，它内部会进行推理：这个消息是否与现有的`human`记忆块冲突？如果是，它就会自动调用一个内置的记忆编辑工具，悄悄地把“Chad”更新为“Brad”，整个过程无需你编写额外的逻辑代码[reference:10]。

### 🚀 第五步：运行示例与进阶建议

1.  **运行代码**：
    将你的API密钥填入代码后，在终端中运行 `python my_letta_agent.py`。你会看到类似的输出（实际内容可能略有不同）：
    ```
    Agent created with ID: agent-abc123...
    assistant: Nice to meet you, Brad! I've updated your name in my memory. How can I assist you today?
    
    [Updated Memory Block 'human']: The human's name is Brad. They like vibe coding.
    ```

2.  **从哪里开始探索？**
    *   **快速原型设计**：Letta提供了**Agent开发环境 (ADE)**，这是一个无代码/低代码的可视化界面，你可以通过拖拽组合来快速设计和测试Agent，然后将它导出为代码[reference:11]。
    *   **本地独立运行**：如果你希望完全本地运行，可以使用 **Letta Code**，这是一个命令行工具，能让你在终端里与Agent交互[reference:12]。
    *   **创建自定义工具**：你可以编写自己的Python函数，并通过简单的装饰器（decorator）将它注册为Agent可以调用的工具，从而极大地扩展Agent的能力[reference:13]。