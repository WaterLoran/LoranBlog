# Gatling 中数据驱动的方法

---

### 1. 使用 CSV 文件进行数据驱动（最常用）

这是最常见和直接的方式，非常适合用于登录、查询、创建使用不同数据的场景。

**场景描述**：模拟多个用户使用不同的用户名和密码进行登录，然后浏览不同的产品页面。

**步骤 1：创建 CSV 数据文件**

创建一个名为 `users.csv` 的文件，放在 Gatling 项目的 `data` 目录下。
```csv
userId, username, password, productId
1, user1, pass123, 100
2, user2, pass456, 101
3, user3, pass789, 102
4, user4, passabc, 103
5, user5, passxyz, 104
```

**步骤 2：编写 Gatling 模拟（Simulation）**

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._

class CsvDataFeederExample extends Simulation {

  // 1. 定义 HTTP 协议
  val httpProtocol = http
    .baseUrl("https://your-test-website.com")
    .acceptHeader("application/json")

  // 2. 创建 Feeder：从 CSV 文件读取数据
  val userFeeder = csv("data/users.csv").circular // .circular 表示用完后从头开始
  // 其他策略：.queue（用完失败）, .random（随机）, .shuffle（随机且不重复）

  // 3. 定义场景（Scenario）
  val scn = scenario("Data Driven Test with CSV")
    .feed(userFeeder) // 为虚拟用户注入一行数据
    .exec(
      http("Login request for user ${username}") // 在日志中显示用户名
        .post("/api/login")
        .body(StringBody("""{"username": "${username}", "password": "${password}"}""")).asJson
        .check(status.is(200), jsonPath("$.token").saveAs("authToken")) // 检查状态并保存 token
    )
    .pause(1.second)
    .exec(
      http("Get product detail for ID ${productId}")
        .get("/api/products/${productId}")
        .header("Authorization", "Bearer ${authToken}") // 使用上一步获取的 token
        .check(status.is(200))
    )

  // 4. 设置负载模型
  setUp(
    scn.inject(
      constantUsersPerSec(2).during(10.seconds) // 每秒注入 2 个用户，持续 10 秒
    ).protocols(httpProtocol)
  )
}
```

**关键点说明：**
*   `csv("data/users.csv")`: 从 `data` 目录加载 CSV 文件。
*   `.circular`: 数据策略。如果虚拟用户数多于数据行数，此策略会循环使用数据。
*   `.feed(feeder)`: 将数据注入到虚拟用户会话（Session）中。
*   `${username}`, `${password}`: 使用 EL 语法引用 feeder 中对应字段的值。

---

### 2. 使用 JSON 文件进行数据驱动

当数据结构更复杂时，JSON 是比 CSV 更好的选择。

**创建 `users.json` 文件：**
```json
[
  {
    "username": "testUser1",
    "credentials": {
      "password": "secret1",
      "role": "admin"
    }
  },
  {
    "username": "testUser2",
    "credentials": {
      "password": "secret2",
      "role": "user"
    }
  }
]
```

**在 Simulation 中使用：**
```scala
// ... 协议和其他部分与上文类似 ...

val jsonFeeder = jsonFile("data/users.json").random

val scn = scenario("JSON Feeder Test")
  .feed(jsonFeeder)
  .exec(
    http("Login with JSON data")
      .post("/api/login")
      .body(StringBody(
        """{
          "user": "${username}",
          "pass": "${credentials.password}",
          "role": "${credentials.role}"
        }"""
      )).asJson
  )

// ... setUp ...
```
**关键点说明：**
*   可以使用点符号（如 `${credentials.password}`）来访问嵌套的 JSON 字段。

---

### 3. 使用内存 Map 或 Iterator 进行数据驱动（程序生成数据）

对于简单的测试，或者需要动态生成数据的情况，可以直接在代码中定义数据。

```scala
// ... 协议和其他部分与上文类似 ...

