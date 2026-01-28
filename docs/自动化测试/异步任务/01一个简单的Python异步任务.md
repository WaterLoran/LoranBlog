# 01一个简单的Python异步任务

一个简单的 Python 异步任务示例，使用 `asyncio` 库：

```python
import asyncio
import time

# 定义一个异步函数
async def say_after(delay, message):
    """在指定延迟后打印消息"""
    await asyncio.sleep(delay)
    print(f"{time.strftime('%X')}: {message}")

# 主异步函数
async def main():
    print(f"开始时间 {time.strftime('%X')}")
    
    # 顺序执行两个异步任务
    await say_after(1, "Hello")
    await say_after(2, "World")
    
    print(f"结束时间 {time.strftime('%X')}")

# 运行异步程序
if __name__ == "__main__":
    # Python 3.7+ 的推荐方式
    asyncio.run(main())
```

**输出结果类似：**
```
开始时间 14:30:15
14:30:16: Hello
14:30:18: World
结束时间 14:30:18
```

---

### 并发版本示例

如果要让两个任务并发执行，可以使用 `asyncio.create_task()`：

```python
import asyncio
import time

async def say_after(delay, message):
    await asyncio.sleep(delay)
    print(f"{time.strftime('%X')}: {message}")

async def main():
    print(f"开始时间 {time.strftime('%X')}")
    
    # 创建两个任务并行执行
    task1 = asyncio.create_task(say_after(1, "Hello"))
    task2 = asyncio.create_task(say_after(2, "World"))
    
    # 等待两个任务都完成
    await task1
    await task2
    
    print(f"结束时间 {time.strftime('%X')}")

if __name__ == "__main__":
    asyncio.run(main())
```

**输出结果类似：**
```
开始时间 14:30:15
14:30:16: Hello
14:30:17: World  # 注意这里只用了2秒，而不是3秒
结束时间 14:30:17
```

---

### 使用 `gather` 的简洁写法

```python
import asyncio
import time

async def task(name, seconds):
    print(f"任务 {name} 开始")
    await asyncio.sleep(seconds)
    print(f"任务 {name} 完成，耗时 {seconds} 秒")
    return f"任务{name}结果"

async def main():
    # 同时运行多个任务
    results = await asyncio.gather(
        task("A", 2),
        task("B", 1),
        task("C", 3)
    )
    
    print(f"所有任务完成，结果: {results}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

### 关键概念说明

1. **async/await**：定义异步函数的关键字
2. **asyncio.run()**：运行异步程序的主入口（Python 3.7+）
3. **asyncio.sleep()**：异步等待，不会阻塞事件循环
4. **asyncio.create_task()**：创建并发任务
5. **asyncio.gather()**：并行运行多个任务并收集结果

### 运行环境要求
- Python 3.7+（推荐 3.8+）

这个示例展示了异步编程的基本模式，可以在此基础上构建更复杂的异步应用。