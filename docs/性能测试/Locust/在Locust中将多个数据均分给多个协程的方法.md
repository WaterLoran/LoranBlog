# 在Locust中将多个数据均分给多个协程的方法

在 Locust 中实现数据均分给多个协程（用户）有几种方法。以下是几种实用的方案：

## 方案1：使用队列分配数据（推荐）

```python
from locust import HttpUser, task, between
from queue import Queue
import csv
import os

# 读取CSV数据
def load_csv_data(file_path):
    data = []
    with open(file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data.append(row)
    return data

# 创建数据队列
csv_file_path = "test_data.csv"
all_data = load_csv_data(csv_file_path)
data_queue = Queue()

# 将数据放入队列
for item in all_data:
    data_queue.put(item)

print(f"Loaded {data_queue.qsize()} records from CSV")

class DataDrivenUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """用户启动时获取数据"""
        if not data_queue.empty():
            self.user_data = data_queue.get()
            print(f"User got data: {self.user_data}")
        else:
            print("No more data available")
            self.user_data = None
    
    @task
    def process_data(self):
        if not self.user_data:
            print("No data available for this user")
            return
        
        # 使用分配的数据执行任务
        payload = {
            "name": self.user_data.get("name"),
            "email": self.user_data.get("email"),
            "category": self.user_data.get("category")
        }
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_record",
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                print(f"✅ Processed: {self.user_data}")
            else:
                response.failure(f"Failed: {response.status_code}")
    
    def on_stop(self):
        """用户停止时，如果还有未处理的数据可以放回队列"""
        pass
```

## 方案2：预先分配数据段（更均衡）

```python
from locust import HttpUser, task, between, events
import csv
import math

# 全局数据管理
class DataManager:
    def __init__(self, csv_file_path):
        self.all_data = self.load_data(csv_file_path)
        self.total_records = len(self.all_data)
        self.user_data_map = {}  # 用户ID -> 数据段
        self.user_counter = 0
        self.lock = False
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def assign_data_to_user(self, user_id):
        """为用户分配数据段"""
        if self.lock:
            return None
        
        self.user_counter += 1
        total_users = self.environment.runner.user_count if hasattr(self, 'environment') else self.user_counter
        
        # 计算每个用户应该处理的数据量
        records_per_user = math.ceil(self.total_records / total_users)
        start_index = (self.user_counter - 1) * records_per_user
        end_index = min(start_index + records_per_user, self.total_records)
        
        user_data = self.all_data[start_index:end_index]
        self.user_data_map[user_id] = {
            'data': user_data,
            'current_index': 0,
            'total_assigned': len(user_data)
        }
        
        print(f"User {user_id} assigned {len(user_data)} records "
              f"(index {start_index}-{end_index-1})")
        
        return self.user_data_map[user_id]
    
    def get_next_record(self, user_id):
        """获取用户的下一条记录"""
        if user_id not in self.user_data_map:
            return None
        
        user_info = self.user_data_map[user_id]
        if user_info['current_index'] >= len(user_info['data']):
            return None  # 所有数据已处理完
        
        record = user_info['data'][user_info['current_index']]
        user_info['current_index'] += 1
        return record
    
    def get_user_progress(self, user_id):
        """获取用户处理进度"""
        if user_id not in self.user_data_map:
            return 0, 0
        user_info = self.user_data_map[user_id]
        return user_info['current_index'], user_info['total_assigned']

# 初始化数据管理器
data_manager = DataManager("test_data.csv")

class BalancedDataUser(HttpUser):
    wait_time = between(1, 2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = id(self)  # 使用对象ID作为用户标识
        self.assigned_data = None
        self.current_record = None
    
    def on_start(self):
        """用户启动时分配数据段"""
        self.assigned_data = data_manager.assign_data_to_user(self.user_id)
        if self.assigned_data:
            self.current_record = data_manager.get_next_record(self.user_id)
            progress, total = data_manager.get_user_progress(self.user_id)
            print(f"User {self.user_id} started with {total} records")
    
    @task
    def process_assigned_data(self):
        if not self.current_record:
            # 尝试获取下一条记录
            self.current_record = data_manager.get_next_record(self.user_id)
            if not self.current_record:
                print(f"User {self.user_id} has no more records to process")
                self.stop(True)  # 停止这个用户
                return
        
        # 处理当前记录
        record = self.current_record
        payload = self._build_payload(record)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_data",
                            catch_response=True) as response:
            
            if self._validate_response(response, record):
                response.success()
                self._on_success(record)
            else:
                response.failure(f"Processing failed for record: {record.get('id', 'unknown')}")
        
        # 准备下一条记录
        self.current_record = data_manager.get_next_record(self.user_id)
    
    def _build_payload(self, record):
        """根据记录构建请求负载"""
        return {
            "id": record.get("id"),
            "name": record.get("name"),
            "value": record.get("value"),
            "timestamp": record.get("timestamp")
        }
    
    def _validate_response(self, response, record):
        """验证响应"""
        if response.status_code != 200:
            return False
        
        try:
            result = response.json()
            # 添加业务逻辑验证
            return result.get("success", False)
        except ValueError:
            return False
    
    def _on_success(self, record):
        """处理成功后的逻辑"""
        progress, total = data_manager.get_user_progress(self.user_id)
        print(f"User {self.user_id} progress: {progress}/{total} - Processed: {record.get('id')}")
    
    def on_stop(self):
        """用户停止时的清理工作"""
        progress, total = data_manager.get_user_progress(self.user_id)
        print(f"User {self.user_id} finished: {progress}/{total} records processed")
```

