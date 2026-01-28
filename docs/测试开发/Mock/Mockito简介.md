# Mockito简介

### 1. 什么是 Mockito？

**Mockito** 是一个用于 Java 单元测试的开源 mocking 框架。它的核心目的是通过创建和配置 **模拟对象（Mock Objects）** 来帮助你编写**隔离的、纯粹的单元测试**。

**简单来说**：当你想测试一个类（例如 `OrderService`）时，这个类通常会依赖其他类（例如 `PaymentGateway` 和 `InventoryService`）。Mockito 允许你创建这些依赖的“假货”或“替身演员”，这样你就可以：
*   **隔离** 被测试的类，只关注其自身的逻辑。
*   **控制** 依赖对象的行为（让它们返回你期望的值或抛出特定的异常）。
*   **验证** 被测试类是否正确调用了依赖对象的方法。

### 2. 核心概念：Mock, Stub, Spy, Verify

1.  **Mock（模拟对象）**：
    *   一个完全虚拟的对象，替代真实的依赖。
    *   默认情况下，它的方法不会做任何事情；如果方法有返回值，默认返回 `null`、`0` 或 `false`。
    *   你需要**定义它的行为**（Stubbing）。

2.  **Stub（定义行为）**：
    *   告诉 mock 对象：“当以这些参数调用你的 X 方法时，请返回 Y”。
    *   这是通过 `when(...).thenReturn(...)` 等语法完成的。

3.  **Spy（间谍）**：
    *   一个部分模拟的对象。它基于一个**真实的实例**。
    *   默认情况下，它会调用真实对象的方法。但你可以选择性地为某些方法定义模拟行为（Stubbing）。
    *   使用时要小心，因为它会调用真实方法，可能会有副作用。

4.  **Verify（验证）**：
    *   检查被测试的类是否**按照预期的方式**与 mock 对象进行了交互。
    *   例如：“验证 `paymentGateway.processPayment` 方法是否被调用了一次，并且传入的参数是 100.0”。

### 3. 主要特性与优势

*   **简洁的 API**：Mockito 的 API 设计非常流畅、易读，接近于自然语言（例如 `when(...).thenReturn(...)`）。
*   **注解支持**：使用 `@Mock`, `@Spy`, `@InjectMocks` 等注解可以极大地简化 mock 对象的创建和注入。
*   **灵活的行为定义**：支持返回固定值、抛出异常、返回动态结果、以及针对连续调用的不同返回。
*   **强大的参数匹配**：支持灵活的参数匹配，可以使用确切的参数，也可以使用通配符（如 `any()`, `eq()`）。
*   **验证调用顺序和次数**：可以验证方法是否被调用、调用了多少次、以及调用的顺序。
*   **与 JUnit 无缝集成**：通常通过 `MockitoExtension`（JUnit 5）或 `MockitoJUnitRunner`（JUnit 4）一起使用。

### 4. 快速入门示例

下面通过一个典型的场景来展示 Mockito 的核心用法。

#### 场景设定

假设我们有一个 `OrderService`，它依赖于 `PaymentGateway` 和 `InventoryService`。我们想测试 `placeOrder` 方法。

```java
// 被依赖的类
public class PaymentGateway {
    public boolean processPayment(double amount) {
        // 真实的支付逻辑，连接外部系统
        return true;
    }
}

public class InventoryService {
    public boolean isProductInStock(String productId) {
        // 真实的库存检查逻辑，查询数据库
        return true;
    }
    public void reduceStock(String productId) {
        // 真实的减库存逻辑
    }
}

// 被测试的类
public class OrderService {
    private PaymentGateway paymentGateway;
    private InventoryService inventoryService;

    // 通过构造器注入依赖
    public OrderService(PaymentGateway paymentGateway, InventoryService inventoryService) {
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
    }

    public boolean placeOrder(String productId, double amount) {
        // 业务逻辑：
        // 1. 检查库存
        if (!inventoryService.isProductInStock(productId)) {
            return false;
        }
        // 2. 处理支付
        boolean paymentSuccess = paymentGateway.processPayment(amount);
        if (!paymentSuccess) {
            return false;
        }
        // 3. 减少库存
        inventoryService.reduceStock(productId);
        return true;
    }
}
```

#### 使用 Mockito 编写测试 (JUnit 5)

1.  **添加依赖** (Maven)：

    ```xml
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-core</artifactId>
        <version>5.8.0</version> <!-- 使用最新版本 -->
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <version>5.8.0</version>
        <scope>test</scope>
    </dependency>
    ```

