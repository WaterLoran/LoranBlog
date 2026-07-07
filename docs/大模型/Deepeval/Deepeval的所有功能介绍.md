# Deepeval的所有功能介绍

DeepEval 不仅是一个“LLM 的单元测试框架”，更是一个覆盖 LLM 应用开发、测试、部署全生命周期的质量保障平台。

---

## 一、评估指标（Metrics）
这是 DeepEval 最核心的部分，提供 **50+ 开箱即用** 的评估指标。所有指标都输出 0~1 的分数，并附带详细的评分理由。

### 1. RAG（检索增强生成）评估
- `AnswerRelevancy` – 答案与问题的相关程度
- `Faithfulness` – 答案是否基于给定上下文（防幻觉）
- `ContextualRecall` – 上下文是否包含了期望答案所需的信息
- `ContextualPrecision` – 检索结果的排序质量（相关文档是否排在前面）
- `ContextualRelevancy` – 检索出的上下文是否与问题相关
- `KnowledgeRetention` – 模型在对话中是否记住了之前提到的知识

### 2. 智能体（Agent）评估
- `TaskCompletion` – 智能体是否成功完成用户指定的任务
- `ToolCorrectness` – 工具调用的参数和时机是否正确
- `GoalAccuracy` – 智能体的行为是否始终朝向最终目标
- `PlanAdherence` – 智能体是否遵循了预设的规划步骤
- `StepEfficiency` – 完成任务所用的步骤是否最少
- 此外还有 `Coherence`, `UserSatisfaction`, `ExecutionReliability` 等共 **9 种** Agent 指标。

### 3. 对话系统（Conversational）评估
- `RoleAdherence` – 模型是否始终扮演设定角色
- `ConversationCompleteness` – 对话是否覆盖了所有必要的话题
- `ConversationRelevancy` – 每轮回复是否与当前话题相关
- `KnowledgeRetention` – 跨轮次记忆信息的能力
- 其他：`Consistency`, `Politeness`, `NonRepetitiveness` 等。

### 4. 安全与合规（Safety & Compliance）
- `Bias` – 检测性别、种族等偏见
- `Toxicity` – 检测仇恨、侮辱等有毒内容
- `PIILeakage` – 检测是否泄露个人隐私信息（邮箱、电话、身份证号等）
- `NonAdvice` – 当模型被要求提供医疗、法律等专业建议时，是否明确表示不提供
- `Misuse` – 检测模型是否被用于恶意目的（如生成攻击性代码）

### 5. 多模态（Multimodal）评估
- `ImageCoherence` – 生成的图像与文本描述是否一致
- `ImageHelpfulness` – 图像对解决用户问题的帮助程度
- `TextToImage` – 文本生成图像的整体质量
- `ImageEditing` – 图像编辑指令的完成度
- 以及其他针对图文匹配、图像变化的指标，共 **11 种**。

### 6. 通用及其他
- `Hallucination` – 通用幻觉检测（不依赖上下文）
- `Summarization` – 摘要的完整性、一致性、简洁性
- `JSONCorrectness` – JSON 格式与字段匹配校验
- `GEval` – 通过自然语言描述自定义评估标准
- `DAG` – 用有向无环图组合多个确定性规则进行评估

---

## 二、测试用例（Test Cases）
将 LLM 应用的交互封装为标准化的测试结构。

- **`LLMTestCase`** – 单轮问答的基本单元，包含 `input`, `actual_output`, `expected_output`, `retrieval_context` 等字段。
- **`ConversationalTestCase`** – 多轮对话测试，记录完整对话历史。
- **`MLLMTestCase`** – 多模态测试，支持图像输入/输出。
- **`SynthesizedTestCase`** – 由合成器自动生成的测试用例。

---

## 三、评估运行（Evaluation Run）
- **`evaluate()`** – 核心函数，接收测试用例列表和指标列表，执行评估并返回结果。
- **批量运行** – 支持并发评估大量用例。
- **缓存机制** – 自动缓存已评估过的用例，避免重复调用 LLM 打分，提升效率。
- **结果报告** – 输出详细分数、成功/失败标志、阈值比较，并可导出为 JSON 或集成到 Confident AI。

---

## 四、数据集与合成数据（Datasets & Synthesis）
解决 LLM 评估中最头疼的问题——**没有足够的标注测试数据**。

