# 循环使用 CSV 数据的 Locust 实现方案

当需要循环使用 CSV 数据而不是一次性分配时，我们需要修改数据管理策略。以下是几种实现循环使用数据的方案：

## 方案1：循环队列（推荐）

```python
from locust import HttpUser, task, between
from queue import Queue
import csv
import itertools

class CircularDataManager:
    def __init__(self, csv_file_path):
        self.all_data = self.load_data(csv_file_path)
        self.data_cycle = itertools.cycle(self.all_data)  # 创建无限循环迭代器
        self.total_records = len(self.all_data)
        print(f"Loaded {self.total_records} records for circular use")
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def get_next_record(self):
        """获取下一条记录，到达末尾后从头开始"""
        return next(self.data_cycle)

# 初始化循环数据管理器
circular_manager = CircularDataManager("test_data.csv")

class CircularDataUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.processed_count = 0
    
    @task
    def process_circular_data(self):
        # 获取下一条记录（会自动循环）
        record = circular_manager.get_next_record()
        
        # 处理记录
        payload = self._prepare_payload(record)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_circular",
                            catch_response=True) as response:
            
            if self._validate_response(response):
                response.success()
                self._on_success(record)
            else:
                response.failure(f"Failed: {response.status_code}")
        
        self.processed_count += 1
    
    def _prepare_payload(self, record):
        """准备请求数据"""
        return {
            "id": record.get("id"),
            "name": record.get("name"),
            "email": record.get("email"),
            "category": record.get("category")
        }
    
    def _validate_response(self, response):
        """验证响应"""
        return response.status_code == 200
    
    def _on_success(self, record):
        """成功处理记录后的回调"""
        if self.processed_count % 10 == 0:  # 每处理10条记录打印一次
            print(f"User {id(self)} processed {self.processed_count} records, current: {record.get('id')}")
```

## 方案2：带索引的循环分配

```python
from locust import HttpUser, task, between
import csv
import threading

class IndexedCircularManager:
    def __init__(self, csv_file_path):
        self.all_data = self.load_data(csv_file_path)
        self.total_records = len(self.all_data)
        self.user_indices = {}  # 用户ID -> 当前索引
        self.lock = threading.Lock()
        print(f"Loaded {self.total_records} records for indexed circular use")
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def get_next_record(self, user_id):
        """为指定用户获取下一条记录，循环使用数据"""
        with self.lock:
            if user_id not in self.user_indices:
                # 新用户，随机分配起始位置
                import random
                self.user_indices[user_id] = random.randint(0, self.total_records - 1)
            
            current_index = self.user_indices[user_id]
            record = self.all_data[current_index]
            
            # 更新索引，循环到开头
            self.user_indices[user_id] = (current_index + 1) % self.total_records
            
            return record, current_index
    
    def get_user_progress(self, user_id):
        """获取用户处理进度"""
        if user_id not in self.user_indices:
            return 0, 0
        current_index = self.user_indices[user_id]
        # 计算循环次数
        cycles = current_index // self.total_records
        position = current_index % self.total_records
        return cycles, position

# 初始化索引循环管理器
indexed_manager = IndexedCircularManager("test_data.csv")

class IndexedCircularUser(HttpUser):
    wait_time = between(1, 2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = id(self)
        self.cycles_completed = 0
        self.last_cycle_report = 0
    
    @task
    def process_indexed_data(self):
        # 获取下一条记录和索引
        record, index = indexed_manager.get_next_record(self.user_id)
        
        # 检查是否完成了一轮循环
        if index == 0 and self.last_cycle_report != self.cycles_completed:
            self.cycles_completed += 1
            self.last_cycle_report = self.cycles_completed
            print(f"User {self.user_id} completed {self.cycles_completed} full cycles")
        
        # 处理记录
        payload = self._prepare_payload(record)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_indexed",
                            catch_response=True) as response:
            
            if response.status_code == 200:
                response.success()
                if index % 20 == 0:  # 每处理20条记录打印一次
                    cycles, pos = indexed_manager.get_user_progress(self.user_id)
                    print(f"User {self.user_id} at cycle {cycles}, position {pos}: {record.get('id')}")
            else:
                response.failure(f"Failed for record {record.get('id')}")
    
    def _prepare_payload(self, record):
        """准备请求数据"""
        return {
            "record_id": record.get("id"),
            "data": record
        }
```

## 方案3：分组循环策略

