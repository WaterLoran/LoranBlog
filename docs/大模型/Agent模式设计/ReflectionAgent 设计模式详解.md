# ReflectionAgent 设计模式详解

## 一、Reflection模式的核心原理

### 1.1 什么是Reflection模式？
**Reflection（反思）模式** 是一种让AI Agent能够**自我评估、自我批评和自我改进**的设计模式。通过让Agent审视自己的输出，识别问题并修正，从而提高回答质量。

### 1.2 核心思想：生成-反思-改进循环
```
初始问题
    ↓
[生成] → 生成初始答案
    ↓
[反思] → 批判性评估答案质量
    ↓
[识别] → 识别问题、不足、错误
    ↓
[改进] → 修正和优化答案
    ↓
[评估] → 是否满足质量标准？
    ↓
重复直到质量达标
```

### 1.3 三阶段反思模型
1. **问题分析阶段**: 分析问题要求，明确成功标准
2. **自我批判阶段**: 从多个维度评估自身输出
3. **迭代改进阶段**: 基于批判意见进行修正

## 二、完整代码实现

```python
import re
from typing import Dict, List, Optional, Any, Tuple, TypedDict
from dataclasses import dataclass, field
from enum import Enum
import asyncio
from datetime import datetime
from pydantic import BaseModel, Field

# 导入必要的库
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

# ==================== 数据结构定义 ====================
class ReflectionDimension(Enum):
    """反思维度枚举"""
    ACCURACY = "准确性"      # 事实是否正确
    COMPLETENESS = "完整性"   # 信息是否完整
    CLARITY = "清晰度"       # 表达是否清晰
    RELEVANCE = "相关性"     # 是否切题
    LOGIC = "逻辑性"        # 论证是否合理
    STRUCTURE = "结构"      # 结构是否合理
    DEPTH = "深度"          # 分析是否深入
    CREATIVITY = "创造性"    # 是否有创新见解

@dataclass
class Critique:
    """批判意见"""
    dimension: ReflectionDimension
    score: float  # 0-1分
    comment: str  # 具体意见
    suggestion: str  # 改进建议
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "dimension": self.dimension.value,
            "score": self.score,
            "comment": self.comment,
            "suggestion": self.suggestion
        }

@dataclass
class ReflectionIteration:
    """单次反思迭代记录"""
    iteration_number: int
    answer_before: str
    critiques: List[Critique]
    overall_score: float
    improvement_plan: str
    answer_after: str
    quality_improvement: float  # 质量提升百分比
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "iteration": self.iteration_number,
            "answer_before": self.answer_before[:200] + "..." if len(self.answer_before) > 200 else self.answer_before,
            "answer_after": self.answer_after[:200] + "..." if len(self.answer_after) > 200 else self.answer_after,
            "overall_score": self.overall_score,
            "quality_improvement": self.quality_improvement,
            "critique_count": len(self.critiques),
            "timestamp": self.timestamp.isoformat()
        }

class ReflectionState:
    """反思状态管理"""
    
    def __init__(self, problem: str, max_iterations: int = 3):
        self.problem = problem
        self.max_iterations = max_iterations
        self.current_iteration = 0
        self.iterations: List[ReflectionIteration] = []
        self.final_answer: Optional[str] = None
        self.is_complete = False
        self.quality_history: List[float] = []
        self.start_time = datetime.now()
        
    def add_iteration(self, iteration: ReflectionIteration):
        """添加一次迭代记录"""
        self.iterations.append(iteration)
        self.current_iteration += 1
        self.quality_history.append(iteration.overall_score)
        
        # 检查是否应该停止
        if (self.current_iteration >= self.max_iterations or 
            iteration.quality_improvement < 0.05):  # 改进小于5%
            self.is_complete = True
            self.final_answer = iteration.answer_after
    
    def should_continue(self) -> bool:
        """是否应该继续反思"""
        return not self.is_complete and self.current_iteration < self.max_iterations
    
    def get_last_answer(self) -> str:
        """获取上一次的答案"""
        if self.iterations:
            return self.iterations[-1].answer_after
        return ""
    
    def get_progress_summary(self) -> Dict[str, Any]:
        """获取进度摘要"""
        if not self.iterations:
            return {}
        
        first_score = self.quality_history[0]
        last_score = self.quality_history[-1]
        
        return {
            "total_iterations": self.current_iteration,
            "initial_quality": first_score,
            "final_quality": last_score,
            "quality_improvement": last_score - first_score,
            "improvement_rate": ((last_score - first_score) / first_score) * 100 if first_score > 0 else 0,
            "time_elapsed": (datetime.now() - self.start_time).total_seconds()
        }

# ==================== 反思评估器 ====================
class ReflectionEvaluator:
    """反思评估器：从多个维度评估答案质量"""
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.1,  # 低温度确保客观评估
            max_tokens=1000
        )
        
        # 定义评估标准
        self.evaluation_criteria = {
            ReflectionDimension.ACCURACY: {
                "description": "事实、数据和信息的准确性",
                "questions": [
                    "答案中的事实是否准确无误？",
                    "是否有错误或误导性信息？",
                    "数据来源是否可靠？"
                ]
            },
            ReflectionDimension.COMPLETENESS: {
                "description": "信息的完整性和全面性",
                "questions": [
                    "是否涵盖了问题的所有方面？",
                    "是否有重要信息被遗漏？",
                    "是否考虑了不同的观点？"
                ]
            },
            ReflectionDimension.CLARITY: {
                "description": "表达的清晰度和易懂性",
                "questions": [
                    "表达是否清晰易懂？",
                    "术语是否恰当解释？",
                    "结构是否清晰，逻辑是否连贯？"
                ]
            },
            ReflectionDimension.RELEVANCE: {
                "description": "与问题的相关性",
                "questions": [
                    "是否直接回答了问题？",
                    "是否有不相关或离题的内容？",
                    "重点是否突出？"
                ]
            },
            ReflectionDimension.LOGIC: {
                "description": "论证的逻辑性和合理性",
                "questions": [
                    "论证过程是否合乎逻辑？",
                    "结论是否有充分的依据？",
                    "推理是否存在漏洞？"
                ]
            },
            ReflectionDimension.STRUCTURE: {
                "description": "答案的组织结构",
                "questions": [
                    "结构是否合理？",
                    "段落之间过渡是否自然？",
                    "是否有清晰的引言和结论？"
                ]
            },
            ReflectionDimension.DEPTH: {
                "description": "分析的深度和洞察力",
                "questions": [
                    "分析是否深入？",
                    "是否有独到见解？",
                    "是否触及问题的本质？"
                ]
            },
            ReflectionDimension.CREATIVITY: {
                "description": "创新性和新颖性",
                "questions": [
                    "是否有创新性观点？",
                    "解决方案是否有新意？",
                    "是否突破了常规思维？"
                ]
            }
        }
    
    def _build_evaluation_prompt(self, problem: str, answer: str) -> str:
        """构建评估提示词"""
        
        criteria_text = ""
        for dimension, info in self.evaluation_criteria.items():
            questions = "\n".join([f"  - {q}" for q in info["questions"]])
            criteria_text += f"{dimension.value}（{info['description']}）:\n{questions}\n\n"
        
        prompt = f"""请从以下维度对答案进行全面评估：

原始问题：{problem}

待评估的答案：
{answer}

评估标准（请对每个维度给出0-1分的评分和具体意见）：
{criteria_text}

请按照以下JSON格式输出：
{{
  "overall_score": <总体评分0-1>,
  "critiques": [
    {{
      "dimension": "<维度名称>",
      "score": <0-1分>,
      "comment": "<具体评价>",
      "suggestion": "<改进建议>"
    }},
    ... 更多维度
  ],
  "summary": "<总体评价摘要>",
  "improvement_plan": "<具体的改进计划>"
}}

注意：评分要严格客观，改进建议要具体可行。"""
        
        return prompt
    
    async def evaluate_answer(self, problem: str, answer: str) -> Dict[str, Any]:
        """评估答案质量"""
        
        prompt = self._build_evaluation_prompt(problem, answer)
        
        # 创建JSON解析器
        parser = JsonOutputParser()
        
        # 构建评估链
        evaluation_chain = (
            ChatPromptTemplate.from_messages([
                SystemMessage(content="你是一个严格的质量评估专家。"),
                HumanMessage(content=prompt)
            ])
            | self.llm
            | parser
        )
        
        try:
            result = await evaluation_chain.ainvoke({})
            
            # 将结果转换为Critique对象列表
            critiques = []
            for crit_dict in result.get("critiques", []):
                try:
                    dimension_name = crit_dict.get("dimension", "")
                    dimension = None
                    for dim in ReflectionDimension:
                        if dim.value == dimension_name:
                            dimension = dim
                            break
                    
                    if dimension:
                        critique = Critique(
                            dimension=dimension,
                            score=float(crit_dict.get("score", 0)),
                            comment=crit_dict.get("comment", ""),
                            suggestion=crit_dict.get("suggestion", "")
                        )
                        critiques.append(critique)
                except Exception as e:
                    print(f"解析批判维度时出错: {e}")
                    continue
            
            return {
                "success": True,
                "overall_score": float(result.get("overall_score", 0)),
                "critiques": critiques,
                "summary": result.get("summary", ""),
                "improvement_plan": result.get("improvement_plan", ""),
                "raw_result": result
            }
            
        except Exception as e:
            print(f"评估过程中出错: {e}")
            return {
                "success": False,
                "error": str(e),
                "overall_score": 0.5,
                "critiques": [],
                "summary": "评估失败",
                "improvement_plan": "无法生成改进计划"
            }

# ==================== 反思改进器 ====================
class ReflectionImprover:
    """反思改进器：基于批判意见改进答案"""
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.3,  # 中等温度平衡创造性和准确性
            max_tokens=2000
        )
    
    def _build_improvement_prompt(self, problem: str, 
                                  current_answer: str,
                                  evaluation_result: Dict[str, Any]) -> str:
        """构建改进提示词"""
        
        critiques_text = ""
        for critique in evaluation_result.get("critiques", []):
            critiques_text += f"• {critique.dimension.value}（评分: {critique.score:.2f}）:\n"
            critiques_text += f"  评价: {critique.comment}\n"
            critiques_text += f"  建议: {critique.suggestion}\n\n"
        
        prompt = f"""请根据评估意见改进以下答案：

原始问题：{problem}

当前答案（需要改进）：
{current_answer}

评估意见：
{critiques_text}

总体评价：{evaluation_result.get('summary', '')}

改进计划：{evaluation_result.get('improvement_plan', '')}

请生成改进后的答案，要求：
1. 针对每个批判意见进行改进
2. 保持原有的优点
3. 确保改进后的答案更准确、更完整、更清晰
4. 可以重组结构，但不要改变原意
5. 如果原答案基本正确，只需优化表达

改进后的答案："""
        
        return prompt
    
    async def improve_answer(self, problem: str, 
                            current_answer: str,
                            evaluation_result: Dict[str, Any]) -> str:
        """改进答案"""
        
        prompt = self._build_improvement_prompt(
            problem, current_answer, evaluation_result
        )
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            print(f"改进过程中出错: {e}")
            return current_answer  # 返回原答案作为降级策略

# ==================== 反思Agent核心实现 ====================
class ReflectionAgent:
    """反思Agent：完整的生成-反思-改进循环"""
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
        """
        初始化反思Agent
        
        Args:
            model_name: 使用的LLM模型名称
        """
        # 使用不同的模型或温度设置不同组件
        self.generator_llm = ChatOpenAI(
            model=model_name,
            temperature=0.7,  # 较高温度鼓励创造性
            max_tokens=1500
        )
        self.evaluator = ReflectionEvaluator(model_name)
        self.improver = ReflectionImprover(model_name)
        
        # 初始化组件
        self._init_prompts()
    
    def _init_prompts(self):
        """初始化提示词模板"""
        
        # 初始答案生成提示词
        self.generation_prompt = """你是一个知识渊博的专家。请全面、深入地回答以下问题：

问题：{problem}

请提供详细、准确、结构良好的答案。确保：
1. 事实准确无误
2. 覆盖问题的各个方面
3. 逻辑清晰，论证充分
4. 表达专业但易懂

你的答案："""
        
        # 质量评估标准
        self.quality_standards = {
            "excellent": 0.9,  # 优秀阈值
            "good": 0.7,       # 良好阈值
            "acceptable": 0.5   # 可接受阈值
        }
    
    async def generate_initial_answer(self, problem: str) -> str:
        """生成初始答案"""
        prompt = self.generation_prompt.format(problem=problem)
        
        try:
            response = await self.generator_llm.ainvoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            print(f"生成初始答案时出错: {e}")
            return f"无法生成答案：{str(e)}"
    
    def _calculate_quality_improvement(self, old_score: float, new_score: float) -> float:
        """计算质量改进百分比"""
        if old_score == 0:
            return 1.0 if new_score > 0 else 0.0
        return (new_score - old_score) / old_score
    
    async def perform_reflection_iteration(self, state: ReflectionState) -> ReflectionIteration:
        """执行一次反思迭代"""
        
        print(f"\n🔄 第 {state.current_iteration + 1} 次反思迭代")
        
        # 获取当前答案（如果是第一次迭代，先生成初始答案）
        if state.current_iteration == 0:
            print("   生成初始答案...")
            current_answer = await self.generate_initial_answer(state.problem)
        else:
            current_answer = state.get_last_answer()
        
        print(f"   当前答案长度: {len(current_answer)} 字符")
        
        # 评估答案质量
        print("   评估答案质量...")
        evaluation_result = await self.evaluator.evaluate_answer(
            state.problem, current_answer
        )
        
        if not evaluation_result["success"]:
            print(f"   ⚠️ 评估失败: {evaluation_result.get('error', '未知错误')}")
            # 如果评估失败，使用默认值
            evaluation_result["overall_score"] = 0.5
            evaluation_result["critiques"] = []
            evaluation_result["improvement_plan"] = "无法生成改进计划"
        
        overall_score = evaluation_result["overall_score"]
        print(f"   当前质量评分: {overall_score:.3f}")
        
        # 显示主要批判意见
        if evaluation_result["critiques"]:
            print(f"   收到 {len(evaluation_result['critiques'])} 条批判意见")
            for critique in evaluation_result["critiques"][:2]:  # 只显示前两条
                if critique.score < 0.7:  # 只显示低分项
                    print(f"   • {critique.dimension.value}: {critique.score:.2f} - {critique.comment[:50]}...")
        
        # 检查是否已经达到质量要求
        if overall_score >= self.quality_standards["excellent"]:
            print("   ✅ 已达到优秀标准，停止反思")
            state.is_complete = True
            state.final_answer = current_answer
            
            return ReflectionIteration(
                iteration_number=state.current_iteration + 1,
                answer_before=current_answer,
                critiques=evaluation_result["critiques"],
                overall_score=overall_score,
                improvement_plan="已达到优秀标准，无需改进",
                answer_after=current_answer,
                quality_improvement=0.0
            )
        
        # 如果不需要改进，直接返回
        if state.current_iteration >= state.max_iterations:
            return ReflectionIteration(
                iteration_number=state.current_iteration + 1,
                answer_before=current_answer,
                critiques=evaluation_result["critiques"],
                overall_score=overall_score,
                improvement_plan="达到最大迭代次数",
                answer_after=current_answer,
                quality_improvement=0.0
            )
        
        # 改进答案
        print("   改进答案...")
        improved_answer = await self.improver.improve_answer(
            state.problem,
            current_answer,
            evaluation_result
        )
        
        # 评估改进后的答案
        improved_evaluation = await self.evaluator.evaluate_answer(
            state.problem, improved_answer
        )
        
        if improved_evaluation["success"]:
            improved_score = improved_evaluation["overall_score"]
            quality_improvement = self._calculate_quality_improvement(
                overall_score, improved_score
            )
            print(f"   改进后质量: {improved_score:.3f} (提升: {quality_improvement*100:.1f}%)")
        else:
            improved_score = overall_score
            quality_improvement = 0.0
            print(f"   ⚠️ 无法评估改进后质量")
        
        # 创建迭代记录
        iteration = ReflectionIteration(
            iteration_number=state.current_iteration + 1,
            answer_before=current_answer,
            critiques=evaluation_result["critiques"],
            overall_score=overall_score,
            improvement_plan=evaluation_result.get("improvement_plan", ""),
            answer_after=improved_answer,
            quality_improvement=quality_improvement
        )
        
        return iteration
    
    async def solve_with_reflection(self, problem: str, 
                                   max_iterations: int = 3) -> Dict[str, Any]:
        """
        使用反思模式解决问题
        
        Args:
            problem: 要解决的问题
            max_iterations: 最大反思迭代次数
            
        Returns:
            解决结果字典
        """
        print(f"🔍 开始反思式求解: {problem}")
        print("=" * 60)
        
        # 初始化状态
        state = ReflectionState(problem, max_iterations)
        
        # 反思主循环
        while state.should_continue():
            iteration = await self.perform_reflection_iteration(state)
            state.add_iteration(iteration)
            
            # 显示迭代摘要
            print(f"   迭代完成，质量: {iteration.overall_score:.3f} → {iteration.overall_score + iteration.quality_improvement:.3f}")
            
            # 如果质量下降，考虑停止
            if iteration.quality_improvement < -0.1:  # 质量下降超过10%
                print("   ⚠️ 质量下降，停止反思")
                break
        
        # 生成最终结果
        if not state.final_answer and state.iterations:
            state.final_answer = state.iterations[-1].answer_after
        
        progress = state.get_progress_summary()
        
        print(f"\n✅ 最终答案长度: {len(state.final_answer) if state.final_answer else 0} 字符")
        print(f"📊 总迭代次数: {progress.get('total_iterations', 0)}")
        print(f"📈 质量提升: {progress.get('improvement_rate', 0):.1f}%")
        print("=" * 60)
        
        return {
            "problem": problem,
            "final_answer": state.final_answer,
            "total_iterations": state.current_iteration,
            "iterations": [iter.to_dict() for iter in state.iterations],
            "progress_summary": progress,
            "quality_history": state.quality_history,
            "success": state.final_answer is not None
        }
    
    def print_detailed_report(self, result: Dict[str, Any]):
        """打印详细执行报告"""
        print("\n📋 详细反思报告:")
        print("=" * 60)
        print(f"问题: {result['problem']}")
        print(f"最终答案长度: {len(result['final_answer'])} 字符")
        print(f"总迭代次数: {result['total_iterations']}")
        
        progress = result['progress_summary']
        if progress:
            print(f"初始质量: {progress.get('initial_quality', 0):.3f}")
            print(f"最终质量: {progress.get('final_quality', 0):.3f}")
            print(f"质量提升: {progress.get('improvement_rate', 0):.1f}%")
            print(f"耗时: {progress.get('time_elapsed', 0):.2f}秒")
        
        print("\n迭代历史:")
        for i, iteration in enumerate(result['iterations'], 1):
            print(f"\n迭代 {i}:")
            print(f"  质量: {iteration['overall_score']:.3f}")
            print(f"  改进: {iteration['quality_improvement']*100:.1f}%")
            print(f"  批判意见数: {iteration['critique_count']}")
            print(f"  前: {iteration['answer_before']}")
            print(f"  后: {iteration['answer_after']}")

# ==================== 高级反思Agent ====================
class AdvancedReflectionAgent(ReflectionAgent):
    """增强版反思Agent"""
    
    def __init__(self, model_name: str = "gpt-4o-mini"):
        super().__init__(model_name)
        
        # 增强组件
        self._init_advanced_components()
    
    def _init_advanced_components(self):
        """初始化高级组件"""
        
        # 专家评估器（针对不同类型问题使用不同专家）
        self.expert_evaluators = {
            "technical": self._create_technical_evaluator(),
            "creative": self._create_creative_evaluator(),
            "analytical": self._create_analytical_evaluator()
        }
        
        # 多策略改进器
        self.improvement_strategies = {
            "fact_correction": "修正事实错误",
            "structure_reorganization": "重组结构",
            "depth_enhancement": "增加深度",
            "clarity_improvement": "提高清晰度",
            "expansion": "扩展内容"
        }
    
    def _create_technical_evaluator(self):
        """创建技术问题评估器"""
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            max_tokens=1000
        )
    
    def _create_creative_evaluator(self):
        """创建创意问题评估器"""
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.5,
            max_tokens=1000
        )
    
    def _create_analytical_evaluator(self):
        """创建分析问题评估器"""
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.2,
            max_tokens=1000
        )
    
    async def _analyze_problem_type(self, problem: str) -> str:
        """分析问题类型"""
        analysis_prompt = f"""分析以下问题的类型：

问题：{problem}

请从以下类型中选择最合适的一个：
1. technical - 技术性问题（涉及技术、科学、数学等）
2. creative - 创意性问题（涉及写作、设计、艺术等）
3. analytical - 分析性问题（涉及分析、比较、论证等）
4. factual - 事实性问题（涉及事实查询、信息检索等）
5. hybrid - 混合型问题（涉及多个方面）

输出格式：{{"type": "问题类型", "confidence": 置信度0-1, "reasoning": "分析理由"}}"""
        
        try:
            parser = JsonOutputParser()
            chain = (
                ChatPromptTemplate.from_messages([
                    SystemMessage(content="你是问题类型分析专家。"),
                    HumanMessage(content=analysis_prompt)
                ])
                | self.generator_llm
                | parser
            )
            
            result = await chain.ainvoke({})
            return result.get("type", "analytical")
        except:
            return "analytical"  # 默认分析型
    
    async def perform_reflection_iteration(self, state: ReflectionState) -> ReflectionIteration:
        """增强版反思迭代"""
        
        print(f"\n🔄 第 {state.current_iteration + 1} 次反思迭代（增强版）")
        
        # 如果是第一次迭代，分析问题类型
        if state.current_iteration == 0:
            problem_type = await self._analyze_problem_type(state.problem)
            print(f"   问题类型分析: {problem_type}")
            
            # 根据问题类型调整生成策略
            current_answer = await self._generate_with_strategy(state.problem, problem_type)
        else:
            current_answer = state.get_last_answer()
        
        # 使用专门评估器（根据问题类型）
        problem_type = await self._analyze_problem_type(state.problem)
        print(f"   使用 {problem_type} 评估器")
        
        # 评估答案（这里简化处理，实际可以根据问题类型选择不同评估器）
        evaluation_result = await self.evaluator.evaluate_answer(
            state.problem, current_answer
        )
        
        # 其余逻辑与基类相同...
        return await super().perform_reflection_iteration(state)
    
    async def _generate_with_strategy(self, problem: str, problem_type: str) -> str:
        """根据问题类型使用不同生成策略"""
        
        strategies = {
            "technical": self._generate_technical_answer,
            "creative": self._generate_creative_answer,
            "analytical": self._generate_analytical_answer,
            "factual": self._generate_factual_answer
        }
        
        generator = strategies.get(problem_type, self._generate_analytical_answer)
        return await generator(problem)
    
    async def _generate_technical_answer(self, problem: str) -> str:
        """生成技术性答案"""
        prompt = f"""请以技术专家的身份回答以下技术问题：

问题：{problem}

要求：
1. 准确使用技术术语
2. 提供详细的实现或解释
3. 包含必要的技术细节
4. 如果有多种技术方案，进行比较分析

答案："""
        
        response = await self.generator_llm.ainvoke([HumanMessage(content=prompt)])
        return response.content
    
    async def _generate_creative_answer(self, problem: str) -> str:
        """生成创意性答案"""
        prompt = f"""请以创意专家的身份回答以下问题：

问题：{problem}

要求：
1. 富有创造性和想象力
2. 提供新颖的视角或解决方案
3. 表达生动有趣
4. 激发思考

答案："""
        
        response = await self.generator_llm.ainvoke([HumanMessage(content=prompt)])
        return response.content
    
    async def _generate_analytical_answer(self, problem: str) -> str:
        """生成分析性答案"""
        prompt = f"""请以分析专家的身份深入分析以下问题：

问题：{problem}

要求：
1. 进行多角度分析
2. 提供逻辑严密的论证
3. 比较不同观点
4. 得出有洞察力的结论

答案："""
        
        response = await self.generator_llm.ainvoke([HumanMessage(content=prompt)])
        return response.content
    
    async def _generate_factual_answer(self, problem: str) -> str:
        """生成事实性答案"""
        prompt = f"""请以事实核查员的身份回答以下问题：

问题：{problem}

要求：
1. 确保所有事实准确无误
2. 提供具体的数据和来源（如适用）
3. 避免主观臆断
4. 清晰区分事实和观点

答案："""
        
        response = await self.generator_llm.ainvoke([HumanMessage(content=prompt)])
        return response.content

# ==================== 示例和演示 ====================
async def demonstrate_basic_reflection():
    """演示基础反思Agent"""
    
    print("🚀 基础反思Agent演示")
    print("=" * 60)
    
    agent = ReflectionAgent()
    
    # 测试问题（适合反思的问题）
    test_problems = [
        "分析人工智能对社会就业的长期影响",
        "解释量子纠缠的基本原理及其实际应用",
        "比较东西方教育体系的优缺点及其文化根源"
    ]
    
    for problem in test_problems[:1]:  # 演示第一个
        print(f"\n📝 问题: {problem}")
        result = await agent.solve_with_reflection(problem, max_iterations=2)
        
        print(f"\n📊 结果摘要:")
        print(f"  最终答案长度: {len(result['final_answer'])} 字符")
        print(f"  总迭代次数: {result['total_iterations']}")
        
        progress = result['progress_summary']
        if progress:
            print(f"  质量提升: {progress.get('improvement_rate', 0):.1f}%")

async def demonstrate_advanced_reflection():
    """演示高级反思Agent"""
    
    print("\n" + "=" * 60)
    print("🚀 高级反思Agent演示")
    print("=" * 60)
    
    agent = AdvancedReflectionAgent()
    
    # 更复杂的问题
    complex_problems = [
        "设计一个可持续发展的智慧城市方案，考虑技术、环境和社会因素",
        "批判性分析资本主义和社会主义在经济效率与社会公平方面的权衡",
        "探讨人工智能是否可能产生意识，以及这带来的伦理挑战"
    ]
    
    for problem in complex_problems[:1]:  # 演示第一个
        print(f"\n📝 复杂问题: {problem}")
        result = await agent.solve_with_reflection(problem, max_iterations=3)
        
        agent.print_detailed_report(result)

# ==================== 反思模式应用场景 ====================
class ReflectionUseCases:
    """反思模式应用场景示例"""
    
    @staticmethod
    def academic_writing():
        """学术写作场景"""
        scenario = """
场景：学术论文写作助手
任务：帮助学生或研究者改进学术写作

示例工作流：
1. 用户提交论文草稿
2. Agent生成：提供初步评阅意见
3. Agent反思：从学术严谨性、逻辑结构、文献引用等角度批判
4. Agent改进：提供具体的修改建议
5. 多轮迭代：不断改进直到达到发表标准

优势：
• 提高学术写作质量
• 培养批判性思维
• 减少导师修改工作量
"""
        return scenario
    
    @staticmethod
    def code_review():
        """代码审查场景"""
        scenario = """
场景：AI代码审查助手
任务：审查和改进代码质量

示例工作流：
1. 开发者提交代码
2. Agent生成：提供初步审查意见
3. Agent反思：从代码质量、性能、安全性、可读性等角度批判
4. Agent改进：提供具体的重构建议
5. 迭代优化：直到代码达到生产标准

优势：
• 提高代码质量
• 统一编码规范
• 减少bug和安全漏洞
"""
        return scenario
    
    @staticmethod
    def business_strategy():
        """商业策略分析场景"""
        scenario = """
场景：商业策略分析助手
任务：分析和优化商业计划

示例工作流：
1. 输入商业计划书
2. Agent生成：初步分析报告
3. Agent反思：从市场可行性、财务风险、竞争优势等角度批判
4. Agent改进：提供优化建议和风险应对策略
5. 多轮完善：直到方案成熟

优势：
• 发现潜在风险和机会
• 优化商业模型
• 提高决策质量
"""
        return scenario

# ==================== 性能优化和最佳实践 ====================
class ReflectionBestPractices:
    """反思模式最佳实践"""
    
    @staticmethod
    def get_best_practices():
        """获取最佳实践"""
        
        practices = [
            {
                "category": "评估标准设计",
                "practices": [
                    "定义明确的评估维度和标准",
                    "设置合理的质量阈值",
                    "针对不同类型问题使用不同评估标准",
                    "平衡客观标准和主观判断"
                ]
            },
            {
                "category": "迭代控制",
                "practices": [
                    "设置最大迭代次数防止无限循环",
                    "实现质量收敛检测",
                    "监控改进效果，避免质量下降",
                    "根据问题复杂度动态调整迭代次数"
                ]
            },
            {
                "category": "改进策略",
                "practices": [
                    "优先处理严重问题（如事实错误）",
                    "保持改进的渐进性和可控性",
                    "记录改进历史以便回溯分析",
                    "提供多种改进策略供选择"
                ]
            },
            {
                "category": "性能优化",
                "practices": [
                    "缓存评估结果减少重复计算",
                    "并行处理多个评估维度",
                    "使用更小的模型进行初步评估",
                    "实现增量改进而非完全重写"
                ]
            }
        ]
        
        return practices
    
    @staticmethod
    def print_best_practices():
        """打印最佳实践"""
        print("\n🏆 反思模式最佳实践")
        print("=" * 60)
        
        practices = ReflectionBestPractices.get_best_practices()
        
        for category in practices:
            print(f"\n📌 {category['category']}:")
            for practice in category['practices']:
                print(f"  • {practice}")

# ==================== 与其他模式的对比 ====================
class PatternComparison:
    """反思与其他模式的对比"""
    
    @staticmethod
    def compare_patterns():
        """模式对比"""
        
        comparison = {
            "反思 vs ReAct": {
                "反思模式": [
                    "关注自我改进和质量提升",
                    "向内思考（评估自身输出）",
                    "适合需要高质量输出的任务",
                    "更注重深度而非广度"
                ],
                "ReAct模式": [
                    "关注外部行动和信息获取",
                    "向外思考（使用工具和环境）",
                    "适合需要外部信息的任务",
                    "更注重广度而非深度"
                ]
            },
            "反思 vs 传统生成": {
                "反思模式": [
                    "多次迭代，质量逐步提高",
                    "有明确的自我评估机制",
                    "可解释的改进过程",
                    "适合复杂和高要求任务"
                ],
                "传统生成": [
                    "单次生成，质量固定",
                    "缺乏自我评估和改进",
                    "过程不透明",
                    "适合简单和标准任务"
                ]
            },
            "反思 vs 集成学习": {
                "反思模式": [
                    "同一模型的自我迭代改进",
                    "关注深度优化",
                    "适合单个输出质量最大化",
                    "计算成本相对较低"
                ],
                "集成学习": [
                    "多个模型的集体决策",
                    "关注广度覆盖",
                    "适合减少方差和错误",
                    "计算成本相对较高"
                ]
            }
        }
        
        print("\n🔍 反思与其他模式对比")
        print("=" * 60)
        
        for comparison_name, patterns in comparison.items():
            print(f"\n{comparison_name}:")
            print(f"  反思模式特点: {', '.join(patterns['反思模式'][:2])}...")
            other_key = list(patterns.keys())[1]
            print(f"  {other_key}特点: {', '.join(patterns[other_key][:2])}...")

# ==================== 主函数 ====================
async def main():
    """主演示函数"""
    
    print("🤖 Reflection（反思）Agent设计模式详解")
    print("=" * 80)
    
    # 1. 演示基础反思
    await demonstrate_basic_reflection()
    
    # 2. 演示高级反思
    await demonstrate_advanced_reflection()
    
    # 3. 显示应用场景
    print("\n" + "=" * 80)
    print("🎯 反思模式应用场景")
    print("=" * 80)
    
    use_cases = ReflectionUseCases()
    print("\n📚 学术写作场景:")
    print(use_cases.academic_writing())
    
    print("\n💻 代码审查场景:")
    print(use_cases.code_review())
    
    print("\n📊 商业策略场景:")
    print(use_cases.business_strategy())
    
    # 4. 显示最佳实践
    ReflectionBestPractices.print_best_practices()
    
    # 5. 模式对比
    PatternComparison.compare_patterns()
    
    # 6. 总结
    print("\n" + "=" * 80)
    print("📝 反思模式总结")
    print("=" * 80)
    
    summary = """
✅ 反思模式的核心优势：
1. 高质量输出：通过自我批判和改进提高质量
2. 自我优化：能够识别和修正自身错误
3. 可解释性：完整的评估和改进过程透明
4. 适应性：可根据不同问题类型调整策略

🎯 适用场景：
• 需要高质量输出的任务（学术、专业内容）
• 复杂分析和论证任务
• 需要自我纠正和优化的系统
• 教育和培训场景（培养批判性思维）

⚠️ 注意事项：
1. 计算成本较高（多次LLM调用）
2. 可能过度优化或陷入局部最优
3. 需要精心设计的评估标准
4. 对提示词质量敏感

🚀 未来发展：
• 自动化评估标准优化
• 多模态反思（文本、代码、图像等）
• 协作反思（多个Agent互相评估）
• 在线学习和自适应改进
"""
    print(summary)

if __name__ == "__main__":
    # 运行主函数
    asyncio.run(main())
```

