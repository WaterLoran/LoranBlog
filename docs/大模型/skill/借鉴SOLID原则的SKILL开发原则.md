# 借鉴SOLID原则的SKILL开发原则

在测试工程中开发“Skill”（可以理解为一个独立的测试能力、测试模块或测试任务），同样可以完美地应用 **SOLID 原则**。下面结合一个**庞大测试工程**的典型场景（例如：需要开发登录验证、下单流程、支付回调等不同测试 Skill），逐一讲解每个原则的含义、具体做法和例子。

---

## 1. 单一职责原则（SRP）
> **一个 Skill 只应有一个引起它变化的原因**

### 怎么做？
- **一个 Skill 只专注做一种类型的测试操作**，不要将“数据准备”、“执行操作”、“结果校验”、“日志报告”全部塞在一起。
- 当需求变化时（比如登录接口字段变更），只需要修改登录相关的 Skill，而不会影响到其他 Skill。

### 例子：登录 Skill
❌ **违反 SRP**（一个 Skill 干了太多事）：
```python
class LoginSkill:
    def execute(self, username, password):
        # 1. 生成测试数据
        # 2. 调用登录API
        # 3. 校验响应
        # 4. 把结果写到HTML报告
        # 5. 发送邮件通知
        ...
```

✅ **符合 SRP**（拆分为多个职责单一的 Skill）：
```python
class LoginApiCallSkill:   # 只负责调用登录API
    def call(self, username, password): ...

class LoginValidatorSkill: # 只负责校验登录结果
    def validate(self, response): ...

class LoginDataPrepSkill:  # 只负责准备测试数据
    def prepare(self): ...
```

这样当报告格式变化时，完全不需要动 `LoginApiCallSkill`。

---

## 2. 开闭原则（OCP）
> **Skill 应该对扩展开放，对修改关闭**

### 怎么做？
- 定义稳定的抽象接口（如 `TestSkill` 基类或协议）。
- 新增一种测试 Skill（比如“扫码登录 Skill”）时，**不修改已有 Skill 的代码**，而是新增一个实现类。

### 例子：支付验证 Skill
```python
from abc import ABC, abstractmethod

class PaymentSkill(ABC):          # 抽象接口，稳定不变
    @abstractmethod
    def pay(self, amount): ...

# 已有：微信支付 Skill（无需修改）
class WechatPaySkill(PaymentSkill):
    def pay(self, amount):
        print(f"微信支付 {amount} 元")

# 新增：支付宝支付 Skill（对扩展开放）
class AlipaySkill(PaymentSkill):
    def pay(self, amount):
        print(f"支付宝支付 {amount} 元")

# 测试执行器
def run_payment_test(skill: PaymentSkill):
    skill.pay(100)
```
要增加银联支付？再写一个 `UnionPaySkill` 即可，**完全不需要改动 `WechatPaySkill` 和测试执行器**。

---

## 3. 里氏替换原则（LSP）
> **子类 Skill 必须能完全替换父类 Skill 而不改变测试逻辑的正确性**

### 怎么做？
- 所有派生 Skill 必须遵守父类的约定（输入参数、输出格式、异常行为等）。
- 不要在子类中强化前置条件（比如要求额外的必填字段）或弱化后置条件（比如返回更少的信息）。

### 例子：数据清理 Skill
```python
class CleanupSkill(ABC):
    @abstractmethod
    def cleanup(self, resource_id): ...

# 正确的子类：清理数据库记录
class DbCleanupSkill(CleanupSkill):
    def cleanup(self, resource_id):
        # 删除 ID 对应的记录
        ...

# 也是正确的：清理临时文件
class FileCleanupSkill(CleanupSkill):
    def cleanup(self, resource_id):
        # 删除 /tmp/resource_id 文件
        ...

# ❌ 违反 LSP：子类要求 resource_id 必须大于 100
class SpecialCleanupSkill(CleanupSkill):
    def cleanup(self, resource_id):
        if resource_id <= 100:
            raise ValueError("只允许清理大于100的资源")   # 强化了前置条件，无法替换父类
```