```python
from locust import HttpUser, task, between
import csv
import random

class GroupCircularManager:
    def __init__(self, csv_file_path, group_size=10):
        self.all_data = self.load_data(csv_file_path)
        self.total_records = len(self.all_data)
        self.group_size = min(group_size, self.total_records)
        
        # 将数据分成多个组
        self.groups = []
        for i in range(0, self.total_records, self.group_size):
            group = self.all_data[i:i+self.group_size]
            self.groups.append(group)
        
        self.group_cycles = {}  # 用户ID -> (当前组索引, 当前组内索引)
        
        print(f"Loaded {self.total_records} records into {len(self.groups)} groups of size {self.group_size}")
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def get_next_record(self, user_id):
        """为指定用户获取下一条记录，按组循环"""
        if user_id not in self.group_cycles:
            # 新用户，随机分配起始组
            self.group_cycles[user_id] = [random.randint(0, len(self.groups)-1), 0]
        
        group_idx, record_idx = self.group_cycles[user_id]
        current_group = self.groups[group_idx]
        record = current_group[record_idx]
        
        # 更新索引
        record_idx += 1
        if record_idx >= len(current_group):
            # 当前组处理完毕，移动到下一组
            record_idx = 0
            group_idx = (group_idx + 1) % len(self.groups)
        
        self.group_cycles[user_id] = [group_idx, record_idx]
        
        return record, group_idx, record_idx

# 初始化分组循环管理器（每组10条记录）
group_manager = GroupCircularManager("test_data.csv", group_size=10)

class GroupCircularUser(HttpUser):
    wait_time = between(1, 2)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = id(self)
    
    @task
    def process_group_data(self):
        # 获取下一条记录和位置信息
        record, group_idx, record_idx = group_manager.get_next_record(self.user_id)
        
        # 处理记录
        payload = self._prepare_payload(record)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_group",
                            catch_response=True) as response:
            
            if response.status_code == 200:
                response.success()
                # 每组开始时打印
                if record_idx == 0:
                    print(f"User {self.user_id} starting group {group_idx}")
            else:
                response.failure(f"Failed for record {record.get('id')}")
    
    def _prepare_payload(self, record):
        """准备请求数据"""
        return {
            "id": record.get("id"),
            "name": record.get("name"),
            "group_info": f"Group data processing"
        }
```

## 方案4：加权随机循环

```python
from locust import HttpUser, task, between
import csv
import random

class WeightedCircularManager:
    def __init__(self, csv_file_path, weights=None):
        self.all_data = self.load_data(csv_file_path)
        self.total_records = len(self.all_data)
        
        # 设置权重（如果不提供，则使用均匀权重）
        if weights is None or len(weights) != self.total_records:
            self.weights = [1.0] * self.total_records
        else:
            self.weights = weights
        
        # 归一化权重
        total_weight = sum(self.weights)
        self.normalized_weights = [w/total_weight for w in self.weights]
        
        print(f"Loaded {self.total_records} records with weighted distribution")
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def get_random_weighted_record(self):
        """根据权重随机选择一条记录"""
        return random.choices(self.all_data, weights=self.normalized_weights)[0]
    
    def get_uniform_random_record(self):
        """均匀随机选择一条记录"""
        return random.choice(self.all_data)

# 初始化加权循环管理器
# 可以为不同记录设置不同权重，例如前10条记录权重更高
weights = [2.0] * 10 + [1.0] * 90  # 前10条记录权重为2，其余为1
weighted_manager = WeightedCircularManager("test_data.csv", weights)

class WeightedCircularUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.processed_count = 0
    
    @task
    def process_weighted_data(self):
        # 根据权重随机选择记录
        record = weighted_manager.get_random_weighted_record()
        
        # 处理记录
        payload = self._prepare_payload(record)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_weighted",
                            catch_response=True) as response:
            
            if response.status_code == 200:
                response.success()
                self.processed_count += 1
                
                if self.processed_count % 15 == 0:
                    print(f"User {id(self)} processed {self.processed_count} records")
            else:
                response.failure(f"Failed: {response.status_code}")
    
    @task(1)  # 较低权重的任务，使用均匀随机
    def process_uniform_data(self):
        # 均匀随机选择记录
        record = weighted_manager.get_uniform_random_record()
        
        with self.client.post("/api/process", 
                            json={"record": record, "type": "uniform_random"},
                            name="process_uniform",
                            catch_response=True) as response:
            
            if response.status_code == 200:
                response.success()
    
    def _prepare_payload(self, record):
        """准备请求数据"""
        return {
            "record": record,
            "type": "weighted_random"
        }
```

## 方案5：带状态保存的循环

