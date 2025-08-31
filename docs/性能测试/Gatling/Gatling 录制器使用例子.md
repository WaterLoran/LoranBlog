# Gatling 录制器使用例子

---

### 第 1 步：启动 Gatling 录制器

你有两种主要方式来启动录制器：

#### 方法 A: 使用 Gatling Bundle（推荐）

如果你下载了官方的 Gatling Bundle，进入 `bin` 目录，运行录制器脚本：

```bash
# On Linux/Mac
./recorder.sh

# On Windows
recorder.bat
```

#### 方法 B: 使用 Maven/Gradle/SBT

如果你使用构建工具，通常有一个对应的命令来运行录制器。例如，在 Maven 项目中：

```bash
mvn gatling:recorder
```

无论哪种方式，启动后都会打开一个图形化界面（GUI）窗口。

---

### 第 2 步：配置录制器

GUI 界面主要分为 **Recorder**（左侧）和 **Filters**（右侧）两部分。

#### **左侧 (Recorder) 配置：**

1.  **Recorder mode**: 选择 `HTTP Proxy` 模式。这是最常用的模式，让 Gatling 充当你的浏览器代理。
2.  **Listening port**: 代理服务器监听的端口。默认是 `8000`。你可以使用其他端口，只要不与系统其他程序冲突。
3.  **Output folder**: **生成的 Scala 脚本的保存目录**。这必须是你的 Gatling 项目中的 `simulations` 目录（或子目录）。
    *   例如：`/your/project/path/src/test/scala`
4.  **Package**: 输入一个包名（如 `com.mycompany.simulations`）。这会被添加到生成的 Scala 文件的开头，有助于代码组织。
5.  **ClassName**: 输入你希望生成的模拟类的名称（如 `RecordedSimulation`）。
6.  **Format**: 选择 `Scala`。

