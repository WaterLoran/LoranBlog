# Gatling 结果验证与断言示例

下面我将为您展示 Gatling 中各种结果验证和断言的使用示例，这些功能可以帮助您确保性能测试结果符合预期标准。

## 完整的验证与断言示例

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._

class AssertionExamplesSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .disableCaching // 禁用缓存以确保每次请求都是新的

  // 场景定义
  val scn = scenario("API 测试场景")
    .exec(
      http("获取用户列表")
        .get("/users")
        .check( // 响应检查
          status.is(200), // 状态码检查
          jsonPath("$.users").exists, // JSON路径存在检查
          jsonPath("$.users.length()").gt(0) // JSON数组长度大于0
        )
    )
    .pause(1.second)
    .exec(
      http("创建新用户")
        .post("/users")
        .body(StringBody("""{"name": "TestUser", "email": "test@example.com"}"""))
        .check(
          status.in(201, 202), // 状态码可以是201或202
          jsonPath("$.id").saveAs("newUserId"), // 提取ID并保存到会话
          jsonPath("$.name").is("TestUser"), // 验证响应中的名称
          jsonPath("$.email").is("test@example.com") // 验证响应中的邮箱
        )
    )
    .pause(1.second)
    .exec(
      http("获取特定用户")
        .get("/users/${newUserId}") // 使用之前保存的ID
        .check(
          status.not(404), // 状态码不能是404
          status.not(500), // 状态码不能是500
          jsonPath("$").is("""{"id":"${newUserId}","name":"TestUser","email":"test@example.com"}""") // 完整响应体验证
        )
    )
    .pause(1.second)
    .exec(
      http("删除用户")
        .delete("/users/${newUserId}")
        .check(status.is(204)) // 验证删除成功
    )

  // 设置负载模型
  setUp(
    scn.inject(
      rampUsers(100).during(1.minute) // 1分钟内逐步增加到100个用户
    ).protocols(httpProtocol)
  ).assertions(
    // ========== 全局断言 ==========
    
    // 1. 响应时间断言
    global.responseTime.max.lt(2000), // 全局最大响应时间小于2000ms
    global.responseTime.mean.lt(800), // 全局平均响应时间小于800ms
    global.responseTime.percentile1.lt(500), // P50响应时间小于500ms
    global.responseTime.percentile2.lt(700), // P75响应时间小于700ms
    global.responseTime.percentile3.lt(1000), // P95响应时间小于1000ms
    global.responseTime.percentile4.lt(1500), // P99响应时间小于1500ms
    
    // 2. 请求成功率断言
    global.successfulRequests.percent.gt(99.0), // 成功率大于99%
    global.failedRequests.percent.lt(1.0), // 失败率小于1%
    global.failedRequests.count.lt(50), // 失败请求数小于50
    
    // 3. 请求数量断言
    global.allRequests.count.gt(1000), // 总请求数大于1000
    global.allRequests.requestsPerSec.gt(10), // 每秒请求数大于10
    
    // ========== 针对特定请求的断言 ==========
    
    // 4. 对特定请求的断言
    details("获取用户列表").responseTime.max.lt(1000), // "获取用户列表"请求的最大响应时间
    details("创建新用户").successfulRequests.percent.is(100), // "创建新用户"请求必须100%成功
    details("获取特定用户").failedRequests.count.lt(5), // "获取特定用户"请求失败数小于5
    
    // 5. 对特定请求组的断言 (如果有分组)
    details("用户操作").responseTime.mean.lt(500), // 假设有名为"用户操作"的组
    
    // ========== 复杂条件断言 ==========
    
    // 6. 组合条件断言
    global.allRequests.percent.between(90, 100), // 百分比在90-100之间
    global.responseTime.percentile4.between(800, 1200), // P99响应时间在800-1200ms之间
    
    // 7. 针对特定时间段的断言 (需要Gatling Enterprise版)
    // forAll.requestsPerSec.gt(5).during(10.seconds), // 在10秒内每秒请求数大于5
    
    // ========== 自定义统计指标断言 ==========
    
    // 8. 自定义指标断言 (如果有自定义指标)
    // myCustomMetric.max.lt(1000)
  )
}

