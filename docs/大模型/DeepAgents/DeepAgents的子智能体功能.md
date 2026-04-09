# DeepAgents的子智能体功能

## 📝 完整代码示例

```python
"""
DeepAgents 子智能体系统完整实现
演示主智能体如何将任务委托给专业子智能体协同工作
"""
import asyncio
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import json

# ========== 基础数据结构 ==========
class TaskStatus(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskPriority(Enum):
    HIGH = 3
    MEDIUM = 2
    LOW = 1

@dataclass
class Task:
    """任务数据类"""
    id: str
    description: str
    agent_type: str  # 需要哪种类型的子智能体
    priority: TaskPriority
    dependencies: List[str]  # 依赖的任务ID
    status: TaskStatus = TaskStatus.PENDING
    assigned_to: Optional[str] = None
    result: Optional[Any] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

@dataclass
class AgentCapability:
    """智能体能力描述"""
    agent_type: str
    description: str
    required_tools: List[str]
    max_concurrent_tasks: int = 3

# ========== 消息通信协议 ==========
class Message:
    """智能体间通信的消息协议"""
    
    def __init__(self, 
                 msg_type: str,
                 sender: str,
                 receiver: str,
                 content: Dict[str, Any],
                 task_id: Optional[str] = None):
        self.msg_type = msg_type  # task_assign, task_result, query, response
        self.sender = sender
        self.receiver = receiver
        self.content = content
        self.task_id = task_id
        self.timestamp = datetime.now()
        self.message_id = f"msg_{hash(str(self))}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "message_id": self.message_id,
            "type": self.msg_type,
            "sender": self.sender,
            "receiver": self.receiver,
            "content": self.content,
            "task_id": self.task_id,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        msg = cls(
            msg_type=data['type'],
            sender=data['sender'],
            receiver=data['receiver'],
            content=data['content'],
            task_id=data.get('task_id')
        )
        msg.message_id = data['message_id']
        msg.timestamp = datetime.fromisoformat(data['timestamp'])
        return msg

# ========== 消息总线（通信中枢） ==========
class MessageBus:
    """智能体间的通信总线，处理所有消息路由"""
    
    def __init__(self):
        self.agents = {}  # agent_id -> agent_instance
        self.message_queue = asyncio.Queue()
        self.message_history = []
    
    def register_agent(self, agent_id: str, agent_instance: Any):
        """注册智能体到消息总线"""
        self.agents[agent_id] = agent_instance
        print(f"[MessageBus] 注册智能体: {agent_id}")
    
    async def send_message(self, message: Message):
        """发送消息到接收方"""
        self.message_history.append(message.to_dict())
        
        if message.receiver in self.agents:
            receiver = self.agents[message.receiver]
            await receiver.receive_message(message)
            print(f"[MessageBus] {message.sender} → {message.receiver}: {message.msg_type}")
        else:
            print(f"[MessageBus] 警告: 接收方 {message.receiver} 未注册")
    
    async def broadcast(self, message: Message, exclude_sender: bool = True):
        """广播消息给所有智能体（除了发送方）"""
        for agent_id, agent in self.agents.items():
            if exclude_sender and agent_id == message.sender:
                continue
            await self.send_message(Message(
                msg_type=message.msg_type,
                sender=message.sender,
                receiver=agent_id,
                content=message.content,
                task_id=message.task_id
            ))
    
    def get_agent_status(self) -> Dict[str, Any]:
        """获取所有智能体状态"""
        status = {}
        for agent_id, agent in self.agents.items():
            if hasattr(agent, 'get_status'):
                status[agent_id] = agent.get_status()
        return status

# ========== 基础智能体类 ==========
class BaseAgent:
    """所有智能体的基类"""
    
    def __init__(self, 
                 agent_id: str,
                 agent_type: str,
                 message_bus: MessageBus,
                 capabilities: AgentCapability):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.message_bus = message_bus
        self.capabilities = capabilities
        self.current_tasks = {}  # task_id -> Task
        self.task_history = []
        
        # 注册到消息总线
        self.message_bus.register_agent(self.agent_id, self)
    
    async def receive_message(self, message: Message):
        """接收消息的抽象方法"""
        raise NotImplementedError
    
    async def execute_task(self, task: Task) -> Any:
        """执行任务的抽象方法"""
        raise NotImplementedError
    
    def get_status(self) -> Dict[str, Any]:
        """获取智能体状态"""
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "current_tasks": len(self.current_tasks),
            "capabilities": self.capabilities.description,
            "available_slots": (
                self.capabilities.max_concurrent_tasks - len(self.current_tasks)
            )
        }

# ========== 具体的子智能体实现 ==========
class ResearchAgent(BaseAgent):
    """研究型子智能体：专门处理信息收集和研究任务"""
    
    def __init__(self, agent_id: str, message_bus: MessageBus):
        capabilities = AgentCapability(
            agent_type="research",
            description="擅长信息收集、文献调研、数据整理",
            required_tools=["web_search", "document_analysis", "data_extraction"]
        )
        super().__init__(agent_id, "research", message_bus, capabilities)
        
        # 研究专用的工具集
        self.research_tools = {
            "web_search": self.web_search,
            "summarize_document": self.summarize_document,
            "extract_key_points": self.extract_key_points
        }
    
    async def receive_message(self, message: Message):
        """处理接收到的消息"""
        if message.msg_type == "task_assign":
            await self.handle_task_assignment(message)
        elif message.msg_type == "query":
            await self.handle_query(message)
    
    async def handle_task_assignment(self, message: Message):
        """处理任务分配"""
        task_data = message.content.get("task")
        task = Task(**task_data)
        
        # 更新任务状态
        task.status = TaskStatus.IN_PROGRESS
        task.assigned_to = self.agent_id
        self.current_tasks[task.id] = task
        
        print(f"[{self.agent_id}] 开始执行任务: {task.description}")
        
        # 执行任务
        try:
            result = await self.execute_task(task)
            task.status = TaskStatus.COMPLETED
            task.result = result
            
            # 发送结果回主智能体
            result_message = Message(
                msg_type="task_result",
                sender=self.agent_id,
                receiver=message.sender,  # 回给发送者（通常是主智能体）
                content={
                    "task_id": task.id,
                    "status": "completed",
                    "result": result,
                    "summary": f"研究任务完成，找到{len(result.get('sources', []))}个相关来源"
                },
                task_id=task.id
            )
            await self.message_bus.send_message(result_message)
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.result = {"error": str(e)}
            
            error_message = Message(
                msg_type="task_result",
                sender=self.agent_id,
                receiver=message.sender,
                content={
                    "task_id": task.id,
                    "status": "failed",
                    "error": str(e)
                },
                task_id=task.id
            )
            await self.message_bus.send_message(error_message)
        
        # 清理已完成的任务
        self.task_history.append(task)
        del self.current_tasks[task.id]
    
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """执行研究任务"""
        # 模拟研究过程
        await asyncio.sleep(1)  # 模拟耗时操作
        
        # 基于任务描述选择不同的研究方法
        if "分析" in task.description or "研究" in task.description:
            sources = await self.web_search(task.description)
            key_points = await self.extract_key_points(sources)
            summary = await self.summarize_document(key_points)
            
            return {
                "sources": sources[:3],  # 只返回前3个来源
                "key_points": key_points,
                "summary": summary,
                "recommendations": ["进一步收集数据", "对比多个来源", "验证信息准确性"]
            }
        
        return {"message": f"完成研究任务: {task.description}"}
    
    async def web_search(self, query: str) -> List[Dict[str, str]]:
        """模拟网络搜索"""
        # 实际实现会调用真正的搜索API
        return [
            {"title": f"关于{query}的研究论文", "url": "http://example.com/paper1", "relevance": 0.95},
            {"title": f"{query}的最新数据", "url": "http://example.com/data", "relevance": 0.88},
            {"title": f"{query}的专家分析", "url": "http://example.com/analysis", "relevance": 0.92}
        ]
    
    async def summarize_document(self, content: Any) -> str:
        """文档摘要"""
        return f"摘要：{str(content)[:100]}..."
    
    async def extract_key_points(self, sources: List[Dict]) -> List[str]:
        """提取关键点"""
        return [f"关键点{i}: {source['title']}" for i, source in enumerate(sources[:2], 1)]

class WritingAgent(BaseAgent):
    """写作型子智能体：专门处理内容创作和报告撰写"""
    
    def __init__(self, agent_id: str, message_bus: MessageBus):
        capabilities = AgentCapability(
            agent_type="writing",
            description="擅长内容创作、报告撰写、文档整理",
            required_tools=["text_generation", "formatting", "proofreading"]
        )
        super().__init__(agent_id, "writing", message_bus, capabilities)
    
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """执行写作任务"""
        await asyncio.sleep(0.8)  # 模拟写作时间
        
        # 基于输入生成内容
        if task.result and "research_data" in task.result:
            # 如果有研究数据，基于数据写作
            research = task.result["research_data"]
            content = self.write_based_on_research(research)
        else:
            # 否则生成通用内容
            content = self.generate_content(task.description)
        
        return {
            "content": content,
            "word_count": len(content.split()),
            "structure": ["引言", "主体", "结论"],
            "format": "markdown"
        }
    
    def write_based_on_research(self, research_data: Dict) -> str:
        """基于研究数据写作"""
        return f"""# 研究报告

## 摘要
基于收集的研究资料，本文分析...

## 主要发现
{research_data.get('summary', '暂无摘要')}

## 详细分析
此处展开详细讨论...

## 结论
基于以上分析，得出以下结论...
"""
    
    def generate_content(self, topic: str) -> str:
        """生成内容"""
        return f"""关于「{topic}」的文档

### 概述
{topic}是一个重要的话题...

### 主要内容
此处详细讨论{topic}的各个方面...

### 总结
综上所述，{topic}具有重要价值...
"""

class AnalysisAgent(BaseAgent):
    """分析型子智能体：专门处理数据分析和模式识别"""
    
    def __init__(self, agent_id: str, message_bus: MessageBus):
        capabilities = AgentCapability(
            agent_type="analysis",
            description="擅长数据分析、模式识别、统计建模",
            required_tools=["data_processing", "statistical_analysis", "visualization"]
        )
        super().__init__(agent_id, "analysis", message_bus, capabilities)
    
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """执行分析任务"""
        await asyncio.sleep(1.2)  # 模拟分析时间
        
        return {
            "analysis_type": "statistical",
            "insights": [
                f"发现与'{task.description}'相关的模式",
                "数据呈正态分布",
                "相关性系数为0.85"
            ],
            "recommendations": ["进一步验证假设", "扩大样本规模"],
            "charts": ["histogram.png", "correlation_matrix.png"]
        }

# ========== 主智能体（协调者） ==========
class MasterAgent(BaseAgent):
    """主智能体：负责任务分解、分配和协调"""
    
    def __init__(self, 
                 agent_id: str, 
                 message_bus: MessageBus,
                 sub_agents: List[BaseAgent]):
        capabilities = AgentCapability(
            agent_type="master",
            description="任务协调者，负责任务分解和分配",
            required_tools=["task_decomposition", "agent_coordination", "result_integration"]
        )
        super().__init__(agent_id, "master", message_bus, capabilities)
        
        self.sub_agents = {agent.agent_id: agent for agent in sub_agents}
        self.task_registry = {}  # 任务注册表
        self.task_counter = 0
    
    async def receive_message(self, message: Message):
        """主智能体接收消息"""
        if message.msg_type == "new_task":
            await self.handle_new_task(message)
        elif message.msg_type == "task_result":
            await self.handle_task_result(message)
    
    async def handle_new_task(self, message: Message):
        """处理新任务请求"""
        task_description = message.content.get("description", "")
        user_id = message.content.get("user_id", "unknown")
        
        print(f"[{self.agent_id}] 收到新任务: {task_description}")
        
        # 步骤1: 任务分解
        subtasks = await self.decompose_task(task_description)
        
        # 步骤2: 创建任务对象
        tasks = []
        for i, subtask in enumerate(subtasks):
            task_id = f"task_{user_id}_{self.task_counter}_{i}"
            task = Task(
                id=task_id,
                description=subtask["description"],
                agent_type=subtask["agent_type"],
                priority=TaskPriority.MEDIUM,
                dependencies=subtask.get("dependencies", []),
                created_at=datetime.now()
            )
            self.task_registry[task_id] = task
            tasks.append(task)
        
        self.task_counter += 1
        
        # 步骤3: 任务分配
        for task in tasks:
            await self.assign_task(task)
    
    async def decompose_task(self, task_description: str) -> List[Dict[str, Any]]:
        """智能任务分解"""
        # 实际实现中，这里会用LLM分析任务并分解
        # 这里简化为基于关键词的分解
        
        subtasks = []
        
        if "研究报告" in task_description:
            subtasks = [
                {
                    "description": "收集相关研究资料和文献",
                    "agent_type": "research",
                    "dependencies": []
                },
                {
                    "description": "分析收集到的数据和信息",
                    "agent_type": "analysis", 
                    "dependencies": ["task_0"]  # 依赖第一个任务
                },
                {
                    "description": "撰写完整的研究报告",
                    "agent_type": "writing",
                    "dependencies": ["task_1"]  # 依赖第二个任务
                }
            ]
        elif "市场分析" in task_description:
            subtasks = [
                {"description": "收集市场数据和趋势", "agent_type": "research", "dependencies": []},
                {"description": "分析市场竞争格局", "agent_type": "analysis", "dependencies": ["task_0"]},
                {"description": "制作分析报告", "agent_type": "writing", "dependencies": ["task_1"]}
            ]
        else:
            # 默认分解
            subtasks = [
                {"description": task_description, "agent_type": "research", "dependencies": []}
            ]
        
        return subtasks
    
    async def assign_task(self, task: Task):
        """分配任务给合适的子智能体"""
        # 检查依赖是否完成
        for dep_id in task.dependencies:
            if dep_id in self.task_registry:
                dep_task = self.task_registry[dep_id]
                if dep_task.status != TaskStatus.COMPLETED:
                    print(f"[{self.agent_id}] 任务{task.id}等待依赖任务{dep_id}完成")
                    return  # 等待依赖完成
        
        # 寻找合适的子智能体
        suitable_agents = [
            agent for agent in self.sub_agents.values() 
            if agent.agent_type == task.agent_type and 
            len(agent.current_tasks) < agent.capabilities.max_concurrent_tasks
        ]
        
        if not suitable_agents:
            print(f"[{self.agent_id}] 没有可用的{task.agent_type}类型智能体")
            return
        
        # 选择负载最低的智能体
        selected_agent = min(suitable_agents, 
                           key=lambda a: len(a.current_tasks))
        
        # 发送任务分配消息
        task.status = TaskStatus.ASSIGNED
        task.assigned_to = selected_agent.agent_id
        
        assignment_message = Message(
            msg_type="task_assign",
            sender=self.agent_id,
            receiver=selected_agent.agent_id,
            content={
                "task": task.__dict__,
                "deadline": (datetime.now().timestamp() + 3600)  # 1小时后
            },
            task_id=task.id
        )
        
        await self.message_bus.send_message(assignment_message)
        print(f"[{self.agent_id}] 分配任务{task.id}给{selected_agent.agent_id}")
    
    async def handle_task_result(self, message: Message):
        """处理子智能体返回的任务结果"""
        task_id = message.task_id
        result = message.content
        
        if task_id in self.task_registry:
            task = self.task_registry[task_id]
            task.status = TaskStatus.COMPLETED
            task.result = result
            
            print(f"[{self.agent_id}] 收到任务{task_id}的结果")
            
            # 检查是否有依赖此任务的其他任务
            for other_task in self.task_registry.values():
                if task_id in other_task.dependencies and other_task.status == TaskStatus.PENDING:
                    print(f"[{self.agent_id}] 触发依赖任务{other_task.id}的分配")
                    await self.assign_task(other_task)
            
            # 检查所有任务是否完成
            if all(t.status == TaskStatus.COMPLETED for t in self.task_registry.values()):
                await self.finalize_project(task_id.split('_')[1])  # 提取项目ID
    
    async def finalize_project(self, project_id: str):
        """项目最终整合"""
        print(f"[{self.agent_id}] 项目{project_id}所有任务完成，开始最终整合")
        
        # 收集所有任务结果
        project_tasks = [t for t in self.task_registry.values() 
                        if t.id.startswith(f"task_{project_id}")]
        
        final_report = {
            "project_id": project_id,
            "total_tasks": len(project_tasks),
            "completed_at": datetime.now().isoformat(),
            "results": [{"task": t.description, "result": t.result} for t in project_tasks]
        }
        
        print(f"项目完成报告: {json.dumps(final_report, indent=2, ensure_ascii=False)}")
        
        # 可以发送给用户或存储到数据库
        return final_report

# ========== 智能体工厂 ==========
class AgentFactory:
    """智能体工厂，创建和管理智能体实例"""
    
    @staticmethod
    def create_agent_system() -> tuple:
        """创建完整的智能体系统"""
        # 创建消息总线
        message_bus = MessageBus()
        
        # 创建子智能体
        sub_agents = [
            ResearchAgent("research_agent_1", message_bus),
            WritingAgent("writing_agent_1", message_bus),
            AnalysisAgent("analysis_agent_1", message_bus),
            ResearchAgent("research_agent_2", message_bus)  # 第二个研究智能体，用于负载均衡
        ]
        
        # 创建主智能体
        master_agent = MasterAgent("master_agent", message_bus, sub_agents)
        
        return master_agent, sub_agents, message_bus

# ========== 使用示例 ==========
async def demonstrate_agent_system():
    """演示智能体系统的工作流程"""
    print("🚀 启动 DeepAgents 子智能体系统演示")
    print("=" * 60)
    
    # 1. 创建智能体系统
    master_agent, sub_agents, message_bus = AgentFactory.create_agent_system()
    
    print(f"✓ 系统初始化完成")
    print(f"✓ 主智能体: {master_agent.agent_id}")
    print(f"✓ 子智能体: {[a.agent_id for a in sub_agents]}")
    
    # 2. 查看初始状态
    print("\n📊 初始智能体状态:")
    status = message_bus.get_agent_status()
    for agent_id, agent_status in status.items():
        print(f"  {agent_id}: {agent_status}")
    
    # 3. 发送新任务
    print("\n📨 发送新任务到主智能体:")
    new_task_message = Message(
        msg_type="new_task",
        sender="user_001",
        receiver="master_agent",
        content={
            "description": "请帮我完成一份关于人工智能伦理的研究报告",
            "user_id": "user_001",
            "priority": "high"
        }
    )
    
    await message_bus.send_message(new_task_message)
    
    # 4. 监控任务执行过程
    print("\n⏳ 任务执行中...")
    await asyncio.sleep(5)  # 等待任务执行
    
    # 5. 查看最终状态
    print("\n📊 最终智能体状态:")
    final_status = message_bus.get_agent_status()
    for agent_id, agent_status in final_status.items():
        print(f"  {agent_id}: {agent_status}")
    
    # 6. 查看消息历史
    print(f"\n📨 消息总数: {len(message_bus.message_history)}")
    for msg in message_bus.message_history[-5:]:  # 显示最后5条消息
        print(f"  {msg['sender']} → {msg['receiver']}: {msg['type']}")

async def complex_workflow_demo():
    """演示复杂工作流：多个任务并发执行"""
    print("\n" + "=" * 60)
    print("🔄 复杂工作流演示：多个项目并行")
    print("=" * 60)
    
    # 创建新系统
    master, subs, bus = AgentFactory.create_agent_system()
    
    # 同时发送多个项目
    projects = [
        "人工智能伦理研究报告",
        "市场竞争分析报告", 
        "新技术可行性研究"
    ]
    
    tasks = []
    for i, project in enumerate(projects):
        task_msg = Message(
            msg_type="new_task",
            sender=f"user_{i}",
            receiver="master_agent",
            content={
                "description": project,
                "user_id": f"user_{i}",
                "priority": "medium"
            }
        )
        tasks.append(message_bus.send_message(task_msg))
    
    # 并行发送所有任务
    await asyncio.gather(*tasks)
    
    # 监控执行
    print(f"\n🎯 正在并行处理 {len(projects)} 个项目")
    await asyncio.sleep(8)
    
    print("\n✅ 所有项目处理完成")
    
    # 显示消息统计
    message_types = {}
    for msg in bus.message_history:
        msg_type = msg['type']
        message_types[msg_type] = message_types.get(msg_type, 0) + 1
    
    print(f"\n📊 消息类型统计:")
    for msg_type, count in message_types.items():
        print(f"  {msg_type}: {count}条")

# 运行演示
if __name__ == "__main__":
    print("DeepAgents 子智能体功能完整演示")
    print("=" * 60)
    
    # 运行基础演示
    asyncio.run(demonstrate_agent_system())
    
    # 运行复杂工作流演示
    asyncio.run(complex_workflow_demo())
    
    print("\n" + "=" * 60)
    print("演示结束。系统展示了:")
    print("1. 智能体创建与注册")
    print("2. 任务分解与分配")
    print("3. 智能体间通信")
    print("4. 并发任务处理")
    print("5. 结果整合与报告")
```

