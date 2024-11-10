## 第一个使用openai的api的demo

具体的代码

```python
import os
from openai import OpenAI


# 设置 API key 和 API base URL
api_key = os.getenv("api_key")
base_url = os.getenv("base_url")


client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "如何学习使用openai来做chatbot",
        }
    ],
    model="gpt-4o-mini",
)

print(chat_completion.choices[0].message.content)

```

说明: base_url 为一个使用openai的接口,默认则使用官方的, 有时候是代理的接口







### 在pycharm中设置环境变量

#### 步骤 1：在代码中直接读取环境变量

Python 提供了 `os` 模块来读取环境变量。可以使用 `os.getenv()` 或 `os.environ` 来获取。

```python
import os

# 从环境变量中获取 API 密钥
api_key = os.getenv("api_key")
print("API Key:", api_key)
```

#### 步骤2：在 PyCharm 配置环境变量

1. **打开运行配置**：

   - 在 PyCharm 中，点击右上角的 “Edit Configurations...” 选项。

2. **添加环境变量**：

   - 在配置窗口中，找到 “Environment variables” 选项，点击右侧的 “...” 按钮。
   - 添加环境变量，格式为 `API_KEY=your-api-key`。可以添加多个环境变量，每行一个。

3. **使用 `os.getenv` 访问**：

   - 在代码中使用 `os.getenv("API_KEY")` 来读取该环境变量。

   