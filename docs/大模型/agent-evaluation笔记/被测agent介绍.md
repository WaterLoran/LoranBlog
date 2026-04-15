# 被测agent介绍

下面按 **「被测智能体」在你这个仓库里指什么** 来说：指的是 **`run.py` 里用 Strands 创建的 `Agent`**（接 Kimi/Bedrock 等 + `wiki.md` + `tools/` + `agent.state["datas"]`），在 **`env_litellm.Env`** 里和用户模拟器多轮交互。分布和框架可以合在一起看。

---

## 1. 相关代码/逻辑分布在哪些目录（文件级）

| 目录/文件                                                    | 角色                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`run.py`**                                                 | **智能体工厂**：选模型（`BedrockModel` / `LiteLLMModel`）、读 **`wiki.md`** 作为 `system_prompt`、创建 **`strands.Agent`**、挂上 **`tools/` 模块列表**、初始化 **`agent.state["datas"] = load_data()`**、创建 **`Env`** 并 `loop()`。 |
| **`env_litellm.py`**                                         | **运行时编排**：用户 LLM ↔ **`self.agent(user_input)`** 循环、结束条件、`calculate_reward`；**不实现** Strands 内部推理，但决定 **何时喂一句用户话给 Agent**。 |
| **`tools/`**                                                 | **智能体能力（工具实现）**：每个文件 `TOOL_SPEC` + 与 spec 同名的函数，签名 **`(tool_use, agent, **kwargs) -> ToolResult`**，读写 **`agent.state["datas"]`**。**`__init__.py`** 汇总 **`ALL_TOOLS` / `TOOL_MAP`**。 |
| **`wiki.md`（项目根）**                                      | **智能体系统提示（政策/流程/领域常识）**，`run.py` 读入传给 `Agent`。 |
| **`data/`**                                                  | **智能体可操作的世界状态**；**`data/__init__.py` 的 `load_data()`** 提供初始 `users/products/orders`。 |
| **`eval_common/llm_providers.py`**                           | **给 Agent 接 Moonshot 等**时的 API 配置（与 `run.py` 选模型配合）。 |
| **`eval_common/state_eval.py`**                              | **评测用**：`MockAgent` + `replay_actions`，让 golden 与工具同路径；**不是**日常对话里的 Agent，但和「工具如何改 `datas`」同一套逻辑。 |
| **`tau-bench/tau_bench/`**（主要是 **`envs/retail/tasks_*.py`**, **`types.py`**） | **题目与类型**：`Task` / `Action`、`instruction`；**不**承载 Strands Agent 实现。原版 **`tau_bench/agents/`** 在本项目 **默认跑批路径里不用**。 |
| **依赖包 `strands-agents`（不在本仓库源码树里）**            | **Agent 内部框架**：多轮消息、何时调模型、如何执行 tool、聚合 metrics 等，由库实现；本仓库只 **配置并调用** `Agent(...)`。 |

可选相关：**`main.py`** 只解析 CLI → `RunConfig` → 调 `run()`；**`utils.get_data_hash`** 给判分用；**`results/*.json`** 是 Agent 跑完后的落盘，不是 Agent 逻辑本身。

---

## 2. 这个 Agent 大致框架长什么样（概念图）

用「洋葱」从外到内：

```text
┌─────────────────────────────────────────────────────────┐
│  env_litellm.Env：对话节奏、用户模拟(LLM)、何时结束、算分   │
└───────────────────────┬─────────────────────────────────┘
                        │ 每轮 user_input
                        ▼
┌─────────────────────────────────────────────────────────┐
│  strands.Agent（外部库）                                  │
│  · system_prompt ← wiki.md                               │
│  · model ← Bedrock / LiteLLM(Kimi/…)                     │
│  · tools ← tools/*.py 模块                               │
│  · 内部：消息历史 → 模型 → (可选) tool 调用循环 → 最终回复   │
└───────────────────────┬─────────────────────────────────┘
                        │ 读/写
                        ▼
┌─────────────────────────────────────────────────────────┐
│  agent.state["datas"]  ←→  tools 内业务逻辑               │
│  结构：{ users, orders, products } ← data/load_data      │
└─────────────────────────────────────────────────────────┘
```

要点：

- **「框架」核心名字是 Strands `Agent`**：本仓库 **没有**自写一套 ReAct 循环，而是 **配置** 模型 + 系统提示 + 工具模块 + 可选 trace。
- **业务逻辑**主要在 **`tools/`**（怎么查单、怎么换货改库），**政策**在 **`wiki.md`**，**世界**在 **`data/`**。
- **`Env`** 把 **「用户一句话」** 送进 **`Agent`**，并把 **Agent 对用户的可见输出** 再交给 **用户 LLM**，形成 **双 LLM + 单 Agent 状态** 的评测结构。

---

## 3. 一句话收束

**被测智能体相关实现**：集中在 **根目录 `run.py` + `env_litellm.py` + `tools/` + `wiki.md` + `data/`**，辅以 **`eval_common/llm_providers.py`**；**`tau-bench`** 主要提供 **任务定义与类型**。**框架**是 **Strands `Agent`（库内建 tool-calling 循环）+ 本项目自定义工具与状态字典 `datas`**。