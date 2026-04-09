# LangGraph 使用示例：构建一个智能客服路由系统

我将为您展示一个使用 LangGraph 构建的智能客服路由系统示例。这个系统能够自动分析用户问题，并将其路由到最适合的专家部门进行处理。

## 场景描述

假设我们有一个电商公司的客服系统，用户咨询的问题可能涉及：
1. **物流查询** - 由物流部门处理
2. **产品问题** - 由产品专家处理
3. **退款请求** - 由财务部门处理
4. **一般咨询** - 由普通客服处理

我们将使用 LangGraph 来构建一个能够自动路由这些请求的工作流。

## 完整代码示例

```python
import os
from typing import Literal, TypedDict
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

# 设置OpenAI API密钥
os.environ["OPENAI_API_KEY"] = "your-openai-api-key"

# 定义状态结构
class AgentState(TypedDict):
    user_input: str
    department: Literal["logistics", "product", "refund", "general", "unknown"]
    response: str

# 初始化LLM
llm = ChatOpenAI(model="gpt-3.5-turbo")

# 定义路由节点 - 判断用户问题类型
def router(state: AgentState) -> AgentState:
    """根据用户输入判断应该路由到哪个部门"""
    message = f"""
    请分析以下用户问题，并将其路由到合适的部门：
    - logistics (物流问题): 查询快递状态、配送时间等
    - product (产品问题): 产品功能、使用问题等
    - refund (退款问题): 退货、退款请求等
    - general (一般咨询): 其他普通问题
    
    用户问题: {state['user_input']}
    
    只需返回部门名称，不要返回其他内容。
    """
    
    response = llm.invoke([HumanMessage(content=message)])
    department = response.content.strip().lower()
    
    # 确保返回的部门是有效的
    valid_departments = ["logistics", "product", "refund", "general"]
    if department not in valid_departments:
        department = "unknown"
    
    return {"department": department}

# 定义各个部门的处理节点
def logistics_agent(state: AgentState) -> AgentState:
    """处理物流相关问题"""
    message = f"""
    你是一名物流专家。请专业地回答以下物流相关问题：
    
    用户问题: {state['user_input']}
    
    请提供详细、专业的回答。
    """
    
    response = llm.invoke([HumanMessage(content=message)])
    return {"response": response.content}

def product_agent(state: AgentState) -> AgentState:
    """处理产品相关问题"""
    message = f"""
    你是一名产品专家。请专业地回答以下产品相关问题：
    
    用户问题: {state['user_input']}
    
    请提供详细、专业的回答。
    """
    
    response = llm.invoke([HumanMessage(content=message)])
    return {"response": response.content}

def refund_agent(state: AgentState) -> AgentState:
    """处理退款相关问题"""
    message = f"""
    你是一名财务专家。请专业地回答以下退款相关问题：
    
    用户问题: {state['user_input']}
    
    请提供详细、专业的回答，如果需要用户提供更多信息，请明确说明。
    """
    
    response = llm.invoke([HumanMessage(content=message)])
    return {"response": response.content}

def general_agent(state: AgentState) -> AgentState:
    """处理一般咨询问题"""
    message = f"""
    你是一名客服代表。请友好地回答以下一般咨询问题：
    
    用户问题: {state['user_input']}
    
    请提供友好、有帮助的回答。
    """
    
    response = llm.invoke([HumanMessage(content=message)])
    return {"response": response.content}

def unknown_agent(state: AgentState) -> AgentState:
    """处理无法识别的问题"""
    return {"response": "抱歉，我无法理解您的问题。请您重新表述或联系人工客服。"}

# 创建图工作流
workflow = StateGraph(AgentState)

# 添加节点
workflow.add_node("router", router)
workflow.add_node("logistics_agent", logistics_agent)
workflow.add_node("product_agent", product_agent)
workflow.add_node("refund_agent", refund_agent)
workflow.add_node("general_agent", general_agent)
workflow.add_node("unknown_agent", unknown_agent)

# 设置入口点
workflow.set_entry_point("router")

# 添加路由边
workflow.add_conditional_edges(
    "router",
    lambda state: state["department"],
    {
        "logistics": "logistics_agent",
        "product": "product_agent",
        "refund": "refund_agent",
        "general": "general_agent",
        "unknown": "unknown_agent",
    }
)

# 从各个部门节点连接到结束
workflow.add_edge("logistics_agent", END)
workflow.add_edge("product_agent", END)
workflow.add_edge("refund_agent", END)
workflow.add_edge("general_agent", END)
workflow.add_edge("unknown_agent", END)

# 编译图
app = workflow.compile()

# 可视化工作流（需要安装额外的依赖）
# from langgraph.graph import draw
# draw(app)

# 运行示例
if __name__ == "__main__":
    # 测试不同的问题
    test_cases = [
        "我的订单什么时候能发货？",
        "这个产品的电池能用多久？",
        "我想申请退款",
        "你们的营业时间是什么时候？",
        "随便聊聊天"
    ]
    
    for question in test_cases:
        print(f"\n用户问题: {question}")
        
        # 初始化状态
        initial_state = {"user_input": question, "department": "unknown", "response": ""}
        
        # 执行工作流
        final_state = app.invoke(initial_state)
        
        print(f"路由部门: {final_state['department']}")
        print(f"回答: {final_state['response']}")
        print("-" * 50)
```

