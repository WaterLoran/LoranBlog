## 完整的 Gatling 控制流程示例

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.util.Random

class AdvancedControlFlowSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  // 1. 数据源 - 使用Feeder进行数据驱动
  val userFeeder = csv("data/users.csv").circular // 循环使用CSV数据
  val productFeeder = Array(
    Map("productId" -> "1001", "category" -> "electronics"),
    Map("productId" -> "1002", "category" -> "books"),
    Map("productId" -> "1003", "category" -> "clothing")
  ).circular

  // 2. 随机数据生成
  def randomEmail(): String = s"user${Random.nextInt(10000)}@example.com"
  def randomProductName(): String = s"Product_${Random.alphanumeric.take(8).mkString}"

  val scn = scenario("高级控制流程演示")
    
    // 3. 初始化阶段 - 只执行一次的操作
    .exec(session => {
      println("测试开始，初始化虚拟用户")
      session.set("startTime", System.currentTimeMillis())
    })
    
    // 4. 数据驱动 - 从Feeder获取数据
    .feed(userFeeder)
    .exec { session =>
      println(s"当前用户: ${session("username").as[String]}")
      session
    }
    
    // 5. 条件判断 - doIf
    .doIf(session => session("userType").as[String] == "vip") {
      exec(http("VIP专属接口")
        .get("/vip/benefits")
        .check(status.is(200)))
    }
    
    // 6. 循环 - repeat
    .repeat(5, "browseCount") { // 浏览5个商品
      feed(productFeeder)
      .exec(
        http("浏览商品 - #{browseCount}")
          .get("/products/${productId}")
          .check(
            status.is(200),
            jsonPath("$.name").saveAs("productName")
          )
      )
      .exec(session => {
        println(s"浏览了商品: ${session("productName").as[String]}")
        session
      })
      .pause(1.second, 3.seconds) // 随机暂停
    }
    
    // 7. 条件循环 - during (在指定时间内循环)
    .during(30.seconds, "searchSession") { // 30秒内持续执行
      exec(
        http("搜索商品")
          .get("/search?keyword=test")
          .check(status.is(200))
      )
      .pause(500.milliseconds, 2.seconds)
    }
    
    // 8. 退出条件 - exitBlockOnFail
    .exitBlockOnFail(
      exec(
        http("关键登录操作")
          .post("/login")
          .body(StringBody("""{"username": "${username}", "password": "${password}"}"""))
          .check(
            status.is(200),
            jsonPath("$.token").saveAs("authToken")
          )
      )
    ) // 如果登录失败，整个虚拟用户将停止
    
    // 9. 分组 - group (在报告中分组显示)
    .group("购物流程") {
      exec(
        http("添加购物车")
          .post("/cart")
          .header("Authorization", "Bearer ${authToken}")
          .body(StringBody("""{"productId": "1001", "quantity": 1}"""))
          .check(status.is(201))
      )
      .pause(2.seconds)
      .exec(
        http("结算订单")
          .post("/checkout")
          .header("Authorization", "Bearer ${authToken}")
          .check(status.is(200))
      )
    }
    
    // 10. 选择分支 - doSwitch
    .doSwitch("${userType}")(
      "vip" -> exec(http("VIP功能").get("/vip/features")),
      "admin" -> exec(http("管理功能").get("/admin/dashboard")),
      "regular" -> exec(http("普通功能").get("/user/profile"))
    )
    
    // 11. 随机选择 - randomSwitch
    .randomSwitch(
      70.0 -> exec(http("主要功能 (70%)").get("/main/feature")), // 70%概率
      20.0 -> exec(http("次要功能 (20%)").get("/secondary/feature")), // 20%概率
      10.0 -> exec(http("边缘功能 (10%)").get("/edge/feature")) // 10%概率
    )
    
    // 12. 错误处理 - tryMax (重试机制)
    .tryMax(3) { // 最多重试3次
      exec(
        http("可能失败的操作")
          .get("/unstable/api")
          .check(status.in(200, 201, 202))
      )
    }.exitHereIfFailed // 如果重试后仍然失败，退出
    
    // 13. 异步操作 - 使用pause和exec组合
    .exec(session => {
      println("开始异步操作...")
      session
    })
    .pause(5.seconds) // 模拟异步等待
    .exec(
      http("检查异步结果")
        .get("/async/result")
        .check(status.is(200))
    )
    
    // 14. 会话操作 - 修改session
    .exec(session => {
      val endTime = System.currentTimeMillis()
      val startTime = session("startTime").as[Long]
      val duration = (endTime - startTime) / 1000
      println(s"用户 ${session("username").as[String]} 完成流程，耗时 ${duration}秒")
      session.set("totalDuration", duration)
    })
    
    // 15. 最终验证
    .exec(
      http("验证完成状态")
        .get("/user/status")
        .check(
          jsonPath("$.completed").is("true"),
          jsonPath("$.duration").lt(60) // 总耗时应小于60秒
        )
    )

  // 负载模型配置
  setUp(
    scn.inject(
      nothingFor(5.seconds), // 等待5秒
      atOnceUsers(1), // 立即启动1个用户（用于调试）
      rampUsers(10).during(20.seconds), // 20秒内增加到10个用户
      constantUsersPerSec(2).during(1.minute) // 每分钟2个用户
    ).protocols(httpProtocol)
  ).assertions(
    global.responseTime.percentile4.lt(800), // P95响应时间小于800ms
    global.failedRequests.percent.lt(1.0), // 失败率小于1%
    forAll.responseTime.max.lt(2000) // 所有请求响应时间小于2秒
  )
}
```

## 关键控制流程详解

### 1. **条件执行 (doIf)**
```scala
.doIf(session => session("userType").as[String] == "vip") {
  exec(http("VIP专属接口").get("/vip/benefits"))
}
```

### 2. **循环 (repeat)**
```scala
.repeat(5, "counterName") { // 固定次数循环
  exec(http("请求").get("/api"))
  .pause(1.second)
}
```

### 3. **时间循环 (during)**
```scala
.during(30.seconds, "timerName") { // 在指定时间内循环
  exec(http("请求").get("/api"))
  .pause(1.second)
}
```

### 4. **条件退出 (exitBlockOnFail)**
```scala
.exitBlockOnFail(
  exec(http("关键操作").get("/critical/api"))
) // 失败则停止当前用户
```

### 5. **分组 (group)**
```scala
.group("用户注册流程") { // 在报告中分组显示
  exec(http("步骤1").get("/step1"))
  .exec(http("步骤2").get("/step2"))
}
```

### 6. **分支选择 (doSwitch)**
```scala
.doSwitch("${userType}")(
  "vip" -> exec(http("VIP功能").get("/vip")),
  "admin" -> exec(http("管理功能").get("/admin"))
)
```

### 7. **随机选择 (randomSwitch)**
```scala
.randomSwitch(
  60.0 -> exec(http("功能A")), // 60%概率
  30.0 -> exec(http("功能B")), // 30%概率
  10.0 -> exec(http("功能C"))  // 10%概率
)
```

### 8. **重试机制 (tryMax)**
```scala
.tryMax(3) { // 最多重试3次
  exec(http("不稳定API").get("/unstable"))
}
.exitHereIfFailed // 仍然失败则退出
```

### 9. **数据处理 (Feeders)**
```scala
// CSV文件数据源
val userFeeder = csv("data/users.csv").queue

// 内存数组数据源  
val productFeeder = Array(
  Map("id" -> "1", "name" -> "产品A"),
  Map("id" -> "2", "name" -> "产品B")
).random // 随机获取
```

## 实际应用建议

1. **组合使用**：在实际场景中，这些控制结构通常会组合使用，创建出复杂的用户行为模式。

2. **数据驱动**：结合 Feeder 使用，让每个虚拟用户有不同的行为路径和数据。

3. **错误处理**：合理使用 `tryMax` 和 `exitBlockOnFail` 来处理预期中的失败情况。

4. **报告优化**：使用 `group` 将相关操作分组，使测试报告更加清晰易读。

5. **调试技巧**：在开发复杂场景时，可以先使用 `atOnceUsers(1)` 运行单个用户进行调试。

这些控制流程逻辑使得 Gatling 能够模拟极其真实的用户行为，远远超出了简单的顺序请求，是进行有意义性能测试的关键所在。