在测试框架中，当你用 `CleanupSkill` 类型调用时，必须保证所有子类行为一致。违反 LSP 会导致测试脚本不可预测。

---

## 4. 接口隔离原则（ISP）
> **不要强迫 Skill 实现它用不到的方法**

### 怎么做？
- 将大而全的“万能 Skill 接口”拆分为多个专门的小接口。
- 让具体的测试 Skill 只实现它真正需要的接口。

### 例子：API 测试 Skill
❌ **臃肿的接口**：
```python
class AllPurposeApiSkill(ABC):
    @abstractmethod
    def get(self): ...
    @abstractmethod
    def post(self): ...
    @abstractmethod
    def put(self): ...
    @abstractmethod
    def delete(self): ...
    @abstractmethod
    def upload_file(self): ...   # 很多 Skill 根本不需要
```

✅ **隔离后的接口**：
```python
class HttpGetSkill(ABC):
    @abstractmethod
    def get(self): ...

class HttpPostSkill(ABC):
    @abstractmethod
    def post(self): ...

class FileUploadSkill(ABC):
    @abstractmethod
    def upload(self): ...
```

现在，一个只做“查询测试”的 Skill 只需要实现 `HttpGetSkill`，而不必被迫实现 `post/put/delete/upload` 等空方法。

---

## 5. 依赖倒置原则（DIP）
> **高层测试逻辑不应依赖低层 Skill 的具体实现，两者都应依赖抽象**

### 怎么做？
- 测试编排脚本（高层）直接依赖接口（如 `TestSkill`），而不是某个具体的 `DatabaseSkill` 或 `ApiSkill`。
- 通过依赖注入（构造函数传参或 setter）将具体 Skill 实例传给调用者。

### 例子：端到端订单测试
```python
# 抽象接口
class OrderCreationSkill(ABC):
    @abstractmethod
    def create(self, product_id): ...

class InventoryCheckSkill(ABC):
    @abstractmethod
    def check(self, product_id): ...

# 高层测试场景
class EndToEndOrderTest:
    def __init__(self, order_skill: OrderCreationSkill, inv_skill: InventoryCheckSkill):
        self.order_skill = order_skill      # 依赖抽象，不是具体类
        self.inv_skill = inv_skill

    def run_test(self, product_id):
        assert self.inv_skill.check(product_id) > 0
        order = self.order_skill.create(product_id)
        assert order.status == "success"

# 具体实现
class RealDbInventorySkill(InventoryCheckSkill):
    def check(self, product_id):
        return query_db(product_id)   # 真实数据库

class MockInventorySkill(InventoryCheckSkill):
    def check(self, product_id):
        return 999                    # 测试桩

# 依赖注入：可以轻松切换真实环境或Mock环境
test = EndToEndOrderTest(RealOrderSkill(), MockInventorySkill())
```

这样，**高层测试逻辑不关心你到底用的是 MySQL、Redis 还是 Mock**，完全解耦。修改底层实现时，无需改动任何上层测试代码。

---

## 💎 总结：测试工程中 SOLID 的落地效果

| 原则  | 对你的 Skill 开发的实际好处                                  |
| ----- | ------------------------------------------------------------ |
| **S** | 每个 Skill 只做一件事 → 易于理解、修改和调试。               |
| **O** | 新增 Skill 不修改旧代码 → 不怕引入回归缺陷。                 |
| **L** | 替换任意子类 Skill 保证行为正确 → 多用组合/多态，少写 if-else 判断类型。 |
| **I** | 接口小而精 → 避免 Skill 被迫实现无用方法，保持清爽。         |
| **D** | 依赖抽象而非具体 → 测试环境切换（真实/桩/Mock）丝般顺滑。    |

在庞大测试工程中，团队里许多人同时开发不同 Skill，如果不遵守这些原则，很快就会变成“改一行代码，炸一片用例”的灾难。**把每一个 Skill 当成一个小型可插拔组件**，用 SOLID 约束其设计和边界，你的测试工程将变得健壮、灵活、易维护。