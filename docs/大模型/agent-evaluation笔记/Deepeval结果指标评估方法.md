# Deepeval结果指标评估方法

结合 **`eval_deepeval/run_eval.py`** 的实现，说明这条命令**产出什么、指标含义、怎么读、怎么分析**。

---

## 1. 结果文件在哪、长什么样

跑完后会生成（把输入文件名里的 `.json` 换成 **`_deepeval_eval.json`**）：

```248:252:eval_deepeval/run_eval.py
    output_path = results_path.replace(".json", "_deepeval_eval.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(eval_results, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to {output_path}")
```

对你这条命令，对应大概是：

`results/tool-calling-kimi-k2-0905-preview-0.0_range_0--1_user-kimi-k2-0905-preview-llm_0412105709_deepeval_eval.json`

**`eval_results` 是列表**：每个元素对应 **一条 `EvalDataPoint`（通常一个 task 一次跑）**，结构大致包括：

- **`task_id`**、**`tau_bench_reward`**
- **`state_consistency`**（0 或 1）
- **`gt_data_hash`** / **`agent_data_hash`**
- **`metrics`**：下面三个 DeepEval 指标各自的 **`score`**、**`reason`**、**`passed`**（若可比较 threshold）

用 **Cursor / VS Code / 任意 JSON 查看器** 打开即可；条数多时用 **`jq`** 或 Python/pandas 做筛选。

---

## 2. 终端里会先打印什么

- **`[Tau-bench baseline] Average reward`**：原始 **`results/*.json`** 里环境算出的 **平均 reward**（基线）。
- **`Running DeepEval evaluation...`**：会调用 **`deepeval.evaluate(...)`**（可能还有控制台/云端链接，取决于 DeepEval 版本与配置）。
- **Summary**：**`State Consistency (deterministic):`** 全任务 **state 一致率平均**。
- **每个 Task**：`tau-bench reward`、`instruction` 摘要、`state_consistency`、各 metric 的 **score** 与 **Reason** 截断打印。

---

## 3. 各指标分别是什么、如何判断好坏

### （1）`state_consistency`（确定性，非 DeepEval 内置 metric）

```196:200:eval_deepeval/run_eval.py
    state_scores = []
    for dp in eval_data:
        state_scores.append(1.0 if dp.state_consistent else 0.0)
```

- **来源**：**`eval_common.extract_results`** 里对 **golden 重放 vs agent 工具重放** 的 **hash 是否一致**（与 MLflow 自定义 `state_consistency`、LangSmith 块里的同一套数据一致）。
- **怎么看**：**1.0** 表示 **终态与标准答案世界一致**；**0.0** 表示不一致。应和 **`tau_bench_reward`** 在「纯状态题」上大体同向；若 **`reward` 高而 state 低**，重点查 **轨迹抽取 / hash 口径**。

### （2）`ToolCorrectnessMetric`（DeepEval，带 Judge 模型）

```112:118:eval_deepeval/run_eval.py
    tool_correctness = ToolCorrectnessMetric(
        threshold=0.5,
        should_consider_ordering=False,
        should_exact_match=False,
        model=judge_model,
    )
```

- **含义**：用 **Judge LLM**（默认 Moonshot Kimi，或 Bedrock）比较 **`tools_called`**（实际）与 **`expected_tools`**（来自 `task.actions` 的 name + kwargs），**不考虑顺序**、**不要求参数完全字符串级一致**（`should_exact_match=False`）。
- **怎么看**：**`score`** 一般在 **0～1**（具体以 DeepEval 为准）；**`passed`** 为 **`score >= 0.5`**（`threshold=0.5`）。**`reason`** 里会有模型解释，适合 **抽样核对**。
- **注意**：与 MLflow 里「集合交并比」的 **`tool_call_accuracy`** 不是同一实现，**数值不必对齐**。

### （3）`GEval`：`TaskCompletion`

```120:136:eval_deepeval/run_eval.py
    task_completion = GEval(
        name="TaskCompletion",
        evaluation_steps=[
            ...
            "Score 1.0 if the task is fully completed, 0.5 if partially completed, 0.0 if not completed.",
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.5,
        model=judge_model,
    )
```

- **输入**：**`input`** = `task_instruction`（注意：这是 **标注侧 instruction**，不是用户模拟器逐字剧本）；**`actual_output`** = **`agent_output`**（抽取的最终可见回复）；**`expected_output`** = 有 `outputs` 则拼接，否则 **`"Task completed successfully"`**。
- **怎么看**：Judge 按步骤打 **离散倾向分（文案里写 1 / 0.5 / 0）**；**`passed`** 同样 **≥ 0.5**。更偏 **「完成度主观判断」**，不要与 **状态 hash** 画等号。

### （4）`GEval`：`ResponseQuality`

```139:155:eval_deepeval/run_eval.py
    response_quality = GEval(
        name="ResponseQuality",
        evaluation_steps=[
            "Check if the response is professional ...",
            ...
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=0.5,
        model=judge_model,
    )
```

- **含义**：**客服话术质量**（专业、清晰、是否啰嗦、是否有礼貌与确认等），**不看工具**。
- **怎么看**：同样是 **score + reason + passed**；适合发现 **「事办对了但说得很差」** 或相反。

---

## 4. 建议怎么「评估判断分析」（读数顺序）

1. **以 `tau_bench_reward` + `state_consistency` 定「业务有没有办成」**（客观、与运行时一致）。  
2. **看 `ToolCorrectnessMetric`**：工具是否大体符合标注；和 state 组合看——**state 失败 often 工具或参数错**；**state 成功但 tool metric 低** 可能是 **Judge 与「非精确匹配」预期不一致** 或 **多路径**。  
3. **看 `TaskCompletion` / `ResponseQuality` 的 `reason`**：专门找 **争议样本**（state=1 但 TaskCompletion 低等），判断是 **Judge 飘了** 还是 **回复确实漏说关键句**。  
4. **和 LangSmith / MLflow 对比时**：三者 **Judge 与特征工程不同**，**分数横比只能做趋势**，不要强求数值一致。

---

## 5. 和 MLflow 落盘差异（避免找错文件）

- DeepEval 这条命令会把 **state + 三个 metric 的逐条 score/reason/passed** 都写进 **`_deepeval_eval.json`**，**比 MLflow 那个 JSON 更适合离线通读**（MLflow 的 JSON 主要只有 LLM safety/correctness，自定义四项多在 UI）。

---

**一句话**：打开 **`..._deepeval_eval.json`**，先看 **`tau_bench_reward` 与 `state_consistency`**，再用 **`ToolCorrectnessMetric`** 看工具层面，用 **`TaskCompletion` / `ResponseQuality` 的 `reason`** 做话术与完成度的 **LLM 侧质检**；**`passed`** 一律以各 metric 的 **`threshold=0.5`** 理解即可。