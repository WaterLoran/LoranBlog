# Python 中实现 Java 式 Service/ServiceImpl 模式

在 Java 中常见的 `XXService` 接口 + `XXServiceImpl` 实现类的模式，在 Python 中可以通过多种方式实现类似的抽象与实现分离。以下是 Python 中几种等效的实现方式：

## 1. 抽象基类 (ABC) 模式 - 最接近 Java 的实现

```python
from abc import ABC, abstractmethod

# 相当于 XXService 接口
class PaymentService(ABC):
    @abstractmethod
    def process_payment(self, amount: float) -> bool:
        pass

# 相当于 XXServiceImpl 实现类
class StripePaymentService(PaymentService):
    def process_payment(self, amount: float) -> bool:
        # 实际支付处理逻辑
        print(f"Processing ${amount} via Stripe")
        return True

# 另一个实现
class PayPalPaymentService(PaymentService):
    def process_payment(self, amount: float) -> bool:
        # 实际支付处理逻辑
        print(f"Processing ${amount} via PayPal")
        return True

# 使用
service: PaymentService = StripePaymentService()
service.process_payment(99.99)
```

### 特点：
- 强制实现所有抽象方法
- 类型提示明确
- 最接近 Java 的接口/实现模式

## 2. Protocol 类型提示 (Python 3.8+)

```python
from typing import Protocol

# 定义服务协议 (相当于接口)
class PaymentService(Protocol):
    def process_payment(self, amount: float) -> bool: ...

# 实现类
class StripePaymentService:
    def process_payment(self, amount: float) -> bool:
        print(f"Processing ${amount} via Stripe")
        return True

# 使用
service: PaymentService = StripePaymentService()
service.process_payment(49.99)

# 类型检查
def process_order(service: PaymentService, amount: float):
    service.process_payment(amount)
    
process_order(StripePaymentService(), 29.99)  # 通过类型检查
```

### 特点：
- 运行时无约束，仅静态类型检查
- 不需要显式继承
- 更符合 Python 的鸭子类型哲学

## 3. 简单接口模式 (Pythonic 方式)

```python
class PaymentService:
    def process_payment(self, amount: float) -> bool:
        raise NotImplementedError("Subclasses must implement this method")

class StripePaymentService(PaymentService):
    def process_payment(self, amount: float) -> bool:
        print(f"Processing ${amount} via Stripe")
        return True

# 使用
service = StripePaymentService()
service.process_payment(19.99)
```

### 特点：
- 简单直接
- 运行时检查而非编译时检查
- 最常用的 Python 方式

## 4. 依赖注入模式

```python
from dataclasses import dataclass

# 定义服务接口
class PaymentService:
    def process_payment(self, amount: float) -> bool:
        raise NotImplementedError

# 实现
class StripeService(PaymentService):
    def process_payment(self, amount: float) -> bool:
        print(f"Processing ${amount} via Stripe")
        return True

# 业务类使用服务
@dataclass
class OrderProcessor:
    payment_service: PaymentService
    
    def complete_order(self, amount: float):
        if self.payment_service.process_payment(amount):
            print("Order completed")

# 使用
processor = OrderProcessor(payment_service=StripeService())
processor.complete_order(59.99)
```

### 特点：
- 松耦合
- 易于替换实现
- 适合测试（可注入 mock 服务）

## 5. 模块化实现 (文件结构)

Java 的接口/实现通常对应文件结构：

```
services/
    payment_service.py   # 包含 PaymentService 抽象类
    implementations/
        stripe_service.py   # 包含 StripePaymentService
        paypal_service.py   # 包含 PayPalPaymentService
```

**payment_service.py**:
```python
from abc import ABC, abstractmethod

class PaymentService(ABC):
    @abstractmethod
    def process_payment(self, amount: float) -> bool:
        pass
```

**stripe_service.py**:
```python
from services.payment_service import PaymentService

class StripePaymentService(PaymentService):
    def process_payment(self, amount: float) -> bool:
        # Stripe 实现
        return True
```

## 对比总结

| 特性         | Java 接口/实现          | Python ABC     | Python Protocol | Python 简单接口 |
| ------------ | ----------------------- | -------------- | --------------- | --------------- |
| 强制实现     | ✅ (编译时)              | ✅ (运行时)     | ❌ (仅类型提示)  | ❌ (需手动检查)  |
| 多继承支持   | ❌ (接口可多继承)        | ✅              | ✅               | ✅               |
| 类型检查     | 强类型                  | 运行时检查     | 静态类型检查    | 无              |
| 鸭子类型支持 | ❌                       | ❌              | ✅               | ✅               |
| 默认实现     | Java 8+ default methods | ✅ (非抽象方法) | ❌               | ✅               |
| 最Pythonic   | -                       | 中等           | 高              | 高              |

## 最佳实践建议

1. **简单项目**：使用简单接口模式（方法3）
   ```python
   class PaymentService:
       def process_payment(self, amount): ...
   
   class StripeService(PaymentService):
       def process_payment(self, amount):
           # 实现
   ```

2. **中大型项目**：使用ABC抽象基类（方法1）
   ```python
   from abc import ABC, abstractmethod
   
   class PaymentService(ABC):
       @abstractmethod
       def process_payment(self, amount): ...
   ```

3. **类型敏感项目**：结合Protocol和ABC
   ```python
   from typing import Protocol
   from abc import abstractmethod
   
   class PaymentService(Protocol):
       @abstractmethod
       def process_payment(self, amount: float) -> bool: ...
   ```

4. **需要依赖反转**：使用依赖注入模式（方法4）
   ```python
   class OrderProcessor:
       def __init__(self, payment_service: PaymentService):
           self.payment_service = payment_service
   ```

## 高级技巧：注册机制

实现类似Spring的自动发现机制：

```python
# services/__init__.py
from .payment_service import PaymentService

class ServiceRegistry:
    _implementations = {}
    
    @classmethod
    def register(cls, service_type):
        def decorator(impl_class):
            cls._implementations[service_type] = impl_class
            return impl_class
        return decorator
    
    @classmethod
    def get_implementation(cls, service_type):
        return cls._implementations.get(service_type)

# implementations/stripe_service.py
from services import PaymentService, ServiceRegistry

@ServiceRegistry.register(PaymentService)
class StripePaymentService:
    def process_payment(self, amount):
        print("Stripe processing...")

# 使用
from services import ServiceRegistry, PaymentService

service_class = ServiceRegistry.get_implementation(PaymentService)
service = service_class()
service.process_payment(100)
```

Python 虽然没有 Java 的严格接口概念，但通过以上模式可以实现相同甚至更灵活的服务抽象与实现分离。选择哪种方式取决于项目规模、团队偏好和具体需求，ABC 和 Protocol 的组合通常能提供最佳的类型安全性和灵活性。