## 🔍 详细功能解释

### 1. **架构设计：主从协作模式**

```
┌─────────────────────────────────────────────┐
│              Master Agent                    │
│  (任务分解 + 分配 + 协调 + 整合)            │
└─────────────────┬───────────────────────────┘
                  │ 消息总线 (Message Bus)
      ┌───────────┼───────────┐
      │           │           │
┌─────▼────┐ ┌────▼────┐ ┌───▼─────┐
│Research  │ │Writing  │ │Analysis │
│Agent     │ │Agent    │ │Agent    │
└──────────┘ └─────────┘ └─────────┘
```

**核心组件**：
- **主智能体**：大脑，负责任务理解、分解、调度
- **子智能体**：专业执行单元，各有专长
- **消息总线**：通信中枢，解耦智能体间直接依赖
- **任务注册表**：全局任务状态跟踪

### 2. **智能任务分配算法**

```python
# 简化的任务分配逻辑
async def intelligent_task_assignment(self, task: Task):
    # 1. 筛选符合条件的智能体（类型匹配）
    candidates = [a for a in self.sub_agents 
                 if a.agent_type == task.agent_type]
    
    # 2. 检查负载（并发任务数限制）
    available = [a for a in candidates 
                if len(a.current_tasks) < a.capabilities.max_concurrent_tasks]
    
    if not available:
        # 如果没有可用智能体，考虑等待或创建新实例
        return self.handle_no_available_agent(task)
    
    # 3. 选择策略（多种策略可选）
    if self.allocation_strategy == "load_balance":
        # 负载均衡：选择当前任务最少的
        selected = min(available, key=lambda a: len(a.current_tasks))
    elif self.allocation_strategy == "capability_match":
        # 能力匹配：选择最擅长此类任务的
        selected = max(available, key=lambda a: self.calculate_fitness(a, task))
    elif self.allocation_strategy == "round_robin":
        # 轮询：公平分配
        selected = self.get_next_round_robin(task.agent_type)
    
    # 4. 分配任务
    await self.assign_to_agent(selected, task)
```

