# 如何第一次运行你的第一个 Gatling Scala 脚本

下面是一个详细的、分步的指南，帮助你从零开始编写并运行你的第一个 Gatling 性能测试脚本。

## 准备工作

### 1. 安装 Java
Gatling 运行在 JVM 上，所以首先需要安装 Java：
- 访问 [Oracle JDK](https://www.oracle.com/java/technologies/javase-downloads.html) 或 [OpenJDK](https://openjdk.java.net/install/)
- 安装 Java 8 或更高版本（推荐 Java 11 或 17）
- 验证安装：在终端/命令提示符中运行 `java -version`

### 2. 安装 Gatling
有两种主要方式：

#### 选项 A: 下载 Gatling Bundle（推荐给初学者）
1. 访问 [Gatling 官方网站下载页面](https://gatling.io/open-source/start-testing/)
2. 下载最新版本的 Gatling Bundle（ZIP 格式）
3. 解压到任意目录

#### 选项 B: 使用 Maven/Gradle/SBT（推荐给已有项目）
如果你使用构建工具，可以在现有项目中添加 Gatling 依赖。

对于 Maven，在 `pom.xml` 中添加：
```xml
<dependency>
    <groupId>io.gatling</groupId>
    <artifactId>gatling-core</artifactId>
    <version>3.9.5</version> <!-- 检查最新版本 -->
</dependency>
```

## 创建你的第一个 Gatling 脚本

### 1. 创建脚本文件
在 Gatling 目录结构中：
- 如果你使用 Gatling Bundle：在 `user-files/simulations` 目录下创建你的脚本
- 如果你使用 Maven：在 `src/test/scala` 目录下创建你的脚本

创建一个名为 `FirstSimulation.scala` 的文件。

### 2. 编写基础脚本
将以下代码复制到你的 `FirstSimulation.scala` 文件中：

```scala
import io.gatling.core.Predef._ // 必需的基础导入
import io.gatling.http.Predef._ // HTTP 协议支持
import scala.concurrent.duration._ // 时间单位支持

class FirstSimulation extends Simulation {

  // 1. 定义 HTTP 协议配置
  val httpProtocol = http
    .baseUrl("https://httpbin.org") // 我们要测试的基础URL
    .acceptHeader("application/json") // 通用的请求头
    .userAgentHeader("Gatling First Test")

  // 2. 定义我们要测试的具体请求
  val scn = scenario("First Test Scenario")
    .exec(
      http("Get Home Page") // 请求的名称（会在报告中显示）
        .get("/") // GET 请求根路径
        .check(status.is(200)) // 断言响应状态码是200
    )
    .pause(1.second) // 模拟用户思考时间，暂停1秒

  // 3. 设置负载模型 - 定义虚拟用户的行为
  setUp(
    scn.inject(
      atOnceUsers(1) // 立即启动1个用户
    ).protocols(httpProtocol) // 应用协议配置
  )
}
```

**脚本说明：**
- 我们使用 `httpbin.org` 作为测试目标，这是一个专门用于HTTP请求测试的公共服务
- 这个脚本模拟一个用户访问首页，检查响应状态是否为200，然后暂停1秒

## 运行你的脚本

### 如果你使用 Gatling Bundle:
1. 打开终端/命令提示符
2. 导航到 Gatling 解压后的目录
3. 运行以下命令：
   ```bash
   # On Linux/Mac
   ./bin/gatling.sh
   
   # On Windows
   bin\gatling.bat
   ```
4. 程序会列出所有可用的模拟脚本，输入对应的数字选择 `FirstSimulation`
5. 等待测试运行完成

### 如果你使用 Maven:
1. 在项目根目录运行：
   ```bash
   mvn gatling:test -Dgatling.simulationClass=FirstSimulation
   ```
   注意：如果你的脚本在包中，需要使用完整包路径，如 `-Dgatling.simulationClass=com.mycompany.FirstSimulation`

## 查看测试结果

运行完成后，Gatling 会在控制台输出报告的位置，通常类似：
```
Please open the following file: /path/to/gatling/results/firstsimulation-20240101-123456/index.html
```

1. 复制这个路径到浏览器中打开
2. 你会看到一个详细的 HTML 报告，包含：
   - 全局统计数据（请求数、响应时间等）
   - 响应时间分布
   - 活跃用户随时间变化图表

## 进阶：一个更真实的例子

当你熟悉了基础脚本后，可以尝试这个更复杂的例子：

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class AdvancedFirstSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://httpbin.org")
    .acceptHeader("application/json")
    .userAgentHeader("Gatling Advanced Test")

  // 定义多个步骤的场景
  val scn = scenario("Advanced Test Scenario")
    .exec(
      http("Get Home Page")
        .get("/")
        .check(status.is(200))
    )
    .pause(1)
    .exec(
      http("Get IP Address")
        .get("/ip")
        .check(status.is(200))
    )
    .pause(1)
    .exec(
      http("Get User Agent")
        .get("/user-agent")
        .check(status.is(200),
               jsonPath("$.user-agent").is("Gatling Advanced Test")) // 更复杂的检查
    )

  // 更复杂的负载模型
  setUp(
    scn.inject(
      nothingFor(2.seconds), // 先等待2秒
      atOnceUsers(1), // 立即启动1个用户
      rampUsers(5).during(10.seconds) // 在10秒内逐步启动5个用户
    ).protocols(httpProtocol)
  )
}
```

## 常见问题排查

1. **"Class not found" 错误**：
   - 确保脚本放在正确的目录中
   - 检查类名是否匹配

2. **连接错误**：
   - 检查网络连接
   - 确认测试目标URL可访问

3. **性能问题**：
   - 开始时使用少量用户(1-10个)
   - 逐步增加负载观察系统行为

## 下一步

成功运行第一个脚本后，你可以：
1. 修改脚本测试你自己的应用程序
2. 学习如何使用[数据驱动测试](提供数据驱动的例子)
3. 探索更复杂的[场景设计和断言](提供丰富的报告与分析例子)
4. 了解如何将Gatling集成到[CI/CD流程](提供持续集成例子)中

恭喜你完成了第一个Gatling性能测试！现在你已经掌握了基础，可以开始探索更高级的功能和场景了。