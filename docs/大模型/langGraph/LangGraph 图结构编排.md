# LangGraph 图结构编排

我将通过一个**智能内容创作系统**来演示LangGraph的图结构编排功能，该系统包含并行处理、条件分支、循环优化和子图嵌套等复杂结构。

## 完整示例：智能内容创作系统

```python
from typing import TypedDict, List, Dict, Any, Optional, Literal, Annotated
from langgraph.graph import StateGraph, END
from enum import Enum
import asyncio
from dataclasses import dataclass
import networkx as nx
import matplotlib.pyplot as plt
from datetime import datetime
import json

# ======================
# 1. 状态定义
# ======================

class ContentState(TypedDict):
    """内容创作的状态容器"""
    # 输入相关
    topic: str
    target_audience: str
    content_type: Literal["blog", "social_media", "report", "email"]
    tone: Literal["formal", "casual", "persuasive", "technical"]
    
    # 处理节点
    nodes_executed: List[str]  # 已执行的节点
    current_node: str  # 当前节点
    
    # 并行处理结果
    research_results: Dict[str, Any]
    keyword_analysis: Dict[str, Any]
    competitor_analysis: Dict[str, Any]
    
    # 内容草稿
    outline: Optional[str]
    draft_sections: Dict[str, str]  # 章节标题 -> 内容
    full_draft: Optional[str]
    
    # 质量评估
    quality_scores: Dict[str, float]
    feedback: List[str]
    revision_count: int
    
    # 路由决策
    next_action: Optional[str]
    should_continue: bool
    needs_human_review: bool
    
    # 元数据
    start_time: str
    end_time: Optional[str]
    execution_path: List[Dict]  # 详细执行路径

# ======================
# 2. 图结构编排示例
# ======================

def create_complex_content_workflow():
    """创建复杂的内容创作流程图"""
    
    # 初始化图构建器
    builder = StateGraph(ContentState)
    
    # =============== 基础节点 ===============
    
    def initialize_node(state: ContentState) -> ContentState:
        """节点1：初始化"""
        print(f"[初始化] 开始处理主题: {state['topic']}")
        state['nodes_executed'].append("initialize")
        state['current_node'] = "initialize"
        state['start_time'] = datetime.now().isoformat()
        state['execution_path'].append({
            "node": "initialize",
            "timestamp": state['start_time'],
            "action": "初始化工作流"
        })
        return state
    
    def analyze_requirements_node(state: ContentState) -> ContentState:
        """节点2：分析需求"""
        print(f"[需求分析] 目标受众: {state['target_audience']}, 类型: {state['content_type']}")
        state['nodes_executed'].append("analyze_requirements")
        state['current_node'] = "analyze_requirements"
        
        # 基于内容类型决定下一步
        if state['content_type'] in ["blog", "report"]:
            state['next_action'] = "parallel_research"
        elif state['content_type'] == "social_media":
            state['next_action'] = "quick_research"
        else:
            state['next_action'] = "direct_writing"
            
        state['execution_path'].append({
            "node": "analyze_requirements",
            "timestamp": datetime.now().isoformat(),
            "decision": f"下一步: {state['next_action']}"
        })
        return state
    
    # =============== 并行处理节点 ===============
    
    def research_topic_node(state: ContentState) -> ContentState:
        """节点3：研究主题（并行节点1）"""
        print(f"[主题研究] 正在研究: {state['topic']}")
        state['nodes_executed'].append("research_topic")
        state['current_node'] = "research_topic"
        
        # 模拟研究结果
        state['research_results'] = {
            "key_facts": [
                f"关于{state['topic']}的最新发展",
                f"{state['topic']}的主要趋势",
                f"{state['topic']}的关键数据"
            ],
            "sources": ["source1.com", "source2.org"],
            "relevance_score": 0.85
        }
        
        state['execution_path'].append({
            "node": "research_topic",
            "timestamp": datetime.now().isoformat(),
            "results": f"找到{len(state['research_results']['key_facts'])}个关键点"
        })
        return state
    
    def analyze_keywords_node(state: ContentState) -> ContentState:
        """节点4：关键词分析（并行节点2）"""
        print(f"[关键词分析] 分析主题关键词")
        state['nodes_executed'].append("analyze_keywords")
        state['current_node'] = "analyze_keywords"
        
        # 模拟关键词分析
        keywords = state['topic'].split()
        enhanced = [f"{kw}_2024" for kw in keywords] + ["最新趋势", "实用指南"]
        
        state['keyword_analysis'] = {
            "primary_keywords": keywords,
            "secondary_keywords": enhanced,
            "search_volume": {kw: 1000 * (i+1) for i, kw in enumerate(keywords)},
            "competition": "medium"
        }
        
        state['execution_path'].append({
            "node": "analyze_keywords",
            "timestamp": datetime.now().isoformat(),
            "results": f"分析{len(keywords)}个主要关键词"
        })
        return state
    
    def analyze_competitors_node(state: ContentState) -> ContentState:
        """节点5：竞品分析（并行节点3）"""
        print(f"[竞品分析] 分析类似内容")
        state['nodes_executed'].append("analyze_competitors")
        state['current_node'] = "analyze_competitors"
        
        # 模拟竞品分析
        state['competitor_analysis'] = {
            "top_articles": [
                {"title": f"关于{state['topic']}的深度解析", "score": 8.5},
                {"title": f"{state['topic']}完全指南", "score": 9.0},
                {"title": f"如何掌握{state['topic']}", "score": 7.8}
            ],
            "gaps": ["缺少实践案例", "未覆盖最新发展"],
            "opportunities": ["增加案例分析", "加入实用技巧"]
        }
        
        state['execution_path'].append({
            "node": "analyze_competitors",
            "timestamp": datetime.now().isoformat(),
            "results": f"分析{len(state['competitor_analysis']['top_articles'])}篇竞品"
        })
        return state
    
    # =============== 条件节点 ===============
    
    def decide_research_depth_node(state: ContentState) -> ContentState:
        """节点6：决定研究深度（条件路由）"""
        print(f"[决策] 决定研究深度")
        state['nodes_executed'].append("decide_research_depth")
        state['current_node'] = "decide_research_depth"
        
        # 基于内容类型和目标受众决定
        if state['content_type'] == "report" and state['tone'] == "technical":
            state['next_action'] = "deep_research"
        elif state['content_type'] == "social_media":
            state['next_action'] = "quick_research"
        else:
            state['next_action'] = "standard_research"
            
        state['execution_path'].append({
            "node": "decide_research_depth",
            "timestamp": datetime.now().isoformat(),
            "decision": f"选择: {state['next_action']}"
        })
        return state
    
    # =============== 并行后处理节点 ===============
    
    def synthesize_research_node(state: ContentState) -> ContentState:
        """节点7：综合研究结果"""
        print(f"[综合] 整合所有研究结果")
        state['nodes_executed'].append("synthesize_research")
        state['current_node'] = "synthesize_research"
        
        # 整合并行处理的结果
        all_facts = state['research_results']['key_facts']
        all_keywords = list(state['keyword_analysis']['primary_keywords'])
        
        synthesis = {
            "combined_facts": all_facts + all_keywords,
            "total_sources": len(state['research_results']['sources']),
            "keyword_count": len(all_keywords),
            "competitor_count": len(state['competitor_analysis']['top_articles'])
        }
        
        # 存储到状态中
        state['research_results']['synthesis'] = synthesis
        
        state['execution_path'].append({
            "node": "synthesize_research",
            "timestamp": datetime.now().isoformat(),
            "results": f"整合{synthesis['total_sources']}个来源"
        })
        return state
    
    # =============== 内容生成节点 ===============
    
    def create_outline_node(state: ContentState) -> ContentState:
        """节点8：创建大纲"""
        print(f"[大纲] 创建内容大纲")
        state['nodes_executed'].append("create_outline")
        state['current_node'] = "create_outline"
        
        # 基于研究结果创建大纲
        sections = [
            "引言和背景",
            "核心概念解析",
            "实践应用案例",
            "最佳实践建议",
            "总结与展望"
        ]
        
        outline = f"{state['topic']} - 完整指南\n\n"
        for i, section in enumerate(sections, 1):
            outline += f"{i}. {section}\n"
            if state['research_results'].get('key_facts'):
                outline += f"   - 包含: {state['research_results']['key_facts'][0] if i <= len(state['research_results']['key_facts']) else '相关要点'}\n"
        
        state['outline'] = outline
        
        state['execution_path'].append({
            "node": "create_outline",
            "timestamp": datetime.now().isoformat(),
            "results": f"创建{len(sections)}个章节的大纲"
        })
        return state
    
    def write_draft_node(state: ContentState) -> ContentState:
        """节点9：撰写草稿"""
        print(f"[撰写] 撰写内容草稿")
        state['nodes_executed'].append("write_draft")
        state['current_node'] = "write_draft"
        
        # 模拟内容生成
        sections = state['outline'].split('\n\n')[1].split('\n')
        draft_sections = {}
        
        for i, section in enumerate(sections):
            if section.strip() and not section.startswith("   -"):
                title = section.split('. ')[1] if '. ' in section else section
                content = f"这是关于{state['topic']}的{title}部分。"
                content += f" 基于我们的研究，{state['research_results']['key_facts'][i % len(state['research_results']['key_facts'])] if state['research_results'].get('key_facts') else '这里有一些重要信息'}。"
                content += f" 对于{state['target_audience']}来说，这是非常有价值的。"
                
                draft_sections[title] = content
        
        state['draft_sections'] = draft_sections
        
        # 组合成完整草稿
        full_draft = f"# {state['topic']}\n\n"
        for title, content in draft_sections.items():
            full_draft += f"## {title}\n{content}\n\n"
        
        state['full_draft'] = full_draft
        
        state['execution_path'].append({
            "node": "write_draft",
            "timestamp": datetime.now().isoformat(),
            "results": f"撰写{len(draft_sections)}个章节，共{len(full_draft)}字符"
        })
        return state
    
    # =============== 质量评估节点 ===============
    
    def evaluate_quality_node(state: ContentState) -> ContentState:
        """节点10：评估内容质量"""
        print(f"[评估] 评估内容质量")
        state['nodes_executed'].append("evaluate_quality")
        state['current_node'] = "evaluate_quality"
        
        # 模拟质量评估
        draft_length = len(state['full_draft']) if state['full_draft'] else 0
        section_count = len(state['draft_sections']) if state['draft_sections'] else 0
        research_depth = len(state['research_results'].get('key_facts', []))
        
        scores = {
            "completeness": min(1.0, section_count / 5),
            "depth": min(1.0, research_depth / 10),
            "relevance": 0.8,
            "readability": 0.7,
            "originality": 0.6
        }
        
        avg_score = sum(scores.values()) / len(scores)
        
        state['quality_scores'] = scores
        state['quality_scores']['average'] = avg_score
        
        # 基于评分决定下一步
        if avg_score < 0.6:
            state['next_action'] = "needs_major_revision"
            state['feedback'].append("内容质量较低，需要大幅修改")
        elif avg_score < 0.8:
            state['next_action'] = "needs_minor_revision"
            state['feedback'].append("内容质量中等，需要优化")
        else:
            state['next_action'] = "ready_for_review"
            state['feedback'].append("内容质量良好")
        
        state['execution_path'].append({
            "node": "evaluate_quality",
            "timestamp": datetime.now().isoformat(),
            "results": f"平均分: {avg_score:.2f}, 决定: {state['next_action']}"
        })
        return state
    
    # =============== 循环节点 ===============
    
    def revise_content_node(state: ContentState) -> ContentState:
        """节点11：修订内容（可能循环）"""
        state['revision_count'] = state.get('revision_count', 0) + 1
        print(f"[修订] 第{state['revision_count']}次修订")
        
        state['nodes_executed'].append(f"revise_content_{state['revision_count']}")
        state['current_node'] = "revise_content"
        
        # 模拟修订：提高质量分数
        for key in state['quality_scores']:
            if key != 'average':
                # 每次修订提高5-10%
                improvement = 0.05 + (0.05 * (state['revision_count'] - 1))
                state['quality_scores'][key] = min(1.0, state['quality_scores'][key] + improvement)
        
        # 重新计算平均分
        scores = [v for k, v in state['quality_scores'].items() if k != 'average']
        state['quality_scores']['average'] = sum(scores) / len(scores)
        
        # 检查是否继续修订
        if state['revision_count'] >= 3:
            state['should_continue'] = False
            state['next_action'] = "finalize"
            state['feedback'].append(f"已达到最大修订次数({state['revision_count']})")
        elif state['quality_scores']['average'] >= 0.85:
            state['should_continue'] = False
            state['next_action'] = "finalize"
            state['feedback'].append(f"质量达标({state['quality_scores']['average']:.2f})，停止修订")
        else:
            state['should_continue'] = True
            state['next_action'] = "continue_revision"
            state['feedback'].append(f"需要继续修订，当前分数{state['quality_scores']['average']:.2f}")
        
        state['execution_path'].append({
            "node": "revise_content",
            "timestamp": datetime.now().isoformat(),
            "revision": state['revision_count'],
            "score": state['quality_scores']['average'],
            "decision": f"继续修订: {state['should_continue']}"
        })
        return state
    
    # =============== 最终处理节点 ===============
    
    def finalize_content_node(state: ContentState) -> ContentState:
        """节点12：最终处理"""
        print(f"[最终处理] 完成内容创作")
        state['nodes_executed'].append("finalize")
        state['current_node'] = "finalize"
        state['end_time'] = datetime.now().isoformat()
        
        # 决定是否需要人工审核
        if state['quality_scores']['average'] < 0.7 or state['content_type'] == "report":
            state['needs_human_review'] = True
            review_note = "需要人工审核"
        else:
            state['needs_human_review'] = False
            review_note = "自动审核通过"
        
        state['execution_path'].append({
            "node": "finalize",
            "timestamp": state['end_time'],
            "action": f"完成处理，{review_note}",
            "total_nodes": len(state['nodes_executed']),
            "total_time": "计算中..."
        })
        return state
    
    # =============== 添加所有节点到图 ===============
    
    # 添加节点
    builder.add_node("initialize", initialize_node)
    builder.add_node("analyze_requirements", analyze_requirements_node)
    builder.add_node("research_topic", research_topic_node)
    builder.add_node("analyze_keywords", analyze_keywords_node)
    builder.add_node("analyze_competitors", analyze_competitors_node)
    builder.add_node("decide_research_depth", decide_research_depth_node)
    builder.add_node("synthesize_research", synthesize_research_node)
    builder.add_node("create_outline", create_outline_node)
    builder.add_node("write_draft", write_draft_node)
    builder.add_node("evaluate_quality", evaluate_quality_node)
    builder.add_node("revise_content", revise_content_node)
    builder.add_node("finalize", finalize_content_node)
    
    # =============== 设置图结构 ===============
    
    # 设置入口点
    builder.set_entry_point("initialize")
    
    # 顺序边
    builder.add_edge("initialize", "analyze_requirements")
    
    # 条件边：基于需求分析决定下一步
    def route_after_requirements(state: ContentState) -> str:
        return state.get('next_action', 'parallel_research')
    
    builder.add_conditional_edges(
        "analyze_requirements",
        route_after_requirements,
        {
            "parallel_research": "decide_research_depth",
            "quick_research": "research_topic",  # 跳过并行处理
            "direct_writing": "create_outline"  # 跳过研究阶段
        }
    )
    
    # 研究深度决策后的分支
    def route_after_research_decision(state: ContentState) -> str:
        return state.get('next_action', 'standard_research')
    
    builder.add_conditional_edges(
        "decide_research_depth",
        route_after_research_decision,
        {
            "deep_research": "parallel_research_branch",
            "standard_research": "parallel_research_branch",
            "quick_research": "research_topic"
        }
    )
    
    # =============== 并行处理分支 ===============
    
    # 创建并行处理子图
    from langgraph.graph import START
    
    # 方法1：使用add_edge实现隐式并行
    builder.add_edge("research_topic", "synthesize_research")
    builder.add_edge("analyze_keywords", "synthesize_research")
    builder.add_edge("analyze_competitors", "synthesize_research")
    
    # 方法2：显式创建并行分支
    # 这里我们创建一个并行研究分支的入口
    builder.add_edge("parallel_research_branch", "research_topic")
    builder.add_edge("parallel_research_branch", "analyze_keywords")
    builder.add_edge("parallel_research_branch", "analyze_competitors")
    
    # 为了简化，我们在这里添加一个虚拟节点来触发并行
    def start_parallel_research(state: ContentState) -> ContentState:
        """启动并行研究的虚拟节点"""
        state['nodes_executed'].append("start_parallel_research")
        return state
    
    builder.add_node("parallel_research_branch", start_parallel_research)
    
    # =============== 主要处理流程 ===============
    
    # 从综合研究到内容创建
    builder.add_edge("synthesize_research", "create_outline")
    builder.add_edge("create_outline", "write_draft")
    builder.add_edge("write_draft", "evaluate_quality")
    
    # =============== 质量反馈循环 ===============
    
    # 条件边：基于质量评估决定是否修订
    def route_after_quality_check(state: ContentState) -> str:
        action = state.get('next_action', 'ready_for_review')
        if "revision" in action:
            return "revise_content"
        else:
            return "finalize"
    
    builder.add_conditional_edges(
        "evaluate_quality",
        route_after_quality_check,
        {
            "needs_major_revision": "revise_content",
            "needs_minor_revision": "revise_content",
            "ready_for_review": "finalize"
        }
    )
    
    # 修订循环：检查是否需要继续修订
    def route_after_revision(state: ContentState) -> str:
        if state.get('should_continue', False):
            return "evaluate_quality"  # 回到质量评估，继续循环
        else:
            return "finalize"
    
    builder.add_conditional_edges(
        "revise_content",
        route_after_revision,
        {
            "evaluate_quality": "evaluate_quality",
            "finalize": "finalize"
        }
    )
    
    # =============== 结束 ===============
    
    builder.add_edge("finalize", END)
    
    # 编译图
    graph = builder.compile()
    
    return graph

# ======================
# 3. 可视化图结构
# ======================

def visualize_graph_structure(graph):
    """可视化图结构"""
    print("\n" + "="*60)
    print("图结构分析")
    print("="*60)
    
    # 获取图信息
    print(f"\n📊 图基本信息:")
    print(f"  节点数量: {len(graph.nodes)}")
    print(f"  边数量: {len(graph.edges)}")
    
    # 打印所有节点
    print(f"\n🏷️  所有节点:")
    for i, node in enumerate(graph.nodes.keys(), 1):
        print(f"  {i:2d}. {node}")
    
    # 打印边关系
    print(f"\n🔗 边关系:")
    edges_by_source = {}
    for edge in graph.edges:
        source, target = edge
        if source not in edges_by_source:
            edges_by_source[source] = []
        edges_by_source[source].append(target)
    
    for source, targets in edges_by_source.items():
        print(f"  {source} -> {', '.join(targets)}")
    
    # 识别关键结构
    print(f"\n🔄 识别出的结构模式:")
    
    # 检查并行结构
    parallel_candidates = ["research_topic", "analyze_keywords", "analyze_competitors"]
    common_target = "synthesize_research"
    
    parallel_edges = []
    for edge in graph.edges:
        if edge[1] == common_target and edge[0] in parallel_candidates:
            parallel_edges.append(edge[0])
    
    if len(parallel_edges) > 1:
        print(f"  ✅ 并行处理: {', '.join(parallel_edges)} -> {common_target}")
    
    # 检查循环结构
    cycle_nodes = ["evaluate_quality", "revise_content"]
    has_cycle = False
    for edge in graph.edges:
        if edge[0] in cycle_nodes and edge[1] in cycle_nodes and edge[0] != edge[1]:
            has_cycle = True
            print(f"  ✅ 循环结构: {edge[0]} <-> {edge[1]}")
    
    # 检查条件分支
    conditional_sources = []
    for node in graph.nodes:
        if hasattr(graph, '_graph') and node in graph._graph:
            successors = list(graph._graph.successors(node))
            if len(successors) > 1:
                conditional_sources.append(node)
    
    if conditional_sources:
        print(f"  ✅ 条件分支节点: {', '.join(conditional_sources)}")

# ======================
# 4. 运行示例
# ======================

def run_content_workflow_examples():
    """运行内容创作工作流示例"""
    
    # 创建图
    graph = create_complex_content_workflow()
    
    print("="*60)
    print("智能内容创作系统 - 图结构编排演示")
    print("="*60)
    
    # 示例1：完整流程（技术报告）
    print("\n📝 示例1: 技术报告创作 (完整流程)")
    print("-"*40)
    
    state_tech_report = {
        "topic": "机器学习模型部署",
        "target_audience": "技术团队",
        "content_type": "report",
        "tone": "technical",
        "nodes_executed": [],
        "current_node": "",
        "research_results": {},
        "keyword_analysis": {},
        "competitor_analysis": {},
        "outline": None,
        "draft_sections": {},
        "full_draft": None,
        "quality_scores": {},
        "feedback": [],
        "revision_count": 0,
        "next_action": None,
        "should_continue": True,
        "needs_human_review": False,
        "start_time": "",
        "end_time": None,
        "execution_path": []
    }
    
    try:
        result_tech = graph.invoke(state_tech_report)
        
        print(f"\n✅ 处理完成!")
        print(f"执行路径: {' → '.join(result_tech['nodes_executed'])}")
        print(f"节点总数: {len(result_tech['nodes_executed'])}")
        print(f"修订次数: {result_tech['revision_count']}")
        print(f"最终质量: {result_tech['quality_scores'].get('average', 0):.2f}")
        print(f"需要人工审核: {result_tech['needs_human_review']}")
        
        # 显示执行路径详情
        print(f"\n📋 执行详情:")
        for step in result_tech['execution_path'][:5]:  # 只显示前5步
            print(f"  {step['node']}: {step.get('decision', step.get('results', step.get('action', '')))}")
        if len(result_tech['execution_path']) > 5:
            print(f"  ... 还有{len(result_tech['execution_path'])-5}个步骤")
            
    except Exception as e:
        print(f"❌ 执行错误: {e}")
    
    # 示例2：快速流程（社交媒体）
    print("\n\n📱 示例2: 社交媒体内容 (快速流程)")
    print("-"*40)
    
    state_social = {
        "topic": "AI工具推荐",
        "target_audience": "普通用户",
        "content_type": "social_media",
        "tone": "casual",
        "nodes_executed": [],
        "current_node": "",
        "research_results": {},
        "keyword_analysis": {},
        "competitor_analysis": {},
        "outline": None,
        "draft_sections": {},
        "full_draft": None,
        "quality_scores": {},
        "feedback": [],
        "revision_count": 0,
        "next_action": None,
        "should_continue": True,
        "needs_human_review": False,
        "start_time": "",
        "end_time": None,
        "execution_path": []
    }
    
    try:
        result_social = graph.invoke(state_social)
        
        print(f"\n✅ 处理完成!")
        print(f"执行路径: {' → '.join(result_social['nodes_executed'])}")
        print(f"节点总数: {len(result_social['nodes_executed'])}")
        print(f"修订次数: {result_social['revision_count']}")
        print(f"最终质量: {result_social['quality_scores'].get('average', 0):.2f}")
        print(f"需要人工审核: {result_social['needs_human_review']}")
        
        # 比较两个示例的路径差异
        tech_nodes = set(result_tech['nodes_executed'])
        social_nodes = set(result_social['nodes_executed'])
        
        print(f"\n🔍 流程差异分析:")
        print(f"  技术报告独有的节点: {tech_nodes - social_nodes}")
        print(f"  社交媒体独有的节点: {social_nodes - tech_nodes}")
        print(f"  共同的节点: {tech_nodes & social_nodes}")
        
    except Exception as e:
        print(f"❌ 执行错误: {e}")
    
    # 可视化图结构
    visualize_graph_structure(graph)
    
    return graph, result_tech, result_social

# ======================
# 5. 高级图编排模式
# ======================

def demonstrate_advanced_patterns():
    """演示高级图编排模式"""
    
    print("\n" + "="*60)
    print("高级图编排模式演示")
    print("="*60)
    
    # 模式1：动态图构建
    print("\n🔧 模式1: 动态图构建")
    
    def create_dynamic_workflow(include_research=True, include_review=True):
        """根据参数动态构建图"""
        builder = StateGraph(ContentState)
        
        # 总是包含的节点
        builder.add_node("start", lambda s: {**s, "nodes_executed": s.get("nodes_executed", []) + ["start"]})
        builder.add_node("plan", lambda s: {**s, "nodes_executed": s.get("nodes_executed", []) + ["plan"]})
        
        # 条件包含研究节点
        if include_research:
            builder.add_node("research", lambda s: {**s, "nodes_executed": s.get("nodes_executed", []) + ["research"]})
            builder.add_edge("plan", "research")
            last_node = "research"
        else:
            last_node = "plan"
        
        # 条件包含审核节点
        if include_review:
            builder.add_node("review", lambda s: {**s, "nodes_executed": s.get("nodes_executed", []) + ["review"]})
            builder.add_edge(last_node, "review")
            last_node = "review"
        
        builder.add_node("finish", lambda s: {**s, "nodes_executed": s.get("nodes_executed", []) + ["finish"]})
        builder.add_edge(last_node, "finish")
        builder.add_edge("finish", END)
        
        builder.set_entry_point("start")
        return builder.compile()
    
    # 测试不同配置
    configs = [
        ("完整流程", True, True),
        ("快速流程", False, True),
        ("自动流程", True, False),
        ("极简流程", False, False)
    ]
    
    for name, research, review in configs:
        graph = create_dynamic_workflow(include_research=research, include_review=review)
        state = {"nodes_executed": []}
        result = graph.invoke(state)
        print(f"  {name}: {len(result['nodes_executed'])}个节点，路径: {' → '.join(result['nodes_executed'])}")
    
    # 模式2：嵌套子图
    print("\n🔗 模式2: 嵌套子图")
    
    # 创建研究子图
    research_builder = StateGraph(ContentState)
    
    def gather_sources(state):
        return {**state, "research_step": "gathered_sources"}
    
    def analyze_sources(state):
        return {**state, "research_step": "analyzed_sources"}
    
    def synthesize(state):
        return {**state, "research_step": "synthesized"}
    
    research_builder.add_node("gather", gather_sources)
    research_builder.add_node("analyze", analyze_sources)
    research_builder.add_node("synthesize", synthesize)
    
    research_builder.add_edge("gather", "analyze")
    research_builder.add_edge("analyze", "synthesize")
    research_builder.set_entry_point("gather")
    
    research_graph = research_builder.compile()
    
    # 在主图中使用子图
    main_builder = StateGraph(ContentState)
    
    main_builder.add_node("preprocess", lambda s: {**s, "step": "preprocessed"})
    main_builder.add_node("research_phase", research_graph)  # 嵌套子图作为节点
    main_builder.add_node("postprocess", lambda s: {**s, "step": "postprocessed"})
    
    main_builder.add_edge("preprocess", "research_phase")
    main_builder.add_edge("research_phase", "postprocess")
    main_builder.set_entry_point("preprocess")
    
    main_graph = main_builder.compile()
    
    test_state = {"step": "", "research_step": ""}
    result = main_graph.invoke(test_state)
    print(f"  嵌套子图执行结果: 主步骤={result['step']}, 研究步骤={result['research_step']}")
    
    # 模式3：循环直到条件满足
    print("\n🔄 模式3: 条件循环")
    
    loop_builder = StateGraph(ContentState)
    
    iteration = 0
    
    def loop_node(state):
        nonlocal iteration
        iteration += 1
        quality = 0.5 + (iteration * 0.1)  # 模拟质量提升
        return {**state, "iteration": iteration, "quality": quality}
    
    loop_builder.add_node("improve", loop_node)
    
    def should_continue(state):
        # 如果质量小于0.8，继续循环
        if state.get("quality", 0) < 0.8:
            return "improve"
        else:
            return END
    
    loop_builder.add_conditional_edges(
        "improve",
        should_continue
    )
    
    loop_builder.set_entry_point("improve")
    loop_graph = loop_builder.compile()
    
    loop_state = {"iteration": 0, "quality": 0}
    loop_result = loop_graph.invoke(loop_state)
    print(f"  循环次数: {loop_result['iteration']}, 最终质量: {loop_result['quality']:.2f}")

# ======================
# 6. 主执行函数
# ======================

if __name__ == "__main__":
    # 运行内容创作工作流
    graph, tech_result, social_result = run_content_workflow_examples()
    
    # 演示高级模式
    demonstrate_advanced_patterns()
    
    # 总结图编排优势
    print("\n" + "="*60)
    print("LangGraph图结构编排的核心优势")
    print("="*60)
    
    advantages = [
        ("灵活的结构", "支持顺序、并行、条件、循环等多种结构"),
        ("可视化设计", "像设计流程图一样直观地编排工作流"),
        ("动态路由", "基于状态内容智能决定执行路径"),
        ("模块化", "节点可复用，子图可嵌套"),
        ("易于调试", "完整的执行路径追踪和状态监控"),
        ("生产就绪", "支持错误处理、重试、持久化等"),
    ]
    
    for title, desc in advantages:
        print(f"✅ {title}: {desc}")
    
    print("\n🎯 实际应用场景:")
    scenarios = [
        "智能客服的多轮对话管理",
        "内容创作的复杂工作流",
        "数据处理的多阶段管道",
        "决策支持系统的条件逻辑",
        "多智能体协作的编排",
        "需要人工干预的混合工作流"
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"  {i}. {scenario}")
```