### 3. **依赖管理机制**

```python
# 任务依赖图管理
class TaskDependencyGraph:
    def __init__(self):
        self.graph = defaultdict(list)  # task_id -> [dependent_task_ids]
        self.reverse_graph = defaultdict(list)  # task_id -> [prerequisite_task_ids]
    
    def add_dependency(self, task_id: str, depends_on: List[str]):
        """添加依赖关系"""
        for dep in depends_on:
            self.graph[dep].append(task_id)  # dep完成时，task可开始
            self.reverse_graph[task_id].append(dep)  # task依赖dep
    
    def can_start(self, task_id: str) -> bool:
        """检查任务是否可以开始"""
        prerequisites = self.reverse_graph.get(task_id, [])
        return all(self.is_completed(prereq) for prereq in prerequisites)
    
    def notify_completion(self, completed_task_id: str):
        """通知任务完成，触发依赖检查"""
        dependent_tasks = self.graph.get(completed_task_id, [])
        for dependent_task in dependent_tasks:
            if self.can_start(dependent_task):
                self.schedule_task(dependent_task)
```

### 4. **通信协议详解**

```python
# 完整的消息类型定义
MESSAGE_TYPES = {
    # 任务相关
    "TASK_ASSIGN": "task_assign",        # 分配任务给子智能体
    "TASK_RESULT": "task_result",        # 子智能体返回结果
    "TASK_UPDATE": "task_update",        # 任务状态更新
    "TASK_CANCEL": "task_cancel",        # 取消任务
    
    # 查询与协调
    "AGENT_QUERY": "agent_query",        # 查询智能体状态/能力
    "AGENT_RESPONSE": "agent_response",  # 智能体响应查询
    "COORDINATION": "coordination",      # 智能体间协调
    
    # 资源管理
    "RESOURCE_REQUEST": "resource_request",  # 请求资源（如数据、工具）
    "RESOURCE_PROVIDE": "resource_provide",  # 提供资源
    
    # 错误处理
    "ERROR_REPORT": "error_report",      # 错误报告
    "RECOVERY_REQUEST": "recovery_request"  # 恢复请求
}

# 消息优先级队列
class PriorityMessageQueue:
    def __init__(self):
        self.high_priority = asyncio.Queue()    # 紧急消息
        self.normal_priority = asyncio.Queue()  # 普通消息
        self.low_priority = asyncio.Queue()     # 后台消息
    
    async def put(self, message: Message, priority: str = "normal"):
        """按优先级放入消息"""
        if priority == "high":
            await self.high_priority.put(message)
        elif priority == "low":
            await self.low_priority.put(message)
        else:
            await self.normal_priority.put(message)
    
    async def get(self) -> Message:
        """获取消息（按优先级顺序）"""
        if not self.high_priority.empty():
            return await self.high_priority.get()
        elif not self.normal_priority.empty():
            return await self.normal_priority.get()
        else:
            return await self.low_priority.get()
```