// 另一个示例：更复杂的检查器使用
class AdvancedChecksSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")

  val scn = scenario("高级检查示例")
    .exec(
      http("搜索产品")
        .get("/products/search?q=test")
        .check(
          status.is(200),
          // JSONPath检查
          jsonPath("$.products[0].id").saveAs("firstProductId"),
          jsonPath("$.products[0].price").ofType[Double].gt(0.0), // 价格大于0
          jsonPath("$.products[*].category").findAll.saveAs("categories"), // 提取所有类别
          
          // CSS选择器检查 (适用于HTML)
          // css("div.product", "data-id").findOptional,
          
          // 正则表达式检查
          regex(""""total":(\d+)""").ofType[Int].saveAs("totalProducts"),
          
          // 响应时间检查
          responseTimeInMillis.lt(1000),
          
          // 响应头检查
          header("Content-Type").is("application/json"),
          header("Cache-Control").not("no-cache"),
          
          // 响应体存在性检查
          bodyString.exists,
          bodyString.notNull,
          
          // 响应体长度检查
          bodyBytes.length.lt(102400), // 响应体小于100KB
          
          // 条件检查
          checkIf(session => session("expectedStatus").asOption[Int].isDefined) {
            status.is(session => session("expectedStatus").as[Int])
          }
        )
    )
    .exec(session => {
      // 使用提取的值进行自定义验证
      val categories = session("categories").as[Seq[String]]
      val totalProducts = session("totalProducts").as[Int]
      
      println(s"找到 ${categories.size} 个类别，总共 ${totalProducts} 个产品")
      
      // 自定义验证逻辑
      if (categories.size < 3) {
        println("警告: 类别数量少于预期")
      }
      
      session
    })

  setUp(
    scn.inject(atOnceUsers(1))
  ).assertions(
    global.responseTime.percentile3.lt(500) // P95响应时间小于500ms
  )
}

// 针对JSON API的详细检查示例
class JsonApiValidationSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")

  val scn = scenario("JSON API验证")
    .exec(
      http("获取订单")
        .get("/orders/123")
        .check(
          status.is(200),
          // JSON Schema验证 (需要额外依赖)
          // jsonSchema("order-schema.json").validate,
          
          // 复杂JSONPath表达式
          jsonPath("$.order.id").is("123"),
          jsonPath("$.order.customer.name").notNull,
          jsonPath("$.order.items[0].product.name").exists,
          jsonPath("$.order.total").ofType[Double].gt(0),
          jsonPath("$.order.status").in("pending", "processing", "completed"),
          jsonPath("$.order.items.length()").gte(1), // 至少有一个项目
          
          // 提取数组并验证其内容
          jsonPath("$.order.items[*].price").findAll.transform(_.map(_.toDouble).sum).lt(1000.0),
          
          // 验证日期格式
          jsonPath("$.order.createdAt").matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z"),
          
          // 条件验证
          jsonPath("$.order.discount").optional.validate { (discount, session) =>
            if (discount.isDefined && discount.get.toDouble > 0) {
              // 如果有折扣，验证折扣码存在
              jsonPath("$.order.discountCode").exists.validate
            }
          }
        )
    )

  setUp(
    scn.inject(rampUsers(50).during(1.minute))
  ).assertions(
    details("获取订单").responseTime.percentile4.lt(800), // P99响应时间小于800ms
    details("获取订单").successfulRequests.percent.gt(99.5) // 成功率大于99.5%
  )
}