## LangGraph 图结构编排的核心功能详解

### 1. **节点与边的基本编排**

```python
# 添加节点
builder.add_node("节点名称", 节点函数)

# 添加顺序边
builder.add_edge("源节点", "目标节点")

# 设置入口点
builder.set_entry_point("起始节点")
```

### 2. **条件边（智能路由）**

```python
def 路由决策函数(state):
    """基于状态内容决定下一个节点"""
    if state['条件'] == '值1':
        return "节点A"
    elif state['条件'] == '值2':
        return "节点B"
    else:
        return "默认节点"

builder.add_conditional_edges(
    "决策节点",
    路由决策函数,  # 路由逻辑
    {
        "节点A": "节点A",
        "节点B": "节点B",
        "默认节点": "默认节点"
    }
)
```

**应用场景**：
- 基于内容类型选择不同处理路径
- 根据质量评分决定是否需要修订
- 基于用户输入决定响应策略

### 3. **并行处理结构**

```python
# 方法1：多源单汇（隐式并行）
builder.add_edge("研究节点", "综合节点")
builder.add_edge("分析节点", "综合节点")
builder.add_edge("竞品节点", "综合节点")

# 方法2：显式并行分支
builder.add_node("并行入口", 启动并行函数)
builder.add_edge("并行入口", "研究节点")
builder.add_edge("并行入口", "分析节点")
builder.add_edge("并行入口", "竞品节点")
```

