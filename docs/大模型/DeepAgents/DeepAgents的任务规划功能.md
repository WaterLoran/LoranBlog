# DeepAgents的任务规划功能

## 📝 核心代码示例

```python
# 导入必要的库
from typing import List, Optional, Dict, Any
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from pydantic import BaseModel, Field
import asyncio

# 1. 定义待办事项数据结构模型
class TodoItem(BaseModel):
    """表示一个待办事项项"""
    id: int = Field(description="任务的唯一ID")
    description: str = Field(description="任务的具体描述")
    status: str = Field(description="任务状态: TODO, IN_PROGRESS, DONE, BLOCKED")
    dependencies: List[int] = Field(default_factory=list, description="依赖的任务ID列表")

class TodoList(BaseModel):
    """表示整个待办事项列表"""
    tasks: List[TodoItem] = Field(description="所有待办事项的列表")
    current_task_id: Optional[int] = Field(default=None, description="当前正在执行的任务ID")

# 2. 定义核心规划工具
@tool
def write_todos(instructions: str) -> str:
    """
    将复杂指令分解为结构化的待办事项列表。
    当用户给出复杂或多项任务时使用此工具。
    """
    # 实际实现中，这里会调用LLM进行分析和分解
    # 简化示例：假设我们根据关键字分解
    if "研究报告" in instructions:
        todos = TodoList(tasks=[
            TodoItem(id=1, description="确定研究主题和范围", status="TODO"),
            TodoItem(id=2, description="收集相关文献资料", status="TODO", dependencies=[1]),
            TodoItem(id=3, description="分析数据并制作图表", status="TODO", dependencies=[2]),
            TodoItem(id=4, description="撰写报告草稿", status="TODO", dependencies=[3]),
            TodoItem(id=5, description="校对和格式调整", status="TODO", dependencies=[4])
        ])
    else:
        # 通用分解逻辑
        import re
        steps = re.split(r'[,，]|然后|接着|下一步', instructions)
        todos = TodoList(tasks=[
            TodoItem(id=i+1, description=step.strip(), status="TODO")
            for i, step in enumerate(steps) if step.strip()
        ])
    
    # 将待办列表存储到智能体的记忆中（实际可能存到文件系统）
    return f"已创建待办事项列表，共{len(todos.tasks)}个任务。使用read_todos查看详情。"

@tool
def read_todos() -> Dict[str, Any]:
    """
    读取当前的待办事项列表和进度。
    在开始新任务或检查进度时使用。
    """
    # 实际实现中，这会从智能体的状态或文件中读取
    # 这里返回一个示例数据
    return {
        "tasks": [
            {"id": 1, "description": "确定研究主题和范围", "status": "DONE"},
            {"id": 2, "description": "收集相关文献资料", "status": "IN_PROGRESS"},
            {"id": 3, "description": "分析数据并制作图表", "status": "TODO"},
            {"id": 4, "description": "撰写报告草稿", "status": "TODO"},
            {"id": 5, "description": "校对和格式调整", "status": "TODO"}
        ],
        "progress": "2/5 (40%)",
        "next_task": "继续任务2：收集相关文献资料"
    }

@tool
def update_todo_status(task_id: int, status: str, notes: Optional[str] = None) -> str:
    """
    更新特定任务的状态。
    """
    status_options = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]
    if status not in status_options:
        return f"状态必须是: {', '.join(status_options)}"
    
    return f"任务{task_id}状态已更新为{status}。备注：{notes if notes else '无'}"

# 3. 创建智能体并设置系统提示词
def create_planning_agent():
    """创建一个具有规划能力的智能体"""
    
    # 系统提示词 - 这是规划功能的核心
    system_prompt = """你是一个擅长任务规划和管理的AI助手。请按照以下工作流程处理用户请求：

    工作流程：
    1. 当收到复杂或多步骤请求时，首先使用write_todos工具将请求分解为结构化的待办事项列表
    2. 使用read_todos查看当前的任务列表和进度
    3. 专注于当前最优先的任务（通常是第一个TODO状态的任务）
    4. 完成一个任务后，使用update_todo_status将其标记为DONE
    5. 继续下一个任务，直到所有任务完成

    规划原则：
    - 每个任务应该是具体、可执行的
    - 识别任务之间的依赖关系
    - 定期检查进度，必要时调整计划
    - 如果任务被阻塞，标记为BLOCKED并说明原因
    
    现在开始处理用户请求。"""
    
    # 创建LLM实例
    llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    # 准备工具列表
    tools = [write_todos, read_todos, update_todo_status]
    
    # 创建提示词模板
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}")
    ])
    
    # 创建智能体
    agent = create_openai_tools_agent(llm, tools, prompt)
    
    # 创建执行器
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=10
    )
    
    return agent_executor

# 4. 使用示例
async def run_planning_example():
    """运行规划功能示例"""
    print("=== 创建具有规划能力的智能体 ===")
    agent = create_planning_agent()
    
    # 示例1: 处理复杂任务
    print("\n=== 示例1: 分解复杂任务 ===")
    complex_task = "我需要完成一个关于气候变化的研究报告，包括资料收集、数据分析和报告撰写"
    
    result = await agent.ainvoke({
        "input": complex_task,
        # 可以携带历史状态
        "intermediate_steps": []
    })
    
    print(f"智能体回复: {result['output']}")
    
    # 示例2: 检查进度并执行
    print("\n=== 示例2: 检查任务进度 ===")
    result = await agent.ainvoke({
        "input": "我现在应该做什么？告诉我当前进度和下一个任务",
        "intermediate_steps": result.get("intermediate_steps", [])
    })
    
    print(f"智能体回复: {result['output']}")
    
    # 示例3: 更新任务状态
    print("\n=== 示例3: 更新任务完成状态 ===")
    result = await agent.ainvoke({
        "input": "我已经完成了确定研究范围的任务，可以标记为完成了",
        "intermediate_steps": result.get("intermediate_steps", [])
    })
    
    print(f"智能体回复: {result['output']}")

# 5. 高级功能：带状态管理的完整规划循环
class PlanningAgent:
    """带有状态管理的规划智能体"""
    
    def __init__(self):
        self.agent_executor = create_planning_agent()
        self.todo_list = TodoList(tasks=[])
        
    async def process_request(self, user_input: str):
        """处理用户请求的完整规划循环"""
        
        print(f"\n用户请求: {user_input}")
        
        # 步骤1: 如果是新任务或复杂任务，先创建规划
        if self._needs_planning(user_input):
            print("检测到需要规划，创建待办事项列表...")
            result = await self.agent_executor.ainvoke({
                "input": f"请为以下任务创建详细的待办事项列表: {user_input}"
            })
            print(f"规划结果: {result['output']}")
        
        # 步骤2: 获取当前任务列表
        print("获取当前任务进度...")
        result = await self.agent_executor.ainvoke({
            "input": "显示当前待办事项列表和下一个要做的任务"
        })
        
        # 步骤3: 执行具体任务
        print("执行具体任务...")
        # 这里会根据任务类型调用不同的工具
        # 例如：如果是"搜索资料"，会调用搜索工具
        
        return result['output']
    
    def _needs_planning(self, user_input: str) -> bool:
        """判断是否需要创建新规划"""
        planning_keywords = ["完成", "制作", "撰写", "分析", "研究", "项目", "计划"]
        return any(keyword in user_input for keyword in planning_keywords)

# 运行示例
if __name__ == "__main__":
    print("DeepAgents 任务规划功能演示")
    print("=" * 50)
    
    # 运行基础示例
    asyncio.run(run_planning_example())
    
    # 创建带状态的智能体
    print("\n" + "=" * 50)
    print("高级示例：带状态管理的规划智能体")
    
    planner = PlanningAgent()
    
    # 模拟交互
    sample_requests = [
        "帮我策划一个市场推广活动",
        "我现在做到哪一步了？",
        "第一个任务完成了，接下来做什么？"
    ]
    
    async def run_advanced_example():
        for request in sample_requests:
            response = await planner.process_request(request)
            print(f"智能体响应: {response}\n")
    
    asyncio.run(run_advanced_example())
```

