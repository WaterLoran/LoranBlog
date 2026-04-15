# run_py即执行过程解读

下面按 **`run.py` 从文件顶部到 `run()` 出口** 的顺序解读：imports 与全局准备 → `run(config)` 主流程 → 指标打印与最终落盘。行号均指项目根目录的 `run.py`。

---

## 1. 文件开头：依赖、工具模块、环境、遥测

### 1.1 Strands 与 tau-bench 类型

- **`BedrockModel` / `LiteLLMModel`**（及可选的 `OpenAIModel`）：后面 **`Agent(model=...)`** 只接一个 **已构造好的 model 对象**。
- **`Agent`**：真正跑客服的 Strands 智能体。
- **`EnvRunResult`, `RunConfig`**：每条任务跑完后的结果结构、以及 `main.py` 解析出来的全局配置。

### 1.2 Moonshot 辅助

```32:36:run.py
from eval_common.llm_providers import (
    get_moonshot_api_base,
    get_moonshot_api_key,
    normalize_moonshot_model_id,
)
```

在 **`model_provider == "moonshot"`** 时用来拼 **base_url、api_key、模型 id 规范化**。

### 1.3 工具为什么变成 `tool_modules`（模块列表）

```38:45:run.py
from tools import ALL_TOOLS
# Initialize global variable
tool_modules = []
for tool in ALL_TOOLS:
    # 获取函数所在的模块
    module_name = tool.__module__
    module = sys.modules[module_name]
    tool_modules.append(module)
```

Strands 的 **`Agent(..., tools=...)`** 这里传的是 **模块对象列表**，不是裸函数列表。每个 `tools/*.py` 里 **同名的 `TOOL_SPEC` + 与 spec 同名的函数** 会被框架从模块里收集。因此 **`ALL_TOOLS` 里每个函数对应其所在模块被 append 一次**（若多函数同模块会重复 append 同一模块，一般每个文件一个工具函数，问题不大）。

### 1.4 环境与数据

```47:49:run.py
# from env import Env
from env_litellm import Env
from data import load_data
```

评测闭环用 **`Env`（LiteLLM 用户模拟）**；每个任务开始时用 **`load_data()`** 灌一份新 **`datas`**。

### 1.5 `json.dumps` 猴子补丁

```52:58:run.py
original_dumps = json.dumps
def custom_dumps(*args, **kwargs):
    kwargs['ensure_ascii'] = False
    return original_dumps(*args, **kwargs)
json.dumps = json.dumps
```

全局把 **`ensure_ascii=False`** 打开，**结果 JSON 里中文可读**（写 `ckpt_path` 时用到）。

### 1.6 `.env` 与 Langfuse OTLP（可选）

```61:74:run.py
load_dotenv(".env", override=True)

API_KEY = os.getenv("DASHSCOPE_API_KEY") or os.getenv("API_KEY") or ""
...
if public_key and secret_key and langfuse_endpoint and StrandsTelemetry:
    ...
    strands_telemetry = StrandsTelemetry()
    strands_telemetry.setup_otlp_exporter()
```

- **非 Moonshot** 的 LiteLLM 分支会用 **`API_URL` + `API_KEY`**（含 DashScope 等）。
- 若配置了 **Langfuse + StrandsTelemetry**，会设 **OTLP** 环境变量，让 Strands 把 trace 打到 Langfuse。

---

## 2. `run(config)`：入口到出口的主线

### 2.1 校验与随机种子、结果路径模板

```77:85:run.py
def run(config: RunConfig) -> List[EnvRunResult]:
    assert config.env in ["retail", "airline"], "Only retail and airline envs are supported"
    assert config.task_split in ["train", "test", "dev"], "Invalid task split"

    random.seed(config.seed)
    time_str = datetime.now().strftime("%m%d%H%M%S")
    ckpt_path = f"{config.log_dir}/{config.agent_strategy}-{config.model.split('/')[-1]}-{config.temperature}_range_{config.start_index}-{config.end_index}_user-{config.user_model.split('/')[-1]}-{config.user_strategy}_{time_str}.json"
    if not os.path.exists(config.log_dir):
        os.makedirs(config.log_dir)
```

- **`config.env`**：当前实现里后面 **只从 retail 的 tasks_* 导入**（见下）；`airline` 断言通过但 **未必有对称实现**，属于预留。
- **`ckpt_path`**：在 **`config.log_dir`（默认 `results`）** 下生成一个 **带时间戳** 的文件名，里面编码了：
  - **`agent_strategy`**（更多是 **文件名标签**，不切换 Strands 行为）；
  - **模型名最后一段**（`split('/')[-1]`，方便 Bedrock 长 id）；
  - **温度**、**任务区间**、**用户模型名**、**user_strategy**。

