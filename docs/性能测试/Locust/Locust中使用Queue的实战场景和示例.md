# Locust中使用Queue的实战场景和示例

## **1. 基础使用场景**

### **1.1 任务分发与负载均衡**
```python
from locust import HttpUser, task, between
from gevent.queue import Queue
import gevent
import random

class Task:
    """任务对象"""
    def __init__(self, task_id, priority=1):
        self.task_id = task_id
        self.priority = priority
        self.status = "pending"
        self.created_at = time.time()

class TaskDistributor:
    """任务分发器（共享队列）"""
    def __init__(self):
        self.task_queue = Queue()  # 待处理任务队列
        self.result_queue = Queue()  # 结果队列
        self.completed_tasks = {}  # 已完成任务
        self._populate_tasks()
    
    def _populate_tasks(self):
        """初始化任务"""
        for i in range(1000):
            task = Task(
                task_id=f"task_{i}",
                priority=random.randint(1, 3)
            )
            self.task_queue.put(task)
    
    def get_task(self, worker_id):
        """获取任务"""
        try:
            task = self.task_queue.get_nowait()
            task.status = "processing"
            task.worker = worker_id
            return task
        except:
            return None
    
    def submit_result(self, task_id, result, success=True):
        """提交结果"""
        self.result_queue.put({
            'task_id': task_id,
            'result': result,
            'success': success,
            'completed_at': time.time()
        })

# 全局任务分发器
task_distributor = TaskDistributor()

class LoadBalancedUser(HttpUser):
    wait_time = between(0.1, 0.5)
    host = "http://api.example.com"
    
    def on_start(self):
        self.worker_id = f"worker_{self.id}"
        self.tasks_processed = 0
        self.failed_tasks = 0
    
    @task
    def process_task(self):
        """处理任务"""
        # 1. 从队列获取任务
        task = task_distributor.get_task(self.worker_id)
        
        if not task:
            # 队列为空，执行其他操作
            self.client.get("/api/health")
            return
        
        try:
            # 2. 执行任务（HTTP请求）
            start_time = time.time()
            
            # 模拟不同类型的任务
            if task.priority == 1:
                # 高优先级任务
                response = self.client.post(
                    "/api/process/high",
                    json={"task_id": task.task_id},
                    name="/api/process/high"
                )
            elif task.priority == 2:
                # 中优先级任务
                response = self.client.get(
                    f"/api/process/medium/{task.task_id}",
                    name="/api/process/medium"
                )
            else:
                # 低优先级任务
                response = self.client.get(
                    f"/api/process/low/{task.task_id}",
                    name="/api/process/low"
                )
            
            # 3. 处理结果
            if response.status_code == 200:
                # 成功，提交结果
                task_distributor.submit_result(
                    task.task_id,
                    response.json(),
                    success=True
                )
                self.tasks_processed += 1
                
                # 记录成功指标
                self.environment.events.request_success.fire(
                    request_type="TASK",
                    name=f"task_{task.priority}",
                    response_time=(time.time() - start_time) * 1000,
                    response_length=len(response.content)
                )
            else:
                # 失败
                task_distributor.submit_result(
                    task.task_id,
                    {"error": response.text},
                    success=False
                )
                self.failed_tasks += 1
                
        except Exception as e:
            # 异常处理
            task_distributor.submit_result(
                task.task_id,
                {"error": str(e)},
                success=False
            )
            self.failed_tasks += 1
```

