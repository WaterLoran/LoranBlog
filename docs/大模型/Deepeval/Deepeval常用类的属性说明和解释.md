# Deepeval常用类的属性说明和解释

这四个类分别对应LLM应用的四种核心评估场景。它们的核心区别在于测试数据的组织形式。

| 测试用例                                 | 核心属性            | 属性类型                      | 必需性 | 描述与用途                                                   |
| :--------------------------------------- | :------------------ | :---------------------------- | :----- | :----------------------------------------------------------- |
| **LLMTestCase** <br>(单次交互)           | `input`             | `str`                         | **是** | **用户输入**。模拟与LLM交互的起点，是评估的基础[reference:0]。 |
|                                          | `actual_output`     | `str`                         | **是** | **LLM生成的输出**。你希望评估的模型实际响应内容[reference:1]。 |
|                                          | `expected_output`   | `str`                         | 否     | **期望的输出**。用于指标需要"标准答案"的场景，如评估回答的相似度或正确性[reference:2]。 |
|                                          | `retrieval_context` | `List[str]`                   | 否     | **检索到的上下文**。RAG系统中，从知识库检索到的相关文本片段，是评估检索质量的依据[reference:3]。 |
|                                          | `tools_called`      | `List[ToolCall]`              | 否     | **实际调用的工具**。记录Agent在本次交互中执行过的所有工具调用，用于评估其行为是否正确[reference:4]。 |
|                                          | `expected_tools`    | `List[ToolCall]`              | 否     | **期望调用的工具**。代表在理想情况下，Agent应该调用的工具及参数，与`tools_called`对比[reference:5]。 |
|                                          | `completion_time`   | `float`                       | 否     | **完成时间**。记录本次交互所花费的总时间（秒），用于评估性能延迟[reference:6]。 |
|                                          | `token_cost`        | `float`                       | 否     | **Token成本**。记录本次交互的Token消耗费用，用于成本监控[reference:7]。 |
|                                          | `context`           | `List[str]`                   | 否     | **基础上下文**。一个更通用的上下文字段，可用于任何形式的背景信息输入[reference:8]。 |
| **ConversationalTestCase**<br>(对话流程) | `turns`             | `List[Turn]`                  | **是** | **对话轮次列表**。这是对话测试的核心，用一个`Turn`对象列表来代表一次完整的对话历史[reference:9]。 |
|                                          | `scenario`          | `str`                         | 否     | **场景描述**。用自然语言描述整个对话的背景或目标，帮助理解上下文[reference:10]。 |
|                                          | `expected_outcome`  | `str`                         | 否     | **预期结果**。描述本次对话期望达成的最终结果或状态[reference:11]。 |
|                                          | `user_description`  | `str`                         | 否     | **用户描述**。对对话中"用户"角色的额外描述或约束[reference:12]。 |
|                                          | `chatbot_role`      | `str`                         | 否     | **机器人角色**。定义对话中AI助手扮演的角色，用于评估其行为是否符合设定[reference:13]。 |
|                                          | `context`           | `str`                         | 否     | **对话上下文**。一个适用于整个对话的、更宏观的背景信息或指导原则[reference:14]。 |
| **MLLMTestCase**<br>(图像等多模态)       | `input`             | `str`                         | **是** | **用户输入**。与LLMTestCase类似，用户的文本指令或问题。      |
|                                          | `actual_output`     | `Union[str, List[MLLMImage]]` | **是** | **多模态输出**。这是MLLMTestCase的核心。它可以是生成的文本描述，也可以是一个`MLLMImage`对象列表，用于封装图像输入输出。 |
|                                          | `expected_output`   | `str`                         | 否     | **期望的输出**。同上，用于需要标准答案的评估场景。           |
|                                          | `retrieval_context` | `List[str]`                   | 否     | **检索到的上下文**。在多模态场景中，可用于包含图像描述的文本块。 |
|                                          | `completion_time`   | `float`                       | 否     | **完成时间**。同上。                                         |
|                                          | `token_cost`        | `float`                       | 否     | **Token成本**。同上。                                        |
| **ArenaTestCase**<br>(模型或提示词对比)  | `contestants`       | `List[Contestant]`            | **是** | **参赛者列表**。一个`Contestant`对象列表，每个对象代表一个你希望进行对比的LLM应用版本[reference:15]。 |
|                                          | `description`       | `str`                         | 否     | **测试描述**。对这个竞技场的描述或注释，方便识别和记录。     |

> 表格中省略了 `LLMTestCase` 的 `additional_metadata` 等内部管理字段，以及 `MLLMTestCase` 更详细的特定字段，这些在多数通用评估场景中使用频率较低。

---

### 🧩 `LLMTestCase`：原子交互单元

*   **使用场景**：最常用，可评估多种情况，如RAG流程的端到端质量、Agent的单次动作（如工具调用）、或大语言模型本身的生成质量[reference:16]。
*   **核心属性**：
    *   `input` 和 `actual_output` 是唯一两个必需字段[reference:17]。
    *   `retrieval_context` 是评估RAG系统质量的关键，许多RAG指标（如`Faithfulness`）都依赖于此[reference:18]。
    *   `tools_called` 和 `expected_tools` 是评估智能体（Agent）行为正确性的关键[reference:19]。
    *   其他如 `completion_time` 和 `token_cost` 等字段，可用于非功能性的性能与成本评估。

### 💬 `ConversationalTestCase`：模拟真实对话

*   **使用场景**：测试聊天机器人、客服助手等，核心是模拟多轮对话[reference:20]。
*   **核心属性**：
    *   `turns` 是唯一必需字段，它定义了对话的顺序和内容。
    *   `scenario` 和 `expected_outcome` 字段非常适合从测试数据集中生成测试用例，或为人工评审提供明确背景[reference:21]。
    *   在构建 `Turn` 时，你可以通过 `role`（用户或助手）指定内容归属，并能附上该轮专用的 `retrieval_context` 和 `tools_called`[reference:22]。

### 🖼️ `MLLMTestCase`：处理多模态数据

*   **使用场景**：专门用于评估多模态模型，如图文生成、图片问答等[reference:23]。
*   **核心属性**：它与 `LLMTestCase` 非常相似，关键区别在于 `actual_output` 字段可以接受并处理 `MLLMImage` 类型的图像数据，这使其成为多模态评估的基石。

### 🏆 `ArenaTestCase`：竞技场模式对比

*   **使用场景**：用于"竞技场"模式的对比测试，可同时对比多个模型或提示词的优劣[reference:24][reference:25]。
*   **核心属性**：
    *   `contestants` 是唯一必需的字段，它封装了每个待对比的"参赛者"。
    *   评估时，通常与 `ArenaGEval` 指标配合使用，它会像一位公正的裁判，根据你设定的标准（如"回答更友好"），在所有参赛者中选出胜出者[reference:26]。

你可以根据测试目标选择合适的测试用例，现在需要我提供一个具体的示例代码，展示如何构建这些测试用例并运行评估吗？