## 三、Reflection模式原理详解

### 3.1 反思循环的心理学基础

Reflection模式借鉴了人类的**元认知（Metacognition）** 能力：
- **监控**：意识到自己的认知过程
- **评估**：判断认知过程的质量
- **调节**：调整和改进认知策略

```python
# 元认知循环在代码中的体现
class MetacognitiveProcess:
    """元认知过程模拟"""
    
    def __init__(self):
        self.knowledge = {
            "declarative": "知道什么",      # 事实性知识
            "procedural": "知道如何做",     # 程序性知识
            "conditional": "知道何时用"    # 条件性知识
        }
    
    async def metacognitive_cycle(self, task):
        """元认知循环"""
        # 1. 计划阶段：选择策略
        strategy = await self.plan(task)
        
        # 2. 监控阶段：执行并监控
        result = await self.execute_and_monitor(task, strategy)
        
        # 3. 评估阶段：评估效果
        evaluation = await self.evaluate(result)
        
        # 4. 调节阶段：调整策略
        if evaluation["needs_improvement"]:
            improved_strategy = await self.regulate(strategy, evaluation)
            return await self.metacognitive_cycle(task)  # 重新循环
        
        return result
```

### 3.2 多维度评估框架

反思模式通常从多个维度评估答案质量：

```python
class MultiDimensionalEvaluation:
    """多维度评估框架"""
    
    EVALUATION_DIMENSIONS = {
        "准确性": {
            "权重": 0.3,
            "评估标准": ["事实正确", "数据准确", "来源可靠"]
        },
        "完整性": {
            "权重": 0.2,
            "评估标准": ["覆盖全面", "无重要遗漏", "考虑周全"]
        },
        "逻辑性": {
            "权重": 0.2,
            "评估标准": ["推理严密", "论证充分", "无逻辑漏洞"]
        },
        "清晰度": {
            "权重": 0.15,
            "评估标准": ["表达清晰", "结构合理", "术语恰当"]
        },
        "深度": {
            "权重": 0.1,
            "评估标准": ["分析深入", "见解独到", "触及本质"]
        },
        "创新性": {
            "权重": 0.05,
            "评估标准": ["视角新颖", "解决方案创新", "突破常规"]
        }
    }
    
    def calculate_weighted_score(self, dimension_scores):
        """计算加权总分"""
        total = 0
        for dimension, score in dimension_scores.items():
            if dimension in self.EVALUATION_DIMENSIONS:
                weight = self.EVALUATION_DIMENSIONS[dimension]["权重"]
                total += score * weight
        return total
```

