# langsmith结果指标解读

根据 `eval_langsmith/run_eval.py` 的实现，这条命令**主要产出的是本机上的一个 JSON 文件**，并不是必须先装某个「LangSmith 桌面软件」才能看。

---

## 1. 结果文件是哪一个、路径规则是什么

脚本在末尾会把汇总结果写到**与输入同目录、同主名**的文件里（把 `.json` 换成 `_langsmith_eval.json`）：

```284:296:eval_langsmith/run_eval.py
    # Save results
    output_path = results_path.replace(".json", "_langsmith_eval.json")
    serializable = {}
    for k, v in all_results.items():
        serializable[k] = {
            "average": v["average"],
            "scores": v["scores"],
        }
        if "reasonings" in v:
            serializable[k]["reasonings"] = v["reasonings"]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to {output_path}")
```

**例子**：

- 输入：`results/my_run.json`  
- 输出：`results/my_run_langsmith_eval.json`

终端里也会打印 **`Results saved to ...`**，以那一行为准。

---

## 2. 用什么「软件」打开这个文件

本质是 **UTF-8 的 JSON**，下面都可以：

| 方式                 | 说明                                                         |
| -------------------- | ------------------------------------------------------------ |
| **Cursor / VS Code** | 直接打开 `.json`，可装 JSON 格式化/大纲插件，适合肉眼看结构。 |
| **浏览器**           | 把文件拖到 Chrome 等（未格式化时略难读，可配合在线 formatter）。 |
| **命令行 `jq`**      | 适合抽字段、按 task 过滤，例如看某项平均分。                 |
| **Jupyter + Python** | `json.load` 后进 `pandas.DataFrame` 做表格式分析、画图。     |

说明：脚本用的是 **agentevals / openevals 在本地算分**，**默认不会**因为你跑了 `run_eval.py` 就自动打开 **LangSmith 云网页**；若要用 LangSmith 云端 UI，需要你在项目里单独配置 **LangSmith API / tracing**（本脚本路径以**落盘 JSON**为主）。

---

## 3. 文件里有哪些指标、分别怎么理解

顶层是若干 **指标名 → `{ average, scores, [reasonings] }`**（与 `all_results` 一致）。主要包括：

### （1）`trajectory_*_match`（四种：`strict` / `unordered` / `superset` / `subset`）

- **含义**：把智能体**实际工具调用序列**（参数在代码里对工具参数做了 **`tool_args_match_mode="ignore"`**，更侧重**工具名/调用形态**是否与由 `expected_actions` 拼出来的**参考轨迹**匹配；具体四种模式的严格程度见 agentevals 文档）。
- **怎么看**：每个元素是 **0～1**（或 0/1）；**`average`** 是全任务平均。**越高**表示**轨迹越接近参考**（不同模式「接近」的定义不同）。

### （2）`trajectory_llm_judge`

- **含义**：用 **LLM** 对照参考轨迹，给**轨迹质量**打分。
- **怎么看**：**`average`** + 每条 **`scores`**；若有 **`reasonings`**，可看模型**为什么给这个分**（便于人工 spot-check）。

### （3）`correctness`

- **含义**：对**最终自然语言输出**（相对 `task_instruction` 与期望答案串）做 **LLM-as-judge** 正确性。
- **怎么看**：同样看 **`average` / `scores` / `reasonings`**。注意：`expected_outputs` 为空时，参考串在代码里会变成 **`"Task completed successfully"`** 这类占位语义，要结合 `extract_results` 里怎么填 `agent_output` 理解，别机械解读。

### （4）`state_consistency`

- **含义**：在 **`extract_eval_data`** 里已经算好的 **状态是否一致**（重放 agent 工具 vs golden 后 **hash 是否一致**）；这里只是把 **每条 0/1** 和 **平均**再汇总一遍，**不额外调 LLM**。
- **怎么看**：**1** 表示与 golden 终态一致；**0** 表示不一致。通常应和 **`env_litellm` 里算出来的 reward（状态部分）** 高度相关；若不一致，优先查 **轨迹抽取是否完整**、**终止工具是否过滤一致**。

### （5）终端里还会打印的 **`[Tau-bench baseline] Average reward`**

- **含义**：原始 `results/*.json` 里 **环境已算好的 reward** 的平均值。
- **怎么看**：这是 **「线上跑批主指标」**；其它 LangSmith 块指标是 **补充视角**（轨迹形状、Judge 主观分等）。

---

## 4. 实际怎么「判断分析」这些指标（建议顺序）

1. **先看 `state_consistency` 与 tau-bench `reward`**：若大量不一致，先确认 **结果 JSON 是否完整**、**是否同一套 `data`/工具版本**。  
2. **再看四种 `trajectory_*_match`**：`strict` 低、`subset`/`superset` 高，往往说明 **路径多但结果可能对**；若 **`state_consistency` 高而 strict 低**，属于**正常「多条路」**。  
3. **用 `trajectory_llm_judge` / `correctness` 的 `reasonings`**：对 **争议样本** 做人工复核，看 Judge 是否靠谱、是否要改 prompt 或换模型。  
4. **按 task 下钻**：控制台 **Per-Task Details** 与 JSON 里 **`scores` 的下标**与 **`eval_data` 顺序一致**（与 `extract_eval_data` 遍历顺序一致），把 **低分 task** 对应回 **`results` 原始 traj** 做 case study。

---

**简短结论**：命令跑完后，用 **`results/<原名>_langsmith_eval.json`** 为主产物；用 **编辑器或 `jq`/Notebook** 打开即可。分析时以 **`reward` + `state_consistency`** 定「有没有办对」，以 **四种 trajectory match** 看「过程像不像参考」，以 **带 `reasoning` 的 LLM 指标** 做抽样解释与质检。