## 主 Skill加子 Skill 的编写指南

主 Skill + 子 Skill 模式是构建复杂、可维护的自动化工作流的核心。它将一个大型任务拆分为多个独立的、可复用的子 Skill，由主 Skill 负责协调。下面我们从数据传递、标准格式、错误处理、目录结构、设计原则等角度详细说明，并给出一个典型示例。

---

## 一、数据传递格式

主 Skill 与子 Skill 之间需要交换数据，常用的传递方式有：

| 方式                                            | 适用场景                                | 优缺点                                   |
| ----------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| **标准输入/输出（stdin/stdout）**               | 轻量级数据（<1MB），子 Skill 是独立脚本 | 简单直接，但数据量大会受限               |
| **文件系统**                                    | 大型数据（如代码文件、报告）            | 可传递任意大小数据，需约定路径和清理策略 |
| **环境变量**                                    | 少量配置参数（API Key、路径）           | 不适合复杂结构                           |
| **框架消息传递（如 OpenClaw `sessions_send`）** | Skill 在同一框架内运行                  | 最优雅，支持双向通信，需框架支持         |

**推荐组合**：  
- 使用 **stdin/stdout** 传递控制指令和轻量级 JSON 数据。  
- 使用 **文件系统** 共享大型中间产物（如代码、报告）。  
- 利用 **环境变量** 传递全局配置（如项目根目录）。

---

## 二、标准数据格式

为了统一解析，**所有 Skill 间的交互数据都应采用 JSON 格式**，并包含必要的元数据字段。

### 2.1 请求格式（主 Skill → 子 Skill）
```json
{
  "request_id": "unique-123",               // 可选，用于跟踪
  "task": "analyze_code",                   // 子任务类型
  "params": {                                // 具体参数
    "file_path": "/src/main.py",
    "analysis_depth": "full"
  },
  "context": {                               // 上下文信息
    "project_root": "/path/to/project",
    "output_dir": "/tmp/skill_output"
  },
  "output_target": "file:///tmp/analysis.json"  // 可选，指定输出位置
}
```

### 2.2 响应格式（子 Skill → 主 Skill）
```json
{
  "request_id": "unique-123",
  "status": "success",                       // "success" 或 "error"
  "data": {                                   // 任务结果
    "summary": "Analyzed 10 files...",
    "issues": [...]
  },
  "error": null,                              // 错误信息（如果有）
  "progress": 100,                             // 可选，完成百分比
  "output_location": "file:///tmp/analysis.json" // 如果数据已写入文件
}
```

### 2.3 进度反馈
对于耗时任务，子 Skill 可定期向 stdout 输出进度 JSON（每行一个）：
```json
{"progress": 50, "message": "Analyzing file 5/10"}
```
主 Skill 可以捕获并实时反馈给用户。

---

## 三、错误处理与状态传递

- **错误码与信息**：每个子 Skill 必须返回明确的 `status` 和 `error` 字段，错误信息应包含可读的描述和可能的原因。
- **重试策略**：主 Skill 根据错误类型决定是否重试（例如网络超时可重试，语法错误则终止）。
- **部分成功**：如果子任务部分成功，可在 `data` 中返回成功部分，并在 `error` 中说明失败细节。
- **超时处理**：主 Skill 应设置合理的超时时间，超时后标记为失败并清理临时文件。
- **事务性**：对于需要原子性的操作，主 Skill 应在所有子 Skill 成功后统一提交（如写入最终文件），否则回滚。

---

## 四、具体示例：项目文档生成器

假设我们需要一个 Skill 来自动生成项目文档。流程如下：
1. **分析代码**：提取函数、类、注释。
2. **填充模板**：将分析结果填入 Markdown 模板。
3. **格式检查**：检查文档格式并修复问题。

我们将其拆分为一个主 Skill `doc-generator` 和三个子 Skill：
- `code-analyzer`
- `template-filler`
- `formatter`

### 4.1 目录结构
```
doc-generator/               # 主 Skill 目录
├── SKILL.md
├── scripts/
│   └── orchestrator.py      # 主 Skill 的协调脚本
├── references/               # 模板文件等
│   └── template.md
└── tests/                    # 测试数据

code-analyzer/               # 子 Skill 1
├── SKILL.md
├── scripts/
│   └── analyze.py
└── tests/

template-filler/             # 子 Skill 2
├── SKILL.md
├── scripts/
│   └── fill.py
└── tests/

formatter/                   # 子 Skill 3
├── SKILL.md
├── scripts/
│   └── format.py
└── tests/
```

### 4.2 子 Skill 实现示例（以 `code-analyzer` 为例）

**code-analyzer/SKILL.md**
```yaml
---
name: code-analyzer
description: 分析代码文件，提取函数、类、文档字符串等信息。输入项目路径，输出 JSON 格式的分析报告。
---

# 代码分析器

## 输入
通过 stdin 接收 JSON，格式：
```json
{
  "project_root": "/path",
  "file_patterns": ["**/*.py"]
}
```

## 输出
成功时输出 JSON 到 stdout：
```json
{
  "status": "success",
  "data": {
    "functions": [...],
    "classes": [...]
  }
}
```

## 脚本调用
```bash
python scripts/analyze.py
```
```