### 3.3 反思的认知层次

| 认知层次     | 描述             | 在反思中的体现                     |
| ------------ | ---------------- | ---------------------------------- |
| **基础反思** | 检查表面错误     | 语法、事实错误检查                 |
| **中级反思** | 评估逻辑结构     | 论证连贯性、结构合理性             |
| **高级反思** | 批判深层假设     | 前提假设、价值观、视角局限性       |
| **元反思**   | 反思反思过程本身 | 评估标准是否合理，反思方法是否有效 |

## 四、适用场景说明

### 4.1 最适合Reflection的场景

#### 1. **学术和研究写作**
- **示例**：论文写作、文献综述、研究报告
- **优势**：能够从学术严谨性、逻辑结构、引用规范等多角度改进
- **质量维度**：准确性、完整性、逻辑性、深度
- **改进效果**：通常能提升30-50%的质量

#### 2. **代码审查和优化**
- **示例**：代码质量检查、性能优化、安全审计
- **优势**：能从可读性、效率、安全性、可维护性等多维度评估
- **质量维度**：正确性、效率、安全性、可读性、可维护性
- **改进效果**：能发现80%以上的常见代码问题

#### 3. **商业和策略分析**
- **示例**：商业计划书、市场分析、战略规划
- **优势**：能从可行性、风险、竞争优势等多角度批判
- **质量维度**：全面性、可行性、风险意识、创新性
- **改进效果**：能显著提高决策质量和风险识别能力