## 方案3：使用 Round Robin 轮询分配

```python
from locust import HttpUser, task, between
import csv
import itertools

class RoundRobinDataManager:
    def __init__(self, csv_file_path):
        self.all_data = self.load_data(csv_file_path)
        self.data_cycle = itertools.cycle(self.all_data)
        self.total_processed = 0
        self.max_processing = len(self.all_data)  # 限制总处理次数
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def get_next_record(self):
        """轮询获取下一条记录"""
        if self.total_processed >= self.max_processing:
            return None
        self.total_processed += 1
        return next(self.data_cycle)

# 初始化轮询管理器
rr_manager = RoundRobinDataManager("test_data.csv")

class RoundRobinUser(HttpUser):
    wait_time = between(1, 2)
    
    @task
    def process_data_round_robin(self):
        record = rr_manager.get_next_record()
        if not record:
            print("All data has been processed")
            self.stop(True)
            return
        
        payload = {
            "record_id": record.get("id"),
            "data": record
        }
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_rr",
                            catch_response=True) as response:
            
            if response.status_code == 200:
                response.success()
                print(f"Processed record {record.get('id')}")
            else:
                response.failure(f"Failed for record {record.get('id')}")
```

## 方案4：使用文件指针动态分配（适合大文件）

```python
from locust import HttpUser, task, between
import csv
import threading

class ConcurrentCSVReader:
    def __init__(self, csv_file_path):
        self.file_path = csv_file_path
        self.lock = threading.Lock()
        self.file_handles = {}  # user_id -> file position
        self.total_records = self._count_records()
    
    def _count_records(self):
        """统计总记录数"""
        with open(self.csv_file_path, 'r', encoding='utf-8') as file:
            return sum(1 for _ in file) - 1  # 减去标题行
    
    def get_next_record(self, user_id):
        """为指定用户获取下一条记录"""
        with self.lock:
            if user_id not in self.file_handles:
                # 新用户，打开文件并跳过标题
                file_handle = open(self.file_path, 'r', encoding='utf-8')
                reader = csv.DictReader(file_handle)
                self.file_handles[user_id] = {
                    'file': file_handle,
                    'reader': reader
                }
            
            user_file_info = self.file_handles[user_id]
            try:
                return next(user_file_info['reader'])
            except StopIteration:
                # 文件结束
                user_file_info['file'].close()
                del self.file_handles[user_id]
                return None
    
    def cleanup(self):
        """清理所有文件句柄"""
        for user_info in self.file_handles.values():
            user_info['file'].close()
        self.file_handles.clear()

# 初始化并发CSV读取器
csv_reader = ConcurrentCSVReader("large_data.csv")

class ConcurrentCSVUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = id(self)
    
    @task
    def process_from_csv(self):
        record = csv_reader.get_next_record(self.user_id)
        if not record:
            print(f"User {self.user_id} finished processing all available data")
            self.stop(True)
            return
        
        # 处理记录
        payload = self._prepare_payload(record)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_csv_record",
                            catch_response=True) as response:
            
            self._handle_response(response, record)
    
    def _prepare_payload(self, record):
        """准备请求数据"""
        return {key: value for key, value in record.items()}
    
    def _handle_response(self, response, record):
        """处理响应"""
        if response.status_code == 200:
            response.success()
            print(f"✅ Success: {record.get('id', 'unknown')}")
        else:
            response.failure(f"❌ Failed: {record.get('id', 'unknown')} - {response.status_code}")
    
    def on_stop(self):
        """用户停止时进行清理"""
        pass

# 注册测试结束事件进行全局清理
@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    csv_reader.cleanup()
```

## 使用示例和测试数据

创建一个示例CSV文件 `test_data.csv`：

```csv
id,name,email,category,value
1,User1,user1@test.com,A,100
2,User2,user2@test.com,B,200
3,User3,user3@test.com,A,150
4,User4,user4@test.com,C,300
5,User5,user5@test.com,B,250
...（更多记录直到100条）
```

运行Locust：

```bash
locust -f data_driven_locustfile.py --headless -u 10 -r 2 -t 5m
```

## 各方案对比

| 方案             | 优点                   | 缺点                   | 适用场景             |
| ---------------- | ---------------------- | ---------------------- | -------------------- |
| **队列分配**     | 简单易用，自动负载均衡 | 数据可能分配不均       | 小数据集，简单场景   |
| **预先分段**     | 分配均衡，性能好       | 需要预先知道用户数     | 中等数据集，要求均衡 |
| **轮询分配**     | 绝对均衡，实现简单     | 需要维护全局状态       | 小数据集，严格均衡   |
| **并发文件读取** | 适合大文件，内存友好   | 实现复杂，需要处理并发 | 大数据集，内存受限   |

**推荐使用方案2（预先分配数据段）**，因为它：
1. 数据分配均衡
2. 性能良好
3. 适合大多数场景
4. 易于监控进度

选择哪种方案取决于你的具体需求：数据大小、均衡性要求、内存限制等。