### 5. **实际工作流示例**

```python
# 完整的研究报告生成流程
async def research_report_workflow(master_agent: MasterAgent):
    """研究报告生成的全流程"""
    # 用户请求
    user_request = "生成一份关于机器学习可解释性的研究报告"
    
    # 1. 主智能体接收请求并分解
    subtasks = await master_agent.decompose_task(user_request)
    # 输出: [
    #   {"type": "research", "desc": "收集可解释性AI相关论文", ...},
    #   {"type": "analysis", "desc": "分析不同方法的优缺点", ...},
    #   {"type": "writing", "desc": "撰写研究报告", ...}
    # ]
    
    # 2. 分配任务给子智能体
    research_task = create_task(subtasks[0])
    await master_agent.assign_task(research_task)  # 给ResearchAgent
    
    # 3. ResearchAgent完成工作，返回结果
    research_results = {
        "papers": [...],
        "key_findings": [...],
        "references": [...]
    }
    
    # 4. 主智能体收到结果，触发分析任务
    analysis_task = create_task(subtasks[1])
    analysis_task.research_data = research_results  # 传递研究数据
    await master_agent.assign_task(analysis_task)  # 给AnalysisAgent
    
    # 5. AnalysisAgent分析数据，返回洞察
    analysis_results = {
        "insights": [...],
        "comparisons": [...],
        "recommendations": [...]
    }
    
    # 6. 主智能体触发写作任务
    writing_task = create_task(subtasks[2])
    writing_task.research_data = research_results
    writing_task.analysis_data = analysis_results
    await master_agent.assign_task(writing_task)  # 给WritingAgent
    
    # 7. WritingAgent生成最终报告
    final_report = {
        "title": "机器学习可解释性研究报告",
        "content": "...",
        "sections": [...],
        "references": [...]
    }
    
    # 8. 主智能体整合所有结果
    return await master_agent.finalize_project(final_report)
```