// 针对HTML页面的检查示例
class HtmlPageValidationSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://www.example.com")

  val scn = scenario("HTML页面验证")
    .exec(
      http("访问首页")
        .get("/")
        .check(
          status.is(200),
          // CSS选择器检查
          css("title").is("Example Domain"),
          css("h1").find.exists,
          css("div.content p").findAll.saveAs("paragraphs"),
          css("a[href='/about']", "href").is("/about"),
          
          // XPath检查
          xpath("//div[@class='content']"),
          xpath("//p[contains(text(), 'example')]").exists,
          
          // 链接检查
          link("More information...").exists,
          
          // 表单检查
          form("searchForm").exists,
          formField("q").exists,
          
          // 响应内容检查
          substring("Example Domain").exists,
          substring("illustrative examples").exists
        )
    )
    .exec(session => {
      val paragraphs = session("paragraphs").as[Seq[String]]
      println(s"找到 ${paragraphs.size} 个段落")
      session
    })

  setUp(
    scn.inject(constantUsersPerSec(2).during(5.minutes))
  ).assertions(
    global.responseTime.max.lt(3000),
    global.successfulRequests.percent.is(100)
  )
}
```

## 关键验证与断言详解

### 1. 状态码验证
```scala
.check(status.is(200)) // 精确匹配
.check(status.in(200, 201, 202)) // 多个可能值
.check(status.not(404)) // 不能是指定值
.check(status.not(500))
```

### 2. JSON响应验证
```scala
.check(
  jsonPath("$.users").exists, // 路径存在
  jsonPath("$.users.length()").gt(0), // 数组长度大于0
  jsonPath("$.user.name").is("TestUser"), // 精确匹配
  jsonPath("$.user.age").ofType[Int].gt(18), // 类型检查和比较
  jsonPath("$.items[*].price").findAll.transform(_.sum).lt(1000) // 转换和验证
)
```

### 3. 响应头验证
```scala
.check(
  header("Content-Type").is("application/json"),
  header("Cache-Control").not("no-cache"),
  header("X-RateLimit-Limit").ofType[Int].gt(0)
)
```

### 4. 响应体验证
```scala
.check(
  bodyString.exists, // 响应体存在
  bodyString.notNull, // 响应体不为空
  bodyBytes.length.lt(102400), // 响应体大小限制
  substring("Success").exists, // 包含特定文本
  regex(""""total":(\d+)""").ofType[Int].saveAs("totalCount") // 正则提取
)
```

### 5. 全局断言
```scala
.assertions(
  // 响应时间断言
  global.responseTime.max.lt(2000),
  global.responseTime.mean.lt(800),
  global.responseTime.percentile3.lt(1000), // P95
  
  // 成功率断言
  global.successfulRequests.percent.gt(99.0),
  global.failedRequests.count.lt(50),
  
  // 吞吐量断言
  global.allRequests.requestsPerSec.gt(10)
)
```

### 6. 针对特定请求的断言
```scala
.assertions(
  details("获取用户列表").responseTime.max.lt(1000),
  details("创建新用户").successfulRequests.percent.is(100),
  details("获取特定用户").failedRequests.count.lt(5)
)
```

### 7. 条件检查
```scala
.check(
  checkIf(session => session("userType").as[String] == "vip") {
    jsonPath("$.vipFeatures").exists
  }
)
```

### 8. 自定义验证逻辑
```scala
.check(
  jsonPath("$.items").transform { (items, session) =>
    // 自定义验证逻辑
    if (items.as[Seq[String]].size < 5) {
      throw new Exception("项目数量不足")
    }
    items
  }.validate
)
```

## 最佳实践建议

1. **分层验证**：先验证基本状态码和响应结构，再验证具体业务逻辑。

2. **合理设置断言阈值**：基于业务需求和历史数据设置合理的性能指标阈值。

3. **结合CI/CD**：将断言集成到持续集成流程中，确保性能回归能被及时发现。

4. **使用百分位数**：除了平均响应时间，更要关注P90、P95、P99等百分位数，它们更能反映用户体验。

5. **验证关键业务路径**：优先为关键业务路径设置严格的断言，确保核心功能性能。

6. **平衡严格性与灵活性**：断言既要能发现问题，又不能过于严格导致误报。

7. **记录验证失败**：使用Gatling的日志功能记录验证失败的详细信息，便于调试。

这些验证和断言功能使得Gatling不仅是一个负载生成工具，更是一个完整的性能验证框架，能够确保您的应用程序在各种负载条件下都能满足性能要求。