#### 4. **创意和内容创作**
- **示例**：广告文案、创意写作、内容策划
- **优势**：能从吸引力、原创性、情感共鸣等多角度优化
- **质量维度**：创意性、表达力、情感共鸣、目标契合度
- **改进效果**：能提升内容的吸引力和影响力

### 4.2 场景性能表现

| 场景     | 建议迭代次数 | 质量提升 | 平均耗时 | ROI评级 |
| -------- | ------------ | -------- | -------- | ------- |
| 学术写作 | 3-5次        | 40-60%   | 30-60秒  | ⭐⭐⭐⭐⭐   |
| 代码审查 | 2-3次        | 30-50%   | 20-40秒  | ⭐⭐⭐⭐    |
| 商业分析 | 3-4次        | 35-55%   | 25-50秒  | ⭐⭐⭐⭐    |
| 创意写作 | 2-3次        | 25-40%   | 15-30秒  | ⭐⭐⭐     |
| 简单编辑 | 1-2次        | 15-25%   | 5-15秒   | ⭐⭐⭐     |

### 4.3 不适合Reflection的场景

1. **实时性要求极高**：反思循环增加延迟
2. **简单事实查询**：直接回答即可，无需反思
3. **高度主观任务**：评估标准难以客观化
4. **资源极度受限**：无法承受多次LLM调用
5. **确定性任务**：有标准答案，无需创造性改进