## 🎯 核心优势与解决的问题

| 问题             | 传统单智能体方案                     | DeepAgents子智能体方案   | 优势           |
| ---------------- | ------------------------------------ | ------------------------ | -------------- |
| **复杂任务处理** | 单个智能体需掌握所有技能，容易混乱   | 专业分工，各司其职       | 提高任务成功率 |
| **上下文管理**   | 所有任务历史在同一上下文中，容易超限 | 每个子智能体有独立上下文 | 避免token超限  |
| **并发处理**     | 顺序执行，效率低                     | 并行处理多个子任务       | 大幅提升效率   |
| **错误隔离**     | 一个任务失败影响整个流程             | 单个子任务失败不影响整体 | 系统更健壮     |
| **可扩展性**     | 扩展困难，需要重新训练               | 轻松添加新类型智能体     | 灵活适应新需求 |

## 💡 最佳实践建议

### 1. **智能体类型设计**
```python
# 推荐的智能体类型分类
AGENT_SPECIALTIES = {
    # 信息处理类
    "research": "信息收集、文献调研",
    "analysis": "数据分析、模式识别", 
    "summarization": "内容摘要、提炼",
    
    # 内容生成类
    "writing": "报告撰写、内容创作",
    "translation": "多语言翻译",
    "code_generation": "代码编写",
    
    # 工具操作类
    "data_processing": "数据处理、清洗",
    "api_integration": "外部API调用",
    "file_operations": "文件系统操作",
    
    # 决策类
    "planning": "任务规划、路径优化",
    "validation": "结果验证、质量控制",
    "coordination": "多智能体协调"
}
```

