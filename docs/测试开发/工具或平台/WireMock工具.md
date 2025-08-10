**WireMock** 是一个轻量级、灵活且强大的 **HTTP API Mocking 工具**，用于模拟 HTTP 服务的行为。它广泛应用于测试、开发和演示场景，帮助开发者和测试人员**解耦依赖、模拟异常、加速测试**，尤其适合在微服务架构和契约测试中构建可靠的测试环境。

---

### **核心功能与价值**
#### 1. **逼真的HTTP服务模拟**
   - 模拟 RESTful API、SOAP 服务等任意 HTTP 端点。
   - 支持动态响应（根据请求内容返回不同结果）。
   - 模拟延迟响应、超时、网络错误等异常场景。

#### 2. **请求匹配与验证**
   - 基于 URL、Header、Body、Cookie 等条件精确匹配请求。
   - 记录所有收到的请求，便于验证客户端行为。
   - 支持请求计数和顺序验证。

#### 3. **动态响应生成**
   - 使用 Handlebars 模板动态生成 JSON/XML 响应。
   - 通过 JavaScript 扩展实现复杂逻辑（如生成随机数据）。
   ```java
   stubFor(get("/api/user")
     .willReturn(ok()
     .withBody("{\"name\":\"{{randomValue length=5 type='ALPHANUMERIC'}}\"}"))
   ```

#### 4. **故障注入**
   - 模拟服务不可用场景：
     - 固定延迟：`withFixedDelay(2000)`
     - 随机延迟：`withUniformRandomDelay(500, 1500)`
     - 返回错误码：`withStatus(503)`
     - 断开连接：`withFault(Fault.CONNECTION_RESET_BY_PEER)`

#### 5. **录制与回放**
   - **录制模式**：代理真实服务，自动捕获请求/响应生成 Stub。
   - **回放模式**：用录制的 Stub 模拟服务，无需连接真实依赖。
   ```bash
   java -jar wiremock-standalone.jar --proxy-all="http://real-service" --record-mappings
   ```

---

### **典型应用场景**
| 场景              | 说明                                      |
| ----------------- | ----------------------------------------- |
| **单元/集成测试** | 隔离被测服务，模拟依赖API的响应           |
| **契约测试**      | 验证服务是否符合消费者契约（如配合 Pact） |
| **前端开发**      | 在后端未完成时提供模拟 API 供前端使用     |
| **性能测试**      | 模拟下游服务延迟，测试系统超时/熔断机制   |
| **灾难恢复演练**  | 注入网络故障，验证系统容错能力            |

---

### **部署模式**
#### 1. **独立运行**
   ```bash
   java -jar wiremock-standalone.jar --port=8080
   ```
   - 轻量级，无需代码集成
   - 支持命令行参数配置

#### 2. **嵌入测试代码**
   ```java
   // JUnit 示例
   @Rule
   public WireMockRule wireMock = new WireMockRule(8080);
   
   @Test
   public void testPayment() {
       stubFor(post("/pay")
           .willReturn(okJson("{\"status\":\"success\"}")));
       // 调用被测服务（依赖 /pay 接口）
   }
   ```
   - 与 JUnit/TestNG 深度集成
   - 支持 Java、Kotlin、Spring Boot

#### 3. **Docker 容器**
   ```bash
   docker run -it --rm -p 8080:8080 wiremock/wiremock
   ```
   - 快速搭建共享 Mock 服务
   - 适合 CI/CD 流水线使用

---

### **进阶特性**
#### 1. **状态机模拟（Stateful Behavior）**
   ```java
   // 定义不同状态下的响应
   stubFor(get("/order/123")
     .inScenario("Order State")
     .whenScenarioStateIs("Created")
     .willReturn(ok("{'status':'created'}")));
   
   stubFor(post("/order/123/ship"))
     .willSetStateTo("Shipped")
     .willReturn(ok());
   ```