### **1.2 登录凭证池**
```python
from locust import HttpUser, task, events
from gevent.queue import Queue
import gevent
import csv
import time

class CredentialPool:
    """登录凭证池（循环使用）"""
    
    def __init__(self, credential_file="users.csv", pool_size=100):
        self.queue = Queue(maxsize=pool_size)
        self.available = Queue()  # 可用凭证队列
        self.in_use = {}  # 使用中的凭证
        self.load_credentials(credential_file)
        
        # 启动凭证回收协程
        self.reclaimer = gevent.spawn(self._reclaim_credentials)
    
    def load_credentials(self, filename):
        """从CSV加载凭证"""
        try:
            with open(filename, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    credential = {
                        'username': row['username'],
                        'password': row['password'],
                        'user_id': row['user_id'],
                        'last_used': 0,
                        'use_count': 0
                    }
                    self.queue.put(credential)
                    self.available.put(credential)
            
            print(f"加载了 {self.queue.qsize()} 个凭证")
        except Exception as e:
            print(f"加载凭证失败: {e}")
    
    def acquire_credential(self, timeout=5):
        """获取凭证（带超时）"""
        try:
            credential = self.available.get(timeout=timeout)
            credential['last_used'] = time.time()
            credential['use_count'] += 1
            
            # 放入使用中列表
            self.in_use[id(credential)] = credential
            
            return credential
        except:
            return None
    
    def release_credential(self, credential):
        """释放凭证"""
        if id(credential) in self.in_use:
            del self.in_use[id(credential)]
        
        # 如果凭证使用次数过多，可以重新初始化
        if credential['use_count'] < 100:  # 最多使用100次
            self.available.put(credential)
        else:
            # 创建新凭证或从队列获取新凭证
            try:
                new_cred = self.queue.get_nowait()
                self.available.put(new_cred)
            except:
                pass
    
    def _reclaim_credentials(self):
        """回收长时间未释放的凭证"""
        while True:
            gevent.sleep(30)  # 每30秒检查一次
            
            now = time.time()
            to_reclaim = []
            
            for cred_id, credential in list(self.in_use.items()):
                if now - credential['last_used'] > 300:  # 5分钟未释放
                    to_reclaim.append(credential)
            
            for credential in to_reclaim:
                print(f"回收长时间未释放的凭证: {credential['username']}")
                self.release_credential(credential)

# 全局凭证池
credential_pool = CredentialPool(pool_size=200)

class AuthUser(HttpUser):
    host = "http://auth.example.com"
    wait_time = between(1, 3)
    
    def on_start(self):
        """用户启动时获取凭证"""
        self.credential = credential_pool.acquire_credential()
        
        if not self.credential:
            print(f"用户 {self.id} 无法获取凭证，停止")
            self.stop(force=True)
            return
        
        # 使用凭证登录
        self._login()
    
    def _login(self):
        """登录操作"""
        response = self.client.post(
            "/api/login",
            json={
                "username": self.credential['username'],
                "password": self.credential['password']
            }
        )
        
        if response.status_code == 200:
            self.token = response.json().get('token')
            self.logged_in = True
            print(f"用户 {self.credential['username']} 登录成功")
        else:
            print(f"用户 {self.credential['username']} 登录失败")
            self.logged_in = False
    
    @task
    def access_protected_resource(self):
        """访问需要认证的资源"""
        if not self.logged_in:
            # 尝试重新登录
            self._login()
            if not self.logged_in:
                return
        
        # 访问受保护资源
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get("/api/protected/data", headers=headers)
    
    def on_stop(self):
        """用户停止时释放凭证"""
        if hasattr(self, 'credential'):
            credential_pool.release_credential(self.credential)
```

## **2. 高级使用场景**

