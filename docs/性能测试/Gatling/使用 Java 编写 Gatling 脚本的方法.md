# 使用 Java 编写 Gatling 脚本的方法

## Gatling 脚本编写语言选择

### 语言使用情况

**Scala** 是 Gatling 的**主要和推荐语言**，原因如下：

- Gatling 本身用 Scala 开发
- 官方文档和示例主要使用 Scala
- Scala 的函数式特性更适合 DSL 语法
- 社区资源更丰富

**Java** 也可以使用，但相对较少，主要因为：
- 语法相对冗长
- 缺乏 Scala 的 DSL 优雅性
- 官方支持但不如 Scala 完善

## 使用 Java 编写 Gatling 脚本的方法

### 1. 基础 Maven 依赖配置

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>io.gatling</groupId>
        <artifactId>gatling-core</artifactId>
        <version>3.9.5</version>
    </dependency>
    <dependency>
        <groupId>io.gatling</groupId>
        <artifactId>gatling-http</artifactId>
        <version>3.9.5</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>io.gatling</groupId>
            <artifactId>gatling-maven-plugin</artifactId>
            <version>4.5.0</version>
        </plugin>
    </plugins>
</build>
```

### 2. 基础 Java Gatling 脚本

```java
package com.performance.tests;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import java.time.Duration;

public class BasicJavaSimulation extends Simulation {

    // HTTP 协议配置
    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://httpbin.org")
        .acceptHeader("application/json")
        .userAgentHeader("Gatling/Java")
        .disableWarmUp()
        .disableCaching();

    // 场景定义
    ScenarioBuilder scn = scenario("Basic Java Test Scenario")
        .exec(
            http("GET Request")
                .get("/get")
                .check(status().is(200))
                .check(jsonPath("$.url").exists())
        )
        .pause(1)
        .exec(
            http("POST Request")
                .post("/post")
                .body(StringBody("{\"test\": \"data\", \"id\": 123}"))
                .asJson()
                .check(status().is(200))
                .check(jsonPath("$.json.test").is("data"))
        )
        .pause(2);

    {
        // 负载配置
        setUp(
            scn.injectOpen(
                nothingFor(Duration.ofSeconds(5)),  // 等待5秒
                atOnceUsers(1),                     // 立即启动1个用户
                rampUsers(10).during(Duration.ofSeconds(10)),  // 10秒内增加到10个用户
                constantUsersPerSec(5).during(Duration.ofSeconds(30))  // 30秒内每秒5个用户
            )
        ).protocols(httpProtocol);
    }
}
```

### 3. 复杂的 Java Gatling 脚本

```java
package com.performance.tests;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import java.util.Map;
import java.util.HashMap;
import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

public class AdvancedJavaSimulation extends Simulation {

    // Feeder 数据源（类似于参数化）
    Iterator<Map<String, Object>> userFeeder = 
        new Iterator<Map<String, Object>>() {
            private int counter = 0;
            
            @Override
            public boolean hasNext() {
                return true;
            }
            
            @Override
            public Map<String, Object> next() {
                Map<String, Object> user = new HashMap<>();
                user.put("userId", counter++);
                user.put("username", "user" + counter);
                user.put("email", "user" + counter + "@test.com");
                return user;
            }
        }.iterator();

    // HTTP 头配置
    Map<CharSequence, String> headers = new HashMap<>();
    {
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");
    }

    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://httpbin.org")
        .headers(headers)
        .disableCaching()
        .disableFollowRedirect();

    // 业务场景步骤
    ChainBuilder authenticationStep = 
        feed(userFeeder)
        .exec(
            http("User Authentication")
                .post("/post")
                .body(StringBody("""
                    {
                        "username": "#{username}",
                        "password": "password123",
                        "email": "#{email}"
                    }
                """))
                .check(status().is(200))
                .check(jsonPath("$.json.username").saveAs("authUser"))
        )
        .pause(1, 3);  // 随机暂停1-3秒

    ChainBuilder getUserDataStep =
        exec(
            http("Get User Data")
                .get("/get")
                .queryParam("user_id", "#{userId}")
                .check(status().is(200))
                .check(jsonPath("$.args.user_id").is("#{userId}"))
        );

    ChainBuilder createOrderStep =
        exec(
            http("Create Order")
                .post("/post")
                .body(StringBody("""
                    {
                        "user_id": "#{userId}",
                        "product": "Test Product",
                        "quantity": #{quantity},
                        "price": 99.99
                    }
                """))
                .check(status().is(200))
                .check(jsonPath("$.json.user_id").is("#{userId}"))
                .check(jsonPath("$.json.quantity").saveAs("orderQuantity"))
        )
        .exec(session -> {
            // Java 代码处理响应
            int quantity = Integer.parseInt(session.getString("orderQuantity"));
            System.out.println("Order created with quantity: " + quantity);
            return session;
        });