**code-analyzer/scripts/analyze.py**（简化示例）
```python
#!/usr/bin/env python3
import sys, json, os
from pathlib import Path

input_data = json.loads(sys.stdin.read())
project_root = input_data["project_root"]
# ... 分析代码逻辑 ...
result = {
    "status": "success",
    "data": {
        "functions": [{"name": "add", "doc": "..."}],
        "classes": []
    }
}
print(json.dumps(result))
```

### 4.3 主 Skill `doc-generator`

**doc-generator/SKILL.md**
```yaml
---
name: doc-generator
description: 自动生成项目文档。分析代码、填充模板、格式化输出。
---

# 项目文档生成器

## 工作流程
1. 调用子 Skill `code-analyzer` 获取代码分析结果。
2. 调用子 Skill `template-filler`，传入分析结果和模板，生成原始文档。
3. 调用子 Skill `formatter` 格式化文档。
4. 返回最终文档路径。

## 脚本
主流程由 `scripts/orchestrator.py` 执行。

## 错误处理
- 任何子 Skill 失败则终止流程，返回错误信息。
- 临时文件存放在 `context.output_dir`，流程结束后自动清理。
```

**doc-generator/scripts/orchestrator.py**（核心协调脚本）
```python
#!/usr/bin/env python3
import sys, json, subprocess, os
from pathlib import Path

def call_subskill(skill_path, input_json):
    proc = subprocess.run(
        [sys.executable, skill_path],
        input=json.dumps(input_json),
        capture_output=True,
        text=True
    )
    if proc.returncode != 0:
        raise Exception(f"Subskill failed: {proc.stderr}")
    return json.loads(proc.stdout)

def main():
    # 读取用户输入（从 stdin）
    user_input = json.loads(sys.stdin.read())
    project_root = user_input["project_root"]
    output_dir = Path("/tmp/doc_gen")  # 或从 context 获取
    output_dir.mkdir(exist_ok=True)

    # Step 1: 代码分析
    analyzer_input = {
        "project_root": project_root,
        "file_patterns": ["**/*.py"]
    }
    analyzer_result = call_subskill("../code-analyzer/scripts/analyze.py", analyzer_input)
    if analyzer_result["status"] != "success":
        print(json.dumps({"status": "error", "error": analyzer_result.get("error", "Unknown error")}))
        return

    # Step 2: 模板填充
    filler_input = {
        "analysis": analyzer_result["data"],
        "template_path": "../references/template.md",
        "output_path": str(output_dir / "draft.md")
    }
    filler_result = call_subskill("../template-filler/scripts/fill.py", filler_input)
    if filler_result["status"] != "success":
        print(json.dumps({"status": "error", "error": filler_result.get("error")}))
        return

    # Step 3: 格式化
    formatter_input = {
        "file_path": str(output_dir / "draft.md"),
        "output_path": str(output_dir / "final.md")
    }
    formatter_result = call_subskill("../formatter/scripts/format.py", formatter_input)
    if formatter_result["status"] != "success":
        print(json.dumps({"status": "error", "error": formatter_result.get("error")}))
        return

    # 返回最终文档路径
    print(json.dumps({
        "status": "success",
        "data": {
            "document_path": str(output_dir / "final.md")
        }
    }))

if __name__ == "__main__":
    main()
```

### 4.4 数据交互示例

**用户请求主 Skill**（通过 Telegram 或 CLI）：
```json
{
  "project_root": "/home/user/myproject"
}
```

**主 Skill 调用 `code-analyzer` 的输入**：
```json
{
  "project_root": "/home/user/myproject",
  "file_patterns": ["**/*.py"]
}
```

**`code-analyzer` 返回**：
```json
{
  "status": "success",
  "data": {
    "functions": [{"name": "add", "doc": "Adds two numbers"}],
    "classes": []
  }
}
```

**主 Skill 调用 `template-filler` 的输入**：
```json
{
  "analysis": {"functions": [...], "classes": []},
  "template_path": "/path/to/template.md",
  "output_path": "/tmp/doc_gen/draft.md"
}
```

以此类推。

---

## 五、数据结构设计的通用原则

1. **自描述**：字段名清晰，避免歧义。
2. **版本控制**：在 JSON 中包含 `version` 字段（如 `"version": "1.0"`），便于向后兼容。
3. **最小化**：只传递必要数据，减少传输开销。
4. **可扩展**：使用对象包裹参数，便于未来增加字段而不破坏旧版。
5. **安全性**：敏感信息（如密码）不应明文传递，可通过环境变量或加密通道。
6. **容错性**：主 Skill 应能处理子 Skill 返回的意外数据（如缺失字段），并给出友好错误。
7. **一致性**：所有 Skill 遵循相同的 JSON 结构（如统一使用 `status`/`data`/`error`）。

---

## 六、总结

主 Skill + 子 Skill 模式通过**标准化数据交换**、**清晰的错误处理**和**模块化目录结构**，实现了复杂任务的可维护构建。关键要点：

- 使用 JSON 作为统一数据格式，包含必要元数据。
- 通过 stdin/stdout + 文件系统传递数据，兼顾灵活性与性能。
- 子 Skill 独立测试，主 Skill 负责协调。
- 遵循设计原则，确保系统健壮可扩展。

上述示例展示了如何将一个文档生成任务拆分为三个独立 Skill，并通过主 Skill 编排。实际开发中，你可以根据任务复杂度灵活调整，但核心思想不变。