### **2.1 消息队列模拟（生产者-消费者）**
```python
from locust import User, task, between
from gevent.queue import Queue, Empty, Full
import gevent
import json
import time
from typing import Dict, Any

class MessageQueueSimulator:
    """模拟消息队列系统"""
    
    def __init__(self, num_queues=3, queue_size=1000):
        self.queues: Dict[str, Queue] = {}
        self.queue_stats: Dict[str, Dict] = {}
        
        # 创建多个队列
        for i in range(num_queues):
            queue_name = f"queue_{i}"
            self.queues[queue_name] = Queue(maxsize=queue_size)
            self.queue_stats[queue_name] = {
                'messages_published': 0,
                'messages_consumed': 0,
                'publish_errors': 0,
                'consume_errors': 0,
                'current_size': 0
            }
        
        # 启动统计协程
        self.stats_reporter = gevent.spawn(self._report_stats)
    
    def publish(self, queue_name: str, message: Dict[str, Any]) -> bool:
        """发布消息"""
        if queue_name not in self.queues:
            return False
        
        message['publish_time'] = time.time()
        message['message_id'] = f"msg_{self.queue_stats[queue_name]['messages_published']}"
        
        try:
            self.queues[queue_name].put_nowait(message)
            self.queue_stats[queue_name]['messages_published'] += 1
            self.queue_stats[queue_name]['current_size'] = self.queues[queue_name].qsize()
            return True
        except Full:
            self.queue_stats[queue_name]['publish_errors'] += 1
            return False
    
    def consume(self, queue_name: str, timeout=1.0) -> Dict[str, Any]:
        """消费消息"""
        if queue_name not in self.queues:
            return None
        
        try:
            message = self.queues[queue_name].get(timeout=timeout)
            message['consume_time'] = time.time()
            message['processing_time'] = message['consume_time'] - message['publish_time']
            
            self.queue_stats[queue_name]['messages_consumed'] += 1
            self.queue_stats[queue_name]['current_size'] = self.queues[queue_name].qsize()
            
            return message
        except Empty:
            self.queue_stats[queue_name]['consume_errors'] += 1
            return None
    
    def _report_stats(self):
        """定期报告队列统计"""
        while True:
            gevent.sleep(10)
            
            print("\n" + "="*50)
            print("消息队列统计报告")
            print("="*50)
            
            for queue_name, stats in self.queue_stats.items():
                throughput = stats['messages_consumed'] / 10 if stats['messages_consumed'] > 0 else 0
                print(f"\n队列: {queue_name}")
                print(f"  发布消息: {stats['messages_published']}")
                print(f"  消费消息: {stats['messages_consumed']}")
                print(f"  当前大小: {stats['current_size']}")
                print(f"  吞吐量: {throughput:.1f} 消息/秒")
                print(f"  发布错误: {stats['publish_errors']}")
                print(f"  消费错误: {stats['consume_errors']}")

# 全局消息队列
mq = MessageQueueSimulator(num_queues=3, queue_size=500)

class ProducerUser(User):
    """生产者用户"""
    wait_time = between(0.1, 0.3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.produced_count = 0
        self.queue_names = list(mq.queues.keys())
    
    @task(3)
    def publish_high_priority(self):
        """发布高优先级消息"""
        message = {
            'priority': 'high',
            'user_id': self.id,
            'data': {'type': 'urgent', 'value': time.time()},
            'retry_count': 0
        }
        
        success = mq.publish(self.queue_names[0], message)
        
        if success:
            self.produced_count += 1
            self.environment.events.request_success.fire(
                request_type="PUBLISH",
                name="publish_high",
                response_time=0,
                response_length=len(json.dumps(message))
            )
    
    @task(2)
    def publish_medium_priority(self):
        """发布中优先级消息"""
        message = {
            'priority': 'medium',
            'user_id': self.id,
            'data': {'type': 'normal', 'value': time.time()},
            'retry_count': 0
        }
        
        success = mq.publish(self.queue_names[1], message)
        
        if success:
            self.produced_count += 1
            self.environment.events.request_success.fire(
                request_type="PUBLISH",
                name="publish_medium",
                response_time=0,
                response_length=len(json.dumps(message))
            )
    
    @task(1)
    def publish_low_priority(self):
        """发布低优先级消息"""
        message = {
            'priority': 'low',
            'user_id': self.id,
            'data': {'type': 'background', 'value': time.time()},
            'retry_count': 0
        }
        
        success = mq.publish(self.queue_names[2], message)
        
        if success:
            self.produced_count += 1
            self.environment.events.request_success.fire(
                request_type="PUBLISH",
                name="publish_low",
                response_time=0,
                response_length=len(json.dumps(message))
            )

class ConsumerUser(User):
    """消费者用户"""
    wait_time = between(0.05, 0.2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.consumed_count = 0
        self.queue_names = list(mq.queues.keys())
    
    @task
    def consume_messages(self):
        """消费消息"""
        for queue_name in self.queue_names:
            message = mq.consume(queue_name, timeout=0.1)
            
            if message:
                self.consumed_count += 1
                
                # 模拟处理消息
                processing_time = random.uniform(0.01, 0.1)
                gevent.sleep(processing_time)
                
                # 记录处理成功的指标
                self.environment.events.request_success.fire(
                    request_type="CONSUME",
                    name=f"consume_{queue_name}",
                    response_time=processing_time * 1000,
                    response_length=len(json.dumps(message))
                )
                
                # 如果处理失败，可以重新入队
                if random.random() < 0.05:  # 5%的失败率
                    message['retry_count'] += 1
                    if message['retry_count'] < 3:
                        mq.publish(queue_name, message)
```

