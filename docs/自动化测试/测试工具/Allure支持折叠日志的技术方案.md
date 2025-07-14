要在 Allure 报告中实现可折叠的树形日志结构，你需要扩展 Allure 的功能。以下是完整的实现方案，包含三种不同复杂度的解决方案：

### 方案一：使用 Allure 原生步骤 + HTML/CSS 定制（推荐）
这是最轻量级的解决方案，不需要修改 Allure 源码：

```python
import allure
from functools import wraps
import logging

# 自定义折叠日志装饰器
def foldable_log(level="INFO"):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            log_title = f"{func.__name__} [Logs]"
            with allure.step(log_title):
                # 创建折叠容器
                container_id = f"log-container-{id(func)}"
                allure.attach(
                    f"""
                    <div class="log-container" id="{container_id}">
                        <div class="log-header" 
                             onclick="toggleLogs('{container_id}')"
                             style="cursor:pointer; padding:5px; background:#f0f0f0;">
                            ▼ {level} Logs
                        </div>
                        <pre class="log-content" style="display:none; background:#f5f5f5; padding:10px;"></pre>
                    </div>
                    """,
                    name="log_container",
                    attachment_type=allure.attachment_type.HTML
                )
                
                # 重定向日志
                class LogInterceptor:
                    def __init__(self):
                        self.logs = []
                    
                    def write(self, message):
                        self.logs.append(message)
                    
                    def flush(self):
                        pass
                
                interceptor = LogInterceptor()
                logger = logging.getLogger(func.__module__)
                original_handlers = logger.handlers
                
                # 临时添加拦截器
                stream_handler = logging.StreamHandler(interceptor)
                stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
                logger.addHandler(stream_handler)
                
                try:
                    result = func(*args, **kwargs)
                finally:
                    # 恢复原始日志处理器
                    logger.removeHandler(stream_handler)
                    
                    # 附加日志内容
                    log_content = "\n".join(interceptor.logs)
                    allure.attach(
                        f"""
                        <script>
                            document.querySelector('#{container_id} .log-content').textContent = `{log_content}`;
                        </script>
                        """,
                        name="log_content",
                        attachment_type=allure.attachment_type.HTML
                    )
                
                return result
        return wrapper
    return decorator

# 全局添加切换函数
def add_toggle_script():
    allure.attach(
        """
        <script>
            function toggleLogs(containerId) {
                const container = document.getElementById(containerId);
                const content = container.querySelector('.log-content');
                const header = container.querySelector('.log-header');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    header.innerHTML = header.innerHTML.replace('►', '▼');
                } else {
                    content.style.display = 'none';
                    header.innerHTML = header.innerHTML.replace('▼', '►');
                }
            }
        </script>
        """,
        name="toggle_script",
        attachment_type=allure.attachment_type.HTML
    )

# 在pytest配置中添加
def pytest_sessionstart(session):
    add_toggle_script()
```

**使用示例：**
```python
@foldable_log(level="DEBUG")
def test_checkout_process():
    logging.info("Starting checkout process")
    # 测试步骤...
    logging.debug("Adding item to cart: 12345")
    # 更多操作...
    logging.warning("Low inventory warning for item 67890")
```

### 方案二：自定义 Allure 插件（中等复杂度）

需要创建自定义插件来增强 Allure 功能：

1. **创建插件项目结构：**
   ```
   allure-tree-logs/
   ├── src/
   │   ├── main/
   │   │   ├── java/
   │   │   │   └── com/
   │   │   │       └── custom/
   │   │   │           └── allure/
   │   │   │               ├── TreeLogAttachment.java
   │   │   │               └── TreeLogPlugin.java
   │   │   └── resources/
   │   │       └── allure/
   │   │           └── tree-logs/
   │   │               ├── index.js
   │   │               └── styles.css
   │   └── test/
   └── pom.xml
   ```

2. **Java 插件代码：**
```java
// TreeLogAttachment.java
package com.custom.allure;

import io.qameta.allure.model.Attachment;

public class TreeLogAttachment extends Attachment {
    private String logId;
    private String logContent;
    private String logLevel;

    // Getters and setters...
}

// TreeLogPlugin.java
package com.custom.allure;

import io.qameta.allure.Aggregator;
import io.qameta.allure.context.JacksonContext;
import io.qameta.allure.core.Configuration;
import io.qameta.allure.core.LaunchResults;
import io.qameta.allure.entity.Attachment;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

public class TreeLogPlugin implements Aggregator {
    
    @Override
    public void aggregate(Configuration configuration,
                         List<LaunchResults> launchesResults,
                         Path outputDirectory) throws IOException {
        
        JacksonContext jacksonContext = configuration.requireContext(JacksonContext.class);
        Path dataFolder = Files.createDirectories(outputDirectory.resolve("data"));
        
        launchesResults.forEach(launch -> {
            List<TreeLogAttachment> treeLogs = launch.getAllResults().stream()
                .flatMap(result -> result.getAttachments().stream())
                .filter(att -> "tree-log".equals(att.getType()))
                .map(this::convertToTreeLog)
                .collect(Collectors.toList());
            
            if (!treeLogs.isEmpty()) {
                Path dataFile = dataFolder.resolve("tree-logs.json");
                try (OutputStream os = Files.newOutputStream(dataFile)) {
                    jacksonContext.getValue().writeValue(os, treeLogs);
                }
            }
        });
    }
    
    private TreeLogAttachment convertToTreeLog(Attachment attachment) {
        TreeLogAttachment treeLog = new TreeLogAttachment();
        treeLog.setLogId(attachment.getName().hashCode() + "");
        treeLog.setLogContent(new String(Files.readAllBytes(attachment.getSource())));
        treeLog.setLogLevel(attachment.getType().split("-")[1]); // 从 tree-log-debug 提取 debug
        return treeLog;
    }
}
```

