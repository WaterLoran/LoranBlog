# Pytest结合Locust做性能自动化的例子

下面是一个结合 `locust` 和 `pytest` 进行性能自动化测试的基础例子和思路，并附上一些代码示例。

### 🛠️ 项目设置

首先，确保安装必要的库：
```bash
pip install locust pytest
```

### 📝 示例：Locust 性能测试脚本

创建一个名为 `locustfile.py` 的文件，用于定义模拟用户的行为：

```python
from locust import HttpUser, task, between

class MyTestUser(HttpUser):
    # 设置任务之间的等待时间范围（秒）
    wait_time = between(1, 3) 
    
    @task
    def get_homepage(self):
        # 测试对网站根路径的访问
        self.client.get("/")
    
    @task(3)  # 权重为3，执行频率更高
    def get_about_page(self):
        # 测试"关于我们"页面
        self.client.get("/about")
        
    def on_start(self):
        # 虚拟用户启动时执行，可用于登录等初始化操作
        print("A new user is starting his journey...")
        
    def on_stop(self):
        # 虚拟用户停止时执行，可用于清理
        print("A user is stopping.")
```

**关键点说明：**
- **用户行为类**：继承 `HttpUser`。
- **`wait_time`**：控制用户执行任务间的等待时间，模拟真实用户思考。
- **`@task` 装饰器**：定义测试任务，权重参数决定执行频率。
- **`self.client`**：用于发送 HTTP 请求，支持 GET、POST 等方法。
- **`on_start` 与 `on_stop`**：用于每个虚拟用户开始和结束时的特定操作。

### 🔬 使用 Pytest 运行 Locust

虽然 Locust 通常通过命令行或其 Web 界面启动，但你也可以借助 `pytest` 来组织或触发测试。一种方式是使用 `pytest` 运行 Locust 脚本。

1.  **命令行集成**：在 `pytest` 测试中，你可以通过命令行的方式调用 Locust。例如，创建一个 `test_performance.py` 文件：

```python
import pytest
import subprocess
import time

def test_locust_performance():
    """
    使用 pytest 触发 Locust 无界面模式执行测试
    """
    try:
        # 启动 Locust 无界面模式，指定用户数、孵化率、运行时间
        process = subprocess.Popen([
            'locust', 
            '-f', 'locustfile.py', 
            '--headless', 
            '-u', '10',           # 模拟用户总数
            '-r', '2',            # 每秒孵化用户数
            '-t', '30s',          # 测试运行时间
            '--host', 'http://your-test-server.com'  # 被测系统主机地址
        ])
        # 等待测试完成
        time.sleep(35)
        # 检查进程是否正常结束
        process.terminate()
        assert process.returncode is None or process.returncode == 0
    except Exception as e:
        pytest.fail(f"性能测试执行失败: {e}")
```

**注意**：这个例子演示了如何使用 `pytest` 启动一个 Locust 进程。实际断言可能需要根据 Locust 的输出或退出码进行调整，或者依赖 Locust 生成的 CSV 报告进行更详细的结果分析。

2.  **直接使用 Locust 的库（高级）**：对于更复杂的集成，可以研究直接使用 Locust 的库函数在 Python 脚本中启动负载测试，但这通常更复杂。

### 🚀 执行测试

- **运行 Pytest**：在终端中执行 `pytest test_performance.py -v`。
- **直接运行 Locust（传统方式）**：
  在终端中输入：
  ```bash
  locust -f locustfile.py --host=http://your-test-server.com
  ```
  然后打开浏览器访问 `http://localhost:8089` 来配置并启动测试。

### 💡 进阶建议

- **分布式测试**：对于大规模负载，可使用 Locust 的 `--master` 和 `--worker` 参数进行分布式测试。
- **无 Web UI 模式**：在自动化流水线中，使用 `--headless` 参数。
- **测试增强**：考虑参数化、检查点（断言）等。
- **结果分析**：关注 Locust 报告中的 **平均响应时间**、**中间值**、**失败率** 和 **RPS（每秒请求数）** 等关键指标。

这个例子展示了将 `locust` 和 `pytest` 结合的基本方法。`pytest` 主要用于触发和管理测试流程，而负载生成和性能数据收集的核心仍然由 `locust` 完成。

希望这个例子能帮助你入门。如果你在具体实现中遇到问题，比如需要更复杂的用户行为模拟或者特定的 `pytest` 集成方式，欢迎随时提出。