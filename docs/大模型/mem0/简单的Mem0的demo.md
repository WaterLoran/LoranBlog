# 简单的Mem0的demo

这里为你准备了几个 Mem0 不同层次的 Demo，从基础的内存操作到框架集成。你可以根据自己的技术栈和场景需求，选择最适合的示例来上手。

### 🧠 Demo 1：入门级对话机器人（最简示例）
这个例子很基础，会创建一个能记住你偏好和事实的对话机器人，非常适合快速上手。

**核心逻辑：** 每次收到消息时，先从 Mem0 中搜索相关记忆，然后交给 OpenAI 生成回复，最后再将这次对话存入 Mem0。

**运行它你需要做：**
1.  **安装依赖**：`pip install mem0ai openai`。
2.  **设置 API Key**：注册 [OpenAI](https://openai.com) 获取 `OPENAI_API_KEY`，在终端执行 `export OPENAI_API_KEY=你的key`。
3.  **复制并运行**：保存以下代码为 `demo.py`，然后运行 `python demo.py`。

**Python 示例代码：**
```python
from openai import OpenAI
from mem0 import Memory

# 1. 初始化 OpenAI 和 Mem0
openai_client = OpenAI()
memory = Memory()

def chat_with_memories(message: str, user_id: str = "user_123"):
    # 2. 检索相关记忆
    relevant_memories = memory.search(query=message, user_id=user_id, limit=3)
    memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])

    # 3. 构建 Prompt 并调用 LLM
    system_prompt = f"""你是一个乐于助人的AI，请根据用户的过往记忆回答问题。
    ### 用户记忆:
    {memories_str}
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message}
    ]
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    assistant_response = response.choices[0].message.content

    # 4. 将本次对话存入 Mem0
    messages.append({"role": "assistant", "content": assistant_response})
    memory.add(messages, user_id=user_id)

    return assistant_response

if __name__ == "__main__":
    print("🤖 记忆型聊天机器人已启动，输入 'exit' 退出。")
    while True:
        user_input = input("你: ")
        if user_input.lower() == 'exit':
            break
        response = chat_with_memories(user_input)
        print(f"AI: {response}\n")
```

#### 💡 代码解释
*   **`memory.search(query=message, ...)`**: 接收你输入的文本（如“我讨厌辣的食物”），通过语义搜索在 Mem0 里找到最相关的 3 条记忆，然后把它们取出来备用[reference:0]。
*   **`memory.add(messages, ...)`**: 将你和 AI 的对话内容加入 Mem0。它不仅能记录事实，还能理解对话中隐含的信息（比如记住你“不喜欢恐怖片”）[reference:1][reference:2]。
*   **`user_id`**: Mem0 用它来区分不同用户的记忆空间，这样每个人都会有自己的专属记忆[reference:3]。

#### 🚀 进阶尝试
*   修改 `limit=5`，让 AI 参考更多记忆，回复更全面[reference:4]。
*   在 `memory.add()` 时加入 `metadata` 参数，如 `metadata={"category": "personal"}`, 方便后续按类别管理记忆[reference:5]。
*   将 OpenAI 换成你喜欢的其他模型，Mem0 在模型上很灵活[reference:6]。

---

### 🌐 Demo 2：使用 Mem0 与 CrewAI 构建旅行规划智能体（进阶多智能体）
这个例子展示了如何将 Mem0 集成到流行的**多智能体框架 CrewAI** 中，打造一个能记住用户偏好的旅行规划师[reference:7]。

#### 1. 安装依赖
```bash
pip install crewai crewai-tools mem0ai
```
同时设置好 OpenAI 和 SERPER（用于搜索）的 API Key。

#### 2. 代码实现与解释
```python
import os
from mem0 import MemoryClient
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool

# --- 1. 配置与初始化 ---
client = MemoryClient()  # 初始化 Mem0 客户端
search_tool = SerperDevTool()

# --- 2. 模拟一次对话，并将用户偏好存入 Mem0 ---
messages = [
    {"role": "user", "content": "我更喜欢海滩而不是山景。"},
    {"role": "assistant", "content": "收到！您是海滩爱好者。"},
    {"role": "user", "content": "我也喜欢 Airbnb 多于酒店。"}
]
client.add(messages=messages, user_id="travel_user_1")  # 存入记忆

# --- 3. 创建带有记忆的 CrewAI Agent ---
travel_agent = Agent(
    role="个性化旅行规划师",
    goal="根据用户的历史偏好，规划令人难忘的旅行",
    backstory="你是一位经验丰富的旅行规划师，善于挖掘并利用客户的个人偏好。",
    tools=[search_tool],
    memory=True,                     # 启用内存
    memory_config={                  # 关键：配置使用 Mem0
        "provider": "mem0",
        "config": {"user_id": "travel_user_1"}  # 关联特定用户的记忆
    }
)

# --- 4. 创建任务并运行 ---
plan_task = Task(
    description="为一位喜欢海滩和Airbnb的用户，推荐几个巴厘岛的海滩和特色Airbnb房源。",
    expected_output="一个包含海滩推荐和Airbnb推荐的详细列表。",
    agent=travel_agent
)

crew = Crew(agents=[travel_agent], tasks=[plan_task], process=Process.sequential)
result = crew.kickoff()
print(result)
```
**核心解读**：这个智能体无需你每次重复，它自己就能从 Mem0 里“回忆”起你是海滩和Airbnb爱好者，并基于此给出定制化建议[reference:8]。

---

### 🛠️ Demo 3：在 LangChain 中将记忆作为工具（Tool 模式）
如果你已经在用 LangChain，可以把 Mem0 包装成一个**工具（Tool）**，让智能体在需要时主动去调用它来存取记忆，这种模式非常灵活[reference:9]。

#### 1. 安装与初始化
```bash
pip install langchain_core mem0ai
```
在代码中设置好 Mem0 的 API Key。

#### 2. 定义记忆工具并让智能体使用
**代码及关键步骤解释：**
```python
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from mem0 import MemoryClient
from typing import List, Dict, Any, Optional

# --- 1. 定义输入输出模型 ---
class AddMemoryInput(BaseModel):
    """向记忆中添加新信息"""
    messages: List[Dict[str, str]] = Field(description="要存储的消息列表")
    user_id: str = Field(description="用户ID")

# --- 2. 实现记忆增、查的具体逻辑 ---
client = MemoryClient()

def add_memory(messages: List[Dict[str, str]], user_id: str) -> Any:
    return client.add(messages, user_id=user_id)

def search_memory(query: str, user_id: str) -> Any:
    return client.search(query, user_id=user_id)

# --- 3. 将函数包装为 LangChain 工具 ---
add_tool = StructuredTool.from_function(
    func=add_memory,
    name="AddMemory",
    description="当用户分享重要信息、偏好或个人事实时，使用此工具保存。",
    args_schema=AddMemoryInput
)

search_tool = StructuredTool.from_function(
    func=search_memory,
    name="SearchMemory",
    description="当需要回忆用户之前分享过的信息来回答问题或个性化回复时，使用此工具搜索。"
)
```
**核心解读**：通过 `StructuredTool`，我们赋予了智能体 `add_memory` 和 `search_memory` 两个能力，让它能主动管理自己的“记忆库”。

---

### 🚀 Demo 4：Node.js 环境下的对话机器人（全量版）
如果你习惯用 Node.js，Mem0 也有官方 SDK。这是一个完整的命令行程序，非常适合后端服务集成[reference:10]。

#### 1. 初始化项目与安装依赖
```bash
mkdir mem0-node-demo && cd mem0-node-demo
npm init -y
npm install openai mem0ai
```

#### 2. 完整代码与解释
创建 `index.js` 文件：
```javascript
import { OpenAI } from 'openai';
import { Memory } from 'mem0ai/oss';  // 导入 Node SDK
import * as readline from 'readline';

const openai = new OpenAI();
const memory = new Memory();           // 初始化内存客户端

async function chatWithMemories(message, userId = "default_user") {
    // 1. 搜索相关记忆
    const { results } = await memory.search(message, { userId });
    const memoriesStr = results.map(entry => `- ${entry.memory}`).join('\n');

    // 2. 构建Prompt并调用OpenAI
    const systemPrompt = `基于过往记忆回答问题。\n用户记忆:\n${memoriesStr}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ]
    });
    const assistantResponse = response.choices[0].message.content;

    // 3. 将本次交互存入记忆
    await memory.add([
        { role: "user", content: message },
        { role: "assistant", content: assistantResponse }
    ], { userId });

    return assistantResponse;
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("🧠 Mem0 AI 助手已启动 (输入 'exit' 退出)");
    while (true) {
        const userInput = await new Promise(resolve => rl.question("你: ", resolve));
        if (userInput.toLowerCase() === 'exit') break;
        const response = await chatWithMemories(userInput, "node_user_1");
        console.log(`AI: ${response}\n`);
    }
    rl.close();
}