### 2. **负载均衡策略**
```python
class LoadBalancer:
    """智能负载均衡器"""
    
    STRATEGIES = {
        "round_robin": "轮询分配，公平但可能不高效",
        "least_connections": "选择当前任务最少的",
        "weighted_round_robin": "根据能力权重分配",
        "adaptive": "基于历史性能和当前负载动态调整"
    }
    
    def adaptive_allocation(self, task: Task, agents: List[BaseAgent]) -> BaseAgent:
        """自适应分配策略"""
        scores = []
        for agent in agents:
            # 计算综合得分
            score = (
                0.4 * self.calculate_capability_match(agent, task) +
                0.3 * (1 - agent.current_load_ratio()) +
                0.2 * agent.success_rate_on_similar_tasks(task) +
                0.1 * (1 - agent.average_response_time())
            )
            scores.append((score, agent))
        
        return max(scores, key=lambda x: x[0])[1]
```

### 3. **错误恢复机制**
```python
class FaultToleranceManager:
    """容错管理器"""
    
    async def handle_task_failure(self, task: Task, error: Exception):
        """处理任务失败"""
        options = [
            self.retry_with_same_agent,      # 同一智能体重试
            self.reassign_to_other_agent,    # 重新分配给其他智能体
            self.split_and_retry,            # 拆分任务后重试
            self.escalate_to_human,          # 人工干预
            self.fallback_to_simpler_task    # 降级处理
        ]
        
        # 基于错误类型选择恢复策略
        if isinstance(error, TimeoutError):
            return await options[0](task)
        elif isinstance(error, CapabilityMismatchError):
            return await options[1](task)
        elif isinstance(error, ResourceExhaustionError):
            return await options[2](task)
        
        # 默认策略
        return await options[3](task)
```