### **2.2 数据流水线测试**
```python
from locust import User, task, events
from gevent.queue import Queue
import gevent
import time
import hashlib

class DataPipeline:
    """数据处理流水线"""
    
    def __init__(self, stages=3):
        self.stages = stages
        self.queues = [Queue(maxsize=100) for _ in range(stages + 1)]
        
        # 阶段处理器
        self.processors = []
        for i in range(stages):
            processor = gevent.spawn(self._process_stage, i)
            self.processors.append(processor)
    
    def input_data(self, data):
        """输入数据到流水线"""
        try:
            self.queues[0].put_nowait({
                'data': data,
                'timestamp': time.time(),
                'stage': 0,
                'processing_times': []
            })
            return True
        except Full:
            return False
    
    def _process_stage(self, stage_index):
        """处理指定阶段"""
        while True:
            try:
                # 从上一阶段获取数据
                item = self.queues[stage_index].get(timeout=1)
                
                # 模拟处理
                start_time = time.time()
                
                # 不同类型的处理逻辑
                if stage_index == 0:
                    # 第一阶段：数据验证
                    item['valid'] = self._validate_data(item['data'])
                    item['hash'] = hashlib.md5(str(item['data']).encode()).hexdigest()
                
                elif stage_index == 1:
                    # 第二阶段：数据转换
                    if item.get('valid', False):
                        item['transformed'] = self._transform_data(item['data'])
                    else:
                        item['transformed'] = None
                
                elif stage_index == 2:
                    # 第三阶段：数据存储
                    if item.get('transformed'):
                        item['stored'] = True
                        item['storage_id'] = f"id_{hash(item['hash'])}"
                
                processing_time = time.time() - start_time
                item['processing_times'].append(processing_time)
                item['stage'] = stage_index + 1
                
                # 传递到下一阶段
                if stage_index < len(self.queues) - 2:
                    self.queues[stage_index + 1].put(item)
                else:
                    # 最后阶段，输出结果
                    self.queues[-1].put(item)
                
            except Empty:
                continue
    
    def _validate_data(self, data):
        """验证数据"""
        return isinstance(data, dict) and 'value' in data
    
    def _transform_data(self, data):
        """转换数据"""
        if 'value' in data:
            return {'processed_value': data['value'] * 2}
        return None
    
    def get_output(self):
        """获取输出"""
        try:
            return self.queues[-1].get_nowait()
        except Empty:
            return None
    
    def get_queue_sizes(self):
        """获取各队列大小"""
        return [q.qsize() for q in self.queues]

# 全局流水线
pipeline = DataPipeline(stages=3)

class PipelineUser(User):
    """流水线测试用户"""
    wait_time = between(0.05, 0.2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data_generator = self._generate_data()
        self.processed_count = 0
    
    def _generate_data(self):
        """生成测试数据"""
        counter = 0
        while True:
            yield {
                'id': counter,
                'user': self.id,
                'value': random.random() * 100,
                'timestamp': time.time(),
                'metadata': {'source': 'test', 'version': '1.0'}
            }
            counter += 1
    
    @task(2)
    def feed_pipeline(self):
        """向流水线输入数据"""
        data = next(self.data_generator)
        
        success = pipeline.input_data(data)
        
        if success:
            self.environment.events.request_success.fire(
                request_type="PIPELINE",
                name="pipeline_input",
                response_time=0,
                response_length=len(str(data))
            )
        else:
            self.environment.events.request_failure.fire(
                request_type="PIPELINE",
                name="pipeline_input",
                response_time=0,
                exception="Queue Full"
            )
    
    @task(1)
    def check_output(self):
        """检查流水线输出"""
        output = pipeline.get_output()
        
        if output:
            self.processed_count += 1
            
            # 记录处理时间
            total_time = sum(output['processing_times'])
            
            self.environment.events.request_success.fire(
                request_type="PIPELINE",
                name="pipeline_output",
                response_time=total_time * 1000,
                response_length=len(str(output))
            )
            
            # 可以输出统计信息
            if self.processed_count % 100 == 0:
                queue_sizes = pipeline.get_queue_sizes()
                print(f"用户 {self.id} 处理 {self.processed_count} 条数据，队列大小: {queue_sizes}")
```

## **3. 实际应用场景**

