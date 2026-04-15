# env_litellm测试管道解读

下面按代码真实行为，把 **`loop`** 和 **`calculate_reward`** 串成「对话怎么转、分怎么算、结果怎么打包」。行号均指 `env_litellm.py`。

---

## 一、`loop`：对话主循环在干什么

### 1. 角色分工（读循环前先记住）

- **`self.agent`**：Strands 客服智能体；调用 `self.agent(user_input)` 会跑模型 + 工具，并改写 **`self.agent.state["datas"]`**。
- **`self.user_messages`**：给 **用户模拟器 LLM** 的对话历史；角色在「user / assistant」之间交替，但含义是：**一边是环境里的假客服开场白，一边是模拟顾客**。
- **`self.task.instruction`**：已在 `__init__` 里拼进 **`self.user_system_prompt`**（`build_user_system_prompt`），**只有用户模型**在遵守。
- **`self.output_list`**：只收集 **客服智能体每一轮最终对用户的自然语言输出**（`str(res)`），用于后面 **`task.outputs`** 子串检查。

### 2. 进入 `loop` 之前：用量与状态

```142:147:env_litellm.py
    def loop(self, max_num_steps=30):
        accumulated_usage = {
            "inputTokens": 0,
            "outputTokens": 0,
            "totalTokens": 0
        }
```

后面每次调用 `self.agent(...)` 会把 **`res.metrics.accumulated_usage`** 累加到这儿，最后粗算 **`total_cost`**（212–214 行）。

### 3. 开场：先假装「店员打招呼」，再让用户模型接话

```149:154:env_litellm.py
        self.user_messages = [{"role": "user", "content": [{"text": "Hi! How can I help you today?"}]}]
        user_message = self.generate_conversation_litellm(
            self.user_messages, 
            system_prompt=self.user_system_prompt, 
            max_tokens=8192
        )
```

这里 **`user_messages` 的第一条 user** 其实是 **固定问候**（像店员说「您好需要什么」）。接着 **`generate_conversation_litellm`**（96–139 行）用 **LiteLLM** 调 **用户模型**：在 **系统提示 = 顾客剧本 + 行为规则**（81–94 行）下，生成 **第一句模拟顾客话** → 赋给 **`user_message`**。

也就是说：**循环外已经有一轮「环境问候 → 用户第一句」**。

### 4. 每一轮 `for _ in range(max_num_steps)` 内部逻辑

可以把一轮理解成：

**（A）用户侧刚说完一句 → 判断是否收工**

```156:160:env_litellm.py
        for _ in range(max_num_steps):
            reward = 0
            done = False
            done = "###STOP###" in f"{user_message}"
            self.user_messages.append({"role": "assistant", "content": [{"text": user_message}]}])
```

- 每轮先把当前 **`user_message`**（顾客这句）记到 **`user_messages`** 里，角色标成 **`assistant`**（在历史里表示「顾客这一边」）。
- **`done`**：若顾客这句里包含 **`###STOP###`**，表示剧本认为 **目标已达成**，用户模型按规则结束对话（见 `build_user_system_prompt` 第 92 行）。

**（B）若 `done`：立刻算分并 `break`**

```162:174:env_litellm.py
            if done:
                self.split_message_ids = len(self.agent.messages)
                if hasattr(res, 'metrics') and hasattr(res.metrics, 'tool_metrics'):
                    ...
                reward_res = self.calculate_reward()
                reward = reward_res.reward
                info.reward_info = reward_res
                break 
```

含义意图是：

- **`split_message_ids`**：截断 **客服 `agent.messages`** 时用，只保留到「对话结束点」之前（见后文 216–217 行）。
- **`calculate_reward()`**：下面第二节细讲。
- **`info`**：应为 **`EnvInfo`**，这里挂上 **`reward_info`**。

读代码时应注意：若 **第一轮顾客就直接 `###STOP###`**，此时 **`res` 可能尚未定义**（因为还没调用过 `self.agent`），162–170 行里对 **`res`** 的访问在 Python 里会 **有风险**；这是实现上的边角，不影响你理解「正常多轮：先用户话 → 再 agent」的主线。

**（C）若未 `done`：把顾客话交给客服智能体**

```176:177:env_litellm.py
            user_input = f"{user_message}"
            res = self.agent(user_input)
```

