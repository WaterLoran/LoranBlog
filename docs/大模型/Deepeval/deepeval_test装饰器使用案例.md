# deepeval_test装饰器使用案例

## `@deepeval.test` 装饰器使用示例

以下是一个完整的示例，展示如何使用 `@deepeval.test` 装饰器来标记一个 LLM 测试函数，并用 `deepeval test run` 命令执行。

---

### 示例代码：`test_kimi_with_decorator.py`

```python
# test_kimi_with_decorator.py
import os
from openai import OpenAI
from deepeval import test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

# ---------- 1. 定义被测系统（Kimi API 封装）----------
class KimiChat:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.environ["MOONSHOT_API_KEY"],
            base_url="https://api.moonshot.cn/v1"
        )
        self.model = "moonshot-v1-8k"

    def ask(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

# ---------- 2. 使用 @deepeval.test 装饰测试函数 ----------
@test
def test_kimi_correctness():
    """测试 Kimi 回答的正确性"""
    # 准备被测对象
    bot = KimiChat()
    
    # 定义评估指标（使用 GEval 自定义正确性标准）
    correctness_metric = GEval(
        name="Correctness",
        criteria="判断'实际输出'是否与'期望输出'在核心内容上一致。",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        threshold=0.7
    )
    
    # 准备测试用例
    test_case = LLMTestCase(
        input="解释什么是牛顿第一定律。",
        actual_output=bot.ask("解释什么是牛顿第一定律。"),
        expected_output="任何物体都要保持匀速直线运动或静止状态，直到外力迫使它改变运动状态为止。"
    )
    
    # 运行评估（DeepEval 会自动将结果转为断言）
    from deepeval import evaluate
    evaluate([test_case], [correctness_metric])

# 可以写多个测试函数，每个函数用 @test 装饰
@test
def test_kimi_relevancy():
    """测试 Kimi 回答的相关性"""
    from deepeval.metrics import AnswerRelevancyMetric
    bot = KimiChat()
    metric = AnswerRelevancyMetric(threshold=0.5)
    test_case = LLMTestCase(
        input="今天天气怎么样？",
        actual_output=bot.ask("今天天气怎么样？")
    )
    from deepeval import evaluate
    evaluate([test_case], [metric])
```

---

### 执行方式

```bash
# 1. 设置环境变量（Kimi API Key）
export MOONSHOT_API_KEY="你的密钥"

# 2. 运行测试（必须使用 deepeval test run 命令）
deepeval test run test_kimi_with_decorator.py
```

#### 可选参数示例
```bash
# 并行运行、生成 JSON 报告、显示详细输出
deepeval test run test_kimi_with_decorator.py -n 2 -r results.json -v
```

---

### 预期输出

```
===================== test session starts =====================
collected 2 items

test_kimi_with_decorator.py::test_kimi_correctness ✅ PASSED
test_kimi_with_decorator.py::test_kimi_relevancy ✅ PASSED

===================== 2 passed in 5.23s ======================
```

如果某个指标分数低于阈值，会显示 `❌ FAILED` 并给出分数和阈值。

---

## 解释说明

### 1. `@deepeval.test` 装饰器的作用
- **标记测试函数**：告诉 DeepEval 这个函数是一个 LLM 测试用例，需要被收集和执行。
- **自动集成 Pytest**：`deepeval test run` 底层调用 Pytest，该装饰器会注册一个 Pytest 测试项，使得函数能够利用 Pytest 的断言、fixture、参数化等特性。
- **提供额外元数据**：可以通过参数指定测试名称、超时时间、重试次数等（例如 `@test(name="自定义名称", timeout=30)`）。

### 2. 与传统 `evaluate()` 脚本的区别

| 方式                                   | 特点                                                         |
| :------------------------------------- | :----------------------------------------------------------- |
| 普通 `python script.py`                | 直接执行 `evaluate()`，不经过测试框架，无法并行、不生成 JUnit 报告、退出码不反映失败。 |
| `@deepeval.test` + `deepeval test run` | 获得 Pytest 生态：并行执行、缓存、详细报告、CI 集成、与单元测试共存。 |

### 3. 测试函数内部必须做什么？
- 创建指标实例（如 `GEval`, `AnswerRelevancyMetric` 等）。
- 创建 `LLMTestCase`（或 `ConversationTestCase`）对象。
- 调用 `evaluate([test_cases], [metrics])`。
- `evaluate()` 内部会根据指标的分数与阈值自动生成断言，无需手动写 `assert`。

### 4. 高级用法
- **参数化测试**：结合 `@pytest.mark.parametrize`（需要导入 pytest）：
  ```python
  import pytest
  @test
  @pytest.mark.parametrize("question,expected", [("1+1=?", "2"), ("2+2=?", "4")])
  def test_math(question, expected):
      ...
  ```
- **使用 Fixture**：定义 `@pytest.fixture` 提供 Kimi 客户端实例，在测试函数参数中注入。

---

## 总结

- **`@deepeval.test` 是连接 DeepEval 评估逻辑与 Pytest 测试框架的桥梁**。
- 它让你能够像写普通单元测试一样写 LLM 评估，并享受 Pytest 强大的运行器和报告系统。
- **推荐所有正式测试项目使用该装饰器 + `deepeval test run`**，而不是直接运行 Python 脚本。