**特点**：
- 多个节点可以并行执行
- 所有并行分支完成后汇聚到下一个节点
- 提高处理效率

### 4. **循环结构（迭代优化）**

```python
# 质量评估-修订循环
builder.add_conditional_edges(
    "修订节点",
    lambda s: "质量评估节点" if s['需要继续'] else "最终节点",
    {
        "质量评估节点": "质量评估节点",
        "最终节点": "最终节点"
    }
)
```

**应用场景**：
- 内容质量迭代优化
- 对话多轮澄清
- 参数调优循环

### 5. **嵌套子图（模块化）**

```python
# 创建子图
sub_builder = StateGraph(StateType)
sub_builder.add_node(...)
sub_graph = sub_builder.compile()

# 在主图中使用子图
main_builder.add_node("子图节点", sub_graph)
```

**优势**：
- 复杂工作流分解为可管理的模块
- 子图可复用
- 提高代码可维护性

### 6. **动态图构建**

```python
def 动态创建图(配置参数):
    builder = StateGraph(StateType)
    
    # 根据配置动态添加节点
    if 配置参数['包含研究']:
        builder.add_node("研究节点", 研究函数)
    
    if 配置参数['包含审核']:
        builder.add_node("审核节点", 审核函数)
    
    # 动态连接边
    # ...
    
    return builder.compile()
```