### **3.1 API网关限流测试**
```python
from locust import HttpUser, task
from gevent.queue import Queue
import gevent
import time

class RateLimiterSimulator:
    """API网关限流模拟器"""
    
    def __init__(self, rps_limit=100, burst_limit=50):
        self.rps_limit = rps_limit  # 每秒请求限制
        self.burst_limit = burst_limit  # 突发流量限制
        self.token_bucket = Queue(maxsize=burst_limit)
        self.request_queue = Queue(maxsize=1000)
        
        # 初始化令牌桶
        for _ in range(burst_limit):
            self.token_bucket.put_nowait("token")
        
        # 启动令牌生成器
        self.token_generator = gevent.spawn(self._generate_tokens)
        
        # 启动请求处理器
        self.request_processor = gevent.spawn(self._process_requests)
        
        # 统计
        self.stats = {
            'total_requests': 0,
            'processed_requests': 0,
            'rejected_requests': 0,
            'queue_wait_time': 0,
            'last_minute_rps': 0
        }
    
    def _generate_tokens(self):
        """生成令牌（控制RPS）"""
        tokens_per_second = self.rps_limit / 10.0  # 每100ms生成一次
        
        while True:
            gevent.sleep(0.1)  # 每100ms生成一次
            
            tokens_to_add = int(tokens_per_second)
            for _ in range(tokens_to_add):
                if not self.token_bucket.full():
                    try:
                        self.token_bucket.put_nowait("token")
                    except:
                        pass
    
    def make_request(self, request_data, timeout=2):
        """发起请求（受限流控制）"""
        self.stats['total_requests'] += 1
        request_id = f"req_{self.stats['total_requests']}"
        
        request_info = {
            'id': request_id,
            'data': request_data,
            'created_at': time.time(),
            'user_id': request_data.get('user_id', 'unknown')
        }
        
        # 尝试获取令牌
        try:
            token = self.token_bucket.get_nowait()
            
            # 有令牌，立即处理
            request_info['start_time'] = time.time()
            request_info['wait_time'] = 0
            request_info['status'] = 'processing'
            
            # 放入处理队列
            self.request_queue.put(request_info)
            return True
            
        except:
            # 无令牌，检查队列是否满
            if self.request_queue.full():
                # 队列满，拒绝请求
                self.stats['rejected_requests'] += 1
                return False
            else:
                # 放入队列等待
                request_info['status'] = 'queued'
                self.request_queue.put(request_info)
                
                # 等待处理（超时机制）
                start_wait = time.time()
                while time.time() - start_wait < timeout:
                    if request_info.get('processed', False):
                        return True
                    gevent.sleep(0.01)
                
                # 超时
                self.stats['rejected_requests'] += 1
                return False
    
    def _process_requests(self):
        """处理队列中的请求"""
        while True:
            try:
                # 获取请求
                request_info = self.request_queue.get(timeout=1)
                
                # 模拟处理
                processing_time = random.uniform(0.01, 0.05)
                gevent.sleep(processing_time)
                
                # 更新状态
                request_info['processed'] = True
                request_info['processing_time'] = processing_time
                
                # 如果请求在队列中等待过，计算等待时间
                if request_info['status'] == 'queued':
                    wait_time = time.time() - request_info['created_at']
                    self.stats['queue_wait_time'] = (
                        self.stats['queue_wait_time'] * 0.9 + wait_time * 0.1
                    )
                
                self.stats['processed_requests'] += 1
                
            except Empty:
                continue

# 创建限流器（模拟API网关）
rate_limiter = RateLimiterSimulator(rps_limit=200, burst_limit=100)

class GatewayUser(HttpUser):
    """API网关测试用户"""
    host = "http://gateway.example.com"
    wait_time = between(0.01, 0.1)  # 高频率请求
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.success_count = 0
        self.failure_count = 0
    
    @task
    def call_api(self):
        """调用API"""
        request_data = {
            'user_id': self.id,
            'endpoint': random.choice(['/api/v1/users', '/api/v1/products', '/api/v1/orders']),
            'method': 'GET',
            'timestamp': time.time()
        }
        
        # 通过限流器发起请求
        start_time = time.time()
        
        allowed = rate_limiter.make_request(request_data)
        
        if allowed:
            # 请求被允许，实际发送HTTP请求
            try:
                response = self.client.get(request_data['endpoint'])
                
                if response.status_code == 200:
                    self.success_count += 1
                    self.environment.events.request_success.fire(
                        request_type="GATEWAY",
                        name="gateway_request",
                        response_time=(time.time() - start_time) * 1000,
                        response_length=len(response.content)
                    )
                else:
                    self.failure_count += 1
                    
            except Exception as e:
                self.failure_count += 1
        else:
            # 请求被限流器拒绝
            self.failure_count += 1
            self.environment.events.request_failure.fire(
                request_type="GATEWAY",
                name="gateway_request",
                response_time=(time.time() - start_time) * 1000,
                exception="Rate Limited"
            )
    
    def on_stop(self):
        """用户停止时输出统计"""
        total = self.success_count + self.failure_count
        if total > 0:
            success_rate = (self.success_count / total) * 100
            print(f"用户 {self.id}: 成功率 {success_rate:.1f}% "
                  f"({self.success_count}/{total})")
```

