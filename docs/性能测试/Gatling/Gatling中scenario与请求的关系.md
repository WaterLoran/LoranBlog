### Scenario 与 单个请求的关系

你可以把它们想象成 **剧本（Scenario）** 和 **台词或动作（Request）** 的关系。

*   **`Scenario`（场景）**： 定义了一个**完整的用户行为模式**或**业务流程**。它描述了一个虚拟用户（Virtual User）在系统中所执行的一系列操作。例如：
    *   "一个购物用户的行为"
    *   "一个内容管理员的行为"
    *   "一个匿名游客的行为"

*   **`Request`（请求）**： 是 `Scenario` 中的一个**具体步骤**，通常是单个的 HTTP 调用（如 GET、POST）。例如，在 "购物用户" 这个 Scenario 中，会包含多个请求：
    *   `请求1`: 访问首页 (`GET /`)
    *   `请求2`: 搜索商品 (`GET /search?keyword=phone`)
    *   `请求3`: 添加商品到购物车 (`POST /cart/add`)
    *   `请求4`: 结账 (`POST /checkout`)

**层级关系非常明确：**
**`Simulation` > `Scenario` > `Request`**

*   一个 **`Simulation`**（模拟）是你的**整个测试脚本文件**，它是最高层级。
*   一个 `Simulation` 中可以包含**一个或多个** **`Scenario`**。
*   一个 `Scenario` 由**一系列有序的步骤（Step）** 组成，其中最重要的步骤就是 **`Request`**，此外还包括 `pause`（思考时间）、`check`（断言）、`exec`（执行任意代码）等。

---

### 一个脚本可以有多个 Scenario 吗？

**当然可以，而且这通常是模拟真实世界复杂负载所必需的。**

你可以在一个 `Simulation` 脚本中定义多个不同的 `Scenario`，然后将它们组合在一起注入（inject），以创建更真实、更复杂的负载模型。

### 多个 Scenario 的实用示例

假设你要测试一个电商网站，用户有两种典型行为：
1.  **浏览者（Browser）**： 只是看看，很少下单。
2.  **购买者（Buyer）**： 会执行搜索、添加购物车和下单的操作。

你可以这样建模：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class MultipleScenariosSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://myecommerce.com")
    .acceptHeader("application/json")

  // --- 定义第一个 Scenario: 浏览者 ---
  val browserScenario = scenario("Browser User")
    .exec(http("View Homepage")
      .get("/")
    )
    .pause(2)
    .exec(http("Browse Category") 
      .get("/category/electronics")
    )
    .pause(5, 10) // 随机暂停5-10秒，模拟阅读时间
    .exec(http("View Product Detail")
      .get("/product/12345")
    )

  // --- 定义第二个 Scenario: 购买者 ---
  val buyerScenario = scenario("Buyer User")
    .exec(http("Login")
      .post("/login")
      .body(StringBody("""{"username": "user", "password": "pass"}"""))
      .check(jsonPath("$.token").saveAs("authToken"))
    )
    .pause(1)
    .exec(http("Search Product")
      .get("/search?q=gatling-book")
      .header("Authorization", "Bearer ${authToken}")
    )
    .pause(1)
    .exec(http("Add to Cart")
      .post("/cart")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody("""{"productId": 789, "quantity": 1}"""))
    )
    .pause(2)
    .exec(http("Checkout")
      .post("/checkout")
      .header("Authorization", "Bearer ${authToken}")
    )

  // --- 将多个 Scenario 组合到一次测试中 ---
  setUp(
    // 在30秒内，逐步启动20个“浏览者”
    browserScenario.inject(rampUsers(20).during(30.seconds)),
    
    // 同时，在10秒内，启动5个“购买者”，并且每个用户会重复执行整个场景2次
    buyerScenario.inject(rampUsers(5).during(10.seconds).andThen(rampUsers(5).during(10.second).repeat(2)))
  ).protocols(httpProtocol)
}
```

### 为什么要使用多个 Scenario？

1.  **模拟真实用户混合（Realistic User Mix）**： 真实的系统访问者不会都做同样的事情。有些人浏览，有些人搜索，有些人购买。使用多个 `Scenario` 可以精确地模拟这种混合行为。

2.  **差异化负载模式（Different Load Patterns）**： 不同的用户群体可能以不同的速率和并发度使用系统。你可以为每个 `Scenario` 独立设置注入策略（injection profile）。
    *   例如：`rampUsers(100).during(5.minutes)` 给普通用户
    *   `atOnceUsers(10)` 给管理员用户

3.  **清晰的代码组织（Code Organization）**： 将不同的业务流程分离到不同的 `Scenario` 中，使得测试脚本更易于阅读、维护和复用。

4.  **独立的断言和检查（Independent Checks）**： 你可以为不同的 `Scenario` 设置不同的成功标准（checks 和 assertions）。

### 总结

| 概念             | 描述                   | 类比                               |
| :--------------- | :--------------------- | :--------------------------------- |
| **`Simulation`** | **整个测试剧本**       | 一整场戏剧的导演脚本               |
| **`Scenario`**   | **一类用户的行为流程** | 一个特定角色（如英雄、反派）的戏份 |
| **`Request`**    | **一个具体的HTTP操作** | 角色的一句台词或一个动作           |

因此，**一个 Gatling 脚本（Simulation）不仅可以，而且经常包含多个 Scenario**，以此来构建一个能够高度模拟真实世界复杂情况的性能测试。