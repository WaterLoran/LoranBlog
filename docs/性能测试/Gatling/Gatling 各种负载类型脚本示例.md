# Gatling 各种负载类型脚本示例

下面我将为您展示 Gatling 中各种常见负载模型的脚本示例，这些模型可以帮助您模拟不同的用户行为模式和生产环境负载情况。

## 完整的负载模型示例集

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._

class LoadModelExamplesSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")
    .userAgentHeader("Gatling-Performance-Test")
  
  // 基础场景定义
  val scn = scenario("API Load Test")
    .exec(
      http("Get Homepage")
        .get("/")
        .check(status.is(200))
    )
    .pause(1.second, 3.seconds) // 随机思考时间
    .exec(
      http("API Request")
        .get("/api/data")
        .check(status.is(200), jsonPath("$.items").exists)
    )

  // 1. 一次性加载模型 (At Once)
  val atOnceModel = setUp(
    scn.inject(
      atOnceUsers(100) // 立即启动100个用户
    ).protocols(httpProtocol)
  )
  
  // 2. 均匀递增模型 (Ramp Users)
  val rampModel = setUp(
    scn.inject(
      nothingFor(5.seconds), // 先等待5秒
      rampUsers(500).during(1.minute) // 1分钟内从0增加到500个用户
    ).protocols(httpProtocol)
  )
  
  // 3. 分阶段递增模型 (Ramp Users Per Second)
  val rampPerSecModel = setUp(
    scn.inject(
      rampUsersPerSec(1).to(5).during(2.minutes), // 2分钟内从1用户/秒增加到5用户/秒
      constantUsersPerSec(5).during(5.minutes) // 然后保持5用户/秒持续5分钟
    ).protocols(httpProtocol)
  )
  
  // 4. 恒定并发模型 (Constant Users)
  val constantModel = setUp(
    scn.inject(
      constantUsersPerSec(10).during(10.minutes) // 10分钟内保持每秒10个用户
    ).protocols(httpProtocol)
  )
  
  // 5. 阶梯式增长模型 (Increment Users)
  val incrementModel = setUp(
    scn.inject(
      incrementUsersPerSec(5) // 每秒增加5个用户
        .times(5) // 增加5次
        .eachLevelLasting(1.minute) // 每个级别持续1分钟
        .separatedByRampsLasting(30.seconds) // 级别之间间隔30秒
        .startingFrom(10) // 从10用户/秒开始
    ).protocols(httpProtocol)
  )
  
  // 6. 脉冲负载模型 (Peak Users)
  val peakModel = setUp(
    scn.inject(
      constantUsersPerSec(5).during(2.minutes), // 正常负载
      rampUsersPerSec(5).to(50).during(30.seconds), // 快速增加到峰值
      constantUsersPerSec(50).during(1.minute), // 保持峰值
      rampUsersPerSec(50).to(5).during(30.seconds) // 回落到正常
    ).protocols(httpProtocol)
  )
  
  // 7. 压力测试模型 (Stress Peak)
  val stressModel = setUp(
    scn.inject(
      stressPeakUsers(1000).during(5.minutes) // 在5分钟内逐步增加到1000个用户
    ).protocols(httpProtocol)
  )
  
  // 8. 混合负载模型 (Combination)
  val mixedModel = setUp(
    scn.inject(
      // 第一阶段: 正常工作时间负载
      constantUsersPerSec(20).during(30.minutes),
      
      // 第二阶段: 高峰时段负载
      rampUsersPerSec(20).to(100).during(15.minutes),
      constantUsersPerSec(100).during(45.minutes),
      rampUsersPerSec(100).to(20).during(15.minutes),
      
      // 第三阶段: 夜间低负载
      constantUsersPerSec(5).during(6.hours)
    ).protocols(httpProtocol)
  )
  
  // 9. 闭环负载模型 (Closed Model) - 固定并发用户数
  val closedModel = setUp(
    scn.inject(
      constantConcurrentUsers(50).during(10.minutes) // 始终保持50个并发用户
    ).protocols(httpProtocol)
  )
  
  // 10. 自定义复杂负载模型
  val customModel = setUp(
    scn.inject(
      // 预热阶段
      rampUsers(10).during(10.seconds),
      
      // 逐步增加负载
      incrementUsersPerSec(2.0)
        .times(5)
        .eachLevelLasting(30.seconds)
        .startingFrom(5),
      
      // 保持稳定负载
      constantUsersPerSec(15).during(5.minutes),
      
      // 峰值冲击
      atOnceUsers(200),
      
      // 恢复正常
      rampUsersPerSec(50).to(10).during(1.minute),
      
      // 结束阶段
      constantUsersPerSec(10).during(2.minutes)
    ).protocols(httpProtocol)
  )
  
  // 选择要运行的模型 (取消注释其中一个)
  // atOnceModel
  // rampModel
  // rampPerSecModel
  // constantModel
  // incrementModel
  // peakModel
  // stressModel
  // mixedModel
  // closedModel
  // customModel
}
```

## 各种负载模型的详细说明

### 1. 一次性加载模型 (At Once)
```scala
atOnceUsers(100) // 立即启动100个用户
```
- **用途**：测试系统在突然承受大量用户时的表现
- **场景**：秒杀活动、系统重启后的流量涌入
- **特点**：最暴力的测试方式，容易发现系统瓶颈

### 2. 均匀递增模型 (Ramp Users)
```scala
rampUsers(500).during(1.minute) // 1分钟内从0增加到500个用户
```
- **用途**：模拟用户量逐渐增长的情况
- **场景**：工作日开始时用户逐渐登录系统
- **特点**：线性增长，观察系统在负载增加时的表现

### 3. 分阶段递增模型 (Ramp Users Per Second)
```scala
rampUsersPerSec(1).to(5).during(2.minutes) // 2分钟内从1用户/秒增加到5用户/秒
constantUsersPerSec(5).during(5.minutes) // 然后保持5用户/秒持续5分钟
```
- **用途**：模拟用户访问速率的变化
- **场景**：促销活动开始时的流量增长
- **特点**：控制的是到达率而非并发用户数

### 4. 恒定并发模型 (Constant Users)
```scala
constantUsersPerSec(10).during(10.minutes) // 10分钟内保持每秒10个用户
```
- **用途**：稳定性测试，评估系统在固定负载下的表现
- **场景**：正常业务时段的稳定流量
- **特点**：产生稳定的负载，适合长时间运行测试

### 5. 阶梯式增长模型 (Increment Users)
```scala
incrementUsersPerSec(5) // 每秒增加5个用户
  .times(5) // 增加5次
  .eachLevelLasting(1.minute) // 每个级别持续1分钟
  .separatedByRampsLasting(30.seconds) // 级别之间间隔30秒
  .startingFrom(10) // 从10用户/秒开始