同一次 `run()` 里 **所有 task 共用同一个 `ckpt_path`**。

### 2.2 `wiki.md` → 客服系统提示词

```87:88:run.py
    with open(os.path.join("./", "wiki.md"), "r") as f:
        system_prompt = f.read()
```

注意：这里读的是 **项目根目录的 `./wiki.md`**，**不是** `tau_bench/envs/retail/wiki.md`。根目录 `wiki.md` 是实际给 **Strands Agent** 的 **客服政策与能力说明**。

该字符串随后传入：

```173:175:run.py
                agent = Agent(model=model,
                    system_prompt=system_prompt,
                    tools=tool_modules,
```

即 **客服侧** 的固定系统提示；**用户剧本**仍在 **`Env.build_user_system_prompt(self.task.instruction)`** 里。

### 2.3 加载任务列表（tau-bench retail）

```90:98:run.py
    match config.task_split:
        case "test":
            from tau_bench.envs.retail.tasks_test import TASKS_TEST as tasks
        case "train":
            from tau_bench.envs.retail.tasks_train import TASKS_TRAIN as tasks
        ...
```

**与 `config.env` 无关**，当前代码 **固定 retail 三个 split**。`end_index` 与 **`task_ids`** 的关系在后面。

### 2.4 选模型：Bedrock / Moonshot / 其它 LiteLLM

```112:158:run.py
    if config.model_provider == "bedrock":
        ...
        model = BedrockModel(...)
    elif config.model_provider == "moonshot":
        ...
        model = LiteLLMModel(..., model_id=normalize_moonshot_model_id(config.model), ...)
    else:
        model = LiteLLMModel(
            client_args={
                "base_url": os.getenv("API_URL"),
                "api_key": API_KEY,
            },
            model_id=config.model or "dashscope/qwen-max",
            ...
        )
```

- **`bedrock`**：`boto3` session + **`BedrockModel`**。
- **`moonshot`**：**必须**有 `MOONSHOT_API_KEY` / `KIMI_API_KEY`，否则 **显式 `ValueError`**。
- **其它**：走 **`API_URL` + `API_KEY`**，默认模型 **`dashscope/qwen-max`**。

**`model` 只建一次**，多任务、多 trial **共用同一个 model 对象**。

### 2.5 多轮 trial、任务 id 列表、`_run` 闭包

```162:168:run.py
    for i in range(config.num_trials):
        if config.task_ids and len(config.task_ids) > 0:
            idxs = config.task_ids
        else:
            idxs = list(range(config.start_index, end_index))
        if config.shuffle:
            random.shuffle(idxs)
```

- **`num_trials`**：外层循环次数；每次 trial 会 **重新跑一遍 `idxs` 上所有任务**（结果都 `append` 到 **`results`**）。
- 若指定 **`--task-ids`**，则 **忽略 `start_index`/`end_index`**，只跑这些 id。
- **`shuffle`**：打乱本 trial 内任务顺序。

```170:227:run.py
        def _run(idx: int, total_cost: int) -> EnvRunResult:
            ...
            return result, total_cost
```

内层 **`_run(idx, total_cost)`** 负责 **单任务一次执行**；注意 Python 里 **`total_cost` 是整数传参**，函数里 **`total_cost += res.total_cost` 不会回写到外层变量**（见下）。

### 2.6 单任务核心：创建 Agent、挂 state、Env、loop

```173:195:run.py
                agent = Agent(model=model,
                    system_prompt=system_prompt,
                    tools=tool_modules,
                    trace_attributes={
                        "session.id": f"test-retail-{idx}-{config.model.split('/')[-1]}",
                        "user.id": f"agent-{idx}-{config.model.split('/')[-1]}",
                        "langfuse.tags": [
                            f"retail-agent-{idx}-{config.model.split('/')[-1]}",
                        ],
                        "encoding": "utf-8"
                    })
                # Attach state for tools that use agent.state.get/set
                class _State:
                    ...
                agent.state = _State({"datas": load_data()})
                env = Env(tasks, agent, ["transfer_to_human_agents"], idx, config)
                env.reset(idx)
                res = env.loop()
```

顺序是：

1. **新建 `Agent`**：同一 **`model`**、同一 **`system_prompt`（wiki）**、同一 **`tools`**；`trace_attributes` 给可观测性（含 Langfuse tag）。
2. **`agent.state`**：内嵌 **`_State`**，里面 **`{"datas": load_data()}`** —— **每个任务一份全新模拟库**，与 `state_eval.replay_actions` 用的 **`load_data()` 初始世界一致**。
3. **`Env(..., idx, config)`**：绑定 **第 `idx` 条 `tasks`**、传入 **终止工具名列表**（转人工）、**用户侧模型配置** 在 **`config`** 里。
4. **`env.reset(idx)`**：再设一次任务索引（与构造时一致）。
5. **`env.loop()`**：双 LLM 对话 + **`calculate_reward`**，得到 **`SolveResult`**（reward、messages、info、total_cost）。

