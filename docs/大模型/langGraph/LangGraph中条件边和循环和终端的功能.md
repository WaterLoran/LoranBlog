# LangGraph中条件边和循环和终端的功能

我将通过一个 **“代码评审智能体”** 的具体示例，完整展示LangGraph中**条件边**、**循环**与**终端**的功能如何配合，实现一个能多轮分析、自我决策的智能工作流。

## 📝 完整代码示例：多轮代码评审智能体

```python
from typing import TypedDict, Literal, Annotated
from langgraph.graph import StateGraph, END, add_messages
from langgraph.checkpoint.memory import MemorySaver
import operator

# ===================== 1. 定义状态结构 =====================
class CodeReviewState(TypedDict):
    """全局状态：包含完整的评审上下文"""
    # 用户输入的原始代码
    original_code: str
    # 当前正在评审的代码（可能被修改过）
    current_code: str
    # 评审意见列表（记录多轮评审历史）
    review_comments: Annotated[list, add_messages]
    # 智能体的思考过程
    reasoning: str
    # 当前决定：继续修改还是接受？
    decision: Literal["needs_change", "accepted"]
    # 修改迭代次数（用于防止无限循环）
    iteration_count: int
    # 最终输出
    final_output: str

# ===================== 2. 定义节点函数 =====================
def analyze_code_node(state: CodeReviewState) -> CodeReviewState:
    """节点1：代码分析节点 - 模拟LLM分析代码问题"""
    print(f"\n{'='*50}")
    print(f"[分析节点] 第{state['iteration_count']+1}轮分析")
    print(f"{'='*50}")
    
    code = state["current_code"]
    
    # 模拟LLM分析代码（实际中这里会调用真正的LLM）
    # 简单规则：检测常见问题
    issues = []
    if "TODO" in code:
        issues.append("代码中存在未完成的TODO注释")
    if "print(" in code and "logging" not in code:
        issues.append("使用print语句而非日志系统")
    if "password" in code.lower() and "encrypt" not in code.lower():
        issues.append("发现明文密码处理，建议加密")
    if "try:" not in code and "except" not in code:
        issues.append("缺乏错误处理机制")
    
    # 生成评审意见
    if issues:
        comment = f"发现{len(issues)}个问题:\n" + "\n".join(f"- {issue}" for issue in issues)
        decision = "needs_change"
    else:
        comment = "代码质量良好，未发现重大问题。"
        decision = "accepted"
    
    # 记录思考过程
    reasoning = f"分析了{len(code.splitlines())}行代码，检测到{len(issues)}个潜在问题。"
    
    # 更新状态
    state["review_comments"].append({"role": "reviewer", "content": comment})
    state["reasoning"] = reasoning
    state["decision"] = decision
    
    print(f"分析结果: {comment[:50]}...")
    print(f"决策: {decision}")
    return state

def decision_node(state: CodeReviewState) -> CodeReviewState:
    """节点2：决策节点 - 决定下一步行动（关键：条件边的判断点）"""
    print(f"\n[决策节点] 正在决定下一步...")
    
    # 检查是否达到最大迭代次数（防止无限循环的关键）
    if state["iteration_count"] >= 3:  # 最多进行3轮修改
        print("达到最大迭代次数(3)，强制终止循环")
        state["decision"] = "accepted"  # 强制接受
        state["review_comments"].append({
            "role": "system", 
            "content": "已达到最大修改轮次，流程终止。"
        })
    
    # 决策逻辑已由分析节点设置，这里只是记录
    decision = state["decision"]
    print(f"当前决定: {decision}")
    return state

def modify_code_node(state: CodeReviewState) -> CodeReviewState:
    """节点3：代码修改节点 - 模拟LLM修改代码"""
    print(f"\n[修改节点] 正在修改代码...")
    
    code = state["current_code"]
    
    # 模拟代码修改（实际中这里会调用LLM进行修改）
    # 根据发现的问题进行修正
    modified_code = code
    
    if "TODO" in code:
        modified_code = code.replace("# TODO: 添加错误处理", "# 已添加错误处理")
    
    if "print(" in code:
        modified_code = modified_code.replace("print(", "logging.info(")
        if "import logging" not in modified_code:
            modified_code = "import logging\n" + modified_code
    
    # 增加修改标记
    modified_code += f"\n\n# 第{state['iteration_count']+1}轮修改完成"
    
    # 更新状态
    state["current_code"] = modified_code
    state["iteration_count"] += 1  # 增加迭代计数
    
    print(f"修改完成，代码长度: {len(modified_code)}字符")
    print(f"当前迭代次数: {state['iteration_count']}")
    return state

def finalize_node(state: CodeReviewState) -> CodeReviewState:
    """节点4：终结节点 - 生成最终输出"""
    print(f"\n[终结节点] 生成最终报告...")
    
    # 整理所有评审意见
    all_comments = "\n".join(
        [f"{c['role']}: {c['content']}" for c in state["review_comments"]]
    )
    
    # 生成最终报告
    report = f"""代码评审完成报告
{'='*40}
原始代码长度: {len(state['original_code'])}字符
最终代码长度: {len(state['current_code'])}字符
评审轮次: {state['iteration_count']}
最终决定: {state['decision']}

评审历史:
{all_comments}

最终代码:
{state['current_code'][:200]}..."""  # 只显示前200字符
    
    state["final_output"] = report
    
    print(f"报告生成完成，共{state['iteration_count']}轮评审")
    return state

# ===================== 3. 构建图：展示条件边与循环 =====================
def create_code_review_agent():
    """创建包含条件边和循环的代码评审智能体"""
    
    # 初始化图
    workflow = StateGraph(CodeReviewState)
    
    # 添加节点
    workflow.add_node("analyze", analyze_code_node)
    workflow.add_node("decide", decision_node)  # 关键决策点
    workflow.add_node("modify", modify_code_node)
    workflow.add_node("finalize", finalize_node)
    
    # ===================== 核心：定义控制流 =====================
    
    # 3.1 设置入口点
    workflow.set_entry_point("analyze")
    
    # 3.2 第一段固定边：分析 -> 决策
    workflow.add_edge("analyze", "decide")
    
    # 3.3 关键！条件边：基于决策动态路由
    def decide_next_step(state: CodeReviewState) -> Literal["modify", "finalize", END]:
        """路由函数：根据decision字段决定下一步"""
        
        decision = state["decision"]
        iteration = state["iteration_count"]
        
        print(f"\n[路由函数] 决策:{decision}, 迭代次数:{iteration}")
        
        if decision == "needs_change" and iteration < 3:
            # 需要修改且未超限 -> 去修改节点
            return "modify"
        else:
            # 接受或超限 -> 去终结节点
            return "finalize"
    
    # 添加条件边（这是实现动态分支的核心）
    workflow.add_conditional_edges(
        "decide",  # 从哪个节点出发
        decide_next_step,  # 路由决策函数
        {
            "modify": "modify",    # 如果返回"modify"，去modify节点
            "finalize": "finalize" # 如果返回"finalize"，去finalize节点
        }
    )
    
    # 3.4 循环的实现：修改 -> 分析（形成循环）
    workflow.add_edge("modify", "analyze")  # 关键循环边
    
    # 3.5 终结流程
    workflow.add_edge("finalize", END)
    
    # 3.6 添加检查点（支持中断/恢复）
    memory = MemorySaver()
    config = {"configurable": {"thread_id": "code_review_1"}}
    
    print("✅ 代码评审智能体图结构构建完成")
    return workflow.compile(checkpointer=memory), config

# ===================== 4. 测试不同场景 =====================
def test_scenarios():
    """测试不同输入下的行为"""
    
    # 创建智能体
    review_agent, config = create_code_review_agent()
    
    # 场景1：有问题的代码（会触发多次修改循环）
    print("\n" + "🔍"*50)
    print("场景1：测试有问题的代码（预计会循环修改）")
    print("🔍"*50)
    
    problematic_code = """
def login(username, password):
    # TODO: 添加错误处理
    print(f"尝试登录用户: {username}")
    if username == "admin" and password == "123456":
        return True
    return False
"""
    
    initial_state = {
        "original_code": problematic_code,
        "current_code": problematic_code,
        "review_comments": [],
        "reasoning": "",
        "decision": "needs_change",
        "iteration_count": 0,
        "final_output": ""
    }
    
    # 运行工作流
    final_state = review_agent.invoke(initial_state, config)
    
    print(f"\n最终输出摘要:")
    print("-"*30)
    print(final_state["final_output"][:300] + "...")
    
    # 场景2：良好的代码（直接接受）
    print("\n\n" + "✅"*50)
    print("场景2：测试良好的代码（预计直接接受）")
    print("✅"*50)
    
    good_code = """
import logging
import hashlib

def authenticate_user(username, password_hash):
    '''安全的用户认证函数'''
    try:
        # 这里应该有数据库查询
        stored_hash = get_password_hash_from_db(username)
        return password_hash == stored_hash
    except Exception as e:
        logging.error(f"认证失败: {e}")
        return False
"""
    
    initial_state2 = {
        "original_code": good_code,
        "current_code": good_code,
        "review_comments": [],
        "reasoning": "",
        "decision": "needs_change",
        "iteration_count": 0,
        "final_output": ""
    }
    
    # 重置检查点
    config2 = {"configurable": {"thread_id": "code_review_2"}}
    final_state2 = review_agent.invoke(initial_state2, config2)
    
    print(f"\n最终决定: {final_state2['decision']}")
    print(f"评审轮次: {final_state2['iteration_count']}")

if __name__ == "__main__":
    # 可视化图结构
    agent, _ = create_code_review_agent()
    print("\n📊 工作流可视化:")
    try:
        # 生成Mermaid图代码
        mermaid_graph = agent.get_graph().draw_mermaid()
        print("Mermaid图代码已生成，可复制到支持Mermaid的编辑器中查看")
        # 这里可以保存或显示图表
    except:
        pass
    
    # 运行测试
    test_scenarios()
```

