# MlFlow的结果指标评估方法

下面结合 **`eval_mlflow/run_eval.py` 的真实行为**，说明：**结果存在哪**、**各指标什么意思**、**怎么打开和分析**。

---

## 1. 这条命令会产出两类「结果」

### （1）本机 JSON（便于文本处理 / 备份）

路径规则：把输入的 `.json` 换成 **`_mlflow_eval.json`**：

```304:309:eval_mlflow/run_eval.py
    output_path = results_path.replace(".json", "_mlflow_eval.json")
    save_data = {"llm_scorers": llm_results, "tau_bench_reward": avg_reward}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(save_data, f, indent=2, ensure_ascii=False, default=str)
    print(f"Results saved to {output_path}")
```

**注意**：这个文件里**只保存了**：

- **`tau_bench_reward`**：原始跑批的平均 reward（tau-bench / 环境侧）  
- **`llm_scorers`**：每条样本的 **`Safety`**、**`Correctness`** 分数和 **`rationale`**

**没有**把 **`tool_call_accuracy` / `task_completion` / `tool_call_efficiency` / `state_consistency`** 四个自定义 scorer 的逐条结果写进这个 JSON（它们主要在 **MLflow 的 evaluate 结果 / UI** 里）。

### （2）MLflow Tracking（实验与表格）

脚本里：

```223:232:eval_mlflow/run_eval.py
    mlflow.set_experiment(experiment_name)

    with mlflow.start_run(run_name="tau-bench-mlflow-eval"):
        results = mlflow.genai.evaluate(
            data=mlflow_data,
            scorers=custom_scorers,
        )
```

默认 **`experiment_name="tau-bench-eval"`**（可用 `--experiment` 改）。**自定义四个 scorer** 的汇总指标、以及 **`eval_results` 表** 等，会进 **MLflow 后端**（你仓库里常见的 **`mlflow.db`** 或环境变量指定的 store）。

**打开方式**：在项目目录执行（README 里也写了）：

```bash
mlflow ui
```

浏览器打开 **`http://localhost:5000`**，在实验 **`tau-bench-eval`**（或你改过的名字）下找 **`tau-bench-mlflow-eval`** 这次 run，看 **Metrics / Artifacts / GenAI 评估表格**。

---

## 2. 各指标分别是什么、怎么解读

### A. 控制台与 MLflow 里的「自定义 Scorer」（`mlflow.genai.evaluate`）

实现就在脚本里，语义很直接：

| Scorer                     | 含义                                                         | 如何看「好/坏」                                              |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`tool_call_accuracy`**   | 期望工具名集合（来自 **`expected_actions` 的 name**）与实际 **`tool_calls` 的 name** 集合对比。 | **1.0**：期望的全调用到了且没有多余；**有缺失**：按 `correct/expected` 比例；**全有但多调了别的工具**：**0.8**；**有缺失**时 rationale 会写 `Missing tools` / `Extra tools`。 |
| **`task_completion`**      | 与 tau-bench **`outputs`** 类似：期望字符串是否出现在 **`agent_output`**（小写、去逗号）。 | **1.0**：无 `expected_outputs` 或全部命中；否则 **命中比例**；rationale 会写 **Missing: [...]**。 |
| **`tool_call_efficiency`** | 同一工具名是否**重复调用**（**`think` 重复不算**）。         | **1.0**：无重复；有重复则 **每类重复扣 0.2**（`max(0, 1 - 0.2 * len(repeated))`）。 |
| **`state_consistency`**    | 使用 **`extract_eval_data`** 里已算好的 **`state_consistent` / hash**，不再重算。 | **1.0**：重放后 **agent 与 golden 终态 hash 一致**；**0.0**：不一致或 hash 缺失。 |

**分析建议**：

- **`state_consistency` 与 tau-bench `reward`** 应高度一致（都反映「世界对不对」）；若差很多，优先怀疑 **轨迹抽取** 或 **数据版本**。  
- **`tool_call_accuracy`** 是**集合级**，不看顺序、且代码里**不按参数比对**；「多工具但集合对」可能仍 1.0。  
- **`task_completion`** 只看 **最终可见文本 `agent_output`**，和运行时 `env_litellm` 里对 **每轮** `output_list` 的检查可能不完全同一口径，对比时要心里有数。

### B. JSON 里的「LLM Scorer」（逐条循环调用）

```237:269:eval_mlflow/run_eval.py
    safety_scorer = Safety(model=judge_uri)
    correctness_scorer = Correctness(model=judge_uri)
    ...
    safety_fb = safety_scorer(outputs=output_text)
    ...
    corr_fb = correctness_scorer(
        inputs=record["inputs"],
        outputs=output_text,
        expectations={"expected_response": record["expectations"]["expected_response"]},
    )
```

- **`Safety`**：MLflow GenAI 内置，对 **`agent_output` 全文** 做安全类判断；**分数含义以 MLflow 文档 / 返回的 `feedback.value` 为准**（脚本里用 `score_val` 原样打印/保存）。  
- **`Correctness`**：用 **`expected_response`**（有 `expected_outputs` 则拼起来，否则用 **`task_instruction`**）当参考，判断输出是否正确；同样带 **`rationale`**，适合**人工 spot-check Judge 是否合理**。

**Judge 模型**：默认 Moonshot 时 **`judge_uri`** 为 **`openai:/<短模型名>`**（配合 `apply_moonshot_openai_env` 走 OpenAI 兼容端点），见 `_mlflow_judge_uri`。

### C. 终端里的 **`[Tau-bench baseline] Average reward`**

即 **`results/*.json` 里每条 `reward` 的平均**，作为 **环境主指标基线**，和 MLflow 各 scorer **并列看**，不要混成一个分数。

---

## 3. 实际怎么「评估判断分析」（推荐工作流）

1. **先看终端汇总**：自定义四个指标的 **平均**（`results.metrics` 打印出来的那些）+ **tau-bench baseline**。  
2. **再打开 MLflow UI**：下钻 **每条样本** 的 `tool_call_accuracy`、`state_consistency` 等 **rationale**，找失败模式（缺工具、重复调用、状态不一致）。  
3. **打开 `*_mlflow_eval.json`**：按 **task 下标 `i`** 看 **Safety / Correctness** 与 **rationale**，和原始 **`results/*.json` 的 `traj`** 对照。  
4. **若只依赖 JSON**：要知道自定义四指标**必须**用 MLflow UI 或自己改脚本把 `results.tables["eval_results"]` 再导出；**当前落盘 JSON 不含它们**。

---

**一句话**：**自定义确定性指标**在 **`mlflow.genai.evaluate` + MLflow UI** 里看最完整；**Safety/Correctness** 在 **`results/<同名>_mlflow_eval.json`** 里按条看；**tau-bench reward** 作基线，与各 scorer **交叉解释**（例如 state 对但 correctness 低，可能是话术 Judge 与业务定义不一致）。