## 🔍 详细功能解释

### 1. **任务分解机制 (`write_todos`)**
- **智能解析**：当接收到复杂指令时，智能体首先调用`write_todos`工具，利用LLM的自然语言理解能力将模糊需求分解为具体步骤
- **依赖识别**：自动识别任务间的依赖关系（如必须完成A才能开始B），构建有向无环图
- **原子化处理**：确保每个子任务都是具体、可执行、可验证的

### 2. **状态跟踪系统 (`read_todos`/`update_todo_status`)**
- **实时状态管理**：维护每个任务的四态模型（TODO → IN_PROGRESS → DONE/BLOCKED）
- **进度可视化**：提供清晰的进度百分比和下一步行动建议
- **阻塞处理**：当任务无法继续进行时，可标记为BLOCKED并记录原因

### 3. **执行循环控制**
```python
# 简化的规划-执行循环伪代码
def planning_execution_cycle(user_request):
    # 1. 规划阶段
    if is_complex_task(user_request):
        todo_list = write_todos(user_request)  # 创建规划
    
    # 2. 执行阶段
    while has_pending_tasks(todo_list):
        current_task = get_next_task(todo_list)  # 获取优先级最高的TODO任务
        result = execute_task(current_task)      # 执行具体任务
        
        if result.success:
            update_todo_status(current_task.id, "DONE")
        elif result.blocked:
            update_todo_status(current_task.id, "BLOCKED", result.reason)
            # 可能需要重新规划或人工干预
    
    # 3. 完成与总结
    return compile_final_results()
```

