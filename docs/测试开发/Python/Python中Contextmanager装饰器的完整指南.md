# Python中Contextmanager装饰器的完整指南

## Python `@contextmanager` 装饰器的完整指南

`@contextmanager` 是 Python 的 `contextlib` 模块提供的一个装饰器，它可以将生成器函数转换为上下文管理器。下面我将详细解释它的使用方法。

## 1. **基本概念**

```python
from contextlib import contextmanager

# 不使用 @contextmanager 的传统方式
class FileHandler:
    """传统的上下文管理器类"""
    def __init__(self, filename, mode):
        self.filename = filename
        self.mode = mode
        self.file = None
    
    def __enter__(self):
        self.file = open(self.filename, self.mode)
        return self.file
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file:
            self.file.close()

# 使用 @contextmanager 的简洁方式
@contextmanager
def open_file(filename, mode):
    """使用 @contextmanager 的上下文管理器"""
    file = open(filename, mode)
    try:
        yield file  # 将 file 对象提供给 with 语句
    finally:
        file.close()
```

## 2. **基本用法**

### 2.1 最简单的例子
```python
from contextlib import contextmanager

@contextmanager
def simple_context():
    """最简单的上下文管理器"""
    print("进入上下文")  # __enter__ 部分
    yield  # 这里没有返回任何值
    print("退出上下文")   # __exit__ 部分

# 使用
with simple_context():
    print("在上下文中执行代码")

# 输出：
# 进入上下文
# 在上下文中执行代码
# 退出上下文
```

### 2.2 带返回值的上下文管理器
```python
@contextmanager
def managed_resource():
    """管理资源并返回值"""
    resource = "这是一个资源"  # 模拟资源分配
    print("分配资源")
    try:
        yield resource  # 将资源提供给 with 语句
    finally:
        print("释放资源")

# 使用，使用 as 接收返回值
with managed_resource() as res:
    print(f"使用资源: {res}")

# 输出：
# 分配资源
# 使用资源: 这是一个资源
# 释放资源
```

## 3. **实际应用示例**

### 3.1 文件操作
```python
@contextmanager
def open_file(filename, mode='r'):
    """安全地打开和关闭文件"""
    try:
        f = open(filename, mode)
        yield f  # 将文件对象提供给调用者
    except Exception as e:
        print(f"文件操作出错: {e}")
        raise
    finally:
        if 'f' in locals() and not f.closed:
            f.close()
            print(f"文件 {filename} 已关闭")

# 使用
with open_file('example.txt', 'w') as f:
    f.write('Hello, World!')

# 即使出现异常也会关闭文件
with open_file('example.txt', 'r') as f:
    content = f.read()
    print(content)
```

### 3.2 临时目录切换
```python
import os
from contextlib import contextmanager

@contextmanager
def change_directory(path):
    """临时切换工作目录"""
    original_dir = os.getcwd()
    try:
        os.chdir(path)
        yield  # 在这个目录下执行代码
    finally:
        os.chdir(original_dir)  # 恢复原目录

# 使用
print("原始目录:", os.getcwd())

with change_directory('/tmp'):
    print("临时目录:", os.getcwd())
    # 在这里进行文件操作

print("恢复后的目录:", os.getcwd())
```

### 3.3 计时器
```python
import time
from contextlib import contextmanager

@contextmanager
def timer(name="操作"):
    """计算代码块执行时间"""
    start_time = time.time()
    try:
        yield
    finally:
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"{name} 耗时: {elapsed:.4f} 秒")

# 使用
with timer("睡眠"):
    time.sleep(1)
```

## 4. **错误处理**

### 4.1 捕获并处理异常
```python
@contextmanager
def safe_operation():
    """安全操作，捕获并处理异常"""
    try:
        yield
    except ValueError as e:
        print(f"捕获到 ValueError: {e}")
        # 可以选择重新抛出异常
        # raise
    except Exception as e:
        print(f"捕获到其他异常: {e}")
        raise
    else:
        print("操作成功完成")

# 使用
print("示例1: 正常执行")
with safe_operation():
    print("正常操作")

print("\n示例2: 触发 ValueError")
with safe_operation():
    raise ValueError("测试错误")

print("\n示例3: 触发其他异常")
try:
    with safe_operation():
        raise TypeError("类型错误")
except TypeError:
    print("异常被重新抛出")
```

### 4.2 资源清理保证
```python
@contextmanager
def database_connection(db_url):
    """数据库连接管理"""
    print(f"连接到数据库: {db_url}")
    connection = {"status": "connected", "db_url": db_url}
    
    try:
        yield connection
    except Exception as e:
        print(f"数据库操作出错: {e}")
        raise
    finally:
        connection["status"] = "disconnected"
        print(f"断开数据库连接: {db_url}")

# 使用
try:
    with database_connection("mysql://localhost/test") as conn:
        print(f"连接状态: {conn['status']}")
        # 模拟数据库操作
        if "test" in conn["db_url"]:
            raise Exception("测试数据库操作失败")
except Exception as e:
    print(f"外部捕获异常: {e}")
```

