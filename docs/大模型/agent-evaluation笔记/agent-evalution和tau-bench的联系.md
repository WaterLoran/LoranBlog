# agent-evalution和tau-bench的联系

这里分三层说清：**包依赖关系**、**各自负责什么**、**为什么你会看到两套「零售数据」**。

---

## 1. 两个东西各是什么

- **`agent-evaluation`（最外层仓库）**：作者搭的 **「零售客服智能体 + 跑分 + 多框架评估」** 工程。入口是根目录的 **`main.py` → `run.py`**，环境是 **`env_litellm.py`**，智能体是 **Strands `Agent`**，数据来自根目录 **`data/`**，工具在 **`tools/`**。

- **`tau-bench`（子目录 / 本地包）**：Sierra 的 **工具型智能体基准** 原版代码树，在本项目里通过 **`pyproject.toml` 的 `uv.sources` 以路径依赖安装**（`tau-bench = { path = "./tau-bench" }`），这样可以直接 **`import tau_bench...`**。

关系可以记成：**`agent-evaluation` 是「主应用」；`tau-bench` 是「被依赖的基准库 / 题目包」**。

---

## 2. 它们之间具体怎么「用」在一起

| 来源                                                         | 在本项目里主要干什么                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`tau_bench.types`**（如 `RunConfig`, `Task`, `Action`, `EnvRunResult`） | 配置与结果的结构化类型，和 tau-bench 生态对齐。              |
| **`tau_bench.envs.retail.tasks_*`**                          | **题目列表**：每条 `Task` 的 `instruction` / `actions` / `outputs`。 |
| **`tau-bench` 里自带的 retail wiki、data、agents、`run.py` 等** | **原版基准**里的实现；**本仓库跑 `main.py` 时并没有走 tau-bench 里那条「自带 Agent + 自带 Env」的主线**。 |

也就是说：**关系是「复用题目与类型」，不是「整个可执行程序都交给 tau-bench 来跑」**。

---

## 3. 为什么「运行主体」在 `agent-evaluation` 的 `run.py`，而不是 tau-bench 里的入口

因为作者要的是一套 **和原版不同的运行时**：

- **智能体**：用 **Strands**，不是 tau-bench 默认的 `ToolCallingAgent` / `ChatReActAgent`（在 `tau-bench/tau_bench/agents/`）。
- **用户模拟**：用 **`env_litellm.py` + LiteLLM**（Kimi/Bedrock/其它），而不是 tau-bench 里可能绑 Bedrock 的其它写法。
- **工具与状态**：工具在根目录 **`tools/`**，状态键 **`agent.state["datas"]`**，和 **`eval_common/state_eval.py`** 的重放设计一致。

所以 **「真正跑评测的一条龙」** 必须写在 **`agent-evaluation` 根目录**：**`run.py` 拼模型 + `Agent` + `load_data` + `Env`**。  
**`tau-bench` 里的 `run.py`** 是 **另一套入口**（原版 bench 跑法）；你按 README 执行的是 **`uv run python main.py`**，走的是 **外层项目**。

---

## 4. 为什么不少「测试数据 / 题目」在 `tau-bench` 里，而执行却在根目录

- **题目（`Task` 列表）** 本来就是 **tau-bench 基准的资产**：和论文/公开基准一致，所以放在 **`tau_bench/envs/retail/tasks_test.py`** 等文件里，由 **`agent-evaluation` 的 `run.py` import 进来用**。这是 **刻意复用基准定义**，避免自己维护两套题。

- **模拟数据库 JSON**：你会看到 **两套路径** 很常见：  
  - **`agent-evaluation/data/`** —— **`load_data()`** 实际读的是这里（Strands 工具、`env_litellm` 判分用的 **`datas`**）。  
  - **`tau-bench/tau_bench/envs/retail/data/`** —— 多半是 **随 tau-bench 上游一起带的 retail 环境数据**；**当前这条 Strands 链路默认不会去读这份**（除非某处代码显式指过去）。

所以：**「题」跟 tau-bench 走；「跑题用的引擎和当前读哪份 JSON」跟 agent-evaluation 走。** 若两套 JSON 内容不同步，以 **`agent-evaluation/data/`** 为准（因为 hash 和工具都绑在这份上）。

---

## 5. 一张心智图（从仓库根看）

```text
agent-evaluation/
  main.py, run.py, env_litellm.py   ← 实际执行与判分闭环
  data/, tools/, wiki.md           ← 运行时世界与客服规则
  eval_*, eval_common/             ← 结果 JSON 再评估

tau-bench/                         ← Python 包：类型 + 题目 + 上游 env 参考实现
  tau_bench/envs/retail/tasks_*.py
  tau_bench/types.py
  （以及自带的 data/wiki/agents…）
```

**总结一句**：**`tau-bench` 提供「考什么」（任务与类型）；`agent-evaluation` 提供「怎么考、用什么智能体与数据跑」（`run.py` + `data/` + Strands）。** 所以主体在外层仓库，而题目和部分历史数据仍落在 `tau-bench` 目录里，这是 **依赖 + 复用基准** 的正常分层，不是两套互斥项目。