### 4. **内存与上下文管理**
- **列表持久化**：待办事项列表通常存储在智能体的工作内存或外部文件中
- **智能上下文切换**：当处理长任务时，DeepAgents会自动将已完成任务的细节移出上下文，聚焦当前任务
- **断点续传**：任务状态持久化，即使会话中断也能从上次进度继续

### 5. **实际应用场景示例**
```python
# 场景：自动化研究报告生成
research_plan = """
1. 使用write_todos创建研究计划
   - 任务1: 定义研究问题和假设
   - 任务2: 收集学术文献 (依赖: 任务1)
   - 任务3: 分析数据趋势 (依赖: 任务2)
   - 任务4: 撰写方法论部分 (依赖: 任务1)
   - 任务5: 完成全文撰写 (依赖: 任务3,4)

2. 智能体按规划执行：
   - 调用搜索工具完成"收集学术文献"
   - 调用数据分析工具完成"分析数据趋势"
   - 调用文档生成工具撰写报告

3. 自动状态更新和进度跟踪
"""
```

## 🎯 核心优势总结

| 优势           | 说明                         | 实际价值                     |
| -------------- | ---------------------------- | ---------------------------- |
| **结构化执行** | 将模糊需求转为清晰步骤       | 减少AI的随机探索，提高成功率 |
| **状态可追踪** | 实时知道进展到哪一步         | 便于调试和人机协作           |
| **容错性强**   | 单个任务失败不影响整体       | 支持断点续传和重试机制       |
| **资源优化**   | 只在上下文中保留当前任务信息 | 节省Token，处理更长任务      |
| **可解释性高** | 每个决策都有明确的任务对应   | 理解AI的"思考过程"           |

## 💡 进阶使用建议

1. **自定义任务模板**：为常见任务类型（如市场分析、代码审查）创建预定义模板
2. **集成外部工具**：将`write_todos`的输出连接到项目管理工具（Jira、Trello）
3. **多智能体协作**：不同专长的子智能体负责不同类型的任务
4. **动态重新规划**：当遇到阻塞时，自动重新评估并调整任务计划

这种规划功能特别适合需要**多步骤、长时间运行、可中断恢复**的任务场景。如果你有具体的应用场景（如自动化数据分析、内容创作流水线等），我可以提供更针对性的实现方案。