```
- **用途**：找出系统的最大处理能力
- **场景**：容量规划测试，确定系统瓶颈
- **特点**：逐步增加负载，直到系统性能下降

### 6. 脉冲负载模型 (Peak Users)
```scala
constantUsersPerSec(5).during(2.minutes), // 正常负载
rampUsersPerSec(5).to(50).during(30.seconds), // 快速增加到峰值
constantUsersPerSec(50).during(1.minute), // 保持峰值
rampUsersPerSec(50).to(5).during(30.seconds) // 回落到正常
```
- **用途**：测试系统对突发流量的处理能力
- **场景**：新闻热点、社交媒体爆款内容
- **特点**：模拟流量尖峰，测试系统的弹性

### 7. 压力测试模型 (Stress Peak)
```scala
stressPeakUsers(1000).during(5.minutes) // 在5分钟内逐步增加到1000个用户
```
- **用途**：极限压力测试，找出系统崩溃点
- **场景**：评估系统在最极端情况下的表现
- **特点**：持续增加负载直到系统无法响应

### 8. 混合负载模型 (Combination)
```scala
// 模拟全天不同时段的负载变化
constantUsersPerSec(20).during(30.minutes), // 正常工作时间
rampUsersPerSec(20).to(100).during(15.minutes), // 高峰时段
constantUsersPerSec(100).during(45.minutes),
rampUsersPerSec(100).to(20).during(15.minutes),
constantUsersPerSec(5).during(6.hours) // 夜间低负载
```
- **用途**：模拟真实世界的复杂负载模式
- **场景**：全天候业务系统的性能测试
- **特点**：最真实的测试方式，综合多种负载模式

### 9. 闭环负载模型 (Closed Model)
```scala
constantConcurrentUsers(50).during(10.minutes) // 始终保持50个并发用户
```
- **用途**：测试固定用户数下的系统表现
- **场景**：系统有固定数量的并发用户
- **特点**：用户完成操作后会立即开始新的操作

### 10. 自定义复杂负载模型
结合多种注入策略，创建符合特定需求的复杂负载模式。

## 实际应用建议

1. **从简单开始**：初次测试时，从简单的负载模型（如恒定负载）开始，逐步增加复杂度。

2. **基于真实数据**：如果可能，使用生产环境的监控数据来设计负载模型，使其更贴近真实情况。

3. **渐进式增加**：进行压力测试时，使用阶梯式增长模型，逐步增加负载，观察系统性能变化。

4. **考虑业务周期**：对于全天候运行的系统，使用混合负载模型模拟不同时间段的负载变化。

5. **设置合理的断言**：为每个负载模型设置相应的性能断言，确保系统在不同负载下都能满足性能要求。

6. **监控系统资源**：运行测试时，同时监控系统的CPU、内存、磁盘I/O和网络使用情况，找出性能瓶颈。

这些负载模型可以单独使用，也可以组合使用，以创建符合您特定测试需求的复杂场景。通过合理选择和使用这些模型，您可以全面评估系统在各种负载条件下的性能表现。