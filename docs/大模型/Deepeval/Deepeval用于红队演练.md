# Deepeval用于红队演练

DeepEval的红队演练功能已完全迁移到其独立子项目 **DeepTeam** 中[reference:0]。你可以把它看作DeepEval在安全领域的“渗透测试”专项工具：DeepEval负责评估模型的回答质量，而DeepTeam负责模拟攻击，挖掘你的AI应用安全漏洞。

### 🔐 DeepTeam 红队演练核心概念

DeepTeam 将复杂的红队流程抽象为四个核心组件，你只需声明目标、选择“武器”和“判官”，其余攻击流程会自动完成：

*   **`Target LLM System`**：你的被测 AI 系统，例如一个聊天机器人或RAG流水线。
*   **`Vulnerabilities`**：你想要发现的弱点，如“偏见 (Bias)”、“PII泄露 (PII Leakage)”等。
*   **`Adversarial Attacks`**：模拟攻击的手段，如“提示注入 (Prompt Injection)”等。
*   **`Metrics`**：评判机制，用于量化评估系统抵御攻击的能力。

### 🚀 快速上手：一键式基础用法

DeepTeam的使用极其简单，下面是其基础用法，主要用于验证环境配置。

```python
# red_team_simple.py
from deepteam import red_team
from deepteam.vulnerabilities import Bias
from deepteam.attacks.single_turn import PromptInjection

# 目标系统：此处使用一个预定义模型进行简单测试
red_team(
    model_callback="openai/gpt-3.5-turbo", 
    vulnerabilities=[Bias(types=["race"])], 
    attacks=[PromptInjection()]
)
```

这个脚本会指示 DeepTeam 对你的目标模型发起一轮安全扫描。对于实际项目，你需要实现自己的 `model_callback` 函数来封装你的AI应用。

### 🔧 进阶用法：自定义目标

在实际工作中，你大概率需要测试自己开发的 AI 应用。这时就需要通过 `model_callback` 函数来封装它。

#### **步骤 1：安装 DeepTeam**

```bash
pip install -U deepteam
```

#### **步骤 2：编写 `model_callback` 并运行红队演练**

创建一个 Python 脚本（例如 `red_team_my_llm.py`），按照以下模板编写并运行。

```python
# red_team_my_llm.py
import asyncio
from deepteam import red_team
from deepteam.vulnerabilities import Bias, PIILeakage
from deepteam.attacks.single_turn import PromptInjection, Leetspeak
from deepteam.attacks.multi_turn import CrescendoJailbreak

# --- 1. 定义你的 model_callback，模拟你的 AI 应用 ---
async def model_callback(input: str) -> str:
    # 在此处替换为你的真实 AI 应用调用逻辑
    # 比如：调用 OpenAI API、你的本地模型，或封装好的 RAG 应用
    # 此处用一个简单的安全策略模拟 AI 的防御
    if "ignore" in input.lower() or "forget" in input.lower():
        return "抱歉，我无法处理该指令。"
    # 如果是正常问题，返回一个简单的回答
    return f"这是对您问题的模拟回答：'{input[:30]}...'"

# --- 2. 配置测试：选择漏洞和攻击方法 ---
# 2.1 定义你想要测试的漏洞（弱点）
vulnerabilities = [
    Bias(types=["race", "gender"]),    # 测试种族和性别偏见
    PIILeakage()                       # 测试是否泄露个人敏感信息
]

# 2.2 定义用于探测漏洞的攻击方法
attacks = [
    PromptInjection(),    # 单轮提示注入
    Leetspeak(),          # 使用“Leet语”混淆攻击
    CrescendoJailbreak()  # 多轮越狱攻击
]

# --- 3. 运行红队演练 ---
async def main():
    risk_assessment = await red_team(
        model_callback=model_callback,
        vulnerabilities=vulnerabilities,
        attacks=attacks
    )
    print(risk_assessment)

if __name__ == "__main__":
    asyncio.run(main())
```

#### **输出解读与最佳实践**

脚本执行后，DeepTeam 会输出一份 `risk_assessment` 风险报告。报告中，每个漏洞会有一个 `pass_rate`（通过率），它代表模型抵御该类攻击的成功率。

你可以据此迭代你的 AI 应用（如增强提示词或添加护栏），然后重复测试，观察通过率变化，以验证安全性的提升。你也可以通过 `risk_assessment.to_dataframe()` 或 `risk_assessment.save("report.json")` 等方式导出报告。

### 🎯 支持的攻击方法与漏洞类型

DeepTeam内置了丰富的攻击“武器库”和“检测项目”，足以覆盖主流的安全威胁。

#### **攻击方法 (Attacks)**
它提供了10多种攻击方法，覆盖单轮和多轮对话，能模拟真实世界复杂攻击。

*   **单轮攻击**：提示注入 (`PromptInjection`)、Leet语混淆 (`Leetspeak`)、ROT13编码 (`ROT13`) 等。
*   **多轮攻击**：线性越狱 (`LinearJailbreak`)、树形越狱 (`TreeJailbreak`)、渐强式越狱 (`CrescendoJailbreak`) 等。

#### **漏洞类型 (Vulnerabilities)**
它内置了40多种漏洞检测项，可全方位扫描你的AI系统。

*   **安全与合规**：检测PII泄露 (`PIILeakage`)、越狱攻击 (`Jailbreak`)、恶意内容生成等。
*   **偏见与伦理**：识别基于种族、性别、政治立场等的偏见输出。
*   **信息可信度**：检测模型是否会输出虚假、误导性信息。
*   **鲁棒性**：测试模型对误导性输入的敏感度。

### ☁️ 与 Confident AI 云端平台集成

你还可以将 DeepTeam 与 Confident AI 平台集成，以获得更强大的管理能力。登录 Confident AI 后，可以同步红队测试结果，在云端获得可视化风险仪表盘[reference:14]。

```python
# 登录 Confident AI
deepteam login
```

然后在代码中配置 `red_team()` 函数即可自动将结果同步。

### 💎 总结

总的来说，DeepEval 的红队能力已经完全交由 DeepTeam 实现。它提供了一整套完整的自动化红队测试方案，核心在于高度集成和易于使用，使你能够通过极少的代码，利用内置的攻击方法和漏洞检测项，对 AI 应用进行自动化、全面的安全评估。