3. **前端资源：**
```javascript
// index.js
import {attach} from 'allure-js-commons';

export const treeLogs = (config) => {
  const plugin = {
    async onContentLoaded({data}) {
      const treeLogs = await data.readJSON('data/tree-logs.json');
      
      treeLogs.forEach(log => {
        attach(`
          <div class="tree-log-container">
            <div class="log-header" onclick="toggleLog('${log.logId}')">
              <span class="log-level ${log.logLevel}">${log.logLevel.toUpperCase()}</span>
              ▼ Logs
            </div>
            <pre id="log-${log.logId}" class="log-content">${log.logContent}</pre>
          </div>
        `, 'text/html');
      });
    }
  };
  
  return plugin;
};

// 添加到全局脚本
window.toggleLog = function(logId) {
  const content = document.getElementById(`log-${logId}`);
  const header = content.previousElementSibling;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    header.innerHTML = header.innerHTML.replace('►', '▼');
  } else {
    content.style.display = 'none';
    header.innerHTML = header.innerHTML.replace('▼', '►');
  }
};
```

4. **Python 集成：**
```python
# conftest.py
import allure

def attach_tree_log(content, level="info"):
    with allure.step("Attach tree log"):
        # 创建临时文件
        log_file = f"tree-log-{uuid.uuid4()}.log"
        with open(log_file, "w") as f:
            f.write(content)
        
        # 附加到报告
        allure.attach.file(
            source=log_file,
            name=f"Tree Log ({level})",
            attachment_type=allure.attachment_type.TEXT,
            extension=f"tree-log-{level}"
        )
```

### 方案三：完全自定义 Allure 报告（高级方案）

如果需要完全控制报告样式，可以创建自定义报告生成器：

1. **创建自定义报告生成器：**
```python
# custom_allure_reporter.py
from allure_pytest.listener import AllureListener
from allure_commons.model2 import TestResult, Attachment
import json
import os

class TreeLogAllureListener(AllureListener):
    def __init__(self, config):
        super().__init__(config)
        self.tree_logs = {}
    
    def pytest_runtest_logreport(self, report):
        super().pytest_runtest_logreport(report)
        
        if report.when == "call" and hasattr(report, "tree_logs"):
            test_case = self._get_test_case(report.nodeid)
            for log in report.tree_logs:
                # 创建树形日志附件
                attachment = Attachment(
                    name=log['name'],
                    source=self._save_log_content(log['content']),
                    type="tree-log"
                )
                test_case.attachments.append(attachment)
    
    def _save_log_content(self, content):
        log_path = os.path.join(self._report_dir, f"tree-log-{uuid.uuid4()}.log")
        with open(log_path, "w") as f:
            f.write(content)
        return log_path

# 在conftest.py中注册
def pytest_configure(config):
    config.pluginmanager.register(TreeLogAllureListener(config), "tree-log-listener")
```

2. **自定义报告模板：**
创建 `templates/log_tree.html`:
```html
{% macro log_tree(logs) %}
<div class="log-tree">
  {% for log in logs %}
    <div class="log-node">
      <div class="log-header" onclick="toggleLog('{{ log.id }}')">
        <span class="log-level {{ log.level }}">{{ log.level | upper }}</span>
        ▼ {{ log.name }}
      </div>
      <pre class="log-content" id="log-{{ log.id }}">{{ log.content }}</pre>
    </div>
  {% endfor %}
</div>

<style>
.log-tree {
  font-family: monospace;
  margin-left: 20px;
}

.log-node {
  margin: 5px 0;
}

.log-header {
  cursor: pointer;
  padding: 3px 5px;
  background-color: #f5f5f5;
  border-radius: 3px;
}

.log-content {
  display: none;
  margin: 5px 0 5px 20px;
  padding: 5px;
  background-color: #fafafa;
  border-left: 2px solid #ddd;
  white-space: pre-wrap;
}

.log-level.info { color: blue; }
.log-level.debug { color: green; }
.log-level.warning { color: orange; }
.log-level.error { color: red; }
</style>

<script>
function toggleLog(id) {
  const content = document.getElementById('log-' + id);
  const header = content.previousElementSibling;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    header.innerHTML = header.innerHTML.replace('►', '▼');
  } else {
    content.style.display = 'none';
    header.innerHTML = header.innerHTML.replace('▼', '►');
  }
}
</script>
{% endmacro %}
```