## 5. **嵌套使用**

```python
@contextmanager
def indent_context(level=0):
    """缩进上下文"""
    indent = "  " * level
    print(f"{indent}进入层级 {level}")
    try:
        yield
    finally:
        print(f"{indent}退出层级 {level}")

# 嵌套使用
with indent_context(0):
    with indent_context(1):
        with indent_context(2):
            print("    最内层操作")
        print("  中间层操作")
    print("外层操作")
```

## 6. **参数化上下文管理器**

```python
@contextmanager
def transaction(db_connection, isolation_level="READ COMMITTED"):
    """数据库事务管理器"""
    print(f"开始事务，隔离级别: {isolation_level}")
    
    try:
        # 模拟开始事务
        db_connection["transaction"] = "started"
        yield db_connection
        
        # 如果没有异常，提交事务
        print("提交事务")
        db_connection["transaction"] = "committed"
        
    except Exception as e:
        # 如果有异常，回滚事务
        print(f"回滚事务，原因: {e}")
        db_connection["transaction"] = "rolled back"
        raise
    
    finally:
        print("事务结束")

# 使用
db = {"name": "test_db", "transaction": None}

try:
    with transaction(db, isolation_level="SERIALIZABLE") as conn:
        print(f"在事务中操作数据库: {conn['name']}")
        # 模拟操作
        conn["data"] = "some data"
        # 如果这里出现异常，事务会回滚
        # raise Exception("模拟失败")
except Exception as e:
    print(f"事务处理失败: {e}")

print(f"最终状态: {db}")
```

## 7. **高级用法**

### 7.1 可重用的上下文管理器
```python
@contextmanager
def tag(name):
    """HTML标签上下文管理器"""
    print(f"<{name}>")
    yield
    print(f"</{name}>")

# 使用
with tag("html"):
    with tag("body"):
        with tag("h1"):
            print("标题")
        with tag("p"):
            print("段落内容")
```

### 7.2 上下文管理器组合
```python
from contextlib import contextmanager, ExitStack

@contextmanager
def combined_context():
    """组合多个上下文管理器"""
    with ExitStack() as stack:
        # 进入多个上下文
        file1 = stack.enter_context(open("file1.txt", "w"))
        file2 = stack.enter_context(open("file2.txt", "w"))
        
        yield (file1, file2)
        
        # 会自动关闭所有文件

# 使用
with combined_context() as (f1, f2):
    f1.write("文件1内容")
    f2.write("文件2内容")
```

### 7.3 带状态管理的上下文
```python
@contextmanager
def stateful_context(initial_state=0):
    """带状态管理的上下文"""
    state = {"value": initial_state, "operations": []}
    
    print(f"初始状态: {state['value']}")
    
    def update_state(new_value, operation):
        """更新状态的辅助函数"""
        old_value = state["value"]
        state["value"] = new_value
        state["operations"].append({
            "operation": operation,
            "from": old_value,
            "to": new_value
        })
        print(f"状态更新: {old_value} -> {new_value} ({operation})")
    
    try:
        yield state, update_state  # 返回状态和更新函数
    finally:
        print(f"最终状态: {state['value']}")
        print(f"操作历史: {state['operations']}")

# 使用
with stateful_context(10) as (state, update):
    update(state["value"] + 5, "加5")
    update(state["value"] * 2, "乘2")
    update(state["value"] - 3, "减3")
```

## 8. **与类的上下文管理器对比**

```python
# 方法1：使用 @contextmanager（简洁）
@contextmanager
def file_handler_gen(filename, mode):
    file = open(filename, mode)
    try:
        yield file
    finally:
        file.close()

# 方法2：使用类（更灵活）
class FileHandlerClass:
    def __init__(self, filename, mode):
        self.filename = filename
        self.mode = mode
        self.file = None
    
    def __enter__(self):
        self.file = open(self.filename, self.mode)
        return self.file
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file:
            self.file.close()
        # 可以处理特定异常
        if exc_type is not None:
            print(f"异常类型: {exc_type}")
            print(f"异常值: {exc_val}")
        # 返回 False 会重新抛出异常，True 会抑制异常
        return False

# 使用对比
print("使用 @contextmanager:")
with file_handler_gen('test.txt', 'w') as f:
    f.write('Hello from generator')

print("\n使用类:")
with FileHandlerClass('test.txt', 'r') as f:
    content = f.read()
    print(content)
```

## 9. **最佳实践示例**

