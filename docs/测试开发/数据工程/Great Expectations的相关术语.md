# Great Expectations的相关术语

Great Expectations（简称 GX）拥有一套清晰而丰富的术语体系，涵盖了从数据定义、规则编写、验证执行到结果呈现的全流程。下面按类别整理所有核心术语及其解释，帮助你系统掌握 GX 的“语言”。

---

## 🧠 核心架构层

### **Data Context（数据上下文）**
GX 项目的顶层对象，负责管理所有配置、数据源、期望套件、检查点、验证结果和数据文档的存储位置。每个项目只有一个 Data Context，通过 `gx.get_context()` 获取。

### **Data Source（数据源）**
数据存储的连接抽象，代表一个可访问的数据来源（如 PostgreSQL 数据库、AWS S3 目录、Spark 集群）。通过 Data Context 的 `sources` 属性添加和管理。

### **Data Asset（数据资产）**
数据源内的一个具体数据对象，例如数据库中的一张表、一个 CSV 文件、一个 SQL 查询结果。Data Asset 是执行验证的最小单元。

---

## 📜 规则定义层

### **Expectation（期望）**
一个关于数据质量的声明性断言，描述数据“应该”满足的条件。例如：“`passenger_count` 列不应为空”或“`fare_amount` 列的值在 0 到 1000 之间”。

### **Expectation Suite（期望套件）**
一组 Expectation 的集合，通常对应一个 Data Asset 的完整质量规则。套件以 JSON 文件形式存储，可进行版本控制。

### **Expectation Configuration（期望配置）**
包含一个 Expectation 所需全部信息的字典结构，包括期望类型、参数、元数据等。序列化后即为套件文件中的条目。

### **Metric（度量）**
用于评估 Expectation 的基础统计数据，如列的最大值、平均值、行数、唯一值数量等。Metrics 是 Expectation 的计算基础。

### **Profiler（分析器）**
一种自动生成 Expectation Suite 的机制。分析器会扫描 Data Asset，根据数据特征（如数据类型、分布、唯一性等）或用户指定的规则，推断并创建一组 Expectation。

---

## 🔄 执行与验证层

### **Batch（批次）**
Data Asset 的一个具体数据切片，例如某一天的表数据、某个文件分片。Batch 由 Batch Request 定义，是验证操作的实际数据对象。

### **Batch Request（批次请求）**
一个描述如何从 Data Asset 获取 Batch 的配置对象，可包含数据过滤器（如时间范围）或分区标识符。

### **Batch Definition（批次定义）**
Data Asset 的分区规则定义，例如按日期列分区，使每个 Batch 对应一个唯一的分区值。

### **Validator（验证器）**
一个交互式对象，将 Batch 和 Expectation Suite 绑定在一起。用于在开发环境中测试 Expectation、探索数据，并生成临时的验证结果。

### **Checkpoint（检查点）**
一个可执行的配置，将 Batch Request、Expectation Suite 和 Actions 组合成一个完整的验证工作流。Checkpoint 可手动运行，也可集成到数据管道中调度执行。

### **Checkpoint Run（检查点运行）**
Checkpoint 的一次执行，产生一个 `CheckpointResult` 对象，包含本次验证的详细结果。

---

## 📊 结果与报告层

### **Validation（验证）**
使用一个 Expectation Suite 对一个 Batch 执行期望检查的过程。一次验证会产生一个 Validation Result。

### **Validation Result（验证结果）**
单个 Expectation Suite 对单个 Batch 验证后的输出，包含每个 Expectation 的成功/失败状态、观测到的 Metrics、异常信息等。

### **Validation Definition（验证定义）**
将 Expectation Suite 与一个 Data Asset 相关联的配置，标识了“哪组规则用于哪个资产”，是 Checkpoint 的基础构件。

### **Run ID（运行标识）**
每次 Checkpoint 运行的唯一标识符，通常包含时间戳，用于区分不同的验证执行记录。

### **Data Docs（数据文档）**
一组静态 HTML 网站，用于展示 Expectation Suites 和 Validation Results。Data Docs 便于团队共享数据质量报告和历史趋势。

### **Data Docs Site（文档站点）**
Data Docs 的配置单元，定义了文档的生成位置、样式、包含哪些验证结果等。一个 Data Context 可以配置多个站点（如 dev、prod）。

---

## 🧩 扩展与集成层

### **Action（动作）**
Checkpoint 运行完成后执行的操作，例如保存 Validation Result、更新 Data Docs、发送通知邮件。Action 可通过插件扩展。

### **Store（存储）**
GX 用于持久化对象（如 Expectation Suites、Validation Results、Data Docs）的抽象层。常见 Store 包括本地文件系统、S3、数据库等。

### **Plugin（插件）**
用户自定义的扩展，可添加新的 Expectations、Data Sources、Metrics、Actions 等。插件代码放在 `plugins/` 目录，GX 会自动加载。

### **Configuration Variable（配置变量）**
用于存储敏感信息（如数据库密码）的占位符，在 `uncommitted/config_variables.yml` 中定义，运行时被替换。避免将秘密信息提交到版本控制。

---

## 🛠️ 工具与辅助概念

### **CLI（命令行工具）**
`great_expectations` 命令，提供初始化项目、创建 Expectation Suite、运行 Checkpoint 等交互式功能。

### **Checkpoint Configuration File（检查点配置文件）**
描述 Checkpoint 的 YAML 或 JSON 文件，存储在 `checkpoints/` 目录下，可通过 CLI 或 Python 加载。

### **Data Assistant（数据助手）**
一种交互式工具（通常通过 Notebook 使用），帮助你快速生成 Expectation Suite，并提供数据概览和建议规则。

### **Usage Statistics（使用统计）**
GX 默认收集的匿名使用数据，帮助项目改进。可通过配置关闭。

---

## 🔗 概念关系总览

```
Data Context
├── Data Sources
│   └── Data Assets
│       ├── Batch Request
│       └── Expectation Suite (Profiler 生成)
│           └── Expectations (Metrics 支撑)
├── Checkpoints
│   ├── Validation Definition (关联 Data Asset + Expectation Suite)
│   ├── Batch Request
│   └── Actions
├── Stores
├── Data Docs
└── Plugins
```

---

## 📖 如何深入学习

- 官方术语表：[Great Expectations Glossary](https://docs.greatexpectations.io/docs/terms/glossary)
- 概念详解：[Core Concepts](https://docs.greatexpectations.io/docs/guides/understanding/concepts)

如果你对某个特定概念想了解更多实现细节或使用场景，欢迎进一步提问。