3. **在报告生成器中集成：**
```python
# custom_report_generator.py
from allure_pytest.report import AllureReport
from jinja2 import Environment, FileSystemLoader

class TreeLogAllureReport(AllureReport):
    def _render_test_case(self, test_case):
        # 收集树形日志
        tree_logs = [
            {
                "id": f"log-{idx}",
                "name": att.name,
                "content": self._read_attachment(att),
                "level": att.type.split('-')[-1] if '-' in att.type else "info"
            }
            for idx, att in enumerate(test_case.attachments)
            if att.type.startswith("tree-log")
        ]
        
        # 使用自定义模板渲染
        env = Environment(loader=FileSystemLoader('templates'))
        template = env.get_template('test_case.html')
        return template.render(
            test_case=test_case,
            tree_logs=tree_logs,
            log_tree_macro=env.get_template('log_tree.html').module.log_tree
        )
    
    def _read_attachment(self, attachment):
        with open(os.path.join(self.report_dir, attachment.source), "r") as f:
            return f.read()
```

### 最佳实践建议

1. **日志结构优化：**
```python
def log_tree():
    root = {
        "message": "Test Execution",
        "level": "INFO",
        "timestamp": datetime.now(),
        "children": []
    }
    
    def add_entry(parent, message, level="INFO"):
        entry = {
            "message": message,
            "level": level,
            "timestamp": datetime.now(),
            "children": []
        }
        parent["children"].append(entry)
        return entry
    
    return root, add_entry

# 使用示例
def test_example():
    root, add = log_tree()
    
    login_node = add(root, "Login Process")
    add(login_node, "Entering username", "DEBUG")
    add(login_node, "Entering password", "DEBUG")
    
    checkout_node = add(root, "Checkout Process")
    add(checkout_node, "Adding item to cart", "INFO")
    
    # 转换为JSON用于报告
    log_json = json.dumps(root, default=str)
    attach_tree_log(log_json, level="tree")
```

2. **性能优化技巧：**
- 使用增量渲染，只加载可见部分的日志
- 实现日志搜索和过滤功能
- 添加自动折叠深度超过N层的节点
- 实现日志级别过滤（只显示ERROR/WARNING）

3. **与现有工具集成：**
```python
# 集成logging模块
class TreeLogHandler(logging.Handler):
    def __init__(self, tree_root):
        super().__init__()
        self.tree_root = tree_root
    
    def emit(self, record):
        entry = {
            "message": self.format(record),
            "level": record.levelname.lower(),
            "timestamp": record.created
        }
        self.tree_root["children"].append(entry)

# 在测试中配置
def test_with_logging():
    root, add = log_tree()
    handler = TreeLogHandler(root)
    logger = logging.getLogger()
    logger.addHandler(handler)
    
    # 测试代码...
    logger.info("Test started")
```

### 部署选项

1. **Docker 容器化部署：**
```Dockerfile
FROM python:3.9-slim

# 安装依赖
RUN pip install pytest allure-pytest

# 复制自定义报告插件
COPY custom_allure /app/custom_allure
ENV PYTHONPATH=/app

# 复制测试代码
COPY tests /app/tests

# 设置入口点
CMD ["pytest", "/app/tests", "--alluredir=/app/allure-results"]
```

2. **CI/CD 集成示例（GitLab CI）：**
```yaml
stages:
  - test
  - report

allure-test:
  stage: test
  image: your-custom-allure-image
  script:
    - pytest --alluredir=allure-results
  artifacts:
    paths:
      - allure-results/

generate-report:
  stage: report
  image: your-custom-allure-image
  script:
    - allure generate allure-results -o allure-report
    - cp -r /app/custom_allure/templates allure-report/
  artifacts:
    paths:
      - allure-report/
    expire_in: 1 week
```

### 最终效果
实现后，你的 Allure 报告将包含：
1. 可折叠的树形日志结构
2. 按日志级别着色的条目
3. 时间戳和层级关系
4. 搜索和过滤功能
5. 自动折叠/展开控制

选择方案取决于你的具体需求和技术能力：
- **快速实现**：方案一（HTML/CSS定制）
- **可重用插件**：方案二（自定义Allure插件）
- **完全控制**：方案三（自定义报告生成器）

对于大多数团队，方案一提供了最佳的成本效益比，能在几小时内实现可折叠日志功能。