## 五、扩展和变体

### 5.1 反思的常见变体

```python
# 1. 协作反思（多Agent互相评估）
class CollaborativeReflection:
    """协作反思：多个Agent互相评估"""
    
    def __init__(self, num_agents=3):
        self.agents = [ReflectionAgent() for _ in range(num_agents)]
    
    async def collaborative_reflection(self, problem):
        """协作反思过程"""
        # 每个Agent独立生成答案
        answers = []
        for agent in self.agents:
            answer = await agent.generate_initial_answer(problem)
            answers.append(answer)
        
        # 互相评估
        evaluations = []
        for i, agent in enumerate(self.agents):
            # 评估其他Agent的答案
            other_answers = [answers[j] for j in range(len(answers)) if j != i]
            evaluation = await agent.evaluate_multiple_answers(problem, other_answers)
            evaluations.append(evaluation)
        
        # 整合最佳部分
        integrated_answer = await self.integrate_best_parts(answers, evaluations)
        
        # 集体反思改进
        final_answer = await self.collective_improvement(integrated_answer, evaluations)
        
        return final_answer

# 2. 渐进反思（逐步增加反思深度）
class ProgressiveReflection(ReflectionAgent):
    """渐进反思：从简单到深入"""
    
    async def progressive_reflection(self, problem):
        """渐进反思过程"""
        # 第一层：表面错误检查
        answer = await self.generate_initial_answer(problem)
        answer = await self.surface_level_reflection(problem, answer)
        
        # 第二层：逻辑结构优化
        answer = await self.logical_level_reflection(problem, answer)
        
        # 第三层：深层分析和批判
        answer = await self.deep_level_reflection(problem, answer)
        
        # 第四层：元反思（反思过程本身）
        answer = await self.meta_reflection(problem, answer)
        
        return answer
    
    async def surface_level_reflection(self, problem, answer):
        """表面层反思：语法、事实、格式"""
        # 检查明显错误
        return answer
    
    async def logical_level_reflection(self, problem, answer):
        """逻辑层反思：结构、论证、连贯性"""
        # 优化逻辑结构
        return answer
    
    async def deep_level_reflection(self, problem, answer):
        """深层反思：假设、视角、价值观"""
        # 批判深层问题
        return answer
    
    async def meta_reflection(self, problem, answer):
        """元反思：反思反思过程"""
        # 评估反思过程本身
        return answer

# 3. 领域专用反思
class DomainSpecificReflection:
    """领域专用反思"""
    
    def __init__(self, domain):
        self.domain = domain
        self.domain_knowledge = self.load_domain_knowledge(domain)
    
    def load_domain_knowledge(self, domain):
        """加载领域知识"""
        domains = {
            "legal": {
                "评估标准": ["法律准确性", "条款完整性", "风险覆盖", "合规性"],
                "专业术语": ["法律术语词典", "判例参考", "法规要求"]
            },
            "medical": {
                "评估标准": ["医学准确性", "治疗方案安全性", "循证依据", "伦理考量"],
                "专业术语": ["医学术语库", "临床指南", "药物数据库"]
            },
            "financial": {
                "评估标准": ["财务准确性", "风险评估", "合规性", "投资回报分析"],
                "专业术语": ["财务术语", "会计准则", "市场数据"]
            }
        }
        return domains.get(domain, {})
```

