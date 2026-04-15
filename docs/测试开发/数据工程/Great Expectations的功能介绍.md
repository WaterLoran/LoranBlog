# Great Expectations的功能介绍

Great Expectations (GX) 是一个**开源的 Python 数据质量验证框架**，核心功能可以概括为：通过“期望”来测试数据，自动生成文档，并持续监控数据质量。它把软件工程中“单元测试”的理念引入到了数据领域，让数据团队能够像测试代码一样测试数据。

结合你之前了解的量化测试场景，GE 的核心功能可以归纳为下表，并对应到五种校验类型：

| 功能模块                  | 核心能力                           | 对应校验类型                   | 在量化测试中的应用                      |
| :------------------------ | :--------------------------------- | :----------------------------- | :-------------------------------------- |
| **Expectations (期望)**   | 提供 300+ 内置断言，支持自定义规则 | 计算关系、业务约束、数据层比对 | 验证交易量、价格范围、持仓数据一致性    |
| **Data Docs (数据文档)**  | 自动生成 HTML 格式的数据质量报告   | 所有类型                       | 沉淀数据契约，团队共享数据质量视图      |
| **自动化 Profiling**      | 自动分析数据并生成期望套件         | 数据层比对                     | 快速为新接入的数据源建立初始检查点      |
| **多数据源支持**          | 支持 Pandas、Spark、SQL、Kafka 等  | 所有类型                       | 直接验证交易数据库、流式行情或 CSV 文件 |
| **Checkpoints & Actions** | 编排验证流程并触发告警/操作        | 所有类型                       | CI/CD 集成，数据质量失败时自动告警      |

---

### 1. Expectations：数据质量测试的核心

这是 GE 最核心的功能。通过“期望”这种声明式的断言来描述数据应该是什么样的。

```python
import great_expectations as gx

context = gx.get_context()
# 假设已配置好数据源和 batch
batch = ...

# 定义一个期望：订单金额列的值应该在 0 到 100 万之间
expectation = gx.expectations.ExpectColumnValuesToBeBetween(
    column="amount",
    min_value=0,
    max_value=1000000
)

# 执行验证
result = batch.validate(expectation)
print(result.success)  # True/False
```

**内置期望**非常丰富，覆盖了常见的数据质量维度：完整性、唯一性、一致性、有效性、准确性等。例如：

- 表级：`ExpectTableRowCountToBeBetween`
- 列级：`ExpectColumnValuesToNotBeNull`、`ExpectColumnValuesToBeUnique`、`ExpectColumnValuesToMatchRegex`
- 跨列：`ExpectColumnValuesToMatchOtherColumn`

### 2. Data Docs：让测试结果可视化

验证结果会自动渲染成静态 HTML 网站。这个文档会展示：

- 所有期望套件（数据契约）
- 每次验证的历史记录和结果趋势
- 验证失败的具体数据和统计信息

这意味着测试不仅是“过与不过”，还能形成一份团队共享的**数据质量报告**，让业务方也能看到数据状况。

### 3. 自动化 Profiling：快速启动

对于新接入的数据源，不需要手写所有期望。GE 提供了 `OnboardingDataAssistant`，可以自动分析数据样本并生成一组合理的期望套件。你可以基于生成的套件再进行人工调整。

### 4. 数据源与存储的灵活性

GE 不关心你的数据存放在哪里，它通过“数据源”抽象来对接：

| 数据源类型               | 说明                                               |
| :----------------------- | :------------------------------------------------- |
| **Pandas**               | 验证内存中的 DataFrame                             |
| **Spark**                | 验证大规模分布式数据                               |
| **SQL (via SQLAlchemy)** | 直接连接 PostgreSQL、MySQL、Snowflake、BigQuery 等 |
| **Kafka (流式)**         | 支持对微批次消息进行验证                           |

同时，期望套件、验证结果、Data Docs 都可以存储在文件系统、数据库或云存储（S3/GCS）中。

### 5. Checkpoint：串联整个工作流

`Checkpoint` 是 GE 的执行编排器，它将数据源、期望套件、验证动作和后续操作（Actions）串联在一起。

一个 Checkpoint 可以：
- 验证一个或多个 Validation Definition
- 验证失败时发送 Slack/邮件通知
- 更新 Data Docs
- 返回验证结果供下游流程（如 Airflow）判断

```python
checkpoint = context.checkpoints.add(
    gx.checkpoint.checkpoint.Checkpoint(
        name="daily_validation",
        validation_definitions=[validation_def]  # 包含数据和期望
    )
)
result = checkpoint.run()
```

### 6. 流式数据验证 (Kafka 集成)

GE 1.0+ 支持在流式处理中对微批次数据进行验证。典型的用法是：从 Kafka 消费消息，攒成微批次 DataFrame，用 GE 验证，验证失败则写入死信队列（DLQ）。

```python
# 简化示例
def validate_streaming_batch(messages):
    df = pd.DataFrame(messages)
    batch = batch_definition.get_batch(batch_parameters={"dataframe": df})
    result = checkpoint.run()
    if not result.success:
        send_to_dlq(messages, result)  # 失败数据写入死信队列
```

### 7. 自定义期望

内置期望无法覆盖所有业务逻辑时，可以开发自定义期望。例如在量化场景中，可以自定义一个期望来验证“订单金额 = 数量 × 价格”这类计算关系。GE 提供了多种基类模板，如 `ColumnMapExpectation`（逐行映射）和 `ColumnAggregateExpectation`（聚合值），继承后实现 `_validate` 方法即可。

### 8. 关于 GE 的局限性

官方文档明确指出了 GE 不做的事情，理解这些有助于正确选型：

1. **不是数据管道执行框架**：GE 不负责调度任务，需要与 Airflow、dbt、Prefect 等工具集成。
2. **不是数据版本控制工具**：GE 只存储数据的元数据（期望、验证结果），不存储数据本身。数据版本控制需要搭配 DVC、lakeFS 等工具。
3. **运行环境**：核心库是 Python 的，其他语言生态系统支持有限。

---

### 学习建议

如果希望深入学习 GE，可以按以下路径：

1. **快速上手**：官方 [Quickstart](https://docs.greatexpectations.io/docs/0.18/tutorials/quickstart/) 教程（约 10 分钟）。
2. **理解核心概念**：重点掌握 `Data Context`、`Expectations`、`Batch`、`Checkpoint` 这几个核心对象。
3. **实践项目**：找一个真实的量化数据集（如股票行情 CSV），从定义简单期望开始，逐步搭建完整的 Checkpoint，最后集成到 CI/CD 中。
4. **自定义期望**：当内置期望无法满足量化业务逻辑（如 Greeks 计算验证）时，学习开发 `Custom Expectation`。

Great Expectations 目前在 GitHub 上非常活跃，总融资达 $61M，社区成熟度较高，是数据质量领域的主流选择。如果你需要，我可以帮你梳理一个针对量化场景的 GE 学习路径，或提供更具体的自定义期望开发示例。