```python
from locust import HttpUser, task, between
import csv
import json
import os

class StatefulCircularManager:
    def __init__(self, csv_file_path, state_file="user_state.json"):
        self.all_data = self.load_data(csv_file_path)
        self.total_records = len(self.all_data)
        self.state_file = state_file
        self.user_states = self.load_user_states()
        
        print(f"Loaded {self.total_records} records with stateful circular use")
    
    def load_data(self, file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(row)
        return data
    
    def load_user_states(self):
        """加载用户状态"""
        if os.path.exists(self.state_file):
            with open(self.state_file, 'r') as f:
                return json.load(f)
        return {}
    
    def save_user_states(self):
        """保存用户状态"""
        with open(self.state_file, 'w') as f:
            json.dump(self.user_states, f, indent=2)
    
    def get_next_record(self, user_id):
        """为指定用户获取下一条记录，保持状态"""
        if user_id not in self.user_states:
            # 新用户，从0开始
            self.user_states[user_id] = 0
        
        current_index = self.user_states[user_id]
        record = self.all_data[current_index]
        
        # 更新索引，循环到开头
        next_index = (current_index + 1) % self.total_records
        self.user_states[user_id] = next_index
        
        # 保存状态（在实际场景中可能需要更高效的保存策略）
        self.save_user_states()
        
        return record, current_index
    
    def get_user_state(self, user_id):
        """获取用户状态"""
        if user_id not in self.user_states:
            return 0, 0
        index = self.user_states[user_id]
        cycles = index // self.total_records
        position = index % self.total_records
        return cycles, position

# 初始化带状态保存的循环管理器
stateful_manager = StatefulCircularManager("test_data.csv")

class StatefulCircularUser(HttpUser):
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = f"user_{id(self)}"  # 使用字符串ID便于JSON序列化
    
    def on_start(self):
        """用户启动时显示当前状态"""
        cycles, position = stateful_manager.get_user_state(self.user_id)
        print(f"User {self.user_id} starting at cycle {cycles}, position {position}")
    
    @task
    def process_stateful_data(self):
        # 获取下一条记录和索引
        record, index = stateful_manager.get_next_record(self.user_id)
        
        # 处理记录
        payload = self._prepare_payload(record, index)
        
        with self.client.post("/api/process", 
                            json=payload,
                            name="process_stateful",
                            catch_response=True) as response:
            
            if response.status_code == 200:
                response.success()
                
                # 每完成一轮循环报告一次
                if index == stateful_manager.total_records - 1:
                    cycles, position = stateful_manager.get_user_state(self.user_id)
                    print(f"User {self.user_id} completed cycle {cycles-1}")
            else:
                response.failure(f"Failed for record {record.get('id')}")
    
    def _prepare_payload(self, record, index):
        """准备请求数据"""
        return {
            "record": record,
            "index": index,
            "user_id": self.user_id
        }
    
    def on_stop(self):
        """用户停止时报告最终状态"""
        cycles, position = stateful_manager.get_user_state(self.user_id)
        print(f"User {self.user_id} stopped at cycle {cycles}, position {position}")
```

## 使用示例

创建一个示例 CSV 文件 `test_data.csv`：

```csv
id,name,email,category,value
1,User1,user1@test.com,A,100
2,User2,user2@test.com,B,200
3,User3,user3@test.com,A,150
4,User4,user4@test.com,C,300
5,User5,user5@test.com,B,250
...（更多记录直到100条）
```

运行 Locust：

```bash
locust -f circular_data_locustfile.py --headless -u 5 -r 1 -t 10m
```

## 各方案对比

| 方案         | 优点                   | 缺点               | 适用场景                       |
| ------------ | ---------------------- | ------------------ | ------------------------------ |
| **循环队列** | 实现简单，绝对均衡     | 顺序固定，无法随机 | 需要简单循环的场景             |
| **索引循环** | 可跟踪进度，灵活       | 实现稍复杂         | 需要跟踪处理进度的场景         |
| **分组循环** | 数据局部性，可批量处理 | 组大小需要调整     | 相关数据需要集中处理的场景     |
| **加权随机** | 可模拟真实分布         | 可能不够均衡       | 需要模拟特定数据分布的场景     |
| **状态保存** | 可恢复测试状态         | 有IO开销           | 需要长时间测试且可能中断的场景 |

**推荐使用方案1（循环队列）** 作为起点，因为它：
1. 实现简单
2. 绝对均衡地使用所有数据
3. 性能良好
4. 适合大多数循环使用数据的场景

根据你的具体需求（是否需要随机性、是否需要跟踪进度、是否需要状态持久化等），可以选择最适合的方案。