### **3.2 WebSocket消息广播测试**
```python
from locust import User, task, events
from gevent.queue import Queue, Empty
import gevent
import json
import time
import websocket
import threading

class WebSocketMessageBroker:
    """WebSocket消息代理（模拟消息广播）"""
    
    def __init__(self, max_clients=1000):
        self.client_queues = {}  # client_id -> Queue
        self.broadcast_queue = Queue(maxsize=10000)
        self.max_clients = max_clients
        
        # 启动广播器
        self.broadcaster = gevent.spawn(self._broadcast_messages)
        
        # 统计
        self.stats = {
            'messages_sent': 0,
            'messages_broadcast': 0,
            'active_clients': 0,
            'queue_backlog': 0
        }
    
    def register_client(self, client_id):
        """注册客户端"""
        if len(self.client_queues) >= self.max_clients:
            return False
        
        self.client_queues[client_id] = Queue(maxsize=100)
        self.stats['active_clients'] = len(self.client_queues)
        return True
    
    def unregister_client(self, client_id):
        """注销客户端"""
        if client_id in self.client_queues:
            del self.client_queues[client_id]
            self.stats['active_clients'] = len(self.client_queues)
    
    def send_message(self, client_id, message):
        """向特定客户端发送消息"""
        if client_id in self.client_queues:
            try:
                self.client_queues[client_id].put_nowait(message)
                self.stats['messages_sent'] += 1
                return True
            except Full:
                return False
        return False
    
    def broadcast_message(self, message):
        """广播消息到所有客户端"""
        try:
            self.broadcast_queue.put_nowait(message)
            return True
        except Full:
            return False
    
    def _broadcast_messages(self):
        """广播消息"""
        while True:
            try:
                # 获取广播消息
                message = self.broadcast_queue.get(timeout=1)
                self.stats['messages_broadcast'] += 1
                
                # 发送给所有客户端
                for client_id, queue in list(self.client_queues.items()):
                    try:
                        queue.put_nowait(message)
                    except Full:
                        # 客户端队列满，跳过
                        pass
                
            except Empty:
                continue
    
    def receive_message(self, client_id, timeout=1):
        """接收客户端消息"""
        if client_id in self.client_queues:
            try:
                return self.client_queues[client_id].get(timeout=timeout)
            except Empty:
                return None
        return None

# 全局消息代理
message_broker = WebSocketMessageBroker(max_clients=5000)

class WebSocketUser(User):
    """WebSocket测试用户"""
    wait_time = between(0.5, 2)
    
    def on_start(self):
        """连接WebSocket"""
        self.client_id = f"ws_user_{self.id}"
        
        # 注册到消息代理
        if not message_broker.register_client(self.client_id):
            print(f"客户端 {self.client_id} 注册失败（已达最大连接数）")
            self.stop(force=True)
            return
        
        # 模拟WebSocket连接
        self.connected = True
        self.message_count = 0
        self.last_message_time = time.time()
        
        # 启动消息接收协程
        self.receiver = gevent.spawn(self._receive_messages)
        
        print(f"WebSocket客户端 {self.client_id} 已连接")
    
    def _receive_messages(self):
        """接收消息"""
        while self.connected:
            message = message_broker.receive_message(self.client_id, timeout=0.5)
            
            if message:
                self.message_count += 1
                self.last_message_time = time.time()
                
                # 记录消息接收事件
                self.environment.events.request_success.fire(
                    request_type="WEBSOCKET",
                    name="ws_receive",
                    response_time=0,
                    response_length=len(json.dumps(message))
                )
                
                # 处理消息
                self._handle_message(message)
    
    def _handle_message(self, message):
        """处理接收到的消息"""
        # 根据消息类型处理
        msg_type = message.get('type', 'unknown')
        
        if msg_type == 'chat':
            # 聊天消息
            pass
        elif msg_type == 'notification':
            # 通知消息
            pass
        elif msg_type == 'system':
            # 系统消息
            pass
    
    @task(3)
    def send_chat_message(self):
        """发送聊天消息"""
        if not self.connected:
            return
        
        message = {
            'type': 'chat',
            'from': self.client_id,
            'content': f"Message from {self.client_id} at {time.time()}",
            'timestamp': time.time()
        }
        
        # 发送到随机客户端
        if message_broker.client_queues:
            random_client = random.choice(list(message_broker.client_queues.keys()))
            if random_client != self.client_id:
                success = message_broker.send_message(random_client, message)
                
                if success:
                    self.environment.events.request_success.fire(
                        request_type="WEBSOCKET",
                        name="ws_send_direct",
                        response_time=0,
                        response_length=len(json.dumps(message))
                    )
    
    @task(1)
    def broadcast_message(self):
        """广播消息"""
        if not self.connected:
            return
        
        message = {
            'type': 'broadcast',
            'from': self.client_id,
            'content': f"Broadcast from {self.client_id}",
            'timestamp': time.time()
        }
        
        success = message_broker.broadcast_message(message)
        
        if success:
            self.environment.events.request_success.fire(
                request_type="WEBSOCKET",
                name="ws_broadcast",
                response_time=0,
                response_length=len(json.dumps(message))
            )
    
    @task(2)
    def send_system_message(self):
        """发送系统消息"""
        if not self.connected:
            return
        
        message = {
            'type': 'system',
            'command': random.choice(['ping', 'status', 'info']),
            'user': self.client_id,
            'timestamp': time.time()
        }
        
        # 发送到所有客户端（通过广播）
        success = message_broker.broadcast_message(message)
        
        if success:
            self.environment.events.request_success.fire(
                request_type="WEBSOCKET",
                name="ws_system",
                response_time=0,
                response_length=len(json.dumps(message))
            )
    
    def on_stop(self):
        """断开连接"""
        self.connected = False
        message_broker.unregister_client(self.client_id)
        print(f"WebSocket客户端 {self.client_id} 断开连接，"
              f"接收消息: {self.message_count}")
```