### 9.1 数据库连接池
```python
import sqlite3
from contextlib import contextmanager

class ConnectionPool:
    """简单的连接池"""
    def __init__(self, db_path, pool_size=5):
        self.db_path = db_path
        self.pool = []
        for _ in range(pool_size):
            conn = sqlite3.connect(db_path)
            self.pool.append(conn)
    
    @contextmanager
    def get_connection(self):
        """从连接池获取连接"""
        if not self.pool:
            raise RuntimeError("连接池耗尽")
        
        conn = self.pool.pop()
        try:
            yield conn
        finally:
            # 将连接放回池中
            self.pool.append(conn)
    
    def close_all(self):
        """关闭所有连接"""
        for conn in self.pool:
            conn.close()
        self.pool.clear()

# 使用
pool = ConnectionPool(':memory:', pool_size=3)

with pool.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    cursor.execute("INSERT INTO users (name) VALUES ('Alice')")
    conn.commit()

with pool.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    print(cursor.fetchall())

pool.close_all()
```

### 9.2 临时配置修改
```python
import os
import sys
from contextlib import contextmanager

@contextmanager
def temporary_environ(**kwargs):
    """临时修改环境变量"""
    original_values = {}
    
    # 保存原始值并设置新值
    for key, value in kwargs.items():
        if key in os.environ:
            original_values[key] = os.environ[key]
        os.environ[key] = value
    
    try:
        yield
    finally:
        # 恢复原始值
        for key in kwargs.keys():
            if key in original_values:
                os.environ[key] = original_values[key]
            else:
                os.environ.pop(key, None)

@contextmanager
def temporary_sys_path(path):
    """临时修改 sys.path"""
    original_path = sys.path.copy()
    sys.path.insert(0, path)
    
    try:
        yield
    finally:
        sys.path = original_path

# 使用
print("原始环境变量 PATH:", os.environ.get('PATH', '未设置'))

with temporary_environ(PATH="/new/path", CUSTOM_VAR="test"):
    print("临时环境变量 PATH:", os.environ['PATH'])
    print("临时环境变量 CUSTOM_VAR:", os.environ['CUSTOM_VAR'])

print("恢复后的环境变量 PATH:", os.environ.get('PATH', '未设置'))
```

## 10. **常见错误和陷阱**

```python
# 错误示例1：忘记 yield
@contextmanager
def wrong_context():
    """错误：忘记 yield"""
    print("进入")
    # 这里应该有一个 yield
    print("退出")

# 这会报错：RuntimeError: generator didn't yield

# 正确写法
@contextmanager
def correct_context():
    print("进入")
    yield  # 必须有 yield
    print("退出")

# 错误示例2：多次 yield
@contextmanager
def multiple_yield():
    """错误：多次 yield"""
    print("第一步")
    yield 1  # 第一个 yield
    print("第二步")
    yield 2  # 第二个 yield - 错误！

# 正确写法：如果需要多个阶段，考虑使用类
class MultiStageContext:
    def __enter__(self):
        print("第一阶段")
        return self
    
    def next_stage(self):
        print("第二阶段")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        print("退出")

# 错误示例3：异常处理不当
@contextmanager
def bad_exception_handling():
    """错误：异常处理不当"""
    resource = "资源"
    yield resource
    # 如果 yield 之前出错，这里的清理代码不会执行
    print("清理资源")

# 正确写法
@contextmanager
def good_exception_handling():
    """正确：使用 try-finally"""
    resource = "资源"
    try:
        yield resource
    finally:
        print("清理资源")  # 无论是否异常都会执行
```

## 11. **总结**

### 使用 `@contextmanager` 的好处：
1. **代码简洁**：比定义完整的类更简洁
2. **易于理解**：逻辑集中在一个函数中
3. **减少样板代码**：不需要定义 `__enter__` 和 `__exit__` 方法
4. **灵活的异常处理**：可以使用标准的 try-except-finally 结构

### 适用场景：
- **资源管理**：文件、数据库连接、网络连接等
- **临时状态修改**：环境变量、配置、工作目录等
- **计时和监控**：性能分析、日志记录
- **事务管理**：数据库事务、批处理操作
- **测试辅助**：临时模拟、状态重置

### 核心要点：
1. 使用 `@contextmanager` 装饰器装饰生成器函数
2. 生成器必须只包含一个 `yield` 语句
3. `yield` 之前的代码相当于 `__enter__` 方法
4. `yield` 之后的代码相当于 `__exit__` 方法
5. 使用 `try-finally` 确保清理代码总是执行
6. `yield` 可以返回一个值，通过 `as` 子句接收

`@contextmanager` 是 Python 中非常强大且优雅的工具，它使得上下文管理器的创建变得简单直观，是编写 Pythonic 代码的重要组成部分。