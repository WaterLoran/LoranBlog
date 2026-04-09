# 使用 Rewoo 框架构建 AI 代理的示例

下面我将提供一个完整的示例，展示如何使用 Rewoo 框架构建一个能够分解和执行复杂任务的 AI 代理。这个示例将创建一个能够研究特定主题并生成详细报告的代理。

## 示例：研究代理

```python
import os
from rewoo import Agent, Planner, Worker, Solver
from rewoo.tools import BingSearch, PythonExecutor, DocumentWriter

# 设置API密钥（实际使用时需要替换为真实的API密钥）
os.environ["OPENAI_API_KEY"] = "your-openai-api-key"
os.environ["BING_SUBSCRIPTION_KEY"] = "your-bing-api-key"

# 定义工具
search_tool = BingSearch(subscription_key=os.environ["BING_SUBSCRIPTION_KEY"])
python_tool = PythonExecutor()
document_tool = DocumentWriter()

# 创建Rewoo代理组件
planner = Planner(model="gpt-4")  # 规划器使用GPT-4
worker = Worker(tools=[search_tool, python_tool, document_tool])  # 工作器配备多种工具
solver = Solver(model="gpt-4")  # 解决器使用GPT-4

# 创建代理
research_agent = Agent(planner=planner, worker=worker, solver=solver)

# 定义一个复杂研究任务
task = """
请研究以下主题并提供详细报告：
1. 人工智能在医疗诊断中的最新应用
2. 这些应用的主要优势与局限性
3. 未来五年可能的发展趋势

报告需要包含具体案例和数据支持，并以结构化的Markdown格式呈现。
"""

# 执行任务
try:
    result = research_agent.run(task)
    print("研究结果:")
    print(result)
except Exception as e:
    print(f"执行过程中出错: {e}")
```

## 代码解析

### 1. 组件介绍

- **Planner (规划器)**: 分析复杂任务并将其分解为可执行的步骤
- **Worker (工作器)**: 使用可用工具执行规划中的每个步骤
- **Solver (解决器)**: 整合所有步骤的结果，生成最终答案
- **Tools (工具)**:
  - `BingSearch`: 进行网络搜索获取最新信息
  - `PythonExecutor`: 执行Python代码进行数据分析
  - `DocumentWriter`: 生成格式化的文档

### 2. 执行流程

当运行上述代码时，Rewoo 代理会按照以下流程工作：

1. **规划阶段**: Planner 分析任务并创建执行计划：
   ```
   1. 使用BingSearch搜索"人工智能在医疗诊断中的最新应用"
   2. 使用BingSearch搜索"AI医疗诊断的优势与局限性"
   3. 使用BingSearch搜索"AI医疗诊断未来五年发展趋势"
   4. 使用PythonExecutor分析收集到的数据
   5. 使用DocumentWriter生成结构化Markdown报告
   ```

2. **执行阶段**: Worker 按照计划逐步执行：
   - 执行网络搜索获取相关信息
   - 使用Python进行必要的数据处理和分析
   - 收集和整理所有结果

3. **解决阶段**: Solver 整合所有中间结果：
   - 合成一个连贯、结构化的报告
   - 确保报告包含所有要求的元素
   - 以Markdown格式输出最终结果

## 更简单的示例：数学计算代理

如果您想先从一个更简单的例子开始，这里是一个专注于数学计算的代理：

```python
from rewoo import Agent, Planner, Worker, Solver
from rewoo.tools import PythonExecutor

# 创建数学计算代理
planner = Planner(model="gpt-3.5-turbo")
worker = Worker(tools=[PythonExecutor()])
solver = Solver(model="gpt-3.5-turbo")

math_agent = Agent(planner=planner, worker=worker, solver=solver)

# 定义一个复杂数学问题
math_problem = """
请解决以下问题：
1. 计算 2^10 的值
2. 找出 100 以内的所有质数
3. 计算圆的面积，半径为 5.5 单位
4. 将结果整理成一份报告
"""

result = math_agent.run(math_problem)
print(result)
```

## 如何在 Dify 中集成 Rewoo 代理

要将上述 Rewoo 代理集成到 Dify 中，您可以将其部署为单独的 API 服务，然后在 Dify 工作流中使用 "HTTP 请求" 节点调用它：

1. **部署 Rewoo 代理为 API** (使用 Flask/FastAPI):
```python
from flask import Flask, request, jsonify
from rewoo import Agent, Planner, Worker, Solver
from rewoo.tools import BingSearch, PythonExecutor, DocumentWriter

app = Flask(__name__)

# 初始化Rewoo代理
planner = Planner(model="gpt-4")
worker = Worker(tools=[BingSearch(subscription_key="your-bing-key"), PythonExecutor(), DocumentWriter()])
solver = Solver(model="gpt-4")
agent = Agent(planner=planner, worker=worker, solver=solver)

@app.route('/research', methods=['POST'])
def research_api():
    data = request.json
    task = data.get('task')
    result = agent.run(task)
    return jsonify({"result": result})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

2. **在 Dify 中调用**:
   - 在 Dify 工作流中添加 "HTTP 请求" 节点
   - 配置节点调用 `http://your-server:5000/research`
   - 将用户查询作为 JSON 负载发送: `{"task": "用户查询"}`

## 安装和设置

要运行上述示例，您需要先安装 Rewoo：

```bash
pip install rewoo
```

还需要设置必要的 API 密钥：
- OpenAI API 密钥
- Bing 搜索 API 密钥（如果使用搜索功能）

这个示例展示了 Rewoo 框架的核心价值：将复杂任务分解为可管理的步骤，并使用适当的工具执行每个步骤，最后合成高质量的结果。这种模式特别适合需要多步骤推理和工具使用的复杂任务。