## LangGraph 核心概念解析

在这个例子中，我们展示了 LangGraph 的几个核心概念：

### 1. 状态管理 (State Management)
我们定义了一个 `AgentState` 类型来跟踪工作流的状态，包含：
- `user_input`: 用户的问题
- `department`: 路由到的部门
- `response`: 最终的响应

### 2. 节点 (Nodes)
每个节点是一个函数，接收当前状态并返回更新后的状态：
- `router`: 路由节点，决定问题应该由哪个部门处理
- 各个部门节点：专门处理特定类型的问题

### 3. 边 (Edges)
定义了节点之间的流转关系：
- 条件边：根据路由节点的结果决定下一步流向哪个部门
- 普通边：从各部门节点直接连接到结束

### 4. 条件路由 (Conditional Routing)
使用 `add_conditional_edges` 实现基于状态的条件分支，这是 LangGraph 最强大的功能之一。

## 更复杂的扩展示例

上面的示例展示了基础用法，下面是更复杂的扩展，添加了记忆和人工接管功能：

```python
from typing import List
from langchain_core.messages import AIMessage, BaseMessage

# 扩展状态以支持对话历史
class ChatState(TypedDict):
    user_input: str
    department: Literal["logistics", "product", "refund", "general", "unknown", "human"]
    response: str
    conversation_history: List[BaseMessage]
    requires_human: bool

# 添加人工接管检查
def human_check(state: ChatState) -> ChatState:
    """检查是否需要人工客服介入"""
    message = f"""
    分析以下用户问题，判断是否需要转接人工客服：
    - 需要人工的情况：复杂问题、投诉、紧急情况、用户明确要求
    
    用户问题: {state['user_input']}
    对话历史: {state['conversation_history']}
    
    只需返回 "yes" 或 "no"。
    """
    
    response = llm.invoke([HumanMessage(content=message)])
    requires_human = response.content.strip().lower() == "yes"
    
    return {"requires_human": requires_human}

# 人工客服节点
def human_agent(state: ChatState) -> ChatState:
    """人工客服处理"""
    return {
        "response": "您的问题已转接给人工客服，请稍等。",
        "department": "human"
    }

# 更新工作流以包含人工检查
advanced_workflow = StateGraph(ChatState)

# 添加节点
advanced_workflow.add_node("router", router)
advanced_workflow.add_node("human_check", human_check)
advanced_workflow.add_node("logistics_agent", logistics_agent)
# ... 添加其他部门节点
advanced_workflow.add_node("human_agent", human_agent)

# 设置更复杂的工作流
advanced_workflow.set_entry_point("router")

# 先路由，然后检查是否需要人工
advanced_workflow.add_edge("router", "human_check")

# 根据人工检查结果决定下一步
advanced_workflow.add_conditional_edges(
    "human_check",
    lambda state: "human_agent" if state["requires_human"] else state["department"],
    {
        "logistics": "logistics_agent",
        "product": "product_agent",
        "refund": "refund_agent",
        "general": "general_agent",
        "unknown": "unknown_agent",
        "human_agent": "human_agent",
    }
)

# 连接到结束
advanced_workflow.add_edge("logistics_agent", END)
# ... 添加其他部门的边
advanced_workflow.add_edge("human_agent", END)

# 编译高级工作流
advanced_app = advanced_workflow.compile()
```

## LangGraph 的优势

通过这个例子，我们可以看到 LangGraph 的优势：

1. **可视化工作流**：复杂流程可以直观地设计和理解
2. **状态管理**：轻松跟踪和管理对话状态
3. **条件逻辑**：支持基于内容的动态路由
4. **易于扩展**：可以轻松添加新节点或修改现有流程
5. **错误处理**：可以添加专门错误处理节点

这个示例展示了如何使用 LangGraph 构建一个智能路由系统，您可以根据实际需求调整和扩展这个框架，例如添加更多专业部门、集成外部API、或者添加更复杂的决策逻辑。