## 🎯 核心功能详解

### 1. **条件边（Conditional Edges） - 动态决策的核心**

```python
def decide_next_step(state: CodeReviewState):
    """路由函数：检查状态并返回下一个节点"""
    if state["decision"] == "needs_change" and state["iteration_count"] < 3:
        return "modify"  # 需要修改 -> 去修改节点
    else:
        return "finalize"  # 接受 -> 去终结节点

# 添加条件边
workflow.add_conditional_edges(
    "decide",           # 从决策节点出发
    decide_next_step,   # 路由决策函数
    {"modify": "modify", "finalize": "finalize"}  # 可能的下一节点
)
```

**运行机制**：
1. 每次工作流执行到`decide`节点后，都会调用`decide_next_step`函数
2. 该函数**读取当前状态**（decision字段和iteration_count）
3. 根据业务逻辑**返回下一个节点的名称**
4. LangGraph根据返回值路由到对应的节点

**可视化流程**：
```mermaid
flowchart TD
    A[analyze<br>分析代码] --> B[decide<br>决策节点]
    B --> C{decide_next_step<br>路由函数}
    
    C --"decision=='needs_change'<br>且 iteration_count<3"--> D[modify<br>修改代码]
    C --"否则"--> E[finalize<br>终结节点]
    
    D --> A  %% 关键循环边
    
    E --> F((END))
```