#### 2. **Webhook 支持**
   - 收到请求后自动触发 HTTP 回调：
   ```json
   "postServeActions": [{
     "name": "webhook",
     "parameters": { "url": "http://callback", "method": "POST" }
   }]
   ```

#### 3. **扩展插件**
   - 通过 `WebhookTransformer` 自定义请求处理
   - 使用 `ResponseDefinitionTransformer` 修改响应逻辑

---

### **与竞品对比**
| 特性             | WireMock   | MockServer     | Postman Mock Server |
| ---------------- | ---------- | -------------- | ------------------- |
| **协议支持**     | HTTP/HTTPS | HTTP/HTTPS/TCP | HTTP/HTTPS          |
| **编程语言**     | Java       | Java           | JavaScript          |
| **动态响应能力** | ⭐️⭐️⭐️⭐️⭐️      | ⭐️⭐️⭐️⭐️           | ⭐️⭐️⭐️                 |
| **故障注入**     | ✅ 丰富     | ✅ 支持         | ❌ 有限              |
| **录制回放**     | ✅          | ✅              | ✅                   |
| **集成测试支持** | ⭐️⭐️⭐️⭐️⭐️      | ⭐️⭐️⭐️⭐️           | ⭐️⭐️                  |
| **学习曲线**     | 中等       | 中等           | 简单                |

---

### **使用示例：模拟支付服务**
```java
// 1. 启动 WireMock 服务器
WireMockServer wireMockServer = new WireMockServer(8090);
wireMockServer.start();

// 2. 配置模拟规则：成功响应
configureFor("localhost", 8090);
stubFor(post("/pay")
    .withRequestBody(matchingJsonPath("$.amount"))
    .willReturn(okJson("{'transactionId':'TX123','status':'SUCCESS'}")));

// 3. 配置模拟规则：失败响应
stubFor(post("/pay")
    .withRequestBody(lessThanOrEqualTo("amount", 0))
    .willReturn(badRequest()));

// 4. 在测试中调用支付服务（实际请求 localhost:8090/pay）
```

---

### **最佳实践**
1. **模式化配置**  
   使用 JSON 文件管理 Stub，避免硬编码：
   ```json
   // mappings/payment-success.json
   {
     "request": { "method": "POST", "url": "/pay" },
     "response": { "status": 200, "body": "{\"status\":\"success\"}" }
   }
   ```

2. **契约测试集成**  
   结合 Pact 或 Spring Cloud Contract：
   ```java
   @Pact(consumer = "Frontend")
   public RequestResponsePact createPact(PactDslWithProvider builder) {
     return builder
         .uponReceiving("payment request")
         .path("/pay")
         .willRespondWith()
         .status(200)
         .toPact();
   }
   ```

3. **CI/CD 集成**  
   在流水线中启动 Docker 容器：
   ```yaml
   # GitLab CI 示例
   test:
     image: openjdk:11
     services:
       - name: wiremock/wiremock
         alias: payment-service
     script:
       - mvn test -Dpayment.service.url=http://payment-service:8080
   ```

---

### **局限性**
1. **不支持非 HTTP 协议**（如 gRPC、WebSocket）
2. **复杂状态机配置较繁琐**
3. **大规模 Stub 管理需配合外部工具**

---

### **总结**
**WireMock 是解决 API 依赖问题的瑞士军刀**，其核心价值在于：
- 🚀 **快速创建高仿真 HTTP 服务**，支持动态响应和故障注入
- 🔍 **精确的请求验证能力**，确保客户端行为符合预期
- 📦 **多模式部署**（独立/JUnit/Docker），无缝集成开发与测试流程
- ⚙️ **进阶扩展能力**（状态机/Webhook）满足复杂场景

无论是前端开发者隔离后端依赖，还是测试工程师构建集成测试沙盒，WireMock 都能显著提升效率与可靠性。对于微服务架构和契约测试驱动的团队，它已成为现代测试工具链中的必备组件。