# tau-bench中Action和Task的数据结构解读

下面的说明严格对应你仓库里 `tau_bench/types.py` 的 `Action` / `Task` 定义（当前文件里就是这些内容）：

types.pyLines 10-19

class Action(BaseModel):

​    name: str

​    kwargs: Dict[str, Any]

class Task(BaseModel):

​    user_id: str

​    actions: List[Action]

​    instruction: str

​    outputs: List[str]

------

## `Action`（一步「标准工具调用」）

| 字段     | 含义             | 干什么用                                                     |
| :------- | :--------------- | :----------------------------------------------------------- |
| `name`   | 工具名字符串     | 和实现里的工具名一致（例如 `find_user_id_by_name_zip`、`exchange_delivered_order_items`）。在判分时用来指明「这一步该调用哪个工具」。 |
| `kwargs` | 该工具的一组参数 | 字典形式，对应调用时传入的字段（如 `order_id`、`item_ids`）。重放 golden 轨迹时会把这些参数交给 `eval_common/state_eval` 里的 `TOOL_MAP`，在干净数据上顺序执行，得到「标准答案」最终数据库状态。 |

注意：`Action` 不是「模型自然语言回复」，只描述 工具层 的一步。

------

## `Task`（一整道客服题）

| 字段          | 含义                                        | 干什么用                                                     |
| :------------ | :------------------------------------------ | :----------------------------------------------------------- |
| `user_id`     | 场景里的用户 ID（数据里的 key）             | 标注「这道题对应哪个顾客账号」，和 `data/users.json` 等里的用户一致，便于出题者/分析时知道主体是谁。在你这边的 `env_litellm.py` 里当前没有直接读 `task.user_id`，对话靠 `instruction` 驱动；但在数据集语义上它仍是 「这道题是关于哪个用户」 的锚点。 |
| `instruction` | 给 用户模拟器 的长说明（剧本）              | 在 `env_litellm.py` 里会进 `build_user_system_prompt(self.task.instruction)`，用来约束 LLM 扮演的顾客：身份、目标、性格、什么能说什么不能说 等。客服智能体的系统提示来自 `wiki.md`，看不到这段 `instruction`（模拟真实顾客不会一次性交底）。 |
| `actions`     | 标注员给出的 参考工具序列（`List[Action]`） | 表示「若按认为正确的方式操作数据库，应依次执行这些工具及参数」。不要求被测智能体逐步模仿这条链；在本项目里主要用于 `calculate_reward` 里 `replay_actions`：在全新 `load_data()` 上重放（并排除 `transfer_to_human_agents` 等终止工具），算 golden 数据 hash，再和智能体跑完后的 `agent.state["datas"]` hash 对比，判断 最终世界状态是否正确。 |
| `outputs`     | 必须在 客服自然语言输出 里出现的子串列表    | 若 `len(self.task.outputs) > 0`，`calculate_reward` 会检查智能体历史回复（`output_list`）里是否 包含 每个字符串（大小写不敏感、去掉逗号再比）。用于考「有没有把关键数字/说法说出来」，例如某题要求答 `"10"`。若为空列表 `[]`，则不做这项检查，只靠状态 hash（及任务里其它逻辑）。 |

------

## 和「三块」的对应关系（方便记）

1. 顾客侧目标（隐藏信息） → `instruction`（只喂用户模型）
2. 可验证的「世界改对了没」 → `actions`（重放得到标准终态）
3. 可验证的「话有没有说对」 → `outputs`（子串匹配）
4. 数据/人物锚点 → `user_id`（谁的故事；实现里可不用，但题面常用）

------

## 补充：`Action` 里常见的一类名字

`types.py` 顶部有常量 `RESPOND_ACTION_NAME = "respond"`，在部分 tau-bench 流程里会用来表示「纯文本回复」类步骤；你当前 `env_litellm.py` 的 golden 重放用的是 `tools` 的 `TOOL_MAP`，一般只包含真实工具函数，通常不会把 `respond` 当可重放工具（具体以 `task.actions` 里实际出现的 `name` 为准）。

若你注意到 `tasks_test.py` 里某些 `Task(...)` 还带 `annotator=` 这类参数，那是 数据文件里多写的元数据；你当前的 `Task` 模型在 `types.py` 里 没有 声明该字段——是否合法取决于该包实际用的 Pydantic 配置；以 `types.py` 里四个字段为准理解「官方 schema」即可。