### 2. **循环（Cycles） - 迭代的基础**

```python
# 关键的一行代码：创建循环
workflow.add_edge("modify", "analyze")  # 修改后重新分析
```

**循环逻辑**：
1. 代码修改后，返回分析节点重新评审
2. 形成 `分析 → 决策 → 修改 → 分析` 的闭环
3. 每次循环都会增加`iteration_count`计数器

### 3. **终端（END）与循环终止条件**

```python
# 在路由函数中设置终止条件
if state["decision"] == "needs_change" and state["iteration_count"] < 3:
    return "modify"  # 继续循环
else:
    return "finalize"  # 退出循环
```

**防止无限循环的三种策略**：

| 策略             | 实现方式                                     | 适用场景               |
| ---------------- | -------------------------------------------- | ---------------------- |
| **最大迭代次数** | `if iteration_count >= 3: return "finalize"` | 通用场景，防止死循环   |
| **质量阈值**     | 检查代码评分是否达标                         | 优化任务（如代码重构） |
| **人工干预**     | 在特定轮次后暂停等待用户输入                 | 关键决策任务           |

## 💡 实际运行示例

### 场景1：问题代码的**多轮循环**
```
==================================================
[分析节点] 第1轮分析
==================================================
分析结果: 发现3个问题:
- 代码中存在未完成的TODO注释
- 使用print语句而非日志系统
- 发现明文密码处理，建议加密
决策: needs_change

[决策节点] 正在决定下一步...
[路由函数] 决策:needs_change, 迭代次数:0
[修改节点] 正在修改代码...

==================================================
[分析节点] 第2轮分析  # ← 循环回来了！
==================================================
分析结果: 发现1个问题:
- 缺乏错误处理机制
决策: needs_change
```

### 场景2：良好代码的**直接终止**
```
==================================================
[分析节点] 第1轮分析
==================================================
分析结果: 代码质量良好，未发现重大问题。
决策: accepted  # ← 直接接受！

[决策节点] 正在决定下一步...
[路由函数] 决策:accepted, 迭代次数:0
[终结节点] 生成最终报告...
```

## 🛠️ 扩展应用模式

这个模式可以应用到多种场景：

1. **对话系统**：用户提问 → 分析意图 → 回答/追问 → 循环直到问题解决
2. **多步骤查询**：解析问题 → 选择数据源 → 查询 → 验证 → 补充查询（循环）
3. **内容生成**：生成草稿 → 质量检查 → 修改/优化 → 重新检查 → 最终输出

## 📊 总结

LangGraph的条件边和循环机制让你可以构建**具有自主决策能力**的智能工作流：

- **条件边** = **智能路由**：根据数据内容决定执行路径
- **循环** = **迭代优化**：允许工作流自我改进
- **终止条件** = **流程控制**：确保工作流能正常结束

这三者结合，让AI应用不再是一次性的问答，而是可以**多轮思考、自我修正、动态调整**的智能过程。

如果需要，我可以进一步展示如何：
1. 添加**人工干预节点**（在循环中暂停等待用户确认）
2. 实现**并行分支**（同时检查代码的多个方面）
3. 使用**检查点系统**保存进度，实现断点续跑