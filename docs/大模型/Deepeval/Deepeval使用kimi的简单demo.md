# Deepeval使用kimi的简单demo

将 DeepEval 的评估模型换成 Kimi API，最好的方式是使用 DeepEval 官方提供的 `KimiModel` 类[reference:0]。它封装了 Kimi API 的调用，让你能像使用 OpenAI 模型一样轻松。

我将使用 `KimiModel` 重写之前的示例。要使用它，需要先安装 `deepeval` 和 `openai` 这两个包。

### 第一步：安装依赖

```bash
pip install deepeval 'openai>=1.0'
```

### 第二步：获取并设置 Kimi API 密钥

1.  前往 [Kimi 开放平台](https://platform.kimi.ai/console/api-keys) 创建 API 密钥。
2.  在代码中设置。**注意：** 你可以直接在代码中写死，或使用环境变量，**但出于安全考虑，强烈建议使用 `getpass` 函数临时输入**。

### 第三步：编写代码

创建一个名为 `test_with_kimi.py` 的文件，并写入以下代码：

```python
# test_with_kimi.py

# test_with_kimi.py

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.models import KimiModel
import getpass
import os

# --- 1. 配置和初始化 Kimi 模型 ---
# 安全地获取 API 密钥
if "MOONSHOT_API_KEY" not in os.environ:
    os.environ["MOONSHOT_API_KEY"] = getpass.getpass("请输入你的 Kimi API Key: ")

# 初始化 KimiModel
# kimi-k2.5 等未写入 deepeval 内置价目表时，必须显式传入单价（或改用已支持计价的模型名如 kimi-k2）
# 以下为 Moonshot 官网常见标价（$/token），以官网最新为准：https://platform.moonshot.cn/docs/pricing
kimi_model = KimiModel(
    model="kimi-k2.5",
    api_key=os.environ["MOONSHOT_API_KEY"],
    cost_per_input_token=0.60 / 1e6,
    cost_per_output_token=3.00 / 1e6,
)

# --- 2. 定义一个评估标准，并传入 Kimi 模型 ---
correctness_metric = GEval(
    name="Correctness",
    criteria="判断'实际输出'是否与'期望输出'在核心内容上一致。",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.5,
    model=kimi_model          # 重点：将评估模型替换为我们的 KimiModel 实例
)

# --- 3. 准备一个测试用例 ---
test_case = LLMTestCase(
    input="为什么天空是蓝色的？",
    actual_output="这是因为瑞利散射，太阳光中的蓝色光被大气分子散射到各个方向，使天空呈蓝色。",
    expected_output="蓝色的天空是由瑞利散射造成的，蓝色光波长较短，容易被大气中的气体分子散射。"
)

# --- 4. 运行评估 ---
evaluate([test_case], [correctness_metric])

# 控制台输出预期如下
"""
✨ You're running DeepEval's latest Correctness [GEval] Metric! (using kimi-k2.5
(KIMI), strict=False, async_mode=True)...



======================================================================

Metrics Summary

  - ✅ Correctness [GEval] (score: 0.9, threshold: 0.5, strict: False, evaluation model: kimi-k2.5 (KIMI), reason: Both outputs correctly identify Rayleigh scattering (瑞利散射) as the cause of the blue sky, mention the scattering of blue light (蓝色光) by atmospheric/gas molecules (大气分子/气体分子), and explain that this results in the sky appearing blue. While the Expected Output emphasizes the short wavelength (波长较短) of blue light as the reason for scattering, and the Actual Output emphasizes the directional aspect of scattering (散射到各个方向), they convey semantically equivalent core scientific explanations with aligned key facts., error: None)

For test case:

  - input: 为什么天空是蓝色的？
  - actual output: 这是因为瑞利散射，太阳光中的蓝色光被大气分子散射到各个方向，使天空呈蓝色。
  - expected output: 蓝色的天空是由瑞利散射造成的，蓝色光波长较短，容易被大气中的气体分子散射。
  - context: None
  - retrieval context: None

======================================================================

Overall Metric Pass Rates

Correctness [GEval]: 100.00% pass rate

======================================================================


⚠ WARNING: No hyperparameters logged.
» Log hyperparameters to attribute prompts and models to your test runs.

================================================================================


✓ Evaluation completed 🎉! (time taken: 59.23s | token cost: 0.005982 USD)
» Test Results (1 total tests):
   » Pass Rate: 100.0% | Passed: 1 | Failed: 0

 ===============================================================================
= 

» Want to share evals with your team, or a place for your test cases to live? ❤️
🏡
  » Run 'deepeval view' to analyze and save testing results on Confident AI.

"""
```

**代码解释**：
*   **`KimiModel` 初始化**：`KimiModel` 是 DeepEval 为 Moonshot (Kimi) 提供的专门封装[reference:1]。你需要传入 `api_key`、模型名称 `model`（如 "kimi-k2.5"）和 Kimi API 的 `base_url`[reference:2]。
*   **在指标中使用**：在创建 `GEval` 指标时，通过 `model=kimi_model` 参数，DeepEval 就会使用 Kimi 模型来充当“评估法官”的角色。
*   **运行测试**：使用 `deepeval test run test_with_kimi.py` 命令来运行这个测试。

### 其他可选方案

如果你需要更灵活地控制或调用其他非官方模型，也可以参考以下两种方式：
*   **使用 `LiteLLMModel`**：LiteLLM 是一个强大的统一API调用库。如果你需要切换多种模型，这是一个很好的选择，但需要先安装 `litellm` 包[reference:3]。
*   **完全自定义 (`DeepEvalBaseLLM`)**：当 DeepEval 没有提供你需要的模型封装时，你可以继承 `DeepEvalBaseLLM` 类并实现 `generate` 等方法来实现[reference:4]。

### 总结
使用官方 `KimiModel` 是最简单、最推荐的方式。相比使用 OpenAI 模型，你只需要在代码中做两处关键修改：**将模型替换为 `KimiModel` 并进行配置**，以及在 `GEval` 等评估指标中**传入这个 `model` 参数**。