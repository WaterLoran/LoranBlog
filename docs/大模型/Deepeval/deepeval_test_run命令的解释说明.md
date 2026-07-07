# deepeval_test_run命令的解释说明

## `deepeval test run` 命令完整参数说明

`deepeval test run` 是 DeepEval 的主要测试运行器，支持丰富的命令行参数。以下基于 DeepEval 官方文档（v3.x）整理。

---

### 基本语法

```bash
deepeval test run <测试文件或目录> [选项]
```

---

### 参数列表

| 参数                  | 简写         | 类型   | 说明                                                         | 示例                       |
| :-------------------- | :----------- | :----- | :----------------------------------------------------------- | :------------------------- |
| `test_path`           | （位置参数） | 字符串 | 要运行的测试文件（`.py`）或包含测试的目录路径。              | `deepeval test run tests/` |
| `--num-processes`     | `-n`         | 整数   | 并行运行的进程数，用于加速多个测试用例。默认 1。设为 `-1` 表示使用所有 CPU 核心。 | `-n 4`                     |
| `--confident-api-key` | `-k`         | 字符串 | 用于将结果上传到 Confident AI 云平台的 API 密钥。若不提供，则不上传。 | `-k "your_key"`            |
| `--report-file`       | `-r`         | 字符串 | 将测试结果保存为 JSON 文件的路径。可用于后续分析或 CI 报告。 | `-r results.json`          |
| `--junit-xml`         | `-j`         | 字符串 | 生成 JUnit XML 格式的报告文件（常用于 Jenkins、GitLab CI 等）。 | `-j report.xml`            |
| `--verbose`           | `-v`         | 标志   | 输出详细的调试信息，包括每个指标的内部评分理由。             | `-v`                       |
| `--ignore-errors`     | `-i`         | 标志   | 当某个测试用例抛出异常时，不中断整体运行，继续执行后续用例。 | `-i`                       |
| `--cache`             | 无           | 字符串 | 控制评估缓存行为。可选值：`on`（默认）、`off`、`clear`（清除缓存后运行）。 | `--cache=off`              |
| `--repeat`            | `-R`         | 整数   | 重复运行所有测试 `N` 次，用于稳定性测试。最终报告显示平均分和标准差。 | `-R 3`                     |
| `--max-concurrent`    | `-m`         | 整数   | 与 `-n` 类似，但控制的是单个测试内部的并发评估数（每个测试用例内的指标并行）。默认 1。 | `-m 10`                    |
| `--dry-run`           | 无           | 标志   | 仅列出将要运行的测试，不实际执行。                           | `--dry-run`                |
| `--help`              | `-h`         | 标志   | 显示帮助信息并退出。                                         | `-h`                       |

---

### 详细说明

#### 1. `test_path`（位置参数）
- **必须提供**。可以是单个 `.py` 文件，也可以是包含多个测试文件的目录（DeepEval 会递归查找所有 `test_*.py` 或 `*_test.py` 文件）。
- 示例：
  ```bash
  deepeval test run test_kimi.py
  deepeval test run tests/unit/
  ```

#### 2. `--num-processes` / `-n`
- **用途**：并行运行多个独立的测试文件或测试用例（每个进程独立加载模型，适合 CPU/GPU 多核）。
- **注意**：如果被测系统（如 Kimi API）本身有速率限制，过高的并行度可能导致限流。
- 示例：`-n 2`

#### 3. `--confident-api-key` / `-k`
- **用途**：上传测试结果到 Confident AI 平台，用于可视化、历史趋势对比、团队协作。
- **获取密钥**：登录 [Confident AI](https://app.confident-ai.com) → 个人设置 → API Keys。
- 示例：`-k "cai_xxxx"`

#### 4. `--report-file` / `-r`
- **输出格式**：JSON，包含每个测试用例的输入、输出、各指标得分、详细理由、执行时间等。
- **典型用途**：后续使用 Python 解析生成自定义报表，或与 Grafana 等结合。
- 示例：`-r ./reports/2025-03-15.json`

#### 5. `--junit-xml` / `-j`
- **输出格式**：标准 JUnit XML，可与 Jenkins、GitLab CI、Azure DevOps 等集成，直接显示测试通过/失败状态。
- 示例：`-j test-results.xml`

#### 6. `--verbose` / `-v`
- **输出内容**：除了分数，还会打印 LLM 作为评判员时生成的详细推理过程（例如为什么给出这个分数）。
- **适用**：调试评估指标是否合理，或理解失败原因。
- 示例：`-v`

#### 7. `--ignore-errors` / `-i`
- **典型错误**：网络超时、API 返回错误、被测系统崩溃等。使用该参数可跳过出错的用例，保证批量测试完成。
- 示例：`-i`

#### 8. `--cache`
- **缓存机制**：DeepEval 默认会缓存每个 `(输入, 输出, 指标配置)` 的评估结果（因为调用 LLM 作为评判员成本高）。同一组数据第二次运行会直接使用缓存。
- **选项**：
  - `on`（默认）：启用缓存。
  - `off`：禁用缓存，所有指标重新计算。
  - `clear`：清除所有缓存后再运行（相当于清空）。
- 示例：`--cache=clear`

#### 9. `--repeat` / `-R`
- **输出示例**：执行 3 次后，显示 `Faithfulness: avg=0.85, std=0.02`。
- **用途**：评估模型输出的稳定性（由于温度参数等可能导致分数波动）。
- 示例：`-R 5`

#### 10. `--max-concurrent` / `-m`
- **区别**：`-n` 控制进程级并行（不同测试用例），`-m` 控制线程级并发（同一测试用例内的多个指标同时评估）。通常保持默认 1，除非你确信 API 能承受高并发。
- 示例：`-m 5`

#### 11. `--dry-run`
- **输出**：列出所有将要执行的测试用例名称和数量，不进行任何 API 调用。
- **用途**：验证测试文件是否被正确发现，预估测试规模。
- 示例：`--dry-run`

---

### 综合使用示例

```bash
# 基本运行，生成 JSON 报告，禁用缓存，并上传到 Confident AI
deepeval test run tests/ \
  --report-file results.json \
  --cache=off \
  --confident-api-key "cai_abc123"

# 高并发 + JUnit 报告 + 详细日志
deepeval test run test_kimi.py \
  -n 4 \
  -m 10 \
  -j junit.xml \
  -v

# 稳定性测试：重复 3 次，忽略错误，不缓存
deepeval test run test_agent.py \
  -R 3 \
  -i \
  --cache=off
```

---

### 常见问题

| 问题                   | 解决方法                                                     |
| :--------------------- | :----------------------------------------------------------- |
| 运行后没有任何输出     | 确保文件名以 `test_` 开头，或使用 `deepeval test run` 而不是 `python`。 |
| 缓存导致结果不更新     | 使用 `--cache=clear` 或 `--cache=off`。                      |
| 并行运行导致 API 限流  | 减少 `-n` 值，或增加被测系统的配额。                         |
| 找不到 `deepeval` 命令 | 确认已安装 `deepeval` 包，并激活虚拟环境。                   |

如需最新参数列表，可运行 `deepeval test run --help` 查看实时输出。