这里 **`user_input`** 就是当前这句顾客话；**`res`** 是 Strands 一次调用的返回（含 metrics、最终展示给用户的文本、工具调用等）。

**（D）把客服回复喂回用户模型，生成下一句顾客话**

```182:188:env_litellm.py
            agent_output = f"{res}"
            self.user_messages.append({"role": "user", "content": [{"text": agent_output}]})
            user_message = self.generate_conversation_litellm(
                self.user_messages, 
                system_prompt=self.user_system_prompt, 
                max_tokens=8192
            )
            self.output_list.append(agent_output)
```

- 客服的可见回复 **`agent_output`** 被记成 **`user_messages` 里的 user 消息**（因为下一句要由「用户模型」在 **看到客服说了什么** 之后继续演顾客）。
- 再调一次用户 LLM 得到 **下一句 `user_message`**。
- **`output_list`** 只追加 **客服** 字符串，供 **`calculate_reward` 里 `outputs` 检查**。

**（E）第二种结束：终止工具（如转人工）**

```191:210:env_litellm.py
            info = EnvInfo(task=self.task)
            if len(self.agent.messages) > 3: 
                for dic in self.agent.messages[-3]["content"]:
                    if "toolUse" in dic and dic["toolUse"]["name"] in self.terminate_tools:
                        done = True

            if done:
                self.split_message_ids = len(self.agent.messages)
                ...
                reward_res = self.calculate_reward()
                ...
                break
```

- 每轮新建 **`EnvInfo(task=self.task)`**。
- 只看 **`agent.messages` 倒数第 3 条**（`-3`）的 **`content`** 里是否出现 **`toolUse`**，且工具名在 **`self.terminate_tools`**（`run.py` 传入的 **`["transfer_to_human_agents"]`**）→ 认为 **客服调用了终止类工具**，`done = True`。
- 然后同样：**记 `split_message_ids`、从 `res.metrics` 抽工具调用塞进 `self.actions`、算分、`break`**。

注意 199–206 行：往 **`self.actions`** 里 **`append(tool_name)`** 又 **`append(Action(...))`**，`actions` 在类型上是 **`List[Action]`**，这里混入了 **字符串**，属于实现瑕疵；**判分主路径**用的是 **状态 hash**，不依赖这个列表的正确性。

### 5. 循环结束后：成本、`final_messages`、`SolveResult`

```212:224:env_litellm.py
        total_cost = accumulated_usage["inputTokens"] / 1000 * 0.001 + ...
        final_messages = self.agent.messages[:self.split_message_ids]
        final_messages.append({"role": "user", "content": [{"text": user_message}]})

        return SolveResult(
            reward=reward,
            info=info.model_dump(),
            messages=final_messages,
            total_cost=total_cost,
        )
```

- **`final_messages`**：客服侧消息截到 **`split_message_ids`**，再 **拼上最后一句用户话**（`user_message`），作为轨迹里「最后一轮用户」的收尾。
- **`SolveResult`** 把 **reward、info、messages、total_cost** 交回 **`run.py`**，再封装成 **`EnvRunResult`** 写入 JSON。

若 **30 步内从未 `done`**，当前实现 **不会** 在出口再调一次 **`calculate_reward`**，且 **`info` 可能从未赋值**（逻辑上依赖「一定会 break」）。理解主流程时，可以默认 **评测路径是「正常结束并算过分」**；若要写新环境，一般会在这里补「超时也算分」或默认 `info`。

---

## 二、`calculate_reward`：何时算、怎么算

在 **`loop` 里只有两种出口会调用**：用户说 **`###STOP###`**，或检测到 **终止工具**。

### 1. 默认满分，先做「数据库是否等于 golden」

```226:249:env_litellm.py
    def calculate_reward(self) -> RewardResult:
        reward = 1.0

        data_hash = get_data_hash(self.agent.state.get("datas"))

        golden_actions = [
            {"name": action.name, "kwargs": copy.deepcopy(action.kwargs)}
            for action in self.task.actions
            if action.name not in self.terminate_tools
        ]
        config = StateEvaluatorConfig(
            state_factory=load_data,
            tools=TOOL_MAP,
            state_key="datas",
            terminate_tools=self.terminate_tools,
        )
        _, gt_data_hash = replay_actions(golden_actions, config)
        info = RewardActionInfo(
            r_actions=data_hash == gt_data_hash, gt_data_hash=gt_data_hash
        )
        if not info.r_actions:
            reward = 0.0
```