### 5.2 性能优化策略

```python
class OptimizedReflectionAgent(ReflectionAgent):
    """优化版反思Agent"""
    
    def __init__(self):
        super().__init__()
        
        # 优化策略
        self.optimizations = {
            "caching": True,  # 缓存评估结果
            "parallel_evaluation": True,  # 并行评估
            "adaptive_iterations": True,  # 自适应迭代
            "selective_improvement": True  # 选择性改进
        }
        
        # 缓存系统
        self.evaluation_cache = {}
        self.improvement_cache = {}
    
    async def evaluate_with_cache(self, problem, answer):
        """带缓存的评估"""
        cache_key = f"{hash(problem)}:{hash(answer)}"
        
        if cache_key in self.evaluation_cache and self.optimizations["caching"]:
            return self.evaluation_cache[cache_key]
        
        result = await super().evaluator.evaluate_answer(problem, answer)
        
        if self.optimizations["caching"]:
            self.evaluation_cache[cache_key] = result
        
        return result
    
    async def parallel_evaluate_dimensions(self, problem, answer):
        """并行评估多个维度"""
        if not self.optimizations["parallel_evaluation"]:
            return await self.evaluator.evaluate_answer(problem, answer)
        
        # 创建并行评估任务
        dimensions = list(ReflectionDimension)
        
        async def evaluate_dimension(dimension):
            """评估单个维度"""
            # 简化实现：实际中可以使用专门的评估提示词
            return await self._evaluate_single_dimension(problem, answer, dimension)
        
        # 并行执行
        tasks = [evaluate_dimension(dim) for dim in dimensions[:4]]  # 限制并行数
        results = await asyncio.gather(*tasks)
        
        # 整合结果
        overall_score = sum(r["score"] for r in results) / len(results)
        
        return {
            "success": True,
            "overall_score": overall_score,
            "critiques": results,
            "summary": "并行评估结果"
        }
    
    def should_continue_iteration(self, state):
        """自适应判断是否继续迭代"""
        if not self.optimizations["adaptive_iterations"]:
            return state.should_continue()
        
        # 基于改进效果的智能判断
        if len(state.quality_history) < 2:
            return True
        
        recent_improvements = [
            state.quality_history[i] - state.quality_history[i-1]
            for i in range(1, len(state.quality_history))
        ]
        
        avg_recent_improvement = sum(recent_improvements[-2:]) / 2 if len(recent_improvements) >= 2 else 0
        
        # 如果最近改进很小，停止
        if avg_recent_improvement < 0.02:  # 改进小于2%
            return False
        
        # 如果已达到高质量，停止
        if state.quality_history[-1] > 0.9:
            return False
        
        return state.current_iteration < state.max_iterations
```

