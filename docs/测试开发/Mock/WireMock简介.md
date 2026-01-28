# WireMock简介

### 1. 什么是 WireMock？

**WireMock** 是一个基于 HTTP 的模拟服务器（Mock Server）。它的核心思想是：在你需要依赖的第三方服务（如 RESTful API）不可用、不完整、不稳定或需要付费时，为你提供一个“仿制品”来代替真实的服务，以便于你进行开发和测试。

你可以把它想象成一个“演员”，在测试舞台上扮演一个真实的 HTTP 服务，根据你提前写好的“剧本”（即映射和响应规则）来给出预设的回应。

### 2. 核心特点与优势

1.  **HTTP 模拟**：专门用于模拟 HTTP/HTTPS 服务，对 Web API、微服务架构的测试支持得非常好。
2.  **灵活性**：既可以作为独立进程运行（作为一个单独的 Mock Server），也可以作为库嵌入到你的 JUnit 测试中（特别适合 Java 项目）。
3.  **录制与回放**：支持将指向真实 API 的请求代理到 WireMock，并自动记录请求和响应，生成存根（Stub）映射文件。之后就可以断开真实服务，使用记录的存根进行测试。
4.  **请求匹配**：非常强大的请求匹配能力。不仅可以匹配 URL，还可以匹配 HTTP 方法、请求头、查询参数、JSON/XML 请求体等多种条件。
5.  **动态响应**：支持在响应中生成动态内容，例如当前时间、从请求中提取的参数等，还可以模拟延迟响应，测试超时逻辑。
6.  **状态化行为**：通过“Scenarios”可以模拟有状态的服务行为，例如，同一个接口第一次调用和第二次调用返回不同的结果。
7.  **验证**：可以验证某个特定的请求是否被发送到了 WireMock 服务器，以及发送了多少次，这对于集成测试中的断言非常有用。

### 3. 主要应用场景

*   **单元/集成测试**：在测试一个服务 A 时，如果 A 依赖于服务 B，你可以用 WireMock 来模拟 B，确保测试只关注 A 的逻辑，而不受 B 的稳定性影响。
*   **契约测试**：在微服务架构中，确保服务消费者和服务提供者之间的契约（API 接口）是一致的。消费者端测试可以使用 WireMock 来模拟提供者。
*   **前端开发**：当后端 API 尚未开发完成时，前端开发人员可以使用 WireMock 来模拟后端数据，实现并行开发。
*   **性能测试**：模拟一些响应缓慢的下游服务，测试你系统的超时和降级机制。
*   **故障演练**：模拟下游服务返回各种错误（如 404, 500, 503 等），测试你系统的容错和恢复能力。

### 4. 快速入门示例

下面通过两种最常用的方式来展示 WireMock 的基本用法。

#### 方式一：作为独立进程运行（推荐用于通用场景）

1.  **下载并运行**：
    你可以直接从 [官网](https://wiremock.org/docs/running-standalone/) 下载最新的 JAR 包，然后用 Java 运行。

    ```bash
    java -jar wiremock-jre8-standalone-2.35.0.jar --port 8080
    ```
    这将在本地的 8080 端口启动一个 WireMock 服务器。

2.  **创建存根（Stub）**：
    向 WireMock 发送一个 POST 请求来配置一个模拟接口。

    ```bash
    curl -X POST \
    http://localhost:8080/__admin/mappings \
    -H 'Content-Type: application/json' \
    -d '{
      "request": {
        "method": "GET",
        "url": "/api/hello"
      },
      "response": {
        "status": 200,
        "body": "Hello from WireMock!",
        "headers": {
          "Content-Type": "text/plain"
        }
      }
    }'
    ```

3.  **测试**：
    现在，你可以访问这个模拟的 API 了。

    ```bash
    curl http://localhost:8080/api/hello
    # 输出：Hello from WireMock!
    ```

#### 方式二：在 JUnit 测试中嵌入（推荐用于 Java 测试）

对于 Java + Spring Boot 项目，这是非常流行的方式。

1.  **添加依赖**（以 Maven 为例）:

    ```xml
    <dependency>
        <groupId>org.wiremock</groupId>
        <artifactId>wiremock</artifactId>
        <version>3.3.1</version> <!-- 使用最新版本 -->
        <scope>test</scope>
    </dependency>
    ```

2.  **编写测试**：

    ```java
    import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
    import org.junit.jupiter.api.Test;
    import org.junit.jupiter.api.extension.RegisterExtension;
    import org.springframework.web.client.RestTemplate;
    
    import static com.github.tomakehurst.wiremock.client.WireMock.*;
    import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
    import static org.junit.jupiter.api.Assertions.assertEquals;
    
    class MyServiceTest {
    
        // 启动一个 WireMock 服务器在 8080 端口
        @RegisterExtension
        static WireMockExtension wireMockServer = WireMockExtension.newInstance()
                .options(wireMockConfig().port(8080))
                .build();
    
        @Test
        void testCallExternalApi() {
            // 1. 配置 Stub：当收到这个请求时，返回指定的响应
            stubFor(get(urlEqualTo("/api/user/1"))
                    .willReturn(aResponse()
                            .withStatus(200)
                            .withHeader("Content-Type", "application/json")
                            .withBody("{\"id\": 1, \"name\": \"John Doe\"}")));
    
            // 2. 你的业务代码，它会去调用 http://localhost:8080/api/user/1
            RestTemplate restTemplate = new RestTemplate();
            String response = restTemplate.getForObject("http://localhost:8080/api/user/1", String.class);
    
            // 3. 断言
            assertEquals("{\"id\": 1, \"name\": \"John Doe\"}", response);
    
            // 4. （可选）验证 WireMock 确实收到了这个请求
            verify(getRequestedFor(urlEqualTo("/api/user/1")));
        }
    }
    ```

### 5. 与类似工具的对比

*   **MockServer**：另一个功能强大的 Java Mock Server，与 WireMock 定位非常相似，两者在功能上各有千秋。
*   **Mockito / EasyMock**：这些是用于模拟 Java 对象（如类、接口）的库，工作在单元测试层面。而 WireMock 模拟的是整个 HTTP 服务，工作在集成测试或组件测试层面。它们通常可以结合使用。
*   **JSON Server**：一个用 Node.js 编写的模拟 REST API 工具，配置简单（只需一个 JSON 文件），但功能和灵活性上通常不如 WireMock。

### 总结

**WireMock** 是一个成熟、强大且灵活的 HTTP 模拟服务工具。它通过将不稳定的外部依赖替换为可控的模拟对象，极大地提升了开发效率和测试的可靠性，是现代分布式系统和微服务架构中不可或缺的测试利器。无论是独立使用还是集成到测试框架中，它都能提供一流的支持。