## 🚀 扩展应用场景

### 1. **企业级应用**
```python
# 企业客户服务系统
customer_service_system = AgentSystem(
    master=MasterAgent("service_manager"),
    sub_agents=[
        IntentRecognitionAgent(),      # 意图识别
        KnowledgeRetrievalAgent(),     # 知识检索  
        SolutionGenerationAgent(),     # 方案生成
        EscalationHandlingAgent(),     # 升级处理
        FeedbackCollectionAgent()      # 反馈收集
    ]
)

# 工作流：客户问题 → 意图识别 → 知识检索 → 方案生成 → 反馈收集
```

### 2. **科研协作平台**
```python
# 自动化科研助手
research_assistant = AgentSystem(
    master=ResearchCoordinatorAgent(),
    sub_agents=[
        LiteratureReviewAgent(),       # 文献综述
        ExperimentDesignAgent(),       # 实验设计
        DataAnalysisAgent(),           # 数据分析
        PaperWritingAgent(),           # 论文撰写
        PeerReviewSimulatorAgent()     # 同行评审模拟
    ]
)
```

### 3. **软件开发流水线**
```python
# AI辅助开发系统
dev_ops_system = AgentSystem(
    master=ProjectManagerAgent(),
    sub_agents=[
        RequirementAnalysisAgent(),    # 需求分析
        ArchitectureDesignAgent(),     # 架构设计
        CodeGenerationAgent(),         # 代码生成
        TestingAgent(),                # 测试
        DocumentationAgent()           # 文档生成
    ]
)
```

