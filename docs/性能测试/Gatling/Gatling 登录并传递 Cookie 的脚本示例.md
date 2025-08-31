# Gatling 登录并传递 Cookie 的脚本示例

下面是一个完整的 Gatling 脚本示例，展示了如何先执行登录请求，提取 Cookie，然后在后续请求中使用这些认证信息：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class LoginWithCookieExample extends Simulation {

  // 基础配置
  val httpProtocol = http
    .baseUrl("https://yourapp.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/Performance Test")

  // 登录场景
  val scn = scenario("Login and Access Protected Resources")
    .exec(
      http("Login Request")
        .post("/api/login")
        .body(StringBody("""{"username": "testuser", "password": "password123"}"""))
        .check(
          status.is(200),
          // 提取认证 Cookie (JSESSIONID 是常见示例)
          cookie("JSESSIONID").saveAs("authCookie"),
          // 如果响应中有 token 也可以提取
          jsonPath("$.token").optional.saveAs("authToken")
        )
    )
    .pause(1.second) // 短暂暂停
    
    // 使用提取的 Cookie 访问需要认证的资源
    .exec(
      http("Get User Profile")
        .get("/api/user/profile")
        // 使用保存的 Cookie
        .cookie("JSESSIONID", "${authCookie}")
        .check(
          status.is(200),
          jsonPath("$.username").is("testuser")
        )
    )
    .pause(1.second)
    
    // 另一个使用相同认证的请求
    .exec(
      http("Get User Orders")
        .get("/api/user/orders")
        .cookie("JSESSIONID", "${authCookie}")
        .check(status.is(200))
    )

  // 设置模拟
  setUp(
    scn.inject(
      atOnceUsers(1) // 单用户测试
      // 或者用于负载测试: rampUsers(10).during(10.seconds)
    )
  ).protocols(httpProtocol)
}
```

## 更复杂的示例：处理多个 Cookie 和动态值

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class AdvancedLoginExample extends Simulation {

  val httpProtocol = http
    .baseUrl("https://yourapp.com")
    .inferHtmlResources() // 自动处理HTML资源
    .acceptHeader("*/*")
    .contentTypeHeader("application/json")

  val headers = Map(
    "Accept" -> "application/json",
    "Content-Type" -> "application/json"
  )

  val scn = scenario("Advanced Login Flow")
    // 首先获取登录页面，可能包含CSRF token
    .exec(
      http("Get Login Page")
        .get("/login")
        .check(
          status.is(200),
          // 提取CSRF token（如果网站使用）
          css("input[name='csrfToken']", "value").saveAs("csrfToken")
        )
    )
    .pause(500.milliseconds)
    
    // 执行登录请求
    .exec(
      http("Perform Login")
        .post("/api/login")
        .headers(headers)
        .formParam("username", "testuser")
        .formParam("password", "password123")
        .formParam("csrfToken", "${csrfToken}") // 使用提取的CSRF token
        .check(
          status.is(200),
          // 提取所有相关cookies
          cookie("SESSIONID").saveAs("sessionId"),
          cookie("USER_TOKEN").saveAs("userToken"),
          // 提取响应中的用户ID
          jsonPath("$.userId").saveAs("userId")
        )
    )
    .pause(1.second)
    
    // 使用认证访问多个资源
    .exec(
      http("Get Dashboard Data")
        .get("/api/dashboard")
        .header("Authorization", "Bearer ${userToken}") // 使用token作为Bearer认证
        .cookie("SESSIONID", "${sessionId}") // 同时发送session cookie
        .check(status.is(200))
    )
    .pause(1.second)
    
    .exec(
      http("Get User Preferences")
        .get("/api/user/${userId}/preferences") // 使用提取的用户ID
        .cookie("SESSIONID", "${sessionId}")
        .check(status.is(200))
    )

  setUp(
    scn.inject(atOnceUsers(1))
  ).protocols(httpProtocol)
}
```

## 关键点说明

1. **提取 Cookie**:
   - 使用 `.check(cookie("COOKIE_NAME").saveAs("varName"))` 提取 Cookie 并保存到变量

2. **使用 Cookie**:
   - 在后续请求中使用 `.cookie("COOKIE_NAME", "${varName}")` 添加 Cookie
   - 或者使用 `.header("Authorization", "Bearer ${token}")` 添加认证头

3. **处理多个认证方式**:
   - 可以同时使用 Cookie 和 Authorization 头
   - 可以根据需要提取多个 Cookie 或 token

4. **动态值处理**:
   - 可以从响应中提取动态值（如 CSRF token、用户ID）并在后续请求中使用

5. **Cookie 自动管理**:
   - Gatling 默认会自动管理 Cookie（类似浏览器行为）
   - 如果需要更精细的控制，可以手动处理如上面示例所示

这个脚本展示了 Gatling 如何处理认证流程，提取认证信息，并在后续请求中使用这些信息来访问受保护的资源。