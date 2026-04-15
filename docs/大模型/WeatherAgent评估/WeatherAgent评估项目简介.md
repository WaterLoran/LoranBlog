# WeatherAgent评估项目简介

下面是基于仓库 `README.md` 整理的**快速了解版**项目总结。

---

## 项目是什么

这是一个 **基于 AgentBoard 的「天气查询智能体」研究与评估项目**：用大模型理解自然语言天气问题，调用工具拉取/处理天气数据，并生成 **JSON / Markdown / HTML / Text** 等结构化报告；同时用 AgentBoard 的 **多维度指标** 做系统评估（README 里给出了在 Claude-3.7 等配置下的示例分数）。

---

## 解决什么问题

- **端到端**：从用户问法 → 选动作 → 调 API/工具 → 整理数据 → 出报告。  
- **可复现实验**：用固定测试集（`data/tool-query/test.jsonl`）和评估入口跑分、看日志。

---

## 技术栈与形态

- **语言**：Python 3.8+，`requirements.txt` 管理依赖。  
- **框架**：内嵌/扩展的 **AgentBoard**（`agentboard/`），不是单独的前端 SPA；核心是评估管线 + 环境与工具。  
- **模型**：README 提到可接 OpenAI、Claude、Azure、Bedrock 等（对应 `agentboard/llm/` 下各适配文件）。

---

## 代码怎么组织（抓主干）

| 层次      | 典型文件                                                     | 作用                             |
| --------- | ------------------------------------------------------------ | -------------------------------- |
| 智能体    | `vanilla_agent.py`                                           | 任务理解与执行策略               |
| 环境      | `weather_env.py`                                             | 动作路由、状态、与工具衔接       |
| 工具      | `weather_tools.py`                                           | 天气 API、数据处理、报告生成     |
| 提示      | `weather_prompt.json`                                        | 行为与示例                       |
| 评估      | `tool.py`、`eval_main.py`                                    | 任务打分与总入口                 |
| 配置/数据 | `eval_configs/main_results_all_tasks.yaml`、`data/tool-query/test.jsonl` | 跑哪些任务、用什么参数、测什么题 |

README 里用「★」标出了与 **Weather Agent** 强相关的核心文件；其余 AgentBoard 里的其他环境/任务（如 AlfWorld、WebShop 等）被标为**非本项目的必需部分**。

---

## 怎么跑起来（概念上）

1. `pip install -r requirements.txt`  
2. 按说明从模板配 `.env`（天气与 LLM 的 API Key 等）。  
3. 用 `scripts/evaluate.sh` 或直接 `python agentboard/eval_main.py ... --tasks tool-query` 跑评估；结果在指定的 `log_path`（如 `all_results.txt`、`tool-query.txt`、jsonl 日志）。

---

## 评估在关心什么（README 摘要）

- **Success Rate**：任务是否完全成功（二元）。  
- **Progress Rate**：子目标完成比例。  
- **Grounding Accuracy**：动作执行是否少报错。  
- **Score State**：关键步骤上的得分轨迹。

README 中的示例：**成功率/进度率 1.0**，**Grounding ~0.91**（并说明部分来自 API 参数/格式细微差异，不一定影响最终完成）。

---

## 一句话收尾

**这是一个「AgentBoard + LLM + 天气工具链」的演示与评估仓库：核心是天气查询智能体与 `tool-query` 任务上的标准化评测，而不是一个独立上线的天气 App。**

若你接下来关心的是「最小可读路径」还是「和上游 AgentBoard 的差异」，可以说明一下侧重点，我可以按那个角度再缩一版目录导读（仍不改动仓库）。