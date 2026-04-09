编写一个优秀的 OpenClaw/ClaudeCode Skill，关键在于让 AI 能**准确理解何时使用它**，并在被调用后能**可靠、高效地完成任务**。下面是一套从设计到实现的最佳实践指南。

---

## 🧠 1. 核心设计原则

### 1.1 单一职责
一个 Skill 只做一件事，并把它做好。例如：
- ❌ “处理用户数据和发送邮件” → 拆分为两个 Skill。
- ✅ “分析用户行为数据” 和 “发送营销邮件”。

### 1.2 描述即接口
`description` 是 AI 判断是否使用该 Skill 的唯一依据，必须**精确、全面**。它应该像一份“广告文案”，让 AI 一眼就明白这个 Skill 的用途、适用场景和输入要求。

### 1.3 渐进式披露
遵循“元数据 → 主体 → 资源”的加载机制：
- 元数据只给摘要，不占太多 Token。
- 主体（`SKILL.md`）提供核心指令，在需要时加载。
- 资源文件（脚本、参考文档）仅在执行中按需加载。

### 1.4 可测试性
Skill 应能在隔离环境中测试，最好提供测试脚本或示例。

---

## 📁 2. Skill 的标准结构

```
my-skill/
├── SKILL.md               # 必需：元数据 + 主体指令
├── scripts/               # 可选：可执行脚本（Python/Bash/JS等）
├── references/            # 可选：详细文档、API手册、模板
└── tests/                 # 可选：测试用例
```

---

## 📝 3. 编写 SKILL.md

### 3.1 元数据（YAML 头）
位于文件开头，用 `---` 包裹，包含 `name` 和 `description`。

```yaml
---
name: user-data-analyzer
description: |
  分析用户行为数据，生成活跃度报表和留存分析。
  适用场景：需要计算 DAU/MAU、留存率、用户分层时调用。
  输入：CSV文件路径或数据库连接字符串。
  输出：JSON格式的分析报告，包含关键指标和可视化数据。
---
```

**技巧**：
- `description` 可多行，用 `|` 保留换行。
- 描述中**明确输入、输出和典型场景**，帮助 AI 判断。

### 3.2 主体（Markdown 正文）
主体部分是对 Skill 工作流程的详细指导，AI 会严格按此执行。建议包含以下章节：

#### 3.2.1 概述
简要说明 Skill 能做什么，适用条件。

#### 3.2.2 准备工作
列出执行前需要满足的条件（如环境变量、依赖、数据格式）。

#### 3.2.3 核心步骤
用有序列表或分步骤描述流程，每一步尽量具体。可以嵌入代码示例。

```markdown
## 核心步骤

1. **验证输入**：检查用户提供的文件路径是否存在，若不是文件，则提示错误。
2. **加载数据**：使用 `pandas.read_csv()` 读取文件，处理缺失值。
3. **计算指标**：
   - DAU：按日期分组计数
   - 留存率：计算次日/7日留存
4. **生成报告**：输出 JSON，格式如下：
   ```json
   { "dau": [...], "retention": {...} }
```
```

#### 3.2.4 常见问题
列出可能出现的错误及解决方法，帮助 AI 调试。

#### 3.2.5 最佳实践
给出优化建议，例如大数据集的处理技巧。

#### 3.2.6 使用脚本说明
如果需要调用外部脚本，说明如何调用、参数含义。

---

## 🛠️ 4. 提供脚本和参考文档

### 4.1 脚本（`scripts/`）
- 将重复性任务封装成可执行脚本（Python、Bash、Node.js 等）。
- 脚本应接受命令行参数，并输出结构化结果（如 JSON）。
- 在 `SKILL.md` 中说明脚本的用法和预期输出。

**示例** (`scripts/analyze_users.py`)：
```python
#!/usr/bin/env python3
import sys, json, pandas as pd

file_path = sys.argv[1]
df = pd.read_csv(file_path)
result = {
    "total_users": len(df),
    "active_users": df[df['last_active'] > '2025-01-01'].shape[0]
}
print(json.dumps(result))
```

### 4.2 参考文档（`references/`）
- 存放 API 文档、复杂算法说明、模板文件等。
- AI 只有在需要时才会读取这些文件，因此应保持内容聚焦。

---

## 🧪 5. 测试 Skill

### 5.1 编写测试用例
在 `tests/` 目录下准备测试数据和测试脚本。例如：
- 提供一个小型 CSV 文件，运行 Skill 并验证输出是否符合预期。
- 模拟错误输入，检查错误处理是否得当。

### 5.2 手动测试
在 OpenClaw 中加载 Skill，并输入典型请求，观察 AI 的行为和输出。

### 5.3 调试技巧
- 在 `SKILL.md` 中添加调试步骤，例如要求 AI 输出中间结果。
- 利用脚本的日志功能记录执行过程。

---

## 🚀 6. 发布与分享

### 6.1 版本控制
使用 Git 管理 Skill 源码，添加清晰的 README 说明。

### 6.2 发布到社区
- 上传到 GitHub，并添加标签 `openclaw-skill`。
- 提交到 OpenClaw 官方市场（如有）。
- 在相关论坛/社区分享，获取反馈。

---

## ✅ 7. 优秀 Skill 的检查清单

- [ ] 名称简洁、描述精准
- [ ] `SKILL.md` 包含元数据和完整指令
- [ ] 指令结构化，步骤清晰
- [ ] 提供脚本处理复杂逻辑
- [ ] 包含错误处理和常见问题
- [ ] 有测试用例或测试数据
- [ ] 文档中说明了输入/输出格式
- [ ] 符合渐进式披露原则（不浪费 Token）
- [ ] 版本号和更新日志

---

## 🌟 示例：一个简单的“URL 摘要生成器” Skill

**SKILL.md**
```yaml
---
name: url-summarizer
description: 获取网页内容并生成摘要。输入一个URL，输出该页面的核心摘要（不超过200字）。
---
# URL 摘要生成器

## 步骤
1. 验证用户提供的 URL 格式是否正确。
2. 使用 `scripts/fetch_url.py` 获取网页正文。
3. 如果正文长度超过 5000 字，调用 `scripts/summarize.py` 进行摘要。
4. 返回摘要文本。

## 脚本说明
- `fetch_url.py`：参数 URL，输出正文（纯文本）。
- `summarize.py`：参数正文文本，输出摘要。

## 错误处理
- 如果 URL 无法访问，返回“无法访问该网址”。
- 如果正文提取失败，返回“无法提取网页内容”。
```

**scripts/fetch_url.py**
```python
#!/usr/bin/env python3
import sys, requests
from bs4 import BeautifulSoup

url = sys.argv[1]
resp = requests.get(url, timeout=10)
soup = BeautifulSoup(resp.text, 'html.parser')
text = soup.get_text(separator='\n', strip=True)
print(text)
```

---

编写优秀的 Skill 是一个迭代过程，多参考社区中的成功案例，并根据实际使用反馈持续优化。祝你创造出能高效辅助开发工作的 Skill！