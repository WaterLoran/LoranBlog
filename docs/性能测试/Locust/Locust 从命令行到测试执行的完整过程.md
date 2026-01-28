# Locust 从命令行到测试执行的完整过程

## **1. 执行入口点**

### **1.1 主入口文件：`__main__.py`**
```python
# locust/__main__.py
def main():
    # 1. 解析命令行参数
    parsed_options = parse_options()
    
    # 2. 根据参数选择运行模式
    if parsed_options.master:
        run_master()
    elif parsed_options.worker:
        run_worker()
    elif parsed_options.web:
        run_web()
    else:
        # 3. 默认运行模式
        run_single()
```

## **2. 命令行解析过程**

### **2.1 参数解析器：`argument_parser.py`**
```python
# locust/argument_parser.py
def parse_options():
    parser = argparse.ArgumentParser()
    
    # 添加各种参数
    parser.add_argument(
        '-f', '--locustfile',
        default='locustfile.py',
        help="Python module file to import"
    )
    parser.add_argument(
        '-H', '--host',
        help="Host to load test"
    )
    # ... 其他参数
    
    return parser.parse_args()
```

## **3. 核心执行流程**

### **3.1 单机模式执行路径**
```python
# locust/runners.py
def run_single(parsed_options):
    # 1. 加载 locustfile
    locustfile = load_locustfile(parsed_options.locustfile)
    
    # 2. 创建环境
    env = create_environment(
        locustfile, 
        parsed_options.host,
        parsed_options
    )
    
    # 3. 创建并启动运行器
    runner = LocalRunner(env)
    
    # 4. 开始生成用户
    runner.start(
        user_count=parsed_options.users,
        spawn_rate=parsed_options.spawn_rate
    )
    
    # 5. 设置停止条件
    runner.greenlet.join()  # 等待测试完成
```

### **3.2 locustfile 加载过程**
```python
# locust/util/loader.py
def load_locustfile(path):
    """加载并执行 locustfile"""
    
    # 1. 确保文件存在
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Locustfile {path} not found")
    
    # 2. 创建导入路径
    directory, locustfile = os.path.split(path)
    sys.path.insert(0, directory)
    
    # 3. 执行文件
    try:
        # 执行 locustfile
        with open(path, 'rb') as file:
            exec(compile(file.read(), path, 'exec'), globals())
    finally:
        sys.path.pop(0)
    
    # 4. 提取 User 类
    user_classes = []
    for item in list(globals().values()):
        if (isinstance(item, type) and 
            issubclass(item, User) and 
            item is not User):
            user_classes.append(item)
    
    return user_classes
```

## **4. 运行时关键组件**

### **4.1 Runner 的启动过程**
```python
# locust/runners.py - LocalRunner 类
class LocalRunner:
    def start(self, user_count, spawn_rate):
        """启动负载生成"""
        
        # 1. 记录开始时间
        self.start_time = time.time()
        
        # 2. 创建协程池
        self.greenlet = gevent.spawn(self._spawn_users)
    
    def _spawn_users(self):
        """协程：生成用户"""
        while self.user_count < self.target_user_count:
            # 计算需要创建的用户数
            to_spawn = min(
                spawn_rate,
                self.target_user_count - self.user_count
            )
            
            # 批量创建用户
            for _ in range(to_spawn):
                user_class = self._select_user_class()
                user = user_class(self.environment)
                
                # 启动用户协程
                user._greenlet = gevent.spawn(user.run)
                self._users.append(user)
            
            # 等待下一个生成周期
            gevent.sleep(1.0 / spawn_rate)
```

### **4.2 用户执行循环**
```python
# locust/user/users.py - User 类
class User:
    def run(self):
        """用户的执行循环"""
        
        # 1. 调用 on_start 钩子
        self.on_start()
        
        try:
            # 2. 主任务循环
            while True:
                # 2.1 检查是否应该停止
                if self._stopped:
                    break
                
                # 2.2 执行任务
                task = self._pick_task()
                task(self)
                
                # 2.3 等待指定时间
                wait_time = self.wait_time()
                gevent.sleep(wait_time)
        
        finally:
            # 3. 调用 on_stop 钩子
            self.on_stop()
    
    def _pick_task(self):
        """基于权重选择任务"""
        # 实现任务选择逻辑
        tasks = self.tasks
        # 使用加权随机选择算法
        return weighted_random.choice(tasks)
```