- **`EvaluationDataset`** – 管理一组测试用例，支持加载、保存、切片、转换。
- **`Synthesizer`** – 核心亮点。
  - 从文档生成：上传 PDF、TXT、Markdown，自动生成问答对（Golden Data）。
  - 从空生成：指定主题、领域、难度，合成全新的测试数据。
- **数据增强** – 对已有数据集进行改写、扰动，扩充测试覆盖面。

---

## 五、CI/CD 集成
DeepEval 深度集成 **pytest**，让你像写单元测试一样写 LLM 评估。

- 命令：`deepeval test run <文件名>`
- 可以在 GitHub Actions、GitLab CI、Jenkins 等流水线中直接运行。
- 支持失败时返回非零退出码，使流水线中断。
- 与 **Confident AI** 集成后，可在 PR 中自动评论测试报告。

---

## 六、自定义扩展（Customization）
允许开发者完全控制评估逻辑。

### 1. 自定义评估指标
继承 `BaseMetric` 类，实现 `measure()` 方法。可以调用任意 LLM、写确定性规则、或者使用其他 Python 库。

### 2. 自定义评估模型（评判员）
继承 `DeepEvalBaseLLM`，实现 `generate()` 方法。  
可以接入任何本地模型（如 Ollama、vLLM）或私有化部署的 API。

### 3. 自定义测试用例
继承 `BaseTestCase`，定义自己的数据结构和断言逻辑。

---

## 七、集成与生态（Integrations）
- **LangChain** – 提供 `LangChainTestCase` 和回调，直接评估 LangChain 应用。
- **LlamaIndex** – 提供 `LlamaIndexTestCase`，评估 RAG 流程的每一步。
- **CrewAI** – 评估多智能体协作系统的整体输出。
- **OpenAI / Anthropic / Gemini / Azure / Ollama / DeepSeek / Kimi** – 均可作为评估模型。
- **Confident AI** – 官方云平台，提供可视化仪表盘、历史趋势、A/B 测试、在线监控。

---

## 八、高级功能

### 1. 提示词优化（Prompt Optimization）
- **`GEPARunner`** – 使用遗传算法自动搜索最优提示词，提高特定任务上的得分。

### 2. 红队测试（Red Teaming）
- **DeepTeam** 子项目 – 自动生成攻击性输入（提示注入、越狱、对抗性样本），检测模型的安全漏洞。支持 40+ 攻击模式。

### 3. 追踪与可观测性（Tracing）
- 与 LangChain、LlamaIndex 集成，自动捕获 RAG 流程中的检索、生成、工具调用等步骤的耗时和元数据。
- 可与 Confident AI 结合，实现生产环境的实时监控。

### 4. 多语言支持
- 评估指标支持中文、英文、日文、法文等，在 `criteria` 中直接写中文即可。

---

## 九、DeepEval 3.0 新增功能（最新）
- **多模态测试用例** 成为一等公民。
- **评估模型无关性** – 同一套指标可以同时使用不同评判模型进行对比。
- **异步评估** – 大幅提升批量评估速度。
- **更丰富的 CLI** – 支持从命令行直接运行数据集、比较基线、生成报告。

---

## 十、总结：DeepEval 能做什么？

| 需求场景                                       | DeepEval 功能                                           |
| :--------------------------------------------- | :------------------------------------------------------ |
| 我想知道我的 RAG 系统是否经常编造事实          | 使用 `Faithfulness` 指标                                |
| 我需要测试客服机器人在 20 轮对话中是否跑题     | 使用 `ConversationalTestCase` + `ConversationRelevancy` |
| 我没有测试数据，只有一堆产品文档               | 使用 `Synthesizer` 自动生成问答对                       |
| 我的 LLM 应用是基于 LangChain 的 Agent         | 使用内置的 Agent 指标 + LangChain 集成                  |
| 我想在代码提交时自动跑评估，并在 PR 里看到报告 | 集成到 GitHub Actions + Confident AI                    |
| 我想用我自己的私有 LLM 来做评判员              | 继承 `DeepEvalBaseLLM` 并接入本地模型                   |
| 我需要检测用户是否试图注入恶意指令             | 使用 `Misuse` 指标 + DeepTeam 红队测试                  |

如果你想深入了解某个具体功能（例如如何用 `Synthesizer` 生成数据，或者如何自定义评估指标），我可以提供更详细的代码示例。