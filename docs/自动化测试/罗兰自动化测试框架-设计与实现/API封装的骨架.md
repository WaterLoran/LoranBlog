## API封装框架设计与实现分析

### 问题背景
在测试自动化框架中，API封装需要解决的核心问题：
1. **接口多样性**：支持不同协议类型（JSON/URLEncoded/FormData）
2. **流程标准化**：统一处理请求准备、发送、响应处理全流程
3. **上下文管理**：跨步骤传递数据（如鉴权信息、提取数据）
4. **后置数据恢复**：实现失败重试和数据清理机制
5. **断言扩展**：支持多层级校验（API层默认断言+业务层主动断言）
6. **提取信息**: 支持根据业务层表达式提取信息(业务层提取信息)
7. **事件驱动**: 支持通过retry和force关键字来执行具体的事件行为
8. **接收文件**: 支持根据关键字来接收文件并存放到本地

等等其他其他待扩展的功能

### 核心设计架构

```mermaid
graph LR
A[API装饰器] --> B[初始化步骤上下文]
B --> C[执行事件驱动逻辑]
C --> D[参数预处理]
D --> E[请求体填充]
E --> F[请求体填充]
F --> G[发送请求]
G --> H[响应处理]
H --> I[断言校验]
I --> J[数据提取]
J --> K[清理准备]
```

### 具体实现解析

#### 1. 装饰器入口（API类型分发）
```python
class Api:
    @classmethod
    def json(self, func):
        def wrapper(**kwargs):
            step_check_res = Api().abstract_api("json", func, wrapper, **kwargs)
            return step_check_res
        return wrapper
    
    @classmethod
    def urlencoded(self, func):
        # 类似json实现
        ...
    
    @classmethod
    def form_data(self, func):
        # 类似json实现
        ...
```
- **协议抽象**：通过装饰器标识API类型
- **统一入口**：所有API调用进入`abstract_api`主流程

#### 2. 上下文管理
```python
class StepContext:
    def init_step(self, api_type, func, **kwargs):
        self.api_type = api_type
        self.func = func
        self.unprocessed_kwargs = kwargs
        self.req_json = None
        self.rsp_data = None
        # 其他20+状态属性...

class ServiceContext:
    def __init__(self):
        self.restore_list = []  # 数据清理栈
        self.remain_retry = 0   # 重试计数器
        # 全局共享状态...
```

#### 3. 核心流程引擎（abstract_api）
```python
def abstract_api(self, api_type, func, wrapper, **kwargs):
    # 1. 初始化上下文
    self.init_step(api_type, func, wrapper, **kwargs)
    
    # 2. 处理重试机制
    if self.get_retry_and_do_retry(): 
        return True
    
    # 3. 提取关键参数（fetch/check/restore）
    self.get_fetch()
    self.get_check()
    self.get_restore()
    
    # 4. 获取API层数据定义
    self.get_api_data()
    
    # 5. 填充请求参数
    self.fill_input_para_to_req_body()
    
    # 6. 发送实际请求
    self.do_real_request()
    
    # 7. 准备清理数据
    self.fetch_for_restore()
    
    # 8. 接收文件
    self.do_recv_file()
    
    # 9. 多级断言校验
    self.do_api_default_check()   # API层断言
    self.do_service_check()       # 业务层断言
    
    # 10. 数据提取
    self.do_service_fetch()
    
    return self.get_step_check_res()
```

#### 4. 智能参数填充
```python
def fill_input_para_to_req_body(self):
    if api_type == "json":
        # 使用RequestData组件智能修改请求体
        req_json = RequestData().modify_req_body(req_json, **kwargs)
        step_context.req_json = req_json
```

#### 5. 多级断言体系
```python
def do_api_default_check(self):
    # API层预定义断言
    ResponseData().check_api_default_expect(req_data, rsp_data, rsp_check, check)

def do_service_check(self):
    # 业务层主动断言
    ResponseData().check_all_expect(rsp_data, check)
```

#### 6. 提取信息功能

```python
# 业务脚本层的信息提取
  def do_service_fetch(self):
			# ...
      ResponseData().rsp_fetch_all_value(rsp_data, fetch)
			# ...

```

#### 7. 事件驱动功能-retry

```python
def do_retry_logic(self):
    while remain_retry > 0:
        step_assert_res = wrapper_func(**kwargs)
        if step_assert_res: 
            # 恢复原始断言状态
            pytest_check.check_log._num_failures = service_context.stack_pytest_check_num_failures
            break
        time.sleep(1)
```

### 优劣分析

#### 优势 ✅
1. **协议无关性**
   - 统一处理JSON/FormData/URLEncoded
   - 自动适配不同请求格式
2. **全生命周期管理**
   - 覆盖请求准备→发送→响应处理全流程
   - 上下文状态自动维护
   - 易于去扩展各类功能

#### 待改进点 ⚠️
1. **上下文复杂性**
   - StepContext包含20+属性，维护成本高
   - 改进：引入状态模式简化管理

2. **性能监控缺失**
   - 未记录请求耗时等性能指标
   - 改进：添加性能数据采集


### 核心收益

1. **脚本简洁度提升**
   ```python
   @Api.json
   @allure.step("添加用户-add_user")
   def add_user(userName="", nickName="", password=""):
       req_url = "/dev-api/system/user"
       req_method = "POST"
       req_json = {
           "deptId": None,  # 部门ID
           "userName": "",  # 用户名称
           "nickName": "",  # 用户昵称
           "password": "",  # 密码
           "phonenumber": "",  # 电话号码
           "email": "",
           "sex": "",  # 性别 0表示男, 1表示女
           "status": "",  # 状态, 0表示启用, 1表示停用
           "remark": "",  # 备注
           "postIds": [],  # 岗位ID
           "roleIds": []  # 角色
       }
       rsp_field = {
           "msg": {"jsonpath": "$.msg"}
       }
       rsp_check = {
           "msg": "操作成功",
           "code": 200,
       }
       return locals()
   
   # 测试脚本
   def test_user_creation():
       var_name = "loran_123"
       add_user(
           userName=var_name, nickName=var_name, password=var_name,
           check=[
               ["$.msg", "eq", "操作成功"],
               ["$.code", "==", 200],
               ["msg", "eq", "操作成功"]
           ],
       )
   ```
   
2. **维护成本降低**
   - 接口变更只需修改API定义层
   - 业务脚本无需调整
   - 框架功能扩展高效
   
3. **协作效率提高**
   
   - 清晰分离API定义层和业务层
   - 不同角色并行工作
   

### 未来展望

#### 1. 智能协议适配
```python
@Api.auto  # 自动检测协议类型
def smart_api():
    return {...}
```

#### 2. 基于流量的自动化生成API关键字
```python
def generate_api_from_har(har_file):
    # 解析HAR文件自动生成API定义
    return ApiDefinition(...)
```



### 总结

该API封装框架通过装饰器模式、上下文管理和标准化流程引擎，实现了：

- **接口统一化**：封装请求全生命周期管理的各类功能
- **关注点分离**：清晰划分API定义与业务逻辑