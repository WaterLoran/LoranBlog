Gatling 的 DSL 非常强大且表达力强，一个看似简单的单个请求其实可以包含非常丰富的配置。下面我将为你详细拆解并提供一个功能完整的示例。

### Gatling 单个请求支持的核心功能

一个 Gatling HTTP 请求通常使用 `http(requestName).get(url)` 或 `.post(url)` 等形式开始，并通过**方法链**来组合各种操作，主要包括：

1.  **定义请求方法和URL**
2.  **设置请求头**
3.  **设置请求体** (对于 POST, PUT 等)
4.  **设置查询参数**
5.  **添加检查点**：这是功能最丰富的部分，包括：
    *   **提取信息**：从响应正文、状态码、头信息中提取值，并存入会话变量。
    *   **断言信息**：对响应的状态、正文、头信息等进行验证。
6.  **暂停** (思考时间)
7.  **其他高级配置**：如设置虚拟用户身份信息、忽略协议等。

---

### 具体示例：一个包含大量功能的 POST 请求

这个例子模拟了一个用户登录后从响应中提取 token，并用它来获取个人资料的完整流程。

```scala
import io.gatling.core.Predef._ 
import io.gatling.http.Predef._ 
import scala.concurrent.duration._ 

class ComplexRequestExample extends Simulation { 

  // 1. 定义协议
  val httpProtocol = http 
    .baseUrl("https://api.example.com") 
    .acceptHeader("application/json") 
    .userAgentHeader("Gatling/Performance Test") 

  // 2. 定义场景
  val scn = scenario("Example of a Single Complex Request") 
    .exec( 
      // 这个单一的 POST 请求展示了多种功能
      http("Create a new user and extract info") 
        .post("/users") 
        
        // ========== 设置请求头 ==========
        .header("Content-Type", "application/json") 
        .header("X-Custom-Auth", "Bearer dummy_preliminary_token") 
        .headers(Map( 
          "Accept-Language" -> "en-US,en;q=0.9", 
          "X-Request-ID" -> "#{java.util.UUID.randomUUID().toString}" // 动态生成值
        )) 
        
        // ========== 设置查询参数 ==========
        .queryParam("trackingId", "12345") 
        
        // ========== 设置请求体 ==========
        .body(StringBody( 
          """{ 
            "name": "GatlingUser", 
            "email": "user#{java.util.UUID.randomUUID().toString}@example.com" 
          }""" 
        )).asJson // 等同于设置 `Content-Type: application/json` 头
        
        // ========== 检查点：提取和断言 ==========
        .check( 
          // --- 断言 ---
          // 断言1：状态码是 201
          status.is(201), 
          // 断言2：响应体JSON路径 `$.success` 的值是 true
          jsonPath("$.success").is("true"), 
          // 断言3：响应头 `Location` 存在
          header("Location").exists(), 
          // 断言4：响应时间小于 2 秒
          responseTimeInMillis.lt(2000), 
          
          // --- 提取 ---
          // 提取1：从JSON响应体中提取 `id` 的值，保存到会话变量 `userId` 中
          jsonPath("$.data.id").saveAs("userId"), 
          // 提取2：从JSON响应体中提取整个 `profile` 对象，保存到 `userProfile`
          jsonPath("$.data.profile").saveAs("userProfile"), 
          // 提取3：从响应头 `Location` 中提取新用户的URL
          header("Location").saveAs("locationHeader"), 
          // 提取4：使用正则表达式从Location头中提取ID
          regex("""/users/([^/]+)""").ofType[(String)]).saveAs("extractedIdFromRegex") 
        ) 
    ) 
    // 思考时间：模拟用户阅读结果，暂停1-3秒（均匀分布）
    .pause(1.second, 3.seconds) 
    
    // 3. 下一个请求：使用上一个请求提取的值
    .exec( 
      http("Get the created user's profile") 
        .get("/users/#{userId}/profile") 
        .header("Authorization", "Bearer #{userId}") // 使用提取的userId作为Token
        .check( 
          status.is(200), 
          // 验证响应体中的名字与创建时一致
          jsonPath("$.name").is("GatlingUser") 
        ) 
    ) 

  // 4. 设置模拟负载
  setUp( 
    scn.inject(atOnceUsers(1)) 
  ).protocols(httpProtocol) 
} 
```

---

### 功能详解

#### 1. 设置请求头
*   `.header("Key", "Value")`：设置单个头。
*   `.headers(Map("Key1" -> "Value1", "Key2" -> "Value2"))`：一次性设置多个头。
*   **动态值**：可以使用 `#{expression}` 语法嵌入动态值，例如 `#{java.util.UUID.randomUUID().toString}` 或引用之前保存的会话变量 `#{savedVariable}`。

#### 2. 设置请求体
*   `.body(StringBody("""{"key": "value"}""")).asJson`：设置字符串形式的 JSON 请求体，`.asJson` 是一个便捷方法，会自动设置 `Content-Type: application/json` 头。
*   其他常见类型：
    *   `.body(ElFileBody("path/to/el_file.json"))`：从外部文件加载模板，并可嵌入会话变量。
    *   `.body(PebbleBody("path/to/template.json"))`：使用更强大的 Pebble 模板。
    *   `.formParam("username", "user1")`：用于发送表单数据 (`application/x-www-form-urlencoded`)。

#### 3. 检查点
`.check()` 方法是功能的核心，它可以包含多个提取器和断言器，**按顺序执行**。

*   **提取器**：从响应中抓取数据并保存到会话中，供后续请求使用。
    *   `jsonPath("$.data.id").saveAs("userId")`：最常用，使用 JSONPath 表达式。
    *   `css("div#result").saveAs("cssValue")`：如果响应是 HTML，可用 CSS 选择器。
    *   `regex("""id: (.+?),""").saveAs("regexValue")`：使用正则表达式。
    *   `header("Location").saveAs("loc")`：提取响应头的值。
    *   `bodyString.saveAs("wholeBody")`：保存整个响应体字符串（谨慎使用，内存开销大）。

*   **断言器**：验证响应是否符合预期。如果断言失败，**该虚拟用户的整个场景会被标记为失败**，但默认不会停止运行，它会继续执行后续步骤（这对于测试错误流很有用）。
    *   `status.is(201)`
    *   `jsonPath("$.success").is("true")`
    *   `header("Content-Type").is("application/json")`
    *   `bodyString.exists()`：检查响应体是否包含某个字符串。
    *   `responseTimeInMillis.lt(1000)`：检查响应时间是否小于 1000ms。

#### 4. 其他重要功能
*   **思考时间**：`.pause(1.second, 3.seconds)` 用于模拟用户操作之间的停顿，对生成真实负载至关重要。
*   **资源检查**：`.check(... resources: ...)` 可以自动处理 HTML 页面中的嵌入式资源（如 CSS, JS, 图片），但通常不建议在 API 测试中使用。
*   **会话调试**：在开发脚本时，可以在任何地方插入 `.exec { session => println(session); session }` 来打印当前会话的所有变量，对于调试提取逻辑非常有用。

这个例子几乎涵盖了 Gatling 单个请求所能做的所有事情。你可以根据你的实际 API 文档，组合使用这些功能来构建出非常复杂的测试场景。