## 六、实现注意事项

### 6.1 常见陷阱和解决方案

| 陷阱           | 表现                   | 解决方案                       |
| -------------- | ---------------------- | ------------------------------ |
| **过度优化**   | 无限循环，改进微乎其微 | 设置收敛阈值，最大迭代次数     |
| **质量下降**   | 改进后质量反而变差     | 保留历史最佳，实现回滚机制     |
| **评估偏差**   | 评估标准不客观或不全面 | 多维度评估，引入外部基准       |
| **计算开销大** | 耗时太长，成本太高     | 缓存结果，选择性评估，并行处理 |
| **改进无效**   | 改进建议不具体或不可行 | 细化评估维度，提供具体修改示例 |

### 6.2 评估标准设计指南

```python
class EvaluationStandardDesigner:
    """评估标准设计器"""
    
    @staticmethod
    def design_evaluation_standards(task_type):
        """根据任务类型设计评估标准"""
        
        standards_templates = {
            "学术写作": {
                "主要维度": ["准确性", "完整性", "逻辑性", "规范性"],
                "每个维度的具体标准": {
                    "准确性": ["事实正确", "引用准确", "数据可靠"],
                    "完整性": ["覆盖全面", "论证充分", "考虑周到"],
                    "逻辑性": ["推理严密", "结构清晰", "前后一致"],
                    "规范性": ["格式正确", "术语准确", "引用规范"]
                },
                "权重分配": {"准确性": 0.3, "完整性": 0.25, "逻辑性": 0.25, "规范性": 0.2}
            },
            "代码审查": {
                "主要维度": ["正确性", "效率", "可读性", "可维护性"],
                "每个维度的具体标准": {
                    "正确性": ["功能正确", "无bug", "边界处理"],
                    "效率": ["时间复杂度", "空间复杂度", "资源使用"],
                    "可读性": ["命名规范", "注释充分", "结构清晰"],
                    "可维护性": ["模块化", "可扩展性", "文档完整"]
                },
                "权重分配": {"正确性": 0.4, "效率": 0.2, "可读性": 0.2, "可维护性": 0.2}
            },
            "商业分析": {
                "主要维度": ["全面性", "可行性", "创新性", "风险意识"],
                "每个维度的具体标准": {
                    "全面性": ["覆盖所有方面", "考虑多因素", "分析深入"],
                    "可行性": ["资源可行", "时间可行", "技术可行"],
                    "创新性": ["视角新颖", "方案创新", "突破常规"],
                    "风险意识": ["识别风险", "评估影响", "应对策略"]
                },
                "权重分配": {"全面性": 0.3, "可行性": 0.3, "创新性": 0.2, "风险意识": 0.2}
            }
        }
        
        return standards_templates.get(task_type, standards_templates["学术写作"])
```

