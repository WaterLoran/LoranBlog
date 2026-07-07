# Deepeval用于合成数据生成

DeepEval 的合成数据生成功能，核心是为了解决LLM应用开发中“无数据可用”或“数据不足”的痛点[reference:0][reference:1]。它通过 `Synthesizer` 模块，能基于你的文档库或完全从零，快速生成用于评测的大规模、高质量数据集[reference:2][reference:3]。在 DeepEval 中，生成的测试数据对象被称为 `Golden`[reference:4]。

### ⚙️ 合成数据生成的核心机制：Synthesizer

`Synthesizer` 是数据合成的核心引擎，它主要采用 **“数据进化” (Data Evolution) ** 方法生成高质量的合成数据[reference:5]。这种方法能自动增加测试数据的复杂度，帮助你发现模型在极端场景下的问题。

### 🛠️ 三大数据生成模式

根据你的数据源，`Synthesizer` 提供了三种生成模式，你可以通过 `Synthesizer` 类的不同方法来调用[reference:6]：

| 模式                                | 适用场景                                                     | 核心方法                                                     | 关键参数                                                     |
| :---------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **1. 从文档生成 (From Documents)**  | 你拥有包含领域知识的文档库（如PDF、Markdown、TXT），希望从中提取信息并生成测试用例[reference:7]。 | `generate_goldens_from_docs()`[reference:8]<br>`generate_conversational_goldens_from_docs()`[reference:9] | `document_paths` (必需)[reference:10]<br>`include_expected_output`[reference:11]<br>`max_goldens_per_context`[reference:12]<br>`context_construction_config`[reference:13] |
| **2. 从上下文生成 (From Contexts)** | 你已准备好可直接使用的文本上下文，想跳过文档处理步骤[reference:14]。 | `generate_goldens_from_contexts()`[reference:15]<br>`generate_conversational_goldens_from_contexts()`[reference:16] | `contexts` (必需)[reference:17]<br>`include_expected_output`[reference:18]<br>`max_goldens_per_context`[reference:19] |
| **3. 从零生成 (From Scratch)**      | 你没有任何文档或上下文，希望自由定义领域、任务，生成全新的测试数据[reference:20]。 | `generate_goldens_from_scratch()`[reference:21]<br>`generate_conversational_goldens_from_scratch()`[reference:22] | `styling_config` (必需)[reference:23]<br>`num_goldens` (必需)[reference:24] |

### 🔧 核心组件与高级配置

*   **上下文构建配置 (`ContextConstructionConfig`) **：用于精细控制文档分块策略。它接受 `chunk_size`（分块大小，单位token）和 `chunk_overlap`（块与块之间的重叠token数）等参数，直接影响生成上下文的质量[reference:25][reference:26]。
*   **数据演化 (`EvolutionConfig`) **：通过预设的演化策略自动增强测试数据。例如，**推理演化 (Reasoning Evolution) ** 会增加问题的逻辑复杂度[reference:27]。
*   **数据过滤 (`FiltrationConfig`) **：在生成后，系统会自动过滤掉低质量或重复的 `Golden` 数据，确保数据集的整体质量[reference:28]。

### 💻 综合代码示例：生成单轮及多轮 Golden 数据

下面是一个完整的示例，它集成了从文档生成和从零生成两种模式：

```python
from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import (
    ContextConstructionConfig, # 文档分块配置
    StylingConfig,             # 从零生成的样式配置
)
import os

# 1. 初始化 Synthesizer
synthesizer = Synthesizer(
    async_mode=True,            # 启用异步模式，加速生成
    model="gpt-4o",             # 使用 OpenAI 的 GPT-4o 模型
    max_concurrent=50,          # 最大并发数
)

# --- 模式1: 从文档生成 (单轮) ---
context_config = ContextConstructionConfig(
    chunk_size=1024,            # 每块最大1024个token
    chunk_overlap=100,          # 块间重叠100个token
)
print("开始从文档生成单轮 Golden...")
single_turn_goldens = synthesizer.generate_goldens_from_docs(
    document_paths=["./knowledge_base.pdf"],  # 你的知识库文档路径
    context_construction_config=context_config,
    max_goldens_per_context=2,  # 每个上下文最多生成2个 Golden
)
print(f"生成了 {len(single_turn_goldens)} 个单轮 Golden")
for golden in single_turn_goldens[:2]:  # 展示前2个
    print(f"  - Input: {golden.input}")
    print(f"    Expected Output: {golden.expected_output}")

# --- 模式2: 从零生成 (多轮) ---
styling_config = StylingConfig(
    input_format="用中文提问的财务分析问题",
    expected_output_format="详细的分析步骤和结论",
    task="作为一名专业的财务分析师，回答用户问题",
    scenario="用户是公司的非财务管理人员，需要简单易懂的解释",
)
print("开始从零生成多轮 Golden...")
multi_turn_goldens = synthesizer.generate_conversational_goldens_from_scratch(
    num_goldens=3,
    conversational_styling_config=styling_config  # 假设多轮有专用配置
)
print(f"生成了 {len(multi_turn_goldens)} 个多轮 Golden")
```

#### 代码运行流程与机制说明：

1.  **初始化**：创建 `Synthesizer` 实例并配置核心参数。
2.  **模式1执行**：
    *   `generate_goldens_from_docs` 方法读取 `knowledge_base.pdf`[reference:29]。
    *   根据 `ContextConstructionConfig` 将文档切分成块[reference:30]。
    *   将语义相似的文本块组合成多个上下文[reference:31]。
    *   对每个上下文，系统调用LLM生成 `input` 和 `expected_output`[reference:32]。
    *   通过数据演化策略增加输入问题的复杂性，以覆盖更多边缘场景[reference:33]。
    *   最终返回一系列 `Golden` 对象列表。
3.  **模式2执行**：
    *   根据 `StylingConfig`，LLM 在不依赖任何文档的情况下直接生成全新的 `input` 和 `expected_output` 对[reference:34]。

#### 生成的数据 (Golden) 是什么？

生成的 `Golden` 对象可以直接用于构建 DeepEval 的 `EvaluationDataset` 并参与评估[reference:35]。一个典型的 `Golden` 对象包含以下关键字段：
*   **`input`**: 用户的输入或问题[reference:36]。
*   **`expected_output`**: 期望的理想输出（`Golden` 的核心，作为“黄金标准”）[reference:37]。
*   **`context`**: 生成该 `Golden` 时所依据的检索上下文（通常是一个字符串列表）[reference:38][reference:39]。

### 💡 使用建议与最佳实践

*   **版本兼容性**：使用 `ContextConstructionConfig` 等配置对象来管理参数，避免因API升级导致参数传递错误[reference:40]。
*   **数据审查**：始终对生成的合成数据进行人工审查和编辑，这是保证评测数据集质量的可靠方法[reference:41]。
*   **成本预估**：生成数据会消耗LLM的token，请注意控制生成数据的规模和频率。

DeepEval 提供了一套灵活且强大的合成数据生成工具，可以极大加速你的 LLM 应用评测流程。你可以从简单的文档解析开始，逐步尝试更复杂的演化策略和自定义场景。