// 方式 1: 使用 Seq[Map[String, Any]]
val staticFeeder = Seq(
  Map("searchTerm" -> "gatling", "category" -> "docs"),
  Map("searchTerm" -> "performance", "category" -> "blog"),
  Map("searchTerm" -> "load test", "category" -> "video")
).circular

// 方式 2: 使用 Iterator 动态生成数据（例如，生成随机邮件）
val dynamicFeeder = Iterator.continually(
  Map(
    "email" -> s"user-${java.util.UUID.randomUUID().toString.take(8)}@test.com",
    "randomId" -> scala.util.Random.nextInt(10000)
  )
)

val scn = scenario("In-Memory Data Test")
  .feed(dynamicFeeder) // 这里使用动态生成器
  .exec(
    http("Create user with random email")
      .post("/api/users")
      .body(StringBody("""{"email": "${email}", "refId": ${randomId}}""")).asJson
  )

// ... setUp ...
```

---

### 4. 综合高级示例：数据驱动 + 循环 + 条件判断

这个例子结合了多种技术，模拟一个更真实的场景：用户登录后，根据其类型执行不同的操作。

**`users.csv`:**
```csv
username,password,userType
alice,alice_pw,premium
bob,bob_pw,standard
charlie,charlie_pw,standard
```

**Simulation 代码：**

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class AdvancedDataDrivenExample extends Simulation {

  val httpProtocol = http.baseUrl("https://api.example.com")

  val userFeeder = csv("data/users.csv").queue // 使用 .queue，如果用户用完则测试失败

  val scn = scenario("Advanced User Journey")
    .feed(userFeeder)
    .exec(
      http("Login")
        .post("/login")
        .body(StringBody("""{"username": "${username}", "password": "${password}"}""")).asJson
        .check(jsonPath("$.userId").saveAs("loggedInUserId"))
    )
    .pause(1)
    // 根据 userType 条件执行不同操作
    .doIf("${userType.equals('premium')}") {
      exec(
        http("Access Premium Content")
          .get("/premium/content")
          .check(status.is(200))
      )
    }
    .pause(1)
    // 使用保存的 userId 和 feeder 中的数据进行下一步操作
    .exec(
      http("Update Profile")
        .put("/users/${loggedInUserId}/profile")
        .body(StringBody("""{"username": "${username}"}""")).asJson
    )
    // 使用 .repeat 进行循环操作，次数也可以来自 feeder（需要先定义好）
    .repeat(3, "n") { // 简单循环 3 次
      exec(
        http("Perform Action #${n}")
          .get("/some-action")
      ).pause(1)
    }

  setUp(
    scn.inject(atOnceUsers(3)) // 恰好启动 3 个用户，与 CSV 行数匹配（因为用了 .queue）
  ).protocols(httpProtocol)
}
```

### 总结与最佳实践

1.  **选择正确的 Feeder 和策略**：
    *   **`circular`**: 默认，循环使用数据。适合长时间运行测试。
    *   **`queue`**: 顺序使用，数据用尽后虚拟用户将失败。确保测试用户数 <= 数据行数。
    *   **`random`**: 随机选取一行。
    *   **`shuffle`**: 随机打乱顺序后使用，且不重复，直到用尽。

2.  **数据文件位置**：通常放在 `src/test/resources/data/` 目录下，这样在打包和运行时都能正确找到。`csv("data/users.csv")` 会从这个目录解析。

3.  **Session 和变量**：通过 `.feed()` 注入的变量和通过 `.check().saveAs()` 保存的变量都存储在虚拟用户的 **Session** 中，可以在后续的步骤中通过 `${variableName}` 引用。

4.  **动态数据**：对于唯一性约束（如用户名、邮箱），结合 `Iterator` 和随机函数（如 `UUID.randomUUID()`）生成数据非常有效。

5.  **组合使用**：你可以为一个场景配置多个 feeder，例如一个 feeder 管理用户凭证，另一个 feeder 管理搜索关键词。使用多个 `.feed()` 调用即可。

通过这些例子，你可以看到 Gatling 的数据驱动功能非常灵活，能够满足从简单到极其复杂的性能测试场景需求。