## **4. 监控和调试**

### **4.1 队列监控装饰器**
```python
from functools import wraps
from gevent.queue import Queue
import time

def monitor_queue(queue_obj, name="default"):
    """队列监控装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                # 记录成功
                queue_obj.monitor_stats[name] = queue_obj.monitor_stats.get(name, {
                    'success': 0,
                    'failure': 0,
                    'total_time': 0,
                    'avg_time': 0
                })
                
                stats = queue_obj.monitor_stats[name]
                stats['success'] += 1
                stats['total_time'] += time.time() - start_time
                stats['avg_time'] = stats['total_time'] / stats['success']
                
                return result
                
            except Exception as e:
                # 记录失败
                if name not in queue_obj.monitor_stats:
                    queue_obj.monitor_stats[name] = {
                        'success': 0,
                        'failure': 0,
                        'total_time': 0,
                        'avg_time': 0
                    }
                
                queue_obj.monitor_stats[name]['failure'] += 1
                raise e
        
        return wrapper
    return decorator

class MonitoredQueue(Queue):
    """带监控的队列"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.monitor_stats = {}
        
        # 重写put和get方法
        self._original_put = self.put
        self._original_get = self.get
        
        self.put = monitor_queue(self, name="put")(self._original_put)
        self.get = monitor_queue(self, name="get")(self._original_get)
    
    def get_stats(self):
        """获取统计信息"""
        return self.monitor_stats

# 使用示例
class MonitoredUser(User):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.queue = MonitoredQueue(maxsize=100)
    
    @task
    def use_monitored_queue(self):
        self.queue.put("test_data")
        data = self.queue.get()
```

## **总结**

在Locust中使用Queue的主要场景包括：

1. **任务分发和负载均衡**：多个用户共享任务队列
2. **资源池管理**：如连接池、凭证池
3. **消息队列模拟**：测试消息中间件性能
4. **数据流水线**：模拟多阶段数据处理
5. **限流和速率控制**：测试网关限流能力
6. **实时通信**：如WebSocket消息广播

**关键注意事项**：
- 使用`gevent.queue`而不是`queue`模块（协程安全）
- 设置合理的队列大小避免内存溢出
- 实现优雅的错误处理和超时机制
- 监控队列状态和性能指标
- 在分布式测试中考虑跨进程通信（可能需要Redis等外部队列）