## **5. 分布式模式执行**

### **5.1 主节点执行流程**
```python
# locust/runners.py - MasterRunner 类
class MasterRunner(Runner):
    def start(self, user_count, spawn_rate):
        # 1. 启动 Web UI
        self.web_ui.start()
        
        # 2. 等待 Worker 连接
        self._wait_for_workers()
        
        # 3. 向 Worker 分发配置
        self._send_start_message_to_workers(
            user_count, 
            spawn_rate
        )
        
        # 4. 收集并汇总结果
        self._collect_results()
```

### **5.2 Worker 节点执行流程**
```python
# locust/runners.py - WorkerRunner 类
class WorkerRunner(Runner):
    def _connect_to_master(self):
        """连接到主节点"""
        # 建立 WebSocket 连接
        self.client = WebsocketClient(
            f"ws://{self.master_host}:{self.master_port}/worker/connect"
        )
        
        # 监听主节点指令
        self.client.listen(self._handle_master_message)
    
    def _handle_master_message(self, message):
        """处理主节点指令"""
        if message.type == "start":
            # 启动用户生成
            self.start(message.user_count, message.spawn_rate)
        elif message.type == "stop":
            self.stop()
```

## **6. Web UI 启动流程**

```python
# locust/web.py
def start_web():
    # 1. 创建 Flask 应用
    app = Flask(__name__)
    
    # 2. 添加路由
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/stats/requests')
    def stats():
        return jsonify(env.stats.to_dict())
    
    # 3. 启动 WebSocket
    socketio = SocketIO(app)
    
    # 4. 启动服务器
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=8089,
        debug=False
    )
```

## **7. 代码执行路径总结**

```
命令行执行 → locust.__main__.main()
           → argument_parser.parse_options()
           → 根据参数选择模式：
                - 单机模式：runners.LocalRunner
                - 主节点：runners.MasterRunner  
                - 工作节点：runners.WorkerRunner
           → util.loader.load_locustfile()
           → 创建 Environment 对象
           → Runner.start() 启动测试
           → User 实例创建和运行
           → Task 执行循环
```

## **8. 关键代码文件位置**

| 文件路径                    | 主要功能                          |
| --------------------------- | --------------------------------- |
| `locust/__main__.py`        | 主入口点                          |
| `locust/argument_parser.py` | 命令行参数解析                    |
| `locust/runners.py`         | 运行器实现（Local/Master/Worker） |
| `locust/user/users.py`      | User 类定义和用户行为             |
| `locust/user/task.py`       | TaskSet 和任务调度                |
| `locust/util/loader.py`     | locustfile 加载器                 |
| `locust/stats.py`           | 统计数据处理                      |
| `locust/web.py`             | Web UI 服务器                     |
| `locust/event.py`           | 事件系统                          |

## **9. 实际调试示例**

如果你想跟踪执行流程，可以：

```python
# 1. 启用详细日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 2. 手动调用 locust
from locust import __main__ as locust_main
locust_main.main()

# 3. 或在代码中直接运行
from locust import runners, Environment
from locustfile import MyUser  # 你的用户类

env = Environment(user_classes=[MyUser])
runner = runners.LocalRunner(env)
runner.start(10, 1)  # 启动10个用户，孵化率1个/秒
```

## **10. 执行流程图**

```
用户输入命令
     ↓
locust -f locustfile.py -u 10 -r 1
     ↓
__main__.main() 解析
     ↓
argument_parser.parse_options()
     ↓
确定运行模式（单机/主/从）
     ↓
loader.load_locustfile() 加载用户脚本
     ↓
创建 Environment 实例
     ↓
创建 Runner（Local/Master/Worker）
     ↓
Runner.start() 启动测试
     ↓
    ├── 单机模式：直接生成 User 实例
    ├── 主节点：启动Web UI，等待Worker
    └── 工作节点：连接主节点，等待指令
     ↓
User.run() 循环执行任务
     ↓
TaskSet 调度任务
     ↓
发送请求 → 记录统计 → 触发事件
```

这个流程展示了 Locust 如何从命令行解析开始，逐步加载配置、创建运行环境、生成模拟用户并执行负载测试的完整过程。