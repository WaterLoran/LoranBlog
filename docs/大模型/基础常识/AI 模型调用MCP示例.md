# AI 模型调用 MCP (Model Context Protocol) 示例

MCP (Model Context Protocol) 是一个新兴的协议，用于标准化 AI 模型与外部工具和服务的交互方式。下面我将提供一个使用 MCP 调用 AI 模型的完整示例。

## 什么是 MCP?

MCP (Model Context Protocol) 是一个开放协议，允许 AI 模型与外部工具、数据源和服务进行标准化交互。它类似于函数调用，但更加结构化，专为 AI 场景设计。

## 示例场景

假设我们有一个天气查询工具通过 MCP 暴露给 AI 模型，AI 可以调用这个工具来获取实时天气信息。

### 1. MCP 服务器实现 (天气服务)

首先，我们需要实现一个 MCP 服务器来提供天气查询功能：

```python
# weather_mcp_server.py
import json
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, ImageContent, EmbeddedResource

# 创建 MCP 服务器
server = Server("weather-service")

# 注册工具（函数）
@server.list_tools()
async def handle_list_tools():
    return [
        {
            "name": "get_weather",
            "description": "获取指定城市的当前天气信息",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，例如: '北京', '上海'"
                    }
                },
                "required": ["city"]
            }
        }
    ]

# 处理工具调用
@server.call_tool()
async def handle_call_tool(name: str, arguments: dict):
    if name == "get_weather":
        city = arguments.get("city", "北京")
        
        # 这里应该是实际的天气 API 调用
        # 为了示例，我们返回模拟数据
        weather_data = {
            "city": city,
            "temperature": 22.5,
            "condition": "晴",
            "humidity": 65,
            "wind_speed": 3.2
        }
        
        return [
            {
                "type": "text",
                "text": f"{city}的当前天气:\n"
                       f"温度: {weather_data['temperature']}°C\n"
                       f"天气状况: {weather_data['condition']}\n"
                       f"湿度: {weather_data['humidity']}%\n"
                       f"风速: {weather_data['wind_speed']}m/s"
            }
        ]
    
    raise ValueError(f"未知工具: {name}")

# 主函数
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())
```

### 2. AI 模型客户端实现

接下来，我们实现一个 AI 客户端，它可以调用 MCP 工具：

```python
# ai_mcp_client.py
import asyncio
import json
from mcp.client import Client
from mcp.client.stdio import stdio_client

async def main():
    # 连接到 MCP 服务器
    async with stdio_client("python", "weather_mcp_server.py") as (read, write):
        client = Client(read, write)
        
        # 初始化连接
        await client.initialize()
        
        # 列出可用工具
        tools = await client.list_tools()
        print("可用工具:", [tool.name for tool in tools.tools])
        
        # 调用天气查询工具
        result = await client.call_tool(
            "get_weather", 
            {"city": "北京"}
        )
        
        # 处理结果
        for content in result.content:
            if content.type == "text":
                print("天气信息:", content.text)
            elif content.type == "image":
                print("收到图片数据")
            elif content.type == "embeddedResource":
                print("收到嵌入资源")
        
        # 关闭连接
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### 3. 集成到 AI 应用中的完整示例

以下是一个更完整的示例，展示如何在实际 AI 应用中使用 MCP：

```python
# ai_app_with_mcp.py
import asyncio
from mcp.client import Client
from mcp.client.stdio import stdio_client

class AIAssistant:
    def __init__(self):
        self.client = None
        self.tools = []
    
    async def connect_to_mcp_server(self, server_command):
        """连接到 MCP 服务器"""
        read, write = await stdio_client(server_command)
        self.client = Client(read, write)
        await self.client.initialize()
        
        # 获取可用工具
        tools_response = await self.client.list_tools()
        self.tools = {tool.name: tool for tool in tools_response.tools}
        print(f"已连接到 MCP 服务器，发现 {len(self.tools)} 个工具")
    
    async def process_user_query(self, query):
        """处理用户查询，可能调用 MCP 工具"""
        # 这里是AI模型的逻辑，判断是否需要调用工具
        # 为了示例，我们简单判断是否包含"天气"关键词
        if "天气" in query:
            # 提取城市名称（实际应用中应该使用更复杂的NLP技术）
            city = "北京"  # 默认值
            if "上海" in query:
                city = "上海"
            elif "广州" in query:
                city = "广州"
            elif "深圳" in query:
                city = "深圳"
            
            # 调用天气工具
            if "get_weather" in self.tools:
                try:
                    result = await self.client.call_tool(
                        "get_weather", 
                        {"city": city}
                    )
                    
                    # 提取工具返回的文本内容
                    tool_response = ""
                    for content in result.content:
                        if content.type == "text":
                            tool_response = content.text
                            break
                    
                    return f"根据天气查询工具，{tool_response}"
                except Exception as e:
                    return f"调用天气工具时出错: {str(e)}"
            else:
                return "抱歉，天气查询功能当前不可用"
        else:
            # 其他查询的处理逻辑
            return f"您询问了: {query}。这是一个通用响应，未使用MCP工具。"
    
    async def close(self):
        """关闭连接"""
        if self.client:
            await self.client.close()

async def main():
    # 创建AI助手实例
    assistant = AIAssistant()
    
    try:
        # 连接到MCP服务器
        await assistant.connect_to_mcp_server(["python", "weather_mcp_server.py"])
        
        # 处理一些示例查询
        queries = [
            "今天北京天气怎么样？",
            "告诉我一些关于人工智能的信息",
            "上海明天的天气如何？"
        ]
        
        for query in queries:
            print(f"\n用户: {query}")
            response = await assistant.process_user_query(query)
            print(f"助手: {response}")
            
    finally:
        # 确保关闭连接
        await assistant.close()

if __name__ == "__main__":
    asyncio.run(main())
```

## 使用现有 MCP 服务器

除了自己实现 MCP 服务器，你也可以使用现有的 MCP 服务器。例如，使用 Claude 提供的 MCP 服务器：

```bash
# 安装 Claude MCP 服务器
npm install -g @anthropic-ai/mcp-server-weather

# 运行服务器
npx @anthropic-ai/mcp-server-weather
```

然后在你的 AI 应用中连接到这个服务器：

```python
async def connect_to_weather_server():
    # 连接到天气MCP服务器
    read, write = await stdio_client("npx", "@anthropic-ai/mcp-server-weather")
    client = Client(read, write)
    await client.initialize()
    return client
```

## MCP 的优势

1. **标准化**: 提供统一的接口与各种工具交互
2. **灵活性**: 可以轻松添加新工具而不需要修改AI模型本身
3. **安全性**: 工具调用是明确定义和受限的
4. **可组合性**: 多个工具可以组合使用解决复杂问题

## 实际应用建议

1. **错误处理**: 在实际应用中，需要添加完善的错误处理机制
2. **超时控制**: 为工具调用设置合理的超时时间
3. **认证与授权**: 如果工具需要访问敏感数据，实现适当的认证机制
4. **日志记录**: 记录所有工具调用用于监控和调试
5. **性能优化**: 考虑使用连接池和缓存提高性能

这个示例展示了如何使用 MCP 协议让 AI 模型调用外部工具。在实际应用中，你可以根据需要实现各种不同的 MCP 服务器，为 AI 模型提供数据库访问、API 调用、文件操作等各种能力。