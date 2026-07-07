# Deepeval脚本不同执行方式之间的区别

## `deepeval test run` vs `python xxx.py` 的核心区别

DeepEval 提供了两种运行测试的方式，但**官方强烈推荐使用 `deepeval test run`**，因为它不只是执行 Python 脚本，而是一个增强的测试运行器。下面详细对比：

| 特性                  | `deepeval test run`                                          | `python xxx.py`                                              |
| :-------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **测试发现**          | 自动扫描文件中所有 `@deepeval.test` 装饰的函数或继承 `TestCase` 的类 | 只执行脚本中的 `evaluate()` 调用（如果写了），不会自动发现其他测试 |
| **并行执行**          | 支持 `-n` 参数并行运行多个测试用例，大幅提速                 | 始终串行执行                                                 |
| **输出格式**          | 彩色进度条、表格汇总、详细失败信息、支持 JSON/HTML 报告      | 只输出 `print` 和 `evaluate()` 默认的简单日志                |
| **Confident AI 集成** | 通过 `--confident-api-key` 自动上传测试结果到云平台          | 需要手动调用 `ConfidentAICallback` 等                        |
| **退出码**            | 根据是否有测试失败返回非零退出码（适合 CI/CD）               | 即使评估失败，默认退出码为 0（除非手动 `sys.exit`）          |
| **缓存机制**          | 自动缓存相同输入-输出对的评估结果，避免重复调用 LLM 打分     | 每次运行都重新计算所有指标                                   |
| **环境变量**          | 自动加载项目根目录的 `.env` 文件                             | 需要手动 `load_dotenv()`                                     |
| **断言支持**          | 可以直接在测试函数中使用 `assert`，运行器会捕获并报告        | `assert` 会抛出异常中断脚本                                  |
| **报告生成**          | `--report-file` 可输出 JSON 格式的详细报告                   | 无内置报告生成                                               |

---

## 实际例子对比

### 使用 `deepeval test run`（推荐）

```python
# test_kimi.py
from deepeval import test, evaluate
from deepeval.metrics import AnswerRelevancyMetric

@test("测试 Kimi 回答相关性")
def test_kimi_relevancy():
    metric = AnswerRelevancyMetric(threshold=0.7)
    # ... 调用 Kimi API ...
    evaluate([test_case], [metric])
```

运行时：
```bash
deepeval test run test_kimi.py
```
输出包含：
- 测试名称和状态（✅/❌）
- 分数和阈值比较
- 最终汇总（通过率、耗时）

### 直接 `python test_kimi.py`

```python
# test_kimi_simple.py
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric

metric = AnswerRelevancyMetric(threshold=0.7)
# ... 调用 Kimi API ...
evaluate([test_case], [metric])
```

运行时：
```bash
python test_kimi_simple.py
```
输出只有 `evaluate()` 打印的简单日志，没有测试级别的汇总，退出码始终为 0。

---

## 为什么官方强制要求 `deepeval test run`？

- **测试范式统一**：DeepEval 希望你像写单元测试（pytest）一样写 LLM 评估，`deepeval test run` 提供了类似的体验。
- **CI/CD 友好**：返回正确的退出码，方便集成到 GitHub Actions、Jenkins 等流水线。
- **性能优化**：并行和缓存对大型测试集非常关键（评估一个用例可能花费几秒，上百个用例时差异巨大）。

---

## 什么时候可以用 `python xxx.py`？

- **快速调试**：临时运行一小段代码，不想写完整的测试函数。
- **脚本化集成**：你需要完全控制评估流程（例如手动上传结果到其他平台）。
- **非 DeepEval 原生的 Python 环境**：某些嵌入式环境可能没有 `deepeval` CLI 命令。

---

## 总结

| 场景                              | 推荐方式                   |
| :-------------------------------- | :------------------------- |
| 日常开发、CI/CD、团队协作         | `deepeval test run`        |
| 一次性的快速验证、调试            | `python xxx.py`            |
| 需要生成报告或上传到 Confident AI | 必须用 `deepeval test run` |

**最佳实践**：使用 `deepeval test run` 并配合 `@deepeval.test` 装饰器，这样你既能获得丰富的测试功能，又保留了直接 `python` 运行的可能性（如果脚本中没有 `if __name__ == "__main__"` 块，直接运行可能不会执行测试，需要显式调用 `deepeval.run()`）。