    // 完整场景
    ScenarioBuilder userJourney = scenario("Complete User Journey")
        .exec(authenticationStep)
        .exec(getUserDataStep)
        .exec(session -> {
            // 动态生成数量
            int randomQuantity = ThreadLocalRandom.current().nextInt(1, 10);
            return session.set("quantity", randomQuantity);
        })
        .exec(createOrderStep)
        .exec(
            http("Delete Test Data")
                .delete("/delete")
                .queryParam("user_id", "#{userId}")
                .check(status().is(200))
        );

    {
        // 负载测试配置
        setUp(
            userJourney.injectOpen(
                rampUsersPerSec(0.1).to(5).during(Duration.ofSeconds(30)),
                constantUsersPerSec(5).during(Duration.ofSeconds(60)),
                rampUsersPerSec(5).to(0.1).during(Duration.ofSeconds(30))
            )
        ).protocols(httpProtocol)
         .assertions(
             global().responseTime().percentile3().lte(500),  // p95响应时间 <= 500ms
             global().successfulRequests().percent().gte(99.0)  // 成功率 >= 99%
         );
    }
}
```

### 4. 带检查点和断言的脚本

```java
package com.performance.tests;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import java.time.Duration;

public class ValidationJavaSimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://httpbin.org")
        .acceptHeader("application/json");

    // 各种HTTP方法示例
    ScenarioBuilder httpMethodsTest = scenario("HTTP Methods Test")
        .exec(
            http("GET with Query Params")
                .get("/get")
                .queryParam("page", "1")
                .queryParam("limit", "10")
                .check(
                    status().is(200),
                    jsonPath("$.args.page").is("1"),
                    jsonPath("$.args.limit").is("10")
                )
        )
        .pause(1)
        .exec(
            http("POST with JSON Body")
                .post("/post")
                .body(StringBody("""
                    {
                        "name": "Test User",
                        "age": 30,
                        "active": true
                    }
                """))
                .check(
                    status().is(200),
                    jsonPath("$.json.name").is("Test User"),
                    jsonPath("$.json.age").is(30),
                    jsonPath("$.json.active").is(true)
                )
        )
        .pause(1)
        .exec(
            http("PUT Request")
                .put("/put")
                .body(StringBody("{\"status\": \"updated\"}"))
                .check(
                    status().is(200),
                    jsonPath("$.json.status").is("updated")
                )
        )
        .pause(1)
        .exec(
            http("DELETE Request")
                .delete("/delete")
                .queryParam("id", "123")
                .check(status().is(200))
        )
        .pause(1)
        .exec(
            http("PATCH Request")
                .patch("/patch")
                .body(StringBody("{\"changes\": {\"status\": \"active\"}}"))
                .check(
                    status().is(200),
                    jsonPath("$.json.changes.status").is("active")
                )
        );

    {
        setUp(
            httpMethodsTest.injectOpen(
                atOnceUsers(5),
                rampUsers(50).during(Duration.ofSeconds(30))
            )
        ).protocols(httpProtocol)
         .assertions(
             // 全局断言
             global().responseTime().max().lte(2000),
             global().failedRequests().count().lte(10),
             
             // 针对特定请求的断言
             details("GET with Query Params").responseTime().mean().lte(100),
             details("POST with JSON Body").successfulRequests().percent().gte(99.5)
         );
    }
}
```

### 5. 运行和配置

**运行方式**：
```bash
# 使用 Maven 运行
mvn gatling:test -Dgatling.simulationClass=com.performance.tests.BasicJavaSimulation

# 或使用 Gatling 直接运行
java -cp "gatling-app.jar:your-tests.jar" io.gatling.app.Gatling
```

**项目结构**：
```
src/test/java/
└── com/performance/tests/
    ├── BasicJavaSimulation.java
    ├── AdvancedJavaSimulation.java
    └── ValidationJavaSimulation.java
```

## Java vs Scala 对比

| 特性           | Java                 | Scala            |
| -------------- | -------------------- | ---------------- |
| **语法简洁性** | 相对冗长             | 更简洁优雅       |
| **DSL 支持**   | 有限，需要静态导入   | 原生支持，更自然 |
| **学习曲线**   | 对 Java 开发者友好   | 需要学习 Scala   |
| **社区资源**   | 较少                 | 丰富，官方推荐   |
| **性能**       | 相同（都运行在 JVM） | 相同             |
| **类型安全**   | 强类型               | 更强类型推断     |

## 建议

1. **新项目**：如果团队熟悉 Scala，优先选择 Scala
2. **Java 团队**：如果团队主要是 Java 背景，可以用 Java 开始
3. **混合使用**：可以先用 Java 入门，逐步学习 Scala

Java 版本的 Gatling 脚本虽然语法稍显冗长，但功能完整，适合 Java 开发团队快速上手性能测试。