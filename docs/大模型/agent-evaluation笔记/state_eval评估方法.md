# state_eval评估方法

下面按文件结构说明 **`eval_common/state_eval.py`** 在做什么，以及 **`MockAgent` / `replay_actions` / `evaluate_state_consistency`** 各自含义；最后单独回答「为什么用 golden 重放终态，而不是逐格比对轨迹」。

---

## 1. 这个模块的定位

文件头注释写得很清楚：给 **Strands 类项目** 做一个 **通用「状态一致性」评估** 能力。

核心想法：

- 真实跑任务时，工具函数签名是 **`(tool_use, agent, **kwargs) -> ToolResult`**，里面用 **`agent.state.get("datas")` / `set`** 改库。
- 评估时如果为「重放」再写一套不经过 `agent` 的逻辑，就要 **每个工具 duplicate 一份**，容易漂移。
- 所以用 **`MockAgent`** 提供 **同样的 `agent.state.get/set` 接口**，在 **全新初始数据** 上 **直接调用同一套 `tool_func`**，这样 **正常执行与评估重放走同一条工具实现路径**（「no per-tool hacks」）。

---

## 2. Hash 工具链：`_to_hashable` / `_consistent_hash` / `get_data_hash`

```21:40:eval_common/state_eval.py
def _to_hashable(item):
    """Convert nested data to a hashable representation."""
    if isinstance(item, dict):
        return tuple((key, _to_hashable(value)) for key, value in sorted(item.items()))
    elif isinstance(item, (list, tuple)):
        return tuple(_to_hashable(element) for element in item)
    ...
def _consistent_hash(value) -> str:
    """SHA256 hash."""
    return sha256(str(value).encode("utf-8")).hexdigest()

def get_data_hash(data: Dict[str, Any]) -> str:
    """Compute deterministic hash for a data dict."""
    return _consistent_hash(_to_hashable(data))
```

- **`dict`**：按 **key 排序** 再递归，保证同一 JSON 对象 **键顺序不同** 时 hash 仍一致（和 `load_data` 用 `OrderedDict` 的意图一致：可复现）。
- **`list`/`tuple`**：按顺序变成嵌套 tuple。
- 最后 **`sha256(str(...).encode)`**：得到固定长度十六进制字符串，用于 **整库快照对比**。

`env_litellm.calculate_reward` 里对 **智能体跑完的 `datas`** 用的 `get_data_hash` 在 **`utils.py`** 里实现，算法与这里 **同类**（`to_hashable` + `consistent_hash`）；**`replay_actions` 返回的 hash** 用的是 **`state_eval.get_data_hash`**（本文件 122 行），两者在「同一套数据结构」前提下应对齐为同一判分语义。

---

## 3. `_MockState` 与 `MockAgent`：假装成 Strands 的 `agent`

```45:69:eval_common/state_eval.py
class _MockState:
    """Supports both get/set (Strands 0.1.x) and dict-style access (Strands 1.x)."""

    def __init__(self, data: Dict[str, Any]):
        self._data = data

    def get(self, key, default=None):
        return self._data.get(key, default)

    def set(self, key, value):
        self._data[key] = value

    def __getitem__(self, key):
        ...


class MockAgent:
    """Provides agent.state.get/set interface so tools run unmodified."""

    def __init__(self, state_data: Any, state_key: str = "datas"):
        self.state = _MockState({state_key: state_data})
        self.messages: list = []
```

- **`state_factory()`** 返回的是 **一整份根状态**（在本项目里等价于 `load_data()`：`{"users":..., "orders":..., "products":...}`）。
- **`MockAgent(state, state_key="datas")`** 内部变成 **`self.state` 里只有一个键**，例如 **`{"datas": state}`**，与 **`run.py` 里 `agent.state = _State({"datas": load_data()})`** 对齐。
- 工具里写的是 **`agent.state.get("datas")`** → 能读到这份 dict；写回 **`agent.state.set("datas", ...)`**（若工具有 set）也会改 **`mock.state._data["datas"]`**。
- **`messages`** 置空列表：重放时 **不跑 LLM**，工具若偶尔读 `agent.messages` 也有个空壳（多数工具不依赖）。