然后封装 **`EnvRunResult`**（`task_id`、`reward`、`info`、`traj`、`trial=i`）。异常则 **reward=0**、**traj=[]**、**info 带 traceback**。

### 2.7 增量写盘（每个 task 后）与 `total_cost` 细节

```220:227:run.py
            with lock:
                data = []
                if os.path.exists(ckpt_path):
                    with open(ckpt_path, "r") as f:
                        data = json.load(f)
                with open(ckpt_path, "w") as f:
                    json.dump(data + [result.model_dump()], f, indent=2)
            return result, total_cost
```

- **`multiprocessing.Lock()`**：若以后并行，避免写文件交错；当前顺序执行也沿用。
- 每完成一个 task：**读出已有 JSON 数组（若存在）→ 追加当前 `result.model_dump()` → 写回**。这样 **长跑中断也能在文件里看到已完成的条目**。

```229:233:run.py
        for idx in idxs:
            result, total_cost = _run(idx, total_cost) 
            results.append(result)
            if len(idxs) > 1:
                time.sleep(60)
```

- **`total_cost`**：靠 **`_run` 返回值里第二个元素** 更新，因此 **外层会累加**（若 `_run` 里 `total_cost += ...` 生效）。实际上 `_run` 内对参数 `total_cost` 的 `+=` **只影响局部**，返回的 **`total_cost` 若未在 return 里体现累加则可能不对**——你当前代码 **`return result, total_cost`** 里 **`total_cost` 从未在成功路径上加上 `res.total_cost`**（197 行加了的是形参局部）。所以 **`print("total_cost: ", total_cost)`** 很可能 **一直为 0**；这是读源码时要意识到的一点，但不影响 **reward / 轨迹落盘** 主流程。

### 2.8 多任务间隔

**`len(idxs) > 1` 时每个 task 后 `sleep(60)`**：给 API 限流或稳定性留缓冲（偏运维向）。

### 2.9 指标与最终覆盖写盘

```237:242:run.py
    display_metrics(results, config.num_trials)

    with open(ckpt_path, "w") as f:
        json.dump([result.model_dump() for result in results], f, indent=2)
        print(f"\n📄 Results saved to {ckpt_path}\n")
    return results
```

- **`display_metrics`**：基于 **`results`** 算平均 reward、**Pass^k**（组合数学那套，与 `num_trials` 有关）。
- **最后再写一次 `ckpt_path`**：用 **`results` 全列表覆盖**，与中途「追加写」相比，**最终以内存里完整 `results` 为准**（若中途文件与内存不一致，以这次为准）。

---

## 3. `display_metrics`：控制台汇总

```245:270:run.py
def display_metrics(results: List[EnvRunResult], num_trials) -> None:
    ...
    # c_per_task_id: 每个 task_id 在多次 trial 里「成功次数」的累加方式（注意首次与后续分支写法）
    ...
    print(f"🏆 Average reward: {avg_reward}")
    print("📈 Pass^k")
```

- **`is_successful`**：`reward` 接近 **1.0** 算通过。
- **`c_per_task_id`**：按 **task_id** 聚合多次 trial 的成功情况，再算 **Pass^k**（论文式指标）。

---

## 4. 和 `main.py` 串起来的「入口 → 出口」一句话

**`main.py`** 组 **`RunConfig`** → 调 **`run(config)`** → **`run.py`** 读 **`wiki.md`**、选 **模型**、按 **split / task_ids** 取 **`tasks`** → 对每个 idx **new `Agent` + `load_data()` → `Env.loop()`** → 得到 **`EnvRunResult` 列表** → **打印指标**并写入 **`ckpt_path` 的 JSON** → **`return results`**。后续 **`eval_* / extract_results`** 再读这个 JSON 做三框架评估。

---

## 5. 易混点速查

| 点                            | 说明                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| **`wiki.md` 路径**            | **`./wiki.md`（仓库根）**，不是 tau-bench 自带的 retail `wiki.md`。 |
| **`agent_strategy`**          | 主要出现在 **结果文件名**；**不**切换 tau-bench 的 `ToolCallingAgent`。 |
| **`config.env`**              | 断言有 airline，但 **任务加载写死 retail**。                 |
| **`ckpt_path` 与 `task_ids`** | 文件名仍带 **`start_index-end_index`**，即使用 **`--task-ids`** 也可能看起来「区间很大」，以实际 **`idxs`** 为准。 |

如果你希望下一步对齐 **`EnvRunResult` JSON 字段** 与 **`eval_common/extract_results.py`** 的读取字段，可以指定一个 `results/*.json` 样例路径再往下拆。