# Agent的可观测与复现

针对**可观测与复现**，目标是：**当线上出现问题时，能快速定位根因、低成本复现、高效修复，并防止同类问题再次发生**。以下是分模块的落地方法。

---

## 一、基于 Tracing / Metrics / Logs 的失败分类

### 1. 统一可观测架构（三层数据关联）

| 数据层      | 作用                                                         | 关键字段                                                     | 推荐工具                       |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------ |
| **Tracing** | 追踪单次请求的完整调用链（用户输入 → LLM决策 → 工具调用 → 输出） | `trace_id`, `span_id`, `parent_id`, `duration`, `status`, `error_type` | OpenTelemetry + Jaeger / Tempo |
| **Metrics** | 聚合统计（成功率、延迟分布、错误率、成本）                   | `counter`, `histogram`, `gauge`，带标签如`error_category`, `tool_name`, `tenant_id` | Prometheus + Grafana           |
| **Logs**    | 结构化事件详情（LLM prompt/response、工具入参/出参、异常堆栈） | `trace_id`, `level`, `message`, `payload`（脱敏后）          | Loki / ELK                     |

**关联原则**：所有 Logs 必须包含 `trace_id`，Metrics 的标签维度应与 Tracing 对齐，实现“从监控大盘 → 单条 Trace → 详细 Logs”的下钻。

### 2. 失败分类体系

定义一套**统一的失败分类（Error Taxonomy）**，便于聚合分析和驱动改进。

| 一级分类     | 二级分类                                                  | 示例                                                | 对应 Metric 标签                          |
| ------------ | --------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| **LLM 层**   | 超时、限流、内容过滤、JSON解析失败、输出格式错误          | LLM 返回 `finish_reason=length`（截断）             | `error_type=llm.timeout`                  |
| **工具层**   | 参数错误（schema）、执行超时、业务拒绝（如权限）、下游5xx | 工具返回 `{"code": 400, "msg": "missing order_id"}` | `error_type=tool.param_error`             |
| **编排层**   | 死循环（超过最大迭代次数）、工作流分支未命中、状态机异常  | Agent 连续调用相同工具5次无进展                     | `error_type=orchestration.max_iterations` |
| **RAG 层**   | 检索无结果、权限过滤后为空、上下文超长                    | 向量库返回空列表                                    | `error_type=rag.empty_result`             |
| **安全层**   | Prompt Injection 拒绝、越权拦截、敏感信息检测             | 用户输入触发安全规则，Agent 返回固定拒绝语          | `error_type=safety.injection_blocked`     |
| **基础设施** | 网络超时、DNS失败、内存/OOM、连接池耗尽                   | HTTP 503、socket timeout                            | `error_type=infra.network`                |

**落地**：在 Agent 代码中埋点，捕获异常时调用 `record_error(trace_id, error_category, error_details)`，自动上报到 Metrics 和 Logs。

### 3. 失败分类看板（示例）

在 Grafana 中构建面板：
- **Top N 错误类型**（饼图/柱状图）
- **错误率随时间趋势**（按租户/版本/工具维度分组）
- **错误分布热力图**（x轴=工具，y轴=错误类型，颜色=发生次数）

当某个错误类型占比突增时，直接下钻到对应的 Trace 列表。

---

## 二、回放：Conversation + Tool Traces

回放的目标是：**将一次线上失败“复现”为可离线执行的测试用例**，从而在开发/测试环境重现问题。

### 1. 对话级回放

**捕获内容**：
- 用户的多轮输入（保留原始时间戳、租户ID、用户ID）
- Agent 每轮输出的完整内容（包括中间思考链、工具调用请求）
- 实际执行的工具调用及其返回值（序列化后的 JSON）