**要点**：`MockAgent` 不是「智能体」，只是 **带最小 `state` API 的替身**，让 **`TOOL_MAP` 里的函数不用改签名**就能在评测里执行。

---

## 4. `StateEvaluatorConfig`：重放需要什么配置

```74:88:eval_common/state_eval.py
@dataclass
class StateEvaluatorConfig:
    ...
    state_factory: Callable[[], Dict[str, Any]]
    tools: Dict[str, Callable]
    state_key: str = "datas"
    terminate_tools: List[str] = field(default_factory=list)
```

| 字段                  | 作用                                                         |
| --------------------- | ------------------------------------------------------------ |
| **`state_factory`**   | 每次重放前 **新造一份初始库**（通常是 `load_data`），避免上一轮污染。 |
| **`tools`**           | **`工具名 → 与线上一致的 tool 函数`**（Strands 签名）。      |
| **`state_key`**       | 状态在 `agent.state` 里的键名，默认 **`"datas"`**。          |
| **`terminate_tools`** | 重放时 **跳过** 的工具名（如 **`transfer_to_human_agents`**），因为不参与改库或不应进入 golden 终态对比。 |

---

## 5. `replay_actions`：在干净状态上顺序执行动作列表

```91:122:eval_common/state_eval.py
def replay_actions(
    actions: List[Dict[str, Any]],
    config: StateEvaluatorConfig,
) -> Tuple[Dict[str, Any], str]:
    ...
    state = config.state_factory()
    mock = MockAgent(state, config.state_key)

    for action in actions:
        name = action.get("name", "")
        if name in config.terminate_tools:
            continue
        tool_func = config.tools.get(name)
        if tool_func is None:
            continue
        tool_use = {
            "toolUseId": "replay",
            "input": action.get("kwargs", {}),
        }
        try:
            tool_func(tool_use, mock)
        except Exception:
            pass  # tool errors don't stop replay

    final_state = mock.state.get(config.state_key)
    return final_state, get_data_hash(final_state)
```

逐步语义：

1. **`state = config.state_factory()`**：例如全新 **`load_data()`**。
2. **`mock = MockAgent(state, config.state_key)`**：把这份 state 挂到 **`mock.state["datas"]`**（或你配置的 key）。
3. 对 **`actions`** 里每个 **`{"name": ..., "kwargs": ...}`**：
   - **`terminate_tools`** 里的名字：**跳过**（与 `env_litellm` 构造 `golden_actions` 时过滤一致）。
   - **`tools` 里没有该 name**：**跳过**（不抛错）。
   - 否则拼 **`tool_use = {"toolUseId": "replay", "input": kwargs}`**，调用 **`tool_func(tool_use, mock)`**，与线上 Strands 调用形态一致。
4. **`except: pass`**：某个工具抛错时 **不中断整个重放**（避免因标注/实现边界导致整条 replay 崩掉）；代价是 **静默失败** 时，hash 可能仍是「初始库」，读代码时要心里有数。
5. 最后 **`mock.state.get(state_key)`** → **`final_state`**，并对其 **`get_data_hash`**，返回 **`(final_state, hash)`**。

**因此：`replay_actions(golden_actions)` 的含义是——「若世界完全按标注员给的工具+参数演变，最终数据库长什么样、指纹是多少」。**

---

## 6. `evaluate_state_consistency`：两条轨迹各重放一遍再比 hash

```133:145:eval_common/state_eval.py
def evaluate_state_consistency(
    agent_actions: List[Dict[str, Any]],
    golden_actions: List[Dict[str, Any]],
    config: StateEvaluatorConfig,
) -> StateConsistencyResult:
    """Replay both action lists on fresh state copies and compare hashes."""
    _, agent_hash = replay_actions(agent_actions, config)
    _, golden_hash = replay_actions(golden_actions, config)
    return StateConsistencyResult(
        agent_hash=agent_hash,
        golden_hash=golden_hash,
        consistent=(agent_hash == golden_hash),
    )
```

