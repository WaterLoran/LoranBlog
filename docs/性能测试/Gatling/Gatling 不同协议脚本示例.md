# Gatling 不同协议脚本示例

下面我将为您展示 Gatling 支持的不同协议的脚本示例，帮助您理解如何使用 Gatling 进行各种类型的性能测试。

## 1. HTTP/HTTPS 协议示例

这是最常用的协议测试，适用于 Web 应用和 REST API。

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._

class HttpExampleSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com") // 基础URL
    .acceptHeader("application/json")   // 接受头
    .userAgentHeader("Gatling/Performance Test") // User-Agent头
    .disableCaching // 禁用缓存

  // 定义请求头
  val headers = Map(
    "Content-Type" -> "application/json",
    "Authorization" -> "Bearer {{auth_token}}"
  )

  // 场景定义
  val scn = scenario("HTTP API Test Scenario")
    .exec(
      http("Get Auth Token") // 获取认证令牌
        .post("/auth")
        .body(StringBody("""{"username": "testuser", "password": "testpass"}"""))
        .check(jsonPath("$.token").saveAs("auth_token"))
    )
    .pause(1.second)
    .exec(
      http("Create Item") // 创建资源
        .post("/items")
        .headers(headers)
        .body(StringBody("""{"name": "Test Item", "value": "100"}"""))
        .check(status.is(201), jsonPath("$.id").saveAs("itemId"))
    )
    .pause(1.second)
    .exec(
      http("Get Item") // 获取资源
        .get("/items/${itemId}")
        .headers(headers)
        .check(status.is(200))
    )
    .pause(1.second)
    .exec(
      http("Delete Item") // 删除资源
        .delete("/items/${itemId}")
        .headers(headers)
        .check(status.is(204))
    )

  // 设置负载模型
  setUp(
    scn.inject(
      nothingFor(4.seconds), // 等待4秒
      atOnceUsers(10),       // 立即注入10个用户
      rampUsersPerSec(1).to(5).during(1.minute) // 在1分钟内从1用户/秒增加到5用户/秒
    ).protocols(httpProtocol)
  ).assertions(
    global.responseTime.max.lt(1000), // 全局最大响应时间小于1000ms
    global.successfulRequests.percent.gt(99) // 成功率大于99%
  )
}
```

## 2. WebSocket 协议示例

适用于测试实时应用，如聊天应用、实时游戏等。

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._

class WebSocketExampleSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://echo.websocket.org")
    .acceptHeader("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    .doNotTrackHeader("1")
    .userAgentHeader("Gatling/Performance Test")

  // WebSocket场景
  val scn = scenario("WebSocket Test")
    .exec(
      http("Request Homepage")
        .get("/")
        .check(status.is(200))
    )
    .pause(1.second)
    .exec(
      ws("Connect WS") // 建立WebSocket连接
        .connect("/")
        .await(30.seconds)(
          ws.checkTextMessage("Check Connection")
            .matching(jsonPath("$.type").is("welcome"))
            .check(jsonPath("$.message").saveAs("welcomeMessage"))
        )
    )
    .pause(1.second)
    .repeat(5, "i") { // 发送5条消息
      exec(
        ws("Send Message")
          .sendText("""{"message": "Hello, World ${i}"}""")
          .await(30.seconds)(
            ws.checkTextMessage("Echo Message")
              .matching(jsonPath("$.message").is("Hello, World ${i}"))
          )
      ).pause(1.second)
    }
    .exec(ws("Close WS").close) // 关闭连接

  setUp(
    scn.inject(
      rampUsers(100).during(30.seconds) // 30秒内逐步增加到100个用户
    ).protocols(httpProtocol)
  )
}
```

## 3. JDBC 协议示例

用于直接测试数据库性能。

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.jdbc.Predef._

class JdbcExampleSimulation extends Simulation {

  // JDBC配置
  val jdbcConfig = jdbc
    .url("jdbc:mysql://localhost:3306/testdb")
    .username("testuser")
    .password("testpass")
    .driver("com.mysql.cj.jdbc.Driver")

