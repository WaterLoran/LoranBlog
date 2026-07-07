# Deepeval的简单demo

这是一个最简单直观的DeepEval使用示例，展示了如何像写单元测试一样，评估你的LLM应用生成的回答是否正确。

### 📦 第一步：安装与准备

1.  **安装DeepEval**
    在你的终端（Terminal）里运行以下命令：
    ```bash
    pip install -U deepeval
    ```
    **说明**：`-U` 参数会确保你安装的是最新版本[reference:0]。

2.  **设置API密钥**
    DeepEval默认使用OpenAI的模型作为“评估法官”[reference:1]，因此需要设置API密钥。
    ```bash
    export OPENAI_API_KEY="你的API密钥"
    ```
    **说明**：如果你没有OpenAI密钥，或者想使用Ollama等本地模型，可以参考下文“如何更换评估模型”部分。

### ✍️ 第二步：编写第一个测试

创建一个名为 `test_basic.py` 的Python文件，并写入以下代码：

```python
# test_basic.py

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

# 1. 定义一个评估标准
correctness_metric = GEval(
    name="Correctness",
    criteria="判断'实际输出'是否与'期望输出'在核心内容上一致。",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.5
)

# 2. 准备一个测试用例
test_case = LLMTestCase(
    input="为什么天空是蓝色的？",
    actual_output="这是因为瑞利散射，太阳光中的蓝色光被大气分子散射到各个方向，使天空呈蓝色。",
    expected_output="蓝色的天空是由瑞利散射造成的，蓝色光波长较短，容易被大气中的气体分子散射。"
)

# 3. 运行评估
evaluate([test_case], [correctness_metric])
```
**代码解释**：
*   **定义评估标准 (`GEval`)**：这里定义了一个名为"Correctness"的评估指标[reference:2]。核心是`criteria`参数，它用自然语言告诉作为“法官”的LLM如何判断你的答案[reference:3]。
*   **准备测试用例 (`LLMTestCase`)**：将一个完整的问答封装成一个测试用例。你需要提供用户提问(`input`)、你的LLM应用生成的回答(`actual_output`)，以及一个标准答案(`expected_output`)作为参考[reference:4]。
*   **运行评估 (`evaluate`)**：执行评估，DeepEval会调用LLM法官，根据你定义的“标准”来给测试用例打分[reference:5]。

### 🚀 第三步：运行测试

在终端中，用DeepEval的专用命令运行你刚才写的测试文件：
```bash
deepeval test run test_basic.py
```
**说明**：必须使用 `deepeval test run` 命令来运行测试文件[reference:6]，而不是直接使用`python test_basic.py`。

### 📊 第四步：查看结果

运行成功后，你会在终端看到类似下面的输出：
```
... Running evaluations: 100%|████████████████████| 1/1 [00:02<00:00]
... Metric: Correctness, Score: 0.95, Threshold: 0.5, Success: ✅
```
**结果解读**：
*   **Score (得分)**：代表你的答案在“正确性”这一标准上的得分（0到1之间）。在这个例子中，`0.95`的高分表明实际输出与期望输出非常匹配。
*   **Success (成功标志)**：`✅`表示得分 (`0.95`) 超过了我们设定的阈值 (`0.5`)，即测试通过[reference:7]。

### 💡 扩展：更换评估模型

如果不想使用OpenAI，你可以轻松切换到其他模型。例如，使用免费的本地模型 `Ollama`[reference:8]：

```python
# ... 之前的导入部分不变 ...
from deepeval.models import OllamaModel

# 1. 指定本地模型
custom_model = OllamaModel(model="deepseek-r1:1.5b", temperature=0)

# 2. 在定义指标时传入模型
correctness_metric = GEval(
    # ... 参数不变 ...
    model=custom_model   # 添加这一行即可
)
# ... 后续代码不变 ...
```

这个例子虽然简单，但已经覆盖了DeepEval的核心工作流：**定义标准 -> 准备用例 -> 运行评估**。你可以在此基础上，替换成更复杂的`FaithfulnessMetric`、`AnswerRelevancyMetric`等指标，来全面评估你的RAG应用[reference:9]。