- **`agent_actions`**、**`golden_actions`** 分别在 **两份独立的新初始状态** 上重放（各调用一次 `state_factory()`），得到 **`agent_hash`** 与 **`golden_hash`**。
- **`consistent`**：两指纹是否相等。

**注意**：`env_litellm.calculate_reward` **没有**走这个函数；它是 **直接 `get_data_hash(agent.state["datas"))` 与 `replay_actions(golden_actions)` 的 `gt_data_hash` 比较**。概念上等价于：**智能体是真实跑出来的终态** vs **golden 重放终态**；没有把「智能体轨迹」再 replay 一遍（除非你在别处调用 `evaluate_state_consistency`）。

---

## 7. 为什么用「重放 golden actions 得标准终态」，而不是「和智能体轨迹逐格比对」？

### （1）判的是 **业务结果**，不是 **唯一解题步骤**

同一目标常有多种合法路径，例如：

- 多查几次 `get_order_details` / `get_product_details` 再换货；
- 先 `think` 再操作；
- 顺序微调但 **最终订单行、用户地址、支付** 与标注一致。

若 **强制与 golden 工具序列逐格相同**，会把大量 **结果正确** 的 rollout 判成错（假阴性）。**终态 hash** 只问：**世界是否被改成了题目认可的样子**。

### （2）轨迹里常混有 **不改变世界** 的步骤

例如 **`calculate`**、**`think`**、多余的 **`get_*`**。若做「逐步对齐 golden」，要在规则里写清：**哪些工具参与比对、是否允许插入**；维护成本高且易和真实产品行为脱节。**Golden 重放**只取 **`task.actions` 里那串「标注认为定义终态的写库/读库链」**（且可在上层过滤 `terminate_tools`），评估语义稳定。

### （3）**确定性、便宜、可复现**

逐格比对若包含自然语言或模糊匹配，容易要 **LLM judge**；状态 hash + 确定性重放 **不需要 Judge**，适合作为 **tau-bench 风格的主信号**。`state_eval` 就是为这类 **「可重放工具效果」** 准备的底座。

### （4）**Golden 本身就是「标准答案世界」的操作定义**

`Task.actions` 在数据标注上表达的是：**在相同初始库下，执行这些调用后应到达的参考终态**（含读操作若标注员也写进序列——读一般不改变 hash，但可保证后续写是在一致前提下发生）。用重放实现 **「标准答案 = 可执行规范」**，比「从自然语言反推 DB」要可操作得多。

### （5）与 **轨迹评估** 的分工

README 里也区分了：**轨迹评估**看像不像、Judge 看话术；**状态一致性**只看 **最终 DB**。`state_eval` 服务的是后者，所以设计上 **不依赖** 与智能体逐步一一对应。

---

## 8. 使用 / 阅读时的注意点（诚实边界）

- **`continue` + `except: pass`**：未知工具名或运行期异常会被 **吞掉**，hash 可能仍「像没执行」；这是 **鲁棒性 vs 可见性** 的折中。
- **`replay_actions` 返回的 `final_state`**：若你要调试，可用返回值看 **重放后的具体 JSON**，不仅看 hash。
- **`evaluate_state_consistency` 对 `agent_actions` 的重放**：要求你能从轨迹里 **可靠抽出** 与 **`TOOL_MAP` 兼容** 的 `name`/`kwargs`；若抽取格式不对，会得到 **偏的 agent_hash**。本仓库主路径是 **直接 hash 真实跑完的 state**，更直接。

---

**一句话**：`state_eval.py` 用 **`MockAgent`** 让 **同一套 Strands 工具** 在 **干净初始库** 上 **按列表重放**；**`replay_actions`** 产出 **标准终态及其 hash**；这样判分问的是 **「世界对不对」**，而不是 **「每一步是否和标注员点鼠标顺序一致」**。