## 图结构编排的设计模式

### 模式1：**管道模式**
```
输入 → 预处理 → 处理 → 后处理 → 输出
```
适用于线性数据处理流程。

### 模式2：**分支模式**
```
         → 分支A处理 → 
决策节点                 汇聚节点
         → 分支B处理 → 
```
适用于条件处理流程。

### 模式3：**并行汇聚模式**
```
         → 并行任务1 → 
入口节点 → 并行任务2 → 汇聚节点 → 后续处理
         → 并行任务3 → 
```
适用于可并行处理的任务。

### 模式4：**循环优化模式**
```
开始 → 处理 → 评估 → 需要优化 → 优化处理
                 ↓               ↑
                完成 ← 质量达标 ← 
```
适用于迭代改进的场景。

### 模式5：**人工干预模式**
```
自动处理 → 需要审核 → 等待人工输入 → 继续处理
    ↓                     ↑
   完成 ← 无需审核 ← 
```
适用于人机协作场景。

## 实际应用案例

### 案例1：**智能客服系统**
```python
用户输入 → 意图识别 → 知识库查询 → 生成回复 → 情感分析 → 满意度检查
                                  ↓                     ↑
                                 人工接管 ← 不满意 ←
```

### 案例2：**内容审核流水线**
```python
内容输入 → 敏感词检测 → 图像识别 → 抄袭检测 → 质量评估
      ↓         ↓          ↓          ↓
  违规处理  违规处理   违规处理    分级处理
```