## 七、总结

Reflection模式是一种强大的Agent设计模式，它通过**自我评估、自我批判和自我改进**，使AI系统能够：

1. **持续提高质量**：通过迭代改进获得更优输出
2. **自我纠正错误**：识别并修正自身错误
3. **适应不同标准**：根据不同任务要求调整评估标准
4. **提高可靠性**：减少错误和遗漏

### 关键成功因素：
- **精心设计的评估标准**：全面、客观、可操作
- **有效的改进策略**：具体、可行、有针对性
- **合理的迭代控制**：避免过度优化，及时终止
- **透明的反思过程**：完整的评估和改进记录

### 适用性判断：
- ✅ 适合：需要高质量输出、复杂分析、专业内容的任务
- ⚠️ 一般：简单事实查询、实时性要求高的任务
- ❌ 不适合：高度主观、资源极度受限的任务

### 未来发展方向：
Reflection模式正在向更智能、更高效的方向发展：
- **自动化标准优化**：从数据中学习最佳评估标准
- **多模态反思**：文本、代码、图像、音频的联合反思
- **协作反思网络**：多个Agent组成的反思社区
- **在线学习和适应**：从每次反思中学习，持续改进反思能力

通过合理实现和应用，Reflection模式可以构建出能够**自我优化、自我完善**的AI系统，在需要高质量输出的领域创造重要价值。