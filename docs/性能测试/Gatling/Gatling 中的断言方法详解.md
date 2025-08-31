# Gatling 中的断言方法详解

Gatling 提供了丰富而强大的断言（Assertions）功能，允许你验证性能测试结果是否符合预期标准。这些断言在测试结束后执行，用于自动判断测试是否通过。以下是 Gatling 中各种断言方法的详细说明和示例。

## 断言的基本结构

在 Gatling 中，断言通常在 `setUp` 块之后使用 `assertions` 方法添加：

```scala
setUp(
  scn.inject(...)
).protocols(httpProtocol)
.assertions(
  // 这里添加各种断言
  global.responseTime.max.lt(500),
  global.successfulRequests.percent.gt(95)
)
```

## 1. 全局断言 (Global Assertions)

全局断言针对整个测试的所有请求进行验证。

### 1.1 响应时间断言

```scala
import io.gatling.core.Predef._
import scala.concurrent.duration._

// 最大响应时间小于500毫秒
global.responseTime.max.lt(500)

// 平均响应时间小于200毫秒
global.responseTime.mean.lt(200)

// 95%百分位响应时间小于300毫秒
global.responseTime.percentile95.lt(300)

// 99%百分位响应时间小于400毫秒
global.responseTime.percentile99.lt(400)

// 所有响应时间都在100-500毫秒之间
global.responseTime.max.between(100, 500)

// 使用自定义百分位
global.responseTime.percentile(99.5).lt(350)
```

### 1.2 请求成功率断言

```scala
// 所有请求必须100%成功
global.failedRequests.count.is(0)

// 失败请求百分比小于1%
global.failedRequests.percent.lt(1.0)

// 成功请求百分比大于99%
global.successfulRequests.percent.gt(99.0)

// 总请求数等于预期值（适用于固定负载测试）
global.allRequests.count.is(10000)
```

### 1.3 吞吐量断言

```scala
// 平均每秒请求数大于50
global.requestsPerSec.gte(50.0)

// 总请求数在特定范围内
global.allRequests.count.between(9000, 11000)
```

## 2. 针对特定请求的断言 (Details Assertions)

你可以针对特定的请求或请求组进行断言，而不是全局的所有请求。

### 2.1 针对单个请求的断言

```scala
// 针对名为"Get_User_Info"的请求
details("Get_User_Info").responseTime.max.lt(300)
details("Get_User_Info").failedRequests.percent.lt(1.0)
details("Get_User_Info").successfulRequests.count.gt(1000)
```

### 2.2 针对请求组的断言

```scala
// 针对名为"Login_Flow"的组
details("Login_Flow").responseTime.percentile95.lt(500)
details("Login_Flow").failedRequests.count.is(0)
```

### 2.3 针对事务的断言

```scala
// 针对事务的断言（如果使用了transaction块）
details("Add_to_Cart_Transaction").responseTime.max.lt(1000)
```

## 3. 针对特定用户群的断言 (For All Assertions)

`forAll` 断言确保所有请求（或指定类别的请求）都满足条件。

```scala
// 所有请求的成功率都必须大于95%
forAll.successfulRequests.percent.gt(95.0)

// 所有请求的响应时间都必须小于1秒
forAll.responseTime.max.lt(1000)

// 所有名为"API_*"的请求都必须成功
forAll.requestsMatching(".*API_.*").failedRequests.count.is(0)
```

## 4. 组合断言和复杂条件

你可以组合多个断言来创建复杂的验证条件。

### 4.1 多个断言组合

```scala
.assertions(
  // 响应时间要求
  global.responseTime.max.lt(1000),
  global.responseTime.percentile95.lt(500),
  
  // 成功率要求
  global.successfulRequests.percent.gt(99.5),
  
  // 特定关键API的性能要求
  details("Checkout_API").responseTime.max.lt(800),
  details("Checkout_API").failedRequests.count.is(0),
  
  // 吞吐量要求
  global.requestsPerSec.gte(100.0)
)
```

### 4.2 使用正则表达式匹配请求

```scala
// 所有包含"API"的请求的成功率必须大于99%
forAll.requestsMatching(".*API.*").successfulRequests.percent.gt(99.0)

// 所有登录相关请求的响应时间必须小于300ms
forAll.requestsMatching(".*Login.*").responseTime.max.lt(300)
```

## 5. 完整的断言示例

下面是一个完整的 Gatling 模拟示例，展示了多种断言的使用：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class ComprehensiveAssertionExample extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")

  val scn = scenario("Comprehensive Test")
    .exec(
      http("Login_API")
        .post("/login")
        .body(StringBody("""{"username": "test", "password": "pass"}"""))
        .check(status.is(200))
    )
    .pause(1.second)
    .group("User_Operations") {
      exec(
        http("Get_User_Profile")
          .get("/user/profile")
          .check(status.is(200))
      )
      .pause(1.second)
      .exec(
        http("Update_User_Profile")
          .put("/user/profile")
          .body(StringBody("""{"name": "updated"}"""))
          .check(status.is(200))
      )
    }
    .pause(1.second)
    .exec(
      http("Logout_API")
        .post("/logout")
        .check(status.is(200))
    )

  setUp(
    scn.inject(
      rampUsers(100).during(30.seconds)
    )
  ).protocols(httpProtocol)
  .assertions(
    // 全局性能指标
    global.responseTime.max.lt(2000),
    global.responseTime.percentile95.lt(1000),
    global.responseTime.percentile99.lt(1500),
    
    // 成功率要求
    global.successfulRequests.percent.gt(99.0),
    global.failedRequests.count.lt(10),
    
    // 吞吐量要求
    global.requestsPerSec.gte(50.0),
    
    // 特定API性能
    details("Login_API").responseTime.max.lt(800),
    details("Login_API").failedRequests.percent.lt(0.5),
    
    // 组性能
    details("User_Operations").responseTime.percentile95.lt(1200),
    
    // 所有API请求都必须成功
    forAll.requestsMatching(".*API.*").failedRequests.count.is(0)
  )
}
```

## 6. 断言最佳实践

1. **分层设置断言**：
   - 设置全局基准（如所有请求的成功率 > 99%）
   - 为关键业务路径设置更严格的断言（如支付流程的成功率 = 100%）
   - 为不同百分位设置合理的响应时间目标

2. **结合实际业务需求**：
   - 根据SLA（服务等级协议）设置断言阈值
   - 考虑不同用户场景的性能要求差异

3. **逐步收紧断言**：
   - 初次测试时设置较宽松的断言
   - 随着系统优化逐步提高性能要求

4. **使用有意义的断言名称**：
   - 清晰的断言描述有助于理解测试失败的原因

5. **结合持续集成**：
   - 将断言集成到CI/CD流程中，自动判断性能测试是否通过

## 7. 查看断言结果

运行测试后，Gatling 会在HTML报告的"Assertions"标签页中显示所有断言的结果：

- ✅ 绿色表示断言通过
- ❌ 红色表示断言失败
- 每个断言都会显示实际值和期望值

断言失败时，Gatling 会以非零退出码结束，这可以在自动化脚本中用于判断测试是否通过。

通过合理使用这些断言方法，你可以确保性能测试不仅生成负载，还能自动验证系统是否满足性能要求，从而实现真正的自动化性能测试。