### 案例3：**数据ETL流程**
```python
数据提取 → 并行清洗 → 数据转换 → 质量验证 → 需要修正 → 数据修正
              ↓         ↓         ↓                    ↑
          清洗1     清洗2     验证通过 → 加载输出
```

## 调试和监控

```python
# 跟踪执行路径
state['execution_path'].append({
    "node": "当前节点",
    "timestamp": "时间戳",
    "decision": "做出的决策",
    "results": "处理结果"
})

# 可视化执行流
print(f"执行路径: {' → '.join(state['nodes_executed'])}")

# 分析性能
print(f"节点执行次数: {len(state['nodes_executed'])}")
print(f"循环次数: {state['revision_count']}")
```

## 最佳实践

1. **保持节点单一职责**：每个节点只做一件事
2. **合理设计状态结构**：状态字段要反映业务流程
3. **使用条件边实现智能路由**：避免硬编码的逻辑分支
4. **考虑并行性**：识别可以并行执行的任务
5. **添加适当的循环控制**：避免无限循环
6. **实现错误处理**：为关键节点添加异常处理
7. **添加监控点**：在关键节点记录状态信息

## 总结

LangGraph的图结构编排功能提供了：

1. **可视化的工作流设计**：像画流程图一样设计复杂业务逻辑
2. **灵活的控制流**：支持顺序、分支、并行、循环等结构
3. **基于状态的智能路由**：根据处理结果动态决定执行路径
4. **模块化设计**：支持子图嵌套和节点复用
5. **完整的可观测性**：可以追踪整个执行过程

这种基于图的计算模型特别适合编排复杂的AI工作流，使得开发者可以用声明式的方式描述复杂的业务逻辑，同时保持代码的清晰性和可维护性。无论是简单的线性流程还是复杂的多智能体协作系统，LangGraph都能提供强大的支持。