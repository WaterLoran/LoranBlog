# Great Expectations中的所有命令介绍

在 Great Expectations 0.18.x 版本中，CLI 提供了以下 **7 个核心命令**。每个命令都有自己的子命令（动词），用于执行具体操作。

---

## 📋 完整命令列表与简介

| 命令         | 作用                                              | 常用子命令                                   |
| ------------ | ------------------------------------------------- | -------------------------------------------- |
| `checkpoint` | 管理检查点（Checkpoints），用于执行数据验证流程。 | `list`, `new`, `run`, `delete`, `edit`       |
| `datasource` | 管理数据源（Data Sources），连接数据库、文件等。  | `list`, `new`, `delete`, `profile`（已废弃） |
| `docs`       | 构建和清理数据文档（Data Docs）静态网站。         | `build`, `list`, `clean`                     |
| `init`       | 初始化一个新的 Great Expectations 项目。          | 无子命令                                     |
| `project`    | 管理项目配置和升级。                              | `check-config`, `upgrade`                    |
| `store`      | 列出已配置的存储后端（Stores）。                  | `list`                                       |
| `suite`      | 管理期望套件（Expectation Suites）。              | `new`, `list`, `edit`, `delete`, `scaffold`  |

---

## 🔍 命令详细说明

### 1. `checkpoint`
- **用途**：创建、运行、管理检查点。检查点将数据资产、期望套件和动作（如生成文档、保存结果）绑定在一起。
- **常用示例**：
  ```bash
  great_expectations checkpoint list                     # 列出所有检查点
  great_expectations checkpoint new my_checkpoint        # 交互式创建新检查点
  great_expectations checkpoint run my_checkpoint        # 运行指定检查点
  great_expectations checkpoint delete my_checkpoint     # 删除检查点
  great_expectations checkpoint edit my_checkpoint       # 编辑检查点（打开 Jupyter Notebook）
  ```

### 2. `datasource`
- **用途**：配置和管理数据源（如 PostgreSQL、Pandas、Spark、Snowflake 等）。
- **常用示例**：
  ```bash
  great_expectations datasource list                     # 列出所有数据源
  great_expectations datasource new                      # 交互式创建新数据源
  great_expectations datasource delete my_datasource     # 删除数据源
  ```

### 3. `docs`
- **用途**：生成或清理 Data Docs——包含期望套件和验证结果的静态 HTML 网站。
- **常用示例**：
  ```bash
  great_expectations docs build                          # 生成/更新数据文档
  great_expectations docs list                           # 列出所有文档站点
  great_expectations docs clean                          # 清理文档站点文件
  ```

### 4. `init`
- **用途**：初始化一个新的 GE 项目。会在当前目录创建 `great_expectations/` 文件夹及配置文件。
- **用法**：
  ```bash
  great_expectations init
  ```

### 5. `project`
- **用途**：检查项目配置或升级项目结构（当 GE 版本升级时）。
- **常用示例**：
  ```bash
  great_expectations project check-config                # 验证项目配置是否正确
  great_expectations project upgrade                     # 升级项目以匹配新版本 GE
  ```

### 6. `store`
- **用途**：列出项目中所有已配置的存储后端（Store）。Store 负责持久化期望套件、验证结果等对象。
- **用法**：
  ```bash
  great_expectations store list
  ```

### 7. `suite`
- **用途**：管理期望套件（Expectation Suites），即数据质量规则的集合。
- **常用示例**：
  ```bash
  great_expectations suite list                          # 列出所有期望套件
  great_expectations suite new                           # 交互式创建新套件
  great_expectations suite edit my_suite                 # 编辑套件（打开 Jupyter Notebook）
  great_expectations suite delete my_suite               # 删除套件
  great_expectations suite scaffold my_suite             # 创建套件框架（仅包含示例期望）
  ```

---

## ⚠️ 注意事项

- 在 0.18.x 版本中 **没有 `profile` 命令**，需要通过 Python API 调用 `RuleBasedProfiler` 实现自动生成期望套件（如之前所述）。
- 所有命令均可通过 `great_expectations <command> --help` 查看详细子命令和参数，例如：
  ```bash
  great_expectations suite --help
  ```
- 全局选项（如 `--v3-api`、`--version`、`--verbose`）可置于命令前：
  ```bash
  great_expectations --version
  great_expectations --v3-api suite list
  ```

---

如果你需要查看每个命令的全部子命令（例如 `checkpoint` 还有 `--batch-request` 等高级选项），建议直接运行 `great_expectations <command> --help` 获取最准确的输出。