步骤拆开是：

1. **`get_data_hash(self.agent.state.get("datas"))`**  
   对 **智能体跑完后** 的整库 `datas`（users/products/orders）做一个 **确定性 hash**（具体算法在 `utils.get_data_hash`）。

2. **`golden_actions`**  
   从 **`self.task.actions`** 复制出标注员的标准工具调用，**去掉** 与 **`terminate_tools`** 同名的动作（避免把「转人工」重放进 golden）。

3. **`replay_actions(golden_actions, config)`**  
   用 **`load_data()` 新拷一份库**，在 **`MockAgent`** 上对 **`TOOL_MAP`** 顺序重放 golden，得到 **golden 库的 hash**（`gt_data_hash`）。

4. **若 `data_hash != gt_data_hash`** → **`reward = 0`**；`RewardActionInfo` 里 **`r_actions`** 为 False。

这对应 README 里的 **「状态一致性 / 数据库 hash」**：**不关心智能体中间调了多少工具、顺序是否一样**，只问 **最终 `datas` 是否与「按标准答案重放」一致**。

### 2. 若任务配置了 `outputs`：再检查客服有没有「说对」

```251:267:env_litellm.py
        if len(self.task.outputs) > 0:
            r_outputs = 1.0
            outputs = {}
            for output in self.task.outputs:
                found = False
                for res in self.output_list:
                    if (
                        output.lower()
                        in res.lower().replace(",", "")
                    ):
                        found = True
                        break
                outputs[output] = found
                if not found:
                    r_outputs = 0.0
                    reward = 0.0
            info = RewardOutputInfo(r_outputs=r_outputs, outputs=outputs)
```

- 对每个 **`task.outputs`** 里的字符串，在 **`self.output_list`**（**客服每轮 `str(res)`**）里做 **子串匹配**（忽略大小写、去掉逗号再比）。
- 任一没出现 → **`reward = 0`**，并把 **`info` 换成 `RewardOutputInfo`**（**覆盖**前面的 `RewardActionInfo`）。因此 **`RewardResult.info` 在有 `outputs` 时主要是输出匹配信息**；若仍想同时看 hash，需要看返回结构外是否别处保存（当前代码里 **`info` 变量被覆盖**）。

### 3. 返回值

```269:269:env_litellm.py
        return RewardResult(reward=reward, info=info, actions=self.actions)
```

**`reward`**：1.0 表示 **状态对且（若有）outputs 全满足**；0.0 表示 **任一关没过**。  
**`actions`**：来自 **`loop` 里从 `res.metrics.tool_metrics` 抽取** 的片段（实现上有上述混杂问题），**不是** golden 的 `task.actions`。

---

## 三、把「心脏」压成一张流程图（心智模型）

```text
[固定问候] → 用户LLM → user_message
     ↓
  每轮:
    STOP? ──是──→ split_message_ids → calculate_reward → break
     │
     否
     ↓
  agent(user_message) → 累 token；output_list += 客服回复
     ↓
  用户LLM → 新 user_message
     ↓
  最近消息里调了 terminate_tools? ──是──→ 同上 break
     │
     否 → 继续下一轮（最多 max_num_steps）
     ↓
  calculate_reward:
    hash(agent.datas) vs replay(task.actions)
    若有 task.outputs → 扫 output_list 子串
```

---

## 四、和「学测试管道」直接相关的结论

1. **对话怎么转**：**用户 LLM** 与 **Strands 客服** 交替；用户侧历史存在 **`user_messages`**，客服侧在 **`agent.messages`**；**改库只发生在客服调工具时**（`agent.state["datas"]`）。

2. **何时算分**：仅在 **用户宣布 `###STOP###`** 或 **客服调用终止工具** 时调用 **`calculate_reward`**，不是每步都算。

3. **分是什么**：**主判据是最终数据库与 golden 重放一致**；**辅判据是 `task.outputs` 是否都出现在客服历史回复里**。

如果你下一步要对照 **`replay_actions`** 与 **`TOOL_MAP`**，可继续读 **`eval_common/state_eval.py`**，就能把「hash 从哪来」完全对齐到工具实现。