**配置示例：**
![Gatling Recorder Configuration](https://gatling.io/docs/gatling/reference/current/visuals/recorder/recorder_basic_settings.png)

#### **右侧 (Filters) 配置：**

过滤器非常重要，用于过滤掉你不想要的请求（如图片、CSS、JS 等静态资源），让生成的脚本更清晰，只关注于核心的业务请求（如 API 调用、表单提交）。

1.  **Filter strategy**: 选择策略。
    *   **Blacklist**: 默认。只录制**不在**黑名单中的请求。通常用于过滤静态资源。
    *   **Whitelist**: 只录制**在**白名单中的请求。仅当你只想捕获特定模式的请求时使用（如只录制 `/api/` 下的请求）。
2.  **Patterns**: 添加正则表达式模式。
    *   **对于 Blacklist**：添加常见的静态资源后缀。
        ```
        .*\.css, .*\.js, .*\.png, .*\.gif, .*\.jpg, .*\.ico, .*\.woff, .*\.woff2, .*\.(t|o)tf, .*\.svg
        ```
    *   **对于 Whitelist**：添加你想要捕获的 URL 模式，如 `.*\/api\/.*`。

**建议**：始终使用 **Blacklist** 策略并填入上述常见的静态资源模式，这样可以大大减少脚本中的噪音。

---

### 第 3 步：配置浏览器代理

现在需要告诉你的浏览器，将所有网络请求发送到 Gatling 录制器。

**以 Chrome 为例：**

1.  打开 Chrome 的设置。
2.  搜索“代理”或“proxy”，点击“打开计算机的代理设置”（不同系统路径可能不同）。更简单的方法是安装一个代理切换插件，如 **SwitchyOmega**。
3.  手动配置代理：
    *   **地址**: `127.0.0.1` 或 `localhost`
    *   **端口**: `8000`（与你在录制器中设置的 `Listening port` 一致）
4.  保存设置。

**重要提示**：录制完成后，**一定要记得将代理设置改回原来的状态（或直接关闭）**，否则你的浏览器将无法正常上网。

---

### 第 4 步：开始录制与操作

1.  在 Gatling 录制器界面上，点击 **Start** 按钮。
2.  在你的浏览器中，访问你想要测试的网站（例如一个电商网站 `https://example.store.com`）。
3.  开始执行你想要模拟的用户操作流程，例如：
    *   浏览首页
    *   搜索商品 “laptop”
    *   点击一个商品进入详情页
    *   将商品加入购物车
    *   点击结账
    *   填写收货地址（**注意：切勿使用真实个人信息！**）
    *   完成购买
4.  所有你的操作发出的 HTTP 请求都会被 Gatling 录制器捕获。

---

### 第 5 步：停止录制并生成脚本

1.  当你完成所有想要模拟的操作后，回到 Gatling 录制器界面。
2.  点击 **Stop** 按钮。
3.  切换到你在 `Output folder` 中配置的目录，你会发现生成了一个名为 `ClassName.scala` 的文件（例如 `RecordedSimulation.scala`）。

---

### 第 6 步：查看和修改生成的脚本

用 IDE 打开生成的 Scala 文件。它看起来会类似这样（一个简化版的结构）：

```scala
package com.mycompany.simulations // 你定义的包名

import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._

class RecordedSimulation extends Simulation { // 你定义的类名

  // 1. 定义 HTTP 协议配置（自动捕获了域名、基础路径等）
  val httpProtocol = http
    .baseUrl("https://example.store.com")
    .inferHtmlResources(BlackList(""".*\.css""", """.*\.js""", """.*\.ico"""), WhiteList())
    .acceptHeader("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    .acceptEncodingHeader("gzip, deflate")
    .acceptLanguageHeader("en-US,en;q=0.5")
    .userAgentHeader("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0")

  // 2. 定义请求头（通常来自登录、CSRF token等）
  val headers_0 = Map(
    "Accept" -> "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests" -> "1"
  )

  // 3. 定义场景（Scenario），包含了所有录制到的请求
  val scn = scenario("RecordedSimulation")
    .exec(
      http("request_0") // 第一个请求：访问首页
        .get("/")
        .headers(headers_0)
    )
    .pause(2) // 录制到的停顿时间
    .exec(
      http("request_1") // 第二个请求：搜索商品
        .get("/search?q=laptop")
        .headers(headers_0)
    )
    .pause(1, 2) // 停顿时间范围
    .exec(
      http("request_2") // 第三个请求：查看商品详情
        .get("/product/12345")
    )
    // ... 后续更多的请求 ...

  // 4. 设置负载模型（默认是注入一个用户执行一次）
  setUp(scn.inject(atOnceUsers(1))).protocols(httpProtocol)
}
```

### 第 7 步：优化生成的脚本（重要！）

自动生成的脚本只是一个起点，通常需要手动优化才能成为一个有效的性能测试脚本：

1.  **参数化动态值**：查找脚本中的硬编码值，如 `product/12345` 中的 `12345`，或表单提交中的用户名、邮箱。你应该用 Gatling 的 **Feeder** 或 **Session 变量** 来替换它们，使其每次请求都能变化。这就是我们之前讨论的**数据驱动**。
2.  **添加检查点（Checks）**：为关键请求添加 `.check()` 语句，例如检查响应状态码是否为 `200`，或者从响应体中提取一个 Token 用于后续请求（如 `check(jsonPath("$.token").saveAs("authToken"))`）。
3.  **调整暂停时间（Pauses）**：生成的暂停时间是录制时的真实时间。你可以根据需要修改它们，例如用 `.pause(2, 5)` 表示随机停顿 2 到 5 秒，模拟更真实的用户思考时间。
4.  **设置合理的负载模型**：将默认的 `atOnceUsers(1)` 修改为更真实的注入策略，如 `rampUsers(100).during(1.minute)`。
5.  **删除不必要的请求**：虽然用了过滤器，但可能还是有一些无关的请求被录制进来，手动清理它们。
6.  **添加断言（Assertions）**：为整个测试添加全局断言，确保性能达标。

### 总结

Gatling 录制器是一个强大的**入门和原型制作工具**。它极大地简化了为复杂 Web 应用创建基础脚本的过程。然而，要创建一个真实、可靠且有意义的性能测试，**手动优化和增强**自动生成的脚本是必不可少的一步。