# 项目中eval_common和eval_mlflow和langSmith和eval_deepeval的用途说明

下面按目录说明 **各自干什么**，以及它们和 **`main.py` / `run.py` 跑出来的结果** 怎么接在一起。

---

## 总览：在流水线里的位置

```text
run.py / main.py
    → results/*.json   （每条任务的 reward、traj、info…）

eval_common/extract_results.py
    → 解析 JSON，生成统一的 EvalDataPoint（对话、工具轨迹、golden、state_consistency 等）

eval_mlflow / eval_langsmith / eval_deepeval
    → 读 EvalDataPoint（或直接读 JSON），用各自框架打分、记录、（可选）打开 UI
```

也就是说：**`eval_common` 是「从原始结果到统一评估输入」的公共层**；**另外三个目录是「三种不同评估产品」的适配脚本**。

---

## `eval_common/` — 公共层

| 内容                                         | 作用                                                         |
| -------------------------------------------- | ------------------------------------------------------------ |
| **`state_eval.py`**                          | **状态一致性**：`MockAgent`、`replay_actions`、对 `datas` 做 hash；`env_litellm.calculate_reward` 里也会用这里的思路对比 golden（与 README 一致）。 |
| **`extract_results.py`**                     | 读 **`results/*.json`**，抽出 **`EvalDataPoint`**：对话、`tool_calls`、`agent_output`、`task_instruction`、`expected_actions/outputs`，并算 **`state_consistent` / `gt_data_hash` / `agent_data_hash`** 等，供三个框架共用。 |
| **`llm_providers.py`**                       | Moonshot 等 **Judge / 二次调用模型** 时的 API 配置（和 `run.py` 里给 Agent 用的那套同源思路）。 |
| **`tau_bench_moonshot_openai.py`**（若存在） | 与 tau-bench / OpenAI 兼容调用相关的辅助（按需被其它模块引用）。 |

**和项目的关联**：被 **`env_litellm`**（运行时判分）、**`eval_* /run_eval.py`**（离线再评估）共同依赖；是 **「三框架 + 状态评估」共享的地基**。

---

## `eval_mlflow/` — MLflow 评估

- **干什么**：读 **`results/<某>.json`**，用 **MLflow GenAI / scorers** 对每条轨迹打分（如正确性、安全性、自定义 **`state_consistency`** 等），并 **log 到 MLflow**（本地 UI 看实验）。
- **和项目的关联**：输入是 **`run.py` 写的同一份 JSON`**；内部会走 **`eval_common.extract_results`**（或等价逻辑）拿到统一字段再喂给 MLflow。

典型用法（README）：`uv run python eval_mlflow/run_eval.py results/<your_results>.json`

---

## `eval_langsmith/` — LangSmith / agentevals / openevals

- **干什么**：把结果转成 **OpenAI 式 message**，跑 **trajectory_match**（多种严格度）、**LLM-as-Judge**、以及文档里提到的 **状态一致性类评估** 等（与 LangSmith 生态对接）。
- **和项目的关联**：同样以 **`results/*.json`** 为入口，用 **`eval_common`** 抽好的字段或自建解析，调用 **openevals/agentevals** API。

典型用法：`uv run python eval_langsmith/run_eval.py results/<your_results>.json`

---

## `eval_deepeval/` — DeepEval

- **干什么**：用 **DeepEval** 的指标（如 **ToolCorrectnessMetric**、**GEval**）和 **`deepeval test run`** / pytest 风格脚本，对同一批结果做评估。
- **和项目的关联**：**`run_eval.py`** 读 JSON；**`test_agent.py`** 等可通过环境变量 **`RESULTS_PATH`** 指向同一 JSON 做测试式跑批。

典型用法：  
`uv run python eval_deepeval/run_eval.py results/<your_results>.json`  
或  
`RESULTS_PATH=results/<...>.json uv run deepeval test run eval_deepeval/test_agent.py`

---

## 它们和「被测 Agent」的关系（别混两层）

| 阶段                                  | 谁在做                                                       | 产物                                             |
| ------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| **运行时评测（tau-bench 式 reward）** | `run.py` + `env_litellm.py`                                  | **`results/*.json`** + 控制台 reward             |
| **离线多框架再分析**                  | `eval_common` + `eval_mlflow` / `eval_langsmith` / `eval_deepeval` | MLflow 实验记录、LangSmith 上送、DeepEval 报告等 |

**`eval_*` 不启动 Strands Agent**，也不替代 **`main.py`**；它们是在 **Agent 已经跑完、结果落盘之后** 的 **第二层（或多视角）评估**。

---

## 一句话

- **`eval_common`**：统一 **抽数 + 状态 hash/replay**。  
- **`eval_mlflow` / `eval_langsmith` / `eval_deepeval`**：三种 **不同厂商/开源栈的「阅卷机」**，都吃 **`run.py` 产出的 `results/*.json`**（经 `eval_common` 整理后的数据结构）。