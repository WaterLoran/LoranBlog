# tau-bench和retail和Strands术语解释

## tau-bench

是什么：一个开源的 工具型智能体基准（benchmark） 项目（Sierra 的 tau-bench），提供「任务定义 + 类型 + 部分环境逻辑」等基础设施。

在本项目里干什么：

- 提供 `Task` / `Action` 等类型（`tau_bench/types.py`）和 零售（及可选航空）任务列表（例如 `tau_bench/envs/retail/tasks_test.py`）：每条任务有顾客剧本 `instruction`、标准工具序列 `actions`、可选的口头答案要求 `outputs`。
- 作为 Python 包 被安装/引用（`pip install -e ./tau-bench`），和本仓库根目录的 `run.py`、`env_litellm.py`、`main.py` 拼在一起用。

注意：原版 tau-bench 里还有自己的 `ToolCallingAgent` 等实现；本仓库实际跑客服时用的是 Strands `Agent`，tau-bench 在这里更偏 「题目与数据结构提供方」，真正「对话 + 判分闭环」在 `env_litellm.py` 等本仓库代码里。

------

## retail

是什么：tau-bench 里的一个 业务场景 / 环境名，表示 零售电商客服（订单、退换货、地址、商品查询等）。

在本项目里干什么：

- CLI 里 `--env retail` 表示加载 零售任务集 和与之匹配的 本仓库 `data/`（用户、订单、商品 JSON）+ `tools/`（客服工具）。
- 与 `airline`（航空客服）相对；README 里本项目的重心是零售场景。

一句话：retail = 这套题是「网店客服」而不是「航司客服」。

------

## Strands（Strands Agents）

是什么：一个 智能体应用框架（AWS 相关生态里常见），用来接大模型、注册工具、跑多轮 tool use、可选遥测等。

在本项目里干什么：

- 在 `run.py` 里用 `from strands import Agent` 创建被测客服：指定 `model`、`system_prompt`（`wiki.md`）、`tools`（`tools/` 里导出的函数模块）。
- `tools/*.py` 按 Strands 约定写：`ToolUse`、`Agent` 入参，通过 `agent.state` 读写模拟数据库。
- 可选：`StrandsTelemetry` 把 trace 打到 Langfuse 等 OTLP 端点。

一句话：Strands = 本仓库里「会调工具的 LLM 客服」的运行时壳子，不是 benchmark 本身。

------

## 三框架评估（MLflow、LangSmith/agentevals、DeepEval）

这三者 不负责 在沙盒里和用户模拟器实时对话；它们吃的是你已经 `main.py` 跑出来的 `results/*.json`（轨迹 + 元数据），再用各自的方式 打分、汇总、（可选）可视化。

### MLflow（`eval_mlflow/`）

- 干什么：把「一次或多次 agent 跑批」的结果当成 实验/指标 记到 MLflow；用 内置或自定义 GenAI Scorer（如正确性、安全性）和本项目里的 `state_consistency` 等自定义 @scorer 对每条轨迹算分。
- 特点：偏 MLOps / 实验追踪 + 本地 MLflow UI；和 README 里写的「内置 Safety/Correctness LLM Judge + 自定义 scorer」一致。

### LangSmith / agentevals / openevals（`eval_langsmith/`）

- 干什么：把轨迹转成它们熟悉的 OpenAI 式 message，做 轨迹匹配（如 strict / unordered / subset / superset）和 LLM-as-Judge；也可跑 状态一致性 类评估（文档里提到 `run_state_consistency_eval()` 等）。
- 特点：和 LangSmith 云、openevals/agentevals 的 API 习惯绑定，强项是 轨迹结构对比 + Judge。

### DeepEval（`eval_deepeval/`）

- 干什么：用 DeepEval 的 `LLMTestCase` / 工具指标（如 `ToolCorrectnessMetric`）、`GEval` 等自定义自然语言指标，对同一批 JSON 做评估；支持 `deepeval test run` + pytest 风格（如 `eval_deepeval/test_agent.py`）。
- 特点：和 pytest/CI 结合紧，适合测试驱动地看指标。

------

## 它们之间的关系（一张 mental map）

| 名词      | 角色                                                         |
| :-------- | :----------------------------------------------------------- |
| tau-bench | 出题：任务结构 + 零售题目列表（及部分共享类型）              |
| retail    | 题目领域：零售客服                                           |
| Strands   | 答题机器：本仓库里真正跑起来的 tool-calling 客服             |
| 三框架    | 阅卷方式之一：读 `results/*.json`，用 MLflow / LangSmith 系 / DeepEval 各自算分、对比实验 |

**tau-bench 的「状态 hash 判题」**在本仓库里是在 `env_litellm.py` 的 `calculate_reward`（配合 `eval_common/state_eval.py`）完成的，属于 跑 main 时当场给的 reward；三框架是在此之上 用同一轨迹再做一层或多层分析，两者层次不同。