main().catch(console.error);
```
**核心解读**：这个例子展示了在 Node.js 中完整的交互流程，同样具备记忆的存储和检索能力，并且会为不同用户（`node_user_1`）隔离记忆。

---

### 🔍 Demo 5：高级内存管理（增、删、改、查、历史）
如果你的应用需要更精细地控制记忆，可以直接调用 Mem0 的核心 API[reference:11]。

#### 代码示例及功能说明
```python
from mem0 import Memory

m = Memory()

# 1. 添加记忆 (Create)
m.add("用户喜欢科幻电影", user_id="alice", metadata={"category": "movie"})

# 2. 获取所有记忆 (Read)
all_memories = m.get_all(user_id="alice")

# 3. 更新记忆 (Update)
# 先获取记忆ID (可以从get_all的结果中得到)
mem_id = "具体的记忆ID"
m.update(mem_id, data="用户非常喜欢克里斯托弗·诺兰的科幻电影")

# 4. 删除记忆 (Delete)
m.delete(mem_id)               # 删除单条
m.delete_all(user_id="alice")  # 删除用户所有记忆

# 5. 查看记忆的历史版本 (History)
history = m.history(mem_id)    # 追踪这条记忆的变更记录

# 6. 重置所有 (Reset)
m.reset()                      # 谨慎使用！
```

### 🚀 入门指引：从本地到云端
*   **Open Source (Self-Hosted)**：适合开发测试。可以直接用上面的代码，它会默认使用本地文件存储[reference:12]。
*   **Mem0 Platform (Hosted)**：适合生产环境。需要去 [Mem0 Platform](https://app.mem0.ai) 注册获取 `MEM0_API_KEY`[reference:13]。
    *   代码中将 `from mem0 import Memory` 改为 `from mem0 import MemoryClient`，并用 `client = MemoryClient(api_key="你的API Key")` 初始化。
*   **环境变量**：无论是 OpenAI 还是 Mem0 的 API Key，都建议通过环境变量设置，保证安全性[reference:14]。

### 💡 总结与进阶思路
这些 Demo 展示了 Mem0 从基础到高级的几种用法。**入门级 Demo** 是理解其核心流程的最好起点；**集成 Demo**（如 CrewAI）则展示了它在更复杂系统中的应用价值。掌握了这些，你就能很自然地为 AI 应用构建出智能、持久的记忆系统了。