**存储格式**（推荐 JSONL）：
```json
{
  "conversation_id": "conv_123456",
  "trace_id": "trace_abcdef",
  "version": "v1.2.3",
  "timestamp": "2025-01-15T10:30:00Z",
  "turns": [
    {
      "turn": 1,
      "user_input": "查询订单ORD-123的状态",
      "agent_response": {
        "final_answer": "订单状态为已发货...",
        "tool_calls": [
          {"tool": "query_order", "params": {"order_id": "ORD-123"}, "result": {"status": "shipped", "tracking": "SF123"}}
        ],
        "latency_ms": 1250,
        "token_usage": {"input": 450, "output": 120}
      }
    }
  ],
  "failure_info": {
    "error_type": "tool.param_error",
    "error_message": "order_id format invalid",
    "failed_turn": 2
  }
}
```

**回放引擎**：
- 编写一个 CLI 工具 `replay.py --input conversation.jsonl --env staging`。
- 模拟用户输入序列，调用 Agent API，并对比实际输出与捕获的输出（可选，用于回归）。
- 支持**跳过对比**仅复现失败步骤，或**修改参数**（如替换真实订单号为测试订单号）。

### 2. 工具调用链回放（Tool Traces）

复杂错误往往与工具链的中间状态相关，需要回放**工具调用的依赖关系**。

**捕获方式**：在 OpenTelemetry Span 中记录每个工具的输入/输出（注意脱敏）。例如：

```
Span: agent.plan
  Span: tool.query_order (input: {order_id: "ORD-123"}, output: {status: "shipped"})
    Span: tool.query_logistics (input: {tracking_no: "SF123"}, output: {eta: "2025-01-20"})
```

**回放实现**：
- 从 Trace 中提取工具调用 DAG（有向无环图）。
- 在测试环境中 Mock 所有外部依赖，按顺序喂给 Agent 相同的工具返回结果。
- 比较 Agent 在相同上下文下的决策（如是否调用下一个工具、最终答案）是否与原始 Trace 一致。

**工具推荐**：使用 `vcrpy` 风格（录制 → 回放），但对 LLM 调用需要特殊处理（因为 LLM 输出非确定性）。常见策略是：**在回放时使用相同的模型版本和 temperature=0，并允许微小差异，重点复现错误路径**。

---

## 三、复现脚本与根因分析

### 1. 自动生成复现脚本

当线上错误被捕获并分类后，应能**一键生成复现脚本**。

**流程**：
1. 从失败 Trace 中提取最小复现集：用户输入 + 必要的会话历史 + 工具 Mock 数据。
2. 自动生成一个 Python 测试文件，例如 `reproduce_issue_12345.py`：

```python
# reproduce_issue_12345.py
import pytest
from agent_client import AgentTester

def test_reproduce_tool_param_error():
    tester = AgentTester(env="staging")
    # 注入工具 Mock（模拟线上真实返回值）
    tester.mock_tool("query_order", return_value={"status": "shipped"})
    # 发送用户消息
    response = tester.chat("查询订单ORD-123的状态")
    # 断言应该触发 param_error（此处根据线上错误调整）
    assert response.error_type == "tool.param_error"
```

3. 该脚本可直接加入回归测试集，防止后续版本回归。

**实现要点**：
- 提供 CLI 命令：`agent-reproduce --trace-id trace_abcdef`，自动下载 Trace、生成脚本、运行。
- 支持脱敏：在生成脚本前，将真实用户ID、订单号替换为测试环境中的等价物（通过映射表）。

### 2. 根因分析辅助

| 根因类型       | 分析方法                                                     | 自动化程度                   |
| -------------- | ------------------------------------------------------------ | ---------------------------- |
| **参数错误**   | 比对工具 Schema 与 LLM 生成的参数，定位哪个字段格式错误      | 可自动：输出差异对比         |
| **超时/限流**  | 检查下游服务延迟分布，确认是否因某次慢调用引起               | 需结合 Metrics 热力图        |
| **逻辑错误**   | 比较 Agent 的预期工具调用链与实际调用链，用序列对齐算法找出差异点 | 半自动：给出差异高亮         |
| **安全拦截**   | 检查触发拦截的规则 ID，确认是否为误报                        | 可自动：输出规则名和匹配片段 |
| **上下文溢出** | 统计输入 token 数，定位哪一轮历史导致超限                    | 可自动：输出截断位置建议     |