## 📊 性能监控与优化

```python
class PerformanceMonitor:
    """智能体系统性能监控"""
    
    METRICS = {
        "throughput": "任务完成速率",
        "latency": "任务平均耗时", 
        "success_rate": "任务成功率",
        "resource_utilization": "资源利用率",
        "communication_overhead": "通信开销"
    }
    
    async def collect_metrics(self, system: AgentSystem):
        """收集性能指标"""
        metrics = {}
        
        # 计算吞吐量
        completed_tasks = sum(len(a.task_history) for a in system.sub_agents)
        time_elapsed = system.uptime()
        metrics["throughput"] = completed_tasks / time_elapsed
        
        # 计算平均延迟
        all_tasks = []
        for agent in system.sub_agents:
            for task in agent.task_history:
                latency = task.completed_at - task.created_at
                all_tasks.append(latency.total_seconds())
        
        metrics["latency"] = sum(all_tasks) / len(all_tasks) if all_tasks else 0
        metrics["success_rate"] = self.calculate_success_rate(system)
        
        return metrics
    
    def optimize_based_on_metrics(self, metrics: Dict[str, float]):
        """基于指标优化系统"""
        if metrics["latency"] > self.thresholds["latency"]:
            # 延迟过高，增加智能体实例或优化分配策略
            return self.scale_up_agents()
        
        if metrics["communication_overhead"] > self.thresholds["communication"]:
            # 通信开销大，优化消息格式或减少通信频率
            return self.optimize_communication()
```

这种子智能体架构使DeepAgents能够处理**极其复杂的多步骤、多专业任务**。通过专业分工、并行处理和智能协调，系统可以完成单个智能体难以胜任的工作。如果你有具体的协作场景需求，我可以设计更针对性的智能体配置方案。