  // 场景定义
  val scn = scenario("JDBC Test Scenario")
    .exec(
      jdbc("Create Table") // 创建表
        .create()
        .table("perf_test")
        .columns(
          "id INT PRIMARY KEY AUTO_INCREMENT",
          "name VARCHAR(255)",
          "value INT",
          "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        )
    )
    .pause(1.second)
    .repeat(100, "i") { // 插入100条记录
      exec(
        jdbc("Insert Record")
          .insert()
          .into("perf_test")
          .values("'Test User ${i}', ${i}")
      )
    }
    .pause(1.second)
    .exec(
      jdbc("Select Records") // 查询记录
        .select("*")
        .from("perf_test")
        .where("value > 50")
    )
    .pause(1.second)
    .exec(
      jdbc("Update Records") // 更新记录
        .update()
        .table("perf_test")
        .set("name = 'Updated User'")
        .where("value < 10")
    )
    .pause(1.second)
    .exec(
      jdbc("Delete Records") // 删除记录
        .delete()
        .from("perf_test")
        .where("value > 90")
    )
    .exec(
      jdbc("Drop Table") // 删除表
        .drop()
        .table("perf_test")
    )

  setUp(
    scn.inject(
      atOnceUsers(1) // 数据库测试通常使用较少的并发用户
    ).protocols(jdbcConfig)
  )
}
```

## 4. JMS 协议示例

用于测试消息队列系统，如 ActiveMQ、RabbitMQ 等。

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.jms.Predef._
import javax.jms._

class JmsExampleSimulation extends Simulation {

  // JMS配置
  val jmsConfig = jms
    .connectionFactoryName("ConnectionFactory")
    .url("tcp://localhost:61616")
    .credentials("admin", "admin")
    .contextFactory("org.apache.activemq.jndi.ActiveMQInitialContextFactory")
    .listenerCount(1) // 监听器数量
    .usePersistentDeliveryMode // 使用持久化模式

  // 场景定义 - 点对点模式 (Queue)
  val scnP2P = scenario("JMS Point-to-Point Test")
    .exec(
      jms("Send to Queue") // 发送消息到队列
        .send
        .queue("test.queue")
        .textMessage("Hello from Gatling!")
    )
    .pause(1.second)
    .exec(
      jms("Request-Reply") // 请求-响应模式
        .reqreply
        .queue("request.queue")
        .textMessage("Request Message")
        .check(simpleCheck(_.getText.contains("Response")))
    )

  // 场景定义 - 发布订阅模式 (Topic)
  val scnPubSub = scenario("JMS Pub/Sub Test")
    .exec(
      jms("Subscribe to Topic") // 订阅主题
        .subscribe
        .topic("test.topic")
        .check(simpleCheck(_.getText.contains("Message")))
    )
    .pause(1.second)
    .exec(
      jms("Publish to Topic") // 发布到主题
        .publish
        .topic("test.topic")
        .textMessage("Published Message")
    )

  setUp(
    scnP2P.inject(rampUsers(10).during(10.seconds)),
    scnPubSub.inject(rampUsers(5).during(10.seconds))
  ).protocols(jmsConfig)
}
```

## 5. gRPC 协议示例

需要先安装 gatling-grpc 插件。

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.grpc.Predef._

import example.helloworld.{HelloRequest, HelloReply}
import example.helloworld.GreeterGrpc
import io.grpc.{ManagedChannelBuilder, Status}

class GrpcExampleSimulation extends Simulation {

  // gRPC配置
  val grpcConfig = grpc(ManagedChannelBuilder.forAddress("localhost", 50051).usePlaintext())

  // 场景定义
  val scn = scenario("gRPC Test Scenario")
    .exec(
      grpc("Unary Call") // 一元调用
        .rpc(GreeterGrpc.METHOD_SAY_HELLO)
        .payload(HelloRequest.defaultInstance.withName("Gatling User"))
        .check(
          // 检查响应状态
          statusCode.is(Status.Code.OK),
          // 检查响应消息
          response(_.getMessage).is("Hello, Gatling User!")
        )
    )
    .pause(1.second)
    .exec(
      grpc("Server Streaming") // 服务器流
        .rpc(GreeterGrpc.METHOD_SAY_HELLO_STREAM)
        .payload(HelloRequest.defaultInstance.withName("Stream User"))
        .check(
          // 检查流中的多个响应
          streamCount.is(5),
          // 检查每个响应
          response(0)(_.getMessage).is("Hello, Stream User! 0"),
          response(4)(_.getMessage).is("Hello, Stream User! 4")
        )
    )

  setUp(
    scn.inject(
      constantUsersPerSec(10).during(1.minute) // 每分钟10个用户
    ).protocols(grpcConfig)
  )
}
```

## 6. MQTT 协议示例

需要先安装 gatling-mqtt 插件。

```scala
import scala.concurrent.duration._
import io.gatling.core.Predef._
import io.gatling.mqtt.Predef._

class MqttExampleSimulation extends Simulation {

  // MQTT配置
  val mqttConfig = mqtt
    .broker("tcp://localhost:1883")
    .clientId("gatling-${id}") // 客户端ID
    .cleanSession(true) // 清除会话
    .qosAtLeastOnce // QoS级别
    .retryAttempts(3) // 重试次数
    .reconnectDelay(1000, 5000) // 重连延迟

  // 场景定义
  val scn = scenario("MQTT Test Scenario")
    .exec(
      mqtt("Connect") // 连接
        .connect()
    )
    .pause(1.second)
    .exec(
      mqtt("Subscribe") // 订阅主题
        .subscribe("test/topic")
        .await(30.seconds)(
          // 检查收到的消息
          check(
            payload.bytes.transform(_.length).is(10),
            payload.bytes.exists
          )
        )
    )
    .pause(1.second)
    .repeat(10, "i") { // 发布10条消息
      exec(
        mqtt("Publish")
          .publish("test/topic")
          .message(StringBody("Message ${i}"))
      ).pause(100.milliseconds)
    }
    .exec(
      mqtt("Disconnect") // 断开连接
        .disconnect()
    )

  setUp(
    scn.inject(
      rampUsers(50).during(30.seconds) // 30秒内逐步增加到50个用户
    ).protocols(mqttConfig)
  )
}
```

## 使用说明

1. **依赖配置**：对于非核心协议（如 gRPC、MQTT），需要在构建工具（如 Maven 或 SBT）中添加相应的插件依赖。

2. **协议特定配置**：每种协议都有其特定的配置选项，需要根据测试目标进行适当配置。

3. **断言和检查**：每种协议都支持不同类型的断言和检查，用于验证响应是否符合预期。

4. **负载模型**：可以根据测试需求调整用户注入策略，如恒定用户数、递增用户数、峰值用户等。

这些示例展示了 Gatling 对不同协议的支持能力，您可以根据实际测试需求进行修改和扩展。