2.  **编写测试类**：

    ```java
    import org.junit.jupiter.api.Test;
    import org.junit.jupiter.api.extension.ExtendWith;
    import org.mockito.InjectMocks;
    import org.mockito.Mock;
    import org.mockito.junit.jupiter.MockitoExtension;
    
    import static org.junit.jupiter.api.Assertions.*;
    import static org.mockito.Mockito.*;
    
    @ExtendWith(MockitoExtension.class) // 启用 Mockito 支持
    class OrderServiceTest {
    
        @Mock
        private PaymentGateway paymentGatewayMock; // 创建 PaymentGateway 的 mock
    
        @Mock
        private InventoryService inventoryServiceMock; // 创建 InventoryService 的 mock
    
        @InjectMocks
        private OrderService orderService; // 创建 OrderService，并自动将上面的 mock 注入进去
    
        @Test
        void placeOrder_Successful() {
            // 1. 【Arrange】定义 mock 的行为 (Stubbing)
            String productId = "prod_123";
            double amount = 100.0;
    
            // 当检查库存时，返回 true
            when(inventoryServiceMock.isProductInStock(productId)).thenReturn(true);
            // 当处理支付时，返回 true
            when(paymentGatewayMock.processPayment(amount)).thenReturn(true);
    
            // 2. 【Act】调用被测试的方法
            boolean result = orderService.placeOrder(productId, amount);
    
            // 3. 【Assert】断言结果
            assertTrue(result);
    
            // 4. 【Verify】验证交互行为
            // 验证 inventoryService.isProductInStock 被调用了一次，参数是 productId
            verify(inventoryServiceMock).isProductInStock(productId);
            // 验证 paymentGateway.processPayment 被调用了一次，参数是 amount
            verify(paymentGatewayMock).processPayment(amount);
            // 验证 reduceStock 被调用了一次
            verify(inventoryServiceMock).reduceStock(productId);
        }
    
        @Test
        void placeOrder_ProductOutOfStock_Fails() {
            // Arrange
            String productId = "prod_456";
            double amount = 50.0;
    
            when(inventoryServiceMock.isProductInStock(productId)).thenReturn(false); // 模拟缺货
    
            // Act
            boolean result = orderService.placeOrder(productId, amount);
    
            // Assert
            assertFalse(result);
    
            // Verify
            verify(inventoryServiceMock).isProductInStock(productId);
            // 验证 processPayment 和 reduceStock 从未被调用，因为流程在第一步就中断了
            verify(paymentGatewayMock, never()).processPayment(anyDouble());
            verify(inventoryServiceMock, never()).reduceStock(anyString());
        }
    
        @Test
        void placeOrder_PaymentFails_ReducesStockNotCalled() {
            // Arrange
            String productId = "prod_789";
            double amount = 75.0;
    
            when(inventoryServiceMock.isProductInStock(productId)).thenReturn(true);
            when(paymentGatewayMock.processPayment(amount)).thenReturn(false); // 模拟支付失败
    
            // Act
            boolean result = orderService.placeOrder(productId, amount);
    
            // Assert
            assertFalse(result);
    
            // Verify
            verify(inventoryServiceMock).isProductInStock(productId);
            verify(paymentGatewayMock).processPayment(amount);
            // 关键验证：支付失败后，不应该减少库存
            verify(inventoryServiceMock, never()).reduceStock(productId);
        }
    }
    ```

### 5. 与类似/相关工具的对比

*   **EasyMock**： Mockito 的前辈，API 不如 Mockito 简洁直观。Mockito 的 “`when`-`thenReturn`” 比 EasyMock 的 “`expect`-`andReturn`” 更易读。
*   **JMock**： 另一个老牌框架，要求在期望之前录制行为，使用起来约束较多。
*   **PowerMock**： 它是 Mockito 和 EasyMock 的扩展，用于模拟 **静态方法、构造方法、final 类/方法** 等 Mockito 本身无法处理的情况。它更强大，但也更复杂，破坏了封装性，通常建议优先重构代码使其可测，而不是直接使用 PowerMock。
*   **WireMock**： **这是一个常见的混淆点**。WireMock 模拟的是 **HTTP 服务**，用于集成测试。而 Mockito 模拟的是 **Java 对象**，用于单元测试。它们是不同层面的工具，甚至可以结合使用（例如，用 Mockito 模拟一个调用 WireMock 的 HTTP 客户端）。

### 总结

**Mockito** 是 Java 开发者进行单元测试的**事实标准工具**。它通过创建清晰的、可配置的模拟对象，让你能够专注于单个类的逻辑，写出**快速、稳定、隔离**的单元测试。其优雅的 API 和与 JUnit 的深度集成，使得编写和维护测试代码变得非常简单高效。掌握 Mockito 是现代 Java 开发者的必备技能。