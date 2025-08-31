# Gatling 中捕获和分析失败请求的方法

在 Gatling 中捕获和分析失败请求比在 JMeter 中更加灵活和强大。Gatling 提供了多种方式来处理和检查失败的请求，让你能够深入分析问题原因。

## 1. 基本的失败检测和报告

Gatling 默认会自动记录所有失败的请求，并在 HTML 报告中提供详细的统计信息：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class BasicFailureDetection extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")

  val scn = scenario("Basic Test with Failure Detection")
    .exec(
      http("Get User Info")
        .get("/users/1")
        .check( // 添加检查条件
          status.is(200), // 期望状态码为200
          jsonPath("$.name").is("John Doe") // 期望响应中包含特定值
        )
    )
    // 如果上述检查失败，请求会被标记为KO (KO = Knock Out，表示失败)

  setUp(
    scn.inject(atOnceUsers(1))
  ).protocols(httpProtocol)
}
```

运行测试后，你可以在 HTML 报告的 "Failed Requests" 部分看到所有失败的请求及其失败原因。

## 2. 捕获和保存失败请求的详细信息

如果你想捕获失败的请求并将其详细信息保存到文件中以供后续分析，可以使用以下方法：

### 方法一：使用 Session 和自定义检查

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.io.{File, PrintWriter}
import scala.util.Try

class CaptureFailedRequests extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")

  val scn = scenario("Capture Failed Requests")
    .exec(
      http("Get User Info")
        .get("/users/1")
        .check(
          status.is(200).saveAs("httpStatus"),
          jsonPath("$.name").is("John Doe").saveAs("userName")
        )
    )
    // 如果请求失败，捕获详细信息
    .doIf(session => session.isFailed) { // 检查会话是否失败
      exec { session =>
        // 获取请求相关信息
        val status = session("httpStatus").asOption[Int].getOrElse(0)
        val requestName = session("Get User Info").asOption[String].getOrElse("Unknown")
        val url = "https://api.example.com/users/1"
        
        // 将信息写入文件
        val pw = new PrintWriter(new File("failed_requests.log"), "UTF-8")
        pw.println(s"Failed Request: $requestName")
        pw.println(s"URL: $url")
        pw.println(s"Status: $status")
        pw.println(s"Time: ${java.time.LocalDateTime.now}")
        pw.println("--------------------")
        pw.close()
        
        session
      }
    }

  setUp(
    scn.inject(atOnceUsers(1))
  ).protocols(httpProtocol)
}
```

### 方法二：使用 Gatling 的日志功能

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class LogFailedRequests extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    // 配置只记录失败的请求
    .logFailedRequests(true)
    // 或者更详细的配置
    .enableHttp2
    .inferHtmlResources()
    .silentResources // 静默成功资源的日志
    .silentUri(".*\\.css") // 静默CSS文件的日志
    .silentUri(".*\\.js") // 静默JS文件的日志

  val scn = scenario("Log Failed Requests")
    .exec(
      http("Get User Info")
        .get("/users/1")
        .check(
          status.is(200),
          jsonPath("$.name").is("John Doe")
        )
    )

  setUp(
    scn.inject(atOnceUsers(1))
  ).protocols(httpProtocol)
}
```

## 3. 高级方法：使用响应转换器捕获详细信息

对于更复杂的场景，你可以使用响应转换器来捕获请求和响应的完整详细信息：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.io.{File, PrintWriter}
import java.nio.charset.StandardCharsets

class DetailedFailureCapture extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    // 为所有响应添加转换器
    .transformResponse { (response, session) =>
      if (response.status.code >= 400) {
        // 捕获错误响应详细信息
        val pw = new PrintWriter(new File("error_responses.log"), StandardCharsets.UTF_8.name())
        pw.println(s"Timestamp: ${java.time.LocalDateTime.now}")
        pw.println(s"URL: ${response.request.getUri}")
        pw.println(s"Status: ${response.status.code}")
        pw.println(s"Response Body: ${response.body.string}")
        pw.println("--------------------")
        pw.close()
      }
      response
    }

  val scn = scenario("Detailed Failure Capture")
    .exec(
      http("Get User Info")
        .get("/users/1")
        .check(
          status.is(200),
          jsonPath("$.name").is("John Doe")
        )
    )

  setUp(
    scn.inject(atOnceUsers(1))
  ).protocols(httpProtocol)
}
```

## 4. 使用条件检查处理部分失败

有时请求本身成功（HTTP 200），但业务逻辑失败（如返回错误消息）。你可以使用条件检查来处理这种情况：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class ConditionalFailure extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")

  val scn = scenario("Conditional Failure Detection")
    .exec(
      http("Create User")
        .post("/users")
        .body(StringBody("""{"name": "test", "email": "test@example.com"}"""))
        .asJson
        .check(
          status.is(201).saveAs("httpStatus"), // 创建成功应返回201
          jsonPath("$.success").is("true").saveAs("apiSuccess") // 检查API业务逻辑成功
        )
    )
    // 检查业务逻辑是否失败
    .doIf(session => {
      session("httpStatus").as[Int] == 201 && 
      session("apiSuccess").asOption[String].exists(_ != "true")
    }) {
      exec { session =>
        // 记录业务逻辑失败
        val pw = new PrintWriter(new File("business_failures.log"), "UTF-8")
        pw.println(s"Business logic failed for user creation at ${java.time.LocalDateTime.now}")
        pw.close()
        session
      }.exitHereIfFailed // 可以选择在此停止虚拟用户
    }

  setUp(
    scn.inject(atOnceUsers(1))
  ).protocols(httpProtocol)
}
```

## 5. 使用 Gatling 的断言功能进行自动分析

你还可以在测试定义中添加断言，自动分析失败模式：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class AssertionExample extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")

  val scn = scenario("Test with Assertions")
    .exec(
      http("Get User Info")
        .get("/users/1")
        .check(
          status.is(200),
          jsonPath("$.name").is("John Doe")
        )
    )

  setUp(
    scn.inject(
      rampUsers(10).during(10.seconds)
    )
  ).protocols(httpProtocol)
  // 添加全局断言
  .assertions(
    global.failedRequests.count.is(0), // 总失败请求数为0
    global.responseTime.max.lt(500), // 最大响应时间小于500ms
    forAll.failedRequests.percent.lt(1.0) // 每个请求的失败率小于1%
  )
}
```

## 最佳实践和建议

1. **分层检查**：同时检查 HTTP 状态码和业务逻辑状态，以区分网络错误和业务错误。

2. **详细日志**：在开发阶段启用详细日志，但在生产负载测试中适度减少日志量以避免I/O瓶颈。

3. **使用分组**：将相关请求分组，以便在报告中更容易分析失败模式。

4. **定期审查失败日志**：设置自动化流程定期分析和报告失败模式。

5. **结合监控工具**：将 Gatling 与专业的 APM（应用性能监控）工具结合使用，以获得更全面的故障分析能力。

通过上述方法，你可以在 Gatling 中有效地捕获、记录和分析失败的请求，其灵活性和强大功能甚至超过了 JMeter 的事务分析能力。