**实践**：在错误详情页面（如 Jaeger UI 或内部告警平台）集成“一键分析”按钮，调用后端 API 执行上述自动化分析，输出 Markdown 格式的根因报告。

---

## 四、修复闭环：从复现 → 修复 → 验证 → 归档

### 1. 闭环流程

```
线上告警/错误分类
    ↓
自动创建 Issue（含 trace_id、错误分类、复现脚本草稿）
    ↓
开发人员拉取分支，运行复现脚本确认问题
    ↓
修复代码/Prompt/配置
    ↓
本地运行复现脚本 + 完整回归测试套件
    ↓
提交 PR，CI 中自动运行该复现脚本（作为新增回归用例）
    ↓
合并上线，灰度验证（观察对应错误类型 Metrics 是否下降）
    ↓
归档：将复现脚本移至 `tests/regression/` 目录，更新失败分类规则（如需要）
```

### 2. 关键工具链集成

| 环节             | 集成方式                                                     |
| ---------------- | ------------------------------------------------------------ |
| 监控告警 → Issue | Prometheus Alertmanager 调用 GitLab/GitHub API 创建 Issue，内容包含错误聚合信息（如“过去1小时 tool.param_error 增长500%”），并附上代表性 trace_id |
| Issue → 复现脚本 | 在 Issue 中添加 `/reproduce` 评论触发 CI Job，生成复现脚本并附件上传 |
| PR 检查          | CI 运行 `pytest tests/reproduce/` 下所有脚本，确保新问题不再出现 |
| 归档后清理       | 每周清理超过30天未复现的 Issue，对应的复现脚本移至 `tests/archive/`，防止膨胀 |

### 3. 效果度量指标

- **MTTR**（平均修复时间）：从告警触发到修复上线的时间，目标 < 2 小时（P95）。
- **复现成功率**：自动生成的复现脚本在本地能成功复现的比例，目标 > 90%。
- **回归泄漏率**：已修复的问题在后续版本重新出现的比例，目标 < 1%。

---

## 五、推荐技术栈与起步建议

| 组件         | 推荐方案                               | 备注                                                    |
| ------------ | -------------------------------------- | ------------------------------------------------------- |
| 分布式追踪   | OpenTelemetry SDK + Jaeger（或 Tempo） | 需在 Agent 代码中手动埋点（LLM 调用、工具调用）         |
| 指标聚合     | Prometheus + Grafana                   | 使用 `counter` 统计错误分类，`histogram` 记录延迟       |
| 日志收集     | Vector + Loki（或直接使用 ELK）        | 确保日志结构化（JSON），包含 `trace_id`                 |
| 回放引擎     | 自研 CLI（基于 Python + requests）     | 可参考 `vcrpy` 思路，但需适配异步 Agent                 |
| 复现脚本生成 | 自研 `reproduce-generator`             | 从 Trace 或 Logs 提取信息，使用 Jinja2 模板生成测试代码 |
| 缺陷跟踪     | GitLab Issues / GitHub Issues          | 通过 API 自动化创建和更新                               |

### 快速起步（第1周可完成）

1. **统一 trace_id 传递**：在所有组件（前端、Agent 服务、工具服务）的请求头中加入 `X-Trace-Id`，确保同一次请求贯穿全链路。
2. **在关键 Span 中记录输入/输出**：至少记录 LLM 请求/响应摘要、工具名+参数+返回值（脱敏后）。
3. **搭建基础 Metrics**：定义 `agent_requests_total{error_category}` 和 `agent_duration_seconds`，在 Grafana 中展示。
4. **实现手动复现脚本**：先不求全自动，当遇到线上问题时，手工从日志中复制 user input 和 tool mocks，写成测试用例。
5. **迭代自动化**：逐步完善回放生成器，最终实现“一键复现”。

通过这套可观测与复现体系，B端 Agent 的故障响应可以从“大海捞针”变成“精确制导”，大幅提升系统可靠性和迭代信心。